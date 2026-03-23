import { test, expect } from '@playwright/test';

// ============================================================
// 1. 메시지 발송 (/message)
// ============================================================
test.describe('메시지 발송', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "메시지 발송" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('heading', { name: '메시지 발송', exact: true })).toBeVisible();
    await expect(page.getByText('회원들에게 알림톡, SMS, 앱 푸시를 발송하고 자동 알림을 관리합니다.')).toBeVisible();
  });

  test('메시지 전송 / 발송 이력 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '메시지 전송' })).toBeVisible();
    await expect(page.getByRole('button', { name: '발송 이력' })).toBeVisible();
  });

  test('수신자 선택 영역이 존재하고 그룹 빠른 선택 버튼들이 보인다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('수신자 선택')).toBeVisible();
    await expect(page.getByText('수신자를 선택하세요')).toBeVisible();

    const groups = ['전체', '활성 회원', '만료임박 (7일)', 'PT 회원', '장기 미출석'];
    for (const group of groups) {
      await expect(page.getByRole('button', { name: group })).toBeVisible();
    }
  });

  test('대상 검색 버튼 클릭 시 수신자 검색 모달이 열린다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '대상 검색' }).click();
    await expect(page.getByText('수신자 검색')).toBeVisible();
    await expect(page.getByPlaceholder('이름 또는 전화번호 검색')).toBeVisible();
    await expect(page.getByText('전체 선택')).toBeVisible();
  });

  test('발송 채널 탭 (알림톡 / SMS/LMS / 앱 푸시)이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('발송 채널')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: '알림톡' }).first()).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'SMS/LMS' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: '앱 푸시' }).first()).toBeVisible();
  });

  test('본문 에디터와 글자수 카운터가 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('메시지 내용')).toBeVisible();
    const textarea = page.getByPlaceholder('내용을 입력하세요.');
    await expect(textarea).toBeVisible();

    // 글자수 카운터 확인 (0 / 1000자 - 기본 알림톡)
    await expect(page.getByText(/0\s*\/\s*1000자/)).toBeVisible();

    // 텍스트 입력 후 카운터 변경 확인 (테스트 메시지 = 7자, 공백 포함)
    await textarea.fill('테스트 메시지');
    await expect(page.getByText('7 / 1000자')).toBeVisible();
  });

  test('변수 삽입 버튼들이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    const tags = ['#{이름}', '#{만료일}', '#{상품명}', '#{잔여횟수}', '#{센터명}'];
    for (const tag of tags) {
      await expect(page.getByRole('button', { name: tag })).toBeVisible();
    }
  });

  test('수신자 없을 때 메시지 발송 버튼이 disabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    const sendButton = page.getByRole('button', { name: '메시지 발송' });
    await expect(sendButton).toBeDisabled();
  });

  test('전체 회원 선택 후 메시지 입력 시 미리보기 모달이 열린다', async ({ page }) => {
    test.setTimeout(15_000);
    // 전체 버튼 클릭
    await page.getByRole('button', { name: '전체' }).click();
    await expect(page.getByText('전체 회원 (1,240명)')).toBeVisible();

    // 메시지 입력
    await page.getByPlaceholder('내용을 입력하세요.').fill('테스트 발송 메시지');

    // 발송 버튼 클릭
    await page.getByRole('button', { name: '메시지 발송' }).click();

    // 미리보기 모달 확인
    await expect(page.getByText('발송 미리보기')).toBeVisible();
    await expect(page.getByText('수신자 1,240명에게 발송됩니다.')).toBeVisible();
  });

  test('발송 이력 탭 클릭 시 이력 테이블이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '발송 이력' }).click();
    await expect(page.getByText('전체 발송 이력')).toBeVisible();
    await expect(page.getByText('2026-02-19 14:30').first()).toBeVisible();
  });

  test('최근 발송 이력 테이블이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('최근 발송 이력')).toBeVisible();
    await expect(page.getByText('발송일시')).toBeVisible();
    await expect(page.getByText('수신자 수')).toBeVisible();
    await expect(page.getByText('성공률')).toBeVisible();
  });
});

