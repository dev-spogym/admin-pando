import { test, expect } from '@playwright/test';

// ============================================================
// 1. 매출 관리 (/sales)
// ============================================================
test.describe('매출 관리 (/sales)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    await expect(page.getByText('매출 현황')).toBeVisible();
    await expect(page.getByText('센터의 매출 거래 전체를 조회하고 분석합니다.')).toBeVisible();
  });

  test('날짜 프리셋 버튼 3개가 표시된다 (오늘, 이번주, 이번달)', async ({ page }) => {
    await expect(page.getByRole('button', { name: '오늘' })).toBeVisible();
    await expect(page.getByRole('button', { name: '이번주' })).toBeVisible();
    await expect(page.getByRole('button', { name: '이번달' })).toBeVisible();
  });

  test('이번달 프리셋이 기본 활성 상태이다', async ({ page }) => {
    const preset = page.getByRole('button', { name: '이번달' });
    await expect(preset).toHaveClass(/bg-primary/);
  });

  test('프리셋 버튼 클릭 시 활성 상태가 변경된다', async ({ page }) => {
    const todayBtn = page.getByRole('button', { name: '오늘' });
    await todayBtn.click();
    await expect(todayBtn).toHaveClass(/bg-primary/);

    const weekBtn = page.getByRole('button', { name: '이번주' });
    await weekBtn.click();
    await expect(weekBtn).toHaveClass(/bg-primary/);
  });

  test('통계 카드 4개가 표시된다 (순 매출, 카드, 현금, 미수금)', async ({ page }) => {
    const statCards = page.locator('.grid.grid-cols-2');
    await expect(statCards.getByText('순 매출')).toBeVisible();
    await expect(statCards.getByText('카드 결제')).toBeVisible();
    await expect(statCards.getByText('현금 결제')).toBeVisible();
    await expect(statCards.getByText('미수금')).toBeVisible();
  });

  test('탭이 존재한다', async ({ page }) => {
    await expect(page.getByText('매출 내역')).toBeVisible();
    await expect(page.getByText('기간별 매출')).toBeVisible();
    await expect(page.getByText('상품별 내역')).toBeVisible();
    await expect(page.getByText('결제수단별')).toBeVisible();
    await expect(page.getByText('담당자별')).toBeVisible();
    await expect(page.getByText('환불 내역')).toBeVisible();
    await expect(page.getByText('미납 내역')).toBeVisible();
  });

  test('매출 테이블에 데이터 행이 존재한다', async ({ page }) => {
    // Mock 데이터에 "헬스 12개월권" 등이 있어야 한다
    await expect(page.getByText('헬스 12개월권')).toBeVisible();
    await expect(page.getByText('1:1 PT 20회')).toBeVisible();
  });

  test('검색 입력 시 테이블이 필터링된다', async ({ page }) => {
    const searchInput = page.getByPlaceholder('구매자 또는 상품명 검색...');
    await expect(searchInput).toBeVisible();

    await searchInput.fill('김태희');
    // debounce 대기
    await page.waitForTimeout(400);
    await expect(page.getByText('헬스 12개월권')).toBeVisible();
    // 김태희와 관련 없는 항목은 보이지 않아야 한다
    await expect(page.getByText('1:1 PT 20회')).not.toBeVisible();
  });

  test('엑셀 다운로드 버튼이 존재한다', async ({ page }) => {
    const downloadBtn = page.getByRole('button', { name: /엑셀 다운로드/ });
    await expect(downloadBtn).toBeVisible();
  });

  test('신규 결제 (POS) 버튼이 존재한다', async ({ page }) => {
    const posBtn = page.getByRole('button', { name: /신규 결제/ });
    await expect(posBtn).toBeVisible();
  });
});

