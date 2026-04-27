// 전체 시나리오 실행 + HTML 리포트 생성
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const SCENARIOS = [
  { id: 'X01', file: 'x01-onboarding', name: '신규 리드→상담→회원가입→POS결제' },
  { id: 'X02', file: 'x02-renewal', name: '회원 재등록/이용권 연장' },
  { id: 'X03', file: 'x03-penalty', name: '페널티 등록' },
  { id: 'X04', file: 'x04-body-composition', name: '체성분 측정 등록' },
  { id: 'X05', file: 'x05-pos-payment', name: 'POS 결제→이용권개시' },
  { id: 'X06', file: 'x06-refund', name: '환불 처리' },
  { id: 'X07', file: 'x07-locker', name: '락커 배정' },
  { id: 'X08', file: 'x08-staff-attendance', name: '직원 출근 등록' },
  { id: 'X12', file: 'x12-group-class', name: '그룹수업 등록' },
]

interface RunResult {
  id: string
  name: string
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR'
  duration: number
  output: string
  error?: string
}

const OUTPUT_DIR = path.join(process.cwd(), 'qa-results')
const REPORT_PATH = path.join(OUTPUT_DIR, 'scenario-report.html')
fs.mkdirSync(OUTPUT_DIR, { recursive: true })

function runScenario(file: string): { stdout: string; exitCode: number; duration: number } {
  const t0 = Date.now()
  try {
    const stdout = execSync(
      `tsx --tsconfig tsconfig.scripts.json scripts/scenarios/${file}.ts`,
      { encoding: 'utf-8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'] }
    )
    return { stdout, exitCode: 0, duration: Date.now() - t0 }
  } catch (e: any) {
    return {
      stdout: (e.stdout ?? '') + (e.stderr ?? ''),
      exitCode: e.status ?? 1,
      duration: Date.now() - t0,
    }
  }
}

function parseStatus(output: string, exitCode: number): 'PASS' | 'PARTIAL' | 'FAIL' | 'ERROR' {
  if (output.includes('✅') && output.includes('PASS')) return 'PASS'
  if (output.includes('⚠️') && output.includes('PARTIAL')) return 'PARTIAL'
  if (output.includes('❌') && output.includes('FAIL')) return 'FAIL'
  if (exitCode === 0) return 'PASS'
  return 'ERROR'
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    PASS: '#22c55e',
    PARTIAL: '#f59e0b',
    FAIL: '#ef4444',
    ERROR: '#8b5cf6',
  }
  const icon: Record<string, string> = { PASS: '✅', PARTIAL: '⚠️', FAIL: '❌', ERROR: '💥' }
  return `<span style="background:${map[status] ?? '#6b7280'};color:white;padding:2px 10px;border-radius:12px;font-weight:600;font-size:13px">${icon[status] ?? ''} ${status}</span>`
}