// ============================================================
// 2. 자동 알림 (/message/auto-alarm)
// ============================================================
test.describe('자동 알림', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message/auto-alarm');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "자동 알림 설정" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('자동 알림 설정')).toBeVisible();
    await expect(page.getByText('회원 이벤트 발생 시 자동으로 메시지를 발송하는 알림 규칙을 관리합니다.')).toBeVisible();
  });

  test('고객 관련 자동 알림 규칙 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('고객 관련 자동 알림 (7종)')).toBeVisible();
    const ruleNames = ['만료 D-7 알림', '만료 D-3 알림', '생일 축하 알림', '신규 회원 환영 알림', '결제 완료 알림'];
    for (const name of ruleNames) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('상품 관련 자동 알림 규칙 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('상품 관련 자동 알림 (6종)')).toBeVisible();
    const ruleNames = ['수강권 만료 알림', '수강권 만료 임박', '회원권 만료 알림', '회원권 만료 임박'];
    for (const name of ruleNames) {
      await expect(page.getByText(name).first()).toBeVisible();
    }
  });

  test('활성화된 알림 규칙 수가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('활성화된 알림 규칙')).toBeVisible();
    await expect(page.getByText('정상 작동 중')).toBeVisible();
  });

  test('설정 추가 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '설정 추가' })).toBeVisible();
  });

  test('모두 사용 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '모두 사용' })).toBeVisible();
  });
});

// ============================================================
// 3. 쿠폰 관리 (/message/coupon)
// ============================================================
test.describe('쿠폰 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/message/coupon');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "쿠폰 관리" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('쿠폰 관리')).toBeVisible();
    await expect(page.getByText('회원에게 발급할 할인 및 무료 쿠폰을 생성하고 발급 이력을 관리합니다.')).toBeVisible();
  });

  test('통계 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('전체 쿠폰')).toBeVisible();
    await expect(page.getByText('활성 쿠폰')).toBeVisible();
    await expect(page.getByText('총 발급 건수')).toBeVisible();
    await expect(page.getByText('사용 완료')).toBeVisible();
  });

  test('쿠폰 목록 / 발급 이력 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '쿠폰 목록' })).toBeVisible();
    await expect(page.getByRole('button', { name: '발급 이력' })).toBeVisible();
  });

  test('쿠폰 목록 테이블에 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('신규 회원 가입 10% 할인')).toBeVisible();
    await expect(page.getByText('여름맞이 PT 1회 체험권')).toBeVisible();
    await expect(page.getByText('VIP 재등록 5만원 할인')).toBeVisible();
  });

  test('신규 쿠폰 생성 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '신규 쿠폰 생성' }).click();
    await expect(page.getByText('신규 쿠폰 생성').nth(1)).toBeVisible();
    await expect(page.getByPlaceholder('쿠폰 이름을 입력하세요')).toBeVisible();
  });
});

// ============================================================
// 4. 마일리지 관리 (/mileage)
// ============================================================
test.describe('마일리지 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/mileage');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "마일리지 관리" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('heading', { name: '마일리지 관리' })).toBeVisible();
    await expect(page.getByText('회원의 마일리지 적립 및 사용 이력을 관리하고 정책을 설정합니다.')).toBeVisible();
  });

  test('통계 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('전체 발행 마일리지')).toBeVisible();
    await expect(page.getByText('전체 사용 마일리지')).toBeVisible();
    await expect(page.getByText('잔여 마일리지').first()).toBeVisible();
    await expect(page.getByText('이번 달 적립')).toBeVisible();
  });

  test('마일리지 현황 / 마일리지 이력 / 마일리지 정책 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '마일리지 현황' })).toBeVisible();
    await expect(page.getByRole('button', { name: '마일리지 이력' })).toBeVisible();
    await expect(page.getByRole('button', { name: '마일리지 정책' })).toBeVisible();
  });

  test('마일리지 현황 테이블에 회원 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('회원별 마일리지 현황')).toBeVisible();
    await expect(page.getByText('김민준')).toBeVisible();
    await expect(page.getByText('이서연')).toBeVisible();
  });

  test('마일리지 이력 탭 클릭 시 이력 테이블이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '마일리지 이력' }).click();
    await expect(page.getByText('전체 마일리지 이력')).toBeVisible();
    await expect(page.getByText('처리일시')).toBeVisible();
    await expect(page.getByText('처리유형')).toBeVisible();
  });

  test('마일리지 정책 탭 클릭 시 정책 설정 폼이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '마일리지 정책' }).click();
    await expect(page.getByText('기본 적립 정책')).toBeVisible();
    await expect(page.getByText('사용 제한 설정')).toBeVisible();
    await expect(page.getByText('대상 상품 설정')).toBeVisible();
  });
});

