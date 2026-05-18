import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { chromium } from '@playwright/test';

const BASE_URL = process.env.ADMIN_QA_BASE_URL ?? 'http://localhost:3000';
const ANALYSIS_PATH = path.join(process.cwd(), 'qa-results', 'admin-sheet', 'analysis.json');
const OUTPUT_DIR = path.join(process.cwd(), 'qa-results', 'admin-sheet');
const SCREENSHOT_DIR = path.join(OUTPUT_DIR, 'smoke-screenshots');

interface ScreenGroup {
  screen: string;
  count: number;
  route: { route: string; pageExists: boolean } | null;
  automationClass: string;
}

interface SmokeResult {
  screen: string;
  route: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  httpStatus: number | string;
  finalUrl: string;
  loadMs: number;
  bodyLength: number;
  consoleErrors: number;
  reason: string;
  screenshot: string;
}

function argValue(name: string): string | null {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.replace(`--${name}=`, '') : null;
}

function routeToUrl(route: string): string {
  if (route === '/login') return `${BASE_URL}/login`;
  const joiner = route.includes('?') ? '&' : '?';
  return `${BASE_URL}${route}${joiner}preview=1`;
}

function routeToFileName(route: string): string {
  return route === '/' ? 'root' : route.replace(/[^a-zA-Z0-9가-힣]+/g, '_').replace(/^_+|_+$/g, '');
}

function loadTargetGroups(): ScreenGroup[] {
  if (!fs.existsSync(ANALYSIS_PATH)) {
    throw new Error(`Missing analysis file. Run pnpm run qa:admin-sheet-plan first: ${ANALYSIS_PATH}`);
  }

  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_PATH, 'utf8')) as { groups: ScreenGroup[] };
  const seenRoutes = new Set<string>();
  const groups = analysis.groups
    .filter((group) => group.route?.route && group.route.pageExists)
    .filter((group) => !group.automationClass.startsWith('BLOCKED'))
    .filter((group) => {
      const route = group.route?.route ?? '';
      if (seenRoutes.has(route)) return false;
      seenRoutes.add(route);
      return true;
    });

  const only = argValue('only');
  if (only) {
    const allow = new Set(only.split(',').map((item) => item.trim()));
    return groups.filter((group) => allow.has(group.screen) || allow.has(group.route?.route ?? ''));
  }

  const rawLimit = argValue('limit');
  if (!rawLimit || rawLimit === 'all') return groups;

  const limit = Number(rawLimit);
  return groups.slice(0, Number.isFinite(limit) ? limit : 30);
}

function writeCsv(filePath: string, rows: SmokeResult[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  fs.writeFileSync(filePath, XLSX.utils.sheet_to_csv(sheet), 'utf8');
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const targets = loadTargetGroups();
  if (targets.length === 0) {
    throw new Error('No smoke targets found.');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results: SmokeResult[] = [];

  for (const target of targets) {
    const route = target.route?.route ?? '';
    const url = routeToUrl(route);
    const consoleErrors: string[] = [];
    const onConsole = (message: { type: () => string; text: () => string }) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    };
    page.on('console', onConsole);

    const started = Date.now();
    let status: SmokeResult['status'] = 'PASS';
    let reason = '';
    let httpStatus: number | string = '';
    let bodyLength = 0;
    let finalUrl = '';
    const screenshot = path.join(SCREENSHOT_DIR, `${routeToFileName(route)}.png`);

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      httpStatus = response?.status() ?? 'no-response';
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
      finalUrl = page.url();
      const bodyText = (await page.locator('body').textContent({ timeout: 5_000 }).catch(() => '')) ?? '';
      bodyLength = bodyText.trim().length;

      if (typeof httpStatus === 'number' && httpStatus >= 400) {
        status = 'FAIL';
        reason = `HTTP ${httpStatus}`;
      } else if (route !== '/login' && finalUrl.includes('/login')) {
        status = 'FAIL';
        reason = 'redirected to login';
      } else if (route !== '/forbidden' && finalUrl.includes('/forbidden')) {
        status = 'FAIL';
        reason = 'redirected to forbidden';
      } else if (bodyLength < 20) {
        status = 'FAIL';
        reason = 'empty body';
      } else if (consoleErrors.length > 0) {
        status = 'WARN';
        reason = `${consoleErrors.length} console error(s)`;
      }
    } catch (error) {
      status = 'FAIL';
      reason = error instanceof Error ? error.message : String(error);
    }

    await page.screenshot({ path: screenshot, fullPage: false }).catch(() => {});
    page.off('console', onConsole);

    results.push({
      screen: target.screen,
      route,
      status,
      httpStatus,
      finalUrl,
      loadMs: Date.now() - started,
      bodyLength,
      consoleErrors: consoleErrors.length,
      reason,
      screenshot,
    });

    console.log(`${status.padEnd(4)} ${route} ${reason}`);
  }

  await browser.close();

  fs.writeFileSync(path.join(OUTPUT_DIR, 'smoke-sample.json'), JSON.stringify(results, null, 2), 'utf8');
  writeCsv(path.join(OUTPUT_DIR, 'smoke-sample.csv'), results);

  const failCount = results.filter((result) => result.status === 'FAIL').length;
  console.log(`Smoke targets: ${results.length}, failures: ${failCount}`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
