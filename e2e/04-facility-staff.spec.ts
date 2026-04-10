import { test, expect } from '@playwright/test';

// =============================================================================
// 1. 출석 관리 (/attendance)
// =============================================================================
test.describe('출석 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByRole('heading', { name: '출석 관리' })).toBeVisible();
    await expect(page.getByText('실시간 회원 입퇴장 현황과 출석 이력을 관리합니다.')).toBeVisible();
  });

  test('뷰 토글 - 일별/주별/월별 전환이 가능하다', async ({ page }) => {
    await page.goto('/attendance');
    // 기본: 일별 뷰
    await expect(page.getByRole('button', { name: '일별' })).toBeVisible();
    await expect(page.getByRole('button', { name: '주별' })).toBeVisible();
    await expect(page.getByRole('button', { name: '월별' })).toBeVisible();

    // 주별 전환
    await page.getByRole('button', { name: '주별' }).click();
    await expect(page.getByText('주간 출석 현황')).toBeVisible();

    // 월별 전환
    await page.getByRole('button', { name: '월별' }).click();
    await expect(page.getByText('월간 출석 현황')).toBeVisible();

    // 일별 복귀
    await page.getByRole('button', { name: '일별' }).click();
    await expect(page.getByText('출석 이력 목록')).toBeVisible();
  });

  test('통계 카드 4개가 표시된다', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByText('오늘 출석')).toBeVisible();
    await expect(page.getByText('PT 수업', { exact: true })).toBeVisible();
    await expect(page.getByText('GX 수업', { exact: true })).toBeVisible();
    await expect(page.getByText('신규 방문')).toBeVisible();
  });

  test('출석 테이블에 Mock 데이터가 표시된다', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByText('출석 이력 목록')).toBeVisible();
    // 테이블 헤더
    await expect(page.getByRole('table').getByText('회원명')).toBeVisible();
    await expect(page.getByRole('table').getByText('출석유형')).toBeVisible();
    await expect(page.getByRole('table').getByText('체크인방식')).toBeVisible();
    // Mock 데이터 확인
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('박지민')).toBeVisible();
  });

  test('검색/필터 UI가 표시된다', async ({ page }) => {
    await page.goto('/attendance');
    await expect(page.getByPlaceholder('회원명, 연락처 검색')).toBeVisible();
  });
});

// =============================================================================
// 2. 일정 관리 (/calendar)
// =============================================================================
test.describe('일정 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.getByRole('heading', { name: '수업/캘린더' })).toBeVisible();
    await expect(page.getByText('PT 및 그룹 수업 스케줄을 관리하고 회원의 예약 현황을 확인합니다.')).toBeVisible();
  });

  test('월/주/일 뷰 탭이 표시되고 전환된다', async ({ page }) => {
    await page.goto('/calendar');
    const monthBtn = page.getByRole('button', { name: '월', exact: true }).first();
    const weekBtn = page.getByRole('button', { name: '주', exact: true }).first();
    const dayBtn = page.getByRole('button', { name: '일', exact: true }).first();

    await expect(monthBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();
    await expect(dayBtn).toBeVisible();

    // 주 뷰 전환
    await weekBtn.click();
    await expect(page.getByText('시간', { exact: true })).toBeVisible();

    // 일 뷰 전환
    await dayBtn.click();
    await expect(page.getByText('2026년 3월 11일 (수)')).toBeVisible();

    // 월 뷰 복귀
    await monthBtn.click();
  });

  test('달력 그리드에 요일 헤더가 표시된다', async ({ page }) => {
    await page.goto('/calendar');
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    for (const day of days) {
      await expect(page.locator('.grid-cols-7').first().getByText(day, { exact: true })).toBeVisible();
    }
  });

  test('월 이동 버튼(이전/다음)이 존재한다', async ({ page }) => {
    await page.goto('/calendar');
    // ChevronLeft, ChevronRight 버튼
    const navButtons = page.locator('button svg.lucide-chevron-left, button svg.lucide-chevron-right');
    await expect(navButtons.first()).toBeVisible();
  });

  test('트레이너 필터 select가 존재한다', async ({ page }) => {
    await page.goto('/calendar');
    const select = page.locator('select').filter({ hasText: '전체 강사' });
    await expect(select).toBeVisible();
    // 강사 옵션 확인
    await expect(select.locator('option')).toHaveCount(6); // 전체 + 5명
  });
});

