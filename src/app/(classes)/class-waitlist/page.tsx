'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Clock, Users, CheckCircle, XCircle, Bell, ChevronRight } from 'lucide-react';

const waitlist = [
  { id: 1, member: '김민준', class: '필라테스 A반 (화 10:00)', requested: '2026-04-25 09:12', rank: 1, status: '대기중' },
  { id: 2, member: '이서연', class: '요가 기초반 (월 11:00)', requested: '2026-04-25 10:03', rank: 2, status: '대기중' },
  { id: 3, member: '박지훈', class: '스피닝 B반 (수 18:00)', requested: '2026-04-24 15:44', rank: 1, status: '배정가능' },
  { id: 4, member: '최유리', class: 'PT 기초반 (목 09:00)', requested: '2026-04-24 11:22', rank: 3, status: '대기중' },
  { id: 5, member: '정현우', class: '필라테스 A반 (화 10:00)', requested: '2026-04-26 08:00', rank: 2, status: '배정가능' },
];

const statusColor: Record<string, string> = {
  '대기중': 'bg-yellow-100 text-yellow-700',
  '배정가능': 'bg-green-100 text-green-700',
  '취소': 'bg-gray-100 text-gray-500',
};

export default function ClassWaitlistPage() {
  const [filter, setFilter] = useState('전체');
  const tabs = ['전체', '배정가능', '대기중'];

  const filtered = filter === '전체' ? waitlist : waitlist.filter(w => w.status === filter);

  return (
    <AppLayout>
      <PageHeader title="대기열 관리" description="수업 정원 초과 시 대기 신청한 회원을 관리하고 자동 배정합니다" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 대기</p>
          <p className="text-2xl font-bold text-gray-900">5명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">배정 가능</p>
          <p className="text-2xl font-bold text-green-600">2명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">오늘 알림 발송</p>
          <p className="text-2xl font-bold text-blue-600">3건</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          {tabs.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                  {item.rank}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.member}</p>
                  <p className="text-xs text-gray-500">{item.class}</p>
                  <p className="text-xs text-gray-400 mt-0.5">신청 {item.requested}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
                {item.status === '배정가능' && (
                  <button className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                    <Bell className="w-3 h-3" /> 배정 알림
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
