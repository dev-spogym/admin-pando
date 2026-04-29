'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCcw, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Payment {
  id: number;
  memberId: number;
  memberName: string;
  productId: number | null;
  product: string;
  amount: number;
  paidAt: string;
  method: string;
  type: string;
  round: string | null;
  staffId: number | null;
  staffName: string | null;
  durationMonths: number | null;
}

const cancelReasons = ['단순 변심', '서비스 불만족', '중복 결제', '기타'];
const METHOD_KO: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MILEAGE: '마일리지',
};

type ActionType = 'cancel' | 'partial';
type ResultStatus = 'success' | null;

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') ?? 1) || 1;
};

const approvalNo = () => `RF${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 9000) + 1000}`;

export default function CancelRefundPage() {
  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [action, setAction] = useState<ActionType>('cancel');
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState(cancelReasons[0]);
  const [result, setResult] = useState<ResultStatus>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sales')
      .select('id, memberId, memberName, productId, productName, amount, saleDate, paymentMethod, type, round, staffId, staffName, durationMonths')
      .eq('branchId', getBranchId())
      .eq('status', 'COMPLETED')
      .gt('amount', 0)
      .order('saleDate', { ascending: false })
      .limit(150);

    setLoading(false);

    if (error) {
      toast.error(`결제 내역 조회 실패: ${error.message}`);
      return;
    }

    setPayments((data ?? []).map((row: Record<string, unknown>) => ({
      id: Number(row.id),
      memberId: Number(row.memberId),
      memberName: String(row.memberName ?? ''),
      productId: row.productId == null ? null : Number(row.productId),
      product: String(row.productName ?? row.type ?? '상품 미지정'),
      amount: Math.round(Number(row.amount) || 0),
      paidAt: String(row.saleDate ?? '').slice(0, 10),
      method: String(row.paymentMethod ?? 'CARD'),
      type: String(row.type ?? '환불'),
      round: row.round == null ? null : String(row.round),
      staffId: row.staffId == null ? null : Number(row.staffId),
      staffName: row.staffName == null ? null : String(row.staffName),
      durationMonths: row.durationMonths == null ? null : Number(row.durationMonths),
    })));
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filtered = payments.filter(
    (p) => p.memberName.includes(query) || String(p.id).includes(query) || p.product.includes(query)
  );

  async function handleSubmit() {
    if (!selected) return;
    const refundAmount = action === 'cancel' ? selected.amount : Number(partialAmount);
    if (!refundAmount || refundAmount <= 0 || refundAmount > selected.amount) {
      toast.error('환불 금액을 확인해 주세요.');
      return;
    }

    const { error } = await supabase.from('sales').insert({
      memberId: selected.memberId,
      memberName: selected.memberName,
      productId: selected.productId,
      productName: selected.product,
      saleDate: new Date().toISOString(),
      type: '환불',
      round: action === 'cancel' ? '환불' : '부분환불',
      quantity: 1,
      originalPrice: refundAmount,
      salePrice: refundAmount,
      discountPrice: 0,
      amount: refundAmount,
      paymentMethod: selected.method,
      paymentType: action === 'cancel' ? '전체환불' : '부분환불',
      cash: selected.method === 'CASH' || selected.method === 'TRANSFER' ? refundAmount : 0,
      card: selected.method === 'CARD' ? refundAmount : 0,
      mileageUsed: 0,
      approvalNo: approvalNo(),
      status: 'REFUNDED',
      unpaid: 0,
      staffId: selected.staffId,
      staffName: selected.staffName,
      memo: `${action === 'cancel' ? '전체 취소' : '부분 환불'}: 원매출 #${selected.id}`,
      durationMonths: selected.durationMonths,
      saleCategory: '환불',
      receiptIssued: false,
      penaltyAmount: 0,
      branchId: getBranchId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      originalSaleId: selected.id,
      refundReason: reason,
      refundProcessedBy: 'ADMIN',
      refundProcessedAt: new Date().toISOString(),
    });

    if (error) {
      toast.error(`환불 처리 실패: ${error.message}`);
      return;
    }

    setResult('success');
    toast.success('환불 처리가 완료되었습니다.');
    setTimeout(() => {
      setResult(null);
      setSelected(null);
      setPartialAmount('');
      setReason(cancelReasons[0]);
    }, 2000);
    fetchPayments();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <RefreshCcw className="w-6 h-6 text-red-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">결제 취소 / 부분 환불</h1>
          <p className="text-sm text-gray-500">결제 내역을 조회하고 취소 또는 부분 환불을 처리합니다.</p>
        </div>
      </div>

      {/* 결제 조회 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">1. 결제 조회</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); setResult(null); }}
            placeholder="회원명, 결제번호, 상품명으로 검색"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {loading && <p className="text-sm text-gray-400">결제 내역을 불러오는 중입니다.</p>}
        {query && !loading && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">결제번호</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">회원명</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">상품</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">금액</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">결제일</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">수단</th>
                  <th className="text-center px-4 py-2 font-medium text-gray-600">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-6 text-gray-400">검색 결과가 없습니다.</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${selected?.id === p.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">SALE-{p.id}</td>
                    <td className="px-4 py-3 text-gray-900">{p.memberName}</td>
                    <td className="px-4 py-3 text-gray-600">{p.product}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{p.amount.toLocaleString()}원</td>
                    <td className="px-4 py-3 text-center text-gray-500">{p.paidAt}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{METHOD_KO[p.method] ?? p.method}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setSelected(p); setResult(null); }}
                        className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                          selected?.id === p.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {selected?.id === p.id ? '선택됨' : '선택'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 취소/환불 처리 폼 */}
      {selected && !result && (
        <div className="bg-white border rounded-xl p-5 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">2. 취소 / 환불 처리</h2>

          {/* 선택된 결제 요약 */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-gray-900">{selected.memberName}</span>
              <span className="text-gray-500 ml-2">{selected.product}</span>
            </div>
            <span className="font-bold text-gray-900">{selected.amount.toLocaleString()}원</span>
          </div>

          {/* 처리 유형 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">처리 유형</p>
            <div className="flex gap-3">
              {([['cancel', '전체 취소'], ['partial', '부분 환불']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setAction(val)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    action === val
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 부분 환불 금액 */}
          {action === 'partial' && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">환불 금액</label>
              <div className="relative">
                <input
                  type="number"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="환불할 금액 입력"
                  max={selected.amount}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">원</span>
              </div>
              {partialAmount && Number(partialAmount) > selected.amount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> 결제 금액을 초과할 수 없습니다.
                </p>
              )}
            </div>
          )}

          {/* 사유 선택 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">취소 사유</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {cancelReasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>

          {/* 제출 */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={action === 'partial' && (!partialAmount || Number(partialAmount) > selected.amount)}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {action === 'cancel' ? '전체 취소 처리' : '부분 환불 처리'}
            </button>
          </div>
        </div>
      )}

      {/* 처리 결과 */}
      {result === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">처리가 완료되었습니다.</p>
            <p className="text-xs text-green-600 mt-0.5">환불 금액은 결제 수단에 따라 영업일 기준 1~5일 내 처리됩니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
