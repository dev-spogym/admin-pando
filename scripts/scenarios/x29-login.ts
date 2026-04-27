// X29 — 로그인 세션 생성
import {
  setupBrowser, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT, LOGIN_ID, LOGIN_PASSWORD, BRANCH_VALUE,
} from './_setup'

const ID = 'X29'
const NAME = '로그인 세션 생성'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    // Step 1: 로그아웃 처리 후 /login 이동
    await step(1, '로그아웃 처리 후 /login 페이지 이동', async () => {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      // 이미 로그인 상태면 대시보드로 redirect됨 → 쿠키 초기화 후 재이동
      if (!page.url().includes('/login')) {
        await page.evaluate(() => {
          document.cookie.split(';').forEach((c) => {
            document.cookie = c
              .replace(/^ +/, '')
              .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/')
          })
        })
        await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
        await page.waitForTimeout(1000)
      }

      const body = await page.locator('body').textContent() ?? ''
      if (!body || body.trim().length < 5) {
        throw new Error('로그인 페이지 로드 실패')
      }
    })

    // Step 2: ID/PW 입력
    await step(2, '아이디(manager1) 및 비밀번호 입력', async () => {
      const idInput = page.locator('input[placeholder*="아이디"], input[name*="id"], input[type="text"]').first()
      await idInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await idInput.fill(LOGIN_ID)
      await page.waitForTimeout(300)

      const pwInput = page.locator('input[type="password"]').first()
      await pwInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })
      await pwInput.fill(LOGIN_PASSWORD)
      await page.waitForTimeout(300)
    })

    // Step 3: 로그인 버튼 클릭 → 대시보드("/") 이동 확인
    await step(3, '로그인 버튼 클릭 및 대시보드 이동 확인', async () => {
      const loginBtn = page
        .locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")')
        .first()
      await loginBtn.click()
      await page
        .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
        .catch(() => {})
      await page.waitForTimeout(1000)

      if (page.url().includes('/login')) {
        throw new Error('로그인 실패: 여전히 /login 페이지')
      }
    })

    // Step 4: 지점 선택 (select 또는 관련 UI)
    await step(4, '지점 선택 (value="1")', async () => {
      // 지점 선택 모달/셀렉트가 있으면 처리
      try {
        await page.waitForSelector('select', { timeout: 5000 })
        const selects = page.locator('select')
        const count = await selects.count()
        for (let i = 0; i < count; i++) {
          const sel = selects.nth(i)
          const options = await sel.locator('option').all()
          for (const opt of options) {
            const val = await opt.getAttribute('value')
            if (val === BRANCH_VALUE) {
              await sel.selectOption({ value: BRANCH_VALUE })
              await page.waitForTimeout(500)
              const confirmBtn = page
                .locator('button:has-text("확인"), button:has-text("선택"), button[type="submit"]')
                .first()
              const btnVisible = await confirmBtn.isVisible().catch(() => false)
              if (btnVisible) {
                await confirmBtn.click()
                await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
              }
              break
            }
          }
        }
      } catch {
        // 지점 선택 없어도 PASS
      }
    })

    // Step 5: 세션 유지 확인 (현재 URL이 /login이 아닌 것)
    await step(5, '세션 유지 확인 (URL이 /login 아님)', async () => {
      await page.waitForTimeout(500)
      if (page.url().includes('/login')) {
        throw new Error('세션 유지 실패: /login 페이지로 redirect됨')
      }
    })
  } finally {
    await browser.close()
  }

  return calcResult(ID, NAME, steps, t0)
}

run().then((r) => { printResult(r); process.exit(r.status === 'FAIL' ? 1 : 0) })
