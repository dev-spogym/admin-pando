import { test, expect } from '@playwright/test';

// 로그인 헬퍼
async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('아이디를 입력하세요').fill('admin');
  await page.getByPlaceholder('비밀번호를 입력하세요').fill('password123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('/', { timeout: 5_000 });
}

// ============================================================
// 1. 매출 관리 인터랙션 (/sales)
// ============================================================
test.describe('매출 관리 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
  });

  test('날짜 프리셋 (오늘) 클릭 → 활성 상태', async ({ page }) => {
    const btn = page.getByRole('button', { name: '오늘' });
    await btn.click();
    await expect(btn).toHaveClass(/bg-primary/);
    // 이번달은 비활성
    await expect(page.getByRole('button', { name: '이번달' })).not.toHaveClass(/bg-primary/);
  });

  test('날짜 프리셋 (이번주) 클릭 → 활성 상태', async ({ page }) => {
    const btn = page.getByRole('button', { name: '이번주' });
    await btn.click();
    await expect(btn).toHaveClass(/bg-primary/);
    await expect(page.getByRole('button', { name: '이번달' })).not.toHaveClass(/bg-primary/);
  });

  test('날짜 프리셋 (이번달) 기본 활성 상태', async ({ page }) => {
    const btn = page.getByRole('button', { name: '이번달' });
    await expect(btn).toHaveClass(/bg-primary/);
  });

  test('검색 입력 후 debounce → 테이블 필터링', async ({ page }) => {
    const searchInput = page.getByPlaceholder('구매자 또는 상품명 검색...');
    await searchInput.fill('김태희');
    // debounce 300ms 대기
    await page.waitForTimeout(400);
    await expect(page.getByText('헬스 12개월권')).toBeVisible();
    // 김태희와 관련 없는 항목은 보이지 않아야 한다
    await expect(page.getByText('1:1 PT 20회')).not.toBeVisible();
  });

  test('탭 전환 (환불 내역) → 테이블 변경', async ({ page }) => {
    // 환불 내역 탭 클릭
    await page.getByText('환불 내역').click();
    // 환불 상태인 항목만 표시 (프리미엄 12개월권이 환불 상태)
    await expect(page.getByText('프리미엄 12개월권')).toBeVisible();
    // 완료 상태 항목은 숨김
    await expect(page.getByText('헬스 12개월권')).not.toBeVisible();
  });

  test('탭 전환 (미납 내역) → 미납 항목만 표시', async ({ page }) => {
    await page.getByText('미납 내역').click();
    await expect(page.getByText('모닝 특별권 3개월')).toBeVisible();
    // 미납 아닌 항목은 숨김
    await expect(page.getByText('헬스 12개월권')).not.toBeVisible();
  });

  test('엑셀 다운로드 버튼 클릭 → alert', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('엑셀 다운로드');
      await dialog.accept();
    });
    await page.getByRole('button', { name: /엑셀 다운로드/ }).click();
  });

  test('POS 결제 버튼 → /pos/payment 이동', async ({ page }) => {
    await page.getByRole('button', { name: /신규 결제/ }).click();
    await page.waitForURL(/\/pos\/payment/, { timeout: 5_000 });
  });

  test('하단 요약 바 데이터 확인', async ({ page }) => {
    // 하단 요약 바에 총 매출액, 순 매출액 등이 표시되는지 확인
    await expect(page.getByText('총 매출액')).toBeVisible();
    await expect(page.getByText('순 매출액')).toBeVisible();
    await expect(page.getByText('현금 합계')).toBeVisible();
    await expect(page.getByText('카드 합계')).toBeVisible();
    await expect(page.getByText('마일리지 합계')).toBeVisible();
    await expect(page.getByText('환불 금액')).toBeVisible();
    await expect(page.getByText('미납금')).toBeVisible();
    await expect(page.getByText('할인 합계')).toBeVisible();
  });
});

