'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Printer,
  Mail,
  Plus,
  Minus,
  ArrowRight,
  X,
  CheckCircle2,
  Clock,
  Send,
  History,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import Select from '@/components/ui/Select';
import StatCard from "@/components/common/StatCard";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { formatKRW, formatNumber } from "@/lib/format";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuthStore } from "@/stores/authStore";
import { normalizeRole, isRoleAtLeast } from "@/lib/permissions";

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-065: 급여 명세서 (/payroll/statements)
 * - 명세서 목록 테이블 9개 컬럼(발송 상태/발송 일시/수신 확인 포함)
 * - PAY-STF-03-05 개별 발송 / PAY-STF-03-06 일괄 발송 / 재발송 / 무효 (목업)
 * - 발송 이력 패널 (목업)
 * 이메일/앱 발송 백엔드는 미구현이며, 발송 상태·이력은 로컬 상태로 목업 처리합니다.
 */

interface StaffItem {
  id: number;
  name: string;
  position: string;
}

interface EarningItem { name: string; amount: number; }
interface DeductionItem { name: string; amount: number; }

interface StatementDetail {
  baseSalary: number;
  earnings: EarningItem[];
  deductions: DeductionItem[];
  status: "paid" | "pending";
  paymentDate: string;
}

interface PayrollRecord {
  id: number;
  staffId: number;
  staffName: string;
  position: string;
  year: number;
  month: number;
  baseSalary: number;
  netSalary: number;
  status: "paid" | "pending";
  paymentDate: string;
  details: { earnings: EarningItem[]; deductions: DeductionItem[]; } | null;
}

// 발송 상태 목업 (CRM 내부 상태)
type SendStatus = "미발송" | "발송완료" | "무효";
type ReceiptStatus = "-" | "미열람" | "열람완료" | "확인불가";

interface SendState {
  sendStatus: SendStatus;
  sentAt: string | null; // 마지막 발송 성공 일시
  receipt: ReceiptStatus;
  history: { at: string; action: string; channel: string }[];
}

// 최근 12개월
function getRecentMonths() {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ value, label: `${d.getFullYear()}년 ${d.getMonth() + 1}월` });
  }
  return months;
}

const nowStr = () => new Date().toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });

const mapPayrollStatusFromDb = (status: string | null | undefined): "paid" | "pending" => {
  return status === "PAID" || status === "paid" ? "paid" : "pending";
};

const mapSendStatusFromDb = (status: string | null | undefined): SendStatus => {
  if (status === "SENT") return "발송완료";
  if (status === "VOID") return "무효";
  return "미발송";
};

const mapReceiptFromDb = (status: string | null | undefined): ReceiptStatus => {
  if (status === "UNREAD") return "미열람";
  if (status === "READ") return "열람완료";
  if (status === "UNAVAILABLE") return "확인불가";
  return "-";
};

const mapSendStatusToDb = (status: SendStatus): "NOT_SENT" | "SENT" | "VOID" => {
  if (status === "발송완료") return "SENT";
  if (status === "무효") return "VOID";
  return "NOT_SENT";
};

const mapReceiptToDb = (status: ReceiptStatus): "NONE" | "UNREAD" | "READ" | "UNAVAILABLE" => {
  if (status === "미열람") return "UNREAD";
  if (status === "열람완료") return "READ";
  if (status === "확인불가") return "UNAVAILABLE";
  return "NONE";
};

const normalizePayrollDetails = (row: any): { earnings: EarningItem[]; deductions: DeductionItem[] } => {
  const details = row.details ?? {};
  if (Array.isArray(details.earnings) || Array.isArray(details.deductions)) {
    return {
      earnings: Array.isArray(details.earnings) ? details.earnings : [{ name: "기본급", amount: Number(row.baseSalary ?? 0) }],
      deductions: Array.isArray(details.deductions) ? details.deductions : [],
    };
  }
  const manualEarnings = Array.isArray(details.manualEarnings) ? details.manualEarnings : [];
  const manualDeductions = Array.isArray(details.manualDeductions) ? details.manualDeductions : [];
  const baseSalary = Number(row.baseSalary ?? 0);
  const bonus = Number(row.bonus ?? 0);
  const deduction = Number(row.deduction ?? 0);
  return {
    earnings: [
      { name: "기본급", amount: baseSalary },
      ...(manualEarnings.length > 0 ? manualEarnings : bonus > 0 ? [{ name: "수당 합계", amount: bonus }] : []),
    ],
    deductions: [
      ...(manualDeductions.length > 0 ? manualDeductions : deduction > 0 ? [{ name: "공제 합계", amount: deduction }] : []),
    ],
  };
};

