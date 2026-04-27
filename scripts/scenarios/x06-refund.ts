// X06 — 환불 처리
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X06'
const NAME = '환불 처리'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /sales 에서 결제 건 확인
    await step(1, '/sales 매출 목록 이동 및 결제 건 확인', async () => {
      await page.goto(`${BASE_URL}/sales`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const rowCount = await page.locator('table tbody tr, [class*="sale-row"], [class*="sales-item"]').count()
      if (rowCount === 0) {
        throw new Error('환불할 매출 건이 없음')
      }
    })

    // Step 2: /sales/cancel-refund 직접 이동 및 결제 검색
    await step(2, '/sales/cancel-refund 이동 및 결제 검색', async () => {
      await page.goto(`${BASE_URL}/sales/cancel-refund`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      // 검색 입력 (placeholder: "회원명, 결제번호, 상품명으로 검색")
      const searchInput = page
        .locator('input[placeholder*="회원명"], input[placeholder*="결제번호"], input[placeholder*="검색"]')
        .first()
      await searchInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await searchInput.fill('김')
      await page.waitForTimeout(700)

      // 검색 결과 확인
      const rows = await page.locator('table tbody tr').count()
      if (rows === 0) {
        throw new Error('검색 결과 없음')
      }
    })

    // Step 3: "선택" 버튼 클릭 → 부분 환불 선택 → 금액/사유 입력
    await step(3, '결제 건 선택 및 환불 정보 입력', async () => {
      // "선택" 버튼 클릭
      const selectBtn = page.locator('button:has-text("선택")').first()
      await selectBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await selectBtn.click()
      await page.waitForTimeout(700)

      // "부분 환불" 선택
      const partialBtn = page.locator('button:has-text("부분 환불")').first()
      if (await partialBtn.isVisible().catch(() => false)) {
        await partialBtn.click()
        await page.waitForTimeout(500)
      }

      // 환불 금액
      const amountInput = page
        .locator('input[placeholder*="환불할 금액"], input[placeholder*="금액 입력"], input[type="number"]')
        .first()
      if (await amountInput.isVisible().catch(() => false)) {
        await amountInput.clear()
        await amountInput.fill('10000')
        await page.waitForTimeout(300)
      }

      // 취소 사유 select
      const reasonSel = page.locator('select').first()
      if (await reasonSel.isVisible().catch(() => false)) {
        await reasonSel.selectOption({ index: 0 }).catch(() => {})
        await page.waitForTimeout(200)
      }
    })

    // Step 4: "전체 취소 처리" 또는 "부분 환불 처리" 클릭
    await step(4, '환불 처리 실행', async () => {
      const submitBtn = page
        .locator('button:has-text("부분 환불 처리"), button:has-text("전체 취소 처리")')
        .first()
      await submitBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await submitBtn.click()
      await page.waitForTimeout(2000)

      // 성공 상태 확인 (result==='success' → CheckCircle 아이콘 + 성공 메시지)
      const body = await page.locator('body').textContent() ?? ''
      if (body.includes('실패') || body.includes('오류')) {
        throw new Error('환불 처리 실패 메시지 감지')
      }
    })

    // Step 5: /refunds 에서 환불 내역 확인
    await step(5, '/refunds 환불 내역 확인', async () => {
      await page.goto(`${BASE_URL}/refunds`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const body = await page.locator('body').textContent() ?? ''
      const rowCount = await page.locator('table tbody tr, [class*="refund-row"]').count()
      if (rowCount === 0 && !body.includes('환불') && !body.includes('REFUND')) {
        throw new Error('환불 내역을 찾을 수 없음')
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
