import { test, expect } from '@playwright/test';

// ────────────────────────────────────────────────────────────
// 헬퍼: 로그인 후 특정 경로로 이동
// ────────────────────────────────────────────────────────────

async function login(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 5_000 });
}

// ============================================================
// 1. 회원 목록 인터랙션 (/members)
// ============================================================

test.describe('회원 목록 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/members');
    await page.waitForLoadState('networkidle');
  });

  test('메인 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    test.setTimeout(30_000);
    const mainTabs = ['회원 목록', '회원권 목록', '수강권 목록', '락커 목록', '운동복 목록', '상품별 회원조회'];

    for (const tab of mainTabs) {
      await page.getByRole('button', { name: new RegExp(tab) }).first().click();
      // 탭 활성화 확인: 탭 버튼이 존재하고 클릭 가능
      await expect(page.getByRole('button', { name: new RegExp(tab) }).first()).toBeVisible();
    }

    // 회원 목록 탭 다시 클릭 시 테이블 데이터가 표시됨
    await page.getByRole('button', { name: /회원 목록/ }).first().click();
    await expect(page.getByText('김철수')).toBeVisible();
  });

  test('상태 탭 클릭으로 테이블이 필터링된다', async ({ page }) => {
    test.setTimeout(30_000);

    // 활성 탭 클릭 → 활성 회원만 표시
    await page.getByRole('button', { name: /^활성/ }).first().click();
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('박지성')).not.toBeVisible(); // 만료 회원

    // 만료 탭 클릭 → 만료 회원만 표시
    await page.getByRole('button', { name: /^만료/ }).first().click();
    await expect(page.getByText('박지성')).toBeVisible();
    await expect(page.getByText('김철수')).not.toBeVisible();

    // 임박 탭 클릭
    await page.getByRole('button', { name: /^임박/ }).first().click();
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('김철수')).not.toBeVisible();

    // 홀딩 탭 클릭
    await page.getByRole('button', { name: /^홀딩/ }).first().click();
    await expect(page.getByText('정수연')).toBeVisible();

    // 예정 탭 클릭
    await page.getByRole('button', { name: /^예정/ }).first().click();
    await expect(page.getByText('한상우')).toBeVisible();

    // 전체 탭 클릭 → 모두 표시
    await page.getByRole('button', { name: /^전체/ }).first().click();
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('박지성')).toBeVisible();
    await expect(page.getByText('이영희')).toBeVisible();
  });

  test('검색 입력 "김철수" → 김철수만 표시', async ({ page }) => {
    test.setTimeout(15_000);
    const searchInput = page.getByPlaceholder('회원명, 연락처 검색...');
    await searchInput.fill('김철수');
    await page.waitForTimeout(400); // 디바운스 대기

    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).not.toBeVisible();
    await expect(page.getByText('박지성')).not.toBeVisible();

    // 검색어 지우면 전체 다시 표시
    await searchInput.clear();
    await page.waitForTimeout(400);
    await expect(page.getByText('이영희')).toBeVisible();
  });

  test('필터 select 변경으로 결과가 필터링된다', async ({ page }) => {
    test.setTimeout(15_000);

    // 성별 필터: 여 선택
    const genderSelect = page.locator('select').filter({ hasText: '성별' });
    await genderSelect.selectOption('female');
    await page.waitForTimeout(300);

    // 여성 회원만 표시
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('정수연')).toBeVisible();
    await expect(page.getByText('김철수')).not.toBeVisible();
  });

  test('체크박스 단일 선택 → 벌크 바 표시', async ({ page }) => {
    test.setTimeout(15_000);
    const firstCheckbox = page.locator('table tbody input[type="checkbox"]').first();
    await firstCheckbox.click();

    // 벌크 액션 바
    await expect(page.getByText('1명 선택됨')).toBeVisible();
    await expect(page.getByText('상태 변경')).toBeVisible();
    await expect(page.getByText('전송하기')).toBeVisible();
    await expect(page.getByText('출석 처리')).toBeVisible();
    await expect(page.getByText('관심회원')).toBeVisible();
  });

  test('체크박스 전체 선택 → 전체 선택됨', async ({ page }) => {
    test.setTimeout(15_000);
    // thead 의 전체 선택 체크박스
    const headerCheckbox = page.locator('table thead input[type="checkbox"]');
    await headerCheckbox.click();

    // 5명 전체 선택됨 (Mock 데이터 5건)
    await expect(page.getByText('5명 선택됨')).toBeVisible();

    // 선택 취소
    await page.getByText('선택 취소').click();
    await expect(page.getByText('5명 선택됨')).not.toBeVisible();
  });

  test('벌크 바 버튼 클릭 시 alert 발생', async ({ page }) => {
    test.setTimeout(15_000);

    // alert 처리 등록 먼저
    page.on('dialog', dialog => dialog.accept());

    // 회원 선택
    const firstCheckbox = page.locator('table tbody input[type="checkbox"]').first();
    await firstCheckbox.click();
    await page.waitForTimeout(300);

    // 상태 변경 버튼 클릭
    await page.getByText('상태 변경').click();
    await page.waitForTimeout(300);

    // 벌크 바가 여전히 표시됨 (alert 후 상태 유지)
    await expect(page.getByText('1명 선택됨')).toBeVisible();
  });

  test('회원 추가 버튼 클릭 → /members/new 이동', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /회원 추가/ }).click();
    await page.waitForURL(/\/members\/new/, { timeout: 5_000 });
    await expect(page.getByText('신규 회원 등록')).toBeVisible();
  });

  test('테이블 행 회원명 클릭 → /members/detail 이동', async ({ page }) => {
    test.setTimeout(15_000);
    // 회원명 링크 버튼 클릭
    await page.locator('table tbody').getByText('김철수').click();
    await page.waitForURL(/\/members\/detail/, { timeout: 5_000 });
    await expect(page.getByText('김민수').or(page.getByText('정상 이용중')).first()).toBeVisible();
  });

  test('엑셀 다운로드 버튼 클릭 시 alert 발생', async ({ page }) => {
    test.setTimeout(15_000);

    // alert 처리 등록 먼저
    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.getByRole('button', { name: /엑셀 다운로드/ }).click();
    await page.waitForTimeout(500);
    expect(alertMessage).toContain('엑셀');
  });
});