// ============================================================
// 2. POS 인터랙션 (/pos)
// ============================================================
test.describe('POS 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pos');
    await page.waitForLoadState('networkidle');
  });

  test('카테고리 탭 각각 클릭 → 상품 필터링 (이용권)', async ({ page }) => {
    // 기본 이용권 탭
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
    await expect(page.getByText('헬스 3개월권')).toBeVisible();
  });

  test('카테고리 탭 PT 클릭 → PT 상품만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /^PT/ }).first().click();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
    await expect(page.getByText('1:1 PT 10회 패키지')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('카테고리 탭 GX 클릭 → GX 상품만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /^GX/ }).first().click();
    await expect(page.getByText('그룹 필라테스 20회')).toBeVisible();
    await expect(page.getByText('요가 10회')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('카테고리 탭 기타 클릭 → 기타 상품만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /기타/ }).first().click();
    await expect(page.getByText('개인 락커 1개월')).toBeVisible();
    await expect(page.getByText('프로틴 쉐이크 (초코)')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('상품 카드 클릭 → 장바구니에 추가됨', async ({ page }) => {
    await expect(page.getByText('장바구니가 비어 있습니다.')).toBeVisible();
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    await expect(page.getByText('장바구니가 비어 있습니다.')).not.toBeVisible();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    await expect(cartSection.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
  });

  test('같은 상품 다시 클릭 → 수량 +1', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    const quantitySpan = cartSection.locator('span.text-center.tabular-nums');
    await expect(quantitySpan).toHaveText('1');

    // 같은 상품 다시 클릭
    await page.getByText('헬스 12개월 (연간 회원권)').first().click();
    await expect(quantitySpan).toHaveText('2');
  });

  test('장바구니 수량 + 버튼 → 수량 증가 + 합계 변경', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    const quantitySpan = cartSection.locator('span.text-center.tabular-nums');

    // + 클릭
    await cartSection.getByRole('button', { name: '+' }).click();
    await expect(quantitySpan).toHaveText('2');

    // 합계 확인 (660,000 x 2 = 1,320,000)
    const cartFooter = cartSection.locator('.border-t.border-line');
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('1,320,000');
  });

  test('장바구니 수량 - 버튼 → 수량 감소', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    const quantitySpan = cartSection.locator('span.text-center.tabular-nums');

    // 수량을 2로 올리고
    await cartSection.getByRole('button', { name: '+' }).click();
    await expect(quantitySpan).toHaveText('2');

    // - 클릭
    await cartSection.getByRole('button', { name: '−' }).click();
    await expect(quantitySpan).toHaveText('1');
  });

  test('수량 1에서 X 클릭 → 아이템 제거', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    await expect(cartSection.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();

    // X 버튼으로 제거 (handleRemove)
    await cartSection.locator('button').filter({ has: page.locator('svg.lucide-x') }).click();
    await expect(page.getByText('장바구니가 비어 있습니다.')).toBeVisible();
  });

  test('장바구니 비었을 때 결제 버튼 disabled', async ({ page }) => {
    const payBtn = page.getByRole('button', { name: /결제하기/ });
    await expect(payBtn).toBeDisabled();
  });

  test('장바구니 있을 때 결제 버튼 enabled → 클릭 → /pos/payment', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const payBtn = page.getByRole('button', { name: /결제하기/ });
    await expect(payBtn).toBeEnabled();
    await payBtn.click();
    await page.waitForURL(/\/pos\/payment/, { timeout: 5_000 });
  });

  test('현금/카드 토글 동작', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');

    // 기본 현금 선택됨
    const cashBtn = cartSection.getByRole('button', { name: '현금' });
    const cardBtn = cartSection.getByRole('button', { name: '카드' });
    await expect(cashBtn).toHaveClass(/bg-primary/);

    // 카드로 전환
    await cardBtn.click();
    await expect(cardBtn).toHaveClass(/bg-primary/);
    await expect(cashBtn).not.toHaveClass(/bg-primary/);

    // 합계가 카드가로 변경됨 (726,000)
    const cartFooter = cartSection.locator('.border-t.border-line');
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('726,000');
  });

  test('합계 금액 자동 계산 확인', async ({ page }) => {
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    const cartFooter = cartSection.locator('.border-t.border-line');

    // 초기 합계 0
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('0');

    // 상품 추가
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('660,000');
  });
});

