'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Video, Play, Download, Trash2, Clock, HardDrive } from 'lucide-react';

const recordings = [
  { id: 1, class: '필라테스 A반', instructor: '이효리', date: '2026-04-26', duration: '55분', size: '2.1GB', status: '완료', viewers: 12 },
  { id: 2, class: '요가 기초반', instructor: '김태희', date: '2026-04-25', duration: '50분', size: '1.8GB', status: '완료', viewers: 8 },
  { id: 3, class: '스피닝 B반', instructor: '정지훈', date: '2026-04-25', duration: '45분', size: '1.6GB', status: '처리중', viewers: 0 },
  { id: 4, class: 'PT 기초반', instructor: '박재범', date: '2026-04-24', duration: '60분', size: '2.4GB', status: '완료', viewers: 5 },
  { id: 5, class: '필라테스 B반', instructor: '이효리', date: '2026-04-24', duration: '55분', size: '2.0GB', status: '완료', viewers: 9 },
];

const statusColor: Record<string, string> = {
  '완료': 'bg-green-100 text-green-700',
  '처리중': 'bg-yellow-100 text-yellow-700',
  '오류': 'bg-red-100 text-red-700',
};

export default function ClassRecordingPage() {
  const [filter, setFilter] = useState('전체');

  return (
    <AppLayout>
      <PageHeader title="수업 녹화 관리" description="녹화된 수업 영상을 관리하고 회원에게 제공합니다" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 녹화</p>
          <p className="text-2xl font-bold text-gray-900">42건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">총 용량 사용</p>
          <p className="text-2xl font-bold text-blue-600">87GB</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">총 시청 횟수</p>
          <p className="text-2xl font-bold text-green-600">234회</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">남은 저장 공간</p>
          <p className="text-2xl font-bold text-gray-700">413GB</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          {['전체', '완료', '처리중'].map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {recordings.filter(r => filter === '전체' || r.status === filter).map(item => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{item.class}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500">{item.instructor}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-500">{item.date}</span>
                    <span className="text-gray-300">·</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.duration}</span>
                    <span className="text-gray-300">·</span>
                    <HardDrive className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{item.size}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">시청 {item.viewers}회</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}>{item.status}</span>
                {item.status === '완료' && (
                  <>
                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg">
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