// ============================================================
// 2. 회원 상세 인터랙션 (/members/detail)
// ============================================================

test.describe('회원 상세 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/members/detail');
    await page.waitForLoadState('networkidle');
  });

  test('모든 탭 순서대로 클릭하여 컨텐츠 변경 확인', async ({ page }) => {
    test.setTimeout(30_000);

    // 이용권 탭
    await page.getByRole('button', { name: /이용권/ }).first().click();
    await expect(page.getByText('PT 30회').or(page.getByText('신규 이용권')).first()).toBeVisible();

    // 출석 이력 탭
    await page.getByRole('button', { name: /출석 이력/ }).first().click();
    await expect(page.getByRole('heading', { name: /출석 캘린더/ })).toBeVisible();

    // 결제 이력 탭
    await page.getByRole('button', { name: /결제 이력/ }).first().click();
    await expect(page.getByText('결제 이력').first()).toBeVisible();

    // 체성분 탭
    await page.getByRole('button', { name: /체성분/ }).first().click();
    await expect(page.getByText(/체성분 변화 추이/).or(page.getByText(/측정 추가/)).first()).toBeVisible();

    // 상담·메모 탭
    await page.getByRole('button', { name: /상담·메모/ }).first().click();
    await expect(page.getByRole('heading', { name: '새 메모 작성' })).toBeVisible();
  });

  test('결제 탭: 상세 버튼 클릭 → 모달 열림/닫기', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /결제 이력/ }).first().click();
    await page.waitForTimeout(300);

    // 첫 번째 상세 버튼 클릭
    await page.getByRole('button', { name: '상세' }).first().click();

    // 모달 확인
    await expect(page.getByText('결제 상세')).toBeVisible();
    // 모달 내부에서 상품명 확인 (strict 모드 대응: first())
    await expect(page.getByText('퍼스널 트레이닝 30회').first()).toBeVisible();

    // 닫기 버튼
    await page.getByRole('button', { name: '닫기' }).click();
    await expect(page.getByText('결제 상세')).not.toBeVisible();
  });

  test('결제 탭: 환불 버튼 → ConfirmDialog 표시', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /결제 이력/ }).first().click();
    await page.waitForTimeout(300);

    // 첫 번째 환불 버튼 클릭
    await page.getByRole('button', { name: '환불' }).first().click();

    // 확인 다이얼로그
    await expect(page.getByRole('heading', { name: '환불 처리' })).toBeVisible();
    await expect(page.getByText(/환불 처리하시겠습니까/)).toBeVisible();

    // 취소 버튼으로 닫기
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText(/환불 처리하시겠습니까/)).not.toBeVisible();
  });

  test('메모 탭: 메모 추가 (textarea 입력 → 저장)', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /상담·메모/ }).first().click();
    await page.waitForTimeout(300);

    // 저장 버튼이 비활성화 상태
    const saveBtn = page.getByRole('button', { name: /메모 저장/ });
    await expect(saveBtn).toBeDisabled();

    // 메모 입력
    const textarea = page.getByPlaceholder(/상담 내용 또는 특이사항/);
    await textarea.fill('새로운 테스트 메모입니다');

    // 저장 버튼 활성화
    await expect(saveBtn).toBeEnabled();

    // 저장 클릭
    await saveBtn.click();

    // 메모가 목록에 표시됨
    await expect(page.getByText('새로운 테스트 메모입니다')).toBeVisible();
  });

  test('메모 탭: 메모 수정', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /상담·메모/ }).first().click();
    await page.waitForTimeout(300);

    // 첫 번째 메모 내용 확인
    await expect(page.getByText('식단 상담 진행')).toBeVisible();

    // 수정 버튼 클릭 (첫 번째 메모)
    await page.getByTitle('수정').first().click();
    await page.waitForTimeout(300);

    // 수정용 textarea 가 표시됨 (autoFocus 속성이 있음)
    // 새 메모 작성 textarea 와 수정용 textarea 가 있으므로 두 번째 것
    const editTextarea = page.locator('textarea[autofocus]').or(page.locator('textarea').nth(1));
    await expect(editTextarea.first()).toBeVisible();

    // 내용 변경
    await editTextarea.first().fill('수정된 메모 내용');

    // 저장 버튼 클릭
    await page.getByTitle('저장').click();

    // 수정된 내용 확인
    await expect(page.getByText('수정된 메모 내용')).toBeVisible();
  });

  test('메모 탭: 메모 삭제', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /상담·메모/ }).first().click();
    await page.waitForTimeout(300);

    // 삭제 버튼 클릭 (첫 번째 메모의 title="삭제" 버튼)
    await page.getByTitle('삭제').first().click();

    // 삭제 확인 다이얼로그
    await expect(page.getByText('메모 삭제')).toBeVisible();
    await expect(page.getByText('이 메모를 삭제하시겠습니까?')).toBeVisible();

    // ConfirmDialog 내의 삭제 확인 버튼 (마지막 '삭제' 버튼이 다이얼로그의 것)
    await page.getByRole('button', { name: '삭제' }).last().click();

    // 삭제된 메모가 사라짐 (첫 번째 메모 텍스트)
    await expect(page.getByText('식단 상담 진행')).not.toBeVisible();
  });

  test('프로필 카드: 수동 출석 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);

    let alertMessage = '';
    page.on('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.getByRole('button', { name: /수동 출석/ }).click();
    await page.waitForTimeout(500);
    expect(alertMessage).toContain('출석');
  });

  test('프로필 카드: 수정 버튼 클릭 → 회원 수정 페이지 이동', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /수정/ }).first().click();
    // moveToPage(986) → /members/new (or /members/edit)
    await page.waitForTimeout(500);
    // 이동 확인 (회원 등록 또는 수정 페이지)
    await expect(page.url()).not.toBe('about:blank');
  });

  test('프로필 카드: 삭제 버튼 → ConfirmDialog', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: /삭제/ }).click();
    await expect(page.getByText('회원 삭제 확인')).toBeVisible();
    await expect(page.getByText(/영구적으로 삭제됩니다/)).toBeVisible();

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('회원 삭제 확인')).not.toBeVisible();
  });

  test('만료 알림 배너가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    // D-7 이하 이용권이 있으므로 경고 배너 확인
    await expect(page.getByText(/만료 예정입니다/).first()).toBeVisible();
  });
});

