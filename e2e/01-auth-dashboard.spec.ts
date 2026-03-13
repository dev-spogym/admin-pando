import { test, expect } from '@playwright/test';

// ============================================================
// 1. 로그인 페이지 (/login)
// ============================================================
test.describe('로그인 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 스포짐 CRM 텍스트가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('heading', { name: '스포짐 CRM' })).toBeVisible();
    await expect(page.getByText('피트니스 센터 통합 관리 솔루션')).toBeVisible();
  });

  test('지점 선택 셀렉트에 강남 본점, 서초점, 송파점이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    const select = page.locator('select');
    await expect(select).toBeVisible();

    const options = select.locator('option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText('강남 본점');
    await expect(options.nth(1)).toHaveText('서초점');
    await expect(options.nth(2)).toHaveText('송파점');
  });

  test('아이디와 비밀번호 입력 필드가 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByPlaceholder('아이디를 입력하세요')).toBeVisible();
    await expect(page.getByPlaceholder('비밀번호를 입력하세요')).toBeVisible();
  });

  test('빈 폼일 때 로그인 버튼이 disabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeDisabled();
  });

  test('아이디만 입력하면 로그인 버튼이 여전히 disabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeDisabled();
  });

  test('아이디와 비밀번호 모두 입력하면 로그인 버튼이 enabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeEnabled();
  });

  test('잘못된 로그인 시 에러 메시지가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByPlaceholder('아이디를 입력하세요').fill('wrong');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('wrong');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeVisible({ timeout: 5_000 });
  });

  test('올바른 로그인 시 대시보드로 이동한다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 5_000 });
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
  });

  test('비밀번호 표시/숨기기 토글이 동작한다', async ({ page }) => {
    test.setTimeout(10_000);
    const passwordInput = page.getByPlaceholder('비밀번호를 입력하세요');
    await passwordInput.fill('test1234');

    // 기본: password 타입
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // 눈 아이콘 클릭 → text 타입으로 변경
    const toggleButton = passwordInput.locator('..').locator('button[type="button"]');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 다시 클릭 → password 타입으로 복원
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('로그인 유지 체크박스가 존재하고 토글 가능하다', async ({ page }) => {
    test.setTimeout(10_000);
    const label = page.getByText('로그인 유지');
    await expect(label).toBeVisible();

    // 체크박스 클릭 (커스텀 체크박스이므로 label 클릭)
    const checkboxContainer = label.locator('..');
    await checkboxContainer.click();

    // hidden input의 checked 상태 확인
    const hiddenCheckbox = page.locator('input[type="checkbox"]');
    await expect(hiddenCheckbox).toBeChecked();

    // 다시 클릭하여 해제
    await checkboxContainer.click();
    await expect(hiddenCheckbox).not.toBeChecked();
  });

  test('로그인 중 로딩 상태가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByPlaceholder('아이디를 입력하세요').fill('wrong');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('wrong');
    await page.locator('button[type="submit"]').click();

    // 로그인 중... 텍스트 확인 (1.5초 setTimeout 중)
    await expect(page.getByText('로그인 중...')).toBeVisible({ timeout: 2_000 });
  });
});

