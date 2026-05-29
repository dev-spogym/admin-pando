'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { AlertCircle, Edit2, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePageSeed } from '@/hooks';
import type { ProductSeasonalPriceSeedPayload } from '@/lib/publishingPageSeed';

type SeasonStatus = '진행중' | '예정' | '종료';
type SeasonRow = ProductSeasonalPriceSeedPayload['seasonalPrices'][number] & {
  products?: string[];
  discountType?: '정액' | '정률';
};

const FALLBACK_SEASONAL_PRICE: ProductSeasonalPriceSeedPayload = {
  seasonalPrices: [
    { id: 1, name: '여름 특가', product: 'PT 10회권', original: 500000, discounted: 420000, rate: 16, start: '2026-06-01', end: '2026-08-31', status: '예정' },
    { id: 2, name: '신년 이벤트', product: '3개월 이용권', original: 180000, discounted: 150000, rate: 17, start: '2026-01-01', end: '2026-01-31', status: '종료' },
    { id: 3, name: '봄 프로모션', product: '필라테스 월정액', original: 120000, discounted: 99000, rate: 18, start: '2026-03-01', end: '2026-05-31', status: '진행중' },
    { id: 4, name: '가을 패키지', product: 'PT 20회권', original: 900000, discounted: 780000, rate: 13, start: '2026-09-01', end: '2026-11-30', status: '예정' },
  ],
};

// 시즌가 적용 가능한 상품 목록 (목업)
const PRODUCT_OPTIONS = [
  { name: 'PT 10회권', price: 500000 },
  { name: 'PT 20회권', price: 900000 },
  { name: '3개월 이용권', price: 180000 },
  { name: '6개월 이용권', price: 320000 },
  { name: '필라테스 월정액', price: 120000 },
  { name: '요가 10회권', price: 80000 },
];

const statusColor: Record<SeasonStatus, string> = {
  '진행중': 'bg-green-100 text-green-700',
  '예정': 'bg-blue-100 text-blue-700',
  '종료': 'bg-gray-100 text-gray-500',
};

// 시작/종료일 기준으로 상태 자동 계산 (docs4: 예정/진행중/종료)
const computeStatus = (start: string, end: string): SeasonStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (today < startDate) return '예정';
  if (today > endDate) return '종료';
  return '진행중';
};

type FormState = {
  id: number | null;
  name: string;
  products: string[];
  start: string;
  end: string;
  discountType: '정액' | '정률';
  amount: string; // 정액 금액 또는 정률 %
};

const emptyForm: FormState = {
  id: null,
  name: '',
  products: [],
  start: '',
  end: '',
  discountType: '정액',
  amount: '',
};

