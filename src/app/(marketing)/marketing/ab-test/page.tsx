'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { FlaskConical, TrendingUp, Plus, Trophy } from 'lucide-react';

const tests = [
  {
    id: 1, name: '재등록 유도 메시지 최적화', status: '진행중',
    variantA: { name: 'A안: 할인 강조', sent: 250, open: 163, click: 45 },
    variantB: { name: 'B안: 혜택 강조', sent: 250, open: 188, click: 62 },
    winner: null, startDate: '2026-04-20', endDate: '2026-05-04',
  },
  {
    id: 2, name: '신규 환영 메시지 제목 테스트', status: '완료',
    variantA: { name: 'A안: 이름 호칭', sent: 120, open: 84, click: 32 },
    variantB: { name: 'B안: 혜택 중심', sent: 120, open: 96, click: 48 },
    winner: 'B', startDate: '2026-04-01', endDate: '2026-04-15',
  },
];

export default function AbTestPage() {
  const [showNew, setShowNew] = useState(false);

  return (
    <AppLayout>
      <PageHeader title="A/B 테스트" description="두 가지 메시지 안을 비교해 더 효과적인 방식을 찾습니다" actions={
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 테스트 생성
        </button>
      } />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">진행 중 테스트</p>
          <p className="text-2xl font-bold text-green-600">1개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">완료된 테스트</p>
          <p className="text-2xl font-bold text-gray-900">1개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">평균 성과 향상</p>
          <p className="text-2xl font-bold text-blue-600">+23%</p>
        </div>
      </div>

      <div className="space-y-4">
        {tests.map(test => {
          const aOpenRate = Math.round((test.variantA.open / test.variantA.sent) * 100);
          const bOpenRate = Math.round((test.variantB.open / test.variantB.sent) * 100);
          const aClickRate = Math.round((test.variantA.click / test.variantA.sent) * 100);
          const bClickRate = Math.round((test.variantB.click / test.variantB.sent) * 100);

          return (
            <div key={test.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 rounded-xl">
                    <FlaskConical className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{test.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{test.startDate} ~ {test.endDate}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${test.status === '진행중' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{test.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[test.variantA, test.variantB].map((v, i) => {
                  const isWinner = test.winner === (i === 0 ? 'A' : 'B');
                  const openRate = i === 0 ? aOpenRate : bOpenRate;
                  const clickRate = i === 0 ? aClickRate : bClickRate;
                  return (
                    <div key={i} className={`rounded-xl p-4 border-2 ${isWinner ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${i === 0 ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{i === 0 ? 'A' : 'B'}</span>
                        <span className="text-xs font-medium text-gray-700">{v.name}</span>
                        {isWinner && <Trophy className="w-3.5 h-3.5 text-amber-500 ml-auto" />}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <p className="text-xs text-gray-400">발송</p>
                          <p className="text-sm font-bold text-gray-800">{v.sent}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">오픈율</p>
                          <p className="text-sm font-bold text-blue-600">{openRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400">클릭율</p>
                          <p className="text-sm font-bold text-purple-600">{clickRate}%</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">A/B 테스트 생성</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">테스트 이름</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="테스트 이름" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">A안 메시지</label>
              <textarea rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="A안 메시지 내용" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">B안 메시지</label>
              <textarea rows={2} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="B안 메시지 내용" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg">생성</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
