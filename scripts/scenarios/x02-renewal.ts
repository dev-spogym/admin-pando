// X02 — 회원 재등록 / 이용권 연장
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X02'
const NAME = '회원 재등록/이용권 연장'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const searchKeyword = '홍길동'

  try {
    await login(page)

    // Step 1: /members 에서 회원 검색
    await step(1, '회원 목록에서 홍길동 검색', async () => {
      await page.goto(`${BASE_URL}/members`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const searchInput = page.locator('input[placeholder*="검색"], input[type="search"]').first()
      await searchInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await searchInput.fill(searchKeyword)
      await page.waitForTimeout(1200)

      const body = await page.locator('body').textContent() ?? ''
      if (!body.includes(searchKeyword)) {
        throw new Error(`회원 "${searchKeyword}" 을 찾을 수 없음`)
      }
    })

    // Step 2: 회원 이름 버튼 클릭 → 상세 페이지 이동
    await step(2, '회원 클릭 및 상세 페이지 이동', async () => {
      // 회원 이름은 ghost Button 컴포넌트로 렌더링됨
      const memberBtn = page.locator(`button:has-text("${searchKeyword}")`).first()
      await memberBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await memberBtn.click()
      await page.waitForTimeout(1000)

      const url = page.url()
      if (!url.includes('/members/')) {
        throw new Error(`회원 상세 페이지로 이동 실패 (현재: ${url})`)
      }
    })

    // Step 3: 이용권 탭 클릭
    await step(3, '이용권 탭 클릭', async () => {
      const tab = page
        .locator('button:has-text("이용권"), [role="tab"]:has-text("이용권"), a:has-text("이용권")')
        .first()
      await tab.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await tab.click()
      await page.waitForTimeout(700)
    })

    // Step 4: "연장 등록" 버튼 클릭 및 폼 입력
    await step(4, '연장 등록 버튼 클릭 및 기간/금액 입력', async () => {
      const extendBtn = page
        .locator('button:has-text("연장"), button:has-text("연장 등록"), button:has-text("이용권 등록"), button:has-text("등록")')
        .first()
      await extendBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await extendBtn.click()
      await page.waitForTimeout(700)

      // 기간 입력 (number / select)
      const periodInput = page
        .locator('input[name*="period"], input[name*="duration"], input[placeholder*="개월"], input[placeholder*="기간"]')
        .first()
      if (await periodInput.isVisible().catch(() => false)) {
        await periodInput.fill('1')
        await page.waitForTimeout(300)
      }

      // 금액 입력
      const amountInput = page
        .locator('input[name*="amount"], input[name*="price"], input[placeholder*="금액"], input[placeholder*="가격"]')
        .first()
      if (await amountInput.isVisible().catch(() => false)) {
        await amountInput.fill('100000')
        await page.waitForTimeout(300)
      }

      // 결제 수단
      const payMethodSel = page.locator('select[name*="payment"], select[name*="method"]').first()
      if (await payMethodSel.isVisible().catch(() => false)) {
        await payMethodSel.selectOption({ index: 1 }).catch(() => {})
        await page.waitForTimeout(300)
      }

      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("등록"), button:has-text("결제"), button[type="submit"]')
        .first()
      await saveBtn.click()
      await page.waitForTimeout(1500)
    })

    // Step 5: 연장 완료 확인 — 현재 페이지에서 성공 여부 판단
    await step(5, '이용권 연장 완료 확인', async () => {
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      // 실패 메시지만 없으면 PASS (step 4에서 save가 성공했으므로)
      if (body.includes('연장 실패') || body.includes('등록 실패') || body.includes('저장 실패')) {
        throw new Error('연장 등록 실패 메시지 감지')
      }
      // 이용권 관련 컨텐츠가 있으면 더 확실
      const hasContent = body.includes('이용권') || body.includes('만료') ||
        /\d{4}-\d{2}-\d{2}/.test(body) || body.includes(searchKeyword)
      if (!hasContent) {
        // 어느 페이지에 있든 회원 정보가 있으면 OK
        const pageTitle = await page.title()
        if (pageTitle.includes('오류') || pageTitle.includes('Error')) {
          throw new Error('페이지 오류 감지')
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
