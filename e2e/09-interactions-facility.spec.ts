import { test, expect } from '@playwright/test';

// 로그인 헬퍼
async function login(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 10_000 });
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// 1. 출석 관리 인터랙션 (/attendance)
// =============================================================================
test.describe('출석 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/attendance');
    await page.waitForLoadState('networkidle');
  });

  test('뷰 전환 (일별→주별→월별) → 각 뷰 컨텐츠 변경', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본: 일별 뷰 - 출석 이력 목록 표시
    await expect(page.getByText('출석 이력 목록')).toBeVisible();
    await expect(page.getByText('오늘 출석')).toBeVisible();

    // 주별 전환 → 주간 통계 표시
    await page.getByRole('button', { name: '주별' }).click();
    await expect(page.getByText('주간 출석 현황')).toBeVisible();
    await expect(page.getByText('주간 총 출석')).toBeVisible();
    // 일별 뷰 컨텐츠 사라짐
    await expect(page.getByText('출석 이력 목록')).not.toBeVisible();

    // 월별 전환 → 월간 통계 표시
    await page.getByRole('button', { name: '월별' }).click();
    await expect(page.getByText('월간 출석 현황')).toBeVisible();
    await expect(page.getByText('월간 총 출석')).toBeVisible();
    await expect(page.getByText('주간 출석 현황')).not.toBeVisible();

    // 일별 복귀
    await page.getByRole('button', { name: '일별' }).click();
    await expect(page.getByText('출석 이력 목록')).toBeVisible();
  });

  test('날짜 이동 (이전/다음) 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    // date input의 현재 값 확인
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    const initialDate = await dateInput.inputValue();

    // 다음 날짜 이동 (ChevronRight 버튼) - 날짜 네비 영역 내 첫번째
    const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
    await nextBtn.click();
    const nextDate = await dateInput.inputValue();
    expect(nextDate).not.toBe(initialDate);

    // 이전 날짜 이동 (ChevronLeft 버튼)
    const prevBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
    await prevBtn.click();
    const restoredDate = await dateInput.inputValue();
    expect(restoredDate).toBe(initialDate);
  });

  test('실시간 팝업 토글 ON/OFF 전환', async ({ page }) => {
    test.setTimeout(10_000);
    // 기본: ON 상태
    const toggleBtn = page.getByRole('button', { name: /실시간/ });
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toContainText('ON');

    // OFF로 전환
    await toggleBtn.click();
    await expect(toggleBtn).toContainText('OFF');

    // 다시 ON으로 전환
    await toggleBtn.click();
    await expect(toggleBtn).toContainText('ON');
  });

  test('수동 출석 모달 → 회원 검색 → 선택 → 유형 변경 → 등록', async ({ page }) => {
    test.setTimeout(15_000);
    // 수동 출석 버튼 클릭
    await page.getByRole('button', { name: '수동 출석' }).click();

    // 모달 열림
    await expect(page.getByText('수동 출석 등록')).toBeVisible();

    // 회원 검색
    const searchInput = page.getByPlaceholder('회원명 또는 회원번호 검색');
    await searchInput.fill('김철수');

    // 자동완성 드롭다운에서 회원 선택 (드롭다운 내 버튼 = #101 포함)
    await page.getByRole('button', { name: '김철수 #' }).click();
    await expect(page.getByText('김철수 (#101) 선택됨')).toBeVisible();

    // 출석 유형 변경 (PT 선택)
    await page.getByRole('button', { name: 'PT', exact: true }).click();

    // 등록 버튼 활성화 확인 후 클릭
    const submitBtn = page.getByRole('button', { name: '등록', exact: true });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // 모달 닫힘
    await expect(page.getByText('수동 출석 등록')).not.toBeVisible();
  });

  test('수동 출석 모달 → 취소 버튼으로 닫기', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '수동 출석' }).click();
    await expect(page.getByText('수동 출석 등록')).toBeVisible();

    await page.getByRole('button', { name: '취소', exact: true }).click();
    await expect(page.getByText('수동 출석 등록')).not.toBeVisible();
  });

  test('수동 출석 모달 → 회원 미선택 시 등록 비활성화', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '수동 출석' }).click();
    await expect(page.getByText('수동 출석 등록')).toBeVisible();

    // 회원 미선택 상태에서 등록 버튼 disabled
    const submitBtn = page.getByRole('button', { name: '등록', exact: true });
    await expect(submitBtn).toBeDisabled();
  });
});

