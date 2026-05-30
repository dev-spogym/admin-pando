'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Boxes, Download, History, Plus, Search, SlidersHorizontal } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';

type StockStatus = 'normal' | 'low' | 'soldout';
type StockAction = '입고' | '출고' | '조정';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: string;
  quantity: number;
  safetyStock: number;
  unit: string;
  lastInbound: string;
  lastOutbound: string;
  owner: string;
  memo: string;
}

const INITIAL_ITEMS: InventoryItem[] = [
  {
    id: 'INV-001',
    code: 'TOWEL-BASIC',
    name: '기본 수건',
    category: '소모품',
    quantity: 240,
    safetyStock: 100,
    unit: '장',
    lastInbound: '2026-05-20',
    lastOutbound: '2026-05-29',
    owner: '운영팀',
    memo: '일일 세탁 출고 대상',
  },
  {
    id: 'INV-002',
    code: 'WEAR-M',
    name: '운동복 M',
    category: '운동복',
    quantity: 44,
    safetyStock: 50,
    unit: '벌',
    lastInbound: '2026-05-11',
    lastOutbound: '2026-05-28',
    owner: '프론트',
    memo: '일반 재고 품목',
  },
  {
    id: 'INV-003',
    code: 'CLEAN-500',
    name: '기구 소독제 500ml',
    category: '청소/위생',
    quantity: 8,
    safetyStock: 12,
    unit: '병',
    lastInbound: '2026-05-13',
    lastOutbound: '2026-05-27',
    owner: '시설팀',
    memo: '안전 재고 미만',
  },
  {
    id: 'INV-004',
    code: 'BOTTLE-01',
    name: '판매용 물병',
    category: '판매용품',
    quantity: 0,
    safetyStock: 20,
    unit: '개',
    lastInbound: '2026-04-30',
    lastOutbound: '2026-05-24',
    owner: '매출팀',
    memo: '품절',
  },
];

function getStatus(item: InventoryItem): StockStatus {
  if (item.quantity <= 0) return 'soldout';
  if (item.quantity < item.safetyStock) return 'low';
  return 'normal';
}

const STATUS_META: Record<StockStatus, { label: string; className: string }> = {
  normal: { label: '정상', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: '부족', className: 'bg-amber-100 text-amber-700' },
  soldout: { label: '품절', className: 'bg-red-100 text-red-700' },
};

export default function FacilityInventoryPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [activeAction, setActiveAction] = useState<{ item: InventoryItem; type: StockAction } | null>(null);
  const [actionQty, setActionQty] = useState('1');
  const [actionReason, setActionReason] = useState('');

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) => {
      const status = getStatus(item);
      const matchesStatus = statusFilter === 'all' || statusFilter === status;
      const matchesQuery =
        !keyword ||
        item.name.toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword);
      return matchesStatus && matchesQuery;
    });
  }, [items, query, statusFilter]);

  const summary = useMemo(() => {
    const count = (status: StockStatus) => items.filter((item) => getStatus(item) === status).length;
    return {
      total: items.length,
      normal: count('normal'),
      low: count('low'),
      soldout: count('soldout'),
    };
  }, [items]);

  const openAction = (item: InventoryItem, type: StockAction) => {
    setActiveAction({ item, type });
    setActionQty(type === '조정' ? String(item.quantity) : '1');
    setActionReason('');
  };

  const closeAction = () => {
    setActiveAction(null);
    setActionQty('1');
    setActionReason('');
  };

  const applyAction = () => {
    if (!activeAction) return;
    const qty = Number(actionQty);
    if (!Number.isFinite(qty) || qty < 0) return;
    if (!actionReason.trim()) return;

    setItems((current) =>
      current.map((item) => {
        if (item.id !== activeAction.item.id) return item;
        const today = '2026-05-29';
        if (activeAction.type === '입고') {
          return { ...item, quantity: item.quantity + qty, lastInbound: today, memo: actionReason.trim() };
        }
        if (activeAction.type === '출고') {
          return { ...item, quantity: Math.max(item.quantity - qty, 0), lastOutbound: today, memo: actionReason.trim() };
        }
        return { ...item, quantity: qty, memo: actionReason.trim() };
      }),
    );
    closeAction();
  };

  return (
    <AppLayout>
      <PageHeader
        title="상품 재고 관리 (V2/후속)"
        description="센터가 보유한 운동복, 수건, 소모품, 판매용품 등 일반 재고 수량을 검토합니다."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Download size={15} />
              엑셀
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={15} />
              품목 등록
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_1fr]">
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            상태
            <select
              className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-blue-500"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StockStatus | 'all')}
            >
              <option value="all">전체</option>
              <option value="normal">정상</option>
              <option value="low">부족</option>
              <option value="soldout">품절</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
            검색
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                placeholder="품목명, 품목 코드, 분류명 검색"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </label>
        </div>
      </PageHeader>

      <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
        docs4 V2/후속 화면입니다. 상품 재고 실행 원장과 D05 재고 범위 정리는 후속 확정 후 DB에 연결하며 현재 화면의 변경은 퍼블리싱 검토용 상태입니다.
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500">전체 품목</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{summary.total}종</p>
        </div>
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-700">정상 재고</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.normal}종</p>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-700">부족 재고</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{summary.low}종</p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold text-red-700">품절</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{summary.soldout}종</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        회원별 운동복 대여·반납 상태가 아니라 실제 재고 수량만 관리합니다. D05 결제 상품 판매와 본 화면의 재고 수량은 자동 연동하지 않습니다.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">품목</th>
              <th className="px-4 py-3 text-left">분류</th>
              <th className="px-4 py-3 text-right">현재 수량</th>
              <th className="px-4 py-3 text-right">안전 재고</th>
              <th className="px-4 py-3 text-left">상태</th>
              <th className="px-4 py-3 text-left">최근 입출고</th>
              <th className="px-4 py-3 text-left">담당</th>
              <th className="px-4 py-3 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const status = STATUS_META[getStatus(item)];
              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-gray-900">{item.name}</div>
                    <div className="font-mono text-xs text-gray-500">{item.code}</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{item.category}</td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {item.quantity.toLocaleString()} {item.unit}
                  </td>
                  <td className="px-4 py-4 text-right text-gray-600">
                    {item.safetyStock.toLocaleString()} {item.unit}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">
                    <div>입고 {item.lastInbound}</div>
                    <div>출고 {item.lastOutbound}</div>
                  </td>
                  <td className="px-4 py-4 text-gray-700">{item.owner}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        onClick={() => openAction(item, '입고')}
                      >
                        <ArrowDown size={13} />
                        입고
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        onClick={() => openAction(item, '출고')}
                      >
                        <ArrowUp size={13} />
                        출고
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        onClick={() => openAction(item, '조정')}
                      >
                        <SlidersHorizontal size={13} />
                        조정
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                        title={`${item.memo}`}
                      >
                        <History size={13} />
                        이력
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-sm text-gray-500">
            <Boxes size={22} />
            조건에 맞는 재고 품목이 없습니다.
          </div>
        )}
      </div>

      {activeAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              {activeAction.type} 처리 · {activeAction.item.name}
            </h2>
            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-gray-700">
                {activeAction.type === '조정' ? '조정 후 수량' : '수량'}
                <input
                  type="number"
                  min="0"
                  className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-blue-500"
                  value={actionQty}
                  onChange={(event) => setActionQty(event.target.value)}
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700">
                사유
                <textarea
                  className="mt-1 min-h-24 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="입고처, 출고 사유, 실사 조정 사유 등을 입력"
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                onClick={closeAction}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!actionReason.trim()}
                onClick={applyAction}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