// ============================================================
// 2. 대시보드 (/)
// ============================================================
test.describe('대시보드', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 후 대시보드 접근
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 PageHeader에 "대시보드" 텍스트가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
    await expect(page.getByText('스포짐 종각점의 실시간 센터 운영 현황입니다.')).toBeVisible();
  });

  test('기간 필터 버튼 4개가 존재하고 클릭 가능하다', async ({ page }) => {
    test.setTimeout(15_000);
    const filters = ['오늘', '이번주', '이번달', '분기'];

    for (const label of filters) {
      const button = page.getByRole('button', { name: label });
      await expect(button).toBeVisible();
      await button.click();
    }
  });

  test('StatCard 6개가 존재한다', async ({ page }) => {
    test.setTimeout(15_000);
    const statLabels = ['전체 회원', '활성 회원', '만료 임박', '만료 회원', '오늘 출석', '이번달 매출'];

    for (const label of statLabels) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('새로고침 버튼 클릭이 동작한다', async ({ page }) => {
    test.setTimeout(15_000);
    // 갱신 텍스트 확인
    await expect(page.getByText('갱신:', { exact: false })).toBeVisible();

    // RefreshCw 아이콘이 있는 버튼 클릭
    const refreshArea = page.getByText('갱신:', { exact: false }).locator('..');
    const refreshButton = refreshArea.locator('button');
    await refreshButton.click();

    // 클릭 후에도 갱신 텍스트가 유지됨
    await expect(page.getByText('갱신:', { exact: false })).toBeVisible();
  });

  test('배너 닫기 버튼 클릭 시 배너가 사라진다', async ({ page }) => {
    test.setTimeout(15_000);
    const bannerText = page.getByText('신규 \'전자계약\' 기능이 업데이트 되었습니다!');
    await expect(bannerText).toBeVisible();

    // X 버튼 클릭 (배너 내부의 닫기 버튼)
    const banner = bannerText.locator('..').locator('..');
    const closeButton = banner.locator('..').locator('button').filter({ has: page.locator('svg') }).last();
    await closeButton.click();

    await expect(bannerText).not.toBeVisible({ timeout: 3_000 });
  });

  test('차트 카드가 존재한다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.locator('h2').getByText('운영 현황')).toBeVisible();
    await expect(page.locator('h3').getByText('회원 분포')).toBeVisible();
    await expect(page.locator('h3').getByText('주간 출석')).toBeVisible();
    await expect(page.locator('h3').getByText('매출 추이')).toBeVisible();
  });

  test('리스트 카드(생일회원, 미수금, 홀딩, 만료임박)가 존재한다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.getByText('오늘 생일자 회원')).toBeVisible();
    await expect(page.getByText('미수금 회원')).toBeVisible();
    await expect(page.getByText('연기(홀딩) 중인 회원')).toBeVisible();
    await expect(page.getByText('수강권 만료 임박')).toBeVisible();
  });
});

// ============================================================
// 3. 공통 레이아웃
// ============================================================
test.describe('공통 레이아웃', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 후 대시보드 접근
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
    await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
  });

  test('사이드바 메뉴가 존재한다', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();

    // 주요 메뉴 항목 확인 (exact: true로 정확한 매칭)
    await expect(sidebar.getByText('대시보드', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('회원', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('수업/캘린더', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('매출', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('설정', { exact: true })).toBeVisible();
  });

  test('사이드바 토글(접기/펼치기)이 동작한다', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');

    // 초기 상태: 펼쳐진 상태 (w-[220px])
    await expect(sidebar).toHaveClass(/w-\[220px\]/);

    // 햄버거 메뉴 버튼 클릭 (헤더의 Menu 아이콘)
    const toggleButton = page.locator('header button').first();
    await toggleButton.click();

    // 접힌 상태 확인 (w-[60px])
    await expect(sidebar).toHaveClass(/w-\[60px\]/);

    // 다시 클릭하여 펼치기
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[220px\]/);
  });

  test('헤더 영역에 검색, 알림, 프로필이 존재한다', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');

    // 검색 입력 필드
    await expect(header.getByPlaceholder('회원 이름, 연락처 검색...')).toBeVisible();

    // 알림 아이콘 (배지 포함)
    await expect(header.locator('button').filter({ has: page.locator('svg') }).nth(1)).toBeVisible();

    // 프로필 영역 (사용자 이름)
    await expect(header.getByText('운영관리자')).toBeVisible();
  });

  test('사이드바 메뉴 클릭 시 페이지가 이동한다', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');

    // "회원" 부모 메뉴는 기본적으로 열려있으므로 (openMenus default = Set(["회원"]))
    // 서브메뉴 "회원 목록"이 이미 보일 수 있음
    const memberListMenu = sidebar.getByText('회원 목록', { exact: true });

    // 보이지 않으면 부모 메뉴 클릭
    if (!(await memberListMenu.isVisible())) {
      await sidebar.getByText('회원', { exact: true }).click();
      await expect(memberListMenu).toBeVisible({ timeout: 3_000 });
    }

    await memberListMenu.click();
    await page.waitForURL('**/members', { timeout: 5_000 });
  });
});
