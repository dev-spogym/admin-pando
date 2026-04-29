'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Bell, CheckCircle2, RotateCcw, Send, ToggleLeft, ToggleRight } from 'lucide-react';

const scopes = ['회원권 만료', '락커 만료', '미수금 독촉', '휴면 회원'] as const;

const policySteps = [
  { day: 'D-30', channel: '카카오', title: '만료 예정 1차 안내', required: true, enabled: true },
  { day: 'D-14', channel: 'SMS', title: '재등록 혜택 안내', required: false, enabled: true },
  { day: 'D-7', channel: 'FC 액션 큐', title: '전화 상담 요청', required: true, enabled: true },
  { day: 'D+1', channel: '앱 푸시', title: '만료 후 복귀 안내', required: false, enabled: false },
];

export default function SettingsAutomationPage() {
  const [activeScope, setActiveScope] = useState<(typeof scopes)[number]>('회원권 만료');
  const [steps, setSteps] = useState(policySteps);

  return (
    <AppLayout>
      <PageHeader
        title="지점 자동화 적용"
        description="본사에서 배포한 자동화 정책 세트를 지점 운영 범위 안에서 선택·적용합니다"
        actions={
          <div className="flex gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Send className="h-4 w-4" /> 테스트 발송
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <CheckCircle2 className="h-4 w-4" /> 적용 저장
            </button>
          </div>
        }
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 본사 정책 세트 선택과 허용 스텝 on/off 화면을 목업 데이터로 표시합니다.
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          ['적용 중 정책', '표준 만료 알림'],
          ['활성 스텝', `${steps.filter((step) => step.enabled).length}개`],
          ['필수 스텝', `${steps.filter((step) => step.required).length}개`],
          ['최근 테스트', '04/29 14:20'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[260px_1fr] gap-6">
        <section className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">적용 범위</p>
          <div className="space-y-1">
            {scopes.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setActiveScope(scope)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  activeScope === scope ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {scope}
                {activeScope === scope && <Bell className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{activeScope} 정책</h2>
              <p className="mt-1 text-xs text-gray-500">지점은 본사가 허용한 선택 스텝만 끄거나 켤 수 있습니다.</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RotateCcw className="h-4 w-4" /> 본사 기본값 복원
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {steps.map((step, index) => (
              <div key={`${step.day}-${step.channel}`} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-700">
                    {step.day}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{step.title}</p>
                      {step.required && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">필수</span>}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{step.channel} 발송 · 본사 템플릿 사용</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={step.required}
                  onClick={() =>
                    setSteps((prev) => prev.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)))
                  }
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                    step.required ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {step.enabled ? <ToggleRight className="h-5 w-5 text-blue-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  {step.enabled ? '활성' : '비활성'}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
