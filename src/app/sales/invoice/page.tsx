'use client';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import { FileText, Plus, Filter, CheckCircle, XCircle, Mail } from 'lucide-react';

interface Invoice {
  id: string;
  issueDate: string;
  supplier: string;
  recipient: string;
  amount: number;
  status: '발행완료' | '취소';
  email: string;
}

const initialData: Invoice[] = [
  { id: 'TAX-2026-001', issueDate: '2026-04-10', supplier: '스포짐 강남점', recipient: '(주)아드락', amount: 550000, status: '발행완료', email: 'tax@adrock.co.kr' },
  { id: 'TAX-2026-002', issueDate: '2026-04-15', supplier: '스포짐 강남점', recipient: '이서연', amount: 200000, status: '발행완료', email: 'seoyeon@example.com' },
  { id: 'TAX-2026-003', issueDate: '2026-04-20', supplier: '스포짐 강남점', recipient: '(주)피트니스코리아', amount: 1100000, status: '취소', email: 'accounting@fitkorea.co.kr' },
  { id: 'TAX-2026-004', issueDate: '2026-04-22', supplier: '스포짐 강남점', recipient: '박지호', amount: 330000, status: '발행완료', email: 'jiho@example.com' },
  { id: 'TAX-2026-005', issueDate: '2026-04-25', supplier: '스포짐 강남점', recipient: '최유나', amount: 260000, status: '발행완료', email: 'yuna@example.com' },
];

const statusConfig: Record<Invoice['status'], { color: string; icon: React.ReactNode }> = {
  발행완료: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  취소: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

export default function InvoicePage() {
  const [filter, setFilter] = useState<'전체' | '발행완료' | '취소'>('전체');
  const [invoices, setInvoices] = useState(initialData);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ recipient: '', amount: 0, email: '', supplier: '스포짐 강남점' });

  const filtered = filter === '전체' ? invoices : invoices.filter((d) => d.status === filter);
  const totalAmount = invoices.filter((d) => d.status === '발행완료').reduce((sum, d) => sum + d.amount, 0);
  const completedCount = invoices.filter((d) => d.status === '발행완료').length;
  const cancelledCount = invoices.filter((d) => d.status === '취소').length;

  const modalTitle = useMemo(() => {
    if (!selectedInvoice) return '';
    return selectedInvoice.status === '발행완료' ? '세금계산서 취소' : '세금계산서 재발행';
  }, [selectedInvoice]);

  const handleCreateInvoice = () => {
    if (!form.recipient.trim() || !form.email.trim() || form.amount <= 0) {
      toast.error('공급받는 자, 이메일, 금액을 모두 입력하세요.');
      return;
    }
    const nextId = `TAX-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    setInvoices((prev) => [
      {
        id: nextId,
        issueDate: '2026-05-08',
        supplier: form.supplier,
        recipient: form.recipient.trim(),
        amount: form.amount,
        status: '발행완료',
        email: form.email.trim(),
      },
      ...prev,
    ]);
    setForm({ recipient: '', amount: 0, email: '', supplier: '스포짐 강남점' });
    setIsCreateOpen(false);
    toast.success(`${nextId} 세금계산서를 발행했습니다.`);
  };

  const handleInvoiceAction = () => {
    if (!selectedInvoice) return;
    const nextStatus = selectedInvoice.status === '발행완료' ? '취소' : '발행완료';
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === selectedInvoice.id ? { ...invoice, status: nextStatus, issueDate: '2026-05-08' } : invoice
      )
    );
    toast.success(selectedInvoice.status === '발행완료' ? '세금계산서를 취소했습니다.' : '세금계산서를 재발행했습니다.');
    setSelectedInvoice(null);
  };

  const handleSendEmail = (invoice: Invoice) => {
    toast.success(`${invoice.email} 주소로 세금계산서를 발송했습니다.`);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <PageHeader
          title="세금계산서 발행"
          description="세금계산서 발행 이력을 관리합니다."
          actions={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsCreateOpen(true)}>
              발행하기
            </Button>
          }
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-gray-500">이번달 발행 건수</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}건</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-gray-500">발행 총액</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalAmount.toLocaleString()}원</p>
          </div>
          <div className="bg-white border rounded-xl p-4">
            <p className="text-sm text-gray-500">취소 건수</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{cancelledCount}건</p>
          </div>
        </div>

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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button type="button" onClick={() => handleSendEmail(item)} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Mail className="w-3 h-3" /> 이메일
                      </button>
                      <button type="button" onClick={() => setSelectedInvoice(item)} className="text-xs text-gray-500 hover:text-gray-700 underline">
                        {item.status === '발행완료' ? '취소' : '재발행'}
                      </button>
                    </div>
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

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="세금계산서 발행"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>취소</Button>
            <Button onClick={handleCreateInvoice}>발행 완료</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">공급자</label>
              <input value={form.supplier} onChange={(e) => setForm((prev) => ({ ...prev, supplier: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">공급받는자</label>
              <input value={form.recipient} onChange={(e) => setForm((prev) => ({ ...prev, recipient: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">금액</label>
              <input type="number" min={0} value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={selectedInvoice !== null}
        onClose={() => setSelectedInvoice(null)}
        title={modalTitle}
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>닫기</Button>
            <Button onClick={handleInvoiceAction}>{selectedInvoice?.status === '발행완료' ? '취소 확정' : '재발행 실행'}</Button>
          </div>
        }
      >
        <p className="text-sm text-content-secondary">
          {selectedInvoice
            ? `${selectedInvoice.recipient} 대상 계산서 ${selectedInvoice.id}를 ${selectedInvoice.status === '발행완료' ? '취소' : '재발행'}합니다.`
            : ''}
        </p>
      </Modal>
    </AppLayout>
  );
}
