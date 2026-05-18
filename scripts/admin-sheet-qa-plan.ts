import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { ROUTE_TO_DOC } from '../src/lib/designDocMap.ts';

const SPREADSHEET_ID = '1CLpq6U6uLPu7lBYimDhXISSj1R0qbQxnbEx5tav-vzQ';
const ADMIN_GID = '637414515';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${ADMIN_GID}`;
const OUTPUT_DIR = path.join(process.cwd(), 'qa-results', 'admin-sheet');
const MANUAL_ROUTE_ALIASES: Record<string, string> = {
  'DLG-000': '/login',
  'DLG-001': '/',
  'DLG-002': '/',
  'DLG-003': '/',
  'DLG-004': '/',
  'DLG-092': '/branches',
  'DLG-094': '/kpi',
  'DLG-098': '/today-tasks',
  'DLG-I002': '/clothing-locker',
  'DLG-I003': '/body-composition',
  'DLG-M011': '/members/detail',
  'DLG-M012': '/members/detail',
  'DLG-M013': '/refunds',
  'DLG-M014': '/members/detail',
  'DLG-M015': '/body-composition',
  'DLG-M016': '/body-composition',
  'DLG-M017': '/body-composition',
  'DLG-M018': '/members/detail',
  'DLG-M019': '/members/transfer',
  'DLG-M020': '/message/coupon',
  'DLG-M021': '/mileage',
  'DLG-M022': '/attendance',
  'DLG-M023': '/members/transfer',
  'DLG-M024': '/members/detail',
  'DLG-M025': '/exercise-programs',
  'DLG-M026': '/members/detail',
  'DLG-M027': '/members/edit',
  'DLG-M028': '/members/merge',
  'DLG-M029': '/members/family',
  'DLG-M030': '/members/grade',
  'DLG-P009': '/products/catalog',
  'DLG-P010': '/products/catalog',
  'DLG-P011': '/products/catalog',
  'DLG-P012': '/products/inventory',
  'DLG-P013': '/products/inventory',
  'DLG-P014': '/products/inventory',
  'DLG-P015': '/products/inventory',
  'DLG-P016': '/products/seasonal-price',
  'DLG-S013': '/refunds',
  'DLG-S014': '/refunds',
  'DLG-S015': '/refunds',
  'SCR-090': '/',
  'SCR-091': '/super-dashboard',
  'SCR-092': '/branches',
  'SCR-093': '/branch-report',
  'SCR-094': '/kpi',
  'SCR-095': '/kpi-preview',
  'SCR-096': '/onboarding',
  'SCR-097': '/audit-log',
  'SCR-098': '/today-tasks',
  'SCR-099': '/reports',
  'SCR-101': '/',
  'SCR-102': '/',
  'SCR-103': '/',
  'SCR-104': '/',
  'SCR-109': '/',
  'SCR-059': '/rooms',
  'SCR-072A': '/message/auto-alarm',
  'A02': '/members',
  'A03': '/members/detail',
  'E05': '/forbidden',
  'E06': '/forbidden',
  'E07': '/forbidden',
  'E11': '/forbidden',
  'E12': '/login',
  'E14': '/forbidden',
  'E17': '/forbidden',
  'E18': '/forbidden',
  'E19': '/forbidden',
  'E20': '/forbidden',
  'X21': '/members/detail',
};
const MANUAL_NO_ROUTE_SCREEN_CODES = new Set<string>();
const ROUTE_MATCH_STOPWORDS = new Set(['관리', '등록', '수정', '처리', '확인', '현황', '목록', '설정', '상세']);
const SCENARIO_MATCH_STOPWORDS = new Set([...ROUTE_MATCH_STOPWORDS, '수업', '회원', '결제']);

interface AdminTcRow {
  rowNumber: number;
  tcId: string;
  screen: string;
  testItem: string;
  precondition: string;
  procedure: string;
  expected: string;
}

interface RouteCandidate {
  route: string;
  title: string;
  category: string;
  screenCode: string | null;
  screenFolder: string | null;
  pageExists: boolean;
}

interface ScenarioCandidate {
  id: string;
  file: string;
  name: string;
}

interface ScreenGroup {
  screen: string;
  screenCode: string | null;
  title: string;
  count: number;
  testTypes: Record<string, number>;
  envs: Record<string, number>;
  route: RouteCandidate | null;
  scenarios: ScenarioCandidate[];
  automationClass: string;
  sampleTcIds: string[];
}

const TEST_TYPE_RULES: Array<[string, RegExp]> = [
  ['정상 진입', /정상\s*진입|대표\s*happy path/],
  ['연속 처리', /연속\s*처리|컨텍스트를 유지/],
  ['재진입', /재진입|새로고침|재로그인/],
  ['선행 변경', /선행\s*변경|stale|만료\s*컨텍스트/],
  ['후속 반영', /후속\s*반영|로그|알림/],
  ['대표 동선', /대표\s*동선|대표 CTA/],
  ['보조 동선', /보조\s*동선|더보기|행 액션/],
  ['복귀', /복귀|뒤로가기|취소/],
  ['다중 실행', /다중\s*실행|연속\s*클릭|이중\s*실행/],
  ['정상값', /정상값|대표 정상값/],
  ['경계값', /경계값|최소값|최대값|허용 길이/],
  ['중복/충돌', /중복|충돌|선점/],
  ['영속성', /영속성|저장 후/],
];

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function loadCsv(): Promise<string> {
  const csvPathArg = process.argv.find((arg) => arg.startsWith('--csv='));
  if (csvPathArg) {
    return fs.readFileSync(path.resolve(csvPathArg.replace('--csv=', '')), 'utf8');
  }

  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Admin sheet CSV fetch failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
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

function normalizeScreenCode(raw: string): string | null {
  const match = raw.match(/\b(?:SCR|DLG)-[A-Z]?\d+[A-Z]?|\b(?:SCR|DLG)-[A-Z]\d{3,4}/i);
  if (match) return match[0].toUpperCase();
  const scenarioMatch = raw.match(/^(A\d{2}|E\d{2}|X\d{2})[_\s-]/i);
  return scenarioMatch ? scenarioMatch[1].toUpperCase() : null;
}

function screenTitle(raw: string): string {
  return raw.replace(/\b(?:SCR|DLG)-[A-Z]?\d+[A-Z]?|\b(?:SCR|DLG)-[A-Z]\d{3,4}/gi, '').trim();
}

function normalizeAppRoute(file: string): string {
  const rel = path.relative(path.join(process.cwd(), 'src', 'app'), file).replace(/\\/g, '/');
  const withoutFile = rel.replace(/\/page\.tsx$/, '');
  const withoutGroups = withoutFile.replace(/\/?\([^/]+\)/g, '');
  return withoutGroups ? `/${withoutGroups}`.replace(/\/+/g, '/') : '/';
}

function walk(dir: string, matcher: (fileName: string) => boolean, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, matcher, acc);
      continue;
    }
    if (matcher(entry.name)) acc.push(full);
  }
  return acc;
}

function loadAppRoutes(): Set<string> {
  return new Set(
    walk(path.join(process.cwd(), 'src', 'app'), (name) => name === 'page.tsx')
      .map(normalizeAppRoute)
      .filter((route) => !route.startsWith('/api')),
  );
}

function loadRouteCandidates(): RouteCandidate[] {
  const appRoutes = loadAppRoutes();
  return Object.entries(ROUTE_TO_DOC).map(([route, mapping]) => {
    const screenFolder = mapping.screen?.folder ?? null;
    return {
      route,
      title: mapping.title,
      category: mapping.category,
      screenCode: screenFolder ? normalizeScreenCode(screenFolder) : null,
      screenFolder,
      pageExists: appRoutes.has(route),
    };
  });
}

function loadScenarioCandidates(): ScenarioCandidate[] {
  const runScenarioPath = path.join(process.cwd(), 'scripts', 'run-scenarios.ts');
  if (!fs.existsSync(runScenarioPath)) return [];
  const raw = fs.readFileSync(runScenarioPath, 'utf8');
  const pattern = /\{\s*id:\s*'([^']+)'\s*,\s*file:\s*'([^']+)'\s*,\s*name:\s*'([^']+)'\s*\}/g;
  return Array.from(raw.matchAll(pattern)).map((match) => ({
    id: match[1],
    file: match[2],
    name: match[3],
  }));
}

function classifyTestType(row: AdminTcRow): string {
  const haystack = `${row.testItem} ${row.procedure} ${row.expected}`;
  for (const [type, pattern] of TEST_TYPE_RULES) {
    if (pattern.test(haystack)) return type;
  }
  return row.testItem.split('/').pop()?.trim() || '기타';
}

function preconditionEnv(precondition: string): string {
  return precondition.split('/')[0]?.trim() || '미분류';
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] ?? 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
}

function tokens(raw: string, stopwords: Set<string>): string[] {
  return raw
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2)
    .filter((token) => !stopwords.has(token));
}

function keywordScore(text: string, target: string, stopwords = new Set<string>()): number {
  const sourceTokens = tokens(text, stopwords);
  const targetTokens = tokens(target, stopwords);

  return sourceTokens.reduce((score, sourceToken) => {
    const matched = targetTokens.some((targetToken) => sourceToken.includes(targetToken) || targetToken.includes(sourceToken));
    return score + (matched ? 1 : 0);
  }, 0);
}

function findRoute(screenCode: string | null, title: string, routes: RouteCandidate[]): RouteCandidate | null {
  if (screenCode) {
    if (MANUAL_NO_ROUTE_SCREEN_CODES.has(screenCode)) return null;

    const exact = routes.find((route) => route.screenCode === screenCode);
    if (exact) return exact;

    const aliasRoute = MANUAL_ROUTE_ALIASES[screenCode];
    if (aliasRoute) return routes.find((route) => route.route === aliasRoute) ?? null;

    if (screenCode.startsWith('DLG-')) {
      const parentScreenCode = screenCode
        .replace(/^DLG-/, 'SCR-')
        .replace(/^SCR-([A-Z]?\d+[A-Z]?)-\d+$/, 'SCR-$1');
      const parent = routes.find((route) => route.screenCode === parentScreenCode);
      return parent ?? null;
    }
  }

  if (!title || title === '(화면 없음)' || title.includes('화면 없음')) {
    return null;
  }

  const scored = routes
    .map((route) => ({
      route,
      score: keywordScore(title, `${route.title} ${route.category}`, ROUTE_MATCH_STOPWORDS),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.route ?? null;
}

function findScenarios(title: string, scenarios: ScenarioCandidate[]): ScenarioCandidate[] {
  return scenarios
    .map((scenario) => ({ scenario, score: keywordScore(title, scenario.name, SCENARIO_MATCH_STOPWORDS) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.scenario);
}

function automationClass(group: Omit<ScreenGroup, 'automationClass'>): string {
  if (!group.route) return 'BLOCKED_NO_ROUTE';
  if (!group.route.pageExists) return 'BLOCKED_NO_PAGE';
  if (group.scenarios.length > 0) return 'AUTO_ROUTE_AND_SCENARIO_CANDIDATE';
  return 'AUTO_ROUTE_SMOKE_CANDIDATE';
}

function buildGroups(rows: AdminTcRow[], routes: RouteCandidate[], scenarios: ScenarioCandidate[]): ScreenGroup[] {
  const byScreen = new Map<string, AdminTcRow[]>();
  for (const row of rows) {
    const key = row.screen || '(화면 없음)';
    byScreen.set(key, [...(byScreen.get(key) ?? []), row]);
  }

  return Array.from(byScreen.entries())
    .map(([screen, screenRows]) => {
      const code = normalizeScreenCode(screen);
      const title = screenTitle(screen);
      const route = findRoute(code, title, routes);
      const scenarioMatches = findScenarios(title, scenarios);
      const base = {
        screen,
        screenCode: code,
        title,
        count: screenRows.length,
        testTypes: countBy(screenRows.map(classifyTestType)),
        envs: countBy(screenRows.map((row) => preconditionEnv(row.precondition))),
        route,
        scenarios: scenarioMatches,
        sampleTcIds: screenRows.slice(0, 5).map((row) => row.tcId),
      };
      return { ...base, automationClass: automationClass(base) };
    })
    .sort((a, b) => b.count - a.count || a.screen.localeCompare(b.screen));
}

function buildRowPlan(rows: AdminTcRow[], groups: ScreenGroup[]) {
  const groupByScreen = new Map(groups.map((group) => [group.screen, group]));
  return rows.map((row) => {
    const group = groupByScreen.get(row.screen);
    const type = classifyTestType(row);
    const env = preconditionEnv(row.precondition);
    const dataHeavy = /피크|월말|다지점|본사 권한|지점 권한|제한 권한|연동 지연/.test(env);
    const status = !group?.route
      ? 'BLOCKED_NO_ROUTE'
      : !group.route.pageExists
        ? 'BLOCKED_NO_PAGE'
        : dataHeavy
          ? 'MANUAL_DATA_SETUP'
          : /정상 진입|재진입|대표 동선|복귀/.test(type)
            ? 'AUTO_CANDIDATE'
            : 'AUTO_CANDIDATE_NEEDS_HANDLER';

    return {
      rowNumber: row.rowNumber,
      tcId: row.tcId,
      screen: row.screen,
      route: group?.route?.route ?? '',
      type,
      env,
      status,
      scenarioCandidates: group?.scenarios.map((scenario) => scenario.id).join(',') ?? '',
    };
  });
}

function topEntries(record: Record<string, number>, limit = 12): Array<[string, number]> {
  return Object.entries(record).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function writeCsv(filePath: string, rows: Array<Record<string, string | number>>) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  fs.writeFileSync(filePath, XLSX.utils.sheet_to_csv(sheet), 'utf8');
}

function generateMarkdown(rows: AdminTcRow[], groups: ScreenGroup[], rowPlan: ReturnType<typeof buildRowPlan>) {
  const statusCounts = countBy(rowPlan.map((row) => row.status));
  const typeCounts = countBy(rowPlan.map((row) => row.type));
  const envCounts = countBy(rowPlan.map((row) => row.env));
  const mapped = groups.filter((group) => group.route).length;
  const withPage = groups.filter((group) => group.route?.pageExists).length;
  const withScenario = groups.filter((group) => group.scenarios.length > 0).length;
  const table = (record: Record<string, number>) =>
    topEntries(record)
      .map(([key, value]) => `| ${key} | ${value} |`)
      .join('\n');

  const groupRows = groups
    .slice(0, 80)
    .map((group) => {
      const scenarios = group.scenarios.map((scenario) => scenario.id).join(', ') || '-';
      const route = group.route ? `${group.route.route}${group.route.pageExists ? '' : ' (no page)'}` : '-';
      return `| ${group.screen} | ${group.count} | ${route} | ${scenarios} | ${group.automationClass} |`;
    })
    .join('\n');

  return `# Admin Sheet QA Plan