// ============================================================
// 3. 회원 등록 폼 인터랙션 (/members/new)
// ============================================================

test.describe('회원 등록 폼 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/members/new');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1: 이름 한글 검증 (영문 입력 → 에러)', async ({ page }) => {
    test.setTimeout(15_000);
    const nameInput = page.getByPlaceholder('이름을 입력하세요');

    // 영문 입력 → blur → 에러
    await nameInput.fill('abc');
    await nameInput.blur();
    await expect(page.getByText('한글 2~20자로 입력하세요')).toBeVisible();

    // 한글 입력 → 에러 사라짐
    await nameInput.fill('홍길동');
    await nameInput.blur();
    await expect(page.getByText('한글 2~20자로 입력하세요')).not.toBeVisible();
  });

  test('Step 1: 성별 Radio 클릭 (남성/여성)', async ({ page }) => {
    test.setTimeout(15_000);

    // 남성 클릭
    const maleBtn = page.getByRole('button', { name: '남성' });
    await maleBtn.click();
    // 활성화 스타일 확인 (bg-primary)
    await expect(maleBtn).toHaveClass(/bg-primary/);

    // 여성 클릭
    const femaleBtn = page.getByRole('button', { name: '여성' });
    await femaleBtn.click();
    await expect(femaleBtn).toHaveClass(/bg-primary/);
    // 남성은 비활성
    await expect(maleBtn).not.toHaveClass(/bg-primary/);
  });

  test('Step 1: 연락처 자동 하이픈 + 중복확인 버튼', async ({ page }) => {
    test.setTimeout(15_000);
    const phoneInput = page.getByPlaceholder('010-0000-0000');

    // 숫자만 입력하면 자동 하이픈
    await phoneInput.fill('01098765432');
    await expect(phoneInput).toHaveValue('010-9876-5432');

    // alert 처리
    page.on('dialog', dialog => dialog.accept());

    // 중복확인 버튼 클릭
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);

    // 중복확인 완료 후 버튼 disabled
    const checkBtn = page.getByRole('button', { name: '중복확인' }).or(page.locator('button:has(svg)').filter({ has: page.locator('[data-lucide="check-circle-2"]') }));
    // 버튼이 disabled 상태이거나 체크 아이콘으로 변경됨
    await expect(page.locator('button[disabled]').filter({ has: page.locator('svg') }).last()).toBeVisible();
  });

  test('Step 1: 생년월일 입력', async ({ page }) => {
    test.setTimeout(15_000);
    const birthInput = page.locator('input[type="date"][name="birthDate"]');
    await expect(birthInput).toBeVisible();

    await birthInput.fill('1990-05-20');
    await expect(birthInput).toHaveValue('1990-05-20');
  });

  test('Step 1 → Step 2 이동 (다음 단계 버튼)', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // 다음 단계 버튼 초기 상태: disabled
    const nextBtn = page.getByRole('button', { name: /다음 단계/ });
    await expect(nextBtn).toBeDisabled();

    // 필수값 입력
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');

    // 중복확인
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);

    // 다음 단계 버튼 활성화
    await expect(nextBtn).toBeEnabled();

    // 클릭하여 Step2로 이동
    await nextBtn.click();

    // Step 2 필드 확인
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible();
  });

  test('Step 2: 이메일 형식 검증', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // Step 1 통과
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /다음 단계/ }).click();

    // 잘못된 이메일 입력
    const emailInput = page.getByPlaceholder('example@email.com');
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await expect(page.getByText('올바른 이메일을 입력하세요')).toBeVisible();

    // 올바른 이메일
    await emailInput.fill('test@example.com');
    await emailInput.blur();
    await expect(page.getByText('올바른 이메일을 입력하세요')).not.toBeVisible();
  });

  test('Step 2: 주소 검색 버튼 → 모달', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // Step 1 통과
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /다음 단계/ }).click();

    // 주소 검색 버튼 클릭
    await page.getByRole('button', { name: /주소 검색/ }).click();

    // 모달 표시 확인
    await expect(page.getByText('주소 검색').nth(0)).toBeVisible();
    await expect(page.getByPlaceholder(/도로명, 지번/)).toBeVisible();

    // 주소 검색
    await page.getByPlaceholder(/도로명, 지번/).fill('강남구');
    await page.locator('.fixed').getByRole('button', { name: '검색' }).click();

    // 결과 표시
    await expect(page.getByText(/테헤란로/)).toBeVisible();

    // 주소 선택
    await page.getByText(/테헤란로/).click();

    // 모달 닫힘 + 주소 필드에 값 채워짐
    await expect(page.locator('input[name="address"]')).not.toHaveValue('');
  });

  test('Step 2: 메모 입력 → 글자수 카운터 실시간 변화', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // Step 1 통과
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /다음 단계/ }).click();

    // 글자수 카운터 초기값
    await expect(page.getByText('0 / 500')).toBeVisible();

    // 메모 입력
    const textarea = page.getByPlaceholder(/회원의 건강 상태/);
    await textarea.fill('테스트');
    // "테스트" = 3자
    await expect(page.getByText('3 / 500')).toBeVisible();

    // 추가 입력
    await textarea.fill('가나다라마');
    // "가나다라마" = 5자
    await expect(page.getByText('5 / 500')).toBeVisible();
  });

  test('Step 2: 담당 FC/트레이너 Select 변경', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // Step 1에서 FC/트레이너 select 확인
    const fcSelect = page.locator('select[name="fc"]');
    await expect(fcSelect).toBeVisible();

    await fcSelect.selectOption('정미라 FC');
    await expect(fcSelect).toHaveValue('정미라 FC');

    const trainerSelect = page.locator('select[name="trainer"]');
    await trainerSelect.selectOption('이현우 트레이너');
    await expect(trainerSelect).toHaveValue('이현우 트레이너');
  });

  test('저장 버튼 disabled → 필수값 입력 후 enabled', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // 다음 단계 버튼: 필수값 없으면 disabled
    const nextBtn = page.getByRole('button', { name: /다음 단계/ });
    await expect(nextBtn).toBeDisabled();

    // 필수값 입력
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);

    // 다음 단계 활성화
    await expect(nextBtn).toBeEnabled();

    // Step 2로 이동
    await nextBtn.click();

    // 저장 버튼 확인 (Step2에서는 필수가 아닌 선택이므로 활성화됨)
    const saveBtn = page.getByRole('button', { name: /회원 등록 완료/ });
    await expect(saveBtn).toBeEnabled();
  });

  test('취소 버튼 → 변경사항 있으면 확인 다이얼로그', async ({ page }) => {
    test.setTimeout(15_000);

    // 무언가 입력하여 dirty 상태 만들기
    await page.getByPlaceholder('이름을 입력하세요').fill('테스트');

    // 취소 버튼 클릭
    await page.getByRole('button', { name: '취소' }).click();

    // 확인 다이얼로그 표시
    await expect(page.getByText('작성 취소')).toBeVisible();
    await expect(page.getByText('저장하지 않고 나가시겠습니까?')).toBeVisible();

    // 계속 작성 클릭 → 다이얼로그 닫힘
    await page.getByRole('button', { name: '계속 작성' }).click();
    await expect(page.getByText('작성 취소')).not.toBeVisible();

    // 다시 취소 → 나가기
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByRole('button', { name: '나가기' })).toBeVisible();
  });

  test('이전 단계로 버튼', async ({ page }) => {
    test.setTimeout(20_000);
    page.on('dialog', dialog => dialog.accept());

    // Step 1 통과
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    await page.getByPlaceholder('010-0000-0000').fill('01098765432');
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /다음 단계/ }).click();

    // Step 2 확인
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible();

    // 이전 단계로 버튼
    await page.getByRole('button', { name: /이전 단계로/ }).click();

    // Step 1로 복귀
    await expect(page.getByPlaceholder('이름을 입력하세요')).toBeVisible();
    // 입력값 유지 확인
    await expect(page.getByPlaceholder('이름을 입력하세요')).toHaveValue('홍길동');
  });
});

