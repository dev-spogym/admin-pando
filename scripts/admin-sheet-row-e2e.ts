import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { chromium, type Browser, type Page } from '@playwright/test';

const BASE_URL = process.env.ADMIN_QA_BASE_URL ?? 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'qa-results', 'admin-sheet');
const ANALYSIS_PATH = path.join(OUTPUT_DIR, 'analysis.json');
const ADMIN_CSV = path.join(OUTPUT_DIR, 'admin.csv');
const RESULT_JSON = path.join(OUTPUT_DIR, 'row-e2e-results.json');
const RESULT_CSV = path.join(OUTPUT_DIR, 'row-e2e-results.csv');
const CHECKPOINT_JSON = path.join(OUTPUT_DIR, 'row-e2e-checkpoint.json');
const CHECKPOINT_CSV = path.join(OUTPUT_DIR, 'row-e2e-checkpoint.csv');
const FAILURE_SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'row-e2e-failures');

const RUNNABLE_TYPES = new Set([
  '정상 진입',
  '연속 처리',
  '재진입',
  '대표 동선',
  '복귀',
  '다중 실행',
  '기본 표시',
  '긴 데이터',
  '반응형',
  '비활성',
  '피드백',
  '로딩',
  '빈 상태',
  '활성 상태',
]);
const DANGEROUS_ACTION_TEXT = /삭제|탈퇴|퇴사|환불|취소|초기화|해지|비활성|차단|정지/;

interface AdminTcRow {
  rowNumber: number;
  tcId: string;
  screen: string;
  testItem: string;
  precondition: string;
  procedure: string;
  expected: string;
}

interface RowPlan {
  rowNumber: number;
  tcId: string;
  screen: string;
  route: string;
  type: string;
  env: string;
  status: string;
  scenarioCandidates: string;
}

interface RowE2EResult {
  rowNumber: number;
  tcId: string;
  screen: string;
  route: string;
  type: string;
  env: string;
  status: 'PASS_E2E' | 'WARN_E2E' | 'FAIL_E2E' | 'SKIP_NOT_AUTOMATABLE';
  reason: string;
  durationMs: number;
  finalUrl: string;
  bodyLength: number;
  consoleErrors: number;
  screenshot: string;
}

function argValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.replace(`--${name}=`, '') : null;
}

function parseRows(csv: string): AdminTcRow[] {
  const workbook = XLSX.read(csv, { type: 'string' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const values = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });
  return values
    .slice(1)
    .map((row, index) => ({
      rowNumber: index + 2,
      tcId: row[0]?.trim() ?? '',
      screen: row[1]?.trim() ?? '',
      testItem: row[2]?.trim() ?? '',
      precondition: row[3]?.trim() ?? '',
      procedure: row[4]?.trim() ?? '',
      expected: row[5]?.trim() ?? '',
    }))
    .filter((row) => row.tcId || row.screen || row.testItem);
}

function routeToUrl(route: string): string {
  if (route === '/login') return `${BASE_URL}/login`;
  const joiner = route.includes('?') ? '&' : '?';
  return `${BASE_URL}${route}${joiner}preview=1`;
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9가-힣_-]+/g, '_').slice(0, 120);
}