// ============================================================
// 5. 계약 위자드 (/contracts/new)
// ============================================================
test.describe('계약 위자드', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contracts/new');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "전자계약 등록" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('전자계약 등록')).toBeVisible();
    await expect(page.getByText('회원 선택부터 상품 결제, 확인까지 5단계로 진행합니다.')).toBeVisible();
  });

  test('스텝 표시기에 5단계가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    const steps = ['회원 선택', '상품 선택', '기간/금액', '결제', '확인'];
    for (const step of steps) {
      await expect(page.getByText(step, { exact: true }).first()).toBeVisible();
    }
  });

  test('1단계에서 회원 검색 입력 필드가 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByPlaceholder('이름 또는 전화번호로 검색')).toBeVisible();
    await expect(page.getByText('회원 조회')).toBeVisible();
  });

  test('이전 버튼이 1단계에서 disabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    const prevButton = page.getByRole('button', { name: '이전' });
    await expect(prevButton).toBeDisabled();
  });

  test('다음 단계 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '다음 단계' })).toBeVisible();
  });

  test('회원 미선택 시 다음 버튼 클릭 시 에러 메시지가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '다음 단계' }).click();
    await expect(page.getByText('계약 대상 회원을 선택해주세요.')).toBeVisible();
  });

  test('회원 목록 테이블에 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('홍길동')).toBeVisible();
    await expect(page.getByText('김영희')).toBeVisible();
    await expect(page.getByText('이철수')).toBeVisible();
  });
});

// ============================================================
// 6. 설정 (/settings)
// ============================================================
test.describe('설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "센터 설정" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('센터 설정')).toBeVisible();
    await expect(page.getByText('기본정보, 알림, 테마 설정을 관리합니다.')).toBeVisible();
  });

  test('기본정보 / 알림설정 / 테마설정 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '기본정보' })).toBeVisible();
    await expect(page.getByRole('button', { name: '알림설정' })).toBeVisible();
    await expect(page.getByRole('button', { name: '테마설정' })).toBeVisible();
  });

  test('기본정보 탭에서 센터명, 대표 연락처, 주소 필드가 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('센터 기본정보')).toBeVisible();
    await expect(page.getByText('센터명').first()).toBeVisible();
    await expect(page.getByText('대표 연락처')).toBeVisible();
    await expect(page.getByText('주소').first()).toBeVisible();
  });

  test('기본정보 탭에서 영업시간 설정 영역이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('영업시간 설정')).toBeVisible();
    await expect(page.getByText('평일 오픈~마감')).toBeVisible();
    await expect(page.getByText('주말/공휴일 오픈~마감')).toBeVisible();
  });

  test('알림설정 탭 클릭 시 토글 스위치들이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '알림설정' }).click();
    await expect(page.getByRole('heading', { name: '푸시 알림' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '이메일 알림' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SMS 알림' })).toBeVisible();
    await expect(page.getByText('실시간 입장 알림')).toBeVisible();
    await expect(page.getByText('주간 리포트')).toBeVisible();
  });

  test('테마설정 탭 클릭 시 모드 선택과 색상 선택이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '테마설정' }).click();
    await expect(page.getByText('다크모드 설정')).toBeVisible();
    await expect(page.getByText('라이트 모드')).toBeVisible();
    await expect(page.getByText('다크 모드')).toBeVisible();
    await expect(page.getByText('시스템 설정').first()).toBeVisible();
    await expect(page.getByText('색상 설정')).toBeVisible();
    await expect(page.getByText('메인 컬러 (Primary)')).toBeVisible();
    await expect(page.getByText('보조 컬러 (Accent)')).toBeVisible();
  });

  test('설정 저장 버튼이 존재하고 초기에 disabled 상태이다', async ({ page }) => {
    test.setTimeout(10_000);
    const saveButton = page.getByRole('button', { name: '설정 저장' });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();
  });
});

