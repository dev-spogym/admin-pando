'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Shirt, Plus, Package, RefreshCw, AlertTriangle } from 'lucide-react';

const lockers = [
  { id: 'A-01', member: '김민준', size: 'M', assignedDate: '2026-04-01', returnDate: '2026-04-30', status: '대여중' },
  { id: 'A-02', member: '이서연', size: 'S', assignedDate: '2026-04-05', returnDate: '2026-04-30', status: '대여중' },
  { id: 'A-03', member: null, size: '-', assignedDate: '-', returnDate: '-', status: '비어있음' },
  { id: 'A-04', member: '박지훈', size: 'L', assignedDate: '2026-03-15', returnDate: '2026-04-15', status: '반납지연' },
  { id: 'A-05', member: null, size: '-', assignedDate: '-', returnDate: '-', status: '비어있음' },
  { id: 'A-06', member: '최유리', size: 'S', assignedDate: '2026-04-10', returnDate: '2026-04-30', status: '대여중' },
  { id: 'B-01', member: '정현우', size: 'XL', assignedDate: '2026-04-12', returnDate: '2026-04-30', status: '대여중' },
  { id: 'B-02', member: null, size: '-', assignedDate: '-', returnDate: '-', status: '점검중' },
];

const statusColor: Record<string, string> = {
  '대여중': 'bg-blue-100 text-blue-700',
  '비어있음': 'bg-green-100 text-green-700',
  '반납지연': 'bg-red-100 text-red-700',
  '점검중': 'bg-amber-100 text-amber-700',
};

const inventory = [
  { size: 'S', total: 20, inUse: 8, available: 12 },
  { size: 'M', total: 25, inUse: 15, available: 10 },
  { size: 'L', total: 20, inUse: 12, available: 8 },
  { size: 'XL', total: 10, inUse: 6, available: 4 },
];

export default function ClothingLockerPage() {
  const [tab, setTab] = useState<'보관함현황' | '재고현황'>('보관함현황');
  const [showAssign, setShowAssign] = useState(false);

  return (
    <AppLayout>
      <PageHeader title="옷 보관함 운영 관리" description="운동복 보관함 배정 현황과 재고를 관리합니다" actions={
        <button onClick={() => setShowAssign(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 배정
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 보관함</p>
          <p className="text-2xl font-bold text-gray-900">8개</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <p className="text-xs text-blue-700 mb-1">대여 중</p>
          <p className="text-2xl font-bold text-blue-600">5개</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <p className="text-xs text-green-700 mb-1">비어 있음</p>
          <p className="text-2xl font-bold text-green-600">2개</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-700">반납 지연</p>
          </div>
          <p className="text-2xl font-bold text-red-600">1개</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['보관함현황', '재고현황'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '보관함현황' ? (
        <div className="grid grid-cols-4 gap-3">
          {lockers.map(locker => (
            <div key={locker.id} className={`rounded-xl border-2 p-4 ${locker.status === '비어있음' ? 'border-green-200 bg-green-50' : locker.status === '반납지연' ? 'border-red-200 bg-red-50' : locker.status === '점검중' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-600">{locker.id}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[locker.status]}`}>{locker.status}</span>
              </div>
              {locker.member ? (
                <>
                  <p className="text-sm font-semibold text-gray-800">{locker.member}</p>
                  <p className="text-xs text-gray-500 mt-0.5">사이즈 {locker.size}</p>
                  <p className="text-xs text-gray-400 mt-1">반납 {locker.returnDate}</p>
                </>
              ) : (
                <div className="flex items-center justify-center h-12">
                  <Shirt className="w-6 h-6 text-gray-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {inventory.map(inv => (
            <div key={inv.size} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-bold text-gray-600">{inv.size}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">사이즈 {inv.size}</p>
                  <p className="text-xs text-gray-500">전체 {inv.total}벌</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <p className="text-xs text-gray-400">대여 중</p>
                  <p className="text-sm font-bold text-blue-600">{inv.inUse}벌</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">이용 가능</p>
                  <p className="text-sm font-bold text-green-600">{inv.available}벌</p>
                </div>
                <div className="w-28">
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(inv.inUse / inv.total) * 100}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 text-right mt-0.5">{Math.round((inv.inUse / inv.total) * 100)}% 사용</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">옷 보관함 배정</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">회원 검색</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="회원명 입력" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">운동복 사이즈</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>S</option><option>M</option><option>L</option><option>XL</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">반납 예정일</label>
              <input type="date" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAssign(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={() => setShowAssign(false)} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg">배정</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
