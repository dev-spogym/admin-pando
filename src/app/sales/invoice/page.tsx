'use client';
import React, { useState } from 'react';
import { FileText, Plus, Filter, CheckCircle, XCircle } from 'lucide-react';

interface Invoice {
  id: string;
  issueDate: string;
  supplier: string;
  recipient: string;
  amount: number;
  status: '발행완료' | '취소';
}

const demoData: Invoice[] = [
  { id: 'TAX-2026-001', issueDate: '2026-04-10', supplier: '스포짐 강남점', recipient: '(주)아드락', amount: 550000, status: '발행완료' },
  { id: 'TAX-2026-002', issueDate: '2026-04-15', supplier: '스포짐 강남점', recipient: '이서연', amount: 200000, status: '발행완료' },
  { id: 'TAX-2026-003', issueDate: '2026-04-20', supplier: '스포짐 강남점', recipient: '(주)피트니스코리아', amount: 1100000, status: '취소' },
  { id: 'TAX-2026-004', issueDate: '2026-04-22', supplier: '스포짐 강남점', recipient: '박지호', amount: 330000, status: '발행완료' },
  { id: 'TAX-2026-005', issueDate: '2026-04-25', supplier: '스포짐 강남점', recipient: '최유나', amount: 260000, status: '발행완료' },
];

const statusConfig: Record<Invoice['status'], { color: string; icon: React.ReactNode }> = {
  발행완료: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  취소: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

export default function InvoicePage() {
  const [filter, setFilter] = useState<'전체' | '발행완료' | '취소'>('전체');

  const filtered = filter === '전체' ? demoData : demoData.filter((d) => d.status === filter);

  const totalAmount = demoData.filter((d) => d.status === '발행완료').reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">세금계산서 발행</h1>
            <p className="text-sm text-gray-500">세금계산서 발행 이력을 관리합니다.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" />
          발행하기
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">이번달 발행 건수</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{demoData.filter((d) => d.status === '발행완료').length}건</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">발행 총액</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{totalAmount.toLocaleString()}원</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">취소 건수</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{demoData.filter((d) => d.status === '취소').length}건</p>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        {(['전체', '발행완료', '취소'] as const).map((f) => (
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
              <th className="text-left px-4 py-3 font-medium text-gray-600">계산서 번호</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">발행일</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">공급자</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">공급받는자</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">금액</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-700 text-xs">{item.id}</td>
                <td className="px-4 py-3 text-gray-600">{item.issueDate}</td>
                <td className="px-4 py-3 text-gray-900">{item.supplier}</td>
                <td className="px-4 py-3 text-gray-900">{item.recipient}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">{item.amount.toLocaleString()}원</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}>
                    {statusConfig[item.status].icon}
                    {item.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button className="text-xs text-gray-500 hover:text-gray-700 underline">
                    {item.status === '발행완료' ? '취소' : '재발행'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">해당하는 세금계산서가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
