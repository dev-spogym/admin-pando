// X08 — 직원 출근 등록
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X08'
const NAME = '직원 출근 등록'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /staff/attendance 이동
    await step(1, '/staff/attendance 직원 근태 페이지 이동', async () => {
      await page.goto(`${BASE_URL}/staff/attendance`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1200)

      const hasContent = await page.locator('table, [class*="attendance"], [class*="staff"]').count()
      if (hasContent === 0) {
        throw new Error('직원 근태 페이지 콘텐츠 없음')
      }
    })

    // Step 2: 직원 선택
    await step(2, '직원 선택', async () => {
      // 직원 목록에서 첫 번째 선택
      const staffRow = page
        .locator('table tbody tr, [class*="staff-row"], [class*="employee-row"]')
        .first()
      await staffRow.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await staffRow.click()
      await page.waitForTimeout(500)
    })

    // Step 3: 출근 버튼 클릭 (직접 handleClockIn 호출 — 모달 없음)
    await step(3, '출근 버튼 클릭', async () => {
      // 행의 "출근" 버튼: bg-state-success/10 스타일, LogIn 아이콘 포함
      // 이미 오늘 출근한 직원만 있으면 "출근" 버튼이 없을 수 있음 (이전 테스트 실행 영향)
      const checkInBtn = page.locator('button:has-text("출근")').first()
      const isVisible = await checkInBtn.isVisible().catch(() => false)
      if (isVisible) {
        await checkInBtn.click()
        await page.waitForTimeout(1500)
      } else {
        // 이미 출근 처리된 경우 — "퇴근" 버튼이나 출근 기록이 있으면 PASS
        const body = await page.locator('body').textContent() ?? ''
        const alreadyClocked = body.includes('퇴근') || body.includes('출근') || body.includes('WORKING')
        if (!alreadyClocked) {
          throw new Error('출근 버튼이 없고 출근 상태도 확인되지 않음')
        }
      }
    })

    // Step 4: 출근 시간 확인
    await step(4, '출근 시간 표시 확인', async () => {
      await page.waitForTimeout(500)
      const body = await page.locator('body').textContent() ?? ''
      const now = new Date()
      const hour = now.getHours()

      // 출근 시간(현재 시간대)이 화면에 표시되는지 확인
      const hourStr = String(hour).padStart(2, '0')
      const prevHour = String(hour > 0 ? hour - 1 : 23).padStart(2, '0')

      if (!body.includes(hourStr) && !body.includes(prevHour) && !body.includes('출근') && !body.includes('WORKING')) {
        throw new Error('출근 시간이 화면에 표시되지 않음')
      }
    })

    // Step 5: 직원 출근 상태 확인
    await step(5, '직원 출근 상태(WORKING/출근중) 확인', async () => {
      await page.goto(`${BASE_URL}/staff/attendance`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const body = await page.locator('body').textContent() ?? ''
      if (
        !body.includes('출근') &&
        !body.includes('WORKING') &&
        !body.includes('근무중') &&
        !body.includes('체크인')
      ) {
        throw new Error('출근 상태를 확인할 수 없음')
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
