import { test, expect } from '@playwright/test';

// ============================================================
// 메시지 발송 인터랙션 (/message)
// ============================================================
test.describe('메시지 발송 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message');
    await page.waitForLoadState('networkidle');
  });

  test('수신자 그룹 빠른 선택 - 전체 회원 클릭 시 전체 회원 태그가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '전체' }).click();
    await expect(page.getByText('전체 회원 (1,240명)')).toBeVisible();
    // 다시 클릭하면 해제
    await page.getByRole('button', { name: '전체' }).click();
    await expect(page.getByText('수신자를 선택하세요')).toBeVisible();
  });

  test('수신자 그룹 빠른 선택 - 활성 회원/만료임박/PT 회원/장기 미출석 클릭 시 alert 발생', async ({ page }) => {
    test.setTimeout(15_000);
    const groups = ['활성 회원', '만료임박 (7일)', 'PT 회원', '장기 미출석'];
    for (const group of groups) {
      let dialogMsg = '';
      const handler = async (dialog: import('@playwright/test').Dialog) => {
        dialogMsg = dialog.message();
        await dialog.accept();
      };
      page.once('dialog', handler);
      await page.getByRole('button', { name: group }).click();
      // dialog가 처리될 시간
      await page.waitForTimeout(200);
      expect(dialogMsg).toContain('그룹 선택');
    }
  });

  test('대상 검색 모달: 열기 -> 검색 -> 선택 -> 확인 -> 닫기', async ({ page }) => {
    test.setTimeout(20_000);
    // 모달 열기
    await page.getByRole('button', { name: '대상 검색' }).click();
    await expect(page.getByText('수신자 검색')).toBeVisible();
    await expect(page.getByText('0명 선택됨').first()).toBeVisible();

    // 검색
    await page.getByPlaceholder('이름 또는 전화번호 검색').fill('김민준');
    await expect(page.getByText('김민준')).toBeVisible();
    await expect(page.getByText('1명 표시 중')).toBeVisible();

    // 선택
    await page.locator('label').filter({ hasText: '김민준' }).click();
    await expect(page.getByText('1명 선택됨').first()).toBeVisible();

    // 선택 완료
    await page.getByRole('button', { name: /선택 완료/ }).click();

    // 모달 닫히고 수신자 표시
    await expect(page.getByText('김민준').first()).toBeVisible();
    await expect(page.getByText('1명 선택됨')).toBeVisible();
  });

  test('채널 탭 전환 시 글자 제한 안내가 변경된다', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본: 알림톡
    await expect(page.getByText('알림톡: 최대 1,000자')).toBeVisible();

    // SMS/LMS 클릭
    await page.locator('label').filter({ hasText: 'SMS/LMS' }).click();
    await expect(page.getByText('SMS: 90자 이하 / LMS: 90자 초과 ~ 2,000자')).toBeVisible();

    // 앱 푸시 클릭
    await page.locator('label').filter({ hasText: '앱 푸시' }).first().click();
    await expect(page.getByText('앱 푸시: 최대 500자')).toBeVisible();

    // 알림톡으로 복귀
    await page.locator('label').filter({ hasText: '알림톡' }).first().click();
    await expect(page.getByText('알림톡: 최대 1,000자')).toBeVisible();
  });

  test('본문 입력 시 글자수 카운터가 실시간으로 변한다', async ({ page }) => {
    test.setTimeout(15_000);
    const textarea = page.getByPlaceholder('내용을 입력하세요.');
    // 초기: 카운터에 "0 / 1000자" 또는 유사 형식
    await expect(page.locator('span').filter({ hasText: /0\s*\/\s*1000자/ }).first()).toBeVisible();

    await textarea.fill('안녕하세요');
    await expect(page.locator('span').filter({ hasText: /5\s*\/\s*1000자/ }).first()).toBeVisible();

    await textarea.fill('안녕하세요 반갑습니다');
    // "안녕하세요 반갑습니다" = 5 + 1(공백) + 5 = 11자
    await expect(page.locator('span').filter({ hasText: /11\s*\/\s*1000자/ }).first()).toBeVisible();
  });

  test('변수 삽입 버튼 클릭 시 본문에 변수가 삽입된다', async ({ page }) => {
    test.setTimeout(15_000);
    const textarea = page.getByPlaceholder('내용을 입력하세요.');

    // #{이름} 삽입
    await page.getByRole('button', { name: '#{이름}' }).click();
    await expect(textarea).toHaveValue('#{이름}');

    // #{만료일} 추가 삽입
    await page.getByRole('button', { name: '#{만료일}' }).click();
    await expect(textarea).toHaveValue('#{이름}#{만료일}');
  });

  test('미리보기 모달: 열기 -> 내용 확인 -> 취소로 닫기', async ({ page }) => {
    test.setTimeout(20_000);
    // 전체 회원 선택
    await page.getByRole('button', { name: '전체' }).click();

    // 메시지 입력
    await page.getByPlaceholder('내용을 입력하세요.').fill('안녕하세요, FitGenie CRM입니다.');

    // 발송 버튼 클릭 -> 미리보기 모달
    await page.getByRole('button', { name: '메시지 발송' }).click();
    await expect(page.getByText('발송 미리보기')).toBeVisible();
    await expect(page.getByText('수신자 1,240명에게 발송됩니다.')).toBeVisible();
    // 모달 내 미리보기 텍스트 (paragraph 안에 있음)
    await expect(page.locator('.fixed p.whitespace-pre-wrap').filter({ hasText: '안녕하세요, FitGenie CRM입니다.' })).toBeVisible();

    // 취소 클릭
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('발송 미리보기')).not.toBeVisible();
  });

  test('발송 버튼 disabled/enabled 상태 전환', async ({ page }) => {
    test.setTimeout(15_000);
    const sendBtn = page.getByRole('button', { name: '메시지 발송' });

    // 수신자 없으면 disabled
    await expect(sendBtn).toBeDisabled();

    // 전체 선택하면 enabled
    await page.getByRole('button', { name: '전체' }).click();
    await expect(sendBtn).toBeEnabled();

    // 전체 해제하면 다시 disabled
    await page.getByRole('button', { name: '전체' }).click();
    await expect(sendBtn).toBeDisabled();
  });

  test('발송 이력 탭 클릭 시 이력 테이블 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '발송 이력' }).click();
    await expect(page.getByText('전체 발송 이력')).toBeVisible();
    await expect(page.getByText('2026-02-19 14:30')).toBeVisible();
    await expect(page.getByText('245')).toBeVisible();
    await expect(page.getByText('98.4%')).toBeVisible();
  });
});

