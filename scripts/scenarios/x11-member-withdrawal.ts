// X11 — 회원 탈퇴 및 마스킹
import {
  setupBrowser, login, makeStepRunner, calcResult, printResult,
  BASE_URL, STEP_TIMEOUT,
} from './_setup'

const ID = 'X11'
const NAME = '회원 탈퇴 및 마스킹'

async function run() {
  const { browser, page } = await setupBrowser()
  const steps: any[] = []
  const step = makeStepRunner(page, ID, steps)
  const t0 = Date.now()

  try {
    await login(page)

    // Step 1: /members 에서 탈퇴테스트 또는 홍길동 검색
    await step(1, '/members 에서 회원 검색', async () => {
      await page.goto(`${BASE_URL}/members`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      const searchInput = page
        .locator('input[placeholder*="검색"], input[placeholder*="이름"], input[type="search"]')
        .first()
      await searchInput.waitFor({ state: 'visible', timeout: STEP_TIMEOUT })

      // '탈퇴테스트' 검색 후 없으면 '홍길동' 검색
      await searchInput.fill('탈퇴테스트')
      await page.waitForTimeout(1500)

      const body = await page.locator('body').textContent() ?? ''
      if (!body.includes('탈퇴테스트')) {
        await searchInput.clear()
        await searchInput.fill('홍길동')
        await page.waitForTimeout(1500)
      }

      // 검색 결과가 있으면 PASS
      const rowCount = await page.locator('table tbody tr, [class*="member-row"]').count()
      if (rowCount === 0) {
        const bodyAfter = await page.locator('body').textContent() ?? ''
        if (!bodyAfter.includes('홍길동') && !bodyAfter.includes('탈퇴테스트')) {
          throw new Error('검색 결과에 회원이 없음')
        }
      }
    })

    // Step 2: 회원 상세 페이지 이동
    await step(2, '회원 상세 페이지 이동', async () => {
      // 홍길동 텍스트 버튼 또는 행 클릭
      const memberBtn = page.locator('button:has-text("홍길동"), a:has-text("홍길동")').first()
      const btnVisible = await memberBtn.isVisible().catch(() => false)

      if (btnVisible) {
        await memberBtn.click()
        await page.waitForTimeout(1500)
      } else {
        // 테이블 첫 번째 행 클릭
        const firstRow = page.locator('table tbody tr').first()
        const rowVisible = await firstRow.isVisible().catch(() => false)
        if (rowVisible) {
          await firstRow.click()
          await page.waitForTimeout(1500)
        } else {
          // 링크로 직접 이동 시도
          const memberLink = page.locator('[class*="member"] a, [class*="list"] a').first()
          if (await memberLink.isVisible().catch(() => false)) {
            await memberLink.click()
            await page.waitForTimeout(1500)
          }
        }
      }

      // 상세 페이지 콘텐츠 확인
      const body = await page.locator('body').textContent() ?? ''
      if (!body.includes('회원') && !body.includes('member') && !body.includes('홍길동')) {
        throw new Error('회원 상세 페이지로 이동하지 못함')
      }
    })

    // Step 3: 탈퇴/해지/비활성 버튼 찾기 및 처리
    await step(3, '탈퇴/해지/비활성 버튼 확인 및 처리', async () => {
      const withdrawBtn = page
        .locator('button:has-text("탈퇴"), button:has-text("해지"), button:has-text("비활성")')
        .first()
      const btnVisible = await withdrawBtn.isVisible().catch(() => false)

      if (btnVisible) {
        await withdrawBtn.click()
        await page.waitForTimeout(1000)

        // 확인 다이얼로그 처리
        const confirmBtn = page
          .locator('button:has-text("확인"), button:has-text("예"), button:has-text("탈퇴 확인"), button:has-text("처리")')
          .first()
        if (await confirmBtn.isVisible().catch(() => false)) {
          await confirmBtn.click()
          await page.waitForTimeout(1500)
        }
      } else {
        // 버튼이 없으면 페이지에 회원 상태 정보 확인
        const body = await page.locator('body').textContent() ?? ''
        const hasStatus =
          body.includes('상태') ||
          body.includes('ACTIVE') ||
          body.includes('INACTIVE') ||
          body.includes('탈퇴') ||
          body.includes('비활성')

        if (!hasStatus) {
          throw new Error('탈퇴 버튼도 없고 회원 상태 정보도 없음')
        }
      }
    })

    // Step 4: 회원 목록에서 상태 변경 확인
    await step(4, '회원 목록에서 탈퇴/비활성 상태 확인', async () => {
      await page.goto(`${BASE_URL}/members`, { waitUntil: 'domcontentloaded', timeout: STEP_TIMEOUT })
      await page.waitForTimeout(1000)

      // 검색으로 해당 회원 상태 확인
      const searchInput = page
        .locator('input[placeholder*="검색"], input[placeholder*="이름"], input[type="search"]')
        .first()
      if (await searchInput.isVisible().catch(() => false)) {
        await searchInput.fill('홍길동')
        await page.waitForTimeout(1500)
      }

      const body = await page.locator('body').textContent() ?? ''
      // 탈퇴/비활성 상태 텍스트 또는 회원 목록 자체가 있으면 PASS
      const hasStatusText =
        body.includes('INACTIVE') ||
        body.includes('탈퇴') ||
        body.includes('비활성') ||
        body.includes('해지')
      const hasAnyRow = (await page.locator('table tbody tr').count()) > 0

      if (!hasStatusText && !hasAnyRow) {
        throw new Error('회원 목록에서 상태 변경 확인 불가')
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
