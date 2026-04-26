'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Package, Eye, Download, Grid, List } from 'lucide-react';

const products = [
  { id: 1, name: 'PT 10회권', category: 'PT', price: 500000, desc: '1:1 퍼스널 트레이닝 10회 이용권', active: true, popular: true },
  { id: 2, name: '3개월 이용권', category: '이용권', price: 180000, desc: '헬스장 3개월 자유 이용', active: true, popular: true },
  { id: 3, name: '필라테스 월정액', category: 'GX', price: 120000, desc: '필라테스 그룹 수업 월 무제한', active: true, popular: false },
  { id: 4, name: 'PT 20회권', category: 'PT', price: 900000, desc: '1:1 퍼스널 트레이닝 20회 이용권', active: true, popular: false },
  { id: 5, name: '6개월 이용권', category: '이용권', price: 320000, desc: '헬스장 6개월 자유 이용', active: true, popular: false },
  { id: 6, name: '요가 10회권', category: 'GX', price: 80000, desc: '요가 그룹 수업 10회 이용권', active: false, popular: false },
];

const catColor: Record<string, string> = {
  'PT': 'bg-purple-100 text-purple-700',
  '이용권': 'bg-blue-100 text-blue-700',
  'GX': 'bg-green-100 text-green-700',
};

export default function ProductCatalogPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [cat, setCat] = useState('전체');
  const cats = ['전체', 'PT', '이용권', 'GX'];
  const filtered = cat === '전체' ? products : products.filter(p => p.category === cat);

  return (
    <AppLayout>
      <PageHeader title="상품 카탈로그" description="고객에게 제공하는 상품 목록을 카탈로그 형태로 확인합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Download className="w-4 h-4" /> PDF 내보내기
        </button>
      } />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${cat === c ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded ${view === 'grid' ? 'bg-gray-100' : 'text-gray-400'}`}><Grid className="w-4 h-4" /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-gray-100' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white rounded-xl border p-5 ${p.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${catColor[p.category]}`}>{p.category}</span>
                {p.popular && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">인기</span>}
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{p.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{p.desc}</p>
              <p className="text-lg font-bold text-blue-600">{p.price.toLocaleString()}원</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${catColor[p.category]}`}>{p.category}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-blue-600">{p.price.toLocaleString()}원</span>
                {!p.active && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">비활성</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
