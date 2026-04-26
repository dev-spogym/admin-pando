'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { QrCode, CheckCircle, Clock, Users, RefreshCw } from 'lucide-react';

const recentCheckins = [
  { id: 1, member: '김민준', time: '10:02', class: '필라테스 A반', method: 'QR', status: '출석' },
  { id: 2, member: '이서연', time: '09:58', class: '요가 기초반', method: 'QR', status: '출석' },
  { id: 3, member: '박지훈', time: '09:55', class: '스피닝 B반', method: '수동', status: '출석' },
  { id: 4, member: '최유리', time: '10:15', class: '필라테스 A반', method: 'QR', status: '지각' },
  { id: 5, member: '정현우', time: '10:30', class: '스피닝 B반', method: 'QR', status: '결석' },
];

const statusColor: Record<string, string> = {
  '출석': 'bg-green-100 text-green-700',
  '지각': 'bg-yellow-100 text-yellow-700',
  '결석': 'bg-red-100 text-red-700',
};

export default function QrCheckinPage() {
  const [qrActive, setQrActive] = useState(true);

  return (
    <AppLayout>
      <PageHeader title="출석 QR 체크인" description="QR 코드를 통해 회원 출석을 빠르게 처리합니다" />

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* QR 코드 영역 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full mb-2">
            <h3 className="text-sm font-semibold text-gray-800">오늘의 QR 코드</h3>
            <button onClick={() => setQrActive(!qrActive)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
              <RefreshCw className="w-3.5 h-3.5" /> 갱신
            </button>
          </div>
          <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-300">
            <QrCode className="w-24 h-24 text-gray-400" />
          </div>
          <p className="text-xs text-gray-500 text-center">회원 앱에서 이 QR을 스캔하면<br />자동으로 출석이 처리됩니다</p>
          <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${qrActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {qrActive ? '활성 — 오늘 23:59까지' : '비활성'}
          </div>
        </div>

        {/* 오늘 출석 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">오늘 출석 현황</h3>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-xl font-bold text-green-600">38</p>
              <p className="text-xs text-gray-500 mt-1">출석</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl">
              <p className="text-xl font-bold text-yellow-600">4</p>
              <p className="text-xs text-gray-500 mt-1">지각</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-xl">
              <p className="text-xl font-bold text-red-600">7</p>
              <p className="text-xs text-gray-500 mt-1">결석</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>QR 체크인</span><span className="font-medium text-gray-800">33건</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>수동 처리</span><span className="font-medium text-gray-800">5건</span>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>QR 사용률</span><span className="font-medium text-blue-600">87%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 체크인 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-800">최근 체크인 내역</h3>
          <span className="text-xs text-gray-400">실시간 업데이트</span>
        </div>
        <div className="divide-y divide-gray-100">
          {recentCheckins.map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono text-gray-700">{item.time}</span>
                <div>
                  <span className="text-sm font-medium text-gray-800">{item.member}</span>
                  <span className="text-xs text-gray-400 ml-2">{item.class}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{item.method}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
