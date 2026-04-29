'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { LayoutDashboard, Plus, GripVertical, X, Save, BarChart3, Users, DollarSign, TrendingUp } from 'lucide-react';

const widgets = [
  { id: 1, type: '매출 현황', size: 'large', icon: DollarSign, color: 'blue' },
  { id: 2, type: '회원 수 추이', size: 'medium', icon: Users, color: 'green' },
  { id: 3, type: '수업 출석률', size: 'medium', icon: BarChart3, color: 'purple' },
  { id: 4, type: '목표 달성률', size: 'small', icon: TrendingUp, color: 'amber' },
];

const availableWidgets = [
  '매출 현황', '회원 수 추이', '수업 출석률', '목표 달성률',
  '환불 현황', '미수금 현황', '신규 등록', '만료 예정',
  '지점 비교', '담당자별 성과', '세그먼트 분포', '재등록률',
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  amber: 'bg-amber-100 text-amber-600',
};

export default function CustomDashboardPage() {
  const [editMode, setEditMode] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <AppLayout>
      <PageHeader title="커스텀 대시보드 빌더" description="원하는 지표를 조합해 나만의 대시보드를 구성합니다" actions={
        <div className="flex gap-2">
          {editMode && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 border border-blue-300 text-blue-600 text-sm rounded-lg hover:bg-blue-50">
              <Plus className="w-4 h-4" /> 위젯 추가
            </button>
          )}
          <button onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium ${editMode ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {editMode ? <><Save className="w-4 h-4" /> 저장</> : <><LayoutDashboard className="w-4 h-4" /> 편집</>}
          </button>
        </div>
      } />

      {editMode && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          위젯을 드래그해 위치를 변경하거나, X 버튼으로 제거할 수 있습니다.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {widgets.map(w => {
          const Icon = w.icon;
          return (
            <div key={w.id}
              className={`bg-white rounded-xl border-2 p-5 ${editMode ? 'border-dashed border-blue-300 cursor-move' : 'border-gray-200'} ${w.size === 'large' ? 'col-span-2' : w.size === 'medium' ? 'col-span-1' : 'col-span-1'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {editMode && <GripVertical className="w-4 h-4 text-gray-300" />}
                  <div className={`p-2 rounded-lg ${colorMap[w.color]}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{w.type}</span>
                </div>
                {editMode && <button className="p-1 text-gray-300 hover:text-red-500"><X className="w-4 h-4" /></button>}
              </div>
              <div className="h-32 bg-gray-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-12 h-12 text-gray-200" />
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-base font-bold text-gray-900 mb-4">위젯 추가</h2>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {availableWidgets.map(w => (
                <button key={w} className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-left transition-all">
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{w}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg">추가</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
