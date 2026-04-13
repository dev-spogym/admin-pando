'use client';
export const dynamic = 'force-dynamic';

﻿import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, MapPin, Loader2, ChevronDown, Check } from 'lucide-react';
import { moveToPage } from '@/internal';
import { cn } from '@/lib/utils';
import { useLogin } from '@/api/hooks/useAuth';
import { getBranches } from '@/api/endpoints';
import type { Branch } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const REMEMBER_KEY = 'spoGym_rememberedId';
const FAIL_COUNT_KEY = 'login_fail_count';
const LOCKED_UNTIL_KEY = 'login_fail_locked_until';
const MAX_FAIL_COUNT = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30분

function getLoginLockState(): { isLocked: boolean; remainingMs: number } {
  const lockedUntil = localStorage.getItem(LOCKED_UNTIL_KEY);
  if (!lockedUntil) return { isLocked: false, remainingMs: 0 };
  const remaining = Number(lockedUntil) - Date.now();
  if (remaining > 0) return { isLocked: true, remainingMs: remaining };
  // 잠금 시간 경과 — 자동 해제
  localStorage.removeItem(LOCKED_UNTIL_KEY);
  localStorage.removeItem(FAIL_COUNT_KEY);
  return { isLocked: false, remainingMs: 0 };
}

function incrementFailCount(): number {
  const prev = Number(localStorage.getItem(FAIL_COUNT_KEY) ?? '0');
  const next = prev + 1;
  localStorage.setItem(FAIL_COUNT_KEY, String(next));
  if (next >= MAX_FAIL_COUNT) {
    localStorage.setItem(LOCKED_UNTIL_KEY, String(Date.now() + LOCK_DURATION_MS));
  }
  return next;
}

