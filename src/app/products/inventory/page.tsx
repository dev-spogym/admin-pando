'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Package, Plus, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

const inventory = [
  { id: 1, name: 'PT 10회권', category: 'PT', stock: 150, sold: 42, remaining: 108, alert: false },
  { id: 2, name: '3개월 이용권', category: '이용권', stock: 200, sold: 178, remaining: 22, alert: true },
  { id: 3, name: '필라테스 월정액', category: 'GX', stock: 80, sold: 65, remaining: 15, alert: true },
  { id: 4, name: 'PT 20회권', category: 'PT', stock: 100, sold: 38, remaining: 62, alert: false },
  { id: 5, name: '6개월 이용권', category: '이용권', stock: 120, sold: 95, remaining: 25, alert: false },
  { id: 6, name: '요가 10회권', category: 'GX', stock: 60, sold: 12, remaining: 48, alert: false },
];

const history = [
  { date: '2026-04-26', product: 'PT 10회권', type: '판매', qty: 3, balance: 108 },
  { date: '2026-04-25', product: '3개월 이용권', type: '입고', qty: 50, balance: 22 },
  { date: '2026-04-25', product: '필라테스 월정액', type: '판매', qty: 5, balance: 15 },
  { date: '2026-04-24', product: 'PT 20회권', type: '판매', qty: 2, balance: 62 },
];

export default function ProductInventoryPage() {
  const [tab, setTab] = useState<'재고현황' | '입출고이력'>('재고현황');

  return (
    <AppLayout>
      <PageHeader title="재고 관리" description="상품별 재고 현황과 입출고 이력을 관리합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 입고 등록
        </button>
      } />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 상품 종류</p>
          <p className="text-2xl font-bold text-gray-900">6종</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-amber-700">재고 부족 경고</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">2종</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 총 판매</p>
          <p className="text-2xl font-bold text-blue-600">430건</p>
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
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {inventory.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                {item.alert && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-8 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-400">총 재고</p>
                  <p className="font-medium">{item.stock}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">판매</p>
                  <p className="font-medium text-blue-600">{item.sold}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">잔여</p>
                  <p className={`font-bold ${item.alert ? 'text-red-600' : 'text-gray-800'}`}>{item.remaining}</p>
                </div>
                <div className="w-32 bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${item.alert ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${(item.remaining / item.stock) * 100}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {history.map((h, i) => (
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
          ))}
        </div>
      )}
    </AppLayout>
  );
}
