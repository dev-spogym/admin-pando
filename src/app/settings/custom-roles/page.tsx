'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Shield, Plus, Edit2, Trash2, Copy, Users } from 'lucide-react';

const roles = [
  { id: 1, name: '매니저', base: '기본 역할', members: 8, permissions: ['회원관리', '매출조회', '수업관리', '메시지발송'], custom: false },
  { id: 2, name: '트레이너', base: '기본 역할', members: 12, permissions: ['수업관리', '회원조회', '출석처리'], custom: false },
  { id: 3, name: '프론트 데스크', base: '기본 역할', members: 4, permissions: ['회원조회', '출석처리', 'POS결제'], custom: false },
  { id: 4, name: '시니어 트레이너', base: '트레이너', members: 3, permissions: ['수업관리', '회원조회', '출석처리', '체성분조회', '목표설정'], custom: true },
  { id: 5, name: 'FC (영업)', base: '매니저', members: 5, permissions: ['회원관리', '상담관리', '리드관리', '매출조회', '메시지발송'], custom: true },
];

export default function CustomRolesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <AppLayout>
      <PageHeader title="커스텀 역할 생성" description="기본 역할을 기반으로 권한을 조합한 맞춤 역할을 생성합니다" actions={
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> 역할 생성
        </button>
      } />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 역할</p>
          <p className="text-2xl font-bold text-gray-900">5개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">커스텀 역할</p>
          <p className="text-2xl font-bold text-purple-600">2개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">역할 배정 직원</p>
          <p className="text-2xl font-bold text-blue-600">32명</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {roles.map(role => (
          <div key={role.id}
            onClick={() => setSelected(selected === role.id ? null : role.id)}
            className={`cursor-pointer transition-colors ${selected === role.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl ${role.custom ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Shield className={`w-4 h-4 ${role.custom ? 'text-purple-600' : 'text-gray-500'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{role.name}</p>
                    {role.custom && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">커스텀</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">기반: {role.base} · {role.members}명 사용 중</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={e => e.stopPropagation()}><Copy className="w-4 h-4" /></button>
                {role.custom && (
                  <>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={e => e.stopPropagation()}><Edit2 className="w-4 h-4" /></button>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={e => e.stopPropagation()}><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
            {selected === role.id && (
              <div className="px-5 pb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">허용 권한</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.map(p => (
                    <span key={p} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-gray-900">새 역할 생성</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">역할 이름</label>
              <input className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="예: 시니어 트레이너" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기반 역할</label>
              <select className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>매니저</option><option>트레이너</option><option>프론트 데스크</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">추가 권한</label>
              <div className="flex flex-wrap gap-2">
                {['체성분조회', '목표설정', '급여조회', '리드관리', '상담관리', '통계조회'].map(p => (
                  <label key={p} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input type="checkbox" className="rounded" /> {p}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg">저장</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