// ============================================================
// 7. 권한 설정 (/settings/permissions)
// ============================================================
test.describe('권한 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/permissions');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "권한 설정" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('heading', { name: '권한 설정', exact: true })).toBeVisible();
    await expect(page.getByText('직원 역할별 메뉴 접근 및 기능 사용 권한을 관리합니다.')).toBeVisible();
  });

  test('역할 목록이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('역할 목록')).toBeVisible();
    const roles = ['최고관리자', '센터장', '매니저', '피트니스 코치', '스태프', '조회전용'];
    for (const role of roles) {
      await expect(page.getByText(role).first()).toBeVisible();
    }
  });

  test('권한 매트릭스 테이블이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    // 테이블 헤더 확인
    await expect(page.locator('th').filter({ hasText: '메뉴 그룹' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '메뉴명' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '접근' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '조회' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '등록' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '수정' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: '삭제' })).toBeVisible();
  });

  test('변경 사항 저장 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '변경 사항 저장' })).toBeVisible();
  });

  test('초기화 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '초기화' })).toBeVisible();
  });

  test('전체 허용 / 전체 차단 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '전체 허용' })).toBeVisible();
    await expect(page.getByRole('button', { name: '전체 차단' })).toBeVisible();
  });

  test('배정 직원 현황이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('배정 직원')).toBeVisible();
  });
});

// ============================================================
// 8. 키오스크 설정 (/settings/kiosk)
// ============================================================
test.describe('키오스크 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/kiosk');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "키오스크 설정" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('키오스크 설정')).toBeVisible();
    await expect(page.getByText('무인 체크인 키오스크의 화면, 동작, 음성 안내를 관리합니다.')).toBeVisible();
  });

  test('기본 설정 / 화면 설정 / TTS 설정 / 출입 규칙 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('기본 설정')).toBeVisible();
    await expect(page.getByText('화면 설정')).toBeVisible();
    await expect(page.getByText('TTS 설정')).toBeVisible();
    await expect(page.getByText('출입 규칙')).toBeVisible();
  });

  test('키오스크 타입 선택이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('키오스크 타입')).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '타입 A' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: '타입 B' })).toBeVisible();
  });

  test('입장 방식 설정이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('입장 방식')).toBeVisible();
    await expect(page.getByText('QR 코드')).toBeVisible();
    await expect(page.getByText('RFID/NFC')).toBeVisible();
  });

  test('시스템 설정 항목이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('시스템 설정')).toBeVisible();
    await expect(page.getByText('화면 대기 시간 (초)')).toBeVisible();
    await expect(page.getByText('자동 초기화 시간 (초)')).toBeVisible();
    await expect(page.getByText('관리자 PIN')).toBeVisible();
  });

  test('연결 상태가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('연결됨')).toBeVisible();
  });

  test('설정 저장 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '설정 저장' })).toBeVisible();
  });
});

// ============================================================
// 9. IoT 설정 (/settings/iot)
// ============================================================
test.describe('IoT 설정', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings/iot');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "출입문/IoT 설정" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('출입문/IoT 설정')).toBeVisible();
    await expect(page.getByText('센터 내 출입 게이트와 IoT 기기 연동을 관리하고 출입 보안 로그를 확인합니다.')).toBeVisible();
  });

  test('게이트 관리 / IoT 기기 / 출입 로그 / 출입 규칙 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '게이트 관리' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'IoT 기기', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '출입 로그' })).toBeVisible();
    await expect(page.getByRole('button', { name: '출입 규칙' })).toBeVisible();
  });

  test('IoT 기기 목록에 장비 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('IoT 기기 목록')).toBeVisible();
    await expect(page.getByText('메인 출입구 RFID')).toBeVisible();
    await expect(page.getByText('InBody 체성분 분석기')).toBeVisible();
    await expect(page.getByText('로비 키오스크')).toBeVisible();
  });

  test('기기 추가 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '기기 추가' }).first().click();
    await expect(page.getByRole('heading', { name: 'IoT 기기 추가' })).toBeVisible();
    await expect(page.getByPlaceholder('예: 운동룸 B 출입 RFID')).toBeVisible();
  });

  test('연결 테스트 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    const testButtons = page.getByRole('button', { name: '연결 테스트' });
    await expect(testButtons.first()).toBeVisible();
  });

  test('장비 상태(온라인/오프라인/오류)가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('온라인').first()).toBeVisible();
    await expect(page.getByText('오프라인').first()).toBeVisible();
    await expect(page.getByText('오류').first()).toBeVisible();
  });
});

