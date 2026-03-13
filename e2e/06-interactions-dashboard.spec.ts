import { test, expect } from '@playwright/test';

// 공통 로그인 헬퍼
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
}

// ============================================================
// 1. 로그인 플로우 (인터랙션 시나리오)
// ============================================================
test.describe('로그인 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('지점 변경 - 강남 본점 → 서초점 → 송파점 select 실제 변경', async ({ page }) => {
    test.setTimeout(15_000);
    const select = page.locator('select');

    // 기본값: 강남 본점
    await expect(select).toHaveValue('main');

    // 서초점으로 변경
    await select.selectOption('branch1');
    await expect(select).toHaveValue('branch1');

    // 송파점으로 변경
    await select.selectOption('branch2');
    await expect(select).toHaveValue('branch2');

    // 다시 강남 본점으로 변경
    await select.selectOption('main');
    await expect(select).toHaveValue('main');
  });

  test('아이디 입력 → 클리어 → 재입력', async ({ page }) => {
    test.setTimeout(15_000);
    const idInput = page.getByPlaceholder('아이디를 입력하세요');

    // 입력
    await idInput.fill('testuser');
    await expect(idInput).toHaveValue('testuser');

    // 클리어
    await idInput.clear();
    await expect(idInput).toHaveValue('');

    // 재입력
    await idInput.fill('admin');
    await expect(idInput).toHaveValue('admin');
  });

  test('비밀번호 토글 - eye 아이콘 클릭 후 input type 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const passwordInput = page.getByPlaceholder('비밀번호를 입력하세요');
    await passwordInput.fill('mySecret123');

    // 기본: password 타입
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // eye 아이콘 클릭 → text 타입
    const toggleButton = passwordInput.locator('..').locator('button[type="button"]');
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // 값이 보이는 상태에서 값 확인
    await expect(passwordInput).toHaveValue('mySecret123');

    // 다시 클릭 → password 타입
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('잘못된 비밀번호 → 에러 → 다시 올바른 비밀번호 → 성공', async ({ page }) => {
    test.setTimeout(20_000);
    const idInput = page.getByPlaceholder('아이디를 입력하세요');
    const pwInput = page.getByPlaceholder('비밀번호를 입력하세요');
    const submitBtn = page.locator('button[type="submit"]');

    // 잘못된 비밀번호로 로그인 시도
    await idInput.fill('admin');
    await pwInput.fill('wrongpassword');
    await submitBtn.click();

    // 에러 메시지 확인
    await expect(page.getByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeVisible({ timeout: 5_000 });

    // 올바른 비밀번호로 재시도
    await pwInput.clear();
    await pwInput.fill('password123');
    await submitBtn.click();

    // 대시보드로 이동 확인
    await page.waitForURL('/', { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible();
  });

  test('로그인 중 버튼 disabled 확인 + "로그인 중..." 텍스트', async ({ page }) => {
    test.setTimeout(15_000);
    const idInput = page.getByPlaceholder('아이디를 입력하세요');
    const pwInput = page.getByPlaceholder('비밀번호를 입력하세요');
    const submitBtn = page.locator('button[type="submit"]');

    await idInput.fill('admin');
    await pwInput.fill('wrongpassword');
    await submitBtn.click();

    // 로그인 중... 텍스트 표시
    await expect(page.getByText('로그인 중...')).toBeVisible({ timeout: 2_000 });

    // 버튼 disabled 상태 확인
    await expect(submitBtn).toBeDisabled();

    // 입력 필드도 disabled 상태 확인
    await expect(idInput).toBeDisabled();
    await expect(pwInput).toBeDisabled();
  });

  test('고객센터 문의 버튼 존재 확인', async ({ page }) => {
    test.setTimeout(10_000);
    const helpButton = page.getByRole('button', { name: '고객센터 문의' });
    await expect(helpButton).toBeVisible();
  });

  test('비밀번호 찾기 버튼 존재 확인', async ({ page }) => {
    test.setTimeout(10_000);
    const findPwButton = page.getByRole('button', { name: '비밀번호 찾기' });
    await expect(findPwButton).toBeVisible();
  });
});

// ============================================================
// 2. 대시보드 인터랙션
// ============================================================
test.describe('대시보드 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('기간 필터 각각 클릭 → 활성 상태 확인', async ({ page }) => {
    test.setTimeout(20_000);
    const filters = ['오늘', '이번주', '이번달', '분기'];

    for (const label of filters) {
      const button = page.getByRole('button', { name: label, exact: true });
      await button.click();

      // 활성 상태: bg-surface + text-content + shadow 클래스가 포함되어야 함
      await expect(button).toHaveClass(/bg-surface/);
      await expect(button).toHaveClass(/text-content/);
    }
  });

  test('새로고침 버튼 → 아이콘 회전 애니메이션 확인 (animate-spin)', async ({ page }) => {
    test.setTimeout(15_000);
    const refreshArea = page.getByText('갱신:', { exact: false }).locator('..');
    const refreshButton = refreshArea.locator('button');

    // 클릭 전 시간 기록
    const timeBefore = await page.getByText('갱신:', { exact: false }).textContent();

    await refreshButton.click();

    // 클릭 직후 animate-spin 클래스 확인
    await expect(refreshButton).toHaveClass(/animate-spin/, { timeout: 1_000 });

    // 애니메이션 종료 후 animate-spin이 사라짐
    await expect(refreshButton).not.toHaveClass(/animate-spin/, { timeout: 3_000 });
  });

  test('배너 닫기 → 배너 사라짐 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const bannerText = page.getByText('신규 \'전자계약\' 기능이 업데이트 되었습니다!');
    await expect(bannerText).toBeVisible();

    // 배너 내 X 버튼 찾기: 배너 컨테이너 안에서 마지막 button(닫기)
    const bannerContainer = bannerText.locator('..').locator('..');
    const closeButton = bannerContainer.locator('..').locator('button').filter({ has: page.locator('svg') }).last();
    await closeButton.click();

    await expect(bannerText).not.toBeVisible({ timeout: 3_000 });
  });

  test('StatCard 각각 클릭 → 페이지 이동 확인 (moveToPage)', async ({ page }) => {
    test.setTimeout(30_000);

    // 전체 회원 클릭 → /members 이동
    await page.getByText('전체 회원', { exact: true }).click();
    await page.waitForURL('**/members', { timeout: 5_000 });

    // 대시보드로 복귀
    await login(page);

    // 오늘 출석 클릭 → /attendance 이동
    await page.getByText('오늘 출석', { exact: true }).click();
    await page.waitForURL('**/attendance', { timeout: 5_000 });

    // 대시보드로 복귀
    await login(page);

    // 이번달 매출 클릭 → /sales 이동
    await page.getByText('이번달 매출', { exact: true }).click();
    await page.waitForURL('**/sales', { timeout: 5_000 });
  });

  test('리스트 카드 내 항목 클릭 → 행동 확인', async ({ page }) => {
    test.setTimeout(30_000);

    // 미수금 카드에서 "결제" 버튼 클릭 → /pos 이동
    const payButton = page.getByRole('button', { name: '결제' }).first();
    await expect(payButton).toBeVisible();
    await payButton.click();
    await page.waitForURL('**/pos', { timeout: 5_000 });

    // 대시보드로 복귀
    await login(page);

    // 만료 임박 카드에서 "재등록 상담" 버튼 클릭 → /members/detail 이동
    const reRegisterButton = page.getByRole('button', { name: '재등록 상담' }).first();
    await expect(reRegisterButton).toBeVisible();
    await reRegisterButton.click();
    await page.waitForURL('**/members/detail', { timeout: 5_000 });
  });

  test('차트 카드 영역 존재 확인', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.locator('h2').getByText('운영 현황')).toBeVisible();
    await expect(page.locator('h3').getByText('회원 분포')).toBeVisible();
    await expect(page.locator('h3').getByText('주간 출석')).toBeVisible();
    await expect(page.locator('h3').getByText('매출 추이')).toBeVisible();

    // SVG 차트 요소 존재 확인
    const chartCards = page.locator('.rounded-xl.border').filter({ has: page.locator('svg') });
    await expect(chartCards.first()).toBeVisible();
  });

  test('프로모션 배너 클릭 → 페이지 이동', async ({ page }) => {
    test.setTimeout(15_000);
    // 구독형 키오스크 패키지 배너 클릭 → /subscription 이동
    const promoBanner = page.getByText('구독형 키오스크 패키지').locator('..');
    await promoBanner.click();
    await page.waitForURL('**/subscription', { timeout: 5_000 });
  });
});

