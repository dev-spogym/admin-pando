'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Edit2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Plus,
  Trash2,
  Lock,
  TrendingUp,
  TrendingDown,
  Settings2,
  RotateCcw,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Select from '@/components/ui/Select';
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from "@/internal";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import { formatNumber } from "@/lib/format";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import SearchFilter from "@/components/common/SearchFilter";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuthStore } from "@/stores/authStore";
import { normalizeRole, isRoleAtLeast } from "@/lib/permissions";

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-064: 급여 관리 (/payroll)
 * - PAY-STF-02 요약 지표 카드 4종(전월 대비 증감 포함)
 * - 직원별 급여 테이블(급여 형태·수수료 컬럼 포함)
 * - DLG-064-001 급여 상세 편집(수당/공제 수동 항목)
 * - DLG-064-002 급여 확정 확인 + 확정 취소
 * - DLG-064-003 급여 정책 추가/수정 + 급여 정책 템플릿 패널
 * - 전월 이전 마감 월 잠금
 */

// 최근 12개월 생성
function getRecentMonths(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    months.push({ value, label });
  }
  return months;
}

// 급여 형태 라벨
const PAY_TYPE_LABELS: Record<string, string> = {
  fixed: "고정급제",
  hourly: "시급제",
  rate: "정률제",
  mixed: "혼합제",
};

const mapPayrollStatusFromDb = (status: string | null | undefined): "paid" | "pending" | "hold" => {
  if (status === "PAID" || status === "paid") return "paid";
  if (status === "HOLD" || status === "hold") return "hold";
  return "pending";
};

const mapPayrollStatusToDb = (status: "paid" | "pending" | "hold"): "PAID" | "PENDING" => {
  return status === "paid" ? "PAID" : "PENDING";
};

// 역할 기준 급여 형태 추정 (실데이터 컬럼 부재 → 목업 매핑)
const inferPayType = (role: string): string => {
  const r = (role ?? "").toLowerCase();
  if (r.includes("trainer") || r.includes("트레이너") || r.includes("강사")) return "mixed";
  if (r.includes("gx")) return "hourly";
  if (r.includes("fc")) return "rate";
  return "fixed";
};

interface PayrollRow {
  id: number;
  name: string;
  role: string;
  payType: string; // 급여 형태 (고정급제/시급제/정률제/혼합제)
  baseSalary: number;
  incentive: number; // 수당 합계
  deduction: number; // 공제 합계
  commission: number; // 수수료 (성과성 지급액)
  status: string;
  netPay: number;
  // 수동 편집 항목 (DLG-064-001 목업)
  manualEarnings?: { name: string; amount: number }[];
  manualDeductions?: { name: string; amount: number }[];
}

type SortKey = "name" | "baseSalary" | "incentive" | "deduction" | "commission" | "netPay";
type SortDir = "asc" | "desc" | null;

// ── 급여 정책 템플릿 (DLG-064-003 목업) ──────────────────────────────────────
type PolicyCategory = "sales" | "lesson"; // 매출 타입 / 수업 타입
type PolicyJob = "FC" | "PT" | "GX" | "공통";
type PayMethod = "정률제" | "고정급제" | "시급제" | "혼합제";

interface SalaryPolicy {
  id: number;
  category: PolicyCategory;
  job: PolicyJob;
  payMethod: PayMethod;
  rank: string; // 직급명
  baseSalary: number;
  lessonUnitPrice: number; // 수업단가
  lessonRate: number; // 수업료(%)
  salesCommission: number; // 매출커미션(%)
  reRegCommission: number; // 재등록 커미션(%)
  refundRule: string; // 환불 차감 규칙
  scope: string; // 적용 센터/팀 범위
}

const emptyPolicy = (): Omit<SalaryPolicy, "id"> => ({
  category: "lesson",
  job: "PT",
  payMethod: "혼합제",
  rank: "",
  baseSalary: 0,
  lessonUnitPrice: 0,
  lessonRate: 0,
  salesCommission: 0,
  reRegCommission: 0,
  refundRule: "",
  scope: "",
});

const mapPolicyRow = (row: Record<string, unknown>): SalaryPolicy => ({
  id: Number(row.id),
  category: row.category as PolicyCategory,
  job: row.job as PolicyJob,
  payMethod: row.payMethod as PayMethod,
  rank: String(row.rank ?? ""),
  baseSalary: Number(row.baseSalary ?? 0),
  lessonUnitPrice: Number(row.lessonUnitPrice ?? 0),
  lessonRate: Number(row.lessonRate ?? 0),
  salesCommission: Number(row.salesCommission ?? 0),
  reRegCommission: Number(row.reRegCommission ?? 0),
  refundRule: String(row.refundRule ?? ""),
  scope: String(row.scope ?? ""),
});