function writeCsv(filePath: string, rows: RowE2EResult[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  fs.writeFileSync(filePath, XLSX.utils.sheet_to_csv(sheet), 'utf8');
}

async function findActionLocator(page: Page) {
  const candidates = page.locator('main button, main a[href], main [role="button"], button, a[href], [role="button"]');
  const count = Math.min(await candidates.count().catch(() => 0), 80);
  for (let index = 0; index < count; index += 1) {
    const item = candidates.nth(index);
    const visible = await item.isVisible().catch(() => false);
    if (!visible) continue;

    const disabled = await item.isDisabled().catch(() => false);
    if (disabled) continue;

    const text = ((await item.textContent().catch(() => '')) ?? '').trim();
    if (DANGEROUS_ACTION_TEXT.test(text)) continue;

    const href = await item.getAttribute('href').catch(() => null);
    if (href && (href === '#' || href.startsWith('javascript:'))) continue;

    return item;
  }

  return null;
}

async function assertStillRendered(page: Page) {
  await page.waitForTimeout(300);
  const bodyLength = ((await page.locator('body').textContent({ timeout: 5_000 }).catch(() => '')) ?? '').trim().length;
  if (bodyLength < 20) throw new Error('액션 후 body 렌더링 내용 부족');
  return bodyLength;
}

function loadExistingResults(): RowE2EResult[] {
  if (process.argv.includes('--restart')) return [];
  const source = fs.existsSync(CHECKPOINT_JSON) ? CHECKPOINT_JSON : fs.existsSync(RESULT_JSON) ? RESULT_JSON : null;
  if (!source) return [];
  const parsed = JSON.parse(fs.readFileSync(source, 'utf8')) as RowE2EResult[];
  const byRow = new Map<number, RowE2EResult>();
  for (const item of parsed) byRow.set(item.rowNumber, item);
  return Array.from(byRow.values()).sort((a, b) => a.rowNumber - b.rowNumber);
}

function loadTargets(doneRows: Set<number>): Array<{ plan: RowPlan; row: AdminTcRow }> {
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8')) as { rowPlan: RowPlan[] };
  const rows = parseRows(fs.readFileSync(ADMIN_CSV, 'utf8'));
  const rowByNumber = new Map(rows.map((row) => [row.rowNumber, row]));
  const onlyType = argValue('type');
  const onlyRoute = argValue('route');

  let targets = analysis.rowPlan
    .filter((plan) => plan.route)
    .filter((plan) => plan.status !== 'BLOCKED_NO_ROUTE')
    .filter((plan) => RUNNABLE_TYPES.has(plan.type))
    .filter((plan) => !doneRows.has(plan.rowNumber))
    .filter((plan) => !onlyType || plan.type === onlyType)
    .filter((plan) => !onlyRoute || plan.route === onlyRoute)
    .map((plan) => ({ plan, row: rowByNumber.get(plan.rowNumber) }))
    .filter((item): item is { plan: RowPlan; row: AdminTcRow } => Boolean(item.row));

  const offset = Number(argValue('offset') ?? 0);
  const limitArg = argValue('limit');
  if (offset > 0) targets = targets.slice(offset);
  if (limitArg && limitArg !== 'all') targets = targets.slice(0, Number(limitArg));
  return targets;
}

async function assertPage(
  page: Page,
  plan: RowPlan,
  row: AdminTcRow,
  workerId: number,
): Promise<RowE2EResult> {
  const started = Date.now();
  await page.setViewportSize(plan.env.includes('태블릿') ? { width: 820, height: 1180 } : { width: 1440, height: 900 });
  const consoleErrors: string[] = [];
  const consoleHandler = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  };
  page.on('console', consoleHandler);

  let status: RowE2EResult['status'] = 'PASS_E2E';
  let reason = '행별 E2E 통과';
  let finalUrl = '';
  let bodyLength = 0;
  let screenshot = '';

  try {
    const response = await page.goto(routeToUrl(plan.route), { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.waitForTimeout(250);
    finalUrl = page.url();
    bodyLength = ((await page.locator('body').textContent({ timeout: 5_000 }).catch(() => '')) ?? '').trim().length;

    if ((response?.status() ?? 0) >= 400) throw new Error(`HTTP ${response?.status()}`);
    if (plan.route !== '/login' && finalUrl.includes('/login')) throw new Error('로그인 페이지로 리다이렉트됨');
    if (plan.route !== '/forbidden' && finalUrl.includes('/forbidden')) throw new Error('권한 없음 페이지로 리다이렉트됨');
    if (bodyLength < 20) throw new Error('body 렌더링 내용 부족');

    if (plan.type === '재진입') {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 15_000 });
      await page.waitForTimeout(250);
      finalUrl = page.url();
      bodyLength = ((await page.locator('body').textContent({ timeout: 5_000 }).catch(() => '')) ?? '').trim().length;
      if (bodyLength < 20) throw new Error('재진입 후 body 렌더링 내용 부족');
    }

    if (plan.type === '반응형') {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(250);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 24);
      if (hasOverflow) {
        status = 'WARN_E2E';
        reason = '모바일 폭에서 가로 overflow 가능성';
      }
    }

    if (['대표 동선', '연속 처리', '복귀', '다중 실행'].includes(plan.type)) {
      const action = await findActionLocator(page);
      if (!action) {
        status = 'WARN_E2E';
        reason = '실행 가능한 비파괴 CTA를 찾지 못함';
      } else if (plan.type === '다중 실행') {
        await action.dblclick({ timeout: 5_000 }).catch(async () => {
          await action.click({ timeout: 5_000 });
          await action.click({ timeout: 5_000 });
        });
        bodyLength = await assertStillRendered(page);
      } else if (plan.type === '복귀') {
        const beforeUrl = page.url();
        await action.click({ timeout: 5_000 });
        await page.waitForTimeout(300);
        await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5_000 }).catch(async () => {
          await page.keyboard.press('Escape').catch(() => {});
        });
        bodyLength = await assertStillRendered(page);
        if (page.url() !== beforeUrl && !page.url().startsWith(beforeUrl.split('?')[0])) {
          status = 'WARN_E2E';
          reason = '복귀 후 URL 컨텍스트가 원 화면과 다름';
        }
      } else {
        await action.click({ timeout: 5_000 });
        bodyLength = await assertStillRendered(page);
        if (plan.type === '연속 처리') {
          const nextAction = await findActionLocator(page);
          if (nextAction) {
            await nextAction.click({ timeout: 5_000 }).catch(() => {});
            bodyLength = await assertStillRendered(page);
          }
        }
      }
    }

    if (status === 'PASS_E2E' && consoleErrors.length > 0) {
      status = 'WARN_E2E';
      reason = `${consoleErrors.length}개 console error 발생`;
    }

    if (status === 'PASS_E2E' && plan.status === 'MANUAL_DATA_SETUP') {
      status = 'WARN_E2E';
      reason = `${plan.env} fixture 조건은 재현하지 못했고, 화면 동작만 비파괴 검증`;
    }
  } catch (error) {
    status = 'FAIL_E2E';
    reason = error instanceof Error ? error.message : String(error);
    fs.mkdirSync(FAILURE_SCREENSHOT_DIR, { recursive: true });
    screenshot = path.join(FAILURE_SCREENSHOT_DIR, `${safeFileName(`${row.rowNumber}-${row.tcId}`)}.png`);
    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
  } finally {
    page.off('console', consoleHandler);
  }

  return {
    rowNumber: row.rowNumber,
    tcId: row.tcId,
    screen: row.screen,
    route: plan.route,
    type: plan.type,
    env: plan.env,
    status,
    reason: `${reason} [worker ${workerId}]`,
    durationMs: Date.now() - started,
    finalUrl,
    bodyLength,
    consoleErrors: consoleErrors.length,
    screenshot,
  };
}