// ============================================================
// 3. 결제 인터랙션 (/pos/payment)
// ============================================================
test.describe('결제 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/pos/payment');
    await page.waitForLoadState('networkidle');
  });

  test('회원 검색 (입력 → 자동완성)', async ({ page }) => {
    const searchInput = page.getByPlaceholder('이름 또는 전화번호 검색...');
    await searchInput.fill('홍');
    // 자동완성 목록에 홍길동 표시
    await expect(page.getByText('홍길동')).toBeVisible();
    await expect(page.getByText('010-1234-5678')).toBeVisible();
  });

  test('회원 검색 → 선택 → 선택된 회원 표시', async ({ page }) => {
    const searchInput = page.getByPlaceholder('이름 또는 전화번호 검색...');
    await searchInput.fill('홍');
    // 홍길동 클릭
    await page.getByText('010-1234-5678').click();
    // 선택된 회원 정보 표시
    await expect(page.getByText('12,500 P')).toBeVisible();
  });

  test('결제수단 Radio 각각 클릭 (카드)', async ({ page }) => {
    const cardBtn = page.getByRole('button', { name: '카드', exact: true });
    await expect(cardBtn).toHaveClass(/border-primary/);
  });

  test('결제수단 Radio 각각 클릭 (현금)', async ({ page }) => {
    const cashBtn = page.getByRole('button', { name: '현금', exact: true });
    await cashBtn.click();
    await expect(cashBtn).toHaveClass(/border-primary/);
  });

  test('결제수단 Radio 각각 클릭 (마일리지)', async ({ page }) => {
    const mileageBtn = page.getByRole('button', { name: '마일리지', exact: true });
    await mileageBtn.click();
    await expect(mileageBtn).toHaveClass(/border-primary/);
    // 마일리지 안내 메시지 표시
    await expect(page.getByText('마일리지 결제는 회원 검색 후 이용 가능합니다.')).toBeVisible();
  });

  test('결제수단 Radio 각각 클릭 (복합결제)', async ({ page }) => {
    const mixedBtn = page.getByRole('button', { name: '복합결제', exact: true });
    await mixedBtn.click();
    await expect(mixedBtn).toHaveClass(/border-primary/);
  });

  test('복합 결제 시 금액 분배 입력 필드 표시', async ({ page }) => {
    await page.getByRole('button', { name: '복합결제', exact: true }).click();
    // 금액 분배 필드가 표시됨
    await expect(page.getByText('결제수단별 금액 입력')).toBeVisible();
  });

  test('결제 확인 버튼 → 확인 모달 표시', async ({ page }) => {
    // 카드 결제는 기본 유효하므로 결제 확인 가능
    const confirmBtn = page.getByRole('button', { name: /결제 확인/ });
    await confirmBtn.click();
    // 모달에 결제 완료, 취소 버튼 표시
    await expect(page.getByRole('button', { name: '결제 완료' })).toBeVisible();
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
  });

  test('모달에서 취소 클릭 → 모달 닫힘', async ({ page }) => {
    await page.getByRole('button', { name: /결제 확인/ }).click();
    await expect(page.getByRole('button', { name: '결제 완료' })).toBeVisible();
    // 취소 클릭
    await page.getByRole('button', { name: '취소' }).click();
    // 모달 닫힘
    await expect(page.getByRole('button', { name: '결제 완료' })).not.toBeVisible();
  });

  test('모달에서 결제 완료 클릭 → 완료 화면', async ({ page }) => {
    await page.getByRole('button', { name: /결제 확인/ }).click();
    await page.getByRole('button', { name: '결제 완료' }).click();
    // 결제 완료 화면
    await expect(page.getByText('결제가 완료되었습니다')).toBeVisible();
  });

  test('영수증 출력 버튼 (결제 완료 후)', async ({ page }) => {
    // 결제 완료 흐름
    await page.getByRole('button', { name: /결제 확인/ }).click();
    await page.getByRole('button', { name: '결제 완료' }).click();
    await expect(page.getByText('결제가 완료되었습니다')).toBeVisible();

    // 영수증 출력 버튼 확인 + 클릭
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('영수증');
      await dialog.accept();
    });
    await page.getByText('영수증 출력').click();
  });
});

// ============================================================
// 4. 상품 목록 인터랙션 (/products)
// ============================================================
test.describe('상품 목록 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
  });

  test('카테고리 탭 전체 → 모든 상품 표시', async ({ page }) => {
    await expect(page.getByRole('button', { name: /전체/ }).first()).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
  });

  test('카테고리 탭 이용권 클릭 → 이용권만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /이용권/ }).first().click();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
    await expect(page.getByText('1:1 PT 20회 패키지')).not.toBeVisible();
  });

  test('카테고리 탭 PT 클릭 → PT만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /^PT/ }).first().click();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('카테고리 탭 GX 클릭 → GX만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /^GX/ }).first().click();
    await expect(page.getByText('그룹 필라테스 20회')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('카테고리 탭 기타 클릭 → 기타만 표시', async ({ page }) => {
    await page.getByRole('button', { name: /기타/ }).first().click();
    await expect(page.getByText('개인 락커 1개월')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('키오스크 노출 토글 ON/OFF → 상태 변경', async ({ page }) => {
    const toggles = page.locator('button[title*="클릭하여"]');
    const firstToggle = toggles.first();
    await expect(firstToggle).toBeVisible();

    // 초기 상태 확인 (노출 중 = bg-accent)
    const initialClass = await firstToggle.getAttribute('class');
    const wasOn = initialClass?.includes('bg-accent');

    // 클릭하여 토글
    await firstToggle.click();

    // 상태가 변경됨
    if (wasOn) {
      await expect(firstToggle).toHaveClass(/bg-line/);
    } else {
      await expect(firstToggle).toHaveClass(/bg-accent/);
    }

    // 다시 클릭하여 원래 상태로
    await firstToggle.click();
    if (wasOn) {
      await expect(firstToggle).toHaveClass(/bg-accent/);
    } else {
      await expect(firstToggle).toHaveClass(/bg-line/);
    }
  });

  test('상품 등록 버튼 클릭 → /products/new 또는 /members/edit 이동', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /상품 등록/ });
    await addBtn.click();
    // moveToPage(987) → /members/edit (현재 매핑)
    await page.waitForURL(/\/(members\/edit|products\/new)/, { timeout: 5_000 });
  });
});