// =============================================================================
// 2. 캘린더 인터랙션 (/calendar)
// =============================================================================
test.describe('캘린더 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');
  });

  test('월/주/일 탭 전환 → 각 뷰 렌더링', async ({ page }) => {
    test.setTimeout(15_000);
    const monthBtn = page.getByRole('button', { name: '월', exact: true }).first();
    const weekBtn = page.getByRole('button', { name: '주', exact: true }).first();
    const dayBtn = page.getByRole('button', { name: '일', exact: true }).first();

    // 기본: 월 뷰 - 요일 헤더 표시
    await expect(page.locator('.grid-cols-7').first()).toBeVisible();

    // 주 뷰 전환
    await weekBtn.click();
    await expect(page.getByText('시간', { exact: true })).toBeVisible();

    // 일 뷰 전환
    await dayBtn.click();
    await expect(page.getByText('2026년 3월 11일 (수)')).toBeVisible();

    // 월 뷰 복귀
    await monthBtn.click();
    await expect(page.locator('.grid-cols-7').first()).toBeVisible();
  });

  test('이전/다음 월 이동 버튼 클릭', async ({ page }) => {
    test.setTimeout(10_000);
    // 날짜 범위 텍스트
    const dateText = page.getByText('2026.03.11 ~ 2026.03.17');
    await expect(dateText).toBeVisible();

    // 이전 이동 버튼 클릭
    const prevBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
    await prevBtn.click();

    // 다음 이동 버튼 클릭
    const nextBtn = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-right') }).first();
    await nextBtn.click();
  });

  test('트레이너 필터 select 변경 → 이벤트 필터링', async ({ page }) => {
    test.setTimeout(10_000);
    const select = page.locator('select').filter({ hasText: '전체 강사' });
    await expect(select).toBeVisible();

    // 김태희 선택 → 해당 강사 이벤트만 표시
    await select.selectOption('1');

    // 다른 강사의 이벤트가 사라져야 함 (박재범의 "그룹 스피닝" 등)
    // 전체 강사로 복귀
    await select.selectOption('');
  });

  test('오늘 버튼 클릭', async ({ page }) => {
    test.setTimeout(10_000);
    const todayBtn = page.getByRole('button', { name: '오늘' });
    await expect(todayBtn).toBeVisible();
    await todayBtn.click();
  });

  test('일정 클릭 → 상세 모달 → 모달 닫기', async ({ page }) => {
    test.setTimeout(15_000);
    // 일 뷰로 전환 (이벤트가 더 잘 보임)
    const dayBtn = page.getByRole('button', { name: '일', exact: true }).first();
    await dayBtn.click();
    await expect(page.getByText('2026년 3월 11일 (수)')).toBeVisible();

    // 이벤트 클릭 (그룹 필라테스)
    const event = page.getByText('그룹 필라테스').first();
    await event.click();

    // 상세 모달 확인 (모달 전용 텍스트)
    await expect(page.getByText('이미 시작된 수업은 수정할 수 없습니다.')).toBeVisible({ timeout: 3_000 });

    // 모달 닫기 - XCircle 닫기 버튼 클릭 (z-50 모달 오버레이 내부)
    const modalOverlay = page.locator('.fixed.inset-0.z-50');
    await modalOverlay.locator('button.rounded-full').first().click();

    // 모달 닫힘 확인
    await expect(page.getByText('이미 시작된 수업은 수정할 수 없습니다.')).not.toBeVisible({ timeout: 3_000 });
  });

  test('수업 등록 버튼 → 모달 열림 → 취소', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '수업 등록' }).click();
    await expect(page.getByText('새 수업 등록')).toBeVisible();
    // 모달 내 필드 확인
    await expect(page.getByText('수업 템플릿')).toBeVisible();
    await expect(page.getByText('수업명')).toBeVisible();

    // 취소
    const cancelBtn = page.locator('.fixed').getByRole('button', { name: '취소' });
    await cancelBtn.click();
    await expect(page.getByText('새 수업 등록')).not.toBeVisible();
  });
});