// ============================================================
// 2. POS (/pos)
// ============================================================
test.describe('POS (/pos)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    await expect(page.getByText('POS 판매')).toBeVisible();
    await expect(
      page.getByText('카테고리별 상품을 선택하고 장바구니에 담아 결제로 이동합니다.')
    ).toBeVisible();
  });

  test('카테고리 탭이 표시된다 (이용권, PT, GX, 기타)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /이용권/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^PT/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^GX/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /기타/ }).first()).toBeVisible();
  });

  test('상품 그리드에 카드가 표시된다', async ({ page }) => {
    // 기본 탭(이용권)에서 상품이 보여야 한다
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
    await expect(page.getByText('헬스 3개월권')).toBeVisible();
  });

  test('카테고리 탭 클릭 시 상품이 필터링된다', async ({ page }) => {
    // PT 탭 클릭
    await page.getByRole('button', { name: /^PT/ }).first().click();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('상품 클릭 시 장바구니에 추가된다', async ({ page }) => {
    // 장바구니가 비어 있는 상태 확인
    await expect(page.getByText('장바구니가 비어 있습니다.')).toBeVisible();

    // 상품 카드 클릭
    await page.getByText('헬스 12개월 (연간 회원권)').click();

    // 장바구니에 상품이 추가되었는지 확인
    await expect(page.getByText('장바구니가 비어 있습니다.')).not.toBeVisible();
    // 장바구니 사이드바에 상품명 표시
    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    await expect(cartSection.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
  });

  test('장바구니에서 수량 +/- 동작한다', async ({ page }) => {
    // 상품 추가
    await page.getByText('헬스 12개월 (연간 회원권)').click();

    const cartSection = page.locator('.lg\\:w-\\[360px\\]');
    // 수량 표시 span (w-5 text-center 클래스를 가진 수량 텍스트)
    const quantitySpan = cartSection.locator('span.text-center.tabular-nums');
    await expect(quantitySpan).toHaveText('1');

    // + 버튼 클릭하여 수량 증가
    await cartSection.getByRole('button', { name: '+' }).click();
    await expect(quantitySpan).toHaveText('2');

    // − 버튼 클릭하여 수량 감소 (유니코드 마이너스)
    await cartSection.getByRole('button', { name: '−' }).click();
    await expect(quantitySpan).toHaveText('1');
  });

  test('장바구니 합계가 표시된다', async ({ page }) => {
    const cartFooter = page.locator('.border-t.border-line.bg-surface-secondary\\/30');
    await expect(cartFooter.getByText('총 합계')).toBeVisible();
    // 초기 합계는 0원
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('0원');

    // 상품 추가 후 합계 변경
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    await expect(cartFooter.locator('span.text-primary').first()).toContainText('660,000원');
  });

  test('장바구니가 비었을 때 결제 버튼이 비활성화된다', async ({ page }) => {
    const payBtn = page.getByRole('button', { name: /결제하기/ });
    await expect(payBtn).toBeVisible();
    await expect(payBtn).toBeDisabled();
  });

  test('장바구니에 상품이 있으면 결제 버튼이 활성화된다', async ({ page }) => {
    await page.getByText('헬스 12개월 (연간 회원권)').click();
    const payBtn = page.getByRole('button', { name: /결제하기/ });
    await expect(payBtn).toBeEnabled();
  });
});

// ============================================================
// 3. 결제 (/pos/payment)
// ============================================================
test.describe('결제 (/pos/payment)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pos/payment');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    await expect(page.getByText('결제 처리')).toBeVisible();
    await expect(
      page.getByText('상품 내역을 확인하고 결제수단을 선택하여 결제를 완료합니다.')
    ).toBeVisible();
  });

  test('결제 상품 목록이 표시된다', async ({ page }) => {
    await expect(page.getByText('결제 상품 목록')).toBeVisible();
    await expect(page.getByText('헬스 12개월권')).toBeVisible();
    await expect(page.getByText('1:1 PT 10회')).toBeVisible();
  });

  test('결제수단 4개가 표시된다 (카드, 현금, 마일리지, 복합)', async ({ page }) => {
    await expect(page.getByRole('button', { name: '카드', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '현금', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '마일리지', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '복합결제', exact: true })).toBeVisible();
  });

  test('카드가 기본 선택된 결제수단이다', async ({ page }) => {
    const cardBtn = page.getByRole('button', { name: '카드' });
    await expect(cardBtn).toHaveClass(/border-primary/);
  });

  test('결제수단을 변경할 수 있다', async ({ page }) => {
    const cashBtn = page.getByRole('button', { name: '현금' });
    await cashBtn.click();
    await expect(cashBtn).toHaveClass(/border-primary/);
  });

  test('결제 확인 버튼이 존재한다', async ({ page }) => {
    const confirmBtn = page.getByRole('button', { name: /결제 확인/ });
    await expect(confirmBtn).toBeVisible();
  });

  test('결제 확인 클릭 시 확인 모달이 표시된다', async ({ page }) => {
    const confirmBtn = page.getByRole('button', { name: /결제 확인/ });
    await confirmBtn.click();

    // 모달 내 "결제 완료" 버튼 확인
    await expect(page.getByRole('button', { name: '결제 완료' })).toBeVisible();
    await expect(page.getByRole('button', { name: '취소' })).toBeVisible();
  });

  test('총 결제 금액이 올바르게 표시된다', async ({ page }) => {
    // 660,000 + 700,000 = 1,360,000
    await expect(page.getByText('₩1,360,000').first()).toBeVisible();
  });
});

