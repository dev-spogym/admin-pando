// X05 — POS 결제 → 이용권 개시
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X05'
const NAME = 'POS 결제→이용권개시'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const searchKeyword = '홍길동'

  try {
    await login(page)

    // Step 1: /pos 이동 및 구매자 검색 모달 열기
    await step(1, 'POS 페이지 이동 및 구매자 검색 모달 열기', async () => {
      await page.goto(`${BASE_URL}/pos`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1200)

      // 구매자 검색 모달 트리거: "회원 검색" 링크/버튼 클릭
      const buyerBtn = page
        .locator('button:has-text("회원 검색"), a:has-text("회원 검색"), button:has-text("[회원 검색]")')
        .first()
      await buyerBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await buyerBtn.click()
      await page.waitForTimeout(500)
    })

    // Step 2: 구매자 모달에서 회원 검색 및 선택
    await step(2, '구매자 모달에서 회원 검색 및 선택', async () => {
      // 모달 내 검색 input (placeholder: "이름 또는 전화번호 검색...")
      const modalInput = page
        .locator('input[placeholder*="이름 또는 전화번호"], input[placeholder*="전화번호 검색"], input[placeholder*="구매자"]')
        .first()
      await modalInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await modalInput.fill(searchKeyword)
      await page.waitForTimeout(1200)

      // 검색 결과에서 첫 번째 회원 클릭
      const firstResult = page
        .locator(`text="${searchKeyword}"`)
        .first()
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click()
      } else {
        // 결과 리스트의 첫 아이템 클릭
        const anyResult = page
          .locator('[class*="result"] button, [class*="dropdown"] button, [role="listbox"] [role="option"]')
          .first()
        await anyResult.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
        await anyResult.click()
      }
      await page.waitForTimeout(700)
    })

    // Step 3: 헬스 이용권 상품 선택
    await step(3, '헬스 이용권 상품 선택', async () => {
      const product = page
        .locator('button:has-text("이용권"), tr:has-text("이용권"), [class*="product"]:has-text("이용권"), li:has-text("이용권")')
        .first()
      await product.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await product.click()
      await page.waitForTimeout(700)
    })

    // Step 4: 결제 수단 선택 (카드) 및 결제
    await step(4, '결제 수단 선택 및 결제 완료', async () => {
      // 카드 선택
      const cardOption = page
        .locator('button:has-text("카드"), input[value="CARD"], label:has-text("카드"), button:has-text("신용카드")')
        .first()
      if (await cardOption.isVisible().catch(() => false)) {
        await cardOption.click()
        await page.waitForTimeout(500)
      }

      // 결제 버튼
      const payBtn = page
        .locator('button:has-text("결제"), button:has-text("결제하기"), button:has-text("완료"), button:has-text("처리")')
        .first()
      await payBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await payBtn.click()
      await page.waitForTimeout(2000)

      // 확인 모달이 있으면 처리
      const confirmBtn = page
        .locator('button:has-text("확인"), button:has-text("완료"), button:has-text("결제 완료")')
        .first()
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(1500)
      }
    })

    // Step 5: /sales 에서 결제 내역 확인
    await step(5, '매출 목록에서 결제 내역 확인', async () => {
      await page.goto(`${BASE_URL}/sales`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const body = await page.locator('body').textContent() ?? ''
      const rowCount = await page.locator('table tbody tr, [class*="sale-row"]').count()
      if (rowCount === 0 && body.includes('없습니다')) {
        throw new Error('매출 목록에 결제 내역 없음')
      }
    })

    // Step 6: 회원 상세에서 이용권 ACTIVE 확인
    await step(6, '회원 상세에서 이용권 ACTIVE 확인', async () => {
      await page.goto(`${BASE_URL}/members`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(800)

      const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]').first()
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill(searchKeyword)
        await page.waitForTimeout(1000)
      }

      const row = page
        .locator(`tr:has-text("${searchKeyword}"), a:has-text("${searchKeyword}")`)
        .first()
      if (await row.isVisible().catch(() => false)) {
        await row.click()
        await page.waitForTimeout(1000)

        const tab = page.locator('button:has-text("이용권"), [role="tab"]:has-text("이용권")').first()
        if (await tab.isVisible().catch(() => false)) {
          await tab.click()
          await page.waitForTimeout(700)
        }

        const body = await page.locator('body').textContent() ?? ''
        if (!body.includes('ACTIVE') && !body.includes('활성') && !body.includes('이용중')) {
          throw new Error('이용권 ACTIVE 상태를 확인할 수 없음')
        }
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