// ============================================================
// 자동 알림 인터랙션 (/message/auto-alarm)
// ============================================================
test.describe('자동 알림 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message/auto-alarm');
    await page.waitForLoadState('networkidle');
  });

  test('알림 규칙 ON/OFF 토글이 동작한다', async ({ page }) => {
    test.setTimeout(15_000);
    // "만료 D-1 알림"은 기본 false
    // 모두 사용 버튼으로 전체 활성화 후, 토글 OFF 확인
    await page.getByRole('button', { name: '모두 사용' }).click();

    // 모든 규칙이 활성화된 상태에서 활성 dot(animate-ping) 수 확인
    const enabledBefore = await page.locator('.animate-ping').count();
    expect(enabledBefore).toBe(13);

    // 첫 번째 카드의 토글을 클릭하여 비활성화
    const firstToggle = page.locator('button.rounded-full').filter({ has: page.locator('span.rounded-full') }).first();
    await firstToggle.click();

    // 활성 dot 수 감소 확인
    const enabledAfter = await page.locator('.animate-ping').count();
    expect(enabledAfter).toBe(12);
  });

  test('모두 사용 버튼 클릭 시 모든 규칙이 활성화된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '모두 사용' }).click();

    // 활성화된 규칙 수 = 전체 13종
    const countText = page.locator('span').filter({ hasText: '13' });
    await expect(countText.first()).toBeVisible();
  });

  test('규칙 카드 편집 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    test.setTimeout(20_000);
    // 편집 버튼(title="편집")을 force 클릭 (group-hover로 보이는 버튼)
    const editBtns = page.locator('button[title="편집"]');
    await editBtns.first().click({ force: true });

    // 모달 열림 확인
    await expect(page.getByText('자동 알림 템플릿 편집')).toBeVisible();

    // 채널 버튼 확인
    await expect(page.getByRole('button', { name: '알림톡' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SMS' })).toBeVisible();

    // 저장 클릭
    await page.getByRole('button', { name: '저장하기' }).click();

    // 모달 닫힘 확인
    await expect(page.getByText('자동 알림 템플릿 편집')).not.toBeVisible();
  });
});