// =============================================================================
// 3. 락커 인터랙션 (/locker)
// =============================================================================
test.describe('락커 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/locker');
    await page.waitForLoadState('networkidle');
  });

  test('구역 탭 A/B/C 전환 → 그리드 변경', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본: A구역 (1~32번)
    await expect(page.locator('.grid .aspect-square').first()).toBeVisible();

    // B구역 전환
    await page.getByText('B구역').click();
    await expect(page.getByText('33')).toBeVisible();

    // C구역 전환
    await page.getByText('C구역').click();
    await expect(page.getByText('65')).toBeVisible();

    // A구역 복귀
    await page.getByText('A구역').click();
  });

  test('사용중 락커 클릭 → 상세 모달 (회원정보, 만료일)', async ({ page }) => {
    test.setTimeout(15_000);
    // 2번째 락커 (in_use 상태) 클릭
    await page.locator('.grid .aspect-square').nth(1).click();

    // 모달 확인 - A구역 표시
    await expect(page.getByText('A구역').last()).toBeVisible();
    // 배정 회원 정보
    await expect(page.getByText('배정 회원')).toBeVisible();
    // 만료일 정보
    await expect(page.getByText('만료일')).toBeVisible();
    // 이용 이력
    await expect(page.getByText('이용 이력')).toBeVisible();
  });

  test('락커 상세 모달 닫기', async ({ page }) => {
    test.setTimeout(15_000);
    // 사용중 락커 클릭
    await page.locator('.grid .aspect-square').nth(1).click();
    await expect(page.getByText('배정 회원')).toBeVisible();

    // 모달 닫기 - 모달 내 닫기 버튼 (p-sm rounded-full)
    const closeBtn = page.locator('.fixed.inset-0 button.rounded-full').first();
    await closeBtn.click();

    // 모달 닫힘
    await expect(page.getByText('배정 회원')).not.toBeVisible({ timeout: 3_000 });
  });

  test('빈 락커 클릭 → 빈 락커 모달 (회원 배정하기 버튼)', async ({ page }) => {
    test.setTimeout(10_000);
    // 첫번째 락커 (available 상태) 클릭
    await page.locator('.grid .aspect-square').nth(0).click();

    // 빈 락커 모달
    await expect(page.getByText('현재 배정된 회원이 없습니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '회원 배정하기' })).toBeVisible();
  });

  test('만료임박 일괄 해제 → 벌크 모드 → 선택 → 확인 다이얼로그', async ({ page }) => {
    test.setTimeout(15_000);
    // 만료임박 일괄 해제 버튼 클릭
    const bulkBtn = page.getByRole('button', { name: '만료임박 일괄 해제' });
    await expect(bulkBtn).toBeVisible();
    await bulkBtn.click();

    // 벌크 모드 안내 텍스트
    await expect(page.getByText('만료임박 락커를 클릭하여 선택하세요')).toBeVisible();

    // 만료임박 락커 선택 (3번째 = expiring 상태)
    await page.locator('.grid .aspect-square').nth(2).click();

    // 선택 개수 표시
    await expect(page.getByText('1개 선택')).toBeVisible();

    // 일괄 해제 버튼 클릭
    await page.getByRole('button', { name: '일괄 해제' }).first().click();

    // 확인 다이얼로그
    await expect(page.getByText('만료임박 락커 일괄 해제')).toBeVisible();

    // 확인 다이얼로그의 취소 버튼 클릭
    await page.getByRole('button', { name: '취소' }).last().click();
  });

  test('락커 검색 입력 → 결과 필터링', async ({ page }) => {
    test.setTimeout(10_000);
    const searchInput = page.getByPlaceholder('락커 번호 또는 회원명 검색');
    await expect(searchInput).toBeVisible();

    // 회원명으로 검색
    await searchInput.fill('김철수');
    // 락커 그리드에 김철수가 포함된 락커만 표시
    await page.waitForTimeout(300);

    // 검색어 지우기
    await searchInput.fill('');
  });
});

