import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
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
  DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-062: 급여 관리 페이지 (UI-098 ~ UI-100)
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

interface PayrollRow {
  id: number;
  name: string;
  role: string;
  baseSalary: number;
  incentive: number;
  deduction: number;
  status: string;
  netPay: number;
}

type SortKey = "name" | "baseSalary" | "incentive" | "deduction" | "netPay";
type SortDir = "asc" | "desc" | null;

export default function Payroll() {
  const MONTHS = useMemo(() => getRecentMonths(), []);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [payrollData, setPayrollData] = useState<PayrollRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState({ status: "" });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  useEffect(() => {
    async function fetchPayroll() {
      setIsLoadingData(true);
      const [year, month] = selectedMonth.split("-").map(Number);
      const { data, error } = await supabase
        .from("payroll")
        .select("id, staffId, staffName, year, month, baseSalary, bonus, deduction, netSalary, status, staff(role)")
        .eq("branchId", getBranchId())
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
          return {
            id: r.id,
            name: r.staffName,
            role: r.staff?.role ?? "",
            baseSalary,
            incentive: bonus,
            deduction,
            status: r.status ?? "pending",
            netPay: r.netSalary != null ? Number(r.netSalary) : (baseSalary + bonus - deduction),
          };
        });
        setPayrollData(mapped);
      }
      setIsLoadingData(false);
    }
    fetchPayroll();
  }, [selectedMonth]);

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
    <button className="flex items-center gap-[3px] hover:text-primary transition-colors" onClick={() => handleSort(col)}>
      {label}<SortIcon col={col} />
    </button>
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
      netPay:     acc.netPay     + r.netPay,
    }),
    { baseSalary: 0, incentive: 0, deduction: 0, netPay: 0 }
  ), [filtered]);

  const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    paid:    { label: "지급완료", variant: "success" },
    pending: { label: "미지급",   variant: "warning" },
    hold:    { label: "보류",     variant: "default" },
  };

  const columns = [
    {
      key: "name",
      header: <SortHeader col="name" label="직원명" />,
      render: (val: string) => (
        <button className="text-primary font-semibold hover:underline" onClick={() => moveToPage(989)}>
          {val}
        </button>
      )
    },
    { key: "role", header: "역할", width: 100 },
    {
      key: "baseSalary",
      header: <SortHeader col="baseSalary" label="기본급" />,
      align: "right" as const,
      render: (val: number) => <span>{val.toLocaleString()}원</span>
    },
    {
      key: "incentive",
      header: <SortHeader col="incentive" label="인센티브" />,
      align: "right" as const,
      render: (val: number) => <span className="text-state-success">+{val.toLocaleString()}원</span>
    },
    {
      key: "deduction",
      header: <SortHeader col="deduction" label="공제" />,
      align: "right" as const,
      render: (val: number) => <span className="text-error">-{val.toLocaleString()}원</span>
    },
    {
      key: "netPay",
      header: <SortHeader col="netPay" label="실지급액" />,
      align: "right" as const,
      render: (val: number) => <span className="font-bold text-primary">{val.toLocaleString()}원</span>
    },
    {
      key: "status",
      header: "지급상태",
      width: 110,
      align: "center" as const,
      render: (val: string) => {
        const cfg = statusConfig[val] ?? { label: val, variant: "default" as const };
        return <StatusBadge variant={cfg.variant} dot={true}>{cfg.label}</StatusBadge>;
      }
    },
    {
      key: "id",
      header: "관리",
      width: 80,
      align: "center" as const,
      render: (_: number, row: PayrollRow) =>
        row.status !== "paid" ? (
          <button
            className="flex items-center gap-xs px-sm py-xs text-Label text-primary border border-primary rounded-button hover:bg-primary-light transition-colors"
            onClick={() => toast.info(`${row.name} 급여 수정은 급여 명세서 페이지에서 가능합니다.`, { action: { label: '명세서 이동', onClick: () => moveToPage(989) } })}
          >
            <Edit2 size={12} />수정
          </button>
        ) : null
    }
  ];

  // 통계 카드 데이터
  const paidCount    = filtered.filter(r => r.status === "paid").length;
  const pendingCount = filtered.filter(r => r.status === "pending").length;

  return (
    <AppLayout>
      <div className="space-y-xl">
        <PageHeader
          title="급여 관리"
          description="직원별 기본급, 인센티브, 공제액을 확인하고 급여를 관리합니다."
          actions={
            <div className="flex items-center gap-sm">
              {/* UI-098 월 선택 */}
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary pointer-events-none" />
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="pl-[36px] pr-md py-sm bg-white border border-line rounded-button text-Body-2 outline-none focus:border-primary cursor-pointer"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <button
                className="flex items-center gap-xs px-md py-sm border border-line text-content-secondary rounded-button text-Label font-semibold hover:bg-surface-secondary transition-all"
                onClick={() => {
                  const exportColumns = [
                    { key: 'name', header: '직원명' },
                    { key: 'role', header: '역할' },
                    { key: 'baseSalary', header: '기본급' },
                    { key: 'incentive', header: '인센티브' },
                    { key: 'deduction', header: '공제' },
                    { key: 'netPay', header: '실지급액' },
                    { key: 'status', header: '지급상태' },
                  ];
                  const statusLabel: Record<string, string> = { paid: '지급완료', pending: '미지급', hold: '보류' };
                  const exportData = filtered.map(r => ({
                    ...r,
                    status: statusLabel[r.status] ?? r.status,
                  }));
                  exportToExcel(exportData as unknown as Record<string, unknown>[], exportColumns, { filename: `급여_${selectedMonth}` });
                  toast.success("엑셀 다운로드가 완료되었습니다.");
                }}
              >
                <Download size={16} />내보내기
              </button>
            </div>
          }
        />

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg">
          <StatCard label="총 지급 대상" value={`${filtered.length}명`}        icon={<Users />}        variant="default" />
          <StatCard label="총 실지급액"  value={`${totals.netPay.toLocaleString()}원`} icon={<DollarSign />}  variant="mint" description={`${selectedMonth.replace("-", "년 ")}월`} />
          <StatCard label="지급완료"     value={`${paidCount}명`}               icon={<CheckCircle2 />} variant="mint" />
          <StatCard label="미지급/보류"  value={`${pendingCount + filtered.filter(r => r.status === "hold").length}명`} icon={<Clock />} variant="peach" />
        </div>

        {/* 검색 & 필터 */}
        <SearchFilter
          searchPlaceholder="직원명, 역할 검색"
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          filters={[
            {
              key: "status",
              label: "지급상태",
              type: "select",
              options: [
                { value: "paid",    label: "지급완료" },
                { value: "pending", label: "미지급" },
                { value: "hold",    label: "보류" },
              ]
            }
          ]}
          filterValues={filterValues}
          onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}
          onReset={() => { setSearchValue(""); setFilterValues({ status: "" }); }}
        />

        {/* UI-099 급여 테이블 */}
        <DataTable
          columns={columns}
          data={filtered}
          selectable={true}
          pagination={{ page: 1, pageSize: 10, total: filtered.length }}
          onDownloadExcel={() => {
            const exportColumns = [
              { key: 'name', header: '직원명' },
              { key: 'role', header: '역할' },
              { key: 'baseSalary', header: '기본급' },
              { key: 'incentive', header: '인센티브' },
              { key: 'deduction', header: '공제' },
              { key: 'netPay', header: '실지급액' },
              { key: 'status', header: '지급상태' },
            ];
            const statusLabel: Record<string, string> = { paid: '지급완료', pending: '미지급', hold: '보류' };
            const exportData = filtered.map(r => ({ ...r, status: statusLabel[r.status] ?? r.status }));
            exportToExcel(exportData as unknown as Record<string, unknown>[], exportColumns, { filename: `급여_${selectedMonth}` });
            toast.success("엑셀 다운로드가 완료되었습니다.");
          }}
          emptyMessage={isLoadingData ? "데이터를 불러오는 중..." : "해당 조건의 급여 데이터가 없습니다."}
        />

        {/* UI-100 합계 행 */}
        {filtered.length > 0 && (
          <div className="bg-surface border border-line rounded-xl p-lg">
            <div className="flex items-center justify-between flex-wrap gap-lg">
              <span className="text-Body-1 font-bold text-content">
                합계 / 평균 ({filtered.length}명)
              </span>
              <div className="flex items-center gap-xl flex-wrap">
                <div className="text-right">
                  <p className="text-[11px] text-content-secondary mb-[2px]">기본급 합계</p>
                  <p className="text-Body-2 font-bold text-content">{totals.baseSalary.toLocaleString()}원</p>
                  <p className="text-[11px] text-content-secondary">평균 {Math.round(totals.baseSalary / filtered.length).toLocaleString()}원</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-content-secondary mb-[2px]">인센티브 합계</p>
                  <p className="text-Body-2 font-bold text-state-success">{totals.incentive.toLocaleString()}원</p>
                  <p className="text-[11px] text-content-secondary">평균 {Math.round(totals.incentive / filtered.length).toLocaleString()}원</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-content-secondary mb-[2px]">공제 합계</p>
                  <p className="text-Body-2 font-bold text-error">{totals.deduction.toLocaleString()}원</p>
                  <p className="text-[11px] text-content-secondary">평균 {Math.round(totals.deduction / filtered.length).toLocaleString()}원</p>
                </div>
                <div className="text-right border-l border-line pl-xl">
                  <p className="text-[11px] text-content-secondary mb-[2px]">실지급액 합계</p>
                  <p className="text-Heading-2 font-bold text-primary">{totals.netPay.toLocaleString()}원</p>
                  <p className="text-[11px] text-content-secondary">평균 {Math.round(totals.netPay / filtered.length).toLocaleString()}원</p>
                </div>
              </div>
            </div>
            <div className="mt-sm pt-sm border-t border-line">
              <p className="text-[11px] text-content-secondary">
                <span className="font-semibold text-accent">계산식</span>: 실지급액 = 기본급 + 인센티브 - 공제액
                &nbsp;|&nbsp;
                {totals.baseSalary.toLocaleString()} + {totals.incentive.toLocaleString()} - {totals.deduction.toLocaleString()} = <span className="font-bold text-primary">{totals.netPay.toLocaleString()}원</span>
              </p>
            </div>
          </div>
        )}

        {/* 급여 명세서 바로가기 */}
        <div className="flex items-center justify-between bg-surface-secondary/40 border border-line rounded-xl p-lg">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center text-primary">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-Body-1 font-bold text-content">급여 명세서 발급</p>
              <p className="text-Body-2 text-content-secondary">직원별 급여 명세서를 조회하고 PDF로 다운로드할 수 있습니다.</p>
            </div>
          </div>
          <button
            className="px-lg py-sm bg-primary text-white rounded-button text-Label font-semibold hover:opacity-90 transition-all whitespace-nowrap"
            onClick={() => moveToPage(989)}
          >
            명세서 바로가기
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
