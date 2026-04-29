'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { ShoppingCart, AlertTriangle, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { ConsumablesSeedPayload } from '@/lib/publishingPageSeed';

const FALLBACK_CONSUMABLES: ConsumablesSeedPayload = {
  consumables: [
    { id: 1, name: '위생 타월', unit: '롤', stock: 45, minStock: 20, reorderPoint: 30, lastOrder: '2026-04-10', status: '충분' },
    { id: 2, name: '소독제 (500ml)', unit: '병', stock: 8, minStock: 10, reorderPoint: 15, lastOrder: '2026-04-01', status: '부족' },
    { id: 3, name: '운동복 (S)', unit: '벌', stock: 12, minStock: 10, reorderPoint: 20, lastOrder: '2026-03-20', status: '충분' },
    { id: 4, name: '운동복 (M)', unit: '벌', stock: 5, minStock: 10, reorderPoint: 20, lastOrder: '2026-03-20', status: '부족' },
    { id: 5, name: '일회용 물병', unit: '박스', stock: 30, minStock: 10, reorderPoint: 15, lastOrder: '2026-04-15', status: '충분' },
    { id: 6, name: '손소독제 (1L)', unit: '통', stock: 3, minStock: 5, reorderPoint: 8, lastOrder: '2026-03-28', status: '발주필요' },
  ],
};

const statusColor: Record<string, string> = {
  '충분': 'bg-green-100 text-green-700',
  '부족': 'bg-amber-100 text-amber-700',
  '발주필요': 'bg-red-100 text-red-700',
};

export default function ConsumablesPage() {
  const [showOrder, setShowOrder] = useState(false);
  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ConsumablesSeedPayload>(
    '/consumables',
    FALLBACK_CONSUMABLES,
  );
  const consumables = data.consumables;
  const sufficientCount = consumables.filter(item => item.status === '충분').length;
  const lowCount = consumables.filter(item => item.status === '부족').length;
  const reorderCount = consumables.filter(item => item.status === '발주필요').length;

  return (
    <AppLayout>
      <PageHeader title="소모품 재고 관리" description="센터에서 사용하는 소모품 재고를 추적하고 발주합니다" actions={
        <div className="flex gap-2">
          <button
            onClick={() => void reload(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
          </button>
          <button onClick={() => setShowOrder(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <ShoppingCart className="w-4 h-4" /> 발주 생성
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 mb-1">충분</p>
          <p className="text-2xl font-bold text-green-600">{sufficientCount}종</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-amber-700 mb-1">부족</p>
          <p className="text-2xl font-bold text-amber-600">{lowCount}종</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-700">발주 필요</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{reorderCount}종</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {consumables.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">최소 재고: {item.minStock}{item.unit} · 마지막 발주: {item.lastOrder}</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="w-32">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>재고</span><span>{item.stock}/{item.reorderPoint}{item.unit}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${item.status === '충분' ? 'bg-green-400' : item.status === '부족' ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${Math.min((item.stock / item.reorderPoint) * 100, 100)}%` }} />
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
              <div className="flex gap-1">
                <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg" title="입고"><ArrowDown className="w-4 h-4" /></button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="출고"><ArrowUp className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">발주 생성</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">소모품 선택</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {consumables.map(c => <option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">발주 수량</label>
              <input type="number" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowOrder(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => setShowOrder(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">발주 생성</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
