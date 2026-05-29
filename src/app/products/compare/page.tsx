'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Check, Plus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { usePageSeed } from '@/hooks';
import type { ProductCompareSeedPayload } from '@/lib/publishingPageSeed';

type CompareProduct = ProductCompareSeedPayload['compareProducts'][number];

const FALLBACK_COMPARE: ProductCompareSeedPayload = {
  compareProducts: [
    { name: 'PT 10회권', price: 500000, category: 'PT', duration: '3개월', sessions: '10회', groupClass: false, locker: true, gx: false, transfer: true },
    { name: 'PT 20회권', price: 900000, category: 'PT', duration: '6개월', sessions: '20회', groupClass: false, locker: true, gx: true, transfer: true },
    { name: '3개월 이용권', price: 180000, category: '이용권', duration: '3개월', sessions: '무제한', groupClass: true, locker: false, gx: false, transfer: false },
    { name: '6개월 이용권', price: 320000, category: '이용권', duration: '6개월', sessions: '무제한', groupClass: true, locker: false, gx: false, transfer: false },
    { name: '필라테스 월정액', price: 120000, category: 'GX', duration: '1개월', sessions: '무제한', groupClass: true, locker: false, gx: true, transfer: false },
  ],
};

const MAX_COMPARE = 3;

// 기간/횟수 문자열에서 숫자 추출 (하이라이트 비교용)
const numeric = (value: string): number => {
  const matched = value.match(/\d+/);
  return matched ? Number(matched[0]) : value === '무제한' ? Infinity : 0;
};

export default function ProductComparePage() {
  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ProductCompareSeedPayload>(
    '/products/compare',
    FALLBACK_COMPARE,
  );
  const pool = data.compareProducts;

  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const selected = useMemo(
    () => selectedNames.map(name => pool.find(p => p.name === name)).filter((p): p is CompareProduct => !!p),
    [selectedNames, pool],
  );

  const availableToAdd = pool.filter(p => !selectedNames.includes(p.name));

  const addProduct = (name: string) => {
    if (!name) return;
    if (selectedNames.includes(name)) {
      toast.error('이미 선택된 상품입니다.');
      return;
    }
    if (selectedNames.length >= MAX_COMPARE) {
      toast.error(`상품은 최대 ${MAX_COMPARE}개까지 비교할 수 있습니다.`);
      return;
    }
    setSelectedNames(prev => [...prev, name]);
  };

  const removeProduct = (name: string) => {
    setSelectedNames(prev => prev.filter(n => n !== name));
  };

  // 항목별 최적값 계산 (최저가 / 최장 기간 / 최다 횟수)
  const bestPrice = selected.length > 0 ? Math.min(...selected.map(p => p.price)) : null;
  const bestDuration = selected.length > 0 ? Math.max(...selected.map(p => numeric(p.duration))) : null;
  const bestSessions = selected.length > 0 ? Math.max(...selected.map(p => numeric(p.sessions))) : null;

  const boolRows: Array<{ label: string; key: keyof CompareProduct }> = [
    { label: '그룹 수업', key: 'groupClass' },
    { label: '락커 제공', key: 'locker' },
    { label: 'GX 포함', key: 'gx' },
    { label: '양도 가능', key: 'transfer' },
  ];

  const highlight = 'bg-blue-50 text-blue-700 font-bold';

  return (
    <AppLayout>
      <PageHeader
        title="상품 비교"
        description="최대 3개 상품을 나란히 비교하여 최적의 상품을 안내합니다"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedNames([])}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                초기화
              </button>
            )}
            <select
              value=""
              onChange={e => addProduct(e.target.value)}
              disabled={availableToAdd.length === 0 || selected.length >= MAX_COMPARE}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
            >
              <option value="">상품 추가...</option>
              {availableToAdd.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <button
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => void reload(true)}
              type="button"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
            </button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      {selected.length === 0 ? (
        // 초기 상태
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-20 text-center">
          <Plus className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">비교할 상품을 선택하세요.</p>
          <p className="mt-1 text-xs text-gray-400">상단의 &apos;상품 추가&apos;에서 최대 {MAX_COMPARE}개까지 선택할 수 있습니다.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-40 px-6 py-4 text-left text-sm font-semibold text-gray-700">항목</th>
                {selected.map(p => (
                  <th key={p.name} className="px-6 py-4 text-center">
                    <div className="flex items-start justify-center gap-1">
                      <div>
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{p.category}</span>
                        <p className="mt-1 text-sm font-bold text-gray-900">{p.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeProduct(p.name)}
                        className="text-gray-300 hover:text-red-500"
                        aria-label="비교 제외"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
                {/* 1개만 선택 시 추가 영역 */}
                {selected.length < MAX_COMPARE && (
                  <th className="px-6 py-4 text-center align-middle">
                    <select
                      value=""
                      onChange={e => addProduct(e.target.value)}
                      disabled={availableToAdd.length === 0}
                      className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500 disabled:opacity-50"
                    >
                      <option value="">+ 상품 추가</option>
                      {availableToAdd.map(p => (
                        <option key={p.name} value={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-600">현금가</td>
                {selected.map(p => (
                  <td key={p.name} className={`px-6 py-3.5 text-center text-sm ${p.price === bestPrice ? highlight : 'text-gray-800'}`}>
                    {p.price.toLocaleString()}원
                  </td>
                ))}
                {selected.length < MAX_COMPARE && <td />}
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-600">카드가</td>
                {selected.map(p => (
                  <td key={p.name} className="px-6 py-3.5 text-center text-sm text-gray-800">
                    {p.price.toLocaleString()}원
                  </td>
                ))}
                {selected.length < MAX_COMPARE && <td />}
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-600">이용 기간</td>
                {selected.map(p => (
                  <td key={p.name} className={`px-6 py-3.5 text-center text-sm ${numeric(p.duration) === bestDuration ? highlight : 'text-gray-800'}`}>
                    {p.duration}
                  </td>
                ))}
                {selected.length < MAX_COMPARE && <td />}
              </tr>
              <tr className="border-b border-gray-50">
                <td className="px-6 py-3.5 text-sm font-medium text-gray-600">이용 횟수</td>
                {selected.map(p => (
                  <td key={p.name} className={`px-6 py-3.5 text-center text-sm ${numeric(p.sessions) === bestSessions ? highlight : 'text-gray-800'}`}>
                    {p.sessions}
                  </td>
                ))}
                {selected.length < MAX_COMPARE && <td />}
              </tr>
              {boolRows.map(row => (
                <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3.5 text-sm font-medium text-gray-600">{row.label}</td>
                  {selected.map(p => (
                    <td key={p.name} className="px-6 py-3.5 text-center">
                      {p[row.key] ? (
                        <Check className="mx-auto h-5 w-5 text-green-500" />
                      ) : (
                        <X className="mx-auto h-5 w-5 text-gray-300" />
                      )}
                    </td>
                  ))}
                  {selected.length < MAX_COMPARE && <td />}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