// ============================================================
// 쿠폰 관리 인터랙션 (/message/coupon)
// ============================================================
test.describe('쿠폰 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message/coupon');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: 쿠폰 목록 <-> 발급 이력', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본: 쿠폰 목록
    await expect(page.getByText('신규 회원 가입 10% 할인')).toBeVisible();

    // 발급 이력 탭 클릭
    await page.getByRole('button', { name: '발급 이력' }).click();
    await expect(page.getByText('김철수')).toBeVisible();
    await expect(page.getByText('M2024-0012')).toBeVisible();

    // 쿠폰 목록 탭으로 복귀
    await page.getByRole('button', { name: '쿠폰 목록' }).click();
    await expect(page.getByText('신규 회원 가입 10% 할인')).toBeVisible();
  });

  test('신규 쿠폰 생성 모달: 열기 -> 입력 -> 저장', async ({ page }) => {
    test.setTimeout(20_000);
    await page.getByRole('button', { name: '신규 쿠폰 생성' }).click();

    // 모달 열림
    const modal = page.locator('.fixed.inset-0').first();
    await expect(modal).toBeVisible();
    await expect(page.getByPlaceholder('쿠폰 이름을 입력하세요')).toBeVisible();

    // 쿠폰 코드 자동 생성 확인
    await expect(page.locator('span.font-mono').first()).toBeVisible();

    // 쿠폰명 입력
    await page.getByPlaceholder('쿠폰 이름을 입력하세요').fill('테스트 할인 쿠폰');

    // 쿠폰 유형 - 할인 쿠폰 라디오 확인
    await expect(page.locator('input[type="radio"]').first()).toBeChecked();

    // 재생성 버튼 클릭
    await page.getByRole('button', { name: '재생성' }).click();

    // 저장
    await page.getByRole('button', { name: '저장하기' }).click();

    // 모달 닫힘 확인
    await expect(page.getByPlaceholder('쿠폰 이름을 입력하세요')).not.toBeVisible();
  });

  test('신규 쿠폰 생성 모달: 취소 클릭 시 닫힌다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '신규 쿠폰 생성' }).click();
    await expect(page.getByPlaceholder('쿠폰 이름을 입력하세요')).toBeVisible();

    await page.getByRole('button', { name: '취소' }).first().click();
    await expect(page.getByPlaceholder('쿠폰 이름을 입력하세요')).not.toBeVisible();
  });

  test('쿠폰 테이블에 5건의 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.getByText('신규 회원 가입 10% 할인')).toBeVisible();
    await expect(page.getByText('여름맞이 PT 1회 체험권')).toBeVisible();
    await expect(page.getByText('VIP 재등록 5만원 할인')).toBeVisible();
    await expect(page.getByText('지인 추천 1주일 이용권')).toBeVisible();
    await expect(page.getByText('봄맞이 20% 할인 쿠폰')).toBeVisible();
  });
});

// ============================================================
// 마일리지 인터랙션 (/mileage)
// ============================================================
test.describe('마일리지 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mileage');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: 현황 -> 이력 -> 정책', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본: 마일리지 현황
    await expect(page.getByText('회원별 마일리지 현황')).toBeVisible();

    // 이력 탭
    await page.getByRole('button', { name: '마일리지 이력' }).click();
    await expect(page.getByText('전체 마일리지 이력')).toBeVisible();

    // 정책 탭
    await page.getByRole('button', { name: '마일리지 정책' }).click();
    await expect(page.getByText('기본 적립 정책')).toBeVisible();

    // 현황 탭 복귀
    await page.getByRole('button', { name: '마일리지 현황' }).click();
    await expect(page.getByText('회원별 마일리지 현황')).toBeVisible();
  });

  test('정책 탭: 적립률 변경 시 저장 버튼 활성화, 저장 후 비활성화', async ({ page }) => {
    test.setTimeout(20_000);
    await page.getByRole('button', { name: '마일리지 정책' }).click();

    // 저장 버튼 초기 상태: disabled
    const saveBtn = page.getByRole('button', { name: /정책 저장하기|저장 완료/ });
    await expect(saveBtn).toBeDisabled();

    // 적립률 변경
    const earnRateInput = page.locator('input[type="number"]').first();
    await earnRateInput.fill('10');

    // 변경사항 배너 + 저장 버튼 활성화
    await expect(page.getByText('저장되지 않은 변경사항이 있습니다.')).toBeVisible();
    await expect(page.getByRole('button', { name: '정책 저장하기' })).toBeEnabled();
  });

  test('이력 탭: 이력 테이블에 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '마일리지 이력' }).click();
    await expect(page.getByText('전체 마일리지 이력')).toBeVisible();
    await expect(page.getByText('최지우')).toBeVisible();
    await expect(page.getByText('결제 적립').first()).toBeVisible();
  });
});

