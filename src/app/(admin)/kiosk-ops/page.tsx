'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { AlertTriangle, CheckCircle2, MonitorCog, Power, RefreshCw, WifiOff } from 'lucide-react';

const kiosks = [
  { name: '1층 입구 키오스크', branch: '강남점', status: '정상', lastSeen: '방금 전', mode: '출입+출석', issue: '-' },
  { name: 'PT존 태블릿', branch: '강남점', status: '오프라인', lastSeen: '18분 전', mode: '수업 체크인', issue: '네트워크 끊김' },
  { name: '골프존 키오스크', branch: '잠실점', status: '오류', lastSeen: '5분 전', mode: '타석 체크인', issue: '앱 업데이트 실패' },
  { name: '프런트 보조 태블릿', branch: '분당점', status: '정상', lastSeen: '1분 전', mode: '수동 출석', issue: '-' },
];

const statusStyle: Record<string, string> = {
  정상: 'bg-emerald-100 text-emerald-700',
  오프라인: 'bg-slate-100 text-slate-600',
  오류: 'bg-red-100 text-red-700',
};

const statusIcon: Record<string, React.ReactNode> = {
  정상: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  오프라인: <WifiOff className="h-4 w-4 text-slate-500" />,
  오류: <AlertTriangle className="h-4 w-4 text-red-600" />,
};

export default function KioskOpsPage() {
  const [filter, setFilter] = useState('전체');
  const filtered = filter === '전체' ? kiosks : kiosks.filter((kiosk) => kiosk.status === filter);

  return (
    <AppLayout>
      <PageHeader
        title="키오스크 운영 현황"
        description="현장 키오스크와 태블릿의 온라인 상태, 오류, 운영 모드를 확인합니다"
        actions={
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" /> 상태 새로고침
          </button>
        }
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 실제 기기 heartbeat와 장애 이벤트는 후속 연동 대상입니다.
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: '전체 기기', value: kiosks.length, icon: MonitorCog, tone: 'text-blue-600 bg-blue-50' },
          { label: '정상', value: kiosks.filter((kiosk) => kiosk.status === '정상').length, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: '오프라인', value: kiosks.filter((kiosk) => kiosk.status === '오프라인').length, icon: WifiOff, tone: 'text-slate-600 bg-slate-50' },
          { label: '오류', value: kiosks.filter((kiosk) => kiosk.status === '오류').length, icon: AlertTriangle, tone: 'text-red-600 bg-red-50' },
        ].map((card) => (
          <button
            key={card.label}
            type="button"
            onClick={() => setFilter(card.label === '전체 기기' ? '전체' : card.label)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              (filter === '전체' && card.label === '전체 기기') || filter === card.label
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}대</p>
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">기기 상태 목록</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-5 py-3 text-left font-medium">기기명</th>
              <th className="px-5 py-3 text-left font-medium">지점</th>
              <th className="px-5 py-3 text-left font-medium">상태</th>
              <th className="px-5 py-3 text-left font-medium">운영 모드</th>
              <th className="px-5 py-3 text-left font-medium">최근 신호</th>
              <th className="px-5 py-3 text-left font-medium">조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((kiosk) => (
              <tr key={`${kiosk.branch}-${kiosk.name}`} className={kiosk.status !== '정상' ? 'bg-red-50/40' : undefined}>
                <td className="px-5 py-4 font-semibold text-gray-900">{kiosk.name}</td>
                <td className="px-5 py-4 text-gray-700">{kiosk.branch}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[kiosk.status]}`}>
                    {statusIcon[kiosk.status]} {kiosk.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-700">{kiosk.mode}</td>
                <td className="px-5 py-4 text-gray-500">{kiosk.lastSeen}</td>
                <td className="px-5 py-4">
                  <button className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <Power className="h-3.5 w-3.5" /> 원격 재시작
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppLayout>
  );
}