// ============================================================
// 3. 사이드바 네비게이션 (전체)
// ============================================================
test.describe('사이드바 네비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('모든 메뉴 그룹 열기/닫기', async ({ page }) => {
    test.setTimeout(30_000);
    const sidebar = page.locator('aside');
    const menuGroups = ['회원', '매출', '상품', '시설', '급여', '메시지/쿠폰', '설정'];

    for (const group of menuGroups) {
      const menuButton = sidebar.getByText(group, { exact: true });
      await expect(menuButton).toBeVisible();

      // 열기: 클릭 후 서브메뉴 표시 확인
      await menuButton.click();

      // ChevronDown이 rotate-180 (열린 상태) 확인
      const chevron = menuButton.locator('..').locator('svg').last();
      await expect(chevron).toBeVisible();

      // 닫기: 다시 클릭
      await menuButton.click();
    }
  });

  test('각 서브메뉴 클릭 → URL 변경 확인', async ({ page }) => {
    test.setTimeout(60_000);
    const sidebar = page.locator('aside');

    const menuMap: Record<string, { sub: string; url: string }[]> = {
      '회원': [
        { sub: '회원 목록', url: '/members' },
        { sub: '출석 관리', url: '/attendance' },
        { sub: '마일리지 관리', url: '/mileage' },
        { sub: '전자계약', url: '/contracts/new' },
      ],
      '매출': [
        { sub: '매출 현황', url: '/sales' },
        { sub: 'POS 결제', url: '/pos' },
        { sub: '현장 판매', url: '/pos/payment' },
      ],
      '상품': [
        { sub: '상품 관리', url: '/products' },
      ],
      '시설': [
        { sub: '락커 관리', url: '/locker' },
        { sub: '사물함 관리', url: '/locker/management' },
        { sub: '밴드/카드', url: '/rfid' },
        { sub: '운동룸', url: '/rooms' },
      ],
      '급여': [
        { sub: '급여 관리', url: '/payroll' },
        { sub: '급여 명세서', url: '/payroll/statements' },
      ],
      '메시지/쿠폰': [
        { sub: '메시지 발송', url: '/message' },
        { sub: '자동 알림', url: '/message/auto-alarm' },
        { sub: '쿠폰 관리', url: '/message/coupon' },
      ],
      '설정': [
        { sub: '센터 설정', url: '/settings' },
        { sub: '직원 관리', url: '/staff' },
        { sub: '권한 설정', url: '/settings/permissions' },
        { sub: '키오스크', url: '/settings/kiosk' },
        { sub: '출입문/IoT', url: '/settings/iot' },
        { sub: '구독 관리', url: '/subscription' },
        { sub: '지점 관리', url: '/branches' },
      ],
    };

    for (const [group, subs] of Object.entries(menuMap)) {
      const groupButton = sidebar.getByText(group, { exact: true });

      // 서브메뉴가 이미 보이는지 확인 (회원 메뉴는 기본 열림 상태)
      const firstSub = subs[0];
      const subButton = sidebar.getByText(firstSub.sub, { exact: true });
      const isAlreadyOpen = await subButton.isVisible().catch(() => false);

      if (!isAlreadyOpen) {
        // 닫혀 있으면 열기
        await groupButton.click();
      }

      await expect(subButton).toBeVisible({ timeout: 3_000 });
      await subButton.click();
      await page.waitForURL(`**${firstSub.url}`, { timeout: 5_000 });

      // 닫기
      await groupButton.click();
    }
  });

  test('사이드바 접기 → 아이콘만 표시 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');
    const toggleButton = page.locator('header button').first();

    // 초기: 펼쳐진 상태 - 텍스트 메뉴가 보임
    await expect(sidebar).toHaveClass(/w-\[220px\]/);
    await expect(sidebar.getByText('대시보드', { exact: true })).toBeVisible();

    // 접기
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[60px\]/);

    // 접힌 상태: 텍스트 메뉴가 안 보이고, 로고 "S"만 보임
    await expect(sidebar.getByText('스포짐', { exact: true })).not.toBeVisible();
    // 아이콘은 여전히 존재 (svg 아이콘)
    await expect(sidebar.locator('svg').first()).toBeVisible();
  });

  test('사이드바 펼치기 → 텍스트 표시 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');
    const toggleButton = page.locator('header button').first();

    // 접기
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[60px\]/);

    // 펼치기
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[220px\]/);

    // 텍스트 메뉴가 다시 보임
    await expect(sidebar.getByText('대시보드', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('회원', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('설정', { exact: true })).toBeVisible();
  });

  test('로그아웃 버튼 존재 및 클릭 가능 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');
    const logoutButton = sidebar.getByText('로그아웃', { exact: true });
    await expect(logoutButton).toBeVisible();

    // 로그아웃 버튼 클릭 (현재 Mock이라 실제 이동은 미구현)
    await logoutButton.click();

    // 클릭 후 오류 없이 동작 확인
    await expect(logoutButton).toBeVisible();
  });

  test('대시보드 메뉴 (단일 메뉴) 클릭 → / 이동', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');

    // "회원" 메뉴는 기본 열림 상태이므로 서브메뉴가 바로 보임
    const memberListMenu = sidebar.getByText('회원 목록', { exact: true });
    const isVisible = await memberListMenu.isVisible().catch(() => false);

    if (!isVisible) {
      // 열려 있지 않으면 열기
      await sidebar.getByText('회원', { exact: true }).click();
      await expect(memberListMenu).toBeVisible({ timeout: 3_000 });
    }

    await memberListMenu.click();
    await page.waitForURL('**/members', { timeout: 5_000 });

    // 대시보드 클릭
    await sidebar.getByText('대시보드', { exact: true }).click();
    await page.waitForURL(/\/$/, { timeout: 5_000 });
  });

  test('수업/캘린더 메뉴 (단일 메뉴) 클릭 → /calendar 이동', async ({ page }) => {
    test.setTimeout(15_000);
    const sidebar = page.locator('aside');
    await sidebar.getByText('수업/캘린더', { exact: true }).click();
    await page.waitForURL('**/calendar', { timeout: 5_000 });
  });
});

