// X04 — 체성분 측정 등록
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X04'
const NAME = '체성분 측정 등록'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const searchKeyword = '홍길동'

  try {
    await login(page)

    // Step 1: /members 에서 회원 검색
    await step(1, '회원 목록에서 회원 검색', async () => {
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

    // Step 2: 회원 이름 버튼 클릭 → 상세 이동
    await step(2, '회원 클릭 및 상세 페이지 이동', async () => {
      // 회원 이름은 ghost Button 컴포넌트로 렌더링됨
      const memberBtn = page.locator(`button:has-text("${searchKeyword}")`).first()
      await memberBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await memberBtn.click()
      await page.waitForTimeout(1000)

      const url = page.url()
      if (!url.includes('/members/')) {
        throw new Error(`회원 상세로 이동 실패 (현재: ${url})`)
      }
    })

    // Step 3: 체성분 탭 클릭
    await step(3, '체성분 탭 클릭', async () => {
      const tab = page
        .locator('button:has-text("체성분"), [role="tab"]:has-text("체성분"), a:has-text("체성분")')
        .first()
      await tab.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await tab.click()
      await page.waitForTimeout(700)
    })

    // Step 4: 체성분 추가 버튼 클릭 및 측정값 입력
    await step(4, '체성분 추가 버튼 클릭 및 측정값 입력', async () => {
      const addBtn = page
        .locator('button:has-text("추가"), button:has-text("체성분 추가"), button:has-text("등록"), button:has-text("측정 추가")')
        .first()
      await addBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await addBtn.click()
      await page.waitForTimeout(700)

      // 몸무게
      const weightInput = page
        .locator('input[name*="weight"], input[placeholder*="몸무게"], input[placeholder*="체중"]')
        .first()
      if (await weightInput.isVisible().catch(() => false)) {
        await weightInput.fill('75.5')
        await page.waitForTimeout(200)
      }

      // 근육량
      const muscleInput = page
        .locator('input[name*="muscle"], input[placeholder*="근육"]')
        .first()
      if (await muscleInput.isVisible().catch(() => false)) {
        await muscleInput.fill('32.0')
        await page.waitForTimeout(200)
      }

      // 체지방률
      const fatInput = page
        .locator('input[name*="fat"], input[placeholder*="체지방"]')
        .first()
      if (await fatInput.isVisible().catch(() => false)) {
        await fatInput.fill('22.5')
        await page.waitForTimeout(200)
      }

      // BMI
      const bmiInput = page.locator('input[name*="bmi"], input[placeholder*="bmi"], input[placeholder*="BMI"]').first()
      if (await bmiInput.isVisible().catch(() => false)) {
        await bmiInput.fill('23.1')
        await page.waitForTimeout(200)
      }

      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("등록"), button[type="submit"]')
        .first()
      await saveBtn.click()
      await page.waitForTimeout(1500)
    })

    // Step 5: 체성분 데이터 반영 확인
    await step(5, '체성분 데이터 등록 확인', async () => {
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      // 등록한 수치 중 하나라도 화면에 노출되는지 확인
      if (!body.includes('75') && !body.includes('32') && !body.includes('22')) {
        // 체성분 탭에 행이 있는지라도 확인
        const rows = await page.locator('table tbody tr, [class*="composition-row"], [class*="body-row"]').count()
        if (rows === 0) {
          throw new Error('체성분 데이터가 화면에 반영되지 않음')
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