export default function SeasonalPricingPage() {
  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ProductSeasonalPriceSeedPayload>(
    '/products/seasonal-price',
    FALLBACK_SEASONAL_PRICE,
  );

  // seed → 로컬 상태로 동기화 (등록/수정/삭제는 로컬 상태에서 처리하는 목업)
  const [rows, setRows] = useState<SeasonRow[]>([]);
  useEffect(() => {
    setRows(
      data.seasonalPrices.map(item => ({
        ...item,
        status: computeStatus(item.start, item.end),
        products: [item.product],
      })),
    );
  }, [data.seasonalPrices]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeasonRow | null>(null);

  const activeCount = rows.filter(item => item.status === '진행중').length;
  const scheduledCount = rows.filter(item => item.status === '예정').length;
  const endedCount = rows.filter(item => item.status === '종료').length;
  const runningSeasons = rows.filter(item => item.status === '진행중');

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (row: SeasonRow) => {
    if (row.status === '진행중') {
      toast.error('진행 중인 시즌은 기간·금액을 변경할 수 없습니다.');
      return;
    }
    const inferredType: '정액' | '정률' = row.discountType ?? '정액';
    setForm({
      id: row.id,
      name: row.name,
      products: row.products ?? [row.product],
      start: row.start,
      end: row.end,
      discountType: inferredType,
      amount: inferredType === '정률' ? String(row.rate) : String(row.discounted),
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleProduct = (name: string) => {
    setForm(prev => ({
      ...prev,
      products: prev.products.includes(name)
        ? prev.products.filter(p => p !== name)
        : [...prev.products, name],
    }));
  };

  // docs4 SCR-P008 필수 예외처리 검증
  const validate = (f: FormState): string | null => {
    if (!f.name.trim()) return '시즌명을 입력해주세요.';
    if (f.products.length === 0) return '대상 상품을 최소 1개 선택해주세요.';
    if (!f.start || !f.end) return '적용 기간을 입력해주세요.';
    if (new Date(f.start) > new Date(f.end)) return '종료일은 시작일 이후여야 합니다.';
    const amountNum = Number(f.amount);
    if (!f.amount || Number.isNaN(amountNum)) return '특가 금액 또는 할인율을 입력해주세요.';
    if (f.discountType === '정률') {
      if (amountNum <= 0 || amountNum > 100) return '할인율은 1~100% 사이여야 합니다.';
    } else {
      if (amountNum <= 0) return '특가 금액은 0보다 커야 합니다.';
      const minOriginal = Math.min(
        ...f.products.map(name => PRODUCT_OPTIONS.find(p => p.name === name)?.price ?? Infinity),
      );
      if (amountNum > minOriginal) return '특가 금액이 정상가를 초과할 수 없습니다.';
    }
    return null;
  };

  const handleSave = () => {
    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const primaryProduct = form.products[0];
    const original = PRODUCT_OPTIONS.find(p => p.name === primaryProduct)?.price ?? 0;
    const amountNum = Number(form.amount);
    const discounted = form.discountType === '정률'
      ? Math.round(original * (1 - amountNum / 100))
      : amountNum;
    const rate = form.discountType === '정률'
      ? amountNum
      : original > 0 ? Math.round((1 - discounted / original) * 100) : 0;
    const status = computeStatus(form.start, form.end);
    const productLabel = form.products.length > 1
      ? `${primaryProduct} 외 ${form.products.length - 1}개`
      : primaryProduct;

    if (form.id === null) {
      // 신규 등록
      const newId = rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      setRows(prev => [
        {
          id: newId,
          name: form.name.trim(),
          product: productLabel,
          products: form.products,
          original,
          discounted,
          rate,
          start: form.start,
          end: form.end,
          status,
          discountType: form.discountType,
        },
        ...prev,
      ]);
      toast.success('시즌 특가가 등록되었습니다.');
    } else {
      // 수정
      setRows(prev =>
        prev.map(r =>
          r.id === form.id
            ? {
                ...r,
                name: form.name.trim(),
                product: productLabel,
                products: form.products,
                original,
                discounted,
                rate,
                start: form.start,
                end: form.end,
                status,
                discountType: form.discountType,
              }
            : r,
        ),
      );
      toast.success('시즌 특가가 수정되었습니다.');
    }
    setModalOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
    toast.success(
      deleteTarget.status === '진행중'
        ? '진행 중 시즌을 즉시 종료했습니다. 정상가가 복구됩니다.'
        : '시즌 특가가 삭제되었습니다.',
    );
    setDeleteTarget(null);
  };

  const minOriginalForForm = useMemo(() => {
    if (form.products.length === 0) return null;
    return Math.min(
      ...form.products.map(name => PRODUCT_OPTIONS.find(p => p.name === name)?.price ?? Infinity),
    );
  }, [form.products]);

  return (
    <AppLayout>
      <PageHeader title="시즌 가격 관리" description="기간별 특가·프로모션 가격을 설정하고 관리합니다" actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => void reload(true)}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
          </button>
          <button onClick={openCreate} type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 시즌 특가 등록
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      {/* 진행 중 시즌 배너 */}
      {runningSeasons.length > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <Tag className="w-4 h-4" />
          현재 진행 중인 시즌 특가 {runningSeasons.length}건: {runningSeasons.map(s => s.name).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">진행 중</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">예정</p>
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">종료</p>
          <p className="text-2xl font-bold text-gray-500">{endedCount}개</p>
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center text-sm text-gray-400">
          데이터를 불러오는 중입니다...
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
          <Tag className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">등록된 시즌 특가가 없습니다.</p>
          <button onClick={openCreate} type="button" className="mt-3 text-sm font-medium text-blue-600 hover:underline">
            시즌 특가 등록하기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {rows.map(item => (
            <div
              key={item.id}
              className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 ${item.status === '종료' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <Tag className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{item.product} · {item.start} ~ {item.end}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">{item.original.toLocaleString()}원</p>
                  <p className="text-sm font-bold text-blue-600">{item.discounted.toLocaleString()}원</p>
                </div>
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg">{item.rate}% 할인</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    aria-label="수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    aria-label="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DLG-P023 시즌가격 등록/수정 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">{form.id === null ? '시즌 특가 등록' : '시즌 특가 수정'}</h2>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시즌명</label>
              <input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 2026 여름 특가"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상 상품 (최소 1개)</label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {PRODUCT_OPTIONS.map(p => (
                  <label key={p.name} className="flex items-center gap-2 px-1 py-1 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 rounded">
                    <input
                      type="checkbox"
                      checked={form.products.includes(p.name)}
                      onChange={() => toggleProduct(p.name)}
                    />
                    <span className="flex-1">{p.name}</span>
                    <span className="text-xs text-gray-400">{p.price.toLocaleString()}원</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={form.start}
                  onChange={e => setForm(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={form.end}
                  onChange={e => setForm(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">할인 방식</label>
                <select
                  value={form.discountType}
                  onChange={e => setForm(prev => ({ ...prev, discountType: e.target.value as '정액' | '정률' }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="정액">정액 (특가 금액)</option>
                  <option value="정률">정률 (할인율 %)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.discountType === '정률' ? '할인율 (%)' : '특가 금액 (원)'}
                </label>
                <input
                  inputMode="numeric"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value.replace(/[^0-9]/g, '') }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={form.discountType === '정률' ? '1~100' : '0'}
                />
              </div>
            </div>

            {minOriginalForForm !== null && form.discountType === '정액' && (
              <p className="text-xs text-gray-400">대상 상품 최저 정상가: {minOriginalForForm.toLocaleString()}원</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} type="button" className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleSave} type="button" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">저장</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="시즌 특가 삭제"
        description={
          deleteTarget?.status === '진행중'
            ? '진행 중인 시즌입니다. 즉시 종료하면 정상가가 복구됩니다. 삭제하시겠습니까?'
            : `'${deleteTarget?.name ?? ''}' 시즌 특가를 삭제하시겠습니까?`
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
