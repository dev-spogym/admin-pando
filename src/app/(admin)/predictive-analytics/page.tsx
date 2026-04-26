'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Brain, TrendingUp, AlertTriangle, Users, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const predictions = [
  { metric: '다음 달 예상 매출', value: '₩47,200,000', change: '+8.3%', direction: 'up', confidence: 87, basis: '최근 3개월 추세 + 계절 요인' },
  { metric: '예상 신규 등록', value: '38명', change: '+12.5%', direction: 'up', confidence: 72, basis: '리드 전환율 + 프로모션 효과' },
  { metric: '예상 이탈 위험 회원', value: '23명', change: '+5명', direction: 'up', confidence: 81, basis: '방문 패턴 이상 감지' },
  { metric: '예상 만료 처리', value: '67명', change: '-3.2%', direction: 'down', confidence: 94, basis: '이용권 만료일 기준' },
];

const riskMembers = [
  { name: '김민준', risk: 92, lastVisit: '18일 전', signal: '방문 빈도 급감' },
  { name: '이서연', risk: 85, lastVisit: '24일 전', signal: '만료 D-12, 미재등록' },
  { name: '박지훈', risk: 78, lastVisit: '31일 전', signal: '장기 미방문' },
  { name: '최유리', risk: 71, lastVisit: '15일 전', signal: '최근 예약 취소 3회' },
  { name: '정현우', risk: 65, lastVisit: '20일 전', signal: '출석률 30%대' },
];

export default function PredictiveAnalyticsPage() {
  const [tab, setTab] = useState<'예측지표' | '이탈위험'>('예측지표');

  return (
    <AppLayout>
      <PageHeader title="예측 분석" description="과거 데이터와 패턴을 기반으로 미래 지표를 예측합니다" />

      <div className="flex items-center gap-2 mb-6 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
        <Brain className="w-4 h-4 text-indigo-600" />
        <p className="text-sm text-indigo-700">AI 예측 모델이 2025.01 ~ 2026.04 데이터를 학습해 분석 중입니다</p>
      </div>

      <div className="flex gap-2 mb-4">
        {(['예측지표', '이탈위험'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === '예측지표' ? (
        <div className="grid grid-cols-2 gap-4">
          {predictions.map((p, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500 mb-2">{p.metric}</p>
              <div className="flex items-end justify-between mb-3">
                <p className="text-2xl font-bold text-gray-900">{p.value}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${p.direction === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {p.direction === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  {p.change}
                </div>
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>예측 신뢰도</span>
                  <span className="font-medium text-gray-700">{p.confidence}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${p.confidence}%` }} />
                </div>
              </div>
              <p className="text-xs text-gray-400">{p.basis}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-800">이탈 위험 회원 TOP 5</span>
            <span className="text-xs text-gray-400 ml-1">— 즉시 리텐션 액션 권장</span>
          </div>
          <div className="divide-y divide-gray-100">
            {riskMembers.map((m, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.signal} · 마지막 방문 {m.lastVisit}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1">이탈 위험도</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${m.risk >= 90 ? 'bg-red-500' : m.risk >= 75 ? 'bg-amber-500' : 'bg-yellow-400'}`}
                          style={{ width: `${m.risk}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${m.risk >= 90 ? 'text-red-600' : m.risk >= 75 ? 'text-amber-600' : 'text-yellow-600'}`}>{m.risk}%</span>
                    </div>
                  </div>
                  <button className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700">상담 연결</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