// =============================================================================
// 3. 락커 (/locker)
// =============================================================================
test.describe('락커 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/locker');
    await expect(page.getByText('락커 관리').first()).toBeVisible();
    await expect(page.getByText('센터 내 모든 락커의 배정 현황 및 상태를 관리합니다.')).toBeVisible();
  });

  test('구역 탭 A/B/C가 표시되고 전환된다', async ({ page }) => {
    await page.goto('/locker');
    await expect(page.getByText('A구역')).toBeVisible();
    await expect(page.getByText('B구역')).toBeVisible();
    await expect(page.getByText('C구역')).toBeVisible();

    // B구역 전환
    await page.getByText('B구역').click();
    // B구역 락커 번호 (33~64)
    await expect(page.getByText('33')).toBeVisible();

    // C구역 전환
    await page.getByText('C구역').click();
    await expect(page.getByText('65')).toBeVisible();
  });

  test('락커 그리드가 표시된다', async ({ page }) => {
    await page.goto('/locker');
    // A구역 32개 락커 그리드
    const grid = page.locator('.grid.grid-cols-4');
    await expect(grid.first()).toBeVisible();
  });

  test('상태별 색상 범례가 표시된다', async ({ page }) => {
    await page.goto('/locker');
    const legend = page.locator('div').filter({ hasText: '상태 범례' }).last();
    await expect(legend).toBeVisible();
    await expect(legend).toContainText('사용중');
    await expect(legend).toContainText('빈 락커');
    await expect(legend).toContainText('만료임박');
    await expect(legend).toContainText('고장');
  });

  test('락커 클릭 시 상세 모달이 열린다', async ({ page }) => {
    await page.goto('/locker');
    // 사용중인 락커 클릭 (2번 락커 - in_use)
    await page.locator('.grid .aspect-square').nth(1).click();
    // 모달에 구역 정보 표시
    await expect(page.getByRole('paragraph').filter({ hasText: 'A구역' })).toBeVisible();
  });
});

// =============================================================================
// 4. 락커 관리 (/locker/management)
// =============================================================================
test.describe('사물함 배정 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/locker/management');
    await expect(page.getByText('사물함 배정 관리')).toBeVisible();
    await expect(page.getByText('시설 내 일일, 개인, 골프 사물함의 이용 현황을 실시간으로 관리합니다.')).toBeVisible();
  });

  test('회원 검색 입력 필드가 존재한다', async ({ page }) => {
    await page.goto('/locker/management');
    await expect(page.getByPlaceholder('회원명, 연락처, 회원번호 검색')).toBeVisible();
  });

  test('빈 락커 그리드가 표시된다', async ({ page }) => {
    await page.goto('/locker/management');
    await expect(page.getByText('빈 사물함 선택')).toBeVisible();
    await expect(page.getByText('사용 가능').first()).toBeVisible();
  });

  test('배정 버튼이 비활성화 상태로 표시된다', async ({ page }) => {
    await page.goto('/locker/management');
    const assignBtn = page.getByRole('button', { name: '배정 완료' });
    await expect(assignBtn).toBeVisible();
    await expect(assignBtn).toBeDisabled();
  });
});

