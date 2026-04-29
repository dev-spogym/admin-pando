import { NextRequest, NextResponse } from 'next/server';
import { randomBool, randomInt, randomPick, supabaseAdmin } from '@/lib/simulator/utils';

const REFUND_REASONS = ['단순 변심', '서비스 불만족', '중복 결제', '이사/개인사정', '결제 오류'] as const;
const CARD_COMPANIES = ['신한카드', '국민카드', '현대카드', '삼성카드', '롯데카드'] as const;

type SaleCandidate = {
  id: number;
  memberId: number;
  memberName: string;
  productId: number | null;
  productName: string | null;
  type: string;
  round: string | null;
  quantity: number;
  originalPrice: number;
  salePrice: number;
  amount: number;
  paymentMethod: 'CARD' | 'CASH' | 'TRANSFER' | 'MILEAGE';
  staffId: number | null;
  staffName: string | null;
  durationMonths: number | null;
};

function money(value: unknown) {
  return Math.round(Number(value) || 0);
}

function approvalNo() {
  return `RF${Date.now().toString().slice(-6)}${randomInt(1000, 9999)}`;
}

function cardNumber() {
  return `****-****-****-${randomInt(1000, 9999)}`;
}

// POST /api/simulate/refunds
// 실제 완료 매출을 원매출로 연결한 환불 row를 1-3건 생성한다.
export async function POST(req: NextRequest) {
  const { branchId = 1 } = (await req.json().catch(() => ({}))) as { branchId?: number };

  const { data: existingRefunds } = await supabaseAdmin
    .from('sales')
    .select('originalSaleId')
    .eq('branchId', branchId)
    .eq('status', 'REFUNDED')
    .not('originalSaleId', 'is', null)
    .limit(2000);

  const refundedOriginalIds = new Set(
    (existingRefunds ?? [])
      .map(row => Number((row as { originalSaleId?: unknown }).originalSaleId))
      .filter(Boolean),
  );

  const { data: sales, error } = await supabaseAdmin
    .from('sales')
    .select('id, memberId, memberName, productId, productName, type, round, quantity, originalPrice, salePrice, amount, paymentMethod, staffId, staffName, durationMonths')
    .eq('branchId', branchId)
    .eq('status', 'COMPLETED')
    .gt('amount', 0)
    .order('saleDate', { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json({ ok: false, inserted: 0, details: [`매출 조회 실패: ${error.message}`] });
  }

  const candidates = ((sales ?? []) as unknown as SaleCandidate[])
    .filter(sale => !refundedOriginalIds.has(Number(sale.id)) && money(sale.amount) > 0);

  if (candidates.length === 0) {
    return NextResponse.json({ ok: false, inserted: 0, details: ['환불 가능한 완료 매출 없음'] });
  }

  const count = Math.min(randomInt(1, 3), candidates.length);
  const selected = [...candidates].sort(() => Math.random() - 0.5).slice(0, count);
  const details: string[] = [];
  let inserted = 0;

  for (const sale of selected) {
    const fullRefund = randomBool(0.7);
    const baseAmount = money(sale.amount);
    const refundAmount = fullRefund ? baseAmount : Math.max(10000, Math.round(baseAmount * randomInt(25, 75) / 100));
    const penaltyAmount = fullRefund ? randomInt(0, 3) * 10000 : 0;
    const netRefundAmount = Math.max(0, refundAmount - penaltyAmount);
    const paymentMethod = sale.paymentMethod ?? 'CARD';

    const { error: insertError } = await supabaseAdmin.from('sales').insert({
      memberId: sale.memberId,
      memberName: sale.memberName,
      productId: sale.productId,
      productName: sale.productName,
      saleDate: new Date().toISOString(),
      type: '환불',
      round: fullRefund ? '환불' : '부분환불',
      quantity: 1,
      originalPrice: refundAmount,
      salePrice: netRefundAmount,
      discountPrice: 0,
      amount: netRefundAmount,
      paymentMethod,
      paymentType: fullRefund ? '전체환불' : '부분환불',
      cash: paymentMethod === 'CASH' || paymentMethod === 'TRANSFER' ? netRefundAmount : 0,
      card: paymentMethod === 'CARD' ? netRefundAmount : 0,
      mileageUsed: 0,
      cardCompany: paymentMethod === 'CARD' ? randomPick(CARD_COMPANIES) : null,
      cardNumber: paymentMethod === 'CARD' ? cardNumber() : null,
      approvalNo: approvalNo(),
      status: 'REFUNDED',
      unpaid: 0,
      staffId: sale.staffId,
      staffName: sale.staffName,
      memo: `시뮬레이션 ${fullRefund ? '전체 환불' : '부분 환불'}: 원매출 #${sale.id}`,
      durationMonths: sale.durationMonths,
      saleCategory: '환불',
      receiptIssued: false,
      penaltyAmount,
      branchId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalSaleId: sale.id,
      refundReason: randomPick(REFUND_REASONS),
      refundProcessedBy: 'SIMULATOR',
      refundProcessedAt: new Date().toISOString(),
    });

    if (insertError) {
      details.push(`[FAIL] ${sale.memberName} / 원매출 #${sale.id}: ${insertError.message}`);
      continue;
    }

    inserted += 1;
    details.push(`[OK] 환불 생성: ${sale.memberName} / ${sale.productName ?? sale.type} / ${netRefundAmount.toLocaleString()}원 / 원매출 #${sale.id}`);
  }

  return NextResponse.json({ ok: inserted > 0, inserted, details });
}