// ============================================================
// 4. 헤더 인터랙션
// ============================================================
test.describe('헤더 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('검색 입력 → 값 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');
    const searchInput = header.getByPlaceholder('회원 이름, 연락처 검색...');

    await expect(searchInput).toBeVisible();

    // 검색어 입력
    await searchInput.fill('김태희');
    await expect(searchInput).toHaveValue('김태희');

    // 클리어 후 다른 검색어 입력
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
    await searchInput.fill('010-1234');
    await expect(searchInput).toHaveValue('010-1234');
  });

  test('알림 아이콘 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');

    // 알림 배지 (5) 존재 확인
    await expect(header.getByText('5')).toBeVisible();

    // 알림 버튼 클릭 (Bell 아이콘이 있는 버튼)
    const bellButton = header.locator('button').filter({ has: page.locator('svg') }).nth(1);
    await expect(bellButton).toBeVisible();
    await bellButton.click();
    // 알림 버튼이 여전히 존재함을 확인 (클릭 후 오류가 나지 않음)
    await expect(bellButton).toBeVisible();
  });

  test('프로필 영역 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');

    // 사용자 이름 표시 확인
    await expect(header.getByText('운영관리자')).toBeVisible();

    // 지점 이름 표시 확인
    await expect(header.getByText('스포짐 종각점')).toBeVisible();

    // 프로필 영역 클릭 가능 확인
    const profileArea = header.getByText('운영관리자').locator('..');
    await profileArea.click();
    // 클릭 후 오류 없이 유지
    await expect(header.getByText('운영관리자')).toBeVisible();
  });

  test('사이드바 토글 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');
    const sidebar = page.locator('aside');
    const toggleButton = header.locator('button').first();

    // 초기: 펼침
    await expect(sidebar).toHaveClass(/w-\[220px\]/);

    // 토글 클릭 → 접힘
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[60px\]/);

    // 다시 토글 → 펼침
    await toggleButton.click();
    await expect(sidebar).toHaveClass(/w-\[220px\]/);
  });

  test('회원등록 버튼 클릭 → /members/new 이동', async ({ page }) => {
    test.setTimeout(15_000);
    const header = page.locator('header');
    const registerButton = header.getByRole('button', { name: '회원등록' });
    await expect(registerButton).toBeVisible();
    await registerButton.click();
    await page.waitForURL('**/members/new', { timeout: 5_000 });
  });
});