function clearFailCount() {
  localStorage.removeItem(FAIL_COUNT_KEY);
  localStorage.removeItem(LOCKED_UNTIL_KEY);
}

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const loginMutation = useLogin();
  const authLogin = useAuthStore((s) => s.login);

  const isFormValid = id.trim() !== '' && password.trim() !== '';
  const isLoading = loginMutation.isPending;

  // 저장된 아이디 복원 + 지점 목록 로드 + 잠금 상태 확인
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setId(saved);
      setRememberMe(true);
    }

    const { isLocked: locked } = getLoginLockState();
    if (locked) {
      setIsLocked(true);
      setError('계정이 잠겼습니다. 본사 IT팀에 문의하세요.');
    }

    getBranches().then((res) => {
      if (res.success && res.data.length > 0) {
        setBranches(res.data);
        setSelectedBranchId(String(res.data[0].id));
      }
      setBranchesLoading(false);
    });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isLocked) return;

    // 잠금 상태 재확인 (타이머 경과 여부)
    const { isLocked: stillLocked } = getLoginLockState();
    if (stillLocked) {
      setIsLocked(true);
      setError('계정이 잠겼습니다. 본사 IT팀에 문의하세요.');
      return;
    }

    setError('');

    loginMutation.mutate(
      { username: id, password },
      {
        onSuccess: (res) => {
          if (!res.success) {
            const failCount = incrementFailCount();
            if (failCount >= MAX_FAIL_COUNT) {
              setIsLocked(true);
              setError('계정이 잠겼습니다. 본사 IT팀에 문의하세요.');
              toast.error('계정이 잠겼습니다. 본사 IT팀에 문의하세요.');
            } else {
              const remaining = MAX_FAIL_COUNT - failCount;
              setError(`이메일 또는 비밀번호가 올바르지 않습니다. (${remaining}회 더 실패 시 계정이 잠깁니다)`);
            }
            return;
          }

          // 로그인 성공 시 실패 횟수 초기화
          clearFailCount();

          // 로그인 유지: 아이디 저장/삭제
          if (rememberMe) {
            localStorage.setItem(REMEMBER_KEY, id);
          } else {
            localStorage.removeItem(REMEMBER_KEY);
          }

          const { user, accessToken } = res.data;
          const isSuperAdmin = user.isSuperAdmin ?? false;
          const selectedBranch = branches.find((b) => String(b.id) === selectedBranchId);

          // 슈퍼관리자는 branchId가 null일 수 있음 — 선택한 지점 또는 빈 문자열 사용
          const branchIdToUse = isSuperAdmin
            ? (selectedBranchId || '')
            : (selectedBranchId || String(user.branchId ?? 1));
          if (branchIdToUse) {
            localStorage.setItem('branchId', branchIdToUse);
          }

          // authStore에 사용자 정보 저장
          authLogin(
            {
              id: String(user.id),
              name: user.name,
              email: '',
              role: user.role,
              branchId: branchIdToUse,
              branchName: isSuperAdmin ? (selectedBranch?.name ?? '전체 지점') : (selectedBranch?.name ?? ''),
              // 멀티테넌트 신규 필드 (DB에 없으면 fallback)
              tenantId: String(user.tenantId ?? 1),
              isSuperAdmin,
              currentBranchId: user.currentBranchId ? String(user.currentBranchId) : null,
            },
            accessToken,
          );

          moveToPage(966);
        },
        onError: () => {
          setError('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        },
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-md">
      <div className="w-full max-w-[400px] bg-surface rounded-2xl shadow-lg p-xl flex flex-col items-center border border-line">
        {/* 로고 */}
        <div className="mb-xl flex flex-col items-center gap-sm">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
            <span className="text-[20px] font-bold">S</span>
          </div>
          <h1 className="text-[20px] font-bold text-content tracking-tight mt-sm">FitGenie CRM</h1>
          <p className="text-[13px] text-content-secondary">피트니스 센터 통합 관리 솔루션</p>
        </div>

        <form className="w-full space-y-md" onSubmit={handleLogin}>
          {/* 지점 선택 */}
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">지점 선택</label>
            <div className="relative">
              <MapPin className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
              <Select
                className="w-full pl-9 pr-md py-[10px] bg-surface-secondary rounded-lg text-[13px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none appearance-none cursor-pointer transition-all disabled:opacity-50"
                value={selectedBranchId}
                onChange={(v) => setSelectedBranchId(v)}
                disabled={branchesLoading || isLoading}
                options={
                  branchesLoading
                    ? [{ value: '', label: '지점 로딩 중...' }]
                    : branches.length === 0
                    ? [{ value: '', label: '지점 없음' }]
                    : branches.map((b) => ({ value: String(b.id), label: b.name }))
                }
              />
              <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" size={14} />
            </div>
          </div>

          {/* 아이디 */}
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">아이디</label>
            <div className="relative">
              <User className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
              <input
                className="w-full pl-9 pr-md h-[44px] bg-surface-secondary rounded-lg text-[13px] text-content placeholder:text-content-tertiary border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                type="text"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => { setId(e.target.value); setError(''); }}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={!!error}
              />
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
              <input
                className="w-full pl-9 pr-10 h-[44px] bg-surface-secondary rounded-lg text-[13px] text-content placeholder:text-content-tertiary border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                disabled={isLoading}
                aria-required="true"
                aria-invalid={!!error}
              />
              <button
                className="absolute right-[12px] top-1/2 -translate-y-1/2 text-content-tertiary hover:text-content transition-colors"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 로그인 유지 & 비밀번호 찾기 */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-sm cursor-pointer">
              <div
                className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center transition-all',
                  rememberMe ? 'bg-primary border-primary' : 'border-line hover:border-content-tertiary',
                )}
              >
                {rememberMe && <Check className="text-white" size={11} strokeWidth={3} />}
                <input
                  className="sr-only"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  aria-label="로그인 유지"
                />
              </div>
              <span className="text-[13px] text-content-secondary select-none">로그인 유지</span>
            </label>
            <button
              className="text-[13px] text-content-secondary hover:text-primary transition-colors font-medium"
              type="button"
              onClick={() => toast.info('비밀번호 찾기는 관리자에게 문의해주세요.')}
            >
              비밀번호 찾기
            </button>
          </div>

          {/* 에러 */}
          {error && (
            <div role="alert" className="bg-red-50 border border-red-200 text-state-error p-sm rounded-lg text-center text-[13px]">
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <Button
            variant="primary"
            fullWidth
            type="submit"
            loading={isLoading}
            disabled={!isFormValid || isLoading || isLocked}
          >
            {isLocked ? '계정 잠금' : isLoading ? '로그인 중...' : '로그인'}
          </Button>
        </form>

        <div className="mt-lg text-center">
          <p className="text-[12px] text-content-tertiary">
            도움이 필요하신가요?{' '}
            <Button variant="ghost" size="sm" type="button" onClick={() => toast.info('고객센터: 02-1234-5678 (평일 09:00~18:00)')}>
              고객센터 문의
            </Button>
          </p>
        </div>
      </div>

      <div className="fixed bottom-md left-0 w-full text-center text-[11px] text-content-tertiary pointer-events-none">
        &copy; 2026 FitGenie CRM. All rights reserved.
      </div>
    </div>
  );
}


