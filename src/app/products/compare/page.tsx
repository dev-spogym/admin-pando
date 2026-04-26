'use client';
export const dynamic = 'force-dynamic';

import React from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import { Check, X } from 'lucide-react';

const compareProducts = [
  { name: 'PT 10회권', price: 500000, category: 'PT', duration: '3개월', sessions: '10회', groupClass: false, locker: true, gx: false, transfer: true },
  { name: 'PT 20회권', price: 900000, category: 'PT', duration: '6개월', sessions: '20회', groupClass: false, locker: true, gx: true, transfer: true },
  { name: '3개월 이용권', price: 180000, category: '이용권', duration: '3개월', sessions: '무제한', groupClass: true, locker: false, gx: false, transfer: false },
];

const rows = [
  { label: '이용 기간', key: 'duration' },
  { label: '세션 수', key: 'sessions' },
  { label: '그룹 수업', key: 'groupClass', bool: true },
  { label: '락커 제공', key: 'locker', bool: true },
  { label: 'GX 포함', key: 'gx', bool: true },
  { label: '양도 가능', key: 'transfer', bool: true },
];

export default function ProductComparePage() {
  return (
    <AppLayout>
      <PageHeader title="상품 비교" description="상품 간 가격·혜택·조건을 한눈에 비교합니다" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700 w-40">항목</th>
              {compareProducts.map(p => (
                <th key={p.name} className="px-6 py-4 text-center">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{p.category}</span>
                  <p className="text-sm font-bold text-gray-900 mt-1">{p.name}</p>
                  <p className="text-base font-bold text-blue-600 mt-1">{p.price.toLocaleString()}원</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-6 py-3.5 text-sm text-gray-600 font-medium">{row.label}</td>
                {compareProducts.map(p => (
                  <td key={p.name} className="px-6 py-3.5 text-center">
                    {row.bool ? (
                      (p as Record<string, unknown>)[row.key] ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-800">{String((p as Record<string, unknown>)[row.key])}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}