// ============================================================
// 10. 구독 관리 (/subscription)
// ============================================================
test.describe('구독 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "구독 플랜 관리" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('구독 플랜 관리')).toBeVisible();
    await expect(page.getByText('Fit SaaS 서비스 구독 현황을 관리하고 결제 내역을 확인합니다.')).toBeVisible();
  });

  test('구독 현황 / 요금제 비교 / 결제 이력 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '구독 현황' })).toBeVisible();
    await expect(page.getByRole('button', { name: '요금제 비교' })).toBeVisible();
    await expect(page.getByRole('button', { name: '결제 이력' })).toBeVisible();
  });

  test('현재 플랜 정보가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('현재 플랜')).toBeVisible();
    await expect(page.getByText('Fit Pro Plan')).toBeVisible();
    await expect(page.getByText('구독 중')).toBeVisible();
  });

  test('사용량 현황이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('플랜 사용량 현황')).toBeVisible();
    await expect(page.getByText('회원 수')).toBeVisible();
    await expect(page.getByText('지점 수')).toBeVisible();
    await expect(page.getByText('직원 계정')).toBeVisible();
    await expect(page.getByText('메시지 포인트')).toBeVisible();
  });

  test('플랜 변경하기 버튼이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByRole('button', { name: '플랜 변경하기' })).toBeVisible();
  });

  test('요금제 비교 탭 클릭 시 플랜 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '요금제 비교' }).click();
    await expect(page.getByText('Starter')).toBeVisible();
    await expect(page.getByText('Pro').first()).toBeVisible();
    await expect(page.getByText('Enterprise')).toBeVisible();
    await expect(page.getByText('현재 이용 중인 플랜')).toBeVisible();
  });
});

// ============================================================
// 11. 지점 관리 (/branches)
// ============================================================
test.describe('지점 관리', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/branches');
    await page.waitForLoadState('networkidle');
  });

  test('페이지 로드 시 "지점 관리 (멀티지점)" 타이틀이 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('지점 관리 (멀티지점)')).toBeVisible();
    await expect(page.getByText('전체 지점의 운영 현황을 통합 관리하고 지점 간 데이터 이동을 처리합니다.')).toBeVisible();
  });

  test('지점 목록 / 통합 현황 / 지점 간 이동 탭이 존재한다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('지점 목록')).toBeVisible();
    await expect(page.getByText('통합 현황')).toBeVisible();
    await expect(page.getByText('지점 간 이동')).toBeVisible();
  });

  test('지점 목록 테이블에 데이터가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('지점 현황 목록')).toBeVisible();
    await expect(page.getByText('FitGenie CRM 종각점').first()).toBeVisible();
    await expect(page.getByText('FitGenie CRM 강남점').first()).toBeVisible();
    await expect(page.getByText('FitGenie CRM 여의도점').first()).toBeVisible();
  });

  test('통계 카드가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.getByText('총 지점 수')).toBeVisible();
    await expect(page.getByText('총 회원 수')).toBeVisible();
    await expect(page.getByText('이번 달 매출')).toBeVisible();
    await expect(page.getByText('활성 지점')).toBeVisible();
  });

  test('신규 지점 등록 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '신규 지점 등록' }).click();
    await expect(page.getByText('신규 지점 등록').nth(1)).toBeVisible();
    await expect(page.getByPlaceholder('예: FitGenie CRM 광화문점')).toBeVisible();
  });

  test('지점 이동 신청 버튼 클릭 시 모달이 열린다', async ({ page }) => {
    test.setTimeout(10_000);
    await page.getByRole('button', { name: '지점 이동 신청' }).click();
    await expect(page.getByText('회원 지점 이동 신청')).toBeVisible();
  });

  test('지점 상태 뱃지(운영중/임시휴업)가 표시된다', async ({ page }) => {
    test.setTimeout(10_000);
    await expect(page.locator('span').filter({ hasText: '운영중' }).first()).toBeVisible();
    await expect(page.locator('span').filter({ hasText: '임시휴업' }).first()).toBeVisible();
  });
});

