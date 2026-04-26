'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Wrench, AlertTriangle, CheckCircle, Clock, Plus } from 'lucide-react';

const equipment = [
  { id: 1, name: '트레드밀 #1', location: 'A존', lastCheck: '2026-04-15', nextCheck: '2026-05-15', status: '정상', issue: null },
  { id: 2, name: '레그프레스 #2', location: 'B존', lastCheck: '2026-04-10', nextCheck: '2026-05-10', status: '점검필요', issue: '소음 발생' },
  { id: 3, name: '스미스머신 #1', location: 'C존', lastCheck: '2026-04-20', nextCheck: '2026-05-20', status: '정상', issue: null },
  { id: 4, name: '러닝머신 #3', location: 'A존', lastCheck: '2026-03-28', nextCheck: '2026-04-28', status: '점검필요', issue: '벨트 마모' },
  { id: 5, name: '케이블머신 #2', location: 'B존', lastCheck: '2026-04-18', nextCheck: '2026-05-18', status: '수리중', issue: '풀리 교체' },
  { id: 6, name: '덤벨 랙 #1', location: 'D존', lastCheck: '2026-04-22', nextCheck: '2026-05-22', status: '정상', issue: null },
];

const statusIcon: Record<string, React.ReactNode> = {
  '정상': <CheckCircle className="w-4 h-4 text-green-500" />,
  '점검필요': <AlertTriangle className="w-4 h-4 text-amber-500" />,
  '수리중': <Wrench className="w-4 h-4 text-red-500" />,
};

const statusColor: Record<string, string> = {
  '정상': 'bg-green-100 text-green-700',
  '점검필요': 'bg-amber-100 text-amber-700',
  '수리중': 'bg-red-100 text-red-700',
};

export default function EquipmentMaintenancePage() {
  const [filter, setFilter] = useState('전체');

  const counts = { 전체: equipment.length, 정상: equipment.filter(e => e.status === '정상').length, 점검필요: equipment.filter(e => e.status === '점검필요').length, 수리중: equipment.filter(e => e.status === '수리중').length };
  const filtered = filter === '전체' ? equipment : equipment.filter(e => e.status === filter);

  return (
    <AppLayout>
      <PageHeader title="장비 점검 일정" description="시설 장비의 정기 점검과 수리 이력을 관리합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 점검 등록
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {Object.entries(counts).map(([key, val]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`rounded-xl border p-4 text-left transition-all ${filter === key ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <p className="text-xs text-gray-500 mb-1">{key}</p>
            <p className={`text-2xl font-bold ${key === '점검필요' ? 'text-amber-600' : key === '수리중' ? 'text-red-600' : key === '정상' ? 'text-green-600' : 'text-gray-900'}`}>{val}개</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {filtered.map(item => (
          <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
            <div className="flex items-center gap-4">
              <div className={`p-2.5 rounded-xl ${statusColor[item.status].split(' ')[0]}`}>
                {statusIcon[item.status]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                  <span className="text-xs text-gray-400">{item.location}</span>
                </div>
                {item.issue && <p className="text-xs text-red-500 mt-0.5">{item.issue}</p>}
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-400">최근 점검</p>
                <p className="text-xs font-medium text-gray-700">{item.lastCheck}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">다음 점검</p>
                <p className="text-xs font-medium text-gray-700">{item.nextCheck}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