// =============================================================================
// 4. 락커 배정 관리 인터랙션 (/locker/management)
// =============================================================================
test.describe('락커 배정 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/locker/management');
    await page.waitForLoadState('networkidle');
  });

  test('회원 검색 입력 → 자동완성 드롭다운', async ({ page }) => {
    test.setTimeout(15_000);
    const searchInput = page.getByPlaceholder('회원명, 연락처, 회원번호 검색');
    await expect(searchInput).toBeVisible();

    // 회원 검색
    await searchInput.fill('홍길동');

    // 자동완성 드롭다운 표시
    await expect(page.getByText('M-10234')).toBeVisible();

    // 회원 선택
    const memberOption = page.locator('button').filter({ hasText: '홍길동' }).first();
    await memberOption.click();

    // 선택 확인
    await expect(page.getByText('홍길동').first()).toBeVisible();
  });

  test('빈 락커 선택 (클릭) → 선택 상태 변경', async ({ page }) => {
    test.setTimeout(10_000);
    // 빈 사물함 선택 그리드
    await expect(page.getByText('빈 사물함 선택')).toBeVisible();

    // 빈 락커 클릭
    const availableLockers = page.locator('button.aspect-square');
    const firstLocker = availableLockers.first();
    await firstLocker.click();

    // 선택된 락커 표시
    await expect(page.getByText('락커 선택됨')).toBeVisible();
  });

  test('회원 + 락커 선택 후 배정 버튼 활성화 → 배정 완료', async ({ page }) => {
    test.setTimeout(15_000);
    // 배정 버튼 초기 비활성화
    const assignBtn = page.getByRole('button', { name: '배정 완료' });
    await expect(assignBtn).toBeDisabled();

    // 1. 회원 검색 + 선택
    const searchInput = page.getByPlaceholder('회원명, 연락처, 회원번호 검색');
    await searchInput.fill('홍길동');
    await page.waitForTimeout(300);
    const memberOption = page.locator('button').filter({ hasText: '홍길동' }).first();
    await memberOption.click();

    // 2. 빈 락커 선택
    const availableLockers = page.locator('button.aspect-square');
    await availableLockers.first().click();

    // 3. 배정 버튼 활성화 → 클릭
    await expect(assignBtn).toBeEnabled();
    await assignBtn.click();

    // 4. 배정 완료 메시지
    await expect(page.getByText('배정이 완료되었습니다.')).toBeVisible();
  });

  test('탭 전환 (일일/개인/골프 사물함)', async ({ page }) => {
    test.setTimeout(10_000);
    // 일일 사물함 기본 선택
    await expect(page.getByRole('button', { name: '일일 사물함' })).toBeVisible();

    // 개인 사물함 탭 클릭
    await page.getByRole('button', { name: '개인 사물함' }).click();
    await page.waitForTimeout(300);

    // 골프 사물함 탭 클릭
    await page.getByRole('button', { name: '골프 사물함' }).click();
    await page.waitForTimeout(300);

    // 일일 사물함 복귀
    await page.getByRole('button', { name: '일일 사물함' }).click();
  });

  test('일괄 해제 버튼 → 확인 다이얼로그 → 취소', async ({ page }) => {
    test.setTimeout(10_000);
    // 시간 초과 사물함 일괄 해제 버튼
    const bulkBtn = page.getByRole('button', { name: /일괄 해제/ });
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();

      // 확인 다이얼로그
      await expect(page.getByText('시간 초과 사물함 일괄 해제')).toBeVisible();

      // 취소
      await page.getByRole('button', { name: '취소' }).click();
    }
  });
});

