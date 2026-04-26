'use client';
import React, { useState } from 'react';
import { GitMerge, Search, User, AlertTriangle, Loader2 } from 'lucide-react';

export default function MemberMergePage() {
  const [step, setStep] = useState<'search' | 'preview' | 'done'>('search');
  const [loading, setLoading] = useState(false);

  const handleMerge = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setStep('done');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-blue-600" /> 회원 병합
        </h1>
        <p className="text-sm text-gray-500 mt-1">중복 등록된 회원 계정을 하나로 합칩니다</p>
      </div>

      {/* 진행 단계 */}
      <div className="flex items-center gap-3 text-sm">
        {['대상 선택', '미리보기', '완료'].map((s, i) => (
          <React.Fragment key={s}>
            <span className={`px-3 py-1 rounded-full font-medium ${
              i === (['search','preview','done'].indexOf(step))
                ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
            }`}>{i+1}. {s}</span>
            {i < 2 && <span className="text-gray-300">›</span>}
          </React.Fragment>
        ))}
      </div>

      {step === 'search' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">기준 회원 (유지할 계정)</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="이름 또는 연락처로 검색" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <User className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-sm font-medium text-gray-800">김민준</p>
                <p className="text-xs text-gray-500">010-1234-5678 · 등록일 2024.03.15</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">병합될 회원 (삭제될 계정)</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input placeholder="이름 또는 연락처로 검색" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <User className="w-8 h-8 text-red-300" />
              <div>
                <p className="text-sm font-medium text-gray-800">김민준 (중복)</p>
                <p className="text-xs text-gray-500">010-1234-5678 · 등록일 2024.05.02</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">병합 후 삭제된 계정의 이용권, 출석, 결제 이력이 기준 계정으로 통합됩니다. 이 작업은 되돌릴 수 없습니다.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep('preview')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              다음: 미리보기
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">병합 결과 미리보기</h2>
            <div className="space-y-2 text-sm">
              {[['이름','김민준'],['연락처','010-1234-5678'],['이용권','3건 통합'],['출석 이력','128회 통합'],['결제 이력','15건 통합']].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep('search')} className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50">이전</button>
            <button onClick={handleMerge} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:bg-red-400">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 병합 중...</> : '병합 확정'}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <GitMerge className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-lg font-semibold text-gray-800">병합이 완료되었습니다</p>
          <p className="text-sm text-gray-500">모든 이력이 기준 계정으로 통합되었습니다</p>
          <a href="/members" className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">회원 목록으로</a>
        </div>
      )}
    </div>
  );
}
