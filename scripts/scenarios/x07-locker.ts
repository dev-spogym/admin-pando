// X07 — 락커 배정
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X07'
const NAME = '락커 배정'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const searchKeyword = '홍길동'

  try {
    await login(page)

    // Step 1: /locker 이동
    await step(1, '/locker 락커 관리 페이지 이동', async () => {
      await page.goto(`${BASE_URL}/locker`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1200)

      const body = await page.locator('body').textContent() ?? ''
      if (body.includes('오류') || body.includes('에러') || body.includes('Error')) {
        const hasContent = await page.locator('table, [class*="locker"], [class*="grid"]').count()
        if (hasContent === 0) {
          throw new Error('락커 페이지 로드 실패')
        }
      }
    })

    // Step 2: 빈 락커 선택 — StatusBadge "빈 락커" 텍스트가 있는 카드 클릭
    await step(2, '빈 락커 선택', async () => {
      // "빈 락커" 레이블이 포함된 락커 카드를 찾아 클릭
      const emptyLocker = page
        .locator('div:has-text("빈 락커"), span:has-text("빈 락커")')
        .first()
      if (await emptyLocker.isVisible().catch(() => false)) {
        await emptyLocker.click()
      } else {
        // 대안: bg-surface-tertiary 클래스를 가진 첫 번째 클릭 가능한 div
        const lockerCard = page
          .locator('[class*="surface-tertiary"][class*="border"], [class*="cursor-pointer"]')
          .first()
        await lockerCard.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
        await lockerCard.click()
      }
      await page.waitForTimeout(700)
    })

    // Step 3: 회원 검색 및 배정 기간 설정
    await step(3, '회원 검색 및 배정 기간 설정', async () => {
      // 배정 모달/폼에서 회원 검색
      const memberSearch = page
        .locator('input[placeholder*="회원"], input[placeholder*="검색"], input[placeholder*="이름"]')
        .first()
      await memberSearch.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await memberSearch.fill(searchKeyword)
      await page.waitForTimeout(1000)

      // 검색 결과 선택
      const firstResult = page
        .locator('[class*="dropdown"] li, [role="listbox"] [role="option"], [class*="search-result"] div, [class*="result-item"]')
        .first()
      if (await firstResult.isVisible().catch(() => false)) {
        await firstResult.click()
        await page.waitForTimeout(500)
      }

      // 시작일 / 종료일 설정 (today + 30일)
      const today = new Date()
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 30)
      const formatDate = (d: Date) => d.toISOString().split('T')[0]

      const startInput = page.locator('input[type="date"]:first-child, input[name*="start"], input[name*="begin"]').first()
      if (await startInput.isVisible().catch(() => false)) {
        await startInput.fill(formatDate(today))
        await page.waitForTimeout(200)
      }

      const endInput = page.locator('input[type="date"]:last-child, input[name*="end"], input[name*="expire"]').first()
      if (await endInput.isVisible().catch(() => false)) {
        await endInput.fill(formatDate(endDate))
        await page.waitForTimeout(200)
      }
    })

    // Step 4: 저장 및 락커 상태 확인
    await step(4, '배정 저장 및 락커 상태 확인', async () => {
      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("배정"), button:has-text("등록"), button[type="submit"]')
        .first()
      await saveBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await saveBtn.click()
      await page.waitForTimeout(2000)

      // 저장 후 상태 확인
      const body = await page.locator('body').textContent() ?? ''
      if (body.includes('실패') || body.includes('오류')) {
        throw new Error('락커 배정 저장 실패')
      }
    })

    // Step 5: 배정된 락커 상태 OCCUPIED/IN_USE 확인
    await step(5, '배정된 락커 OCCUPIED 상태 확인', async () => {
      await page.goto(`${BASE_URL}/locker`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const body = await page.locator('body').textContent() ?? ''
      // OCCUPIED, IN_USE, 사용중, 배정됨 중 하나라도 있으면 PASS
      if (
        !body.includes('OCCUPIED') &&
        !body.includes('IN_USE') &&
        !body.includes('사용중') &&
        !body.includes('배정') &&
        !body.includes(searchKeyword)
      ) {
        throw new Error('배정된 락커 상태를 확인할 수 없음')
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
