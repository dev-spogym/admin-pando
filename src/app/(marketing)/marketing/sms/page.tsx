'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { MessageSquare, Send, Users, CheckCircle, Clock } from 'lucide-react';

const history = [
  { id: 1, type: 'SMS', title: '5월 이벤트 안내', target: '전체 회원', sent: 892, delivered: 880, read: 634, date: '2026-04-26 14:00', status: '완료' },
  { id: 2, type: '카카오', title: '만료 임박 알림', target: '만료 D-7', sent: 45, delivered: 45, read: 38, date: '2026-04-25 10:00', status: '완료' },
  { id: 3, type: 'SMS', title: '오늘 수업 알림', target: '오늘 예약자', sent: 28, delivered: 28, read: 22, date: '2026-04-26 08:00', status: '완료' },
  { id: 4, type: '카카오', title: '생일 축하 메시지', target: '이번 달 생일', sent: 12, delivered: 12, read: 10, date: '2026-04-27 09:00', status: '예정' },
];

const templates = [
  { name: '만료 안내', type: 'SMS', content: '[FitGenie] 회원님의 이용권이 {D}일 후 만료됩니다. 재등록 시 특별 혜택을 드립니다.' },
  { name: '수업 예약 확인', type: '카카오', content: '안녕하세요 {이름}님! {날짜} {수업명} 수업이 예약되었습니다.' },
  { name: '생일 축하', type: '카카오', content: '🎉 {이름}님, 생일을 진심으로 축하드립니다! 특별한 날을 기념해 {혜택}을 드립니다.' },
];

export default function SmsKakaoPage() {
  const [tab, setTab] = useState<'발송이력' | '템플릿' | '새 발송'>('발송이력');

  return (
    <AppLayout>
      <PageHeader title="SMS / 카카오 발송" description="회원에게 SMS와 카카오 알림톡을 직접 발송합니다" actions={
        <button onClick={() => setTab('새 발송')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Send className="w-4 h-4" /> 새 발송
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 발송</p>
          <p className="text-2xl font-bold text-gray-900">977건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">도달률</p>
          <p className="text-2xl font-bold text-green-600">98.7%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">오픈율</p>
          <p className="text-2xl font-bold text-blue-600">71%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 비용</p>
          <p className="text-2xl font-bold text-gray-900">₩14,655</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {(['발송이력', '템플릿', '새 발송'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '발송이력' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {history.map(h => (
            <div key={h.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${h.type === 'SMS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.type}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{h.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.target} · {h.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center"><p className="text-xs text-gray-400">발송</p><p className="font-medium">{h.sent}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400">도달</p><p className="font-medium text-green-600">{h.delivered}</p></div>
                <div className="text-center"><p className="text-xs text-gray-400">읽음</p><p className="font-medium text-blue-600">{h.read}</p></div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${h.status === '완료' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{h.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === '템플릿' && (
        <div className="space-y-3">
          {templates.map((t, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.type === 'SMS' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.type}</span>
                <span className="text-sm font-semibold text-gray-800">{t.name}</span>
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{t.content}</p>
              <div className="flex gap-2 mt-3">
                <button className="text-xs text-blue-600 hover:underline">편집</button>
                <button className="text-xs text-green-600 hover:underline">이 템플릿으로 발송</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === '새 발송' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발송 채널</label>
            <div className="flex gap-2">
              <button className="flex-1 py-2 border-2 border-blue-500 text-blue-600 text-sm font-medium rounded-lg">SMS</button>
              <button className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">카카오 알림톡</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">수신자</label>
            <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>전체 회원 (892명)</option><option>만료 D-30 (145명)</option><option>신규 가입 30일 (18명)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메시지 내용</label>
            <textarea rows={4} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="메시지를 입력하세요 (최대 80자)" />
            <p className="text-xs text-gray-400 mt-1 text-right">0 / 80자</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">발송 시간</label>
            <div className="flex gap-2">
              <button className="px-3 py-2 border-2 border-blue-500 text-blue-600 text-sm font-medium rounded-lg">즉시 발송</button>
              <button className="px-3 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">예약 발송</button>
            </div>
          </div>
          <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
            <Send className="w-4 h-4" /> 발송하기
          </button>
        </div>
      )}
    </AppLayout>
  );
}
