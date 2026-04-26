'use client';
import React, { useState } from 'react';
import { TrendingUp, Target, BarChart2 } from 'lucide-react';

interface MonthlyData {
  month: string;
  target: number;
  actual: number;
  forecast: number | null;
}

const demoData: MonthlyData[] = [
  { month: '2026-01', target: 12000000, actual: 11500000, forecast: null },
  { month: '2026-02', target: 12000000, actual: 12800000, forecast: null },
  { month: '2026-03', target: 13000000, actual: 13200000, forecast: null },
  { month: '2026-04', target: 13000000, actual: 9400000, forecast: null },
  { month: '2026-05', target: 13500000, actual: 0, forecast: 13800000 },
  { month: '2026-06', target: 14000000, actual: 0, forecast: 14200000 },
];

const thisMonth = demoData[3]; // 2026-04 (현재 월)
const nextMonth = demoData[4]; // 2026-05

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function ForecastPage() {
  const [unit] = useState<'원'>('원');

  const achievementRate = Math.round((thisMonth.actual / thisMonth.target) * 100);
  const remaining = thisMonth.target - thisMonth.actual;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">매출 예측</h1>
          <p className="text-sm text-gray-500">이번달 목표 달성 현황과 다음달 예측 매출을 확인합니다.</p>
        </div>
      </div>

      {/* 이번달 목표 vs 실적 */}
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">이번달 목표 달성 현황</h2>
          <span className="text-sm text-gray-400">({thisMonth.month})</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-600 font-medium">목표 매출</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{(thisMonth.target / 10000).toLocaleString()}만원</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <p className="text-sm text-green-600 font-medium">현재 실적</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{(thisMonth.actual / 10000).toLocaleString()}만원</p>
          </div>
          <div className={`rounded-xl p-4 ${achievementRate >= 100 ? 'bg-green-50' : 'bg-orange-50'}`}>
            <p className={`text-sm font-medium ${achievementRate >= 100 ? 'text-green-600' : 'text-orange-600'}`}>달성률</p>
            <p className={`text-2xl font-bold mt-1 ${achievementRate >= 100 ? 'text-green-700' : 'text-orange-700'}`}>{achievementRate}%</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-gray-500">
            <span>진행률</span>
            <span>잔여 {remaining > 0 ? (remaining / 10000).toLocaleString() + '만원' : '목표 달성'}</span>
          </div>
          <ProgressBar value={thisMonth.actual} max={thisMonth.target} color={achievementRate >= 100 ? 'bg-green-500' : 'bg-blue-500'} />
        </div>
      </div>

      {/* 다음달 예측 */}
      <div className="bg-white border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">다음달 예측 매출</h2>
          <span className="text-sm text-gray-400">({nextMonth.month})</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-sm text-purple-600 font-medium">예측 매출</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{(nextMonth.forecast! / 10000).toLocaleString()}만원</p>
            <p className="text-xs text-purple-400 mt-1">전월 대비 +{Math.round(((nextMonth.forecast! - thisMonth.actual) / thisMonth.actual) * 100)}% 예상</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 font-medium">다음달 목표</p>
            <p className="text-2xl font-bold text-gray-700 mt-1">{(nextMonth.target / 10000).toLocaleString()}만원</p>
            <p className="text-xs text-gray-400 mt-1">예측 달성률: {Math.round((nextMonth.forecast! / nextMonth.target) * 100)}%</p>
          </div>
        </div>
      </div>

      {/* 월별 추이 테이블 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
          <BarChart2 className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">월별 추이</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">월</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">목표 (만원)</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">실적 (만원)</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">예측 (만원)</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">달성률</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {demoData.map((row) => {
              const rate = row.actual > 0 ? Math.round((row.actual / row.target) * 100) : null;
              return (
                <tr key={row.month} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.month}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{(row.target / 10000).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{row.actual > 0 ? (row.actual / 10000).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right text-purple-600">{row.forecast ? (row.forecast / 10000).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 text-right">
                    {rate !== null ? (
                      <span className={`font-medium ${rate >= 100 ? 'text-green-600' : rate >= 80 ? 'text-blue-600' : 'text-orange-500'}`}>
                        {rate}%
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
