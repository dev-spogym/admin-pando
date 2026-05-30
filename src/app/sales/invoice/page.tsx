'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FileText, Plus, CheckCircle, XCircle, Mail, Send, AlertTriangle, Download, RefreshCw } from 'lucide-react';
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
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// ─── SCR-S010 세금계산서 발행 (SAL-EXT-02) ────────────────────────────────────
// docs4/V1/D03-매출관리/매출관리.md ## SCR-S010
// 발행 대상 결제 건 → DLG-S011 발행 폼 → 발행 이력/상세(DLG-S010)를 DB로 관리한다.

type InvoiceStatus = '발행 완료' | '전송 완료' | '오류' | '취소 발행';

interface InvoiceItem {
  id?: number;
  productName: string;
  qty: number;
  unitPrice: number;
  supplyAmount: number;
  vatAmount: number;
  taxFree?: boolean;
}

interface Invoice {
  id: number;
  invoiceNo: string;
  saleId: number;
  issueDate: string;
  memberName: string;
  recipient: string;
  bizNo: string;
  email: string;
  items: InvoiceItem[];
  status: InvoiceStatus;
  emailSentAt: string | null;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

interface PendingTarget {
  saleId: number;
  date: string;
  memberId: number;
  memberName: string;
  recipientDefault: string;
  emailDefault: string;
  productName: string;
  qty: number;
  supplyAmount: number;
  vatAmount: number;
  totalAmount: number;
}

type MemberInfo = {
  id: number;
  name: string;
  email: string | null;
  companyName: string | null;
  memberType: string | null;
};

const parseMoney = (value: string | number | null | undefined) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const supply = (inv: Invoice) => inv.items.length > 0
  ? inv.items.reduce((s, it) => s + it.supplyAmount, 0)
  : inv.supplyAmount;
const vat = (inv: Invoice) => inv.items.length > 0
  ? inv.items.reduce((s, it) => s + it.vatAmount, 0)
  : inv.vatAmount;
const total = (inv: Invoice) => inv.items.length > 0
  ? supply(inv) + vat(inv)
  : inv.totalAmount;

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
const fmtLocal = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const createInvoiceNo = () => {
  const now = new Date();
  return `TAX-${fmtLocal(now).replace(/-/g, '')}-${String(now.getTime()).slice(-5)}`;
};

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const isCorporateMember = (saleCategory: string, member?: MemberInfo) => {
  const memberType = member?.memberType ?? '';
  return saleCategory.includes('법인') ||
    memberType.includes('법인') ||
    memberType.includes('corporate') ||
    Boolean(member?.companyName);
};

const TABS = [
  { key: 'ISSUE', label: '발행' },
  { key: 'HISTORY', label: '이력' },
];

export default function InvoicePage() {
  const [activeTab, setActiveTab] = useState('ISSUE');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pending, setPending] = useState<PendingTarget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [issueTarget, setIssueTarget] = useState<PendingTarget | null>(null);
  const [form, setForm] = useState({ recipient: '', bizNo: '', email: '' });
  const [detail, setDetail] = useState<Invoice | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const today = fmtLocal(new Date());
  const currentMonth = today.slice(0, 7);