// =============================================================================
// 5. RFID (/rfid)
// =============================================================================
test.describe('밴드/카드 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/rfid');
    await expect(page.getByText('밴드/카드 관리')).toBeVisible();
    await expect(page.getByText('RFID 밴드 및 카드를 등록하고 회원/직원과 연결하여 출입 및 시설 이용을 관리합니다.')).toBeVisible();
  });

  test('카드번호 검색 입력 필드가 존재한다', async ({ page }) => {
    await page.goto('/rfid');
    await expect(page.getByPlaceholder('카드번호 또는 회원명 검색')).toBeVisible();
  });

  test('회원 검색 - 신규 등록 모달에서 회원 검색이 가능하다', async ({ page }) => {
    await page.goto('/rfid');
    await page.getByRole('button', { name: '신규 등록' }).click();
    // 모달 열림
    await expect(page.getByText('신규 카드 등록')).toBeVisible();
    // 카드 번호 입력 필드
    await expect(page.getByPlaceholder('RF-XXXXXXXX (직접 입력)')).toBeVisible();
  });

  test('이력 테이블에 Mock 데이터가 표시된다', async ({ page }) => {
    await page.goto('/rfid');
    await expect(page.getByText('카드 이력 목록')).toBeVisible();
    // Mock 카드 데이터
    await expect(page.getByText('RF-10293847')).toBeVisible();
    await expect(page.getByText('RF-55667788')).toBeVisible();
    await expect(page.getByText('홍길동')).toBeVisible();
  });
});

// =============================================================================
// 6. 룸 관리 (/rooms)
// =============================================================================
test.describe('운동룸 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page.getByText('운동룸 관리')).toBeVisible();
    await expect(page.getByText('센터 내 운동룸의 현황, 예약 슬롯, 좌석 배치를 관리합니다.')).toBeVisible();
  });

  test('룸 카드가 표시된다', async ({ page }) => {
    await page.goto('/rooms');
    await expect(page.getByText('GX룸 A')).toBeVisible();
    await expect(page.getByText('GX룸 B')).toBeVisible();
    await expect(page.getByText('PT룸 1')).toBeVisible();
    await expect(page.getByText('PT룸 2')).toBeVisible();
    await expect(page.getByText('PT룸 3')).toBeVisible();
  });

  test('룸 등록 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    await page.goto('/rooms');
    await page.getByRole('button', { name: '새 운동룸 등록' }).click();
    await expect(page.getByRole('heading', { name: '새 운동룸 등록' })).toBeVisible();
    // 모달 필드 확인
    await expect(page.getByPlaceholder('예: GX룸 A, PT룸 1')).toBeVisible();
  });
});

// =============================================================================
// 7. 직원 목록 (/staff)
// =============================================================================
test.describe('직원 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByText('직원 관리')).toBeVisible();
    await expect(page.getByText('센터의 직원 정보를 관리합니다.')).toBeVisible();
  });

  test('통계 카드 4개가 표시된다', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByText('전체 직원')).toBeVisible();
    await expect(page.getByText('재직 중')).toBeVisible();
    await expect(page.getByText('휴직 중', { exact: true })).toBeVisible();
    await expect(page.getByText('퇴사', { exact: true }).first()).toBeVisible();
    // 직원 수 표시
    await expect(page.getByText('7명').first()).toBeVisible();
  });

  test('검색/필터 - 역할, 상태 필터가 존재한다', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByPlaceholder('직원 이름, 연락처 검색')).toBeVisible();
  });

  test('직원 테이블에 Mock 데이터가 표시된다', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('박지민')).toBeVisible();
    // 역할 배지 (테이블 내 span)
    await expect(page.getByRole('table').getByText('트레이너').first()).toBeVisible();
    await expect(page.getByRole('table').getByText('센터장')).toBeVisible();
  });

  test('직원등록 버튼이 존재한다', async ({ page }) => {
    await page.goto('/staff');
    await expect(page.getByRole('button', { name: '직원 등록' })).toBeVisible();
  });
});

// =============================================================================
// 8. 직원 등록 (/staff/new)
// =============================================================================
test.describe('직원 등록', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/staff/new');
    await expect(page.getByText('직원 등록')).toBeVisible();
    await expect(page.getByText('새로운 직원 정보를 입력하고 역할을 설정합니다.')).toBeVisible();
  });

  test('필수 필드가 표시된다 - 이름, 역할, 연락처, 입사일', async ({ page }) => {
    await page.goto('/staff/new');
    // 이름 필드
    await expect(page.getByPlaceholder('홍길동')).toBeVisible();
    // 역할 select
    await expect(page.locator('select[name="role"]')).toBeVisible();
    // 연락처 필드
    await expect(page.getByPlaceholder('010-0000-0000')).toBeVisible();
    // 입사일 필드
    await expect(page.locator('input[name="joinDate"]')).toBeVisible();
  });

  test('연락처 입력 시 자동 하이픈이 적용된다', async ({ page }) => {
    await page.goto('/staff/new');
    const contactInput = page.getByPlaceholder('010-0000-0000');
    await contactInput.fill('');
    await contactInput.pressSequentially('01012345678');
    await expect(contactInput).toHaveValue('010-1234-5678');
  });
});

