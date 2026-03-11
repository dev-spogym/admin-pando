import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Globe, MapPin, Loader2, ChevronDown, Check } from 'lucide-react';
import { moveToPage } from '@/internal';
import { cn } from '@/lib/utils';

export default function Login() {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [branch, setBranch] = useState('main');
  const [language, setLanguage] = useState('ko');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isFormValid = id.trim() !== '' && password.trim() !== '';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setError('');
    setIsLoading(true);

    // Mock 로그인 처리
    setTimeout(() => {
      if (id === 'admin' && password === 'password123') {
        moveToPage(966); // 대시보드로 이동
      } else {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
        setIsLoading(false);
      }
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-2 overflow-hidden p-md" >
      {/* 배경 유기적 그래픽 (디자인 가이드 준수) */}
      <img 
        className="absolute top-0 left-0 w-full h-full object-cover opacity-30 z-0" src="/images/login-bg-organic-blobs?sid=70" alt="Background Blobs"/>

      <div className="relative z-10 w-full max-w-[480px] bg-3 rounded-card-strong shadow-card-soft p-xl md:p-[60px] flex flex-col items-center border border-7" >
        {/* 서비스 로고 (UI-001) */}
        <div className="mb-xl flex flex-col items-center gap-sm" >
          <div className="w-[64px] h-[64px] bg-0 rounded-2 flex items-center justify-center text-3 shadow-1" >
            <span className="text-[28px] font-bold" >FG</span>
          </div>
          <h1 className="text-Page-Title text-4 tracking-tight mt-sm" >FitGenie CRM</h1>
          <p className="text-Body-Primary-KR text-5" >웰니스 센터 통합 관리 솔루션</p>
        </div>

        <form className="w-full space-y-md" onSubmit={handleLogin}>
          {/* 지점 및 언어 선택 (UI-008, UI-009) */}
          <div className="flex gap-sm mb-xs" >
            <div className="flex-1 relative" >
              <label className="text-[12px] font-semibold text-5 mb-xs block ml-xs" >지점 선택</label>
              <div className="relative group" >
                <MapPin className="absolute left-md top-1/2 -translate-y-1/2 text-5 group-focus-within:text-0 transition-colors" size={16}/>
                <select
                  className="w-full pl-[40px] pr-md py-sm bg-9 rounded-input text-Body-Primary-KR border-none focus:ring-2 focus:ring-1 outline-none appearance-none cursor-pointer" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  <option value="main">강남 본점</option>
                  <option value="branch1">서초점</option>
                  <option value="branch2">송파점</option>
                </select>
                <ChevronDown className="absolute right-md top-1/2 -translate-y-1/2 text-5 pointer-events-none" size={14}/>
              </div>
            </div>
            <div className="flex-1 relative" >
              <label className="text-[12px] font-semibold text-5 mb-xs block ml-xs" >언어 선택</label>
              <div className="relative group" >
                <Globe className="absolute left-md top-1/2 -translate-y-1/2 text-5 group-focus-within:text-0 transition-colors" size={16}/>
                <select
                  className="w-full pl-[40px] pr-md py-sm bg-9 rounded-input text-Body-Primary-KR border-none focus:ring-2 focus:ring-1 outline-none appearance-none cursor-pointer" value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
                <ChevronDown className="absolute right-md top-1/2 -translate-y-1/2 text-5 pointer-events-none" size={14}/>
              </div>
            </div>
          </div>

          {/* 아이디 / 이메일 (UI-002) */}
          <div className="space-y-xs" >
            <label className="text-[12px] font-semibold text-5 ml-xs" >아이디 또는 이메일</label>
            <div className="relative group" >
              <User className="absolute left-md top-1/2 -translate-y-1/2 text-5 group-focus-within:text-0 transition-colors" size={18}/>
              <input
                className="w-full pl-[44px] pr-md h-[56px] bg-9 rounded-input text-Body-Primary-KR placeholder:text-5/50 focus:ring-2 focus:ring-0/30 outline-none transition-all border border-transparent focus:border-0/50" type="text" placeholder="아이디를 입력하세요" value={id} onChange={(e) => setId(e.target.value)} disabled={isLoading}/>
            </div>
          </div>

          {/* 비밀번호 (UI-003, UI-004) */}
          <div className="space-y-xs" >
            <label className="text-[12px] font-semibold text-5 ml-xs" >비밀번호</label>
            <div className="relative group" >
              <Lock className="absolute left-md top-1/2 -translate-y-1/2 text-5 group-focus-within:text-0 transition-colors" size={18}/>
              <input
                className="w-full pl-[44px] pr-[50px] h-[56px] bg-9 rounded-input text-Body-Primary-KR placeholder:text-5/50 focus:ring-2 focus:ring-0/30 outline-none transition-all border border-transparent focus:border-0/50" type={showPassword ? "text" : "password"} placeholder="비밀번호를 입력하세요" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading}/>
              <button
                className="absolute right-md top-1/2 -translate-y-1/2 text-5 hover:text-4 transition-colors" type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
              </button>
            </div>
          </div>

          {/* 로그인 유지 및 비밀번호 찾기 (UI-005, UI-007) */}
          <div className="flex items-center justify-between px-xs" >
            <label className="flex items-center gap-sm cursor-pointer group" >
              <div className={cn(
                "w-5 h-5 rounded-0 border-[2px] flex items-center justify-center transition-all",
                rememberMe ? "bg-0 border-0" : "border-7 group-hover:border-0"
              )} >
                {rememberMe && <Check className="text-3" size={14} strokeWidth={3}/>}
                <input 
                  className="hidden" type="checkbox" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)}/>
              </div>
              <span className="text-Body-Primary-KR text-5 select-none" >로그인 유지</span>
            </label>
            <button className="text-Body-Primary-KR text-5 hover:text-0 hover:underline transition-colors font-medium" type="button">
              비밀번호 찾기
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-6 border border-14/20 text-14 p-sm rounded-1 text-center text-Body-Primary-KR animate-shake" >
              {error}
            </div>
          )}

          {/* 로그인 버튼 (UI-006) */}
          <button
            className={cn(
              "w-full h-[60px] rounded-button text-Section-Title text-3 shadow-1 flex items-center justify-center gap-sm transition-all active:scale-[0.98]",
              isFormValid && !isLoading 
                ? "bg-0 hover:shadow-2 hover:brightness-105" 
                : "bg-5/30 cursor-not-allowed text-3/60"
            )} type="submit" disabled={!isFormValid || isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={24}/>
                <span >로그인 중...</span>
              </>
            ) : (
              "로그인"
            )}
          </button>
        </form>

        <div className="mt-xl text-center" >
          <p className="text-Body-Primary-KR text-5" >
            도움이 필요하신가요? <button className="text-0 font-semibold hover:underline" type="button">고객센터 문의</button>
          </p>
        </div>
      </div>

      {/* 푸터 카피라이트 */}
      <div className="absolute bottom-md left-0 w-full text-center text-[12px] text-5/60 z-10" >
        © 2026 FitGenie CRM. All rights reserved.
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
}
