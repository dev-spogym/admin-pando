import { test, expect } from '@playwright/test';

// ============================================================
// 1. 회원 목록 (/members)
// ============================================================

test.describe('회원 목록 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members');
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '회원 목록' })).toBeVisible();
    await expect(page.getByText('센터의 전체 회원 정보를 조회하고 관리합니다.')).toBeVisible();
  });

  test('통계 카드 4개가 표시된다', async ({ page }) => {
    await expect(page.getByText('전체 회원', { exact: true })).toBeVisible();
    await expect(page.getByText('활성 회원', { exact: true })).toBeVisible();
    await expect(page.getByText('임박 회원', { exact: true })).toBeVisible();
    await expect(page.getByText('미등록/만료', { exact: true })).toBeVisible();

    // 통계 값 확인
    await expect(page.getByText('1,284')).toBeVisible();
    await expect(page.getByText('942').first()).toBeVisible();
    await expect(page.getByText('48').first()).toBeVisible();
    await expect(page.getByText('294')).toBeVisible();
  });

  test('메인 탭 6개가 존재한다', async ({ page }) => {
    const mainTabs = ['회원 목록', '회원권 목록', '수강권 목록', '락커 목록', '운동복 목록', '상품별 회원조회'];
    for (const tab of mainTabs) {
      await expect(page.getByRole('button', { name: new RegExp(tab) }).first()).toBeVisible();
    }
  });

  test('상태 탭 7개가 존재한다', async ({ page }) => {
    const statusTabs = ['전체', '활성', '만료', '예정', '임박', '홀딩', '미등록'];
    for (const tab of statusTabs) {
      await expect(page.getByRole('button', { name: new RegExp(`^${tab}`) }).first()).toBeVisible();
    }
  });

  test('상태 탭 클릭 시 필터링이 동작한다', async ({ page }) => {
    // "만료" 탭 클릭
    await page.getByRole('button', { name: /^만료/ }).first().click();
    // 만료 상태의 회원만 표시되어야 함
    await expect(page.getByText('박지성')).toBeVisible();
    // 활성 상태 회원은 보이지 않아야 함
    await expect(page.getByText('김철수')).not.toBeVisible();

    // "활성" 탭 클릭
    await page.getByRole('button', { name: /^활성/ }).first().click();
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('박지성')).not.toBeVisible();

    // "전체" 탭 클릭 시 모든 회원 표시
    await page.getByRole('button', { name: /^전체/ }).first().click();
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('박지성')).toBeVisible();
  });

  test('검색 입력이 동작한다', async ({ page }) => {
    const searchInput = page.getByPlaceholder('회원명, 연락처 검색...');
    await expect(searchInput).toBeVisible();

    // 이름으로 검색
    await searchInput.fill('김철수');
    // 디바운스 대기
    await page.waitForTimeout(400);
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).not.toBeVisible();

    // 검색어 지우기
    await searchInput.clear();
    await page.waitForTimeout(400);
    await expect(page.getByText('이영희')).toBeVisible();
  });

  test('필터 셀렉트 (회원구분, 계약상품, 성별)가 존재한다', async ({ page }) => {
    // select 요소들의 기본 option 텍스트로 확인
    await expect(page.locator('select').filter({ hasText: '회원구분' })).toBeVisible();
    await expect(page.locator('select').filter({ hasText: '계약상품' })).toBeVisible();
    await expect(page.locator('select').filter({ hasText: '성별' })).toBeVisible();
  });

  test('테이블 헤더가 존재한다', async ({ page }) => {
    const headers = ['상태', '회원명', '성별', '나이', '연락처', '보유 이용권', '락커', '최종만료일', '남은 일수', '최근방문일', '담당자', '회사명'];
    const table = page.locator('table');
    for (const header of headers) {
      await expect(table.locator('th', { hasText: header }).first()).toBeVisible();
    }
  });

  test('회원 데이터 행이 존재한다', async ({ page }) => {
    // Mock 데이터의 회원명 확인
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('이영희')).toBeVisible();
    await expect(page.getByText('박지성')).toBeVisible();
    await expect(page.getByText('정수연')).toBeVisible();
    await expect(page.getByText('한상우')).toBeVisible();

    // 연락처 확인
    await expect(page.getByText('010-1234-5678')).toBeVisible();
    await expect(page.getByText('010-9876-5432')).toBeVisible();
  });

  test('체크박스 선택 시 벌크 액션바가 표시된다', async ({ page }) => {
    // 첫 번째 행의 체크박스 클릭
    const firstCheckbox = page.locator('table tbody input[type="checkbox"]').first();
    await firstCheckbox.click();

    // 벌크 액션바 확인
    await expect(page.getByText('1명 선택됨')).toBeVisible();
    await expect(page.getByText('상태 변경')).toBeVisible();
    await expect(page.getByText('전송하기')).toBeVisible();
    await expect(page.getByText('출석 처리')).toBeVisible();
    await expect(page.getByText('관심회원')).toBeVisible();

    // 선택 취소 버튼 클릭
    await page.getByText('선택 취소').click();
    await expect(page.getByText('1명 선택됨')).not.toBeVisible();
  });

  test('회원 추가 버튼이 존재한다', async ({ page }) => {
    await expect(page.getByRole('button', { name: /회원 추가/ })).toBeVisible();
  });
});

