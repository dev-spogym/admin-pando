'use client';
export const dynamic = 'force-dynamic';

﻿import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, User, Loader2, Check, X, KeyRound, Copy } from 'lucide-react';
import { moveToPage } from '@/internal';
import { cn } from '@/lib/utils';
import { useLogin } from '@/api/hooks/useAuth';
import { getBranches } from '@/api/endpoints';
import type { Branch } from '@/api/endpoints';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

// 테스트 계정 프리셋 — 실제 Supabase users 테이블 기준 (비밀번호 전부 qwer1234!!)
// prisma/seed.ts 의 userSeed 와 동기화 유지
type AccountPreset = {
  username: string;
  password: string;
  label: string;
  branchId: number | null;
  branchName?: string;
  desc: string;
};

const PW = 'qwer1234!!';

const ACCOUNT_PRESETS: { group: string; items: AccountPreset[] }[] = [
  {
    group: '본사 (전 지점 데이터 + 슈퍼관리자 메뉴)',
    items: [
      { username: 'admin',       password: PW, label: '운영관리자',     branchId: null, branchName: '전체', desc: 'ADMIN · 슈퍼관리자' },
      { username: 'hq_director', password: PW, label: '본사 대표',       branchId: null, branchName: '전체', desc: 'ADMIN · 슈퍼관리자' },
      { username: 'hq_manager',  password: PW, label: '본사 운영팀장',   branchId: null, branchName: '전체', desc: 'MANAGER · 슈퍼관리자' },
      { username: 'hq_analyst',  password: PW, label: '본사 분석담당',   branchId: null, branchName: '전체', desc: 'MANAGER · 일반' },
    ],
  },
  {
    group: '광화문 (1지부)',
    items: [
      { username: 'gwanghwamun', password: PW, label: '광화문 매니저',   branchId: 1, branchName: '광화문', desc: 'MANAGER' },
      { username: 'manager1',    password: PW, label: '김관리',          branchId: 1, branchName: '광화문', desc: 'MANAGER' },
      { username: 'trainer1',    password: PW, label: '김태희',          branchId: 1, branchName: '광화문', desc: 'TRAINER' },
    ],
  },
  {
    group: '을지로 (1지부)',
    items: [
      { username: 'euljiro',     password: PW, label: '을지로 매니저',   branchId: 2, branchName: '을지로', desc: 'MANAGER' },
      { username: 'manager2',    password: PW, label: '이관리',          branchId: 2, branchName: '을지로', desc: 'MANAGER' },
      { username: 'trainer2',    password: PW, label: '이효리',          branchId: 2, branchName: '을지로', desc: 'TRAINER' },
    ],
  },
  {
    group: '그 외 지점',
    items: [
      { username: 'jongak',      password: PW, label: '종각 매니저',     branchId: 3,  branchName: '종각',   desc: '1지부 · MANAGER' },
      { username: 'jongno',      password: PW, label: '종로 매니저',     branchId: 4,  branchName: '종로',   desc: '1지부 · MANAGER' },
      { username: 'seogyo',      password: PW, label: '서교 매니저',     branchId: 5,  branchName: '서교',   desc: '1지부 · MANAGER' },
      { username: 'yongsan',     password: PW, label: '용산 매니저',     branchId: 10, branchName: '용산',   desc: '2지부 · MANAGER' },
      { username: 'pangyo',      password: PW, label: '판교 매니저',     branchId: 11, branchName: '판교',   desc: '2지부 · MANAGER' },
      { username: 'pangyoyk',    password: PW, label: '판교역 매니저',   branchId: 12, branchName: '판교역', desc: '2지부 · MANAGER' },
      { username: 'daechi',      password: PW, label: '대치 매니저',     branchId: 13, branchName: '대치',   desc: '2지부 · MANAGER' },
      { username: 'gocheok',     password: PW, label: '고척 매니저',     branchId: 14, branchName: '고척',   desc: '2지부 · MANAGER' },
      { username: 'bucheon',     password: PW, label: '부천 매니저',     branchId: 15, branchName: '부천',   desc: '2지부 · MANAGER' },
      { username: 'mokdong',     password: PW, label: '목동 매니저',     branchId: 16, branchName: '목동',   desc: '미설정 · MANAGER' },
    ],
  },
];

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
  const [showAccounts, setShowAccounts] = useState(false);

  const fillCredentials = (preset: AccountPreset) => {
    setId(preset.username);
    setPassword(preset.password);
    if (preset.branchId !== null) {
      const matched = branches.find((b) => b.id === preset.branchId);
      if (matched) setSelectedBranchId(String(matched.id));
    }
    setShowAccounts(false);
    setError('');
    toast.success(`${preset.label} 계정이 입력되었습니다`);
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} 복사됨`);
    } catch {
      toast.error('복사에 실패했습니다');
    }
  };

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

          // 슈퍼관리자는 currentBranchId=null 상태를 전체 지점 모드로 사용한다.
          const branchIdToUse = isSuperAdmin
            ? (selectedBranchId || String(user.branchId ?? 1))
            : (selectedBranchId || String(user.branchId ?? 1));
          const currentBranchId = isSuperAdmin ? (selectedBranchId || null) : null;

          // authStore에 사용자 정보 저장
          authLogin(
            {
              id: String(user.id),
              name: user.name,
              email: '',
              role: user.role,
              branchId: branchIdToUse,
              branchName: isSuperAdmin ? (selectedBranch?.name ?? '전체 지점 (통합)') : (selectedBranch?.name ?? ''),
              // 멀티테넌트 신규 필드 (DB에 없으면 fallback)
              tenantId: String(user.tenantId ?? 1),
              isSuperAdmin,
              currentBranchId,
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
            <Select
              label="지점 선택"
              placeholder="지점을 선택하세요"
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
                autoComplete="username"
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

        <div className="mt-lg w-full">
          <button
            type="button"
            onClick={() => setShowAccounts(true)}
            className="flex w-full items-center justify-center gap-sm rounded-lg border border-dashed border-line bg-surface-secondary py-sm text-[12px] font-medium text-content-secondary transition-colors hover:border-primary hover:text-primary"
          >
            <KeyRound size={14} />
            계정 목록 리스트 보기
          </button>
        </div>

        <div className="mt-md text-center">
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

      {showAccounts && (
        <AccountsModal
          onClose={() => setShowAccounts(false)}
          onPick={fillCredentials}
          onCopy={copyText}
        />
      )}
    </div>
  );
}

function AccountsModal({
  onClose,
  onPick,
  onCopy,
}: {
  onClose: () => void;
  onPick: (preset: AccountPreset) => void;
  onCopy: (text: string, label: string) => void;
}) {
  const handlePresetKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    preset: AccountPreset
  ) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onPick(preset);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[640px] max-h-[85vh] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line px-lg py-md">
          <div>
            <h2 className="text-[16px] font-bold text-content">테스트 계정 목록</h2>
            <p className="mt-[2px] text-[12px] text-content-secondary">
              항목 클릭 시 자동 입력. 복사 아이콘으로 ID/비밀번호 클립보드 복사.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-content-tertiary hover:text-content"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-lg py-md">
          <div className="flex flex-col gap-lg">
            {ACCOUNT_PRESETS.map((group) => (
              <section key={group.group}>
                <h3 className="mb-sm text-[12px] font-semibold uppercase tracking-wider text-content-tertiary">
                  {group.group}
                </h3>
                <ul className="flex flex-col gap-sm">
                  {group.items.map((preset) => (
                    <li
                      key={preset.username}
                      className="group rounded-xl border border-line bg-surface-secondary p-md transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => onPick(preset)}
                        onKeyDown={(event) => handlePresetKeyDown(event, preset)}
                        className="flex w-full items-start justify-between gap-md text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-sm">
                            <span className="text-[14px] font-bold text-content">
                              {preset.label}
                            </span>
                            {preset.branchName && (
                              <span className="rounded-full bg-line px-sm py-[1px] text-[11px] text-content-secondary">
                                {preset.branchName}
                              </span>
                            )}
                          </div>
                          <p className="mt-[2px] text-[12px] text-content-secondary">{preset.desc}</p>
                          <div className="mt-sm grid grid-cols-2 gap-sm font-mono text-[12px]">
                            <CredentialRow
                              label="ID"
                              value={preset.username}
                              onCopy={(e) => {
                                e.stopPropagation();
                                onCopy(preset.username, 'ID');
                              }}
                            />
                            <CredentialRow
                              label="PW"
                              value={preset.password}
                              onCopy={(e) => {
                                e.stopPropagation();
                                onCopy(preset.password, '비밀번호');
                              }}
                            />
                          </div>
                        </div>
                        <span className="self-center rounded-full bg-primary/10 px-sm py-[2px] text-[11px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          자동 입력
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-line bg-surface-secondary px-lg py-sm text-[11px] text-content-tertiary">
          * 본 계정은 개발/QA 용 — 운영 환경에서는 비활성화 필요. seed.ts 의 userSeed 와 동기화.
        </div>
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-xs rounded-md border border-line bg-surface px-sm py-[6px]">
      <span className="text-[10px] font-bold uppercase tracking-wider text-content-tertiary">
        {label}
      </span>
      <span className="flex-1 truncate text-content">{value}</span>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`${label} 복사`}
        className="text-content-tertiary hover:text-primary"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}