export default function Payroll() {
  const authUser = useAuthStore((s) => s.user);
  const userRole = normalizeRole(authUser?.role ?? '');
  // 급여 확정/확정 취소는 Owner(지점장) 이상만, 편집은 manager 이상
  const canConfirm = isRoleAtLeast(userRole, 'owner');
  const canEdit = isRoleAtLeast(userRole, 'manager');

  const MONTHS = useMemo(() => getRecentMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [payrollData, setPayrollData] = useState<PayrollRow[]>([]);
  const [prevMonthTotal, setPrevMonthTotal] = useState<number | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState({ status: "" });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 확정 확인 다이얼로그 (DLG-064-002)
  const [confirmTargetIds, setConfirmTargetIds] = useState<number[] | null>(null);
  // 확정 취소 확인
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

  // 전월 이전 마감 월 여부 (현재 월보다 이전이면 잠금)
  const currentMonthValue = MONTHS[0].value;
  const isLockedMonth = selectedMonth < currentMonthValue;

  // ── DLG-064-001 급여 상세 편집 상태 ────────────────────────────────────────
  const [editRow, setEditRow] = useState<PayrollRow | null>(null);
  const [editEarnings, setEditEarnings] = useState<{ name: string; amount: number }[]>([]);
  const [editDeductions, setEditDeductions] = useState<{ name: string; amount: number }[]>([]);
  const [editReason, setEditReason] = useState("");

  // ── DLG-064-003 급여 정책 템플릿 상태 ──────────────────────────────────────
  const [policies, setPolicies] = useState<SalaryPolicy[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(true);
  const [policyCategory, setPolicyCategory] = useState<PolicyCategory>("lesson");
  const [policyJob, setPolicyJob] = useState<PolicyJob>("PT");
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState<Omit<SalaryPolicy, "id">>(emptyPolicy());
  const [editingPolicyId, setEditingPolicyId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPayroll() {
      setIsLoadingData(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const { data, error } = await supabase
        .from("payroll")
        .select("id, staffId, staffName, year, month, baseSalary, bonus, deduction, netSalary, status, details, staff!inner(role, branchId)")
        .eq("staff.branchId", getBranchId())
        .eq("year", year)
        .eq("month", month);

      if (error) {
        console.error("급여 데이터 로드 실패:", error);
        toast.error("급여 데이터를 불러오지 못했습니다.");
      } else if (data) {
        const mapped: PayrollRow[] = data.map((r: any) => {
          const baseSalary = Number(r.baseSalary ?? 0);
          const bonus = Number(r.bonus ?? 0);
          const deduction = Number(r.deduction ?? 0);
          const commission = 0; // 수수료: 실데이터 컬럼 부재 → 0(목업)
          const details = (r.details ?? {}) as {
            manualEarnings?: { name: string; amount: number }[];
            manualDeductions?: { name: string; amount: number }[];
          };
          return {
            id: r.id,
            name: r.staffName,
            role: r.staff?.role ?? "",
            payType: inferPayType(r.staff?.role ?? ""),
            baseSalary,
            incentive: bonus,
            deduction,
            commission,
            status: mapPayrollStatusFromDb(r.status),
            netPay: r.netSalary != null ? Number(r.netSalary) : (baseSalary + bonus - deduction + commission),
            manualEarnings: Array.isArray(details.manualEarnings) ? details.manualEarnings : [],
            manualDeductions: Array.isArray(details.manualDeductions) ? details.manualDeductions : [],
          };
        });
        setPayrollData(mapped);
      }
      setIsLoadingData(false);
    }
    fetchPayroll();
  }, [selectedMonth]);

  // 전월 전체 지급액 (증감 카드용)
  useEffect(() => {
    async function fetchPrev() {
      const [y, m] = selectedMonth.split("-").map(Number);
      const prev = new Date(y, m - 2, 1); // m-1=현재월 0-index, 한 달 더 빼면 전월
      const py = prev.getFullYear();
      const pm = prev.getMonth() + 1;
      const { data, error } = await supabase
        .from("payroll")
        .select("netSalary, baseSalary, bonus, deduction, staff!inner(branchId)")
        .eq("staff.branchId", getBranchId())
        .eq("year", py)
        .eq("month", pm);
      if (error || !data || data.length === 0) { setPrevMonthTotal(null); return; }
      const total = data.reduce((acc: number, r: any) => {
        const net = r.netSalary != null ? Number(r.netSalary) : (Number(r.baseSalary ?? 0) + Number(r.bonus ?? 0) - Number(r.deduction ?? 0));
        return acc + net;
      }, 0);
      setPrevMonthTotal(total);
    }
    fetchPrev();
  }, [selectedMonth]);

  useEffect(() => {
    async function fetchPolicies() {
      setIsLoadingPolicies(true);
      const { data, error } = await supabase
        .from("salary_policies")
        .select("*")
        .eq("branchId", getBranchId())
        .eq("isActive", true)
        .order("category", { ascending: true })
        .order("job", { ascending: true })
        .order("rank", { ascending: true });

      if (error) {
        console.error("급여 정책 로드 실패:", error);
        toast.error("급여 정책을 불러오지 못했습니다.");
      } else {
        const mapped = (data ?? []).map((row) => mapPolicyRow(row as Record<string, unknown>));
        setPolicies(mapped);
        setSelectedPolicyId((current) => current ?? mapped[0]?.id ?? null);
      }
      setIsLoadingPolicies(false);
    }

    fetchPolicies();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortDir(null); setSortKey(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className="text-content-secondary opacity-50" />;
    if (sortDir === "asc") return <ChevronUp size={12} className="text-primary" />;
    return <ChevronDown size={12} className="text-primary" />;
  };

  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <Button variant="ghost" size="sm" className="flex items-center gap-[3px]" onClick={() => handleSort(col)}>
      {label}<SortIcon col={col} />
    </Button>
  );

  const filtered = useMemo(() => {
    let data = payrollData.filter(r => {
      const matchSearch = !searchValue || r.name.includes(searchValue) || r.role.includes(searchValue);
      const matchStatus = !filterValues.status || r.status === filterValues.status;
      return matchSearch && matchStatus;
    });

    if (sortKey && sortDir) {
      data = [...data].sort((a, b) => {
        const aVal = sortKey === "name" ? a[sortKey] : (a[sortKey] as number);
        const bVal = sortKey === "name" ? b[sortKey] : (b[sortKey] as number);
        if (typeof aVal === "string") {
          const cmp = aVal.localeCompare(bVal as string, "ko");
          return sortDir === "asc" ? cmp : -cmp;
        }
        return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      });
    }
    return data;
  }, [payrollData, searchValue, filterValues, sortKey, sortDir]);

  // 합계 행 계산
  const totals = useMemo(() => filtered.reduce(
    (acc, r) => ({
      baseSalary: acc.baseSalary + r.baseSalary,
      incentive:  acc.incentive  + r.incentive,
      deduction:  acc.deduction  + r.deduction,
      commission: acc.commission + r.commission,
      netPay:     acc.netPay     + r.netPay,
    }),
    { baseSalary: 0, incentive: 0, deduction: 0, commission: 0, netPay: 0 }
  ), [filtered]);

  // 전체 지급 예정 금액 (필터 무관, 전체 기준)
  const totalNetAll = useMemo(() => payrollData.reduce((s, r) => s + r.netPay, 0), [payrollData]);
  // 전월 대비 증감률
  const changeRate = useMemo(() => {
    if (prevMonthTotal == null || prevMonthTotal === 0) return null;
    return ((totalNetAll - prevMonthTotal) / prevMonthTotal) * 100;
  }, [totalNetAll, prevMonthTotal]);
  const isBigChange = changeRate != null && Math.abs(changeRate) >= 50;

  const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    paid:    { label: "확정",   variant: "success" },
    pending: { label: "미확정", variant: "warning" },
    hold:    { label: "보류",   variant: "default" },
  };

  // ── 급여 행 액션 ───────────────────────────────────────────────────────────
  const openEditDialog = (row: PayrollRow) => {
    if (isLockedMonth) { toast.warning("마감된 급여월은 조회만 가능합니다."); return; }
    if (row.status === "paid") { toast.warning("확정된 급여는 확정 취소 후 편집할 수 있습니다."); return; }
    setEditRow(row);
    setEditEarnings(row.manualEarnings ? [...row.manualEarnings] : []);
    setEditDeductions(row.manualDeductions ? [...row.manualDeductions] : []);
    setEditReason("");
  };

  const editPreviewNet = useMemo(() => {
    if (!editRow) return 0;
    const auto = editRow.baseSalary + editRow.incentive - editRow.deduction + editRow.commission;
    const addE = editEarnings.reduce((s, e) => s + (e.amount || 0), 0);
    const addD = editDeductions.reduce((s, e) => s + (e.amount || 0), 0);
    return auto + addE - addD;
  }, [editRow, editEarnings, editDeductions]);

  const handleEditSave = async () => {
    if (!editRow) return;
    if (!editReason.trim()) { toast.error("변경 사유는 필수입니다."); return; }
    if (editEarnings.some(e => e.amount < 0) || editDeductions.some(e => e.amount < 0)) {
      toast.error("금액은 0 이상만 입력할 수 있습니다."); return;
    }
    const addE = editEarnings.reduce((s, e) => s + (e.amount || 0), 0);
    const addD = editDeductions.reduce((s, e) => s + (e.amount || 0), 0);
    const prevE = (editRow.manualEarnings ?? []).reduce((s, e) => s + (e.amount || 0), 0);
    const prevD = (editRow.manualDeductions ?? []).reduce((s, e) => s + (e.amount || 0), 0);
    const nextIncentive = editRow.incentive - prevE + addE;
    const nextDeduction = editRow.deduction - prevD + addD;
    const nextNetPay = editRow.baseSalary + nextIncentive - nextDeduction + editRow.commission;
    const details = {
      manualEarnings: editEarnings,
      manualDeductions: editDeductions,
      lastEditReason: editReason,
      lastEditedAt: new Date().toISOString(),
      lastEditedBy: authUser?.name ?? "관리자",
    };
    const { error } = await supabase
      .from("payroll")
      .update({
        bonus: nextIncentive,
        deduction: nextDeduction,
        netSalary: nextNetPay,
        details,
      })
      .eq("id", editRow.id);

    if (error) {
      toast.error("급여 항목 저장에 실패했습니다.");
      return;
    }

    setPayrollData(prev => prev.map(r => r.id === editRow.id ? {
      ...r,
      incentive: nextIncentive,
      deduction: nextDeduction,
      netPay: nextNetPay,
      manualEarnings: [...editEarnings],
      manualDeductions: [...editDeductions],
    } : r));
    toast.success("급여 항목이 저장되었습니다. (미확정 유지)");
    setEditRow(null);
  };

  const requestCancelConfirm = (id: number) => {
    if (isLockedMonth) { toast.warning("마감된 급여월은 조회만 가능합니다."); return; }
    setCancelTargetId(id);
  };

  const columns = [
    {
      key: "name",
      header: <SortHeader col="name" label="직원명" />,
      render: (val: string) => (
        <Button variant="ghost" size="sm" onClick={() => moveToPage(989)}>{val}</Button>
      )
    },
    { key: "role", header: "역할", width: 90 },
    {
      key: "payType",
      header: "급여 형태",
      width: 100,
      align: "center" as const,
      render: (val: string) => (
        <span className="inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold bg-surface-secondary text-content-secondary">
          {PAY_TYPE_LABELS[val] ?? "고정급제"}
        </span>
      )
    },
    {
      key: "baseSalary",
      header: <SortHeader col="baseSalary" label="기본급" />,
      align: "right" as const,
      render: (val: number) => <span>{formatNumber(val)}원</span>
    },
    {
      key: "incentive",
      header: <SortHeader col="incentive" label="수당 합계" />,
      align: "right" as const,
      render: (val: number) => <span className="text-state-success">+{formatNumber(val)}원</span>
    },
    {
      key: "deduction",
      header: <SortHeader col="deduction" label="공제 합계" />,
      align: "right" as const,
      render: (val: number) => <span className="text-error">-{formatNumber(val)}원</span>
    },
    {
      key: "commission",
      header: <SortHeader col="commission" label="수수료" />,
      align: "right" as const,
      render: (val: number) => <span className="text-primary">+{formatNumber(val)}원</span>
    },
    {
      key: "netPay",
      header: <SortHeader col="netPay" label="실지급액" />,
      align: "right" as const,
      render: (val: number) => <span className="font-bold text-primary">{formatNumber(val)}원</span>
    },
    {
      key: "status",
      header: "확정 상태",
      width: 100,
      align: "center" as const,
      render: (val: string) => {
        const cfg = statusConfig[val] ?? { label: val, variant: "default" as const };
        return <StatusBadge variant={cfg.variant} dot={true}>{cfg.label}</StatusBadge>;
      }
    },
    {
      key: "id",
      header: "액션",
      width: 150,
      align: "center" as const,
      render: (_: number, row: PayrollRow) => (
        <div className="flex items-center gap-xs justify-center">
          {row.status !== "paid" ? (
            <>
              {canEdit && (
                <Button variant="outline" size="sm" icon={<Edit2 size={12} />} disabled={isLockedMonth} onClick={() => openEditDialog(row)}>편집</Button>
              )}
              {canConfirm && (
                <Button variant="primary" size="sm" icon={<CheckCircle2 size={12} />} disabled={isLockedMonth} onClick={() => setConfirmTargetIds([row.id])}>확정</Button>
              )}
            </>
          ) : (
            canConfirm && (
              <Button variant="outline" size="sm" icon={<RotateCcw size={12} />} disabled={isLockedMonth} onClick={() => requestCancelConfirm(row.id)}>확정 취소</Button>
            )
          )}
        </div>
      )
    }
  ];

  // 통계 카드 데이터
  const paidCount    = filtered.filter(r => r.status === "paid").length;
  const pendingCount = filtered.filter(r => r.status === "pending").length;

  // 정책 패널: 선택된 분류/직군 필터
  const filteredPolicies = useMemo(
    () => policies.filter(p => p.category === policyCategory && (policyJob === "공통" ? true : p.job === policyJob || p.job === "공통")),
    [policies, policyCategory, policyJob]
  );
  const selectedPolicy = policies.find(p => p.id === selectedPolicyId) ?? filteredPolicies[0] ?? null;

  const openPolicyDialog = (policy?: SalaryPolicy) => {
    if (policy) {
      setEditingPolicyId(policy.id);
      const { id: _id, ...rest } = policy;
      setPolicyForm(rest);
    } else {
      setEditingPolicyId(null);
      setPolicyForm({ ...emptyPolicy(), category: policyCategory, job: policyJob });
    }
    setPolicyDialogOpen(true);
  };

  const handlePolicySave = async () => {
    if (!policyForm.rank.trim()) { toast.error("직급명을 입력해주세요."); return; }
    const payload = {
      branchId: getBranchId(),
      category: policyForm.category,
      job: policyForm.job,
      payMethod: policyForm.payMethod,
      rank: policyForm.rank.trim(),
      baseSalary: policyForm.baseSalary,
      lessonUnitPrice: policyForm.lessonUnitPrice,
      lessonRate: policyForm.lessonRate,
      salesCommission: policyForm.salesCommission,
      reRegCommission: policyForm.reRegCommission,
      refundRule: policyForm.refundRule || null,
      scope: policyForm.scope || null,
      updatedAt: new Date().toISOString(),
    };

    if (editingPolicyId != null) {
      const { data, error } = await supabase
        .from("salary_policies")
        .update(payload)
        .eq("id", editingPolicyId)
        .select("*")
        .single();

      if (error) { toast.error("급여 정책 수정에 실패했습니다."); return; }
      const saved = mapPolicyRow(data as Record<string, unknown>);
      setPolicies(prev => prev.map(p => p.id === editingPolicyId ? saved : p));
      setSelectedPolicyId(saved.id);
      toast.success("급여 정책이 수정되었습니다.");
    } else {
      const { data, error } = await supabase
        .from("salary_policies")
        .insert(payload)
        .select("*")
        .single();

      if (error) { toast.error("급여 정책 추가에 실패했습니다."); return; }
      const saved = mapPolicyRow(data as Record<string, unknown>);
      setPolicies(prev => [...prev, saved]);
      setSelectedPolicyId(saved.id);
      toast.success("급여 정책이 추가되었습니다.");
    }
    setPolicyDialogOpen(false);
  };

  const handlePolicyDelete = async (id: number) => {
    const { error } = await supabase
      .from("salary_policies")
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq("id", id);

    if (error) { toast.error("급여 정책 삭제에 실패했습니다."); return; }
    setPolicies(prev => prev.filter(p => p.id !== id));
    if (selectedPolicyId === id) setSelectedPolicyId(null);
    toast.success("급여 정책이 삭제되었습니다.");
  };

  const exportColumns = [
    { key: 'name', header: '직원명' },
    { key: 'role', header: '역할' },
    { key: 'payType', header: '급여 형태' },
    { key: 'baseSalary', header: '기본급' },
    { key: 'incentive', header: '수당 합계' },
    { key: 'deduction', header: '공제 합계' },
    { key: 'commission', header: '수수료' },
    { key: 'netPay', header: '실지급액' },
    { key: 'status', header: '확정 상태' },
  ];
  const doExport = () => {
    const statusLabel: Record<string, string> = { paid: '확정', pending: '미확정', hold: '보류' };
    const exportData = filtered.map(r => ({ ...r, payType: PAY_TYPE_LABELS[r.payType] ?? r.payType, status: statusLabel[r.status] ?? r.status }));
    exportToExcel(exportData as unknown as Record<string, unknown>[], exportColumns, { filename: `급여_${selectedMonth}` });
    toast.success("엑셀 다운로드가 완료되었습니다.");
  };

  return (
    <AppLayout>
      <div className="space-y-xl">
        <PageHeader
          title="급여 관리"
          description="직원별 기본급, 수당, 공제, 수수료를 검토하고 급여를 확정합니다."
          actions={
            <div className="flex items-center gap-sm">
              <Select
                options={MONTHS.map(m => ({ value: m.value, label: m.value === currentMonthValue ? m.label : `${m.label} (마감)` }))}
                value={selectedMonth}
                onChange={v => setSelectedMonth(v)}
              />
              {canConfirm && (
                <Button
                  variant="primary"
                  icon={<CheckCircle2 size={16} />}
                  disabled={isLockedMonth}
                  onClick={() => {
                    const ids = payrollData.filter(r => r.status !== "paid").map(r => r.id);
                    if (ids.length === 0) { toast.info("확정할 미확정 급여가 없습니다."); return; }
                    setConfirmTargetIds(ids);
                  }}
                >
                  급여 일괄 확정
                </Button>
              )}
              <Button variant="outline" icon={<Download size={16} />} onClick={doExport}>
                내보내기
              </Button>
            </div>
          }
        />

        {/* 전월 이전 마감 월 배너 */}
        {isLockedMonth && (
          <div className="flex items-center gap-sm bg-surface-secondary border border-line rounded-xl px-lg py-md">
            <Lock size={16} className="text-content-secondary" />
            <span className="text-Body-2 font-semibold text-content">마감된 급여월</span>
            <span className="text-Body-2 text-content-secondary">마감된 급여월은 조회만 가능합니다. 편집·확정·확정취소·자동 재계산이 비활성화됩니다.</span>
          </div>
        )}

        {/* PAY-STF-02-02 요약 카드 4종 */}
        <StatCardGrid cols={4}>
          <StatCard label="전체 지급 예정 금액" value={`${formatNumber(totalNetAll)}원`} icon={<DollarSign />} variant="mint" description={`${selectedMonth.replace("-", "년 ")}월`} />
          <StatCard label="확정 완료 인원" value={`${paidCount}명`} icon={<CheckCircle2 />} variant="mint" />
          <StatCard label="미확정 인원" value={`${pendingCount}명`} icon={<Clock />} variant="peach" />
          <StatCard
            label="이전 월 대비 증감"
            value={changeRate == null ? "-" : `${changeRate >= 0 ? "+" : ""}${changeRate.toFixed(1)}%`}
            icon={changeRate != null && changeRate < 0 ? <TrendingDown /> : <TrendingUp />}
            variant={isBigChange ? "peach" : "default"}
            description={isBigChange ? "급여 증감 확인 필요" : undefined}
          />
        </StatCardGrid>

        {/* 검색 & 필터 */}
        <SearchFilter
          searchPlaceholder="직원명, 역할 검색"
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              key: "status",
              label: "확정 상태",
              type: "select",
              options: [
                { value: "paid",    label: "확정" },
                { value: "pending", label: "미확정" },
                { value: "hold",    label: "보류" },
              ]
            }
          ]}
          filterValues={filterValues}
          onFilterChange={(key, val) => { setFilterValues(prev => ({ ...prev, [key]: val })); setCurrentPage(1); }}
          onReset={() => { setSearchValue(""); setFilterValues({ status: "" }); setCurrentPage(1); }}
        />

        {/* 본문: 급여 테이블 + 정책 템플릿 패널 */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-xl items-start">
          {/* 직원별 급여 테이블 */}
          <div className="space-y-xl min-w-0">
            <DataTable
              columns={columns}
              data={filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
              selectable={true}
              pagination={{ page: currentPage, pageSize: PAGE_SIZE, total: filtered.length }}
              onPageChange={(p) => setCurrentPage(p)}
              onDownloadExcel={doExport}
              emptyMessage={isLoadingData ? "데이터를 불러오는 중..." : "재직 직원이 없습니다."}
            />

            {/* 합계 행 */}
            {filtered.length > 0 && (
              <div className="bg-surface border border-line rounded-xl p-lg">
                <div className="flex items-center justify-between flex-wrap gap-lg">
                  <span className="text-Body-1 font-bold text-content">
                    합계 / 평균 ({filtered.length}명)
                  </span>
                  <div className="flex items-center gap-xl flex-wrap">
                    <div className="text-right">
                      <p className="text-[11px] text-content-secondary mb-[2px]">기본급 합계</p>
                      <p className="text-Body-2 font-bold text-content">{formatNumber(totals.baseSalary)}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-content-secondary mb-[2px]">수당 합계</p>
                      <p className="text-Body-2 font-bold text-state-success">{formatNumber(totals.incentive)}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-content-secondary mb-[2px]">공제 합계</p>
                      <p className="text-Body-2 font-bold text-error">{formatNumber(totals.deduction)}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-content-secondary mb-[2px]">수수료 합계</p>
                      <p className="text-Body-2 font-bold text-primary">{formatNumber(totals.commission)}원</p>
                    </div>
                    <div className="text-right border-l border-line pl-xl">
                      <p className="text-[11px] text-content-secondary mb-[2px]">실지급액 합계</p>
                      <p className="text-Heading-2 font-bold text-primary">{formatNumber(totals.netPay)}원</p>
                    </div>
                  </div>
                </div>
                <div className="mt-sm pt-sm border-t border-line">
                  <p className="text-[11px] text-content-secondary">
                    <span className="font-semibold text-accent">계산식</span>: 실지급액 = 기본급 + 수당 합계 - 공제 합계 + 수수료
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 급여 정책 템플릿 패널 (DLG-064-003 연결) */}
          <div className="bg-surface border border-line rounded-xl p-lg space-y-md shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="text-Body-1 font-bold text-content flex items-center gap-xs">
                <Settings2 size={16} className="text-primary" /> 급여 정책 템플릿
              </h3>
              <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={() => openPolicyDialog()}>정책 추가</Button>
            </div>

            {/* 정책 분류 탭 (매출/수업) */}
            <div className="flex items-center gap-xs">
              {([["sales", "매출 타입"], ["lesson", "수업 타입"]] as [PolicyCategory, string][]).map(([cat, label]) => (
                <button
                  key={cat}
                  onClick={() => setPolicyCategory(cat)}
                  className={cn(
                    "flex-1 px-sm py-xs rounded-button text-[12px] font-semibold border transition-all",
                    policyCategory === cat ? "bg-primary text-white border-primary" : "bg-surface text-content-secondary border-line hover:border-primary"
                  )}
                >{label}</button>
              ))}
            </div>

            {/* 직군별 산식 탭 (FC/PT/GX/공통) */}
            <div className="flex items-center gap-xs">
              {(["FC", "PT", "GX", "공통"] as PolicyJob[]).map(job => (
                <button
                  key={job}
                  onClick={() => setPolicyJob(job)}
                  className={cn(
                    "flex-1 px-xs py-[5px] rounded-button text-[11px] font-semibold border transition-all",
                    policyJob === job ? "bg-accent text-white border-accent" : "bg-surface text-content-secondary border-line hover:border-accent"
                  )}
                >{job}</button>
              ))}
            </div>

            {/* 정책 목록 */}
            <div className="space-y-xs max-h-[220px] overflow-y-auto">
              {isLoadingPolicies ? (
                <p className="text-Label text-content-secondary py-md text-center">급여 정책을 불러오는 중...</p>
              ) : filteredPolicies.length === 0 ? (
                <p className="text-Label text-content-secondary py-md text-center">해당 분류의 정책이 없습니다.</p>
              ) : filteredPolicies.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPolicyId(p.id)}
                  className={cn(
                    "w-full text-left px-md py-sm rounded-input border transition-all",
                    selectedPolicyId === p.id ? "border-primary bg-primary-light" : "border-line bg-surface hover:bg-surface-secondary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-Body-2 font-semibold text-content">{p.rank}</span>
                    <span className="text-[11px] text-content-secondary">{p.job} · {p.payMethod}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* 정책 요약 필드 */}
            {selectedPolicy && (
              <div className="border-t border-line pt-md space-y-xs text-[12px]">
                {([
                  ["직급", selectedPolicy.rank],
                  ["직군", selectedPolicy.job],
                  ["지급 방식", selectedPolicy.payMethod],
                  ["기본급", `${formatNumber(selectedPolicy.baseSalary)}원`],
                  ["수업단가", `${formatNumber(selectedPolicy.lessonUnitPrice)}원`],
                  ["수업료(%)", `${selectedPolicy.lessonRate}%`],
                  ["매출커미션(%)", `${selectedPolicy.salesCommission}%`],
                  ["재등록 커미션(%)", `${selectedPolicy.reRegCommission}%`],
                  ["환불 차감 규칙", selectedPolicy.refundRule || "-"],
                  ["적용 범위", selectedPolicy.scope || "-"],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-md">
                    <span className="text-content-secondary whitespace-nowrap">{k}</span>
                    <span className="text-content font-medium text-right">{v}</span>
                  </div>
                ))}
                <div className="flex items-center gap-xs pt-sm">
                  <Button variant="outline" size="sm" fullWidth icon={<Edit2 size={12} />} onClick={() => openPolicyDialog(selectedPolicy)}>수정</Button>
                  <Button variant="outline" size="sm" fullWidth icon={<Trash2 size={12} />} onClick={() => handlePolicyDelete(selectedPolicy.id)}>삭제</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 급여 명세서 바로가기 */}
        <div className="flex items-center justify-between bg-surface-secondary/40 border border-line rounded-xl p-lg">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-Body-1 font-bold text-content">급여 명세서 발급</p>
              <p className="text-Body-2 text-content-secondary">확정된 급여를 명세서로 조회하고 발송할 수 있습니다.</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => moveToPage(989)}>명세서 바로가기</Button>
        </div>
      </div>

      {/* DLG-064-001 급여 상세 편집 */}
      <Modal
        isOpen={editRow != null}
        onClose={() => setEditRow(null)}
        title="급여 상세 편집"
        size="xl"
        footer={
          <div className="flex items-center justify-between">
            <span className="text-Body-2 text-content-secondary">
              실지급액 미리보기: <span className="font-bold text-primary">{formatNumber(editPreviewNet)}원</span>
            </span>
            <div className="flex items-center gap-sm">
              <Button variant="ghost" size="sm" onClick={() => setEditRow(null)}>취소</Button>
              <Button variant="primary" size="sm" onClick={handleEditSave}>저장</Button>
            </div>
          </div>
        }
      >
        {editRow && (
          <div className="space-y-lg">
            {/* 직원 정보 + 자동 계산 요약 (read-only) */}
            <div className="grid grid-cols-2 gap-md text-[12px]">
              <div className="bg-surface-secondary rounded-input p-md space-y-xs">
                <p className="text-content-secondary">직원 정보</p>
                <p className="text-content font-semibold">{editRow.name} · {editRow.role} · {PAY_TYPE_LABELS[editRow.payType] ?? editRow.payType}</p>
                <p className="text-content-secondary">지급월 {selectedMonth} · {statusConfig[editRow.status]?.label ?? editRow.status}</p>
              </div>
              <div className="bg-surface-secondary rounded-input p-md space-y-xs">
                <p className="text-content-secondary">자동 계산 (read-only)</p>
                <p className="text-content">기본급 {formatNumber(editRow.baseSalary)}원 · 수수료 {formatNumber(editRow.commission)}원</p>
                <p className="text-content">자동 수당 {formatNumber(editRow.incentive)}원 · 자동 공제 {formatNumber(editRow.deduction)}원</p>
              </div>
            </div>

            {/* 수당 항목 */}
            <EditItemList
              title="수동 수당 항목"
              accent="text-state-success"
              items={editEarnings}
              presets={["식대", "교통비", "특별 수당", "성과 수당", "기타 수당"]}
              onChange={setEditEarnings}
            />
            {/* 공제 항목 */}
            <EditItemList
              title="수동 공제 항목"
              accent="text-error"
              items={editDeductions}
              presets={["지각·결근 공제", "4대 보험 안내 항목", "선지급·가불 차감", "기타 공제"]}
              onChange={setEditDeductions}
            />

            {/* 변경 사유 */}
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">변경 사유 <span className="text-error">*</span></label>
              <Textarea value={editReason} onChange={e => setEditReason(e.target.value)} rows={2} placeholder="수당·공제 변경 사유를 입력하세요" />
            </div>
            <p className="text-[11px] text-content-secondary">자동 계산된 기본급/자동 수당/자동 공제/수수료는 직접 덮어쓰지 않습니다. 보정이 필요하면 수동 항목으로 추가합니다.</p>
          </div>
        )}
      </Modal>

      {/* DLG-064-003 급여 정책 추가/수정 */}
      <Modal
        isOpen={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        title={editingPolicyId != null ? "급여 정책 수정" : "급여 정책 추가"}
        size="xl"
        footer={
          <div className="flex items-center justify-end gap-sm">
            <Button variant="ghost" size="sm" onClick={() => setPolicyDialogOpen(false)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handlePolicySave}>저장</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">정책 분류</label>
              <Select options={[{ value: "sales", label: "매출 타입" }, { value: "lesson", label: "수업 타입" }]} value={policyForm.category} onChange={v => setPolicyForm(p => ({ ...p, category: v as PolicyCategory }))} />
            </div>
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">적용 직군</label>
              <Select options={["FC", "PT", "GX", "공통"].map(j => ({ value: j, label: j }))} value={policyForm.job} onChange={v => setPolicyForm(p => ({ ...p, job: v as PolicyJob }))} />
            </div>
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">지급 방식</label>
              <Select options={["정률제", "고정급제", "시급제", "혼합제"].map(m => ({ value: m, label: m }))} value={policyForm.payMethod} onChange={v => setPolicyForm(p => ({ ...p, payMethod: v as PayMethod }))} />
            </div>
            <Input label="직급" value={policyForm.rank} onChange={e => setPolicyForm(p => ({ ...p, rank: e.target.value }))} placeholder="예: 트레이너" />
            <Input label="기본급(원)" type="number" min={0} value={policyForm.baseSalary} onChange={e => setPolicyForm(p => ({ ...p, baseSalary: Number(e.target.value) }))} />
            <Input label="수업단가(원)" type="number" min={0} value={policyForm.lessonUnitPrice} onChange={e => setPolicyForm(p => ({ ...p, lessonUnitPrice: Number(e.target.value) }))} />
            <Input label="수업료(%)" type="number" min={0} value={policyForm.lessonRate} onChange={e => setPolicyForm(p => ({ ...p, lessonRate: Number(e.target.value) }))} />
            <Input label="매출커미션(%)" type="number" min={0} value={policyForm.salesCommission} onChange={e => setPolicyForm(p => ({ ...p, salesCommission: Number(e.target.value) }))} />
            <Input label="재등록 커미션(%)" type="number" min={0} value={policyForm.reRegCommission} onChange={e => setPolicyForm(p => ({ ...p, reRegCommission: Number(e.target.value) }))} />
            <Input label="적용 범위" value={policyForm.scope} onChange={e => setPolicyForm(p => ({ ...p, scope: e.target.value }))} placeholder="예: 본점 / PT팀" />
          </div>
          <div className="space-y-xs">
            <label className="text-Label font-semibold text-content-secondary">환불 차감 규칙</label>
            <Textarea value={policyForm.refundRule} onChange={e => setPolicyForm(p => ({ ...p, refundRule: e.target.value }))} rows={2} placeholder="환불 확정 건 발생 시 이전 지급분 차감 여부와 비율" />
          </div>
          {/* 미리보기 */}
          <div className="bg-surface-secondary rounded-input p-md text-[12px] text-content-secondary">
            예상 정산 미리보기: 기본급 {formatNumber(policyForm.baseSalary)}원 + (수업 10건 × {formatNumber(policyForm.lessonUnitPrice)}원) ={" "}
            <span className="font-bold text-primary">{formatNumber(policyForm.baseSalary + policyForm.lessonUnitPrice * 10)}원</span>
          </div>
        </div>
      </Modal>

      {/* DLG-064-002 급여 확정 확인 */}
      <ConfirmDialog
        open={confirmTargetIds != null}
        title="급여를 확정하시겠습니까?"
        description={`확정된 급여는 급여 명세서로 생성되며, 직원에게 발송할 수 있습니다.\n${confirmTargetIds?.length ?? 0}명의 급여를 확정하시겠습니까?`}
        confirmLabel="확정"
        cancelLabel="취소"
        onConfirm={async () => {
          const ids = confirmTargetIds ?? [];
          if (ids.length === 0) { setConfirmTargetIds(null); return; }
          const { error } = await supabase
            .from("payroll")
            .update({ status: mapPayrollStatusToDb("paid"), paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
            .in("id", ids);
          if (error) { toast.error("급여 확정에 실패했습니다."); return; }
          toast.success(`${ids.length}명의 급여가 확정되었습니다.`);
          setPayrollData(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: "paid" } : r));
          setConfirmTargetIds(null);
        }}
        onCancel={() => setConfirmTargetIds(null)}
      />

      {/* 확정 취소 확인 */}
      <ConfirmDialog
        open={cancelTargetId != null}
        title="급여 확정을 취소하시겠습니까?"
        description={"확정을 취소하면 해당 직원·지급월의 기존 급여 명세서가 무효 처리됩니다.\n재확정 후 새 명세서가 별도 생성됩니다."}
        confirmLabel="확정 취소"
        cancelLabel="닫기"
        onConfirm={async () => {
          const id = cancelTargetId;
          if (id == null) return;
          const { error } = await supabase
            .from("payroll")
            .update({ status: mapPayrollStatusToDb("pending"), paidAt: null, updatedAt: new Date().toISOString() })
            .eq("id", id);
          if (error) { toast.error("확정 취소에 실패했습니다."); return; }
          toast.success("급여 확정이 취소되었습니다. 기존 명세서는 무효 처리됩니다.");
          setPayrollData(prev => prev.map(r => r.id === id ? { ...r, status: "pending" } : r));
          setCancelTargetId(null);
        }}
        onCancel={() => setCancelTargetId(null)}
      />
    </AppLayout>
  );
}

// ── 수당/공제 항목 편집 리스트 (DLG-064-001 내부) ─────────────────────────────
function EditItemList({
  title, accent, items, presets, onChange,
}: {
  title: string;
  accent: string;
  items: { name: string; amount: number }[];
  presets: string[];
  onChange: (items: { name: string; amount: number }[]) => void;
}) {
  return (
    <div className="space-y-sm">
      <div className="flex items-center justify-between">
        <h4 className={cn("text-Body-2 font-bold", accent)}>{title}</h4>
        <Button variant="ghost" size="sm" icon={<Plus size={12} />} onClick={() => onChange([...items, { name: presets[0] ?? "", amount: 0 }])}>항목 추가</Button>
      </div>
      {items.length === 0 ? (
        <p className="text-Label text-content-secondary">추가된 항목이 없습니다.</p>
      ) : items.map((item, i) => (
        <div key={i} className="flex items-center gap-sm">
          <div className="flex-1">
            <Select
              options={presets.map(p => ({ value: p, label: p }))}
              value={presets.includes(item.name) ? item.name : presets[0]}
              onChange={v => onChange(items.map((it, idx) => idx === i ? { ...it, name: v } : it))}
            />
          </div>
          <div className="w-[140px]">
            <Input type="number" min={0} value={item.amount} onChange={e => onChange(items.map((it, idx) => idx === i ? { ...it, amount: Number(e.target.value) } : it))} />
          </div>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => onChange(items.filter((_, idx) => idx !== i))} />
        </div>
      ))}
    </div>
  );
}
