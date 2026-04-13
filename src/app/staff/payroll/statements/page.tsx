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
  Clock
} from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/exportExcel";
import { useAuthStore } from "@/stores/authStore";
import { normalizeRole } from "@/lib/permissions";

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-063: 급여 명세서 (UI-127 ~ UI-129)
 */

interface StaffItem {
  id: number;
  name: string;
  position: string;
}

interface EarningItem {
  name: string;
  amount: number;
}

interface DeductionItem {
  name: string;
  amount: number;
}

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
  details: {
    earnings: EarningItem[];
    deductions: DeductionItem[];
  } | null;
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

export default function PayrollStatement() {
  const authUser = useAuthStore((s) => s.user);
  const userRole = normalizeRole(authUser?.role ?? '');
  const isReadonly = userRole === 'readonly';

  const MONTHS = useMemo(() => getRecentMonths(), []);
  const [staffList, setStaffList] = useState<StaffItem[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[0].value);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatement, setModalStatement] = useState<StatementDetail | null>(null);
  const [modalStaffName, setModalStaffName] = useState("");

  // 직원 목록 로드 (readonly는 본인만)
  useEffect(() => {
    async function fetchStaff() {
      let query = supabase
        .from("staff")
        .select("id, name, position")
        .eq("branchId", getBranchId())
        .order("name");

      // readonly 사용자는 본인 이름으로 필터
      if (isReadonly && authUser?.name) {
        query = query.eq("name", authUser.name);
      }

      const { data, error } = await query;
      if (error) {
        console.error("직원 목록 로드 실패:", error);
        toast.error("직원 목록을 불러오지 못했습니다.");
      } else if (data && data.length > 0) {
        const mapped: StaffItem[] = data.map((s: any) => ({
          id: s.id,
          name: s.name,
          position: s.position ?? "",
        }));
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
        .select("id, staffId, staffName, year, month, baseSalary, netSalary, status, paidAt, details, staff!inner(position, branchId)")
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
          status: r.status ?? "pending",
          paymentDate: r.paidAt ? new Date(r.paidAt).toLocaleDateString('ko-KR') : "-",
          details: r.details ?? null,
        }));
        setPayrollRecords(mapped);
      }
      setIsLoadingData(false);
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

  // 테이블용 요약 데이터 (전체 직원 × 선택 월)
  const tableData = useMemo(() =>
    staffList.map(staff => {
      const rec = payrollRecords.find(r => r.staffId === staff.id);
      if (!rec) return {
        id: staff.id, name: staff.name, position: staff.position,
        baseSalary: 0, totalEarnings: 0, totalDeductions: 0, netPay: 0,
        status: "pending" as const, paymentDate: "-",
      };
      const earn = rec.details?.earnings.reduce((s, e) => s + e.amount, 0) ?? rec.baseSalary;
      const ded  = rec.details?.deductions.reduce((s, e) => s + e.amount, 0) ?? 0;
      return {
        id: staff.id,
        name: staff.name,
        position: staff.position,
        baseSalary: rec.baseSalary,
        totalEarnings: earn,
        totalDeductions: ded,
        netPay: rec.netSalary || (earn - ded),
        status: rec.status,
        paymentDate: rec.paymentDate,
      };
    }),
    [staffList, payrollRecords]
  );

  const paidCount    = tableData.filter(r => r.status === "paid").length;
  const pendingCount = tableData.filter(r => r.status === "pending").length;
  const totalNet     = tableData.reduce((s, r) => s + r.netPay, 0);

  const columns = [
    {
      key: "name",
      header: "직원명",
      width: 180,
      render: (val: string, row: typeof tableData[0]) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="font-bold text-content">{val}</span>
          <span className="text-[12px] text-content-secondary">/ {row.position || "-"}</span>
        </div>
      )
    },
    { key: "paymentDate", header: "지급일", align: "center" as const, width: 120 },
    {
      key: "baseSalary",
      header: "기본급",
      align: "right" as const,
      width: 130,
      render: (val: number) => val ? <span className="inline-block whitespace-nowrap">{val.toLocaleString()}원</span> : "-"
    },
    {
      key: "totalEarnings",
      header: "지급총액",
      align: "right" as const,
      width: 140,
      render: (val: number) => val ? <span className="inline-block whitespace-nowrap">{val.toLocaleString()}원</span> : "-"
    },
    {
      key: "totalDeductions",
      header: "공제총액",
      align: "right" as const,
      width: 140,
      render: (val: number) => val ? <span className="inline-block whitespace-nowrap text-error">-{val.toLocaleString()}원</span> : "-"
    },
    {
      key: "netPay",
      header: "실지급액",
      align: "right" as const,
      width: 140,
      render: (val: number) => val ? <span className="inline-block whitespace-nowrap font-bold text-primary">{val.toLocaleString()}원</span> : "-"
    },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      width: 120,
      render: (val: string) => (
        <span className="inline-flex whitespace-nowrap">
          <StatusBadge variant={val === "paid" ? "success" : "warning"} dot={true}>
            {val === "paid" ? "지급완료" : "미지급"}
          </StatusBadge>
        </span>
      )
    },
    {
      key: "id",
      header: "명세서",
      align: "center" as const,
      width: 110,
      render: (_: number, row: typeof tableData[0]) => (
        <button
          className="whitespace-nowrap text-primary text-Label font-semibold hover:underline"
          onClick={() => {
            const rec = payrollRecords.find(r => r.staffId === row.id);
            if (rec) {
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
        </button>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="space-y-xl">
        <PageHeader
          title="급여 명세서"
          description="직원별 월간 급여 명세서를 조회하고 발급합니다."
          actions={
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-Label font-bold hover:opacity-90 transition-all"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              일괄 인쇄
            </button>
          }
        />

        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          <StatCard label="총 실지급액"  value={`${totalNet.toLocaleString()}원`} icon={<FileText />}     variant="default" />
          <StatCard label="지급완료"     value={`${paidCount}건`}                 icon={<CheckCircle2 />} variant="mint" />
          <StatCard label="미지급"       value={`${pendingCount}건`}              icon={<Clock />}        variant="peach" />
        </div>

        {/* UI-127 직원 / 월 선택 + 명세서 상세 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-xl">
          {/* 선택 패널 */}
          <div className="bg-surface border border-line rounded-xl p-xl space-y-lg shadow-card">
            <h3 className="text-Body-1 font-bold text-content">명세서 조회</h3>

            <div className="grid grid-cols-2 gap-md">
              {/* 직원 선택 — readonly는 본인만 조회 가능 */}
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">직원 선택</label>
                <select
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  disabled={isReadonly}
                  className={cn(
                    "w-full px-md py-sm bg-surface-secondary border border-line rounded-button text-Body-2 outline-none focus:border-primary",
                    isReadonly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  {staffList.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
              {/* 월 선택 */}
              <div className="space-y-xs">
                <label className="text-Label font-semibold text-content-secondary">지급 월</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="w-full px-md py-sm bg-surface-secondary border border-line rounded-button text-Body-2 outline-none focus:border-primary cursor-pointer"
                >
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* UI-128 명세서 상세 */}
            {statement && selectedStaff ? (
              <div className="space-y-lg">
                {/* 직원 정보 헤더 */}
                <div className="flex items-center justify-between p-lg bg-primary-light rounded-xl border border-primary/10">
                  <div>
                    <p className="text-Heading-2 font-bold text-content whitespace-nowrap">{selectedStaff.name}</p>
                    <p className="text-Body-2 text-primary font-medium whitespace-nowrap">{selectedStaff.position}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="inline-flex">
                      <StatusBadge variant={statement.status === "paid" ? "success" : "warning"} dot={true}>
                        {statement.status === "paid" ? "지급완료" : "미지급"}
                      </StatusBadge>
                    </span>
                    <p className="mt-xs text-Label text-content-secondary whitespace-nowrap">지급일: {statement.paymentDate}</p>
                  </div>
                </div>

                {/* 지급 / 공제 내역 */}
                <div className="grid grid-cols-2 gap-lg">
                  {/* 지급 내역 */}
                  <div className="space-y-sm">
                    <div className="flex items-center gap-xs text-state-success mb-sm">
                      <Plus size={16} />
                      <h4 className="text-Body-2 font-bold">지급 항목</h4>
                    </div>
                    {statement.earnings.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-xs border-b border-dashed border-line">
                        <span className="text-Body-2 text-content">{item.name}</span>
                        <span className="text-Body-2 font-medium">{item.amount.toLocaleString()}원</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-sm">
                      <span className="text-Body-2 font-bold text-content">지급 총액</span>
                      <span className="text-Body-2 font-bold text-state-success">{totalEarnings.toLocaleString()}원</span>
                    </div>
                  </div>

                  {/* 공제 내역 */}
                  <div className="space-y-sm">
                    <div className="flex items-center gap-xs text-error mb-sm">
                      <Minus size={16} />
                      <h4 className="text-Body-2 font-bold">공제 항목</h4>
                    </div>
                    {statement.deductions.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-xs border-b border-dashed border-line">
                        <span className="text-Body-2 text-content">{item.name}</span>
                        <span className="text-Body-2 font-medium text-error">-{item.amount.toLocaleString()}원</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-sm">
                      <span className="text-Body-2 font-bold text-content">공제 총액</span>
                      <span className="text-Body-2 font-bold text-error">{totalDeductions.toLocaleString()}원</span>
                    </div>
                  </div>
                </div>

                {/* 실지급액 강조 */}
                <div className="flex items-center justify-between p-lg bg-accent-light border border-accent/20 rounded-xl">
                  <div className="flex items-center gap-sm">
                    <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center text-white">
                      <ArrowRight size={18} />
                    </div>
                    <span className="text-Body-1 font-bold text-content">실지급액</span>
                  </div>
                  <p className="text-[28px] font-bold text-accent">{netPay.toLocaleString()}원</p>
                </div>

                {/* UI-129 PDF 다운로드 버튼 */}
                <div className="flex gap-sm pt-sm">
                  <button
                    className="flex-1 flex items-center justify-center gap-xs whitespace-nowrap px-md py-sm border border-line rounded-button text-Label text-content-secondary hover:bg-primary-light hover:text-primary hover:border-primary transition-all"
                    onClick={() => toast.info("이메일 발송 기능은 추후 지원 예정입니다.")}
                  >
                    <Mail size={16} />이메일 발송
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-xs whitespace-nowrap px-md py-sm border border-line rounded-button text-Label text-content-secondary hover:bg-accent-light hover:text-accent hover:border-accent transition-all"
                    onClick={() => {
                      toast.info("인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요");
                      setTimeout(() => window.print(), 500);
                    }}
                  >
                    <Download size={16} />PDF 저장 (인쇄)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-xl text-center">
                <div className="w-14 h-14 bg-surface-secondary rounded-full flex items-center justify-center mb-md">
                  <FileText size={28} className="text-content-secondary" />
                </div>
                <p className="text-Body-1 font-semibold text-content mb-xs">명세서 없음</p>
                <p className="text-Body-2 text-content-secondary">
                  {isLoadingData ? "데이터를 불러오는 중..." : "선택한 직원 및 월의 급여 데이터가 없습니다."}
                </p>
              </div>
            )}
          </div>

          {/* 전체 직원 목록 요약 (선택 월 기준) */}
          <div className="space-y-md">
            <h3 className="text-Body-1 font-bold text-content">
              {MONTHS.find(m => m.value === selectedMonth)?.label ?? selectedMonth} 전체 지급 현황
            </h3>
            <DataTable
              columns={columns}
              data={tableData}
              pagination={{ page: 1, pageSize: 10, total: tableData.length }}
              onDownloadExcel={() => {
                const exportColumns = [
                  { key: 'name', header: '직원명' },
                  { key: 'position', header: '직급' },
                  { key: 'baseSalary', header: '기본급' },
                  { key: 'totalEarnings', header: '지급총액' },
                  { key: 'totalDeductions', header: '공제총액' },
                  { key: 'netPay', header: '실지급액' },
                  { key: 'status', header: '상태' },
                  { key: 'paymentDate', header: '지급일' },
                ];
                const exportData = tableData.map(r => ({
                  ...r,
                  status: r.status === 'paid' ? '지급완료' : '미지급',
                }));
                exportToExcel(exportData as unknown as Record<string, unknown>[], exportColumns, { filename: `급여명세서_${selectedMonth}` });
                toast.success("엑셀 다운로드가 완료되었습니다.");
              }}
              emptyMessage={isLoadingData ? "데이터를 불러오는 중..." : "급여 데이터가 없습니다."}
            />
          </div>
        </div>
      </div>

      {/* 명세서 모달 */}
      {isModalOpen && modalStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
          <div className="w-full max-w-xl bg-surface rounded-modal shadow-xl overflow-hidden animate-in zoom-in duration-200">
            {/* 모달 헤더 */}
            <div className="p-xl border-b border-line flex justify-between items-center bg-surface-secondary/20">
              <div className="flex items-center gap-md">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="text-Heading-2 text-content font-bold">급여 명세서</h2>
                  <p className="text-Body-2 text-content-secondary whitespace-nowrap">{modalStaffName} · {modalStatement.paymentDate} 지급분</p>
                </div>
              </div>
              <button className="p-sm text-content-secondary hover:text-content transition-colors" onClick={() => setIsModalOpen(false)}>
                <X size={22} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-xl space-y-lg max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-lg">
                <div className="space-y-sm">
                  <div className="flex items-center gap-xs text-state-success">
                    <Plus size={16} /><h4 className="text-Body-2 font-bold">지급 항목</h4>
                  </div>
                  {modalStatement.earnings.map((item, i) => (
                    <div key={i} className="flex justify-between py-xs border-b border-dashed border-line">
                      <span className="text-Body-2 text-content">{item.name}</span>
                      <span className="text-Body-2 font-medium">{item.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-sm">
                    <span className="text-Body-2 font-bold">지급 총액</span>
                    <span className="text-Body-2 font-bold text-state-success">
                      {modalStatement.earnings.reduce((s, e) => s + e.amount, 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
                <div className="space-y-sm">
                  <div className="flex items-center gap-xs text-error">
                    <Minus size={16} /><h4 className="text-Body-2 font-bold">공제 항목</h4>
                  </div>
                  {modalStatement.deductions.map((item, i) => (
                    <div key={i} className="flex justify-between py-xs border-b border-dashed border-line">
                      <span className="text-Body-2 text-content">{item.name}</span>
                      <span className="text-Body-2 font-medium text-error">-{item.amount.toLocaleString()}원</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-sm">
                    <span className="text-Body-2 font-bold">공제 총액</span>
                    <span className="text-Body-2 font-bold text-error">
                      {modalStatement.deductions.reduce((s, e) => s + e.amount, 0).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-lg bg-accent-light border border-accent/20 rounded-xl">
                <span className="text-Body-1 font-bold text-content">실지급액</span>
                <p className="text-[26px] font-bold text-accent">
                  {(modalStatement.earnings.reduce((s, e) => s + e.amount, 0) - modalStatement.deductions.reduce((s, e) => s + e.amount, 0)).toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-xl border-t border-line bg-surface-secondary/10 flex justify-between items-center">
              <div className="flex gap-sm">
                <button
                  className="flex items-center gap-xs whitespace-nowrap px-md py-sm border border-line rounded-button text-Label text-content-secondary hover:bg-primary-light hover:text-primary transition-all"
                  onClick={() => toast.info("이메일 발송 기능은 추후 지원 예정입니다.")}
                >
                  <Mail size={14} />이메일
                </button>
                <button
                  className="flex items-center gap-xs whitespace-nowrap px-md py-sm border border-line rounded-button text-Label text-content-secondary hover:bg-accent-light hover:text-accent transition-all"
                  onClick={() => {
                    toast.info("인쇄 다이얼로그에서 'PDF로 저장'을 선택하세요");
                    setTimeout(() => window.print(), 500);
                  }}
                >
                  <Download size={14} />PDF 저장 (인쇄)
                </button>
              </div>
              <button
                className="px-xl py-sm bg-content text-white rounded-button text-Label font-bold hover:bg-black transition-all"
                onClick={() => setIsModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
