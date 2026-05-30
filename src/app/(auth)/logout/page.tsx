'use client';

import React, { useEffect, useState } from 'react';
import { LogOut, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

export const dynamic = 'force-dynamic';

export default function LogoutPage() {
  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirmLogout = () => {
    setIsProcessing(true);
    useAuthStore.getState().logout();
    router.replace('/login');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-secondary px-md">
      <section className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-xl shadow-card-deep">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <LogOut size={22} />
        </div>
        <h1 className="mt-lg text-[22px] font-bold text-content">로그아웃 하시겠습니까?</h1>
        <p className="mt-sm text-[13px] leading-6 text-content-secondary">
          {mounted && authUser?.name ? `${authUser.name} 계정의 ` : ''}
          현재 세션을 종료하고 로그인 화면으로 이동합니다.
        </p>

        <div className="mt-lg grid grid-cols-2 gap-sm">
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-xs rounded-xl border border-line bg-white text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary"
            onClick={() => router.back()}
            disabled={isProcessing}
          >
            <X size={15} />
            취소
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center gap-xs rounded-xl bg-danger text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
            onClick={confirmLogout}
            disabled={isProcessing}
          >
            {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
            로그아웃
          </button>
        </div>
      </section>
    </main>
  );
}
