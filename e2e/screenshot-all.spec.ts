import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/login', name: 'login' },
  { path: '/', name: 'dashboard', needsLogin: true },
  { path: '/members', name: 'member-list', needsLogin: true },
  { path: '/members/detail', name: 'member-detail', needsLogin: true },
  { path: '/members/new', name: 'member-form', needsLogin: true },
  { path: '/body-composition', name: 'body-composition', needsLogin: true },
  { path: '/attendance', name: 'attendance', needsLogin: true },
  { path: '/calendar', name: 'calendar', needsLogin: true },
  { path: '/sales', name: 'sales', needsLogin: true },
  { path: '/pos', name: 'pos', needsLogin: true },
  { path: '/pos/payment', name: 'pos-payment', needsLogin: true },
  { path: '/products', name: 'product-list', needsLogin: true },
  { path: '/products/new', name: 'product-form', needsLogin: true },
  { path: '/locker', name: 'locker', needsLogin: true },
  { path: '/locker/management', name: 'locker-mgmt', needsLogin: true },
  { path: '/rfid', name: 'rfid', needsLogin: true },
  { path: '/rooms', name: 'room-mgmt', needsLogin: true },
  { path: '/staff', name: 'staff-list', needsLogin: true },
  { path: '/staff/new', name: 'staff-form', needsLogin: true },
  { path: '/payroll', name: 'payroll', needsLogin: true },
  { path: '/payroll/statements', name: 'payroll-statement', needsLogin: true },
  { path: '/message', name: 'message', needsLogin: true },
  { path: '/message/auto-alarm', name: 'auto-alarm', needsLogin: true },
  { path: '/message/coupon', name: 'coupon', needsLogin: true },
  { path: '/mileage', name: 'mileage', needsLogin: true },
  { path: '/contracts/new', name: 'contract', needsLogin: true },
  { path: '/settings', name: 'settings', needsLogin: true },
  { path: '/settings/permissions', name: 'permissions', needsLogin: true },
  { path: '/settings/kiosk', name: 'kiosk', needsLogin: true },
  { path: '/settings/iot', name: 'iot', needsLogin: true },
  { path: '/subscription', name: 'subscription', needsLogin: true },
  { path: '/branches', name: 'branches', needsLogin: true },
];

test('모든 페이지 스크린샷 캡처', async ({ page }) => {
  test.setTimeout(120_000);

  // Login first
  await page.goto('/login');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10_000 });

  for (const p of PAGES) {
    await page.goto(p.path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/screenshots/${p.name}.png`, fullPage: true });
  }
});