// ============================================================
// 2. 회원 상세 (/members/detail)
// ============================================================

test.describe('회원 상세 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members/detail');
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    // 회원 이름 표시 확인
    await expect(page.getByText('김민수')).toBeVisible();
  });

  test('프로필 카드에 이름과 상태 배지가 표시된다', async ({ page }) => {
    await expect(page.getByText('김민수')).toBeVisible();
    // 상태 배지 (정상 이용중)
    await expect(page.getByText('정상 이용중')).toBeVisible();
  });

  test('탭 9개가 존재한다', async ({ page }) => {
    const tabLabels = ['회원정보', '이용권', '출석 이력', '결제 이력', '체성분', '상담·메모', '쿠폰·마일리지', '예약 이력', '분석'];
    for (const label of tabLabels) {
      await expect(page.getByRole('button', { name: new RegExp(label) }).first()).toBeVisible();
    }
  });

  test('이용권 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    await page.getByRole('button', { name: /이용권/ }).first().click();
    // 이용권 관련 컨텐츠 확인
    await expect(page.getByText('신규 이용권 / 상품 구매').or(page.getByText('PT 30회')).first()).toBeVisible();
  });

  test('출석 이력 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    await page.getByRole('button', { name: /출석 이력/ }).first().click();
    // 출석 관련 컨텐츠 확인
    await expect(page.getByRole('heading', { name: /출석 캘린더/ })).toBeVisible();
  });

  test('결제 이력 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    await page.getByText('결제 이력').click();
    // 결제 관련 컨텐츠 확인
    await expect(page.getByText('결제 이력').nth(0)).toBeVisible();
  });

  test('체성분 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    await page.getByText('체성분').click();
    // 체성분 관련 컨텐츠 확인
    await expect(page.getByText(/체성분 변화 추이/).or(page.getByText(/체성분 측정 추가/))).toBeVisible();
  });

  test('상담 메모 탭 클릭 시 컨텐츠가 변경된다', async ({ page }) => {
    await page.getByRole('button', { name: /상담·메모/ }).first().click();
    // 메모 관련 컨텐츠 확인
    await expect(page.getByRole('heading', { name: '새 메모 작성' })).toBeVisible();
  });
});

// ============================================================
// 3. 회원 등록 (/members/new)
// ============================================================

