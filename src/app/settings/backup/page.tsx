'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { HardDrive, Download, Upload, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const backups = [
  { id: 1, name: '자동 백업 — 2026-04-27 03:00', size: '2.8GB', type: '자동', status: '완료', date: '2026-04-27 03:00' },
  { id: 2, name: '자동 백업 — 2026-04-26 03:00', size: '2.7GB', type: '자동', status: '완료', date: '2026-04-26 03:00' },
  { id: 3, name: '수동 백업 — 배포 전', size: '2.6GB', type: '수동', status: '완료', date: '2026-04-25 14:30' },
  { id: 4, name: '자동 백업 — 2026-04-25 03:00', size: '2.6GB', type: '자동', status: '완료', date: '2026-04-25 03:00' },
  { id: 5, name: '자동 백업 — 2026-04-24 03:00', size: '2.5GB', type: '자동', status: '완료', date: '2026-04-24 03:00' },
];

export default function BackupPage() {
  const [showRestore, setShowRestore] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [frequency, setFrequency] = useState('매일');
  const [retentionDays, setRetentionDays] = useState(30);

  return (
    <AppLayout>
      <PageHeader title="데이터 백업 / 복원" description="데이터를 안전하게 보호하고 필요 시 복원합니다" actions={
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
          <HardDrive className="w-4 h-4" /> 지금 백업
        </button>
      } />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs text-green-700">마지막 백업</p>
          </div>
          <p className="text-sm font-bold text-green-700">오늘 03:00</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">백업 파일 수</p>
          <p className="text-2xl font-bold text-gray-900">30개</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">총 백업 용량</p>
          <p className="text-2xl font-bold text-gray-900">82GB</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">보관 기간</p>
          <p className="text-2xl font-bold text-blue-600">30일</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 백업 설정 */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">백업 설정</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">자동 백업</span>
                <button onClick={() => setAutoBackup(!autoBackup)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${autoBackup ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoBackup ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">백업 주기</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>매일</option><option>주 1회</option><option>월 1회</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">보관 기간</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))}
                    className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">일</span>
                </div>
              </div>
              <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">설정 저장</button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">복원은 현재 데이터를 덮어씁니다. 신중히 진행하세요.</p>
            </div>
          </div>
        </div>

        {/* 백업 목록 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">백업 목록</h3>
            <span className="text-xs text-gray-400">최근 30일</span>
          </div>
          <div className="divide-y divide-gray-100">
            {backups.map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${b.type === '자동' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>{b.type}</span>
                      <span className="text-xs text-gray-400">{b.size}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50">
                    <Download className="w-3.5 h-3.5" /> 다운로드
                  </button>
                  <button onClick={() => setShowRestore(true)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50">
                    <RefreshCw className="w-3.5 h-3.5" /> 복원
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-xl"><AlertTriangle className="w-5 h-5 text-amber-600" /></div>
              <h2 className="text-base font-bold text-gray-900">데이터 복원</h2>
            </div>
            <p className="text-sm text-gray-600">선택한 백업 시점으로 복원하면 이후 데이터가 모두 삭제됩니다. 복원을 진행하시겠습니까?</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowRestore(false)} className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg">취소</button>
              <button onClick={() => setShowRestore(false)} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg">복원 진행</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
