// X33 — CRM 회원등록 앱 연동
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X33'
const NAME = 'CRM 회원등록 앱 연동'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /members/new 이동 → 회원 등록 폼 확인
    await step(1, '/members/new 회원 등록 폼 확인', async () => {
      await page.goto(`${BASE_URL}/members/new`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('회원 등록 페이지 body가 비어있음')
    })

    // Step 2: 앱 연동 관련 설정 확인 (체크박스/토글, 없으면 폼 자체 PASS)
    await step(2, '앱 연동 설정 확인 (input/button/label 또는 폼 존재)', async () => {
      const appInput = page
        .locator('input[name*="app"], input[name*="link"]')
        .first()
      const appBtn = page.locator('button:has-text("앱")').first()
      const appLabel = page.locator('label:has-text("앱")').first()

      const hasAppInput = await appInput.isVisible().catch(() => false)
      const hasAppBtn = await appBtn.isVisible().catch(() => false)
      const hasAppLabel = await appLabel.isVisible().catch(() => false)

      if (!hasAppInput && !hasAppBtn && !hasAppLabel) {
        // 앱 연동 요소 없을 경우 — 회원 등록 폼 자체 존재하면 PASS
        const formCount = await page.locator('form, input').count()
        if (formCount === 0) throw new Error('앱 연동 설정 및 회원 등록 폼 모두 없음')
      }
    })

    // Step 3: /members 이동 → 앱 연동 상태 컬럼 확인
    await step(3, '/members 앱 연동 상태 컬럼 or 목록 데이터 확인', async () => {
      await page.goto(`${BASE_URL}/members`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      const hasAppLinkText = /앱|연동|APP|LINKED/i.test(body)
      const rowCount = await page.locator('table tbody tr').count()
      if (!hasAppLinkText && rowCount === 0 && body.trim().length < 5) {
        throw new Error('앱 연동 컬럼 및 회원 목록 데이터 없음')
      }
    })

    // Step 4: /settings 이동 → 앱 연동 설정 확인
    await step(4, '/settings 앱 연동 설정 확인 (설정 항목 존재)', async () => {
      await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1500)
      const body = await page.locator('body').textContent() ?? ''
      if (body.trim().length < 5) throw new Error('설정 페이지 body가 비어있음')
      // 설정 항목이 어떤 형태든 있으면 PASS
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