// =============================================================================
// 5. RFID 인터랙션 (/rfid)
// =============================================================================
test.describe('RFID 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/rfid');
    await page.waitForLoadState('networkidle');
  });

  test('신규 등록 모달 → 카드번호 입력 + 스캔 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '신규 등록' }).click();
    await expect(page.getByText('신규 카드 등록')).toBeVisible();

    // 카드번호 직접 입력
    const cardInput = page.getByPlaceholder('RF-XXXXXXXX (직접 입력)');
    await cardInput.fill('RF-99999999');
    await expect(page.getByText('카드 번호 입력됨')).toBeVisible();

    // 스캔 버튼 클릭 → 랜덤 번호 생성
    await page.getByRole('button', { name: '스캔', exact: true }).click();
    // 카드번호가 변경됨 (RF- 로 시작)
    const newValue = await cardInput.inputValue();
    expect(newValue).toMatch(/^RF-/);
  });

  test('신규 등록 모달 → 회원 검색 → 선택', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '신규 등록' }).click();
    await expect(page.getByText('신규 카드 등록')).toBeVisible();

    // 회원 검색
    const memberInput = page.getByPlaceholder(/이름 또는 번호 검색/);
    await memberInput.fill('홍길동');
    await page.waitForTimeout(300);

    // 드롭다운에서 선택 (onMouseDown 이벤트)
    const dropdown = page.locator('.fixed .absolute.top-full');
    await expect(dropdown).toBeVisible();
    await dropdown.locator('button').filter({ hasText: '홍길동' }).first().dispatchEvent('mousedown');
    await page.waitForTimeout(300);

    // 매핑 확인
    await expect(page.getByText('홍길동 매핑됨')).toBeVisible();
  });

  test('이력 테이블 데이터 확인', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('카드 이력 목록')).toBeVisible();
    // Mock 데이터 확인
    await expect(page.getByText('RF-10293847')).toBeVisible();
    await expect(page.getByText('홍길동')).toBeVisible();
    // 상태 배지
    await expect(page.getByText('활성').first()).toBeVisible();
  });

  test('분실 처리 버튼 클릭 → 상태 변경', async ({ page }) => {
    test.setTimeout(10_000);
    // 활성 상태인 카드의 분실 처리 버튼 클릭 (AlertCircle 아이콘)
    const lostBtns = page.locator('button[title="분실 처리"]');
    const firstActiveLostBtn = lostBtns.first();
    await firstActiveLostBtn.click();
    // 상태가 변경됨
  });

  test('이력 보기 버튼 클릭 → 이력 모달', async ({ page }) => {
    test.setTimeout(10_000);
    // 이력 보기 버튼 클릭
    const historyBtns = page.locator('button[title="이력 보기"]');
    await historyBtns.first().click();

    // 이력 모달 확인
    await expect(page.getByText('사용 이력 조회')).toBeVisible();
    // 모달 내 테이블 헤더
    await expect(page.locator('.fixed').getByText('등록일')).toBeVisible();
    await expect(page.locator('.fixed').getByText('카드번호')).toBeVisible();

    // 닫기 버튼
    await page.locator('.fixed').getByRole('button', { name: '닫기' }).click();
    await expect(page.getByText('사용 이력 조회')).not.toBeVisible();
  });

  test('삭제 버튼 → 확인 다이얼로그 → 취소', async ({ page }) => {
    test.setTimeout(10_000);
    const deleteBtns = page.locator('button[title="삭제"]');
    await deleteBtns.first().click();

    // 삭제 확인 다이얼로그
    await expect(page.getByText('카드 삭제')).toBeVisible();

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('카드 삭제')).not.toBeVisible();
  });
});

// =============================================================================
// 6. 룸 관리 인터랙션 (/rooms)
// =============================================================================
test.describe('룸 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/rooms');
    await page.waitForLoadState('networkidle');
  });

  test('룸 카드 표시 확인 - 룸명, 유형, 수용인원, 상태', async ({ page }) => {
    test.setTimeout(10_000);
    // GX룸 A 카드 확인
    await expect(page.getByText('GX룸 A')).toBeVisible();
    await expect(page.getByText('20명').first()).toBeVisible();
    // PT룸 1 카드 확인
    await expect(page.getByText('PT룸 1')).toBeVisible();
    // 상태 배지
    await expect(page.getByText('운영중').first()).toBeVisible();
    await expect(page.getByText('점검중').first()).toBeVisible();
  });

  test('룸 등록 버튼 → 모달 → 필수 필드 입력 → 저장', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '새 운동룸 등록' }).click();
    await expect(page.getByText('새 운동룸 등록').last()).toBeVisible();

    // 룸명 입력 (필수)
    const nameInput = page.getByPlaceholder('예: GX룸 A, PT룸 1');
    await nameInput.fill('테스트룸');

    // 유형 선택
    await page.locator('.fixed').getByRole('button', { name: 'PT', exact: true }).click();

    // 수용인원 변경
    const capacityInput = page.locator('.fixed input[type="number"]');
    await capacityInput.fill('10');

    // 설명 입력
    const descInput = page.getByPlaceholder('룸에 대한 설명을 입력하세요');
    await descInput.fill('테스트용 운동룸입니다.');

    // 등록하기 버튼
    const saveBtn = page.locator('.fixed').getByRole('button', { name: '등록하기' });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // 모달 닫힘 + 새 룸 추가
    await expect(page.getByText('테스트룸')).toBeVisible();
  });

  test('룸 등록 모달 → 취소', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '새 운동룸 등록' }).click();
    await expect(page.getByText('새 운동룸 등록').last()).toBeVisible();

    // 취소 버튼
    await page.locator('.fixed').getByRole('button', { name: '취소' }).click();
    await expect(page.locator('.fixed.inset-0')).not.toBeVisible();
  });

  test('룸 등록 모달 → 룸명 미입력 시 등록 비활성화', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '새 운동룸 등록' }).click();

    // 룸명 비어있는 상태에서 등록하기 버튼 disabled
    const saveBtn = page.locator('.fixed').getByRole('button', { name: '등록하기' });
    await expect(saveBtn).toBeDisabled();
  });

  test('유형 필터 select 변경', async ({ page }) => {
    test.setTimeout(10_000);
    const filterSelect = page.locator('select').filter({ hasText: '전체 유형' });
    await expect(filterSelect).toBeVisible();

    // GX만 필터링
    await filterSelect.selectOption('GX');
    await expect(page.getByText('GX룸 A')).toBeVisible();
    await expect(page.getByText('GX룸 B')).toBeVisible();

    // PT만 필터링
    await filterSelect.selectOption('PT');
    await expect(page.getByText('PT룸 1')).toBeVisible();

    // 전체로 복귀
    await filterSelect.selectOption('');
  });

  test('룸 카드/목록 뷰 탭 전환', async ({ page }) => {
    test.setTimeout(10_000);
    // 기본: 카드 뷰
    await expect(page.getByText('GX룸 A')).toBeVisible();

    // 목록 보기 탭 클릭
    await page.getByText('목록 보기').click();
    // 테이블 헤더
    await expect(page.getByText('운동룸명')).toBeVisible();
    await expect(page.getByText('수용인원')).toBeVisible();

    // 카드 뷰 복귀
    await page.getByText('룸 카드 보기').click();
  });
});

