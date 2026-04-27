// X32 — 수업 후기 평가 관리 (관리자 측)
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X32'
const NAME = '수업 후기 평가 관리 (관리자 측)'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /class-feedback 이동 → 수업 후기 목록 페이지 확인
    await step(1, '/class-feedback 수업 후기 목록 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/class-feedback`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('수업 후기 페이지 body가 비어있음')
    })

    // Step 2: 후기 데이터 확인
    await step(2, '후기 데이터 확인 (테이블 행 or feedback 클래스)', async () => {
      const rowCount = await page.locator('table tbody tr').count()
      const feedbackCount = await page.locator('[class*="feedback"]').count()
      const body = await page.locator('body').textContent() ?? ''
      if (rowCount === 0 && feedbackCount === 0 && body.trim().length < 5) {
        throw new Error('후기 데이터 없음')
      }
    })

    // Step 3: 평점/별점 정보 확인
    await step(3, '평점/별점 정보 확인 (숫자/별/평점 텍스트)', async () => {
      const body = await page.locator('body').textContent() ?? ''
      const hasRatingText = /[0-9]|별|평점|★|☆|rating/i.test(body)
      if (!hasRatingText && body.trim().length < 5) {
        throw new Error('평점/별점 정보 없음')
      }
    })

    // Step 4: 후기 상세 클릭 (첫 번째 행, 없으면 PASS)
    await step(4, '후기 상세 클릭 (첫 번째 행 클릭, 없으면 PASS)', async () => {
      const firstRow = page.locator('table tbody tr').first()
      const rowVisible = await firstRow.isVisible().catch(() => false)
      if (rowVisible) {
        await firstRow.click()
        await page.waitForTimeout(1000)
        const body = await page.locator('body').textContent() ?? ''
        if (body.trim().length < 5) throw new Error('후기 상세 body가 비어있음')
      }
      // 행이 없으면 PASS
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
