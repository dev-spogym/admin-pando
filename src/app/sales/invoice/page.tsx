'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Plus, CheckCircle, XCircle, Mail, Send, AlertTriangle, Download } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatKRW } from '@/lib/format';

// ─── SCR-S010 세금계산서 발행 (SAL-EXT-02) ────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S010
// 발행 탭(발행 대상 → DLG-S011 발행 폼) / 이력 탭(발행 이력 7컬럼 → DLG-S010 상세, 이메일 전송, 재발행).
// 요약카드 3개(이번 달 발행 건수·총액·미발행 대기). 4축 상태: 로딩 / 정상 / 빈 / 오류.
// 상태 배지: 발행 완료 / 전송 완료 / 오류 / 취소 발행.

type InvoiceStatus = '발행 완료' | '전송 완료' | '오류' | '취소 발행';

interface InvoiceItem {
  productName: string;
  qty: number;
  unitPrice: number; // VAT 제외 단가
  taxFree?: boolean;
}

interface Invoice {
  id: string;
  issueDate: string;
  recipient: string; // 상호
  bizNo: string;
  email: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  emailSentAt: string | null;
}

// 발행 대상(미발행) 결제 건
interface PendingTarget {
  saleId: string;
  date: string;
  memberName: string;
  productName: string;
  qty: number;
  supplyAmount: number; // VAT 제외 공급가액
}

const supply = (inv: Invoice) => inv.items.reduce((s, it) => s + it.unitPrice * it.qty, 0);
const vat = (inv: Invoice) => inv.items.filter(it => !it.taxFree).reduce((s, it) => s + Math.round(it.unitPrice * it.qty * 0.1), 0);
const total = (inv: Invoice) => supply(inv) + vat(inv);

const SEED_INVOICES: Invoice[] = [
  { id: 'TAX-2026-001', issueDate: '2026-05-10', recipient: '(주)아드락', bizNo: '123-45-67890', email: 'tax@adrock.co.kr', items: [{ productName: '법인 PT 패키지', qty: 1, unitPrice: 500000 }], status: '전송 완료', emailSentAt: '2026-05-10' },
  { id: 'TAX-2026-002', issueDate: '2026-05-15', recipient: '(주)피트니스코리아', bizNo: '210-81-12345', email: 'acc@fitkorea.co.kr', items: [{ productName: '단체 회원권', qty: 10, unitPrice: 100000 }], status: '발행 완료', emailSentAt: null },
  { id: 'TAX-2026-003', issueDate: '2026-05-20', recipient: '(주)헬스플러스', bizNo: '128-86-54321', email: 'invalid', items: [{ productName: '필라테스 6개월', qty: 2, unitPrice: 300000 }], status: '오류', emailSentAt: null },
];

const SEED_PENDING: PendingTarget[] = [
  { saleId: 'SALE-1042', date: '2026-05-25', memberName: '(주)스타트업짐', productName: '법인 단체 회원권', qty: 20, supplyAmount: 2000000 },
  { saleId: 'SALE-1051', date: '2026-05-27', memberName: '(주)코어테크', productName: '임직원 PT 패키지', qty: 5, supplyAmount: 1500000 },
];

const STATUS_VARIANT: Record<InvoiceStatus, 'success' | 'mint' | 'error' | 'default'> = {
  '발행 완료': 'success',
  '전송 완료': 'mint',
  '오류': 'error',
  '취소 발행': 'default',
};

const STATUS_ICON: Record<InvoiceStatus, React.ReactNode> = {
  '발행 완료': <CheckCircle size={12} />,
  '전송 완료': <Send size={12} />,
  '오류': <AlertTriangle size={12} />,
  '취소 발행': <XCircle size={12} />,
};

const isValidBizNo = (v: string) => v.replace(/[^0-9]/g, '').length === 10;
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

