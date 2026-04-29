'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { BellRing, Building2, CheckCircle2, Clock, Plus, ShieldCheck, SlidersHorizontal } from 'lucide-react';

const policySets = [
  { name: '표준 만료 알림 정책', scope: '전 지점', steps: 5, branches: 12, status: '사용 중', updatedAt: '2026-04-29' },
  { name: 'VIP 재등록 집중 관리', scope: '프리미엄 지점', steps: 4, branches: 4, status: '검수 중', updatedAt: '2026-04-26' },
  { name: '휴면 회원 복귀 캠페인', scope: '선택 지점', steps: 3, branches: 8, status: '일시 중지', updatedAt: '2026-04-22' },
];

const steps = [
  { day: 'D-30', channel: '카카오 알림톡', required: '필수', template: '만료 예정 1차 안내' },
  { day: 'D-14', channel: 'SMS', required: '권장', template: '재등록 혜택 안내' },
  { day: 'D-7', channel: 'FC 액션 큐', required: '필수', template: '전화 상담 요청' },
  { day: 'D+1', channel: '앱 푸시', required: '선택', template: '만료 후 복귀 안내' },
];

const statusTone: Record<string, string> = {
  '사용 중': 'bg-emerald-100 text-emerald-700',
  '검수 중': 'bg-amber-100 text-amber-700',
  '일시 중지': 'bg-slate-100 text-slate-600',
};

export default function AutomationPoliciesPage() {
  const [selected, setSelected] = useState(policySets[0]);

  return (
    <AppLayout>
      <PageHeader
        title="자동화 정책 라이브러리"
        description="본사가 전 지점에 적용할 만료 알림과 운영 자동화 정책 세트를 관리합니다"
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" /> 정책 세트 생성
          </button>
        }
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 화면 구조 검수용 목업이며 Supabase·외부 템플릿 연동은 후속 단계입니다.
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: '운영 정책 세트', value: '3개', icon: ShieldCheck, tone: 'text-blue-600 bg-blue-50' },
          { label: '적용 지점', value: '12곳', icon: Building2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: '필수 스텝', value: '7개', icon: BellRing, tone: 'text-amber-600 bg-amber-50' },
          { label: '최근 수정', value: '04/29', icon: Clock, tone: 'text-slate-600 bg-slate-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-6">
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">정책 세트</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {policySets.map((policy) => (
              <button
                key={policy.name}
                type="button"
                onClick={() => setSelected(policy)}
                className={`w-full px-5 py-4 text-left transition-colors ${
                  selected.name === policy.name ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{policy.name}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone[policy.status]}`}>
                    {policy.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{policy.scope} · {policy.steps}개 스텝 · {policy.branches}개 지점 적용</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{selected.name}</h2>
              <p className="mt-1 text-xs text-gray-500">마지막 수정일 {selected.updatedAt}</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <SlidersHorizontal className="h-4 w-4" /> 허용 범위 설정
            </button>
          </div>

          <div className="p-5">
            <div className="mb-5 grid grid-cols-3 gap-3">
              {['적용 범위', '지점 수정 권한', '신규 적용 상태'].map((label, index) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">
                    {index === 0 ? selected.scope : index === 1 ? '허용 스텝만 조정' : selected.status}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">기준일</th>
                    <th className="px-4 py-3 text-left font-medium">채널</th>
                    <th className="px-4 py-3 text-left font-medium">필수 여부</th>
                    <th className="px-4 py-3 text-left font-medium">템플릿</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {steps.map((step) => (
                    <tr key={`${step.day}-${step.channel}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{step.day}</td>
                      <td className="px-4 py-3 text-gray-700">{step.channel}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{step.required}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{step.template}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> 사용 중지된 정책은 신규 적용만 차단하고 기존 지점에는 영향 범위를 고지합니다.
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