test.describe('회원 등록 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/members/new');
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page.getByText('신규 회원 등록')).toBeVisible();
    await expect(page.getByText('새로운 회원을 시스템에 등록합니다.')).toBeVisible();
  });

  test('필수 필드가 존재한다 (이름, 성별, 연락처)', async ({ page }) => {
    await expect(page.getByPlaceholder('이름을 입력하세요')).toBeVisible();
    await expect(page.getByRole('button', { name: '남성' })).toBeVisible();
    await expect(page.getByRole('button', { name: '여성' })).toBeVisible();
    await expect(page.getByPlaceholder('010-0000-0000')).toBeVisible();
  });

  test('이름 입력 시 한글 검증이 동작한다', async ({ page }) => {
    const nameInput = page.getByPlaceholder('이름을 입력하세요');

    // 영문 입력 후 blur -> 에러 메시지
    await nameInput.fill('abc');
    await nameInput.blur();
    await expect(page.getByText('한글 2~20자로 입력하세요')).toBeVisible();

    // 한글 입력 후 blur -> 에러 메시지 사라짐
    await nameInput.fill('홍길동');
    await nameInput.blur();
    await expect(page.getByText('한글 2~20자로 입력하세요')).not.toBeVisible();
  });

  test('연락처 입력 시 자동 하이픈 포맷이 적용된다', async ({ page }) => {
    const phoneInput = page.getByPlaceholder('010-0000-0000');

    await phoneInput.fill('01012345678');
    // 자동 포맷 확인: 010-1234-5678
    await expect(phoneInput).toHaveValue('010-1234-5678');
  });

  test('메모 500자 제한 글자수 카운터가 표시된다', async ({ page }) => {
    // alert 처리를 먼저 등록
    page.on('dialog', dialog => dialog.accept());

    // Step1 필수값 입력 후 Step2로 이동
    await page.getByPlaceholder('이름을 입력하세요').fill('홍길동');
    await page.getByRole('button', { name: '남성' }).click();
    const phoneInput = page.getByPlaceholder('010-0000-0000');
    await phoneInput.fill('01098765432');
    // 중복확인 버튼 클릭
    await page.getByRole('button', { name: '중복확인' }).click();
    await page.waitForTimeout(500);

    // 다음 단계 버튼 클릭
    await page.getByRole('button', { name: /다음 단계/ }).click();

    // Step2에서 메모 필드 확인
    const notesTextarea = page.getByPlaceholder(/회원의 건강 상태/);
    await expect(notesTextarea).toBeVisible();

    // 글자수 카운터 확인
    await expect(page.getByText('0 / 500')).toBeVisible();

    // 텍스트 입력 시 카운터 변화 (공백 포함)
    await notesTextarea.fill('테스트 메모');
    await expect(page.getByText('6 / 500')).toBeVisible();
  });

  test('필수필드 미입력 시 다음 단계 버튼이 비활성화된다', async ({ page }) => {
    // 아무것도 입력하지 않은 상태
    const nextButton = page.getByRole('button', { name: /다음 단계/ });
    await expect(nextButton).toBeDisabled();
  });

  test('취소 버튼 클릭 시 변경사항이 있으면 확인 다이얼로그가 표시된다', async ({ page }) => {
    // 무언가 입력하여 isDirty 상태 만들기
    await page.getByPlaceholder('이름을 입력하세요').fill('테스트');

    // 취소 버튼 클릭
    await page.getByRole('button', { name: '취소' }).click();

    // 확인 다이얼로그 표시
    await expect(page.getByText('작성 취소')).toBeVisible();
    await expect(page.getByText('저장하지 않고 나가시겠습니까?')).toBeVisible();
    await expect(page.getByRole('button', { name: '나가기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '계속 작성' })).toBeVisible();
  });
});

// ============================================================
// 4. 체성분 (/body-composition)
// ============================================================

test.describe('체성분 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/body-composition');
  });

  test('페이지가 정상적으로 로드된다', async ({ page }) => {
    await expect(page.getByText(/체성분 정보/)).toBeVisible();
  });

  test('핵심 지표 카드가 표시된다 (체중, 골격근량, 체지방률)', async ({ page }) => {
    await expect(page.getByText('현재 체중', { exact: true })).toBeVisible();
    await expect(page.getByText('골격근량', { exact: true })).toBeVisible();
    await expect(page.getByText('체지방률', { exact: true })).toBeVisible();

    // 최신 측정값 확인 (StatCard value)
    await expect(page.getByText('54.5 kg')).toBeVisible();
    await expect(page.getByText('23.2 kg')).toBeVisible();
    // 체지방률 카드 - "23.5 %" 또는 "23.5%"
    const fatCard = page.locator('div').filter({ hasText: '체지방률' }).first();
    await expect(fatCard).toContainText('23.5');
  });

  test('측정값 입력 모달이 동작한다', async ({ page }) => {
    // 새 측정 기록 추가 버튼 클릭
    await page.getByRole('button', { name: /새 측정 기록 추가/ }).click();

    // 모달 표시 확인
    await expect(page.getByText('체성분 측정 추가')).toBeVisible();

    // 입력 폼 필드 확인 (모달 내부의 label 요소로 확인)
    const modal = page.locator('.fixed');
    await expect(modal.locator('label').filter({ hasText: '측정일' })).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: '체중' }).first()).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: '골격근량' }).first()).toBeVisible();
    await expect(modal.locator('label').filter({ hasText: '체지방률' }).first()).toBeVisible();

    // 취소 버튼으로 모달 닫기
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('체성분 측정 추가')).not.toBeVisible();
  });

  test('차트 영역이 존재한다', async ({ page }) => {
    // 변화 그래프 탭 클릭
    await page.getByText('변화 그래프').click();

    // SVG 차트 영역 확인
    await expect(page.locator('svg').first()).toBeVisible();

    // 차트 토글 버튼 확인
    await expect(page.getByRole('button', { name: /체중/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /골격근량/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /체지방률/ }).first()).toBeVisible();
  });

  test('목표 달성률 게이지가 표시된다', async ({ page }) => {
    // 목표 관리 탭 클릭
    await page.getByRole('button', { name: /목표 관리/ }).click();

    // 목표 게이지 확인
    await expect(page.getByText('목표 체중', { exact: true })).toBeVisible();
    await expect(page.getByText('목표 체지방률', { exact: true })).toBeVisible();

    // 목표값 표시 확인
    await expect(page.getByText(/목표 52kg/).first()).toBeVisible();
    await expect(page.getByText(/목표 20%/).first()).toBeVisible();
  });
});
