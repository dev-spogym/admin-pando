'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Megaphone, Plus, Users, TrendingUp, Mail, BarChart3 } from 'lucide-react';

const campaigns = [
  { id: 1, name: '5월 가정의 달 이벤트', type: '프로모션', target: '전체 회원', sent: 892, open: 534, click: 127, status: '진행중', start: '2026-05-01', end: '2026-05-31' },
  { id: 2, name: '만료 임박 재등록 캠페인', type: '리텐션', target: '만료 D-30', sent: 145, open: 98, click: 43, status: '진행중', start: '2026-04-01', end: '2026-06-30' },
  { id: 3, name: '신규 회원 환영 시리즈', type: '온보딩', target: '신규 등록 회원', sent: 234, open: 198, click: 167, status: '진행중', start: '2026-01-01', end: '2026-12-31' },
  { id: 4, name: '설 명절 인사', type: '이벤트', target: '전체 회원', sent: 1024, open: 612, click: 89, status: '종료', start: '2026-01-28', end: '2026-02-02' },
];

const statusColor: Record<string, string> = {
  '진행중': 'bg-green-100 text-green-700',
  '종료': 'bg-gray-100 text-gray-500',
  '예정': 'bg-blue-100 text-blue-700',
};

export default function CampaignsPage() {
  const [showNew, setShowNew] = useState(false);

  return (
    <AppLayout>
      <PageHeader title="캠페인 관리" description="목적별 마케팅 캠페인을 구성하고 성과를 분석합니다" actions={
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 캠페인 생성
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">활성 캠페인</p>
          <p className="text-2xl font-bold text-green-600">3개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">총 발송 수</p>
          <p className="text-2xl font-bold text-gray-900">2,295건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">평균 오픈율</p>
          <p className="text-2xl font-bold text-blue-600">62%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">평균 클릭율</p>
          <p className="text-2xl font-bold text-purple-600">18%</p>
        </div>
      </div>

      <div className="space-y-3">
        {campaigns.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 rounded-xl">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[c.status]}`}>{c.status}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c.type}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">대상: {c.target} · {c.start} ~ {c.end}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">발송</p>
                <p className="text-base font-bold text-gray-800">{c.sent.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">오픈율</p>
                <p className="text-base font-bold text-blue-600">{Math.round((c.open / c.sent) * 100)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">클릭율</p>
                <p className="text-base font-bold text-purple-600">{Math.round((c.click / c.sent) * 100)}%</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">캠페인 생성</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 이름</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="캠페인 이름 입력" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">캠페인 유형</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>프로모션</option><option>리텐션</option><option>온보딩</option><option>이벤트</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">대상 세그먼트</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>전체 회원</option><option>만료 D-30</option><option>신규 등록 회원</option><option>장기 미방문</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">취소</button>
              <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">생성</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