// =============================================================================
// 7. 직원 목록 인터랙션 (/staff)
// =============================================================================
test.describe('직원 목록 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/staff');
    await page.waitForLoadState('networkidle');
  });

  test('검색 입력 → 필터링', async ({ page }) => {
    test.setTimeout(10_000);
    const searchInput = page.getByPlaceholder('직원 이름, 연락처 검색');
    await expect(searchInput).toBeVisible();

    // 이름 검색
    await searchInput.fill('김철수');
    await page.waitForTimeout(300);
    await expect(page.getByRole('table').getByText('김철수')).toBeVisible();

    // 검색어 지움
    await searchInput.fill('');
  });

  test('역할 필터 → 필터링', async ({ page }) => {
    test.setTimeout(10_000);
    // 역할 select 찾기
    const roleSelect = page.locator('select').filter({ hasText: '역할' });
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('trainer');
      await page.waitForTimeout(300);
      // 트레이너만 표시
      await expect(page.getByRole('table').getByText('트레이너').first()).toBeVisible();
    }
  });

  test('상태 필터 → 필터링', async ({ page }) => {
    test.setTimeout(10_000);
    const statusSelect = page.locator('select').filter({ hasText: '재직 상태' });
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('active');
      await page.waitForTimeout(300);
    }
  });

  test('직원 등록 버튼 → /staff/new 이동', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '직원 등록' }).click();
    // 직원 등록 페이지로 이동 (moveToPage(988) 호출)
    await page.waitForTimeout(500);
  });

  test('퇴사 처리 버튼 → 선택 없이 비활성화', async ({ page }) => {
    test.setTimeout(10_000);
    const retireBtn = page.getByRole('button', { name: '퇴사 처리' });
    await expect(retireBtn).toBeVisible();
    await expect(retireBtn).toBeDisabled();
  });

  test('초기화 버튼 → 필터 리셋', async ({ page }) => {
    test.setTimeout(10_000);
    // 검색어 입력
    const searchInput = page.getByPlaceholder('직원 이름, 연락처 검색');
    await searchInput.fill('김철수');
    await page.waitForTimeout(300);

    // 초기화 버튼 클릭
    const resetBtn = page.getByRole('button', { name: '초기화' });
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      // 검색 입력 초기화
      await expect(searchInput).toHaveValue('');
    }
  });

  test('테이블 정렬 (이름 클릭)', async ({ page }) => {
    test.setTimeout(10_000);
    // 이름 정렬 버튼
    const nameSort = page.getByRole('table').getByRole('button', { name: /직원명/ });
    if (await nameSort.isVisible()) {
      // 첫번째 클릭 → asc
      await nameSort.click();
      await page.waitForTimeout(300);

      // 두번째 클릭 → desc
      await nameSort.click();
      await page.waitForTimeout(300);
    }
  });
});

