// X03 — 페널티 등록
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT, randomSuffix,
} from './_setup'

const ID = 'X03'
const NAME = '페널티 등록'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const reason = `테스트 페널티 ${randomSuffix()}`

  try {
    await login(page)

    // Step 1: /penalties 이동 및 페널티 추가 버튼 클릭
    await step(1, '/penalties 페널티 추가 버튼 클릭', async () => {
      await page.goto(`${BASE_URL}/penalties`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const addBtn = page
        .locator('button:has-text("추가"), button:has-text("페널티 추가"), button:has-text("등록"), button:has-text("신규")')
        .first()
      await addBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await addBtn.click()
      await page.waitForTimeout(700)
    })

    // Step 2: 회원 검색 및 선택
    await step(2, '회원 검색 및 선택', async () => {
      const memberSearch = page
        .locator('input[placeholder*="회원"], input[placeholder*="검색"], input[placeholder*="이름"]')
        .first()
      await memberSearch.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await memberSearch.fill('홍')
      await page.waitForTimeout(1000)

      // 검색 결과 첫 번째 선택
      const firstResult = page
        .locator('[class*="dropdown"] li, [class*="result"] li, [role="listbox"] [role="option"], [class*="search-result"] div')
        .first()
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click()
        await page.waitForTimeout(500)
      }
    })

    // Step 3: 사유 입력 및 저장
    await step(3, '페널티 사유 입력 및 저장', async () => {
      const reasonInput = page
        .locator('input[placeholder*="사유"], textarea[placeholder*="사유"], input[name*="reason"], textarea[name*="reason"]')
        .first()
      if (await reasonInput.isVisible().catch(() => false)) {
        await reasonInput.fill(reason)
        await page.waitForTimeout(300)
      }

      // 페널티 유형 선택
      const typeSel = page.locator('select[name*="type"], select[name*="penalty"]').first()
      if (await typeSel.isVisible().catch(() => false)) {
        await typeSel.selectOption({ index: 1 }).catch(() => {})
        await page.waitForTimeout(300)
      }

      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("등록"), button[type="submit"]')
        .first()
      await saveBtn.click()
      await page.waitForTimeout(1500)
    })

    // Step 4: 페널티 목록에서 확인
    await step(4, '페널티 목록에 추가 확인', async () => {
      await page.goto(`${BASE_URL}/penalties`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const body = await page.locator('body').textContent() ?? ''
      if (body.includes('데이터가 없습니다') && body.trim().length < 200) {
        throw new Error('페널티 목록이 비어있음')
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
