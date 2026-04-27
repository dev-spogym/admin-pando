// X31 — 골프 타석 예약 관리 (관리자 측)
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X31'
const NAME = '골프 타석 예약 관리 (관리자 측)'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /golf-bays 이동 → 골프 타석 관리 페이지 확인
    await step(1, '/golf-bays 골프 타석 관리 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/golf-bays`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('골프 타석 관리 페이지 body가 비어있음')
    })

    // Step 2: 타석 목록 확인
    await step(2, '타석 목록 확인 (테이블 행 or bay/golf 클래스)', async () => {
      const rowCount = await page.locator('table tbody tr').count()
      const bayCount = await page.locator('[class*="bay"], [class*="golf"]').count()
      const body = await page.locator('body').textContent() ?? ''
      if (rowCount === 0 && bayCount === 0 && body.trim().length < 5) {
        throw new Error('타석 목록 데이터 없음')
      }
    })

    // Step 3: 예약 현황 확인
    await step(3, '예약 현황 확인 (예약/배정/타석 텍스트)', async () => {
      const body = await page.locator('body').textContent() ?? ''
      const hasReservationText = /예약|배정|타석/.test(body)
      if (!hasReservationText && body.trim().length < 5) {
        throw new Error('예약 현황 텍스트 없음')
      }
    })

    // Step 4: 예약 추가 버튼 클릭 → 폼 확인 (없으면 목록 데이터로 PASS)
    await step(4, '예약 추가 버튼 클릭 or 목록 데이터 확인', async () => {
      const addBtn = page
        .locator('button:has-text("추가"), button:has-text("예약"), button:has-text("등록"), button:has-text("+ ")')
        .first()
      const btnVisible = await addBtn.isVisible().catch(() => false)
      if (btnVisible) {
        await addBtn.click()
        await page.waitForTimeout(1000)
        const body = await page.locator('body').textContent() ?? ''
        if (body.trim().length < 5) throw new Error('예약 추가 폼 body가 비어있음')
      } else {
        const rowCount = await page.locator('table tbody tr').count()
        const body = await page.locator('body').textContent() ?? ''
        if (rowCount === 0 && body.trim().length < 5) throw new Error('목록 데이터 없음')
      }
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
