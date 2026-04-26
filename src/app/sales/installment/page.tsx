'use client';
import React, { useState } from 'react';
import { CreditCard, Filter, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

interface Installment {
  id: string;
  memberName: string;
  product: string;
  totalAmount: number;
  totalMonths: number;
  paidMonths: number;
  remainingMonths: number;
  nextDueDate: string;
  status: '정상' | '미납' | '완료';
}

const demoData: Installment[] = [
  { id: 'INS-001', memberName: '김민준', product: 'PT 30회 패키지', totalAmount: 900000, totalMonths: 3, paidMonths: 2, remainingMonths: 1, nextDueDate: '2026-05-15', status: '정상' },
  { id: 'INS-002', memberName: '이서연', product: '연간 회원권', totalAmount: 1200000, totalMonths: 6, paidMonths: 2, remainingMonths: 4, nextDueDate: '2026-05-01', status: '미납' },
  { id: 'INS-003', memberName: '박지호', product: 'PT 20회 패키지', totalAmount: 600000, totalMonths: 3, paidMonths: 3, remainingMonths: 0, nextDueDate: '-', status: '완료' },
  { id: 'INS-004', memberName: '최유나', product: '필라테스 6개월', totalAmount: 780000, totalMonths: 3, paidMonths: 1, remainingMonths: 2, nextDueDate: '2026-05-10', status: '미납' },
  { id: 'INS-005', memberName: '정재원', product: 'PT 50회 패키지', totalAmount: 1500000, totalMonths: 5, paidMonths: 3, remainingMonths: 2, nextDueDate: '2026-05-20', status: '정상' },
];

const statusColor: Record<Installment['status'], string> = {
  정상: 'bg-green-100 text-green-700',
  미납: 'bg-red-100 text-red-700',
  완료: 'bg-gray-100 text-gray-500',
};

export default function InstallmentPage() {
  const [filter, setFilter] = useState<'전체' | '미납'>('전체');

  const filtered = filter === '미납' ? demoData.filter((d) => d.status === '미납') : demoData;

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">할부결제 관리</h1>
            <p className="text-sm text-gray-500">회원별 할부 납입 현황을 확인하고 처리합니다.</p>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">전체 할부</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{demoData.length}건</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">미납 건수</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{demoData.filter((d) => d.status === '미납').length}건</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">이번달 예정 수납</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {demoData.filter((d) => d.status !== '완료').reduce((sum, d) => sum + Math.round(d.totalAmount / d.totalMonths), 0).toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {(['전체', '미납'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">회원명</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">상품</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">총 금액</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">납입 현황</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">남은 회차</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">다음 납부일</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">처리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{item.memberName}</td>
                <td className="px-4 py-3 text-gray-600">{item.product}</td>
                <td className="px-4 py-3 text-right text-gray-900">{item.totalAmount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {Array.from({ length: item.totalMonths }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          i < item.paidMonths ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        {i < item.paidMonths ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                    ))}
                    <span className="ml-1 text-gray-500 text-xs">{item.paidMonths}/{item.totalMonths}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{item.remainingMonths}회</td>
                <td className="px-4 py-3 text-center text-gray-600">{item.nextDueDate}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[item.status]}`}>
                    {item.status === '미납' && <AlertCircle className="w-3 h-3" />}
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {item.status !== '완료' && (
                    <button className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      납입 처리
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">해당하는 할부 내역이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
