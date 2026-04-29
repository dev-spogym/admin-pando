'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const branches = [
  { name: '목동점', revenue: 38500000, members: 234, attendance: 82, retention: 74, newMember: 28 },
  { name: '강남점', revenue: 52300000, members: 312, attendance: 88, retention: 81, newMember: 42 },
  { name: '마포점', revenue: 29800000, members: 178, attendance: 76, retention: 68, newMember: 19 },
  { name: '송파점', revenue: 44100000, members: 267, attendance: 85, retention: 77, newMember: 35 },
  { name: '분당점', revenue: 35600000, members: 201, attendance: 79, retention: 72, newMember: 24 },
];

const avg = {
  revenue: Math.round(branches.reduce((s, b) => s + b.revenue, 0) / branches.length),
  members: Math.round(branches.reduce((s, b) => s + b.members, 0) / branches.length),
  attendance: Math.round(branches.reduce((s, b) => s + b.attendance, 0) / branches.length),
  retention: Math.round(branches.reduce((s, b) => s + b.retention, 0) / branches.length),
  newMember: Math.round(branches.reduce((s, b) => s + b.newMember, 0) / branches.length),
};

const revenueStdDev = Math.round(Math.sqrt(
  branches.reduce((sum, branch) => sum + (branch.revenue - avg.revenue) ** 2, 0) / branches.length
));
const revenueVarianceRate = avg.revenue > 0 ? Math.round((revenueStdDev / avg.revenue) * 100) : 0;

function Indicator({ value, avg }: { value: number; avg: number }) {
  const diff = value - avg;
  if (diff > 0) return <TrendingUp className="w-4 h-4 text-green-500 inline" />;
  if (diff < 0) return <TrendingDown className="w-4 h-4 text-red-500 inline" />;
  return <Minus className="w-4 h-4 text-gray-400 inline" />;
}

export default function BenchmarkPage() {
  const [metric, setMetric] = useState<'revenue' | 'attendance' | 'retention' | 'newMember'>('revenue');
  const metrics = [
    { key: 'revenue' as const, label: '월 매출' },
    { key: 'attendance' as const, label: '출석률' },
    { key: 'retention' as const, label: '재등록률' },
    { key: 'newMember' as const, label: '신규 등록' },
  ];

  const sorted = [...branches].sort((a, b) => b[metric] - a[metric]);

  return (
    <AppLayout>
      <PageHeader title="벤치마크 비교" description="지점 간 핵심 지표를 비교해 우수 사례와 개선 포인트를 파악합니다" />

      {/* 업계 평균 기준선 */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {metrics.map(m => (
          <div key={m.key} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">전체 평균 {m.label}</p>
            <p className="text-lg font-bold text-gray-800">
              {m.key === 'revenue' ? `${(avg[m.key] / 10000).toFixed(0)}만원` : `${avg[m.key]}${m.key === 'newMember' ? '명' : '%'}`}
            </p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">전지점 매출 표준편차</p>
          <p className="text-lg font-bold text-gray-800">{(revenueStdDev / 10000).toFixed(0)}만원</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">매출 편차율</p>
          <p className="text-lg font-bold text-gray-800">{revenueVarianceRate}%</p>
        </div>
      </div>

      {/* 지표 선택 */}
      <div className="flex gap-2 mb-4">
        {metrics.map(m => (
          <button key={m.key} onClick={() => setMetric(m.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${metric === m.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* 지점 비교 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">순위</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">지점</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">월 매출</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">회원수</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">출석률</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">재등록률</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">신규</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500">평균 대비</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((b, i) => (
              <tr key={b.name} className={`hover:bg-gray-50 ${i === 0 ? 'bg-amber-50' : ''}`}>
                <td className="px-5 py-3.5">
                  <span className={`text-sm font-bold ${i === 0 ? 'text-amber-600' : i === 1 ? 'text-gray-500' : i === 2 ? 'text-orange-500' : 'text-gray-400'}`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}위`}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm font-semibold text-gray-800">{b.name}</td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700">
                  {(b.revenue / 10000).toFixed(0)}만원 <Indicator value={b.revenue} avg={avg.revenue} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700">{b.members}명</td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700">
                  {b.attendance}% <Indicator value={b.attendance} avg={avg.attendance} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700">
                  {b.retention}% <Indicator value={b.retention} avg={avg.retention} />
                </td>
                <td className="px-5 py-3.5 text-right text-sm text-gray-700">
                  {b.newMember}명 <Indicator value={b.newMember} avg={avg.newMember} />
                </td>
                <td className={`px-5 py-3.5 text-right text-sm font-semibold ${b.revenue >= avg.revenue ? 'text-green-600' : 'text-red-500'}`}>
                  {b.revenue >= avg.revenue ? '+' : '-'}{Math.abs(Math.round(((b.revenue - avg.revenue) / avg.revenue) * 100))}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
