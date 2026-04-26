'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Share2, Gift, Users, TrendingUp, Plus, ChevronRight } from 'lucide-react';

const referrals = [
  { id: 1, referrer: '김민준', referred: '이서연', date: '2026-04-20', reward: '10,000P', status: '지급완료', product: '3개월 이용권' },
  { id: 2, referrer: '박지훈', referred: '최유리', date: '2026-04-18', reward: '10,000P', status: '지급완료', product: 'PT 10회권' },
  { id: 3, referrer: '김민준', referred: '정현우', date: '2026-04-15', reward: '10,000P', status: '지급대기', product: '6개월 이용권' },
  { id: 4, referrer: '이서연', referred: '강서준', date: '2026-04-10', reward: '10,000P', status: '지급완료', product: '필라테스 월정액' },
  { id: 5, referrer: '최유리', referred: '윤지민', date: '2026-04-05', reward: '10,000P', status: '취소', product: '-' },
];

const programs = [
  { name: '친구 초대 기본', reward: '10,000P', condition: '초대 회원 첫 결제 시', active: true, used: 42 },
  { name: '5인 초대 보너스', reward: '50,000P', condition: '5명 초대 달성 시 추가 지급', active: true, used: 8 },
];

export default function ReferralPage() {
  const [tab, setTab] = useState<'이력' | '프로그램'>('이력');

  return (
    <AppLayout>
      <PageHeader title="리퍼럴 프로그램" description="회원 추천 이벤트를 관리하고 보상 지급 현황을 확인합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 프로그램 추가
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 추천</p>
          <p className="text-2xl font-bold text-gray-900">18건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전환 성공</p>
          <p className="text-2xl font-bold text-green-600">14건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전환율</p>
          <p className="text-2xl font-bold text-blue-600">78%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">지급 포인트</p>
          <p className="text-2xl font-bold text-purple-600">140,000P</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['이력', '프로그램'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '이력' ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {referrals.map(r => (
            <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-purple-100 rounded-xl">
                  <Share2 className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{r.referrer}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-sm text-gray-700">{r.referred}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.date} · {r.product}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-purple-600">{r.reward}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  r.status === '지급완료' ? 'bg-green-100 text-green-700' :
                  r.status === '지급대기' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {programs.map((p, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 rounded-xl">
                    <Gift className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.condition}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-purple-600">{p.reward}</p>
                  <p className="text-xs text-gray-400 mt-1">사용 {p.used}건</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? '활성' : '비활성'}</span>
                <button className="text-xs text-blue-600 hover:underline ml-auto">편집</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