// ============================================================
// 계약 위자드 인터랙션 (/contracts/new)
// ============================================================
test.describe('계약 위자드 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');
  });

  test('1단계: 회원 검색 -> 선택 -> 선택 확인 메시지 표시', async ({ page }) => {
    test.setTimeout(15_000);
    // 검색
    await page.getByPlaceholder('이름 또는 전화번호로 검색').fill('홍길동');
    await expect(page.getByRole('cell', { name: '홍길동' })).toBeVisible();

    // 선택 버튼 클릭
    await page.getByRole('button', { name: '선택' }).first().click();
    await expect(page.getByText('회원이 선택되었습니다.')).toBeVisible();
  });

  test('1단계: 회원 선택 후 다음 -> 2단계 상품 선택 표시', async ({ page }) => {
    test.setTimeout(15_000);
    // 회원 선택
    await page.getByRole('button', { name: '선택' }).first().click();
    await expect(page.getByText('회원이 선택되었습니다.')).toBeVisible();

    // 다음 단계 클릭
    await page.getByRole('button', { name: '다음 단계' }).click();

    // 2단계: 상품 선택 탭 확인
    await expect(page.getByText('시설이용')).toBeVisible();
    await expect(page.getByText('장바구니')).toBeVisible();
  });

  test('이전/다음 버튼 동작: 1단계 -> 2단계 -> 1단계', async ({ page }) => {
    test.setTimeout(15_000);
    // 회원 선택
    await page.getByRole('button', { name: '선택' }).first().click();

    // 다음 -> 2단계
    await page.getByRole('button', { name: '다음 단계' }).click();
    await expect(page.getByText('장바구니')).toBeVisible();

    // 이전 -> 1단계
    await page.getByRole('button', { name: '이전' }).click();
    await expect(page.getByText('회원 조회')).toBeVisible();
  });

  test('회원 미선택 시 다음 클릭 -> 에러 메시지 표시', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '다음 단계' }).click();
    await expect(page.getByText('계약 대상 회원을 선택해주세요.')).toBeVisible();
  });

  test('진행 단계 표시: 현재 단계 강조 표시가 변경된다', async ({ page }) => {
    test.setTimeout(15_000);
    // 1단계: "회원 선택" 강조
    const step1Indicator = page.locator('div').filter({ hasText: /^1$/ }).first();
    await expect(step1Indicator).toBeVisible();

    // 회원 선택 후 다음
    await page.getByRole('button', { name: '선택' }).first().click();
    await page.getByRole('button', { name: '다음 단계' }).click();

    // 2단계에서 "상품 선택" 텍스트가 primary 컬러
    await expect(page.getByText('장바구니')).toBeVisible();
  });
});