Generated: ${new Date().toISOString()}

## Summary

- Source sheet: ${SPREADSHEET_ID} / Admin gid ${ADMIN_GID}
- TC rows: ${rows.length}
- Unique screens: ${groups.length}
- Screens mapped to docs/routes: ${mapped}
- Screens with existing page.tsx: ${withPage}
- Screens with scenario candidate: ${withScenario}

## Row Status Distribution

| Status | Rows |
| --- | ---: |
${table(statusCounts)}

## Test Type Distribution

| Type | Rows |
| --- | ---: |
${table(typeCounts)}

## Environment Distribution

| Environment | Rows |
| --- | ---: |
${table(envCounts)}

## Screen Mapping Preview

| Screen | Rows | Route | Scenario Candidates | Automation Class |
| --- | ---: | --- | --- | --- |
${groupRows}

## Next Execution Gate

1. Review \`screen-groups.csv\` for route mapping misses.
2. Use \`row-plan-sample.csv\` to confirm status labels before writing anything back to Google Sheets.
3. Implement Playwright smoke handlers for \`AUTO_ROUTE_SMOKE_CANDIDATE\`.
4. Implement route-specific interaction handlers for \`AUTO_CANDIDATE_NEEDS_HANDLER\`.
5. Keep \`MANUAL_DATA_SETUP\` rows out of automatic PASS until the required seed/role/time-window fixture exists.
`;
}