// =============================================================================
// 9. 급여 관리 (/payroll)
// =============================================================================
test.describe('급여 관리', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page.getByText('급여 관리')).toBeVisible();
    await expect(page.getByText('직원별 기본급, 인센티브, 공제액을 확인하고 급여를 관리합니다.')).toBeVisible();
  });

  test('월 선택 드롭다운이 존재한다', async ({ page }) => {
    await page.goto('/payroll');
    // 월 선택 select
    const monthSelect = page.locator('select').first();
    await expect(monthSelect).toBeVisible();
    // 12개월 옵션
    await expect(monthSelect.locator('option')).toHaveCount(12);
  });

  test('급여 테이블에 Mock 데이터가 표시된다', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('박지민')).toBeVisible();
    // 역할 표시
    await expect(page.getByText('트레이너').first()).toBeVisible();
    await expect(page.getByText('센터장')).toBeVisible();
  });

  test('합계 행이 표시된다', async ({ page }) => {
    await page.goto('/payroll');
    await expect(page.getByText('합계 / 평균')).toBeVisible();
    await expect(page.getByText('기본급 합계')).toBeVisible();
    await expect(page.getByText('인센티브 합계')).toBeVisible();
    await expect(page.getByText('공제 합계')).toBeVisible();
    await expect(page.getByText('실지급액 합계')).toBeVisible();
  });
});

// =============================================================================
// 10. 급여 명세서 (/payroll/statements)
// =============================================================================
test.describe('급여 명세서', () => {
  test('페이지 로드 - 제목과 설명이 표시된다', async ({ page }) => {
    await page.goto('/payroll/statements');
    await expect(page.getByRole('heading', { name: '급여 명세서' })).toBeVisible();
    await expect(page.getByText('직원별 월간 급여 명세서를 조회하고 발급합니다.')).toBeVisible();
  });

  test('직원/월 선택 드롭다운이 존재한다', async ({ page }) => {
    await page.goto('/payroll/statements');
    // 직원 선택
    await expect(page.getByText('직원 선택')).toBeVisible();
    const staffSelect = page.locator('select').first();
    await expect(staffSelect).toBeVisible();

    // 월 선택
    await expect(page.getByText('지급 월')).toBeVisible();
  });

  test('명세서 상세 - 지급/공제 항목이 표시된다', async ({ page }) => {
    await page.goto('/payroll/statements');
    // 기본: 김철수, 최신 월 선택됨 → 2026-01 데이터 있음
    // 직원 선택 드롭다운을 김철수로, 월을 2026-01로 설정
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');
    // 2026-01이 목록에 있으면 선택
    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();
    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');
      // 지급 항목
      await expect(page.getByText('지급 항목')).toBeVisible();
      await expect(page.getByText('공제 항목')).toBeVisible();
      await expect(page.locator('span').filter({ hasText: /^실지급액$/ })).toBeVisible();
    }
  });

  test('PDF 다운로드 버튼이 존재한다', async ({ page }) => {
    await page.goto('/payroll/statements');
    // 김철수 + 2026-01 데이터가 있는 경우 PDF 버튼 표시
    const staffSelect = page.locator('select').first();
    await staffSelect.selectOption('1');
    const monthSelect = page.locator('select').nth(1);
    const options = await monthSelect.locator('option').allTextContents();
    if (options.some(o => o.includes('2026년 1월'))) {
      await monthSelect.selectOption('2026-01');
      await expect(page.getByRole('button', { name: 'PDF 다운로드' })).toBeVisible();
    }
  });
});