const TABS = [
  { key: 'ISSUE', label: '발행' },
  { key: 'HISTORY', label: '이력' },
];

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState('ISSUE');
  const [invoices, setInvoices] = useState<Invoice[]>(SEED_INVOICES);
  const [pending, setPending] = useState<PendingTarget[]>(SEED_PENDING);

  // DLG-S011 발행 폼 / DLG-S010 상세
  const [issueTarget, setIssueTarget] = useState<PendingTarget | null>(null);
  const [form, setForm] = useState({ recipient: '', bizNo: '', email: '' });
  const [detail, setDetail] = useState<Invoice | null>(null);

  const stats = useMemo(() => {
    const thisMonth = '2026-05';
    const issuedThisMonth = invoices.filter(i => i.issueDate.slice(0, 7) === thisMonth && i.status !== '취소 발행');
    return {
      count: issuedThisMonth.length,
      amount: issuedThisMonth.reduce((s, i) => s + total(i), 0),
      pending: pending.length,
    };
  }, [invoices, pending]);

  const openIssue = (target: PendingTarget) => {
    setIssueTarget(target);
    setForm({ recipient: target.memberName, bizNo: '', email: '' });
  };

  const handleIssue = () => {
    if (!issueTarget) return;
    // 예외처리: 사업자번호 형식 오류
    if (!isValidBizNo(form.bizNo)) {
      toast.error('사업자번호는 10자리여야 합니다.');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('이메일 형식을 확인해주세요.');
      return;
    }
    const unit = issueTarget.qty > 0 ? Math.round(issueTarget.supplyAmount / issueTarget.qty) : issueTarget.supplyAmount;
    const id = `TAX-2026-${String(invoices.length + 1).padStart(3, '0')}`;
    setInvoices(prev => [
      {
        id,
        issueDate: '2026-05-29',
        recipient: form.recipient.trim(),
        bizNo: form.bizNo,
        email: form.email.trim(),
        items: [{ productName: issueTarget.productName, qty: issueTarget.qty, unitPrice: unit }],
        status: '발행 완료',
        emailSentAt: null,
      },
      ...prev,
    ]);
    setPending(prev => prev.filter(p => p.saleId !== issueTarget.saleId));
    setIssueTarget(null);
    toast.success('발행되었습니다.');
  };

  const handleSendEmail = (inv: Invoice) => {
    // 예외처리: 이메일 형식 오류 건은 전송 차단
    if (!isValidEmail(inv.email)) {
      toast.error('이메일 형식을 확인해주세요.');
      return;
    }
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: '전송 완료', emailSentAt: '2026-05-29' } : i));
    toast.success('전송되었습니다.');
  };

  const handleReissue = (inv: Invoice) => {
    setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: '발행 완료', issueDate: '2026-05-29' } : i));
    toast.success('재발행되었습니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="세금계산서 발행"
        description="법인·사업자 회원에게 세금계산서를 발행하고 발행 이력을 조회·관리합니다."
        actions={
          <Button variant="outline" size="sm" icon={<Download size={15} />} onClick={() => toast.success(`${invoices.length}건 엑셀 다운로드 완료`)}>
            엑셀 다운로드
          </Button>
        }
      />

      {/* 요약 지표 카드 (SAL-EXT-02-01) */}
      <StatCardGrid cols={3} className="mb-xl">
        <StatCard label="이번 달 발행 건수" value={`${stats.count}건`} icon={<FileText />} variant="peach" />
        <StatCard label="이번 달 발행 총액" value={formatKRW(stats.amount)} icon={<CheckCircle />} variant="mint" />
        <StatCard label="미발행 대기" value={`${stats.pending}건`} icon={<AlertTriangle />} className={stats.pending > 0 ? 'border-state-error/20' : ''} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="border-b border-line">
          <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* 발행 탭: 발행 대상 결제 건 */}
        {activeTab === 'ISSUE' ? (
          pending.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="발행 대상 결제 건이 없어요"
              description="세금계산서 발행이 필요한 법인·사업자 결제가 발생하면 여기에 표시됩니다."
            />
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/85">
                <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                  <th className="px-4 py-3 text-left">결제일</th>
                  <th className="px-4 py-3 text-left">공급받는 자</th>
                  <th className="px-4 py-3 text-left">상품명</th>
                  <th className="px-4 py-3 text-center">수량</th>
                  <th className="px-4 py-3 text-right">공급가액</th>
                  <th className="px-4 py-3 text-center">발행</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {pending.map(p => (
                  <tr key={p.saleId} className="hover:bg-surface-secondary/70 transition-colors">
                    <td className="px-4 py-3 text-content-secondary">{p.date}</td>
                    <td className="px-4 py-3 font-semibold text-content">{p.memberName}</td>
                    <td className="px-4 py-3 text-content">{p.productName}</td>
                    <td className="px-4 py-3 text-center tabular-nums">{p.qty}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatKRW(p.supplyAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => openIssue(p)}>
                        발행
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          /* 이력 탭: 발행 이력 7컬럼 */
          invoices.length === 0 ? (
            <EmptyState icon={FileText} title="발행 이력이 없어요" description="세금계산서를 발행하면 이력이 여기에 표시됩니다." />
          ) : (
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/85">
                <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                  <th className="px-4 py-3 text-left">발행일</th>
                  <th className="px-4 py-3 text-left">공급받는 자</th>
                  <th className="px-4 py-3 text-right">공급가액</th>
                  <th className="px-4 py-3 text-right">부가세</th>
                  <th className="px-4 py-3 text-right">합계</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-center">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-surface-secondary/70 transition-colors">
                    <td className="px-4 py-3 text-content-secondary">{inv.issueDate}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-content">{inv.recipient}</div>
                      <div className="text-[11px] text-content-tertiary tabular-nums">{inv.bizNo}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKRW(supply(inv))}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-content-secondary">{formatKRW(vat(inv))}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatKRW(total(inv))}</td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge variant={STATUS_VARIANT[inv.status]} dot>
                        <span className="flex items-center gap-[3px]">{STATUS_ICON[inv.status]}{inv.status}</span>
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-sm text-[12px]">
                        <button type="button" onClick={() => setDetail(inv)} className="text-content-secondary hover:text-content underline">상세</button>
                        <button type="button" onClick={() => handleSendEmail(inv)} className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Mail size={12} /> 전송
                        </button>
                        {(inv.status === '오류' || inv.status === '취소 발행') && (
                          <button type="button" onClick={() => handleReissue(inv)} className="text-content-secondary hover:text-content underline">재발행</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* DLG-S011 세금계산서 발행 폼 */}
      <Modal
        isOpen={issueTarget !== null}
        onClose={() => setIssueTarget(null)}
        title="세금계산서 발행"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setIssueTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleIssue}>발행</Button>
          </div>
        }
      >
        {issueTarget && (
          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <Input label="공급받는 자 (상호)" value={form.recipient} onChange={e => setForm(p => ({ ...p, recipient: e.target.value }))} />
              <Input
                label="사업자번호"
                value={form.bizNo}
                onChange={e => setForm(p => ({ ...p, bizNo: e.target.value }))}
                placeholder="000-00-00000"
                error={form.bizNo && !isValidBizNo(form.bizNo) ? '10자리 숫자를 입력해주세요.' : undefined}
              />
            </div>
            <Input
              label="이메일"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              error={form.email && !isValidEmail(form.email) ? '이메일 형식을 확인해주세요.' : undefined}
            />
            {/* 공급 품목 자동 채움 */}
            <div className="rounded-xl border border-line p-md">
              <p className="mb-sm text-[12px] font-semibold text-content-secondary">공급 품목 (결제 건 자동 채움)</p>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-content">{issueTarget.productName} × {issueTarget.qty}</span>
                <span className="font-semibold tabular-nums text-content">{formatKRW(issueTarget.supplyAmount)}</span>
              </div>
              <div className="mt-sm flex items-center justify-between border-t border-line pt-sm text-[12px] text-content-secondary">
                <span>부가세 (10%)</span>
                <span className="tabular-nums">{formatKRW(Math.round(issueTarget.supplyAmount * 0.1))}</span>
              </div>
              <div className="mt-xs flex items-center justify-between text-[13px] font-bold text-content">
                <span>합계</span>
                <span className="tabular-nums text-primary">{formatKRW(Math.round(issueTarget.supplyAmount * 1.1))}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* DLG-S010 세금계산서 상세 */}
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title="세금계산서 상세"
        size="lg"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setDetail(null)}>닫기</Button>
          </div>
        }
      >
        {detail && (
          <div className="space-y-md">
            <div className="grid grid-cols-2 gap-md">
              <div>
                <p className="text-[11px] text-content-tertiary">세금계산서 번호</p>
                <p className="text-[13px] font-semibold text-content tabular-nums">{detail.id}</p>
              </div>
              <div>
                <p className="text-[11px] text-content-tertiary">발행일</p>
                <p className="text-[13px] font-semibold text-content">{detail.issueDate}</p>
              </div>
              <div>
                <p className="text-[11px] text-content-tertiary">공급받는 자</p>
                <p className="text-[13px] font-semibold text-content">{detail.recipient} ({detail.bizNo})</p>
              </div>
              <div>
                <p className="text-[11px] text-content-tertiary">이메일</p>
                <p className="text-[13px] text-content">{detail.email}</p>
              </div>
            </div>
            <div className="rounded-xl border border-line p-md">
              <p className="mb-sm text-[12px] font-semibold text-content-secondary">공급 품목</p>
              {detail.items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between py-[3px] text-[13px]">
                  <span className="text-content">{it.productName} × {it.qty}{it.taxFree ? ' (면세)' : ''}</span>
                  <span className="tabular-nums text-content">{formatKRW(it.unitPrice * it.qty)}</span>
                </div>
              ))}
              <div className="mt-sm space-y-xs border-t border-line pt-sm text-[12px]">
                <div className="flex justify-between text-content-secondary"><span>공급가액</span><span className="tabular-nums">{formatKRW(supply(detail))}</span></div>
                <div className="flex justify-between text-content-secondary"><span>부가세</span><span className="tabular-nums">{formatKRW(vat(detail))}</span></div>
                <div className="flex justify-between text-[13px] font-bold text-content"><span>합계</span><span className="tabular-nums text-primary">{formatKRW(total(detail))}</span></div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-line px-md py-sm text-[12px]">
              <span className="text-content-secondary">이메일 전송 이력</span>
              <span className="text-content">{detail.emailSentAt ? `${detail.emailSentAt} 전송 완료` : '미전송'}</span>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
