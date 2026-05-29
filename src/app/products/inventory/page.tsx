'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { AlertTriangle, ArrowDown, ArrowUp, History, Plus, RefreshCw, Search, Settings2, XCircle } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { ProductInventorySeedPayload } from '@/lib/publishingPageSeed';
import {
  StockInModal,
  StockOutModal,
  StockAdjustModal,
  StockHistoryModal,
  type InventoryItem,
  type InventoryHistoryRow,
} from '@/components/common/InventoryModals';

const FALLBACK_PRODUCT_INVENTORY: ProductInventorySeedPayload = {
  inventory: [
    { id: 1, name: '운동복 상의', category: '운동복', stock: 150, sold: 42, remaining: 108, alert: false },
    { id: 2, name: '운동복 하의', category: '운동복', stock: 200, sold: 178, remaining: 22, alert: true },
    { id: 3, name: '스포츠 타월', category: '일반', stock: 80, sold: 65, remaining: 15, alert: true },
    { id: 4, name: '단백질 보충제', category: '일반', stock: 100, sold: 38, remaining: 62, alert: false },
    { id: 5, name: '운동복 양말', category: '운동복', stock: 120, sold: 120, remaining: 0, alert: true },
    { id: 6, name: '쉐이커 보틀', category: '일반', stock: 60, sold: 12, remaining: 48, alert: false },
  ],
  history: [
    { date: '2026-04-26', product: '운동복 상의', type: '판매', qty: 3, balance: 108 },
    { date: '2026-04-25', product: '운동복 하의', type: '입고', qty: 50, balance: 22 },
    { date: '2026-04-25', product: '스포츠 타월', type: '판매', qty: 5, balance: 15 },
    { date: '2026-04-24', product: '단백질 보충제', type: '판매', qty: 2, balance: 62 },
  ],
};

type StockStatus = '충분' | '부족' | '품절';

// 안전 재고는 총 재고의 20%로 산정 (목업)
const safetyStock = (stock: number): number => Math.ceil(stock * 0.2);

const stockStatus = (remaining: number, stock: number): StockStatus => {
  if (remaining <= 0) return '품절';
  if (remaining < safetyStock(stock)) return '부족';
  return '충분';
};

const statusBadge: Record<StockStatus, string> = {
  '충분': 'bg-green-100 text-green-700',
  '부족': 'bg-amber-100 text-amber-700',
  '품절': 'bg-red-100 text-red-700',
};

const rowBg: Record<StockStatus, string> = {
  '충분': '',
  '부족': 'bg-amber-50',
  '품절': 'bg-red-50',
};

// 최근 입고일 (목업 고정 데이터)
const lastStockIn = (id: number): string => {
  const base = ['2026-04-25', '2026-04-20', '2026-04-18', '2026-04-12', '2026-04-05', '2026-03-30'];
  return base[id % base.length];
};

const STATUS_FILTERS: Array<'전체' | StockStatus> = ['전체', '충분', '부족', '품절'];