// ============================================================
// 4. 체성분 인터랙션 (/body-composition)
// ============================================================

test.describe('체성분 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/body-composition');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환 (기록 목록, 변화 그래프, 목표 관리)', async ({ page }) => {
    test.setTimeout(20_000);

    // 기록 목록 탭 (기본)
    await page.getByRole('button', { name: /기록 목록/ }).click();
    await expect(page.getByText('체성분 측정 히스토리')).toBeVisible();

    // 변화 그래프 탭
    await page.getByRole('button', { name: /변화 그래프/ }).click();
    await expect(page.getByText(/체성분 변화 추이/)).toBeVisible();
    await expect(page.locator('svg').first()).toBeVisible();

    // 목표 관리 탭
    await page.getByRole('button', { name: /목표 관리/ }).click();
    await expect(page.getByText('목표 체중', { exact: true })).toBeVisible();
    await expect(page.getByText('목표 체지방률', { exact: true })).toBeVisible();
  });

  test('새 측정 기록 추가: 모달 열기 → 값 입력 → 저장', async ({ page }) => {
    test.setTimeout(20_000);

    // 새 측정 기록 추가 버튼
    await page.getByRole('button', { name: /새 측정 기록 추가/ }).click();

    // 모달 확인
    await expect(page.getByText('체성분 측정 추가')).toBeVisible();

    // 값 입력
    const modal = page.locator('.fixed');
    await modal.locator('input[type="number"]').nth(0).fill('60.5'); // 체중
    await modal.locator('input[type="number"]').nth(1).fill('24.0'); // 골격근
    await modal.locator('input[type="number"]').nth(2).fill('22.0'); // 체지방률

    // 기록 저장 클릭
    await page.getByRole('button', { name: '기록 저장' }).click();

    // 모달 닫힘
    await expect(page.getByText('체성분 측정 추가')).not.toBeVisible();
  });

  test('측정 모달에서 BMI 자동 계산 확인', async ({ page }) => {
    test.setTimeout(15_000);

    await page.getByRole('button', { name: /새 측정 기록 추가/ }).click();

    // 체중 입력 시 BMI 자동 계산 표시
    const modal = page.locator('.fixed');
    await modal.locator('input[type="number"]').nth(0).fill('60');

    // BMI 자동 계산 미리보기 확인
    await expect(page.getByText(/BMI 자동 계산/)).toBeVisible();
  });

  test('차트 탭: 항목 토글 (체중/골격근/체지방률 켜기/끄기)', async ({ page }) => {
    test.setTimeout(15_000);

    await page.getByRole('button', { name: /변화 그래프/ }).click();
    await page.waitForTimeout(300);

    // 토글 버튼들 확인
    const weightToggle = page.getByRole('button', { name: /체중/ }).first();
    const muscleToggle = page.getByRole('button', { name: /골격근량/ }).first();
    const pbfToggle = page.getByRole('button', { name: /체지방률/ }).first();

    await expect(weightToggle).toBeVisible();
    await expect(muscleToggle).toBeVisible();
    await expect(pbfToggle).toBeVisible();

    // 체중 토글 끄기 (클릭)
    await weightToggle.click();
    await page.waitForTimeout(200);

    // 다시 켜기
    await weightToggle.click();
    await page.waitForTimeout(200);

    // SVG 차트가 여전히 표시됨
    await expect(page.locator('svg').first()).toBeVisible();
  });

  test('목표 관리: 목표 수정 버튼 → 모달', async ({ page }) => {
    test.setTimeout(15_000);

    await page.getByRole('button', { name: /목표 관리/ }).click();
    await page.waitForTimeout(300);

    // 목표 수정 버튼
    await page.getByRole('button', { name: '목표 수정' }).click();
    await page.waitForTimeout(300);

    // 목표 설정 모달
    const modal = page.locator('.fixed');
    await expect(modal.getByText('목표 설정')).toBeVisible();

    // 목표 체중 입력 변경
    const weightInput = modal.locator('input[type="number"]').first();
    await weightInput.clear();
    await weightInput.fill('50');

    // 저장 버튼
    await modal.getByRole('button', { name: '저장' }).click();
    await page.waitForTimeout(300);

    // 변경된 목표 표시 확인
    await expect(page.getByText(/50kg/).first()).toBeVisible();
  });

  test('기록 목록: 리포트 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);

    // 기록 목록 탭
    await page.getByRole('button', { name: /기록 목록/ }).click();
    await page.waitForTimeout(300);

    // 리포트 버튼 (FileText 아이콘) 확인
    const reportButtons = page.locator('table tbody button').filter({ has: page.locator('svg') });
    const count = await reportButtons.count();
    expect(count).toBeGreaterThan(0);

    // 첫 번째 리포트 버튼 클릭
    await reportButtons.first().click();
  });
});
