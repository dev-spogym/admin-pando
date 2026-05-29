'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock3, Home, RotateCcw, ShieldX } from 'lucide-react';
import { moveToPage } from '@/internal';
import { getDefaultWorkspace } from '@/lib/appNavigation';
import { useAuthStore } from '@/stores/authStore';

const ERROR_TYPES = [
  {
    code: '404',
    title: '페이지를 찾을 수 없습니다',
    description: '주소가 변경되었거나 삭제된 화면입니다.',
    icon: AlertTriangle,
  },
  {
    code: '403',
    title: '접근 권한이 없습니다',
    description: '현재 계정으로 접근할 수 없는 업무 화면입니다.',
    icon: ShieldX,
  },
  {
    code: '500',
    title: '일시적인 오류가 발생했습니다',
    description: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    icon: RotateCcw,
  },
  {
    code: '503',
    title: '서비스 점검 중입니다',
    description: '점검 완료 후 다시 이용할 수 있습니다.',
    icon: Clock3,
  },
];

export default function ErrorGuidePage() {
  const authUser = useAuthStore((state) => state.user);
  const [mounted, setMounted] = useState(false);
  const mountedUser = mounted ? authUser : null;
  const workspace = mountedUser
    ? getDefaultWorkspace(mountedUser.role, mountedUser.isSuperAdmin)
    : { label: '로그인', viewId: 990, path: '/login' };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">ERROR</p>
          <h1 className="mt-3 text-3xl font-bold text-content">에러 페이지</h1>
          <p className="mt-3 text-sm leading-6 text-content-secondary">
            없는 페이지, 권한 부족, 서버 오류, 점검 상태를 안내하고 정상 화면으로 돌아갈 수 있게 합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ERROR_TYPES.map((errorType) => {
            const Icon = errorType.icon;
            return (
              <div key={errorType.code} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-content-tertiary">{errorType.code}</p>
                    <h2 className="mt-1 text-lg font-bold text-content">{errorType.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-content-secondary">{errorType.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-line bg-white px-6 py-6 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            onClick={() => moveToPage(workspace.viewId ?? 966)}
          >
            <Home size={16} />
            {workspace.label}로 이동
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-content-secondary hover:bg-surface-secondary"
            onClick={() => window.history.back()}
          >
            <RotateCcw size={16} />
            이전 화면으로
          </button>
        </div>
      </div>
    </div>
  );
}