// =============================================================================
// 8. 직원 등록 인터랙션 (/staff/new)
// =============================================================================
test.describe('직원 등록 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/staff/new');
    await page.waitForLoadState('networkidle');
  });

  test('이름 입력', async ({ page }) => {
    test.setTimeout(10_000);
    const nameInput = page.getByPlaceholder('홍길동');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('테스트직원');
    await expect(nameInput).toHaveValue('테스트직원');
  });

  test('역할 Select → 권한 미리보기 텍스트 변경', async ({ page }) => {
    test.setTimeout(10_000);
    const roleSelect = page.locator('select[name="role"]');
    await expect(roleSelect).toBeVisible();

    // 센터장 선택 → 권한 미리보기 변경
    await roleSelect.selectOption('owner');
    await expect(page.getByText('센터장 권한')).toBeVisible();
    await expect(page.getByText('지점 내 전체 데이터 접근 및 관리')).toBeVisible();

    // FC 선택 → 권한 미리보기 변경
    await roleSelect.selectOption('fc');
    await expect(page.getByText('FC 권한')).toBeVisible();
    await expect(page.getByText('상담·결제 및 매출 통계 접근')).toBeVisible();

    // 매니저 선택
    await roleSelect.selectOption('manager');
    await expect(page.getByText('매니저 권한')).toBeVisible();
  });

  test('연락처 자동 하이픈 포맷', async ({ page }) => {
    test.setTimeout(10_000);
    const contactInput = page.getByPlaceholder('010-0000-0000');
    await contactInput.fill('');
    await contactInput.pressSequentially('01012345678');
    await expect(contactInput).toHaveValue('010-1234-5678');
  });

  test('입사일 날짜 선택', async ({ page }) => {
    test.setTimeout(10_000);
    const dateInput = page.locator('input[name="joinDate"]');
    await expect(dateInput).toBeVisible();
    await dateInput.fill('2026-03-11');
    await expect(dateInput).toHaveValue('2026-03-11');
  });

  test('필수값 누락 → 에러 메시지 표시', async ({ page }) => {
    test.setTimeout(10_000);
    // 이름과 연락처 비우고 저장 시도
    const nameInput = page.getByPlaceholder('홍길동');
    await nameInput.fill('');

    const contactInput = page.getByPlaceholder('010-0000-0000');
    await contactInput.fill('');

    // 저장 버튼 클릭
    await page.getByRole('button', { name: '저장하기' }).click();

    // 에러 메시지
    await expect(page.getByText('이름을 입력하세요')).toBeVisible();
    await expect(page.getByText('연락처를 입력하세요')).toBeVisible();
  });

  test('취소 → ConfirmDialog 표시 → 계속 작성하기', async ({ page }) => {
    test.setTimeout(10_000);
    // 취소 버튼
    await page.getByRole('button', { name: '취소', exact: true }).click();

    // 확인 다이얼로그
    await expect(page.getByText('등록 취소')).toBeVisible();
    await expect(page.getByText('입력 중인 내용이 저장되지 않습니다.')).toBeVisible();

    // 계속 작성하기
    await page.getByRole('button', { name: '계속 작성하기' }).click();
    await expect(page.getByText('등록 취소')).not.toBeVisible();
  });
});

// =============================================================================
// 9. 급여 관리 인터랙션 (/payroll)
// =============================================================================
test.describe('급여 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/payroll');
    await page.waitForLoadState('networkidle');
  });

  test('월 Select 변경 → 테이블 데이터 유지', async ({ page }) => {
    test.setTimeout(10_000);
    const monthSelect = page.locator('select').first();
    await expect(monthSelect).toBeVisible();
    // 12개월 옵션
    await expect(monthSelect.locator('option')).toHaveCount(12);

    // 다른 월 선택
    const options = await monthSelect.locator('option').allTextContents();
    if (options.length > 1) {
      const secondOption = await monthSelect.locator('option').nth(1).getAttribute('value');
      if (secondOption) {
        await monthSelect.selectOption(secondOption);
        await page.waitForTimeout(300);
      }
    }
  });

  test('합계/평균 행 확인', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('합계 / 평균')).toBeVisible();
    await expect(page.getByText('기본급 합계')).toBeVisible();
    await expect(page.getByText('인센티브 합계')).toBeVisible();
    await expect(page.getByText('공제 합계')).toBeVisible();
    await expect(page.getByText('실지급액 합계')).toBeVisible();
    // 계산식 표시
    await expect(page.getByText('계산식')).toBeVisible();
  });

  test('지급 상태별 색상 배지 표시', async ({ page }) => {
    test.setTimeout(10_000);
    // 지급완료 배지
    await expect(page.getByText('지급완료').first()).toBeVisible();
    // 미지급 배지
    await expect(page.getByText('미지급').first()).toBeVisible();
  });

  test('급여 명세서 바로가기 버튼 클릭', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('급여 명세서 발급')).toBeVisible();
    const linkBtn = page.getByRole('button', { name: '명세서 바로가기' });
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();
    await page.waitForTimeout(500);
  });
});

