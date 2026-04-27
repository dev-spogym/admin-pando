// X09 — KPI 롤업 및 주간 리포트
import {
  setupBrowser, loginAsHQ, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X09'
const NAME = 'KPI 롤업 및 주간 리포트'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await loginAsHQ(page)

    // Step 1: /kpi 페이지 이동 → 콘텐츠 로드 확인
    await step(1, '/kpi 페이지 이동 및 콘텐츠 로드 확인', async () => {
      await page.goto(`${BASE_URL}/kpi`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      // table, kpi 클래스, chart 클래스 중 하나 존재하면 PASS
      const hasTable = await page.locator('table').first().isVisible().catch(() => false)
      const hasKpi = await page.locator('[class*="kpi"]').first().isVisible().catch(() => false)
      const hasChart = await page.locator('[class*="chart"]').first().isVisible().catch(() => false)

      if (!hasTable && !hasKpi && !hasChart) {
        throw new Error('KPI 페이지에 콘텐츠(table / kpi / chart)가 없음')
      }
    })

    // Step 2: KPI 지표 데이터 확인 (숫자 또는 퍼센트 노출)
    await step(2, 'KPI 지표 숫자/퍼센트 데이터 노출 확인', async () => {
      const body = await page.locator('body').textContent() ?? ''

      // 숫자(정수/소수)나 퍼센트(%) 패턴이 있으면 PASS
      const hasNumber = /\d+/.test(body)
      const hasPercent = /%/.test(body)

      if (!hasNumber && !hasPercent) {
        throw new Error('KPI 지표 데이터(숫자/퍼센트)가 없음')
      }
    })

    // Step 3: /reports 페이지 이동 → 리포트 목록 확인
    await step(3, '/reports 리포트 목록 확인', async () => {
      await page.goto(`${BASE_URL}/reports`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      const body = await page.locator('body').textContent() ?? ''
      const hasReport = await page.locator('table, [class*="report"], [class*="list"]').first().isVisible().catch(() => false)

      // 리포트 목록 또는 관련 텍스트 확인
      if (!hasReport && !body.includes('리포트') && !body.includes('report')) {
        throw new Error('리포트 목록 또는 관련 콘텐츠가 없음')
      }
    })

    // Step 4: /branch-report 이동 → 지점별 데이터 확인
    await step(4, '/branch-report 지점별 데이터 확인', async () => {
      await page.goto(`${BASE_URL}/branch-report`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      const body = await page.locator('body').textContent() ?? ''
      const hasContent = await page.locator('table, [class*="branch"], [class*="report"], [class*="chart"]').first().isVisible().catch(() => false)

      if (!hasContent && !body.includes('지점') && !body.includes('branch')) {
        throw new Error('지점별 데이터 또는 관련 콘텐츠가 없음')
      }
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => {
  printResult(r)
  process.exit(r.status === 'FAIL' ? 1 : 0)
})
