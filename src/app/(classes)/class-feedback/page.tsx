'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { RefreshCw, Star } from 'lucide-react';
import { usePageSeed } from '@/hooks';
import type { ClassFeedbackSeedPayload } from '@/lib/publishingPageSeed';

const FALLBACK_CLASS_FEEDBACK: ClassFeedbackSeedPayload = {
  feedbacks: [
    { id: 1, member: '김민준', class: '필라테스 A반', instructor: '이효리', date: '2026-04-26', rating: 5, comment: '강사님이 정말 친절하게 가르쳐 주셔서 좋았어요. 다음에도 수강할 예정입니다.' },
    { id: 2, member: '이서연', class: '요가 기초반', instructor: '김태희', date: '2026-04-25', rating: 4, comment: '수업 분위기가 편안하고 동작 설명이 자세해서 좋았습니다.' },
    { id: 3, member: '박지훈', class: '스피닝 B반', instructor: '정지훈', date: '2026-04-25', rating: 3, comment: '음악이 너무 커서 집중하기 어려웠어요. 개선되면 좋겠습니다.' },
    { id: 4, member: '최유리', class: 'PT 기초반', instructor: '박재범', date: '2026-04-24', rating: 5, comment: '1:1 관리가 꼼꼼해서 운동 자세가 많이 교정된 것 같습니다.' },
    { id: 5, member: '정현우', class: '필라테스 A반', instructor: '이효리', date: '2026-04-24', rating: 4, comment: '수업 난이도가 적절하고 진도가 잘 맞습니다.' },
  ],
  summary: {
    monthlyReviews: 48,
    responseRate: 72,
    fiveStarRate: 61,
  },
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
      ))}
    </div>
  );
}

export default function ClassFeedbackPage() {
  const [selected, setSelected] = useState<string>('전체');
  const { data, loading, error, branchId, snapshotDate, reload } = usePageSeed<ClassFeedbackSeedPayload>(
    '/class-feedback',
    FALLBACK_CLASS_FEEDBACK,
  );
  const feedbacks = data.feedbacks;
  const instructors = ['전체', ...Array.from(new Set(feedbacks.map(item => item.instructor)))];

  const filtered = selected === '전체' ? feedbacks : feedbacks.filter(f => f.instructor === selected);
  const avgRating = (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1);

  return (
    <AppLayout>
      <PageHeader
        title="수업 평가 피드백"
        description="회원이 수업 후 남긴 만족도 평가와 의견을 확인합니다"
        actions={
          <button
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => void reload(true)}
            type="button"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> seed 갱신
          </button>
        }
      />

      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Supabase snapshot · 지점 {branchId} · 기준일 {snapshotDate ?? '-'}
        {error && <span className="ml-2 text-red-600">Fallback 사용: {error}</span>}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전체 평점</p>
          <p className="text-2xl font-bold text-amber-500">{avgRating}</p>
          <Stars rating={Math.round(Number(avgRating))} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">이번 달 리뷰</p>
          <p className="text-2xl font-bold text-gray-900">{data.summary.monthlyReviews}건</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">응답률</p>
          <p className="text-2xl font-bold text-green-600">{data.summary.responseRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">5점 비율</p>
          <p className="text-2xl font-bold text-blue-600">{data.summary.fiveStarRate}%</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 p-4 border-b border-gray-100">
          <span className="text-sm font-medium text-gray-700 mr-2">강사별:</span>
          {instructors.map(ins => (
            <button key={ins} onClick={() => setSelected(ins)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selected === ins ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {ins}
            </button>
          ))}
        </div>
        <div className="divide-y divide-gray-100">
          {filtered.map(item => (
            <div key={item.id} className="px-5 py-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{item.member}</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-gray-500">{item.class}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{item.instructor}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
                </div>
                <Stars rating={item.rating} />
              </div>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{item.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
