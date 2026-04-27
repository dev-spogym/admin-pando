import { chromium, Browser, Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

export const BASE_URL = 'http://localhost:3000'
export const LOGIN_ID = 'manager1'
export const LOGIN_PASSWORD = 'qwer1234!!'
export const BRANCH_VALUE = '1'
export const STEP_TIMEOUT = 10000

// 계정 목록
export const ACCOUNTS = {
  // 본사 계정 (isSuperAdmin: true) — 지점 선택 없음, 전 지점 열람 가능
  SUPER:       { id: 'super',       pw: 'super1234' },
  HQ_OPS:      { id: 'hq-ops',     pw: 'hqops1234' },
  // 지점 계정 — 로그인 후 지점 선택 필요
  BRANCH_OWNER:  { id: 'br001',         pw: 'br1234' },
  TRAINER:       { id: 'pt-br001',      pw: 'pt1234' },
  RECEPTIONIST:  { id: 'front-br001',   pw: 'fr1234' },
  DISTRICT1:     { id: 'district1',     pw: 'd1234' },
  DISTRICT2:     { id: 'district2',     pw: 'd1234' },
  MANAGER6:      { id: 'mgr-br006',     pw: 'mgr1234' },
} as const

export const SCREENSHOTS_BASE = path.join(process.cwd(), 'qa-results', 'scenarios')

export type StepStatus = 'PASS' | 'FAIL' | 'SKIP'

export interface StepResult {
  step: number
  description: string
  status: StepStatus
  error?: string
  screenshot?: string
}

export interface ScenarioResult {
  id: string
  name: string
  status: 'PASS' | 'PARTIAL' | 'FAIL'
  steps: StepResult[]
  duration: number
}

export async function setupBrowser(): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({ headless: false, slowMo: 150 })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  return { browser, page }
}

async function doLogin(page: Page, id: string, pw: string): Promise<void> {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 })

  const idInput = page.locator('input[placeholder*="아이디"]').first()
  const passwordInput = page.locator('input[type="password"]').first()

  await idInput.fill(id)
  await passwordInput.fill(pw)

  const loginButton = page
    .locator('button[type="submit"], button:has-text("로그인"), button:has-text("Login")')
    .first()
  await loginButton.click()

  await page
    .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 })
    .catch(() => {})
  await page.waitForTimeout(500)
}

async function selectBranch(page: Page, branchValue: string = BRANCH_VALUE): Promise<void> {
  try {
    await page.waitForSelector('select', { timeout: 5000 })
    const selects = page.locator('select')
    const count = await selects.count()
    for (let i = 0; i < count; i++) {
      const sel = selects.nth(i)
      const options = await sel.locator('option').all()
      for (const opt of options) {
        const val = await opt.getAttribute('value')
        if (val === branchValue) {
          await sel.selectOption({ value: branchValue })
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
  } catch {}
  await page.waitForTimeout(1000)
}

/** 광화문 지점 매니저 (branchId=1) — 기본 로그인 */
export async function login(page: Page): Promise<void> {
  await doLogin(page, LOGIN_ID, LOGIN_PASSWORD)
  await selectBranch(page, BRANCH_VALUE)
}

/** 본사 슈퍼관리자 — 지점 선택 없음, 전 지점 열람 가능 */
export async function loginAsHQ(page: Page): Promise<void> {
  await doLogin(page, ACCOUNTS.SUPER.id, ACCOUNTS.SUPER.pw)
  // 본사 계정은 isSuperAdmin=true, branchId=null → 지점 선택 화면 없음
  await page.waitForTimeout(1000)
}

/** 광화문 지점장 (branchId=1) */
export async function loginAsBranchOwner(page: Page): Promise<void> {
  await doLogin(page, ACCOUNTS.BRANCH_OWNER.id, ACCOUNTS.BRANCH_OWNER.pw)
  await selectBranch(page, '1')
}

/** 광화문 트레이너 (branchId=1) */
export async function loginAsTrainer(page: Page): Promise<void> {
  await doLogin(page, ACCOUNTS.TRAINER.id, ACCOUNTS.TRAINER.pw)
  await selectBranch(page, '1')
}

/** 광화문 리셉션 (branchId=1) */
export async function loginAsReceptionist(page: Page): Promise<void> {
  await doLogin(page, ACCOUNTS.RECEPTIONIST.id, ACCOUNTS.RECEPTIONIST.pw)
  await selectBranch(page, '1')
}

export async function takeScreenshot(
  page: Page,
  scenarioId: string,
  stepNum: number,
  label: string
): Promise<string> {
  const dir = path.join(SCREENSHOTS_BASE, scenarioId)
  fs.mkdirSync(dir, { recursive: true })
  const safe = label.replace(/[^\w가-힣]/g, '_').slice(0, 40)
  const filename = `step${String(stepNum).padStart(2, '0')}-${safe}.png`
  const filepath = path.join(dir, filename)
  await page.screenshot({ path: filepath, fullPage: false }).catch(() => {})
  return filepath
}

export function makeStepRunner(page: Page, scenarioId: string, steps: StepResult[]) {
  return async function step(num: number, description: string, fn: () => Promise<void>) {
    try {
      await fn()
      const ss = await takeScreenshot(page, scenarioId, num, description)
      steps.push({ step: num, description, status: 'PASS', screenshot: ss })
    } catch (e: any) {
      const ss = await takeScreenshot(page, scenarioId, num, `FAIL-${description}`)
      steps.push({
        step: num,
        description,
        status: 'FAIL',
        error: String(e.message ?? e).slice(0, 300),
        screenshot: ss,
      })
    }
  }
}

export function calcResult(
  id: string,
  name: string,
  steps: StepResult[],
  startTime: number
): ScenarioResult {
  const passed = steps.filter((s) => s.status === 'PASS').length
  const failed = steps.filter((s) => s.status === 'FAIL').length
  const status = failed === 0 ? 'PASS' : passed === 0 ? 'FAIL' : 'PARTIAL'
  return { id, name, status, steps, duration: Date.now() - startTime }
}

export function printResult(result: ScenarioResult): void {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌'
  console.log(`\n${icon} [${result.id}] ${result.name} — ${result.status} (${result.duration}ms)`)
  for (const s of result.steps) {
    const mark = s.status === 'PASS' ? '  ✓' : s.status === 'FAIL' ? '  ✗' : '  -'
    console.log(`${mark} Step ${s.step}: ${s.description}`)
    if (s.error) console.log(`       → ${s.error}`)
  }
}

export function randomPhone(): string {
  return `010${String(Math.floor(Math.random() * 90000000) + 10000000)}`
}

export function randomSuffix(): string {
  return Date.now().toString().slice(-6)
}