async function main() {
  const existingResults = loadExistingResults();
  const doneRows = new Set(existingResults.map((item) => item.rowNumber));
  const targets = loadTargets(doneRows);
  const workers = Number(argValue('workers') ?? 4);
  const results: RowE2EResult[] = [...existingResults];
  let cursor = 0;
  const total = targets.length;
  const started = Date.now();

  console.log(`Row E2E targets: ${total}, existing: ${existingResults.length}, workers: ${workers}`);

  const browser = await chromium.launch({ headless: true });

  async function runWorker(workerId: number) {
    const context = await browser.newContext();
    const page = await context.newPage();
    while (cursor < targets.length) {
      const index = cursor++;
      const target = targets[index];
      const result = await assertPage(page, target.plan, target.row, workerId);
      results.push(result);

      if ((index + 1) % 100 === 0 || index + 1 === total) {
        const pass = results.filter((item) => item.status === 'PASS_E2E').length;
        const warn = results.filter((item) => item.status === 'WARN_E2E').length;
        const fail = results.filter((item) => item.status === 'FAIL_E2E').length;
        console.log(`progress ${index + 1}/${total} pass=${pass} warn=${warn} fail=${fail}`);
        const sorted = [...results].sort((a, b) => a.rowNumber - b.rowNumber);
        fs.writeFileSync(CHECKPOINT_JSON, JSON.stringify(sorted, null, 2), 'utf8');
        writeCsv(CHECKPOINT_CSV, sorted);
      }
    }
    await context.close();
  }

  await Promise.all(Array.from({ length: workers }, (_, index) => runWorker(index + 1)));
  await browser.close();

  results.sort((a, b) => a.rowNumber - b.rowNumber);
  fs.writeFileSync(RESULT_JSON, JSON.stringify(results, null, 2), 'utf8');
  writeCsv(RESULT_CSV, results);
  fs.writeFileSync(CHECKPOINT_JSON, JSON.stringify(results, null, 2), 'utf8');
  writeCsv(CHECKPOINT_CSV, results);

  const pass = results.filter((item) => item.status === 'PASS_E2E').length;
  const warn = results.filter((item) => item.status === 'WARN_E2E').length;
  const fail = results.filter((item) => item.status === 'FAIL_E2E').length;
  console.log(`Row E2E done in ${Math.round((Date.now() - started) / 1000)}s: pass=${pass}, warn=${warn}, fail=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
