'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { AlertCircle, Edit2, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getBranchId } from '@/lib/getBranchId';
import {
  createProductSeasonalPrice,
  deleteProductSeasonalPrice,
  endProductSeasonalPrice,
  getProductSeasonalPrices,
  updateProductSeasonalPrice,
  type ProductSeasonalPrice,
  type SeasonalDiscountType,
} from '@/api/endpoints/productSeasonalPrices';

type SeasonStatus = '진행중' | '예정' | '종료';

interface ProductOption {
  id: number;
  name: string;
  price: number;
  isActive: boolean;
}

type SeasonRow = ProductSeasonalPrice & {
  status: SeasonStatus;
  productLabel: string;
};

const statusColor: Record<SeasonStatus, string> = {
  '진행중': 'bg-green-100 text-green-700',
  '예정': 'bg-blue-100 text-blue-700',
  '종료': 'bg-gray-100 text-gray-500',
};

const discountTypeLabels: Record<SeasonalDiscountType, string> = {
  fixed_price: '직접 입력 가격',
  fixed_amount: '정액 할인',
  percentage: '정률 할인',
};

const toDay = (date: string): Date => {
  const parsed = new Date(`${date}T00:00:00`);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const todayString = (): string => new Date().toISOString().slice(0, 10);

const computeStatus = (row: Pick<ProductSeasonalPrice, 'startDate' | 'endDate' | 'isActive' | 'endedAt'>): SeasonStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!row.isActive || row.endedAt) return '종료';
  if (today < toDay(row.startDate)) return '예정';
  if (today > toDay(row.endDate)) return '종료';
  return '진행중';
};

const makeProductLabel = (names: string[]): string => {
  if (names.length === 0) return '-';
  return names.length > 1 ? `${names[0]} 외 ${names.length - 1}개` : names[0];
};

const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string): boolean =>
  toDay(aStart) <= toDay(bEnd) && toDay(bStart) <= toDay(aEnd);

type FormState = {
  id: number | null;
  name: string;
  productIds: number[];
  startDate: string;
  endDate: string;
  discountType: SeasonalDiscountType;
  discountValue: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  id: null,
  name: '',
  productIds: [],
  startDate: '',
  endDate: '',
  discountType: 'fixed_price',
  discountValue: '',
  isActive: true,
};

