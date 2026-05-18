import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const OUTPUT_DIR = path.join(process.cwd(), 'qa-results', 'admin-sheet');
const ADMIN_CSV = path.join(OUTPUT_DIR, 'admin.csv');
const ANALYSIS_JSON = path.join(OUTPUT_DIR, 'analysis.json');
const SMOKE_JSON = path.join(OUTPUT_DIR, 'smoke-sample.json');
const ROW_E2E_JSON = path.join(OUTPUT_DIR, 'row-e2e-results.json');

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

interface SmokeResult {
  route: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  reason: string;
}

interface RowE2EResult {
  rowNumber: number;
  status: 'PASS_E2E' | 'WARN_E2E' | 'FAIL_E2E' | 'SKIP_NOT_AUTOMATABLE';
  reason: string;
  durationMs: number;
  finalUrl: string;
  bodyLength: number;
  consoleErrors: number;
  screenshot: string;
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

function statusLabel(plan: RowPlan, smoke: SmokeResult | undefined, e2e: RowE2EResult | undefined): string {
  if (e2e) return e2e.status;
  if (plan.status === 'BLOCKED_NO_ROUTE') return 'BLOCKED';
  if (plan.status === 'MANUAL_DATA_SETUP') return 'NOT_RUN_NEEDS_FIXTURE';
  if (!smoke) return 'NOT_RUN';
  if (smoke.status === 'FAIL') return 'FAIL';
  if (smoke.status === 'WARN') return 'WARN';
  return 'NOT_RUN_NEEDS_HANDLER';
}

function reason(plan: RowPlan, smoke: SmokeResult | undefined, e2e: RowE2EResult | undefined): string {
  if (e2e) return e2e.reason;
  if (plan.status === 'BLOCKED_NO_ROUTE') return '앱 라우트 매핑 필요';
  if (plan.status === 'MANUAL_DATA_SETUP') return '피크/월말/다지점/권한 등 fixture 준비 필요';
  if (smoke?.status === 'FAIL') return smoke.reason || 'route smoke 실패';
  if (smoke?.status === 'WARN') return smoke.reason || 'route smoke 경고';
  return '행별 액션 handler 또는 fixture 필요';
}

function publishingStatus(plan: RowPlan | undefined, e2e: RowE2EResult | undefined, smoke: SmokeResult | undefined): string {
  if (!plan?.route) return '미구현_ROUTE없음';
  if (e2e?.status === 'FAIL_E2E') return '보완필요_E2E실패';
  if (e2e?.status === 'WARN_E2E') return '보완필요_E2E경고';
  if (e2e?.status === 'PASS_E2E') return '구현확인_E2E';
  if (smoke?.status === 'FAIL') return '보완필요_ROUTE실패';
  if (smoke?.status === 'WARN') return '보완필요_ROUTE경고';
  if (plan.status === 'MANUAL_DATA_SETUP') return '검증대기_데이터준비필요';
  if (plan.status === 'AUTO_CANDIDATE_NEEDS_HANDLER') return '검증대기_자동화보강필요';
  return '검증대기_E2E미실행';
}

function writeCsv(filePath: string, rows: Array<Record<string, string | number>>) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  fs.writeFileSync(filePath, XLSX.utils.sheet_to_csv(sheet), 'utf8');
}

function countBy(rows: Array<Record<string, string>>, key: string): Record<string, number> {
  return rows.reduce(
    (acc, row) => {
      const value = row[key] || '(empty)';
      acc[value] = (acc[value] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
}

function markdownTable(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, value]) => `| ${key} | ${value} |`)
    .join('\n');
}

