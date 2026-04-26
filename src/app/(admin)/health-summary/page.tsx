'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Heart, Activity, TrendingUp, Users, ChevronRight, Watch } from 'lucide-react';

const members = [
  { name: '김민준', age: 34, device: '애플워치', steps: 8420, calories: 340, heartRate: 72, sleep: 7.2, syncDate: '오늘 08:00', status: '정상' },
  { name: '이서연', age: 28, device: '갤럭시워치', steps: 12300, calories: 520, heartRate: 68, sleep: 6.8, syncDate: '오늘 07:30', status: '정상' },
  { name: '박지훈', age: 45, device: '애플워치', steps: 4200, calories: 180, heartRate: 88, sleep: 5.5, syncDate: '어제 22:00', status: '주의' },
  { name: '최유리', age: 31, device: '핏빗', steps: 9800, calories: 410, heartRate: 65, sleep: 8.1, syncDate: '오늘 09:00', status: '정상' },
  { name: '정현우', age: 52, device: '애플워치', steps: 3100, calories: 140, heartRate: 95, sleep: 4.8, syncDate: '오늘 06:00', status: '경고' },
];

const statusColor: Record<string, string> = {
  '정상': 'bg-green-100 text-green-700',
  '주의': 'bg-amber-100 text-amber-700',
  '경고': 'bg-red-100 text-red-700',
};

export default function HealthSummaryPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <AppLayout>
      <PageHeader title="회원 건강 연동 요약" description="웨어러블 기기와 연동된 회원의 건강 지표를 한눈에 확인합니다" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Watch className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-gray-500">연동 회원</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">5명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-green-600" />
            <p className="text-xs text-gray-500">평균 일일 걸음</p>
          </div>
          <p className="text-2xl font-bold text-green-600">7,564</p>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-amber-700">주의/경고 회원</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">2명</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <p className="text-xs text-gray-500">평균 수면 시간</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">6.5시간</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {members.map(m => (
          <div key={m.name}>
            <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelected(selected === m.name ? null : m.name)}>
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${statusColor[m.status].split(' ')[0]}`}>
                  <Heart className={`w-4 h-4 ${m.status === '정상' ? 'text-green-600' : m.status === '주의' ? 'text-amber-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{m.name}</span>
                    <span className="text-xs text-gray-400">{m.age}세 · {m.device}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[m.status]}`}>{m.status}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">마지막 동기화: {m.syncDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-gray-400">걸음</p>
                  <p className="font-semibold text-gray-800">{m.steps.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">심박수</p>
                  <p className={`font-semibold ${m.heartRate >= 90 ? 'text-red-600' : m.heartRate >= 80 ? 'text-amber-600' : 'text-gray-800'}`}>{m.heartRate}bpm</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400">수면</p>
                  <p className={`font-semibold ${m.sleep < 6 ? 'text-red-600' : m.sleep < 7 ? 'text-amber-600' : 'text-gray-800'}`}>{m.sleep}h</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${selected === m.name ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {selected === m.name && (
              <div className="px-5 pb-4 grid grid-cols-4 gap-3">
                {[
                  { label: '일일 걸음', value: `${m.steps.toLocaleString()}보`, goal: '10,000보', pct: Math.min((m.steps / 10000) * 100, 100) },
                  { label: '소모 칼로리', value: `${m.calories}kcal`, goal: '500kcal', pct: Math.min((m.calories / 500) * 100, 100) },
                  { label: '평균 심박수', value: `${m.heartRate}bpm`, goal: '60~80bpm', pct: m.heartRate >= 60 && m.heartRate <= 80 ? 100 : 60 },
                  { label: '수면 시간', value: `${m.sleep}시간`, goal: '7~9시간', pct: Math.min((m.sleep / 8) * 100, 100) },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                    <p className="text-sm font-bold text-gray-800 mb-1">{stat.value}</p>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${stat.pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">목표: {stat.goal}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