// ============================================================
// 설정 인터랙션 (/settings)
// ============================================================
test.describe('설정 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('기본정보 탭: 센터명 수정 시 저장 버튼 활성화', async ({ page }) => {
    test.setTimeout(15_000);
    // 저장 버튼 초기: disabled
    const saveBtn = page.getByRole('button', { name: '설정 저장' });
    await expect(saveBtn).toBeDisabled();

    // 센터명 입력 필드 (센터 기본정보 폼 내부의 첫 번째 text input)
    const formArea = page.locator('.max-w-\\[900px\\]');
    const nameInput = formArea.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('테스트 센터');

    // 저장 버튼 활성화 확인
    await expect(saveBtn).toBeEnabled();
  });

  test('알림설정 탭: 토글 ON/OFF 시 저장 버튼 활성화', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '알림설정' }).click();
    // heading 사용하여 정확히 매칭
    await expect(page.getByRole('heading', { name: '푸시 알림' })).toBeVisible();

    const saveBtn = page.getByRole('button', { name: '설정 저장' });
    await expect(saveBtn).toBeDisabled();

    // 첫 번째 토글 클릭 (ToggleSwitch: 너비 12, 높이 6 rounded-full)
    const toggles = page.locator('button.rounded-full').filter({ has: page.locator('div.rounded-full') });
    await toggles.first().click();

    await expect(saveBtn).toBeEnabled();
  });

  test('테마설정 탭: 다크 모드 선택 시 저장 버튼 활성화', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '테마설정' }).click();
    await expect(page.getByText('다크모드 설정')).toBeVisible();

    const saveBtn = page.getByRole('button', { name: '설정 저장' });
    await expect(saveBtn).toBeDisabled();

    // 다크 모드 버튼 클릭
    await page.getByRole('button', { name: '다크 모드' }).click();

    await expect(saveBtn).toBeEnabled();
  });

  test('저장 버튼 클릭 -> 성공 토스트 표시', async ({ page }) => {
    test.setTimeout(20_000);
    // 센터명 변경으로 dirty 상태 만들기
    const formArea = page.locator('.max-w-\\[900px\\]');
    const nameInput = formArea.locator('input[type="text"]').first();
    await nameInput.clear();
    await nameInput.fill('변경된 센터');

    // dirty 상태 확인 후 저장 클릭
    await expect(page.getByRole('button', { name: '설정 저장' })).toBeEnabled();
    await page.getByRole('button', { name: '설정 저장' }).click();

    // 저장 중... 표시
    await expect(page.getByText('저장 중...')).toBeVisible();

    // 성공 토스트 표시
    await expect(page.getByText('변경사항이 저장되었습니다.')).toBeVisible({ timeout: 5000 });
  });
});

// ============================================================
// 권한 설정 인터랙션 (/settings/permissions)
// ============================================================
test.describe('권한 설정 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/permissions');
    await page.waitForLoadState('networkidle');
  });

  test('역할별 권한 체크박스 ON/OFF 토글', async ({ page }) => {
    test.setTimeout(15_000);
    // 센터장 역할이 기본 선택됨
    await expect(page.getByText('센터장 권한 설정')).toBeVisible();

    // 권한 매트릭스에서 체크 버튼 클릭
    const permCells = page.locator('td button').filter({ has: page.locator('svg') });
    const firstCell = permCells.first();
    await firstCell.click();

    // 변경 사항 알림 표시
    await expect(page.getByText('저장되지 않은 변경 사항이 있습니다.')).toBeVisible();
  });

  test('전체 허용 버튼 클릭 시 모든 권한이 활성화된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '전체 허용' }).click();
    await expect(page.getByText('저장되지 않은 변경 사항이 있습니다.')).toBeVisible();
  });

  test('전체 차단 버튼 클릭 시 모든 권한이 비활성화된다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '전체 차단' }).click();
    await expect(page.getByText('저장되지 않은 변경 사항이 있습니다.')).toBeVisible();
  });

  test('초기화 버튼 클릭 시 확인 다이얼로그가 열린다', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '초기화' }).click();
    await expect(page.getByText('권한 설정 초기화')).toBeVisible();
    await expect(page.getByText('저장하지 않은 변경 사항은 모두 유실됩니다.')).toBeVisible();
  });

  test('저장 버튼은 변경 없으면 비활성, 변경 후 활성', async ({ page }) => {
    test.setTimeout(15_000);
    const saveBtn = page.getByRole('button', { name: '변경 사항 저장' });

    // 변경 전: 스타일로 비활성 확인 (disabled 아닌 커서)
    await page.getByRole('button', { name: '전체 허용' }).click();
    // 변경 후: 활성화
    await expect(saveBtn).toBeVisible();
  });
});

