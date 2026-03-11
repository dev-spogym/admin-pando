import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, MapPin, Loader2, ChevronDown, Check } from 'lucide-react';
import { moveToPage } from '@/internal';
import { cn } from '@/lib/utils';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [branch, setBranch] = useState('main');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid = id.trim() !== '' && password.trim() !== '';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      if (id === 'admin' && password === 'password123') {
        moveToPage(966);
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary p-md">
      <div className="w-full max-w-[400px] bg-surface rounded-2xl shadow-lg p-xl flex flex-col items-center border border-line">
        {/* 로고 */}
        <div className="mb-xl flex flex-col items-center gap-sm">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
            <span className="text-[20px] font-bold">S</span>
          </div>
          <h1 className="text-[20px] font-bold text-content tracking-tight mt-sm">스포짐 CRM</h1>
          <p className="text-[13px] text-content-secondary">피트니스 센터 통합 관리 솔루션</p>
        </div>

        <form className="w-full space-y-md" onSubmit={handleLogin}>
          {/* 지점 선택 */}
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">지점 선택</label>
            <div className="relative">
              <MapPin className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
              <select
                className="w-full pl-9 pr-md py-[10px] bg-surface-secondary rounded-lg text-[13px] text-content border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none appearance-none cursor-pointer transition-all"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="main">강남 본점</option>
                <option value="branch1">서초점</option>
                <option value="branch2">송파점</option>
              </select>
              <ChevronDown className="absolute right-[12px] top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" size={14} />
            </div>
          </div>

          {/* 아이디 */}
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">아이디 또는 이메일</label>
            <div className="relative">
              <User className="absolute left-[12px] top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
              <input
                className="w-full pl-9 pr-md h-[44px] bg-surface-secondary rounded-lg text-[13px] text-content placeholder:text-content-tertiary border border-line focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                type="text"
                placeholder="아이디를 입력하세요"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={isLoading}
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
                type={showPassword ? "text" : "password"}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
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
                  "w-4 h-4 rounded border flex items-center justify-center transition-all",
                  rememberMe ? "bg-primary border-primary" : "border-line hover:border-content-tertiary"
                )}
              >
                {rememberMe && <Check className="text-white" size={11} strokeWidth={3} />}
                <input className="hidden" type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
              </div>
              <span className="text-[13px] text-content-secondary select-none">로그인 유지</span>
            </label>
            <button className="text-[13px] text-content-secondary hover:text-primary transition-colors font-medium" type="button">
              비밀번호 찾기
            </button>
          </div>

          {/* 에러 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-state-error p-sm rounded-lg text-center text-[13px]">
              {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            className={cn(
              "w-full h-[44px] rounded-lg text-[14px] font-semibold text-white flex items-center justify-center gap-sm transition-all",
              isFormValid && !isLoading
                ? "bg-primary hover:bg-primary-dark active:scale-[0.98]"
                : "bg-content-tertiary cursor-not-allowed"
            )}
            type="submit"
            disabled={!isFormValid || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>로그인 중...</span>
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <div className="mt-lg text-center">
          <p className="text-[12px] text-content-tertiary">
            도움이 필요하신가요?{" "}
            <button className="text-primary font-medium hover:underline" type="button">고객센터 문의</button>
          </p>
        </div>
      </div>

      <div className="absolute bottom-md left-0 w-full text-center text-[11px] text-content-tertiary">
        &copy; 2026 스포짐 CRM. All rights reserved.
      </div>
    </div>
  );
}