function main() {
  if (!fs.existsSync(ADMIN_CSV)) throw new Error(`Missing ${ADMIN_CSV}`);
  if (!fs.existsSync(ANALYSIS_JSON)) throw new Error(`Missing ${ANALYSIS_JSON}`);

  const sourceRows = parseRows(fs.readFileSync(ADMIN_CSV, 'utf8'));
  const analysis = JSON.parse(fs.readFileSync(ANALYSIS_JSON, 'utf8')) as { rowPlan: RowPlan[] };
  const smokeResults = fs.existsSync(SMOKE_JSON)
    ? (JSON.parse(fs.readFileSync(SMOKE_JSON, 'utf8')) as SmokeResult[])
    : [];
  const rowE2EResults = fs.existsSync(ROW_E2E_JSON)
    ? (JSON.parse(fs.readFileSync(ROW_E2E_JSON, 'utf8')) as RowE2EResult[])
    : [];
  const smokeByRoute = new Map(smokeResults.map((item) => [item.route, item]));
  const e2eByRow = new Map(rowE2EResults.map((item) => [item.rowNumber, item]));
  const planByRow = new Map(analysis.rowPlan.map((item) => [item.rowNumber, item]));

  const deliverable = sourceRows.map((row) => {
    const plan = planByRow.get(row.rowNumber);
    const smoke = plan?.route ? smokeByRoute.get(plan.route) : undefined;
    const e2e = e2eByRow.get(row.rowNumber);
    const 검증상태 = plan ? statusLabel(plan, smoke, e2e) : 'BLOCKED';
    const 검증메모 = plan ? reason(plan, smoke, e2e) : '분석 결과 없음';
    const 퍼블리싱상태 = publishingStatus(plan, e2e, smoke);

    return {
      행번호: row.rowNumber,
      'TC ID': row.tcId,
      화면: row.screen,
      '테스트 항목': row.testItem,
      선행조건: row.precondition,
      수행절차: row.procedure,
      기대결과: row.expected,
      route: plan?.route ?? '',
      검증유형: plan?.type ?? '',
      환경: plan?.env ?? '',
      검증상태,
      검증메모,
      퍼블리싱상태,
      실행URL: e2e?.finalUrl ?? '',
      실행시간ms: e2e?.durationMs ?? '',
      본문길이: e2e?.bodyLength ?? '',
      콘솔에러수: e2e?.consoleErrors ?? '',
      증적: e2e?.screenshot ?? '',
      시나리오후보: plan?.scenarioCandidates ?? '',
    };
  });

  const csvPath = path.join(OUTPUT_DIR, 'client-tc-list.csv');
  writeCsv(csvPath, deliverable);

  const summary = `# Admin TC Client List Summary

Generated: ${new Date().toISOString()}

- Total rows: ${deliverable.length}
- Smoke routes executed: ${smokeResults.length}
- Row E2E executed: ${rowE2EResults.length}

## Verification Status

| Status | Rows |
| --- | ---: |
${markdownTable(countBy(deliverable as Array<Record<string, string>>, '검증상태'))}

## Publishing Status

| Status | Rows |
| --- | ---: |
${markdownTable(countBy(deliverable as Array<Record<string, string>>, '퍼블리싱상태'))}

## Notes

- PASS_E2E: 해당 행을 브라우저에서 실제 실행했고 기대 조건을 통과.
- WARN_E2E: 해당 행을 브라우저에서 실행했으나 console error 또는 반응형 overflow 등 경고 있음.
- FAIL_E2E: 해당 행을 브라우저에서 실행했고 실패.
- NOT_RUN_NEEDS_HANDLER: route는 있으나 저장/충돌/후속반영 등 행별 handler가 필요해 미실행.
- NOT_RUN_NEEDS_FIXTURE: 피크/월말/다지점/권한 등 전용 fixture가 필요해 미실행.
- BLOCKED: 현재 앱 route 매핑이 없어 확인 필요.
- WARN/FAIL: route smoke 단계의 경고/실패.
- 퍼블리싱상태는 화면 구현/보완/미구현/검증대기 여부를 클라이언트가 바로 필터링할 수 있도록 별도 분류.
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'client-tc-list-summary.md'), summary, 'utf8');
  console.log(`Client TC list: ${csvPath}`);
}

main();
