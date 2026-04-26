'use client';

import React, { useState } from 'react';
import { User, Camera, Lock, LogOut, Save, Loader2, Shield } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '관리자',
    phone: '',
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const roleLabel: Record<string, string> = {
    superAdmin: '슈퍼관리자',
    primary: '최고관리자',
    owner: '센터장',
    manager: '매니저',
    fc: 'FC (피트니스 코치)',
    trainer: '트레이너',
    staff: '스태프',
    front: '프론트',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">내 계정</h1>
        <p className="text-sm text-gray-500 mt-0.5">프로필 정보를 확인하고 수정할 수 있습니다</p>
      </div>

      {/* 프로필 사진 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-10 h-10 text-blue-500" />
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors">
              <Camera className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">{user?.name ?? '관리자'}</p>
            <p className="text-sm text-gray-500 mt-0.5">{user?.email ?? '-'}</p>
            <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
              {roleLabel[user?.role ?? ''] ?? user?.role ?? '사용자'}
            </span>
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-gray-700">기본 정보</h2>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
            <input
              type="email"
              value={user?.email ?? '-'}
              disabled
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="010-0000-0000"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">소속 지점</label>
            <input
              type="text"
              value={user?.branchName ?? '-'}
              disabled
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-blue-400"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? '저장 완료!' : saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      {/* 보안 설정 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">보안 설정</h2>
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">비밀번호 변경</p>
              <p className="text-xs text-gray-400">이메일로 재설정 링크를 발송합니다</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/reset-password')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            변경하기
          </button>
        </div>
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-800">2단계 인증</p>
              <p className="text-xs text-gray-400">추가 보안 인증을 설정합니다</p>
            </div>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">준비 중</span>
        </div>
      </div>

      {/* 로그아웃 */}
      <div className="bg-white rounded-xl border border-red-100 p-4">
        <button className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium transition-colors">
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}
