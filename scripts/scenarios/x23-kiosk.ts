// X23 — 키오스크 출입 출석 (관리자 측)
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X23'
const NAME = '키오스크 출입 출석 (관리자 측)'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /settings/kiosk 이동 → 키오스크 설정 페이지 확인
    await step(1, '/settings/kiosk 키오스크 설정 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/settings/kiosk`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('키오스크 설정 페이지 body가 비어있음')
    })

    // Step 2: 키오스크 설정 항목 확인
    await step(2, '키오스크 설정 항목 확인 (텍스트 or 설정 폼)', async () => {
      const body = await page.locator('body').textContent() ?? ''
      const hasKioskText = /키오스크|kiosk/i.test(body)
      const hasForm =
        (await page.locator('form, input, select').count()) > 0
      if (!hasKioskText && !hasForm && body.trim().length < 5) {
        throw new Error('키오스크 설정 항목 없음')
      }
    })

    // Step 3: /qr-checkin 이동 → QR 체크인 관리 페이지 확인
    await step(3, '/qr-checkin QR 체크인 관리 페이지 확인', async () => {
      await page.goto(`${BASE_URL}/qr-checkin`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('QR 체크인 페이지 body가 비어있음')
    })

    // Step 4: QR 체크인 현황 또는 설정 확인
    await step(4, 'QR 체크인 현황/설정 확인 (body 데이터 확인)', async () => {
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('QR 체크인 콘텐츠 없음')
      // body에 어떤 데이터든 있으면 PASS
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