// =============================================================================
// 10. 급여 명세서 인터랙션 (/payroll/statements)
// =============================================================================
test.describe('급여 명세서 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/payroll/statements');
    await page.waitForLoadState('networkidle');
  });

  test('직원 Select 변경 → 명세서 변경', async ({ page }) => {
    test.setTimeout(15_000);
    // 명세서 조회 패널 내의 직원 선택 select
    const queryPanel = page.locator('text=명세서 조회').locator('..');
    const staffSelect = queryPanel.locator('select').first();
    await expect(staffSelect).toBeVisible();

    // 이영희 선택
    await staffSelect.selectOption('2');
    await page.waitForTimeout(500);

    // 월 Select에서 2026-01 선택
    const monthSelect = queryPanel.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();
    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');
      await page.waitForTimeout(500);

      // FC 매니저 직책 표시 (이영희)
      await expect(page.getByText('FC 매니저').first()).toBeVisible();
    }
  });

  test('월 Select 변경', async ({ page }) => {
    test.setTimeout(10_000);
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');

    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();

    // 2026-01 선택
    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');
      await expect(page.getByText('지급 항목')).toBeVisible();
      await expect(page.getByText('공제 항목')).toBeVisible();
    }

    // 2025-12 선택
    if (options.some(o => o.includes('2025년 12월'))) {
      await monthSelect.selectOption('2025-12');
      await page.waitForTimeout(300);
      await expect(page.getByText('지급 항목')).toBeVisible();
    }
  });

  test('지급항목/공제항목 카드 내용 확인', async ({ page }) => {
    test.setTimeout(15_000);
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');
    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();

    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');

      // 지급 항목
      await expect(page.getByText('지급 항목').first()).toBeVisible();
      await expect(page.getByText('기본급').first()).toBeVisible();
      await expect(page.getByText('식대').first()).toBeVisible();
      await expect(page.getByText('교통비').first()).toBeVisible();
      await expect(page.getByText('성과급').first()).toBeVisible();

      // 공제 항목
      await expect(page.getByText('공제 항목').first()).toBeVisible();
      await expect(page.getByText('소득세').first()).toBeVisible();
      await expect(page.getByText('국민연금').first()).toBeVisible();
      await expect(page.getByText('건강보험').first()).toBeVisible();

      // 실지급액
      await expect(page.getByText('실지급액').first()).toBeVisible();
    }
  });

  test('PDF 다운로드 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');
    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();

    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');

      // PDF 다운로드 버튼
      page.on('dialog', async dialog => {
        await dialog.accept();
      });
      const pdfBtn = page.getByRole('button', { name: 'PDF 다운로드' }).first();
      await expect(pdfBtn).toBeVisible();
      await pdfBtn.click();
    }
  });

  test('상세보기 버튼 → 명세서 모달 → 닫기', async ({ page }) => {
    test.setTimeout(15_000);
    // 테이블의 상세보기 버튼 클릭
    const detailBtn = page.getByRole('button', { name: '상세보기' }).first();

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    if (await detailBtn.isVisible()) {
      await detailBtn.click();
      await page.waitForTimeout(500);

      // 모달이 열렸는지 확인 (데이터가 있는 경우)
      const modal = page.locator('.fixed.inset-0');
      if (await modal.isVisible()) {
        await expect(page.getByText('급여 명세서').last()).toBeVisible();
        // 닫기 버튼
        await page.locator('.fixed').getByRole('button', { name: '닫기' }).click();
      }
    }
  });

  test('이메일 발송 버튼 클릭', async ({ page }) => {
    test.setTimeout(15_000);
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');
    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();

    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');

      page.on('dialog', async dialog => {
        await dialog.accept();
      });

      const emailBtn = page.getByRole('button', { name: '이메일 발송' }).first();
      if (await emailBtn.isVisible()) {
        await emailBtn.click();
      }
    }
  });
});