function generateHtml(results: RunResult[], totalDuration: number): string {
  const pass = results.filter((r) => r.status === 'PASS').length
  const partial = results.filter((r) => r.status === 'PARTIAL').length
  const fail = results.filter((r) => ['FAIL', 'ERROR'].includes(r.status)).length
  const total = results.length
  const now = new Date().toLocaleString('ko-KR')

  const rows = results
    .map((r) => {
      const lines = r.output
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const color = l.startsWith('  ✓') ? '#16a34a' : l.startsWith('  ✗') ? '#dc2626' : '#374151'
          return `<div style="color:${color};font-family:monospace;font-size:12px;padding:1px 0">${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
        })
        .join('')

      return `
      <tr>
        <td style="padding:12px 16px;font-weight:600">${r.id}</td>
        <td style="padding:12px 16px">${r.name}</td>
        <td style="padding:12px 16px">${statusBadge(r.status)}</td>
        <td style="padding:12px 16px;color:#6b7280">${(r.duration / 1000).toFixed(1)}s</td>
        <td style="padding:8px 16px">
          <details>
            <summary style="cursor:pointer;color:#6b7280;font-size:12px">로그 보기</summary>
            <div style="margin-top:8px;background:#f9fafb;border-radius:6px;padding:8px">${lines || '(출력 없음)'}</div>
          </details>
        </td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>FitGenie CRM — 시나리오 E2E 결과</title>
<style>
  body { font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 32px; color: #1e293b; }
  .header { background: white; border-radius: 12px; padding: 24px 32px; margin-bottom: 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  h1 { margin: 0 0 4px; font-size: 22px; }
  .meta { color: #64748b; font-size: 13px; }
  .summary { display: flex; gap: 16px; margin: 20px 0 0; }
  .card { background: white; border-radius: 10px; padding: 16px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.08); flex: 1; text-align: center; }
  .card .num { font-size: 32px; font-weight: 700; }
  .card .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  thead { background: #f1f5f9; }
  th { padding: 12px 16px; text-align: left; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; }
  tbody tr { border-top: 1px solid #f1f5f9; }
  tbody tr:hover { background: #fafafa; }
</style>
</head>
<body>
<div class="header">
  <h1>🏋️ FitGenie CRM — 시나리오 E2E 테스트 결과</h1>
  <div class="meta">실행 시각: ${now} | 총 소요: ${(totalDuration / 1000).toFixed(1)}s</div>
  <div class="summary">
    <div class="card"><div class="num" style="color:#22c55e">${pass}</div><div class="label">✅ PASS</div></div>
    <div class="card"><div class="num" style="color:#f59e0b">${partial}</div><div class="label">⚠️ PARTIAL</div></div>
    <div class="card"><div class="num" style="color:#ef4444">${fail}</div><div class="label">❌ FAIL / ERROR</div></div>
    <div class="card"><div class="num">${total}</div><div class="label">전체 시나리오</div></div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>ID</th>
      <th>시나리오</th>
      <th>결과</th>
      <th>소요</th>
      <th>상세 로그</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>
</body>
</html>`
}

async function main() {
  console.log('\n🏋️  FitGenie CRM — 시나리오 E2E 실행\n')
  console.log(`총 ${SCENARIOS.length}개 시나리오를 순차 실행합니다.\n`)
  console.log('─'.repeat(60))

  const results: RunResult[] = []
  const globalStart = Date.now()

  // 실행할 특정 시나리오 필터 (CLI: --only X01,X03)
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const onlyIds = onlyArg ? onlyArg.replace('--only=', '').split(',') : null

  const toRun = onlyIds ? SCENARIOS.filter((s) => onlyIds.includes(s.id)) : SCENARIOS

  for (const scenario of toRun) {
    process.stdout.write(`  ⏳ [${scenario.id}] ${scenario.name} ... `)
    const { stdout, exitCode, duration } = runScenario(scenario.file)
    const status = parseStatus(stdout, exitCode)
    const icon = status === 'PASS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌'
    console.log(`${icon} ${status} (${(duration / 1000).toFixed(1)}s)`)
    results.push({ id: scenario.id, name: scenario.name, status, duration, output: stdout })
  }

  const totalDuration = Date.now() - globalStart

  // 요약 출력
  console.log('\n' + '─'.repeat(60))
  const pass = results.filter((r) => r.status === 'PASS').length
  const partial = results.filter((r) => r.status === 'PARTIAL').length
  const fail = results.filter((r) => ['FAIL', 'ERROR'].includes(r.status)).length
  console.log(`\n📊 결과 요약: ✅ PASS ${pass}  ⚠️ PARTIAL ${partial}  ❌ FAIL/ERROR ${fail}  / 전체 ${results.length}`)

  // HTML 리포트
  const html = generateHtml(results, totalDuration)
  fs.writeFileSync(REPORT_PATH, html, 'utf-8')
  console.log(`\n📄 HTML 리포트: ${REPORT_PATH}`)
  console.log(`📁 스크린샷:   ${path.join(process.cwd(), 'qa-results', 'scenarios')}\n`)

  process.exit(fail > 0 ? 1 : 0)
}

main()