export default function SeasonalPricingPage() {
  const [branchId, setBranchId] = useState(1);
  const [rows, setRows] = useState<SeasonRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SeasonRow | null>(null);

  const hydrateRows = (items: ProductSeasonalPrice[]): SeasonRow[] =>
    items.map(item => ({
      ...item,
      status: computeStatus(item),
      productLabel: makeProductLabel(item.productNames),
    }));

  const fetchData = async () => {
    const bid = getBranchId();
    setBranchId(bid);
    setLoading(true);
    setError(null);
    const [seasonResult, productResult] = await Promise.all([
      getProductSeasonalPrices(bid),
      supabase
        .from('products')
        .select('id, name, price, cashPrice, isActive')
        .eq('branchId', bid)
        .order('name'),
    ]);

    if (seasonResult.error) {
      setError(seasonResult.error);
      setRows([]);
    } else {
      setRows(hydrateRows(seasonResult.data));
    }

    if (productResult.error) {
      toast.error('상품 목록을 불러오지 못했습니다.');
      setProducts([]);
    } else {
      setProducts(
        ((productResult.data ?? []) as Array<Record<string, unknown>>).map(item => ({
          id: Number(item.id),
          name: String(item.name ?? ''),
          price: Number(item.cashPrice ?? item.price ?? 0),
          isActive: Boolean(item.isActive),
        })),
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const productMap = useMemo(() => new Map(products.map(item => [item.id, item])), [products]);
  const activeCount = rows.filter(item => item.status === '진행중').length;
  const scheduledCount = rows.filter(item => item.status === '예정').length;
  const endedCount = rows.filter(item => item.status === '종료').length;
  const runningSeasons = rows.filter(item => item.status === '진행중');
  const editingRow = form.id == null ? null : rows.find(row => row.id === form.id) ?? null;

  const selectedProducts = useMemo(
    () => form.productIds.map(id => productMap.get(id)).filter((item): item is ProductOption => Boolean(item)),
    [form.productIds, productMap],
  );

  const minOriginalForForm = useMemo(() => {
    if (selectedProducts.length === 0) return null;
    return Math.min(...selectedProducts.map(item => item.price));
  }, [selectedProducts]);

  const startDateIsPast = Boolean(form.startDate && toDay(form.startDate) < toDay(todayString()));

  useEffect(() => {
    setFormWarning(startDateIsPast ? '시작일이 과거라 저장 즉시 활성 상태로 계산될 수 있습니다.' : null);
  }, [startDateIsPast]);

  const openCreate = () => {
    setForm(emptyForm);
    setFormError(null);
    setFormWarning(null);
    setModalOpen(true);
  };

  const openEdit = (row: SeasonRow) => {
    setForm({
      id: row.id,
      name: row.name,
      productIds: row.productIds,
      startDate: row.startDate,
      endDate: row.endDate,
      discountType: row.discountType,
      discountValue: String(row.discountValue),
      isActive: row.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleProduct = (id: number) => {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter(productId => productId !== id)
        : [...prev.productIds, id],
    }));
  };

  const validate = (f: FormState): string | null => {
    if (!f.name.trim()) return '시즌명을 입력해주세요.';
    if (f.productIds.length === 0) return '대상 상품을 최소 1개 선택해주세요.';
    if (!f.startDate || !f.endDate) return '적용 기간을 입력해주세요.';
    if (toDay(f.startDate) > toDay(f.endDate)) return '종료일은 시작일 이후여야 합니다.';

    const amountNum = Number(f.discountValue);
    if (!f.discountValue || Number.isNaN(amountNum)) return '특가 값 또는 할인율을 입력해주세요.';
    const minOriginal = Math.min(...f.productIds.map(id => productMap.get(id)?.price ?? Infinity));
    if (!Number.isFinite(minOriginal)) return '선택한 상품 정보를 찾을 수 없습니다.';

    if (f.discountType === 'percentage' && (amountNum <= 0 || amountNum > 100)) {
      return '할인율은 1~100% 사이여야 합니다.';
    }
    if (f.discountType === 'fixed_amount' && amountNum <= 0) return '정액 할인 금액은 0보다 커야 합니다.';
    if (f.discountType === 'fixed_amount' && amountNum >= minOriginal) return '정액 할인 금액이 정상가 이상일 수 없습니다.';
    if (f.discountType === 'fixed_price' && amountNum <= 0) return '직접 입력 가격은 0보다 커야 합니다.';
    if (f.discountType === 'fixed_price' && amountNum > minOriginal) return '특가 금액이 정상가를 초과할 수 없습니다.';

    if (editingRow?.status === '진행중') {
      if (editingRow.startDate !== f.startDate || editingRow.endDate !== f.endDate) return '진행 중인 시즌은 기간을 변경할 수 없습니다.';
      if (editingRow.discountType !== f.discountType || Number(editingRow.discountValue) !== amountNum) {
        return '진행 중인 시즌은 금액 또는 할인율을 변경할 수 없습니다.';
      }
    }

    const conflicts = rows.filter(row => {
      if (row.id === f.id) return false;
      if (row.status === '종료' || !row.isActive) return false;
      if (!overlaps(f.startDate, f.endDate, row.startDate, row.endDate)) return false;
      return row.productIds.some(id => f.productIds.includes(id));
    });
    if (conflicts.length > 0) {
      const conflictProducts = conflicts
        .flatMap(row => row.productIds.filter(id => f.productIds.includes(id)).map(id => productMap.get(id)?.name))
        .filter(Boolean);
      return `같은 기간에 이미 시즌 특가가 있는 상품입니다: ${[...new Set(conflictProducts)].join(', ')}`;
    }

    return null;
  };

  const buildPayload = () => {
    const selected = form.productIds.map(id => productMap.get(id)).filter((item): item is ProductOption => Boolean(item));
    const primary = selected[0];
    const original = primary.price;
    const discountValue = Number(form.discountValue);
    const discountedPrice = form.discountType === 'percentage'
      ? Math.round(original * (1 - discountValue / 100))
      : form.discountType === 'fixed_amount'
        ? Math.max(0, original - discountValue)
        : discountValue;
    const discountRate = original > 0 ? Math.round((1 - discountedPrice / original) * 10000) / 100 : 0;

    return {
      name: form.name.trim(),
      productIds: selected.map(item => item.id),
      productNames: selected.map(item => item.name),
      primaryProductId: primary.id,
      primaryProductName: primary.name,
      originalPrice: original,
      discountedPrice,
      discountRate,
      discountType: form.discountType,
      discountValue,
      startDate: form.startDate,
      endDate: form.endDate,
      isActive: form.isActive,
    };
  };

  const handleSave = async () => {
    const validationError = validate(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSaving(true);
    const payload = buildPayload();
    const result = form.id === null
      ? await createProductSeasonalPrice(payload)
      : await updateProductSeasonalPrice(form.id, payload);
    setSaving(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }
    toast.success(form.id === null ? '시즌 특가가 등록되었습니다.' : '시즌 특가가 수정되었습니다.');
    setModalOpen(false);
    await fetchData();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = deleteTarget.status === '진행중'
      ? await endProductSeasonalPrice(deleteTarget.id)
      : await deleteProductSeasonalPrice(deleteTarget.id);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      deleteTarget.status === '진행중'
        ? '진행 중 시즌을 즉시 종료했습니다. 정상가가 복구됩니다.'
        : '시즌 특가가 삭제되었습니다.',
    );
    setDeleteTarget(null);
    await fetchData();
  };

  return (
    <AppLayout>
      <PageHeader title="시즌 가격 관리" description="기간별 특가·프로모션 가격을 설정하고 관리합니다" actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={fetchData}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> 자료 새로고침
          </button>
          <button onClick={openCreate} type="button" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 시즌 특가 등록
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        지점 {branchId} · 상품 원장 기준 DB 연동
        {error && <span className="ml-2 text-red-600">자료 조회 오류: {error}</span>}
      </div>

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
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.productLabel} · {item.startDate} ~ {item.endDate} · {discountTypeLabels[item.discountType]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400 line-through">{item.originalPrice.toLocaleString()}원</p>
                  <p className="text-sm font-bold text-blue-600">{item.discountedPrice.toLocaleString()}원</p>
                </div>
                <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg">
                  {item.discountRate}% 할인
                </span>
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
            {formWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{formWarning}</span>
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
              <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 p-2">
                {products.length === 0 ? (
                  <div className="px-2 py-4 text-center text-xs text-gray-400">등록된 상품이 없습니다.</div>
                ) : products.map(product => (
                  <label key={product.id} className={`flex items-center gap-2 px-1 py-1 text-sm rounded ${product.isActive ? 'cursor-pointer text-gray-700 hover:bg-gray-50' : 'cursor-not-allowed text-gray-400'}`}>
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      disabled={!product.isActive && !form.productIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                    />
                    <span className="flex-1">{product.name}</span>
                    {!product.isActive && <span className="text-[11px] text-red-500">비활성 제외</span>}
                    <span className="text-xs text-gray-400">{product.price.toLocaleString()}원</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">특가 설정 방식</label>
                <select
                  value={form.discountType}
                  onChange={e => setForm(prev => ({ ...prev, discountType: e.target.value as SeasonalDiscountType }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed_price">직접 입력 가격</option>
                  <option value="percentage">정률 할인 (%)</option>
                  <option value="fixed_amount">정액 할인 (원)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.discountType === 'percentage' ? '할인율 (%)' : form.discountType === 'fixed_amount' ? '할인 금액 (원)' : '특가 금액 (원)'}
                </label>
                <input
                  inputMode="numeric"
                  value={form.discountValue}
                  onChange={e => setForm(prev => ({ ...prev, discountValue: e.target.value.replace(/[^0-9]/g, '') }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={form.discountType === 'percentage' ? '1~100' : '0'}
                />
              </div>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <span className="font-medium text-gray-700">활성 상태</span>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              />
            </label>

            {minOriginalForForm !== null && (
              <p className="text-xs text-gray-400">대상 상품 최저 정상가: {minOriginalForForm.toLocaleString()}원</p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalOpen(false)} type="button" className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={handleSave} type="button" disabled={saving} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="시즌 특가 삭제"
        description={
          deleteTarget?.status === '진행중'
            ? '진행 중인 시즌입니다. 즉시 종료하면 정상가가 복구됩니다. 종료하시겠습니까?'
            : `'${deleteTarget?.name ?? ''}' 시즌 특가를 삭제하시겠습니까?`
        }
        confirmLabel={deleteTarget?.status === '진행중' ? '즉시 종료' : '삭제'}
        cancelLabel="취소"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
