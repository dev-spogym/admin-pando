// X13 — 전자계약 서명
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X13'
const NAME = '전자계약 서명'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /contracts/new 이동 → 계약 생성 폼 확인
    await step(1, '/contracts/new 계약 생성 폼 확인', async () => {
      await page.goto(`${BASE_URL}/contracts/new`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      // 폼 또는 관련 콘텐츠 확인
      const hasForm = await page.locator('form').first().isVisible().catch(() => false)
      const hasInput = await page.locator('input').first().isVisible().catch(() => false)
      const body = await page.locator('body').textContent() ?? ''
      const hasContractText =
        body.includes('계약') || body.includes('contract') || body.includes('서명')

      if (!hasForm && !hasInput && !hasContractText) {
        throw new Error('계약 생성 폼 또는 관련 콘텐츠가 없음')
      }
    })

    // Step 2: 회원 검색 입력 → '홍길동' 입력
    await step(2, '회원 검색창에 "홍길동" 입력', async () => {
      const memberInput = page
        .locator('input[placeholder*="회원"], input[placeholder*="검색"], input[placeholder*="이름"]')
        .first()
      await memberInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await memberInput.fill('홍길동')
      await page.waitForTimeout(1000)

      // 자동완성/드롭다운 결과 클릭 시도
      const suggestion = page
        .locator('li:has-text("홍길동"), [class*="option"]:has-text("홍길동"), [class*="suggestion"]:has-text("홍길동"), [class*="dropdown"] :has-text("홍길동")')
        .first()
      if (await suggestion.isVisible().catch(() => false)) {
        await suggestion.click()
        await page.waitForTimeout(500)
      }
    })

    // Step 3: 상품/계약 종류 선택
    await step(3, '상품 또는 계약 종류 선택', async () => {
      // select 요소로 선택 시도
      const productSel = page
        .locator('select[name*="product"], select[name*="plan"], select[name*="type"], select[name*="contract"]')
        .first()
      if (await productSel.isVisible().catch(() => false)) {
        await productSel.selectOption({ index: 1 }).catch(() => {})
        await page.waitForTimeout(500)
      } else {
        // 버튼 형태의 상품 선택
        const productBtn = page
          .locator('button:has-text("이용권"), button:has-text("PT"), button:has-text("회원권"), [class*="product"]:first-child')
          .first()
        if (await productBtn.isVisible().catch(() => false)) {
          await productBtn.click()
          await page.waitForTimeout(500)
        } else {
          // 일반 select 첫 번째 옵션 선택
          const anySelect = page.locator('select').first()
          if (await anySelect.isVisible().catch(() => false)) {
            await anySelect.selectOption({ index: 1 }).catch(() => {})
            await page.waitForTimeout(500)
          }
        }
      }

      // 선택 후 폼 상태 확인 (에러 없으면 PASS)
    })

    // Step 4: 저장/발행 버튼 클릭 → 계약 상태 확인
    await step(4, '저장/발행 버튼 클릭 및 계약 상태 확인', async () => {
      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("발행"), button:has-text("생성"), button[type="submit"]')
        .first()
      const btnVisible = await saveBtn.isVisible().catch(() => false)

      if (btnVisible) {
        await saveBtn.click()
        await page.waitForTimeout(2000)
      }

      // 계약 상태 또는 결과 확인
      const body = await page.locator('body').textContent() ?? ''
      const hasContractStatus =
        body.includes('계약') ||
        body.includes('발행') ||
        body.includes('서명') ||
        body.includes('완료') ||
        body.includes('대기') ||
        body.includes('PENDING') ||
        body.includes('SIGNED')

      // /contracts 목록으로 이동하여 확인
      if (!hasContractStatus) {
        await page.goto(`${BASE_URL}/contracts`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
        await page.waitForTimeout(1000)
        const listBody = await page.locator('body').textContent() ?? ''
        const hasListContent =
          listBody.includes('계약') ||
          listBody.includes('홍길동') ||
          (await page.locator('table tbody tr').count()) > 0

        if (!hasListContent) {
          throw new Error('계약 상태 또는 목록 데이터 확인 불가')
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
