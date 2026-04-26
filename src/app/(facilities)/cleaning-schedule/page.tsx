'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Sparkles, CheckCircle, Clock, Plus, Calendar } from 'lucide-react';

const schedule = [
  { id: 1, area: '탈의실 A', frequency: '매일', time: '06:00, 14:00, 20:00', assignee: '청소팀 A', lastDone: '오늘 06:00', status: '완료' },
  { id: 2, area: '헬스장 메인', frequency: '매일', time: '07:00, 15:00', assignee: '청소팀 B', lastDone: '오늘 07:00', status: '완료' },
  { id: 3, area: '필라테스룸', frequency: '매일', time: '09:00, 18:00', assignee: '청소팀 A', lastDone: '오늘 09:00', status: '예정' },
  { id: 4, area: '샤워실', frequency: '매일', time: '06:30, 13:30, 19:30', assignee: '청소팀 C', lastDone: '오늘 06:30', status: '완료' },
  { id: 5, area: '수영장', frequency: '주 3회', time: '06:00', assignee: '청소팀 B', lastDone: '2026-04-25', status: '예정' },
  { id: 6, area: '로비', frequency: '매일', time: '08:00, 17:00', assignee: '청소팀 A', lastDone: '오늘 08:00', status: '완료' },
];

const weekDays = ['월', '화', '수', '목', '금', '토', '일'];
const todayLog = [
  { time: '06:00', area: '탈의실 A', staff: '김청소', done: true },
  { time: '06:30', area: '샤워실', staff: '이청소', done: true },
  { time: '07:00', area: '헬스장 메인', staff: '박청소', done: true },
  { time: '08:00', area: '로비', staff: '김청소', done: true },
  { time: '09:00', area: '필라테스룸', staff: '이청소', done: false },
  { time: '13:30', area: '샤워실', staff: '이청소', done: false },
];

export default function CleaningSchedulePage() {
  const [tab, setTab] = useState<'스케줄' | '오늘점검'>('스케줄');

  return (
    <AppLayout>
      <PageHeader title="청소 스케줄" description="구역별 청소 일정과 완료 현황을 관리합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 스케줄 등록
        </button>
      } />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">오늘 완료</p>
          <p className="text-2xl font-bold text-green-600">4건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">오늘 예정</p>
          <p className="text-2xl font-bold text-blue-600">2건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 주 완료율</p>
          <p className="text-2xl font-bold text-gray-900">94%</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['스케줄', '오늘점검'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '스케줄' ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {schedule.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${item.status === '완료' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  <Sparkles className={`w-4 h-4 ${item.status === '완료' ? 'text-green-600' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.area}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.frequency} · {item.time} · {item.assignee}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">최근 완료</p>
                  <p className="text-xs font-medium text-gray-700">{item.lastDone}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${item.status === '완료' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {todayLog.map((log, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <span className="text-sm font-mono text-gray-600 w-12">{log.time}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{log.area}</p>
                  <p className="text-xs text-gray-400">{log.staff}</p>
                </div>
              </div>
              {log.done
                ? <CheckCircle className="w-5 h-5 text-green-500" />
                : <Clock className="w-5 h-5 text-gray-300" />}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
