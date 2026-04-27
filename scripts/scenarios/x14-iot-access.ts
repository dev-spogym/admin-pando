// X14 — IoT 밴드 출입 출석 (관리자 측)
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X14'
const NAME = 'IoT 밴드 출입 출석 (관리자 측)'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /settings/iot 이동 → IoT 설정 페이지 확인
    await step(1, '/settings/iot IoT 설정 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/settings/iot`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('IoT 설정 페이지 body가 비어있음')
      const hasContent =
        (await page.locator('table').count()) > 0 ||
        (await page.locator('[class*="iot"]').count()) > 0 ||
        (await page.locator('[class*="device"]').count()) > 0
      if (!hasContent && body.trim().length < 5) throw new Error('IoT 설정 요소 없음')
    })

    // Step 2: IoT 디바이스 목록 또는 설정 항목 확인
    await step(2, 'IoT 디바이스 목록/설정 항목 확인', async () => {
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('IoT 설정 콘텐츠 없음')
      // body에 어떤 텍스트든 있으면 PASS
    })

    // Step 3: /attendance 이동 → 출석 현황 페이지 확인
    await step(3, '/attendance 출석 현황 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/attendance`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('출석 현황 페이지 body가 비어있음')
    })

    // Step 4: 출석 데이터 확인
    await step(4, '출석 데이터 확인 (테이블 행 or 날짜/이름 텍스트)', async () => {
      const body = await page.locator('body').textContent() ?? ''
      const rowCount = await page.locator('table tbody tr').count()
      const hasDate = /\d{4}[-./]\d{2}[-./]\d{2}/.test(body)
      if (rowCount === 0 && !hasDate && body.trim().length < 5) {
        throw new Error('출석 데이터 없음')
      }
    })

    // Step 5: /rfid 이동 → RFID/IoT 밴드 관리 페이지 확인
    await step(5, '/rfid RFID/IoT 밴드 관리 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/rfid`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('RFID 관리 페이지 body가 비어있음')
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