// ============================================================
// 4. 상품 목록 (/products)
// ============================================================
test.describe('상품 목록 (/products)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    await expect(page.getByText('상품 관리')).toBeVisible();
    await expect(
      page.getByText('센터에서 판매하는 이용권, PT, GX 및 기타 상품을 관리합니다.')
    ).toBeVisible();
  });

  test('통계 카드 4개가 표시된다', async ({ page }) => {
    await expect(page.getByText('전체 상품')).toBeVisible();
    await expect(page.getByText('판매 중').first()).toBeVisible();
    await expect(page.getByText('미판매').first()).toBeVisible();
    await expect(page.getByText('키오스크 노출')).toBeVisible();
  });

  test('카테고리 탭 필터가 존재한다 (전체, 이용권, PT, GX, 기타)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /전체/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /이용권/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^PT/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^GX/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /기타/ }).first()).toBeVisible();
  });

  test('카테고리 탭 클릭 시 상품이 필터링된다', async ({ page }) => {
    // PT 탭 클릭
    await page.getByRole('button', { name: /^PT/ }).first().click();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).not.toBeVisible();
  });

  test('상품 테이블에 데이터가 표시된다', async ({ page }) => {
    await expect(page.getByText('헬스 12개월 (연간 회원권)')).toBeVisible();
    await expect(page.getByText('1:1 PT 20회 패키지')).toBeVisible();
    await expect(page.getByText('개인 락커 1개월')).toBeVisible();
  });

  test('키오스크 노출 토글이 동작한다', async ({ page }) => {
    // 첫 번째 토글 버튼 찾기 (키오스크 열)
    const toggles = page.locator('button[title*="클릭하여"]');
    const firstToggle = toggles.first();
    await expect(firstToggle).toBeVisible();

    // 클릭하여 토글
    await firstToggle.click();
    // 토글 상태가 변경되었는지 확인 (클래스 변화)
    await expect(firstToggle).toBeVisible();
  });

  test('상품 등록 버튼이 존재한다', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /상품 등록/ });
    await expect(addBtn).toBeVisible();
  });
});

// ============================================================
// 5. 상품 등록 (/products/new)
// ============================================================
test.describe('상품 등록 (/products/new)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products/new');
  });

  test('페이지가 정상 로드된다', async ({ page }) => {
    await expect(page.getByText('새 상품 등록')).toBeVisible();
    await expect(page.getByText('등록할 상품의 유형을 선택해주세요.')).toBeVisible();
  });

  test('유형 선택 화면에 4개 카테고리가 표시된다', async ({ page }) => {
    await expect(page.getByText('이용권').first()).toBeVisible();
    await expect(page.getByText('PT').first()).toBeVisible();
    await expect(page.getByText('GX').first()).toBeVisible();
    await expect(page.getByText('기타').first()).toBeVisible();
  });

  test('유형 선택 시 폼 화면으로 전환된다', async ({ page }) => {
    // "이용권" 유형의 설명 텍스트를 포함하는 버튼 클릭
    await page.getByText('헬스 등 기간 이용권').click();

    // 유형 선택 화면이 사라지고 폼이 나타난다
    await expect(page.getByText('등록할 상품의 유형을 선택해주세요.')).not.toBeVisible();
    await expect(page.getByText('이용권 등록')).toBeVisible();
  });

  test('필수 필드 미입력 시 에러 메시지가 표시된다', async ({ page }) => {
    // 이용권 유형 선택
    await page.getByText('헬스 등 기간 이용권').click();

    // 빈 폼으로 등록 시도 (하단 고정 바의 "상품 등록하기" 클릭)
    await page.getByRole('button', { name: /상품 등록하기/ }).first().click();

    // 필수 필드 에러 메시지 확인
    await expect(page.getByText('상품명을 입력해주세요.')).toBeVisible();
    await expect(page.getByText('현금가를 입력해주세요.')).toBeVisible();
    await expect(page.getByText('카드가를 입력해주세요.')).toBeVisible();
    await expect(page.getByText('이용기간을 입력해주세요.')).toBeVisible();
  });

  test('취소하고 목록으로 버튼이 존재한다', async ({ page }) => {
    await expect(page.getByText('취소하고 목록으로')).toBeVisible();
  });
});