  const mapInvoiceRow = (row: Record<string, unknown>): Invoice => {
    const rawItems = Array.isArray(row.tax_invoice_items) ? row.tax_invoice_items as Record<string, unknown>[] : [];
    const items = rawItems.map(item => ({
      id: Number(item.id),
      productName: String(item.productName ?? ''),
      qty: Number(item.qty) || 1,
      unitPrice: parseMoney(item.unitPrice as string | number),
      supplyAmount: parseMoney(item.supplyAmount as string | number),
      vatAmount: parseMoney(item.vatAmount as string | number),
      taxFree: Boolean(item.taxFree),
    }));

    return {
      id: Number(row.id),
      invoiceNo: String(row.invoiceNo ?? ''),
      saleId: Number(row.saleId),
      issueDate: String(row.issueDate ?? '').slice(0, 10),
      memberName: String(row.memberName ?? ''),
      recipient: String(row.recipient ?? ''),
      bizNo: String(row.bizNo ?? ''),
      email: String(row.email ?? ''),
      items,
      status: (row.status as InvoiceStatus) ?? '발행 완료',
      emailSentAt: row.emailSentAt ? String(row.emailSentAt).slice(0, 10) : null,
      supplyAmount: parseMoney(row.supplyAmount as string | number),
      vatAmount: parseMoney(row.vatAmount as string | number),
      totalAmount: parseMoney(row.totalAmount as string | number),
    };
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    const branchId = getBranchId();
    const [invoiceResult, salesResult, memberResult] = await Promise.all([
      supabase
        .from('tax_invoices')
        .select('*, tax_invoice_items(*)')
        .eq('branchId', branchId)
        .order('issueDate', { ascending: false })
        .order('createdAt', { ascending: false }),
      supabase
        .from('sales')
        .select('id, branchId, memberId, memberName, productName, quantity, amount, salePrice, saleDate, saleCategory, status')
        .eq('branchId', branchId)
        .eq('status', 'COMPLETED')
        .gt('amount', 0)
        .order('saleDate', { ascending: false })
        .limit(300),
      supabase
        .from('members')
        .select('id, name, email, companyName, memberType')
        .eq('branchId', branchId)
        .limit(500),
    ]);

    setIsLoading(false);

    if (invoiceResult.error) {
      console.error('세금계산서 로드 실패:', invoiceResult.error);
      toast.error(`세금계산서를 불러오지 못했습니다: ${invoiceResult.error.message}`);
      return;
    }
    if (salesResult.error) {
      console.error('발행 대상 매출 로드 실패:', salesResult.error);
      toast.error('발행 대상 매출을 불러오지 못했습니다.');
    }
    if (memberResult.error) {
      console.error('회원 법인 정보 로드 실패:', memberResult.error);
      toast.error('회원 법인 정보를 불러오지 못했습니다.');
    }

    const mappedInvoices = (invoiceResult.data ?? []).map(row => mapInvoiceRow(row as Record<string, unknown>));
    const activeInvoiceSaleIds = new Set(mappedInvoices.filter(inv => inv.status !== '취소 발행').map(inv => inv.saleId));
    const memberMap = new Map<number, MemberInfo>(
      (memberResult.data ?? []).map(row => [
        Number(row.id),
        {
          id: Number(row.id),
          name: String(row.name ?? ''),
          email: row.email ? String(row.email) : null,
          companyName: row.companyName ? String(row.companyName) : null,
          memberType: row.memberType ? String(row.memberType) : null,
        },
      ])
    );

    const pendingTargets = (salesResult.data ?? [])
      .filter(row => !activeInvoiceSaleIds.has(Number(row.id)))
      .filter(row => isCorporateMember(String(row.saleCategory ?? ''), memberMap.get(Number(row.memberId))))
      .map(row => {
        const member = memberMap.get(Number(row.memberId));
        const grossTotal = parseMoney(row.amount as string | number) || parseMoney(row.salePrice as string | number);
        const supplyAmount = Math.round(grossTotal / 1.1);
        const vatAmount = Math.max(0, grossTotal - supplyAmount);
        const qty = Number(row.quantity) || 1;
        return {
          saleId: Number(row.id),
          date: String(row.saleDate ?? '').slice(0, 10),
          memberId: Number(row.memberId),
          memberName: String(row.memberName ?? member?.name ?? ''),
          recipientDefault: member?.companyName || String(row.memberName ?? member?.name ?? ''),
          emailDefault: member?.email ?? '',
          productName: String(row.productName ?? '결제 상품'),
          qty,
          supplyAmount,
          vatAmount,
          totalAmount: grossTotal,
        };
      });

    setInvoices(mappedInvoices);
    setPending(pendingTargets);
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const stats = useMemo(() => {
    const issuedThisMonth = invoices.filter(i => i.issueDate.slice(0, 7) === currentMonth && i.status !== '취소 발행');
    return {
      count: issuedThisMonth.length,
      amount: issuedThisMonth.reduce((s, i) => s + total(i), 0),
      pending: pending.length,
    };
  }, [currentMonth, invoices, pending]);

  const openIssue = (target: PendingTarget) => {
    setIssueTarget(target);
    setForm({ recipient: target.recipientDefault, bizNo: '', email: target.emailDefault });
  };

  const handleIssue = async () => {
    if (!issueTarget) return;
    if (!form.recipient.trim()) {
      toast.error('공급받는 자 상호를 입력해주세요.');
      return;
    }
    if (!isValidBizNo(form.bizNo)) {
      toast.error('사업자번호는 10자리여야 합니다.');
      return;
    }
    if (!isValidEmail(form.email)) {
      toast.error('이메일 형식을 확인해주세요.');
      return;
    }

    setIsIssuing(true);
    const unit = issueTarget.qty > 0 ? Math.round(issueTarget.supplyAmount / issueTarget.qty) : issueTarget.supplyAmount;
    const invoiceNo = createInvoiceNo();
    const branchId = getBranchId();
    const { data: invoice, error } = await supabase
      .from('tax_invoices')
      .insert({
        invoiceNo,
        branchId,
        saleId: issueTarget.saleId,
        memberId: issueTarget.memberId,
        memberName: issueTarget.memberName,
        recipient: form.recipient.trim(),
        bizNo: form.bizNo.replace(/[^0-9]/g, ''),
        email: form.email.trim(),
        issueDate: today,
        supplyAmount: issueTarget.supplyAmount,
        vatAmount: issueTarget.vatAmount,
        totalAmount: issueTarget.totalAmount,
        status: '발행 완료',
      })
      .select('id')
      .single();

    if (error || !invoice) {
      setIsIssuing(false);
      toast.error(`세금계산서 발행 실패: ${error?.message ?? '발행 ID를 확인할 수 없습니다.'}`);
      return;
    }

    const invoiceId = Number(invoice.id);
    const { error: itemError } = await supabase.from('tax_invoice_items').insert({
      invoiceId,
      productName: issueTarget.productName,
      qty: issueTarget.qty,
      unitPrice: unit,
      supplyAmount: issueTarget.supplyAmount,
      vatAmount: issueTarget.vatAmount,
      taxFree: false,
    });
    setIsIssuing(false);

    if (itemError) {
      await supabase.from('tax_invoices').delete().eq('id', invoiceId);
      toast.error(`공급 품목 저장 실패: ${itemError.message}`);
      return;
    }

    toast.success('세금계산서가 발행되었습니다.');
    setIssueTarget(null);
    setActiveTab('HISTORY');
    fetchInvoices();
  };

  const handleSendEmail = async (inv: Invoice) => {
    if (!isValidEmail(inv.email)) {
      toast.error('이메일 형식을 확인해주세요.');
      return;
    }
    const { error } = await supabase
      .from('tax_invoices')
      .update({ status: '전송 완료', emailSentAt: new Date().toISOString() })
      .eq('id', inv.id);
    if (error) {
      toast.error(`전송 상태 저장 실패: ${error.message}`);
      return;
    }
    toast.success('전송되었습니다.');
    fetchInvoices();
  };

  const handleReissue = async (inv: Invoice) => {
    const { error } = await supabase
      .from('tax_invoices')
      .update({ status: '발행 완료', issueDate: today, emailSentAt: null })
      .eq('id', inv.id);
    if (error) {
      toast.error(`재발행 실패: ${error.message}`);
      return;
    }
    toast.success('재발행되었습니다.');
    fetchInvoices();
  };

  const handleDownload = () => {
    exportToExcel(
      invoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        issueDate: inv.issueDate,
        recipient: inv.recipient,
        bizNo: inv.bizNo,
        email: inv.email,
        supplyAmount: supply(inv),
        vatAmount: vat(inv),
        totalAmount: total(inv),
        status: inv.status,
        emailSentAt: inv.emailSentAt ?? '',
      })),
      [
        { key: 'invoiceNo', header: '세금계산서 번호' },
        { key: 'issueDate', header: '발행일' },
        { key: 'recipient', header: '공급받는 자' },
        { key: 'bizNo', header: '사업자번호' },
        { key: 'email', header: '이메일' },
        { key: 'supplyAmount', header: '공급가액' },
        { key: 'vatAmount', header: '부가세' },
        { key: 'totalAmount', header: '합계' },
        { key: 'status', header: '상태' },
        { key: 'emailSentAt', header: '이메일 전송일' },
      ],
      { filename: '세금계산서발행이력' }
    );
    toast.success(`${invoices.length}건 엑셀 다운로드 완료`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="세금계산서 발행"
        description="법인·사업자 회원에게 세금계산서를 발행하고 발행 이력을 조회·관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button variant="outline" size="sm" icon={<RefreshCw size={15} />} onClick={fetchInvoices}>
              새로고침
            </Button>
            <Button variant="outline" size="sm" icon={<Download size={15} />} onClick={handleDownload}>
              엑셀 다운로드
            </Button>
          </div>
        }
      />

      <StatCardGrid cols={3} className="mb-xl">
        <StatCard label="이번 달 발행 건수" value={`${stats.count}건`} icon={<FileText />} variant="peach" />
        <StatCard label="이번 달 발행 총액" value={formatKRW(stats.amount)} icon={<CheckCircle />} variant="mint" />
        <StatCard label="미발행 대기" value={`${stats.pending}건`} icon={<AlertTriangle />} className={stats.pending > 0 ? 'border-state-error/20' : ''} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="border-b border-line">
          <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {isLoading ? (
          <div className="px-lg py-12 text-center text-[13px] text-content-secondary">세금계산서 데이터를 불러오는 중입니다.</div>
        ) : activeTab === 'ISSUE' ? (
          pending.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="발행 대상 결제 건이 없어요"
              description="법인·사업자 결제가 완료되면 이 탭에 발행 대상이 표시됩니다."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px]">
                <thead className="bg-surface-secondary/85">
                  <tr className="text-[11px] font-black uppercase tracking-[0.12em] text-content-secondary">
                    <th className="px-4 py-3 text-left">결제일</th>
                    <th className="px-4 py-3 text-left">공급받는 자</th>
                    <th className="px-4 py-3 text-left">상품명</th>
                    <th className="px-4 py-3 text-center">수량</th>
                    <th className="px-4 py-3 text-right">공급가액</th>
                    <th className="px-4 py-3 text-right">부가세</th>
                    <th className="px-4 py-3 text-center">발행</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {pending.map(p => (
                    <tr key={p.saleId} className="hover:bg-surface-secondary/70 transition-colors">
                      <td className="px-4 py-3 text-content-secondary">{p.date}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-content">{p.recipientDefault}</div>
                        <div className="text-[11px] text-content-tertiary">{p.memberName}</div>
                      </td>
                      <td className="px-4 py-3 text-content">{p.productName}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{p.qty}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">{formatKRW(p.supplyAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-content-secondary">{formatKRW(p.vatAmount)}</td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="primary" size="sm" icon={<Plus size={13} />} onClick={() => openIssue(p)}>
                          발행
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : invoices.length === 0 ? (
          <EmptyState icon={FileText} title="발행 이력이 없어요" description="세금계산서를 발행하면 이력이 여기에 표시됩니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-[13px]">
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
                    <td className="px-4 py-3">
                      <div className="text-content-secondary">{inv.issueDate}</div>
                      <div className="font-mono text-[11px] text-content-tertiary">{inv.invoiceNo}</div>
                    </td>
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
          </div>
        )}
      </div>

      <Modal
        isOpen={issueTarget !== null}
        onClose={() => setIssueTarget(null)}
        title="세금계산서 발행"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setIssueTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleIssue} disabled={isIssuing}>
              {isIssuing ? '발행 중...' : '발행'}
            </Button>
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
                placeholder="사업자번호 10자리"
                error={form.bizNo && !isValidBizNo(form.bizNo) ? '10자리 숫자를 입력해주세요.' : undefined}
              />
            </div>
            <Input
              label="이메일"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="이메일"
              error={form.email && !isValidEmail(form.email) ? '이메일 형식을 확인해주세요.' : undefined}
            />
            <div className="rounded-xl border border-line p-md">
              <p className="mb-sm text-[12px] font-semibold text-content-secondary">공급 품목 (결제 건 자동 채움)</p>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-content">{issueTarget.productName} × {issueTarget.qty}</span>
                <span className="font-semibold tabular-nums text-content">{formatKRW(issueTarget.supplyAmount)}</span>
              </div>
              <div className="mt-sm flex items-center justify-between border-t border-line pt-sm text-[12px] text-content-secondary">
                <span>부가세</span>
                <span className="tabular-nums">{formatKRW(issueTarget.vatAmount)}</span>
              </div>
              <div className="mt-xs flex items-center justify-between text-[13px] font-bold text-content">
                <span>합계</span>
                <span className="tabular-nums text-primary">{formatKRW(issueTarget.totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

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
                <p className="text-[13px] font-semibold text-content tabular-nums">{detail.invoiceNo}</p>
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
                <div key={it.id ?? idx} className="flex items-center justify-between py-[3px] text-[13px]">
                  <span className="text-content">{it.productName} × {it.qty}{it.taxFree ? ' (면세)' : ''}</span>
                  <span className="tabular-nums text-content">{formatKRW(it.supplyAmount)}</span>
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