// ============================================================
// 5. 상품 등록 인터랙션 (/products/new)
// ============================================================
test.describe('상품 등록 인터랙션', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
  });

  test('유형 선택 (이용권) 클릭 → 폼 화면 전환', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    await expect(page.getByText('이용권 등록')).toBeVisible();
    await expect(page.getByText('등록할 상품의 유형을 선택해주세요.')).not.toBeVisible();
  });

  test('유형 선택 (PT) 클릭 → PT 등록 폼', async ({ page }) => {
    await page.getByText('1:1 개인 레슨 횟수권').click();
    await expect(page.getByText('PT 등록')).toBeVisible();
  });

  test('유형 선택 (GX) 클릭 → GX 등록 폼', async ({ page }) => {
    await page.getByText('그룹 수업 횟수권').click();
    await expect(page.getByText('GX 등록')).toBeVisible();
  });

  test('유형 선택 (기타) 클릭 → 기타 등록 폼', async ({ page }) => {
    await page.getByText('락커, 운동복, 일반 상품').click();
    await expect(page.getByText('기타 등록')).toBeVisible();
  });

  test('PT 선택 시 총 횟수 필드가 표시됨', async ({ page }) => {
    await page.getByText('1:1 개인 레슨 횟수권').click();
    await expect(page.getByText('총 횟수 (회)')).toBeVisible();
  });

  test('이용권 선택 시 총 횟수 필드가 없음', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    await expect(page.getByText('총 횟수 (회)')).not.toBeVisible();
  });

  test('GX 선택 시 요일 안내 표시됨', async ({ page }) => {
    await page.getByText('그룹 수업 횟수권').click();
    await expect(page.getByText('GX 수업은 수강 가능 요일을 이용 시간 구간에서 설정하세요.')).toBeVisible();
  });

  test('상품명 입력 → 중복 체크 (사용 가능)', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('새로운 상품');
    await expect(page.getByText('사용 가능한 상품명입니다.')).toBeVisible();
  });

  test('상품명 입력 → 중복 체크 (이미 존재)', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill('헬스 12개월 (연간 회원권)');
    await expect(page.getByText(/이미 존재합니다/)).toBeVisible();
  });

  test('가격 입력 → 천단위 콤마 포맷', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    const cashInput = page.locator('input[name="priceCash"]');
    await cashInput.fill('1500000');
    await expect(cashInput).toHaveValue('1,500,000');
  });

  test('필수 항목 미입력 → 에러 메시지', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();
    // 빈 폼으로 등록 시도
    await page.getByRole('button', { name: /상품 등록하기/ }).first().click();
    await expect(page.getByText('상품명을 입력해주세요.')).toBeVisible();
    await expect(page.getByText('현금가를 입력해주세요.')).toBeVisible();
    await expect(page.getByText('카드가를 입력해주세요.')).toBeVisible();
    await expect(page.getByText('이용기간을 입력해주세요.')).toBeVisible();
  });

  test('저장 버튼 동작 (유효한 폼)', async ({ page }) => {
    await page.getByText('헬스 등 기간 이용권').click();

    // 필수 필드 입력
    await page.locator('input[name="name"]').fill('테스트 상품');
    await page.locator('input[name="priceCash"]').fill('100000');
    await page.locator('input[name="priceCard"]').fill('110000');
    await page.locator('input[name="period"]').fill('12');

    // 저장 시 alert
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('등록되었습니다');
      await dialog.accept();
    });
    await page.getByRole('button', { name: /상품 등록하기/ }).first().click();
  });

  test('취소하고 목록으로 버튼', async ({ page }) => {
    const cancelBtn = page.getByText('취소하고 목록으로');
    await expect(cancelBtn).toBeVisible();
    await cancelBtn.click();
    // /products로 이동 (moveToPage(972))
    await page.waitForURL(/\/products/, { timeout: 5_000 });
  });
});
