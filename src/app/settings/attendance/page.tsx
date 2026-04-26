'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Clock, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export default function AttendanceSettingsPage() {
  const [settings, setSettings] = useState({
    autoCheckin: true,
    qrCheckin: true,
    rfidCheckin: true,
    lateThreshold: 10,
    earlyLeaveThreshold: 15,
    absentAfter: 30,
    allowManual: true,
    notifyLate: true,
    notifyAbsent: true,
    operatingStart: '06:00',
    operatingEnd: '22:00',
  });

  const toggle = (key: keyof typeof settings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const Toggle = ({ k }: { k: keyof typeof settings }) => (
    <button onClick={() => toggle(k)} className="text-gray-400 hover:text-blue-600">
      {settings[k]
        ? <ToggleRight className="w-8 h-8 text-blue-600" />
        : <ToggleLeft className="w-8 h-8 text-gray-300" />}
    </button>
  );

  return (
    <AppLayout>
      <PageHeader title="출석 관리 설정" description="출석 체크 방식, 기준 시간, 알림 조건을 설정합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Save className="w-4 h-4" /> 저장
        </button>
      } />

      <div className="max-w-2xl space-y-6">
        {/* 체크인 방식 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">체크인 방식</h3>
          <div className="space-y-4">
            {[
              { key: 'autoCheckin' as const, label: '자동 체크인', desc: '입장 시 자동으로 출석 처리' },
              { key: 'qrCheckin' as const, label: 'QR 코드 체크인', desc: '회원 앱의 QR 코드로 체크인' },
              { key: 'rfidCheckin' as const, label: 'RFID / 카드 체크인', desc: '밴드·카드 태그로 체크인' },
              { key: 'allowManual' as const, label: '수동 체크인 허용', desc: '직원이 직접 출석 처리 가능' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Toggle k={key} />
              </div>
            ))}
          </div>
        </div>

        {/* 시간 기준 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">시간 기준</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">지각 기준</p>
                <p className="text-xs text-gray-500">수업 시작 후 N분 이내 입장 시 지각 처리</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.lateThreshold}
                  onChange={e => setSettings(p => ({ ...p, lateThreshold: Number(e.target.value) }))}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-gray-500">분</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">결석 처리 기준</p>
                <p className="text-xs text-gray-500">수업 시작 후 N분 경과 시 결석</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" value={settings.absentAfter}
                  onChange={e => setSettings(p => ({ ...p, absentAfter: Number(e.target.value) }))}
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-gray-500">분</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1.5">운영 시작 시간</p>
                <input type="time" value={settings.operatingStart}
                  onChange={e => setSettings(p => ({ ...p, operatingStart: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800 mb-1.5">운영 종료 시간</p>
                <input type="time" value={settings.operatingEnd}
                  onChange={e => setSettings(p => ({ ...p, operatingEnd: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* 알림 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">알림 설정</h3>
          <div className="space-y-4">
            {[
              { key: 'notifyLate' as const, label: '지각 알림', desc: '지각 시 담당 트레이너에게 알림' },
              { key: 'notifyAbsent' as const, label: '결석 알림', desc: '결석 시 FC에게 알림 (리텐션 상담 연계)' },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <Toggle k={key} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