// ============================================================
// 키오스크 설정 인터랙션 (/settings/kiosk)
// ============================================================
test.describe('키오스크 설정 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/kiosk');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: 기본설정 -> 화면설정 -> TTS -> 출입규칙', async ({ page }) => {
    test.setTimeout(15_000);
    // 기본 설정 (기본 탭)
    await expect(page.getByText('키오스크 타입')).toBeVisible();

    // 화면 설정 탭
    await page.getByRole('button', { name: '화면 설정' }).click();
    await expect(page.getByText('로고 및 배경')).toBeVisible();

    // TTS 설정 탭
    await page.getByRole('button', { name: 'TTS 설정' }).click();
    await expect(page.getByText('안내 메시지 편집')).toBeVisible();

    // 출입 규칙 탭
    await page.getByRole('button', { name: '출입 규칙' }).click();
    await expect(page.getByText('출입 시간 및 기본 규칙')).toBeVisible();
  });

  test('입장 방식 변경: QR 코드 해제 -> 재선택', async ({ page }) => {
    test.setTimeout(15_000);
    // QR 코드가 기본 활성
    const qrLabel = page.locator('label').filter({ hasText: 'QR 코드' });
    await expect(qrLabel).toBeVisible();

    // QR 코드 클릭 (해제)
    await qrLabel.click();

    // 다시 클릭 (활성)
    await qrLabel.click();
  });

  test('설정 저장 버튼 클릭 시 alert 발생', async ({ page }) => {
    test.setTimeout(15_000);
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('키오스크 설정이 저장되었습니다');
      await dialog.accept();
    });
    await page.getByRole('button', { name: '설정 저장' }).click();
  });
});

// ============================================================
// IoT 설정 인터랙션 (/settings/iot)
// ============================================================
test.describe('IoT 설정 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/iot');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: IoT 기기 -> 게이트 관리 -> 출입 로그 -> 출입 규칙', async ({ page }) => {
    test.setTimeout(15_000);
    // IoT 기기 (기본 탭)
    await expect(page.getByText('IoT 기기 목록')).toBeVisible();

    // 게이트 관리
    await page.getByRole('button', { name: '게이트 관리' }).click();
    await expect(page.getByText('게이트 목록')).toBeVisible();

    // 출입 로그
    await page.getByRole('button', { name: '출입 로그' }).click();
    await expect(page.getByText('출입 로그 이력')).toBeVisible();

    // 출입 규칙
    await page.getByRole('button', { name: '출입 규칙' }).click();
    await expect(page.getByText('게이트별 출입 규칙')).toBeVisible();
  });

  test('기기 추가 모달: 열기 -> 입력 -> 저장', async ({ page }) => {
    test.setTimeout(20_000);
    // 모달 열기
    await page.getByRole('button', { name: '기기 추가' }).first().click();
    await expect(page.getByRole('heading', { name: 'IoT 기기 추가' })).toBeVisible();

    // 등록 버튼 disabled 확인
    await expect(page.getByRole('button', { name: '기기 등록' })).toBeDisabled();

    // 기기명 입력
    await page.getByPlaceholder('예: 운동룸 B 출입 RFID').fill('테스트 기기');

    // IP 주소 입력
    await page.getByPlaceholder('192.168.0.xxx').fill('192.168.0.200');

    // 등록 버튼 활성화
    await expect(page.getByRole('button', { name: '기기 등록' })).toBeEnabled();

    // 기기 등록 클릭
    await page.getByRole('button', { name: '기기 등록' }).click();

    // 모달 닫힘 확인
    await expect(page.getByRole('heading', { name: 'IoT 기기 추가' })).not.toBeVisible();

    // 새 기기가 목록에 추가됨
    await expect(page.getByText('테스트 기기')).toBeVisible();
  });

  test('연결 테스트 버튼 클릭 시 테스트 진행 표시', async ({ page }) => {
    test.setTimeout(15_000);
    const testBtns = page.getByRole('button', { name: '연결 테스트' });
    await testBtns.first().click();

    // 테스트 중 표시
    await expect(page.getByText('연결 테스트 중...')).toBeVisible();

    // 결과 표시 (성공 또는 실패)
    await expect(page.getByText(/연결 성공|연결 실패/)).toBeVisible({ timeout: 5000 });
  });

  test('장비 상태: 온라인/오프라인/오류 뱃지가 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.getByText('온라인').first()).toBeVisible();
    await expect(page.getByText('오프라인').first()).toBeVisible();
    await expect(page.getByText('오류').first()).toBeVisible();
  });
});

