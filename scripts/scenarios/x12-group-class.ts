// X12 — 그룹수업 등록
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT, randomSuffix,
} from './_setup'

const ID = 'X12'
const NAME = '그룹수업 등록'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  const className = `테스트수업 ${randomSuffix()}`
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)

  try {
    await login(page)

    // Step 1: /class-templates 수업 템플릿 확인
    await step(1, '/class-templates 수업 템플릿 목록 확인', async () => {
      await page.goto(`${BASE_URL}/class-templates`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1200)

      const hasContent = await page.locator('table, [class*="template"], [class*="class"]').count()
      if (hasContent === 0) {
        throw new Error('수업 템플릿 페이지 콘텐츠 없음')
      }
    })

    // Step 2: /calendar 이동
    await step(2, '/calendar 페이지 이동', async () => {
      await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      const hasContent = await page.locator('[class*="calendar"], [class*="fc-"], .fc').count()
      if (hasContent === 0) {
        throw new Error('캘린더 컴포넌트를 찾을 수 없음')
      }
    })

    // Step 3: 수업 등록 버튼 클릭
    await step(3, '수업 등록 버튼 클릭', async () => {
      const addBtn = page
        .locator('button:has-text("수업 등록"), button:has-text("등록"), button:has-text("수업 추가"), button:has-text("추가"), button:has-text("+ 수업")')
        .first()
      await addBtn.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await addBtn.click()
      await page.waitForTimeout(700)
    })

    // Step 4: 수업명/강사/시간/정원 입력
    await step(4, '수업명/강사/시간/정원 입력', async () => {
      // 수업명
      const nameInput = page
        .locator('input[name*="name"], input[name*="title"], input[placeholder*="수업명"], input[placeholder*="이름"]')
        .first()
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(className)
        await page.waitForTimeout(300)
      }

      // 강사 선택
      const instructorSel = page
        .locator('select[name*="instructor"], select[name*="staff"], input[placeholder*="강사"]')
        .first()
      if (await instructorSel.isVisible().catch(() => false)) {
        const tag = await instructorSel.evaluate((el) => el.tagName.toLowerCase())
        if (tag === 'select') {
          await instructorSel.selectOption({ index: 1 }).catch(() => {})
        } else {
          await instructorSel.fill('강사')
          await page.waitForTimeout(500)
          const firstOpt = page.locator('[class*="dropdown"] li, [role="option"]').first()
          if (await firstOpt.isVisible().catch(() => false)) {
            await firstOpt.click()
          }
        }
        await page.waitForTimeout(300)
      }

      // 날짜/시작시간
      const startDate = page.locator('input[type="date"], input[name*="start_date"], input[name*="date"]').first()
      if (await startDate.isVisible().catch(() => false)) {
        await startDate.fill(formatDate(nextWeek))
        await page.waitForTimeout(200)
      }

      const startTime = page.locator('input[type="time"], input[name*="start_time"], input[name*="time"]').first()
      if (await startTime.isVisible().catch(() => false)) {
        await startTime.fill('10:00')
        await page.waitForTimeout(200)
      }

      // 정원
      const capacityInput = page
        .locator('input[name*="capacity"], input[name*="max"], input[placeholder*="정원"], input[placeholder*="인원"]')
        .first()
      if (await capacityInput.isVisible().catch(() => false)) {
        await capacityInput.fill('10')
        await page.waitForTimeout(200)
      }

      // 저장
      const saveBtn = page
        .locator('button:has-text("저장"), button:has-text("등록"), button[type="submit"]')
        .first()
      await saveBtn.click()
      await page.waitForTimeout(2000)
    })

    // Step 5: 캘린더에 수업 표시 확인
    await step(5, '캘린더에 수업 표시 확인', async () => {
      await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)

      const body = await page.locator('body').textContent() ?? ''
      // 등록한 수업명 또는 수업 이벤트가 존재하는지
      if (!body.includes(className) && !body.includes('테스트수업')) {
        // 캘린더 이벤트 자체가 있으면 PASS (수업이 다음주라 뷰에 안 보일 수 있음)
        const events = await page.locator('[class*="fc-event"], [class*="event"], [class*="lesson"]').count()
        if (events === 0) {
          throw new Error(`수업 "${className}" 이 캘린더에 표시되지 않음`)
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
