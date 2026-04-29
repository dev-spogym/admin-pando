'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Plus, Edit2, Trash2, Tag, RefreshCw } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { ProductSeasonalPriceSeedPayload } from '@/lib/publishingPageSeed';

const FALLBACK_SEASONAL_PRICE: ProductSeasonalPriceSeedPayload = {
  seasonalPrices: [
    { id: 1, name: '여름 특가', product: 'PT 10회권', original: 500000, discounted: 420000, rate: 16, start: '2026-06-01', end: '2026-08-31', status: '예정' },
    { id: 2, name: '신년 이벤트', product: '3개월 이용권', original: 180000, discounted: 150000, rate: 17, start: '2026-01-01', end: '2026-01-31', status: '종료' },
    { id: 3, name: '봄 프로모션', product: '필라테스 월정액', original: 120000, discounted: 99000, rate: 18, start: '2026-03-01', end: '2026-05-31', status: '진행중' },
    { id: 4, name: '가을 패키지', product: 'PT 20회권', original: 900000, discounted: 780000, rate: 13, start: '2026-09-01', end: '2026-11-30', status: '예정' },
  ],
};

const statusColor: Record<string, string> = {
  '진행중': 'bg-green-100 text-green-700',
  '예정': 'bg-blue-100 text-blue-700',
  '종료': 'bg-gray-100 text-gray-500',
};

export default function SeasonalPricingPage() {
  const [showModal, setShowModal] = useState(false);
  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ProductSeasonalPriceSeedPayload>(
    '/products/seasonal-price',
    FALLBACK_SEASONAL_PRICE,
  );
  const { seasonalPrices } = data;
  const activeCount = seasonalPrices.filter(item => item.status === '진행중').length;
  const scheduledCount = seasonalPrices.filter(item => item.status === '예정').length;
  const averageRate = Math.round(seasonalPrices.reduce((sum, item) => sum + item.rate, 0) / Math.max(seasonalPrices.length, 1));

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
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> 시즌 가격 추가
          </button>
        </div>
      } />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">진행 중 프로모션</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">예정 프로모션</p>
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">평균 할인율</p>
          <p className="text-2xl font-bold text-gray-900">{averageRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {seasonalPrices.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
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
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">시즌 가격 등록</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">프로모션 이름</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 여름 특가" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상 상품</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>PT 10회권</option><option>3개월 이용권</option><option>필라테스 월정액</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                <input type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                <input type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">할인 가격</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">저장</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