export default function ProductInventoryPage() {
  const [tab, setTab] = useState<'재고현황' | '입출고이력'>('재고현황');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [statusFilter, setStatusFilter] = useState<'전체' | StockStatus>('전체');
  const [keyword, setKeyword] = useState('');

  // DLG-P019~P022 모달 상태 (대상 행 보관)
  const [stockInTarget, setStockInTarget] = useState<InventoryItem | null>(null);
  const [stockOutTarget, setStockOutTarget] = useState<InventoryItem | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [historyTarget, setHistoryTarget] = useState<InventoryItem | null>(null);
  const [historyAllOpen, setHistoryAllOpen] = useState(false);

  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ProductInventorySeedPayload>(
    '/products/inventory',
    FALLBACK_PRODUCT_INVENTORY,
  );
  const { inventory, history } = data;

  const categories = useMemo(
    () => ['전체', ...Array.from(new Set(inventory.map(item => item.category)))],
    [inventory],
  );

  const filtered = useMemo(
    () =>
      inventory.filter(item => {
        const status = stockStatus(item.remaining, item.stock);
        if (categoryFilter !== '전체' && item.category !== categoryFilter) return false;
        if (statusFilter !== '전체' && status !== statusFilter) return false;
        if (keyword && !item.name.includes(keyword)) return false;
        return true;
      }),
    [inventory, categoryFilter, statusFilter, keyword],
  );

  const lowCount = inventory.filter(item => stockStatus(item.remaining, item.stock) === '부족').length;
  const outCount = inventory.filter(item => stockStatus(item.remaining, item.stock) === '품절').length;

  const historyRows: InventoryHistoryRow[] = history.map(h => ({
    date: h.date,
    product: h.product,
    type: h.type,
    qty: h.qty,
    balance: h.balance,
  }));

  return (
    <AppLayout>
      <PageHeader title="재고 관리" description="운동복·일반 상품의 재고 현황과 입출고 이력을 관리합니다" actions={
        <div className="flex flex-wrap gap-2">
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => void reload(true)}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
          </button>
          <button
            type="button"
            onClick={() => setHistoryAllOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <History className="w-4 h-4" /> 입출고 이력
          </button>
          <button
            type="button"
            onClick={() => setStockInTarget(inventory[0] ?? null)}
            disabled={inventory.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> 입고 등록
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      {/* 재고 통계 카드 (docs4: 전체 품목 수 / 부족 재고 / 품절) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 품목 수</p>
          <p className="text-2xl font-bold text-gray-900">{inventory.length}종</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-amber-700">부족 재고</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">{lowCount}종</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-xs text-red-700">품절</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{outCount}종</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['재고현황', '입출고이력'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '재고현황' ? (
        <>
          {/* 필터 및 검색 */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === '전체' ? '전체 카테고리' : c}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="상품명 검색"
                className="rounded-lg border border-gray-200 py-2 pl-8 pr-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading && inventory.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center text-sm text-gray-400">
              재고 데이터를 불러오는 중입니다...
            </div>
          ) : inventory.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center text-sm text-gray-500">
              관리 중인 상품이 없습니다.
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-5 py-16 text-center">
              <p className="text-sm text-gray-500">필터 결과가 없습니다.</p>
              <button
                type="button"
                onClick={() => { setCategoryFilter('전체'); setStatusFilter('전체'); setKeyword(''); }}
                className="mt-3 text-sm font-medium text-blue-600 hover:underline"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="overflow-hidden bg-white rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="px-5 py-3 font-medium">상품명</th>
                    <th className="px-5 py-3 font-medium">카테고리</th>
                    <th className="px-5 py-3 text-center font-medium">현재 재고</th>
                    <th className="px-5 py-3 text-center font-medium">안전 재고</th>
                    <th className="px-5 py-3 text-center font-medium">재고 상태</th>
                    <th className="px-5 py-3 text-center font-medium">최근 입고일</th>
                    <th className="px-5 py-3 text-center font-medium">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(item => {
                    const status = stockStatus(item.remaining, item.stock);
                    return (
                      <tr key={item.id} className={`${rowBg[status]} hover:bg-gray-50`}>
                        <td className="px-5 py-3.5 font-semibold text-gray-800">{item.name}</td>
                        <td className="px-5 py-3.5 text-gray-500">{item.category}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-gray-800">{item.remaining}</td>
                        <td className="px-5 py-3.5 text-center text-gray-500">{safetyStock(item.stock)}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[status]}`}>{status}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center text-gray-500">{lastStockIn(item.id)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setStockInTarget(item)}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-green-600" /> 입고
                            </button>
                            <button
                              type="button"
                              onClick={() => setStockOutTarget(item)}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> 출고
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdjustTarget(item)}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <Settings2 className="w-3.5 h-3.5 text-amber-600" /> 조정
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistoryTarget(item)}
                              className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <History className="w-3.5 h-3.5 text-gray-500" /> 이력
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {history.length === 0 ? (
            <div className="px-5 py-16 text-center text-sm text-gray-500">입출고 이력이 없습니다.</div>
          ) : (
            history.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${h.type === '입고' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    {h.type === '입고' ? <ArrowDown className="w-3.5 h-3.5 text-green-600" /> : <ArrowUp className="w-3.5 h-3.5 text-blue-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{h.product}</p>
                    <p className="text-xs text-gray-400">{h.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className={`font-medium ${h.type === '입고' ? 'text-green-600' : 'text-blue-600'}`}>
                    {h.type === '입고' ? '+' : '-'}{h.qty}건
                  </span>
                  <span className="text-gray-500">잔여 {h.balance}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* DLG-P019 입고 등록 */}
      <StockInModal isOpen={stockInTarget !== null} onClose={() => setStockInTarget(null)} target={stockInTarget} onSubmit={() => void reload(true)} />
      {/* DLG-P020 출고 등록 */}
      <StockOutModal isOpen={stockOutTarget !== null} onClose={() => setStockOutTarget(null)} target={stockOutTarget} onSubmit={() => void reload(true)} />
      {/* DLG-P021 재고 수동 조정 */}
      <StockAdjustModal isOpen={adjustTarget !== null} onClose={() => setAdjustTarget(null)} target={adjustTarget} onSubmit={() => void reload(true)} />
      {/* DLG-P022 입출고 이력 조회 (행별: 상품명 필터 / 상단: 전체) */}
      <StockHistoryModal isOpen={historyTarget !== null} onClose={() => setHistoryTarget(null)} productName={historyTarget?.name} rows={historyRows} />
      <StockHistoryModal isOpen={historyAllOpen} onClose={() => setHistoryAllOpen(false)} rows={historyRows} />
    </AppLayout>
  );
}
