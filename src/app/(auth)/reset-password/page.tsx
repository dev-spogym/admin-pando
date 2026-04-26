'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Step = 'email' | 'sent' | 'newPassword' | 'done';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('sent');
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setStep('done');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl ring-1 ring-gray-100 p-8 space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">비밀번호 재설정</h1>
          <p className="text-sm text-gray-500">
            {step === 'email' && '가입한 이메일로 재설정 링크를 보내드립니다'}
            {step === 'sent' && '이메일을 확인해주세요'}
            {step === 'newPassword' && '새 비밀번호를 입력해주세요'}
            {step === 'done' && '비밀번호가 변경되었습니다'}
          </p>
        </div>

        {/* 1단계: 이메일 입력 */}
        {step === 'email' && (
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="가입한 이메일 주소"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 발송 중...</> : '인증 메일 발송'}
            </button>
          </form>
        )}

        {/* 2단계: 메일 발송 완료 */}
        {step === 'sent' && (
          <div className="space-y-4 text-center">
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
              <p className="font-medium">{email}</p>
              <p className="mt-1 text-blue-600">위 주소로 재설정 링크를 발송했습니다.</p>
              <p className="mt-1 text-xs text-blue-500">메일이 오지 않으면 스팸함을 확인해주세요.</p>
            </div>
            <button
              onClick={() => setStep('email')}
              className="text-sm text-blue-600 hover:underline"
            >
              다른 이메일로 재시도
            </button>
          </div>
        )}

        {/* 3단계: 새 비밀번호 입력 (메일 링크 클릭 후) */}
        {step === 'newPassword' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호</label>
              <input type="password" required placeholder="8자 이상 입력"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
              <input type="password" required placeholder="동일하게 입력"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-blue-400 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 변경 중...</> : '비밀번호 변경'}
            </button>
          </form>
        )}

        {/* 4단계: 완료 */}
        {step === 'done' && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-sm text-gray-600">비밀번호가 성공적으로 변경되었습니다.</p>
            <Link href="/login"
              className="block w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center">
              로그인하기
            </Link>
          </div>
        )}

        {/* 로그인으로 돌아가기 */}
        {step !== 'done' && (
          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            로그인으로 돌아가기
          </Link>
        )}
      </div>
    </main>
  );
}