export default function PayrollStatement() {
  const authUser = useAuthStore((s) => s.user);
  const userRole = normalizeRole(authUser?.role ?? '');
  const isReadonly = userRole === 'readonly';
  // 발송/무효 권한: manager 이상
  const canSend = isRoleAtLeast(userRole, 'manager');

  const MONTHS = useMemo(() => getRecentMonths(), []);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatement, setModalStatement] = useState<StatementDetail | null>(null);
  const [modalStaffName, setModalStaffName] = useState("");

  // 발송 상태 목업 (payrollRecord.id → SendState)
  const [sendStates, setSendStates] = useState<Record<number, SendState>>({});
  // 일괄 발송용 선택 (테이블 행 인덱스)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  // 재발송 확인 다이얼로그
  const [resendTargetId, setResendTargetId] = useState<number | null>(null);
  // 무효 확인 다이얼로그
  const [voidTargetId, setVoidTargetId] = useState<number | null>(null);
  // 발송 이력 패널
  const [historyTargetId, setHistoryTargetId] = useState<number | null>(null);

  const loadDeliveryStates = async (records: PayrollRecord[]) => {
    if (records.length === 0) {
      setSendStates({});
      return;
    }
    const ids = records.map(record => record.id);
    const { data, error } = await supabase
      .from("payroll_statement_deliveries")
      .select("payrollId, sendStatus, receiptStatus, sentAt, history")
      .in("payrollId", ids);

    if (error) {
      toast.error("급여 명세서 발송 상태를 불러오지 못했습니다.");
      setSendStates(Object.fromEntries(records.map(record => [record.id, { sendStatus: "미발송", sentAt: null, receipt: "-", history: [] }])));
      return;
    }

    const deliveryByPayrollId = new Map<number, Record<string, unknown>>();
    (data ?? []).forEach((row: Record<string, unknown>) => {
      deliveryByPayrollId.set(Number(row.payrollId), row);
    });

    setSendStates(Object.fromEntries(records.map(record => {
      const row = deliveryByPayrollId.get(record.id);
      if (!row) return [record.id, { sendStatus: "미발송", sentAt: null, receipt: "-", history: [] } satisfies SendState];
      return [record.id, {
        sendStatus: mapSendStatusFromDb(row.sendStatus as string | null),
        sentAt: row.sentAt ? new Date(row.sentAt as string).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" }) : null,
        receipt: mapReceiptFromDb(row.receiptStatus as string | null),
        history: Array.isArray(row.history) ? row.history as SendState["history"] : [],
      } satisfies SendState];
    })));
  };

  // 직원 목록 로드 (readonly는 본인만)
  useEffect(() => {
    async function fetchStaff() {
      let query = supabase
        .from("staff")
        .select("id, name, position")
        .eq("branchId", getBranchId())
        .order("name");
      if (isReadonly && authUser?.name) query = query.eq("name", authUser.name);
      const { data, error } = await query;
      if (error) {
        console.error("직원 목록 로드 실패:", error);
        toast.error("직원 목록을 불러오지 못했습니다.");
      } else if (data && data.length > 0) {
        const mapped: StaffItem[] = data.map((s: any) => ({ id: s.id, name: s.name, position: s.position ?? "" }));
        setStaffList(mapped);
        setSelectedStaffId(String(mapped[0].id));
      }
    }
    fetchStaff();
  }, [isReadonly, authUser?.name]);

  // 급여 데이터 로드 (월 변경 시)
  useEffect(() => {
    async function fetchPayroll() {
      setIsLoadingData(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const { data, error } = await supabase
        .from("payroll")
        .select("id, staffId, staffName, year, month, baseSalary, bonus, deduction, netSalary, status, paidAt, details, staff!inner(position, branchId)")
        .eq("staff.branchId", getBranchId())
        .eq("year", year)
        .eq("month", month);
      if (error) {
        console.error("급여 명세서 로드 실패:", error);
        toast.error("급여 명세서를 불러오지 못했습니다.");
      } else if (data) {
        const mapped: PayrollRecord[] = data.map((r: any) => ({
          id: r.id,
          staffId: r.staffId,
          staffName: r.staffName,
          position: r.staff?.position ?? "",
          year: r.year,
          month: r.month,
          baseSalary: Number(r.baseSalary ?? 0),
          netSalary: Number(r.netSalary ?? 0),
          status: mapPayrollStatusFromDb(r.status),
          paymentDate: r.paidAt ? new Date(r.paidAt).toLocaleDateString('ko-KR') : "-",
          details: normalizePayrollDetails(r),
        }));
        setPayrollRecords(mapped);
        await loadDeliveryStates(mapped);
      }
      setIsLoadingData(false);
      setSelectedRows(new Set());
    }
    fetchPayroll();
  }, [selectedMonth]);

  // 선택된 직원+월의 명세서 상세
  const statement = useMemo((): StatementDetail | null => {
    if (!selectedStaffId) return null;
    const rec = payrollRecords.find(r => String(r.staffId) === selectedStaffId);
    if (!rec) return null;
    return {
      baseSalary: rec.baseSalary,
      earnings: rec.details?.earnings ?? [{ name: "기본급", amount: rec.baseSalary }],
      deductions: rec.details?.deductions ?? [],
      status: rec.status,
      paymentDate: rec.paymentDate,
    };
  }, [selectedStaffId, payrollRecords]);

  const selectedStaff = staffList.find(s => String(s.id) === selectedStaffId);
  const totalEarnings   = statement ? statement.earnings.reduce((s, e) => s + e.amount, 0) : 0;
  const totalDeductions = statement ? statement.deductions.reduce((s, e) => s + e.amount, 0) : 0;
  const netPay = totalEarnings - totalDeductions;

  // 테이블용 데이터 (전체 직원 × 선택 월)
  const tableData = useMemo(() =>
    staffList.map(staff => {
      const rec = payrollRecords.find(r => r.staffId === staff.id);
      const send = rec ? sendStates[rec.id] : undefined;
      if (!rec) return {
        id: staff.id, recId: 0, name: staff.name, position: staff.position,
        baseSalary: 0, netPay: 0, status: "pending" as const,
        sendStatus: "미발송" as SendStatus, sentAt: null as string | null, receipt: "-" as ReceiptStatus,
      };
      const earn = rec.details?.earnings.reduce((s, e) => s + e.amount, 0) ?? rec.baseSalary;
      const ded  = rec.details?.deductions.reduce((s, e) => s + e.amount, 0) ?? 0;
      return {
        id: staff.id,
        recId: rec.id,
        name: staff.name,
        position: staff.position,
        baseSalary: rec.baseSalary,
        netPay: rec.netSalary || (earn - ded),
        status: rec.status,
        sendStatus: send?.sendStatus ?? "미발송",
        sentAt: send?.sentAt ?? null,
        receipt: send?.receipt ?? "-",
      };
    }),
    [staffList, payrollRecords, sendStates]
  );
  type TableRow = typeof tableData[0];

  const paidCount    = tableData.filter(r => r.status === "paid").length;
  const pendingCount = tableData.filter(r => r.status === "pending").length;
  const sentCount    = tableData.filter(r => r.sendStatus === "발송완료").length;
  const totalNet     = tableData.reduce((s, r) => s + r.netPay, 0);

  // ── 발송 액션 (목업) ─────────────────────────────────────────────────────
  const doSend = async (recId: number, channelLabel = "이메일·앱") => {
    const rec = payrollRecords.find(record => record.id === recId);
    if (!rec) return false;
    const cur = sendStates[recId] ?? { sendStatus: "미발송" as SendStatus, sentAt: null, receipt: "-" as ReceiptStatus, history: [] };
    const at = nowStr();
    const nextState: SendState = {
      sendStatus: "발송완료",
      sentAt: at,
      receipt: "미열람",
      history: [...cur.history, { at, action: cur.sendStatus === "발송완료" ? "재발송" : "발송", channel: channelLabel }],
    };

    const { error } = await supabase.from("payroll_statement_deliveries").upsert({
      branchId: getBranchId(),
      payrollId: rec.id,
      staffId: rec.staffId,
      sendStatus: mapSendStatusToDb(nextState.sendStatus),
      receiptStatus: mapReceiptToDb(nextState.receipt),
      sentAt: new Date().toISOString(),
      voidedAt: null,
      history: nextState.history,
      updatedAt: new Date().toISOString(),
    }, { onConflict: "payrollId" });

    if (error) {
      toast.error("명세서 발송 상태 저장에 실패했습니다.");
      return false;
    }

    setSendStates(prev => ({ ...prev, [recId]: nextState }));
    return true;
  };

  const handleSendClick = async (row: TableRow) => {
    if (!canSend) { toast.error("발송 권한이 없습니다."); return; }
    if (row.status !== "paid") { toast.warning("급여 미확정 상태입니다. 급여 확정 후 명세서를 발송할 수 있습니다."); return; }
    if (row.sendStatus === "무효") { toast.error("무효 명세서는 발송할 수 없습니다. 급여 재확정 후 새 명세서를 발송해주세요."); return; }
    if (row.sendStatus === "발송완료") { setResendTargetId(row.recId); return; } // 재발송 확인
    const ok = await doSend(row.recId);
    if (ok) toast.success(`${row.name} 명세서를 발송했습니다.`);
  };

  const handleBulkSend = async () => {
    if (!canSend) { toast.error("발송 권한이 없습니다."); return; }
    const selectedTableRows = [...selectedRows].map(idx => tableData[idx]).filter(Boolean);
    const targets = selectedTableRows.filter(r => r.recId && r.status === "paid" && r.sendStatus !== "무효");
    const skipped = selectedTableRows.length - targets.length;
    if (targets.length === 0) { toast.warning("발송 가능한 확정 명세서가 없습니다."); return; }
    let sent = 0;
    for (const target of targets) {
      if (await doSend(target.recId)) sent += 1;
    }
    setSelectedRows(new Set());
    toast.success(`${sent}건을 일괄 발송했습니다.${skipped > 0 ? ` (미확정·무효 ${skipped}건 제외)` : ""}`);
  };

  const handleVoid = async (recId: number) => {
    const rec = payrollRecords.find(record => record.id === recId);
    if (!rec) return false;
    const cur = sendStates[recId] ?? { sendStatus: "미발송" as SendStatus, sentAt: null, receipt: "-" as ReceiptStatus, history: [] };
    const nextState: SendState = {
      ...cur,
      sendStatus: "무효",
      receipt: "확인불가",
      history: [...cur.history, { at: nowStr(), action: "무효 처리", channel: "-" }],
    };
    const { error } = await supabase.from("payroll_statement_deliveries").upsert({
      branchId: getBranchId(),
      payrollId: rec.id,
      staffId: rec.staffId,
      sendStatus: mapSendStatusToDb(nextState.sendStatus),
      receiptStatus: mapReceiptToDb(nextState.receipt),
      sentAt: cur.sentAt ? new Date().toISOString() : null,
      voidedAt: new Date().toISOString(),
      history: nextState.history,
      updatedAt: new Date().toISOString(),
    }, { onConflict: "payrollId" });

    if (error) {
      toast.error("명세서 무효 상태 저장에 실패했습니다.");
      return false;
    }
    setSendStates(prev => ({ ...prev, [recId]: nextState }));
    return true;
  };

  const sendStatusVariant = (s: SendStatus): "success" | "warning" | "default" | "error" =>
    s === "발송완료" ? "success" : s === "무효" ? "error" : "warning";

  const columns = [
    {
      key: "name",
      header: "직원명",
      width: 150,
      render: (val: string, row: TableRow) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-bold text-content">{val}</span>
          <span className="text-[12px] text-content-secondary">/ {row.position || "-"}</span>
        </div>
      )
    },
    { key: "paymentDate" as const, header: "지급 월", align: "center" as const, width: 90, render: () => <span>{selectedMonth}</span> },
    { key: "baseSalary", header: "기본급", align: "right" as const, width: 110, render: (val: number) => val ? <span className="whitespace-nowrap">{formatKRW(val)}</span> : "-" },
    { key: "netPay", header: "실지급액", align: "right" as const, width: 120, render: (val: number) => val ? <span className="whitespace-nowrap font-bold text-primary">{formatKRW(val)}</span> : "-" },
    {
      key: "sendStatus", header: "발송 상태", align: "center" as const, width: 100,
      render: (val: SendStatus) => (
        <span className="inline-flex whitespace-nowrap">
          <StatusBadge variant={sendStatusVariant(val)} dot>{val}</StatusBadge>
        </span>
      )
    },
    { key: "sentAt", header: "발송 일시", align: "center" as const, width: 130, render: (val: string | null) => <span className="text-[12px] text-content-secondary whitespace-nowrap">{val ?? "-"}</span> },
    {
      key: "receipt", header: "수신 확인", align: "center" as const, width: 100,
      render: (val: ReceiptStatus) => {
        if (val === "-") return <span className="text-content-tertiary">-</span>;
        const color = val === "열람완료" ? "text-state-success" : val === "확인불가" ? "text-content-tertiary" : "text-amber-500";
        return <span className={`text-[12px] font-semibold whitespace-nowrap ${color}`}>{val}</span>;
      }
    },
    {
      key: "recId",
      header: "액션",
      align: "center" as const,
      width: 220,
      render: (_: number, row: TableRow) => (
        <div className="flex items-center justify-center gap-xs flex-wrap">
          {/* 발송/재발송 */}
          {canSend && (
            <Button
              variant={row.sendStatus === "발송완료" ? "outline" : "primary"}
              size="sm"
              icon={<Send size={12} />}
              disabled={row.status !== "paid" || row.sendStatus === "무효"}
              onClick={() => handleSendClick(row)}
            >
              {row.sendStatus === "발송완료" ? "재발송" : "발송"}
            </Button>
          )}
          {/* 무효 (발송완료 또는 미발송 확정 명세서만) */}
          {canSend && row.status === "paid" && row.sendStatus !== "무효" && (
            <Button variant="ghost" size="sm" icon={<Ban size={12} />} onClick={() => setVoidTargetId(row.recId)}>무효</Button>
          )}
          {/* 이력 */}
          <Button variant="ghost" size="sm" icon={<History size={12} />} onClick={() => setHistoryTargetId(row.recId)} />
        </div>
      )
    },
    {
      key: "id",
      header: "명세서",
      align: "center" as const,
      width: 90,
      render: (_: number, row: TableRow) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const rec = payrollRecords.find(r => r.staffId === row.id);
            if (rec) {
              if (sendStates[rec.id]?.sendStatus === "무효") { toast.info("무효 처리된 명세서입니다. 재확정 후 새 명세서를 확인해주세요."); return; }
              setModalStatement({
                baseSalary: rec.baseSalary,
                earnings: rec.details?.earnings ?? [{ name: "기본급", amount: rec.baseSalary }],
                deductions: rec.details?.deductions ?? [],
                status: rec.status,
                paymentDate: rec.paymentDate,
              });
              setModalStaffName(row.name);
              setIsModalOpen(true);
            } else {
              toast.info("해당 월의 명세서가 없습니다.");
            }
          }}
        >
          상세보기
        </Button>
      )
    }
  ];

  const historyTarget = historyTargetId != null ? sendStates[historyTargetId] : undefined;
  const historyTargetName = historyTargetId != null ? (payrollRecords.find(r => r.id === historyTargetId)?.staffName ?? "") : "";

  return (
    <AppLayout>
      <div className="space-y-xl">
        <PageHeader
          title="급여 명세서"
          description="확정된 급여 명세서를 조회하고 직원에게 발송합니다."
          actions={
            <div className="flex items-center gap-sm">
              {canSend && (
                <Button variant="primary" size="sm" icon={<Send size={16} />} disabled={selectedRows.size === 0} onClick={handleBulkSend}>
                  일괄 발송{selectedRows.size > 0 ? ` (${selectedRows.size})` : ""}
                </Button>
              )}
              <Button variant="outline" size="sm" icon={<Printer size={16} />} onClick={() => window.print()}>일괄 인쇄</Button>
            </div>
          }
        />

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-lg">
          <StatCard label="총 실지급액"  value={formatKRW(totalNet)} icon={<FileText />}     variant="default" />
          <StatCard label="확정 완료"    value={`${paidCount}건`}     icon={<CheckCircle2 />} variant="mint" />
          <StatCard label="발송 완료"    value={`${sentCount}건`}     icon={<Send />}         variant="mint" />
          <StatCard label="미확정"       value={`${pendingCount}건`}  icon={<Clock />}        variant="peach" />
        </div>

        {/* 직원 / 월 선택 + 명세서 상세 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-xl">
          {/* 선택 패널 */}
          <div className="bg-surface border border-line rounded-xl p-xl space-y-lg shadow-card">
            <h3 className="text-Body-1 font-bold text-content">명세서 조회</h3>
            <div className="grid grid-cols-2 gap-md">
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">직원 선택</label>
                <Select options={staffList.map(s => ({ value: String(s.id), label: s.name }))} value={selectedStaffId} onChange={v => setSelectedStaffId(v)} disabled={isReadonly} />
              </div>
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">지급 월</label>
                <Select options={MONTHS.map(m => ({ value: m.value, label: m.label }))} value={selectedMonth} onChange={v => setSelectedMonth(v)} />
              </div>
            </div>

            {statement && selectedStaff ? (
              <div className="space-y-lg">
                <div className="flex items-center justify-between p-lg bg-primary-light rounded-xl border border-primary/10">
                  <div>
                    <p className="text-Heading-2 font-bold text-content whitespace-nowrap">{selectedStaff.name}</p>
                    <p className="text-Body-2 text-primary font-medium whitespace-nowrap">{selectedStaff.position}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="inline-flex">
                      <StatusBadge variant={statement.status === "paid" ? "success" : "warning"} dot={true}>
                        {statement.status === "paid" ? "확정" : "미확정"}
                      </StatusBadge>
                    </span>
                    <p className="mt-xs text-Label text-content-secondary whitespace-nowrap">지급일: {statement.paymentDate}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-lg">
                  <div className="space-y-sm">
                    <div className="flex items-center gap-xs text-state-success mb-sm"><Plus size={16} /><h4 className="text-Body-2 font-bold">지급 항목</h4></div>
                    {statement.earnings.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-xs border-b border-dashed border-line">
                        <span className="text-Body-2 text-content">{item.name}</span>
                        <span className="text-Body-2 font-medium">{formatKRW(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-sm">
                      <span className="text-Body-2 font-bold text-content">지급 총액</span>
                      <span className="text-Body-2 font-bold text-state-success">{formatKRW(totalEarnings)}</span>
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <div className="flex items-center gap-xs text-error mb-sm"><Minus size={16} /><h4 className="text-Body-2 font-bold">공제 항목</h4></div>
                    {statement.deductions.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-xs border-b border-dashed border-line">
                        <span className="text-Body-2 text-content">{item.name}</span>
                        <span className="text-Body-2 font-medium text-error">-{formatNumber(item.amount)}원</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-sm">
                      <span className="text-Body-2 font-bold text-content">공제 총액</span>
                      <span className="text-Body-2 font-bold text-error">{formatKRW(totalDeductions)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-lg bg-accent-light border border-accent/20 rounded-xl">
                  <div className="flex items-center gap-sm">
                    <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-white"><ArrowRight size={18} /></div>
                    <span className="text-Body-1 font-bold text-content">실지급액</span>
                  </div>
                  <p className="text-[28px] font-bold text-accent">{formatKRW(netPay)}</p>
                </div>

                <div className="flex gap-sm pt-sm">
                  {canSend && (() => {
                    const rec = payrollRecords.find(r => String(r.staffId) === selectedStaffId);
                    const row = tableData.find(t => t.recId === rec?.id);
                    return (
                      <Button variant="primary" size="sm" fullWidth icon={<Send size={16} />} disabled={!row || row.status !== "paid" || row.sendStatus === "무효"} onClick={() => row && handleSendClick(row)}>
                        {row?.sendStatus === "발송완료" ? "재발송" : "발송"}
                      </Button>
                    );
                  })()}
                  <Button variant="outline" size="sm" fullWidth icon={<Download size={16} />} onClick={() => { toast.info("인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요"); setTimeout(() => window.print(), 500); }}>PDF 저장 (인쇄)</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-xl text-center">
                <div className="w-14 h-14 bg-surface-secondary rounded-full flex items-center justify-center mb-md"><FileText size={28} className="text-content-secondary" /></div>
                <p className="text-Body-1 font-semibold text-content mb-xs">명세서 없음</p>
                <p className="text-Body-2 text-content-secondary">{isLoadingData ? "데이터를 불러오는 중..." : "선택한 직원 및 월의 급여 데이터가 없습니다."}</p>
              </div>
            )}
          </div>

          {/* 전체 직원 목록 (선택 월 기준) */}
          <div className="space-y-md">
            <h3 className="text-Body-1 font-bold text-content">
              {MONTHS.find(m => m.value === selectedMonth)?.label ?? selectedMonth} 전체 발송 현황
            </h3>
            <DataTable
              columns={columns}
              data={tableData}
              selectable={canSend}
              selectedRows={selectedRows}
              onSelectRows={setSelectedRows}
              pagination={{ page: 1, pageSize: 10, total: tableData.length }}
              onDownloadExcel={() => {
                const exportColumns = [
                  { key: 'name', header: '직원명' },
                  { key: 'position', header: '직급' },
                  { key: 'baseSalary', header: '기본급' },
                  { key: 'netPay', header: '실지급액' },
                  { key: 'sendStatus', header: '발송 상태' },
                  { key: 'sentAt', header: '발송 일시' },
                  { key: 'receipt', header: '수신 확인' },
                ];
                exportToExcel(tableData as unknown as Record<string, unknown>[], exportColumns, { filename: `급여명세서_${selectedMonth}` });
                toast.success("엑셀 다운로드가 완료되었습니다.");
              }}
              emptyMessage={isLoadingData ? "데이터를 불러오는 중..." : "급여 데이터가 없습니다."}
            />
          </div>
        </div>
      </div>

      {/* 명세서 상세 모달 */}
      {isModalOpen && modalStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="w-full max-w-xl bg-surface rounded-modal shadow-xl overflow-hidden animate-in zoom-in duration-200">
            <div className="p-xl border-b border-line flex justify-between items-center bg-surface-secondary/20">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white"><FileText size={20} /></div>
                <div>
                  <h2 className="text-Heading-2 text-content font-bold">급여 명세서</h2>
                  <p className="text-Body-2 text-content-secondary whitespace-nowrap">{modalStaffName} · {modalStatement.paymentDate} 지급분</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}><X size={22} /></Button>
            </div>
            <div className="p-xl space-y-lg max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-lg">
                <div className="space-y-sm">
                  <div className="flex items-center gap-xs text-state-success"><Plus size={16} /><h4 className="text-Body-2 font-bold">지급 항목</h4></div>
                  {modalStatement.earnings.map((item, i) => (
                    <div key={i} className="flex justify-between py-xs border-b border-dashed border-line">
                      <span className="text-Body-2 text-content">{item.name}</span>
                      <span className="text-Body-2 font-medium">{formatKRW(item.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-sm">
                    <span className="text-Body-2 font-bold">지급 총액</span>
                    <span className="text-Body-2 font-bold text-state-success">{formatKRW(modalStatement.earnings.reduce((s, e) => s + e.amount, 0))}</span>
                  </div>
                </div>
                <div className="space-y-sm">
                  <div className="flex items-center gap-xs text-error"><Minus size={16} /><h4 className="text-Body-2 font-bold">공제 항목</h4></div>
                  {modalStatement.deductions.map((item, i) => (
                    <div key={i} className="flex justify-between py-xs border-b border-dashed border-line">
                      <span className="text-Body-2 text-content">{item.name}</span>
                      <span className="text-Body-2 font-medium text-error">-{formatNumber(item.amount)}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-sm">
                    <span className="text-Body-2 font-bold">공제 총액</span>
                    <span className="text-Body-2 font-bold text-error">{formatKRW(modalStatement.deductions.reduce((s, e) => s + e.amount, 0))}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center p-lg bg-accent-light border border-accent/20 rounded-xl">
                <span className="text-Body-1 font-bold text-content">실지급액</span>
                <p className="text-[26px] font-bold text-accent">{formatKRW(modalStatement.earnings.reduce((s, e) => s + e.amount, 0) - modalStatement.deductions.reduce((s, e) => s + e.amount, 0))}</p>
              </div>
            </div>
            <div className="p-xl border-t border-line bg-surface-secondary/10 flex justify-end items-center">
              <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>닫기</Button>
            </div>
          </div>
        </div>
      )}

      {/* 발송 이력 패널 */}
      <Modal
        isOpen={historyTargetId != null}
        onClose={() => setHistoryTargetId(null)}
        title={`발송 이력 · ${historyTargetName}`}
        size="md"
        footer={<div className="flex justify-end"><Button variant="primary" size="sm" onClick={() => setHistoryTargetId(null)}>닫기</Button></div>}
      >
        {!historyTarget || historyTarget.history.length === 0 ? (
          <p className="text-Body-2 text-content-secondary py-md text-center">발송 이력이 없습니다.</p>
        ) : (
          <div className="space-y-sm">
            {historyTarget.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between py-sm border-b border-dashed border-line">
                <div className="flex items-center gap-sm">
                  <StatusBadge variant={h.action === "무효 처리" ? "error" : "default"} dot>{h.action}</StatusBadge>
                  <span className="text-[12px] text-content-secondary">{h.channel}</span>
                </div>
                <span className="text-[12px] text-content-secondary">{h.at}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 재발송 확인 */}
      <ConfirmDialog
        open={resendTargetId != null}
        title="명세서를 다시 발송하시겠습니까?"
        description={"이미 발송된 명세서입니다. 다시 발송하면 기존 발송 이력은 유지되고 새 발송 이력이 추가됩니다."}
        confirmLabel="재발송"
        cancelLabel="취소"
        onConfirm={async () => {
          if (resendTargetId != null) {
            const row = tableData.find(t => t.recId === resendTargetId);
            const ok = await doSend(resendTargetId);
            if (ok) toast.success(`${row?.name ?? ""} 명세서를 재발송했습니다.`);
          }
          setResendTargetId(null);
        }}
        onCancel={() => setResendTargetId(null)}
      />

      {/* 무효 확인 */}
      <ConfirmDialog
        open={voidTargetId != null}
        title="명세서를 무효 처리하시겠습니까?"
        description={"무효 처리하면 해당 명세서의 발송·재발송·PDF 저장·인쇄가 차단됩니다.\n이미 발송된 외부 이메일·앱 푸시 자체는 회수되지 않습니다."}
        confirmLabel="무효 처리"
        cancelLabel="취소"
        onConfirm={async () => {
          if (voidTargetId != null) {
            const ok = await handleVoid(voidTargetId);
            if (ok) toast.success("명세서가 무효 처리되었습니다.");
          }
          setVoidTargetId(null);
        }}
        onCancel={() => setVoidTargetId(null)}
      />
    </AppLayout>
  );
}
