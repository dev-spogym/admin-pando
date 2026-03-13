import { test, expect } from '@playwright/test';

// 로그인 헬퍼
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
}

test('인증 가드: 미로그인 시 /login으로 리다이렉트', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/login', { timeout: 5_000 });
  await expect(page.getByRole('heading', { name: '스포짐 CRM' })).toBeVisible();
});

test('로그인 후 대시보드 확인', async ({ page }) => {
  await login(page);
  await page.screenshot({ path: 'test-results/check-dashboard.png', fullPage: true });
  await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
});

test('회원 목록 페이지 데이터 확인', async ({ page }) => {
  await login(page);
  await page.goto('/members');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/check-members.png', fullPage: true });
});

test('매출 페이지 데이터 확인', async ({ page }) => {
  await login(page);
  await page.goto('/sales');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/check-sales.png', fullPage: true });
});

test('수업/캘린더 페이지 확인', async ({ page }) => {
  await login(page);
  await page.goto('/calendar');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/check-calendar.png', fullPage: true });
});

test('직원 목록 페이지 확인', async ({ page }) => {
  await login(page);
  await page.goto('/staff');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/check-staff.png', fullPage: true });
});