async function main() {
  ensureDir(OUTPUT_DIR);

  const csv = await loadCsv();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'admin.csv'), csv, 'utf8');

  const rows = parseRows(csv);
  const routes = loadRouteCandidates();
  const scenarios = loadScenarioCandidates();
  const groups = buildGroups(rows, routes, scenarios);
  const rowPlan = buildRowPlan(rows, groups);

  fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis.json'), JSON.stringify({ rows: rows.length, groups, rowPlan }, null, 2), 'utf8');
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), generateMarkdown(rows, groups, rowPlan), 'utf8');
  writeCsv(
    path.join(OUTPUT_DIR, 'screen-groups.csv'),
    groups.map((group) => ({
      screen: group.screen,
      count: group.count,
      route: group.route?.route ?? '',
      routeTitle: group.route?.title ?? '',
      pageExists: group.route?.pageExists ? 'Y' : 'N',
      scenarios: group.scenarios.map((scenario) => scenario.id).join(','),
      automationClass: group.automationClass,
      sampleTcIds: group.sampleTcIds.join(' '),
    })),
  );
  writeCsv(path.join(OUTPUT_DIR, 'row-plan.csv'), rowPlan);
  writeCsv(path.join(OUTPUT_DIR, 'row-plan-sample.csv'), rowPlan.slice(0, 500));

  console.log(`Admin TC rows: ${rows.length}`);
  console.log(`Unique screens: ${groups.length}`);
  console.log(`Output: ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