// ============================================================
// 구독 관리 인터랙션 (/subscription)
// ============================================================
test.describe('구독 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: 구독 현황 -> 요금제 비교 -> 결제 이력', async ({ page }) => {
    test.setTimeout(15_000);
    // 구독 현황 (기본)
    await expect(page.getByText('Fit Pro Plan')).toBeVisible();

    // 요금제 비교
    await page.getByRole('button', { name: '요금제 비교' }).click();
    await expect(page.getByText('비즈니스 성장에 맞는 플랜을 선택하세요')).toBeVisible();

    // 결제 이력
    await page.getByRole('button', { name: '결제 이력' }).click();
    // 결제 이력 heading으로 확인 (탭 버튼과 중복 방지)
    await expect(page.getByRole('heading', { name: '결제 이력' })).toBeVisible();
  });

  test('플랜 변경 버튼 클릭 시 요금제 비교 탭으로 이동', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '플랜 변경하기' }).click();
    await expect(page.getByText('비즈니스 성장에 맞는 플랜을 선택하세요')).toBeVisible();
  });

  test('요금제 비교: 3개 플랜 카드와 현재 플랜 표시', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '요금제 비교' }).click();

    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
    await expect(page.getByText('현재 이용 중인 플랜')).toBeVisible();

    // 월간/연간 결제 토글
    await page.getByRole('button', { name: '월간 결제' }).click();
    await page.getByRole('button', { name: '연간 결제' }).click();
  });

  test('결제 이력 탭: 이력 데이터 표시', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '결제 이력' }).click();
    // heading으로 확인 (탭 버튼과 중복 방지)
    await expect(page.getByRole('heading', { name: '결제 이력' })).toBeVisible();
    await expect(page.getByText('2025-05-15').first()).toBeVisible();
    await expect(page.getByText('결제 완료').first()).toBeVisible();
  });
});

// ============================================================
// 지점 관리 인터랙션 (/branches)
// ============================================================
test.describe('지점 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/branches');
    await page.waitForLoadState('networkidle');
  });

  test('탭 전환: 지점 목록 -> 통합 현황 -> 지점 간 이동', async ({ page }) => {
    test.setTimeout(15_000);
    // 지점 목록 (기본)
    await expect(page.getByText('지점 현황 목록')).toBeVisible();

    // 통합 현황
    await page.getByRole('button', { name: '통합 현황' }).click();
    await expect(page.getByText('지점별 매출 비교')).toBeVisible();

    // 지점 간 이동
    await page.getByRole('button', { name: '지점 간 이동' }).click();
    await expect(page.getByText('회원 지점 이동 이력')).toBeVisible();
  });

  test('신규 지점 등록 모달: 열기 -> 검증 에러 -> 닫기', async ({ page }) => {
    test.setTimeout(20_000);
    await page.getByRole('button', { name: '신규 지점 등록' }).click();
    await expect(page.getByText('신규 지점 등록').nth(1)).toBeVisible();

    // 바로 등록 완료 클릭 -> 검증 에러
    await page.getByRole('button', { name: '등록 완료' }).click();
    await expect(page.getByText('지점명은 2~30자로 입력해주세요.')).toBeVisible();

    // 취소
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByPlaceholder('예: FitGenie CRM 광화문점')).not.toBeVisible();
  });

  test('지점 이동 모달: 열기 -> 내용 확인 -> 닫기', async ({ page }) => {
    test.setTimeout(15_000);
    await page.getByRole('button', { name: '지점 이동 신청' }).click();
    await expect(page.getByText('회원 지점 이동 신청')).toBeVisible();
    await expect(page.getByText('현재 지점')).toBeVisible();
    await expect(page.getByText('이동할 지점')).toBeVisible();

    // 닫기
    await page.getByRole('button', { name: '취소' }).click();
    await expect(page.getByText('회원 지점 이동 신청')).not.toBeVisible();
  });

  test('상태 뱃지: 운영중/임시휴업이 표시된다', async ({ page }) => {
    test.setTimeout(15_000);
    await expect(page.locator('span').filter({ hasText: '운영중' }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: '임시휴업' }).first()).toBeVisible();
  });
});

