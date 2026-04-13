import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import {
  Users, TrendingUp, TrendingDown, UserCheck, UserMinus, DollarSign,
  CalendarCheck, BarChart3, Target, AlertCircle, RefreshCw, Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * KPI 대시보드 — 회사 성장 & Team Health KPI 종합
 * 직원/지점/본사 레벨 핵심 지표를 한눈에 확인
 */

interface KpiMetrics {
  // 회원 현황
  totalMembers: number;
  activeMembers: number;
  newMembersThisMonth: number;
  newMembersPrevMonth: number;
  expiredMembers: number;
  expiringMembers: number;
  // 매출
  monthlyRevenue: number;
  prevMonthRevenue: number;
  // 출석
  avgWeeklyAttendance: number;
  todayAttendance: number;
  // 상담
  totalConsultations: number;
  completedConsultations: number;
  // PT
  totalPtSessions: number;
  completedPtSessions: number;
  noShowPtSessions: number;
  // 수업
  totalClasses: number;
  totalClassAttendees: number;
  totalClassBooked: number;
}

const EMPTY_METRICS: KpiMetrics = {
  totalMembers: 0, activeMembers: 0, newMembersThisMonth: 0, newMembersPrevMonth: 0,
  expiredMembers: 0, expiringMembers: 0,
  monthlyRevenue: 0, prevMonthRevenue: 0,
  avgWeeklyAttendance: 0, todayAttendance: 0,
  totalConsultations: 0, completedConsultations: 0,
  totalPtSessions: 0, completedPtSessions: 0, noShowPtSessions: 0,
  totalClasses: 0, totalClassAttendees: 0, totalClassBooked: 0,
};

function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0;
}

function mom(curr: number, prev: number): number {
  return prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
}

function formatAmount(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return amount.toLocaleString("ko-KR");
}

// 목표 설정 모달 컴포넌트
function TargetModal({
  branchId,
  yearMonth,
  onClose,
  onSaved,
}: {
  branchId: number;
  yearMonth: string;
  onClose: () => void;
  onSaved: (value: number) => void;
}) {
  const storageKey = `kpi_monthly_target_${branchId}_${yearMonth}`;
  const saved = localStorage.getItem(storageKey);
  const [inputValue, setInputValue] = useState(
    saved ? Number(saved).toLocaleString("ko-KR") : ""
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    if (raw === "") {
      setInputValue("");
      return;
    }
    setInputValue(Number(raw).toLocaleString("ko-KR"));
  }

  function handleSave() {
    const raw = inputValue.replace(/[^0-9]/g, "");
    if (!raw || Number(raw) <= 0) {
      toast.error("올바른 목표 금액을 입력해 주세요.");
      return;
    }
    localStorage.setItem(storageKey, raw);
    onSaved(Number(raw));
    toast.success("매출 목표가 저장되었습니다.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl shadow-lg w-[340px] p-lg">
        <div className="flex items-center justify-between mb-md">
          <h3 className="text-[15px] font-bold text-content">매출 목표 설정</h3>
          <button onClick={onClose} className="text-content-secondary hover:text-content transition-colors">
            <X size={18} />
          </button>
        </div>
        <p className="text-[12px] text-content-secondary mb-sm">{yearMonth} 이번달 매출 목표</p>
        <div className="relative mb-md">
          <input
            type="text"
            inputMode="numeric"
            value={inputValue}
            onChange={handleChange}
            placeholder="예) 10,000,000"
            className="w-full border border-line rounded-lg px-md py-sm text-[14px] text-content bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 pr-[36px]"
          />
          <span className="absolute right-md top-1/2 -translate-y-1/2 text-[13px] text-content-secondary">원</span>
        </div>
        <div className="flex gap-sm justify-end">
          <button
            onClick={onClose}
            className="px-md py-sm text-[13px] text-content-secondary border border-line rounded-button hover:bg-surface-secondary transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-md py-sm text-[13px] text-white bg-primary rounded-button hover:bg-primary/90 transition-colors"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// 매출 달성률 게이지 컴포넌트
function RevenueGauge({ revenue, target }: { revenue: number; target: number | null }) {
  if (target === null) {
    return (
      <p className="text-[12px] text-content-secondary mt-sm">목표를 설정하세요</p>
    );
  }

  const pctValue = target > 0 ? Math.min(Math.round((revenue / target) * 100), 999) : 0;
  const barWidth = Math.min(pctValue, 100);

  let barColor = "bg-red-500";
  if (pctValue >= 100) barColor = "bg-green-500";
  else if (pctValue >= 70) barColor = "bg-blue-500";
  else if (pctValue >= 50) barColor = "bg-yellow-400";

  const revManwon = Math.round(revenue / 10_000);
  const targetManwon = Math.round(target / 10_000);

  return (
    <div className="mt-sm">
      <div className="flex items-center justify-between mb-[4px]">
        <span className="text-[11px] text-content-secondary">
          ₩{revManwon.toLocaleString("ko-KR")}만 / ₩{targetManwon.toLocaleString("ko-KR")}만 ({pctValue}%)
        </span>
        <span className={cn(
          "text-[11px] font-semibold",
          pctValue >= 100 ? "text-green-600" :
          pctValue >= 70 ? "text-blue-600" :
          pctValue >= 50 ? "text-yellow-600" : "text-red-600"
        )}>
          {pctValue >= 100 ? "목표 달성!" : `${pctValue}% 달성`}
        </span>
      </div>
      <div className="w-full h-[6px] bg-surface-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// 코호트 분석 타입
interface CohortRow {
  cohortLabel: string; // "2026-01"
  cohortStart: Date;
  total: number;
  retention: (number | null)[]; // 1~6개월 유지율 (null = 아직 도달 안된 월)
}

// 코호트 셀 배경 색상
function cohortCellBg(rate: number | null): string {
  if (rate === null) return "bg-surface-secondary text-content-secondary";
  if (rate >= 90) return "bg-green-200 text-green-900";
  if (rate >= 70) return "bg-green-100 text-green-800";
  if (rate >= 50) return "bg-yellow-100 text-yellow-800";
  if (rate >= 30) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

// 코호트 분석 컴포넌트
function CohortAnalysis({ branchId }: { branchId: number }) {
  const [rows, setRows] = useState<CohortRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCohort() {
      setLoading(true);
      try {
        const today = new Date();
        // 최근 6개월 코호트 계산
        const cohorts: CohortRow[] = [];

        for (let i = 5; i >= 0; i--) {
          const cohortDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const cohortYear = cohortDate.getFullYear();
          const cohortMonth = cohortDate.getMonth(); // 0-based
          const cohortLabel = `${cohortYear}-${String(cohortMonth + 1).padStart(2, "0")}`;

          const cohortStart = new Date(cohortYear, cohortMonth, 1).toISOString();
          const cohortEnd = new Date(cohortYear, cohortMonth + 1, 0, 23, 59, 59).toISOString();

          // 해당 월 등록 회원 조회
          const { data: cohortMembers, error } = await supabase
            .from("members")
            .select("id, status, membershipExpiry, registeredAt")
            .eq("branchId", branchId)
            .is("deletedAt", null)
            .gte("registeredAt", cohortStart)
            .lte("registeredAt", cohortEnd);

          if (error || !cohortMembers) {
            cohorts.push({ cohortLabel, cohortStart: cohortDate, total: 0, retention: [null, null, null, null, null, null] });
            continue;
          }

          const total = cohortMembers.length;

          // 경과 M개월 유지율 계산
          const retention: (number | null)[] = [];
          for (let m = 1; m <= 6; m++) {
            // 코호트 등록 월 + m개월 이후 월말
            const targetMonthEnd = new Date(cohortYear, cohortMonth + m + 1, 0, 23, 59, 59);

            // 해당 월이 아직 지나지 않았으면 null
            if (targetMonthEnd > today) {
              retention.push(null);
              continue;
            }

            if (total === 0) {
              retention.push(null);
              continue;
            }

            const targetMonthEndStr = targetMonthEnd.toISOString().slice(0, 10);
            const retained = cohortMembers.filter((member: any) => {
              if (member.status === "ACTIVE") return true;
              if (member.membershipExpiry && member.membershipExpiry >= targetMonthEndStr) return true;
              return false;
            }).length;

            retention.push(Math.round((retained / total) * 100));
          }

          cohorts.push({ cohortLabel, cohortStart: cohortDate, total, retention });
        }

        setRows(cohorts);
      } catch (err) {
        console.error("[CohortAnalysis] 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCohort();
  }, [branchId]);

  return (
    <div className="bg-surface border border-line rounded-xl p-lg mb-lg">
      <h3 className="text-[14px] font-bold text-content mb-xs">코호트 분석</h3>
      <p className="text-[12px] text-content-secondary mb-md">
        등록 월별 회원 유지율 — 경과 개월 수에 따른 활성 잔존율
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-[120px] text-[13px] text-content-secondary">
          데이터 로딩 중...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="text-left px-sm py-xs text-content-secondary font-semibold bg-surface-secondary rounded-tl-lg border border-line min-w-[100px]">
                  등록 코호트
                </th>
                <th className="text-center px-sm py-xs text-content-secondary font-semibold bg-surface-secondary border border-line min-w-[60px]">
                  등록수
                </th>
                {[1, 2, 3, 4, 5, 6].map((m) => (
                  <th
                    key={m}
                    className="text-center px-sm py-xs text-content-secondary font-semibold bg-surface-secondary border border-line min-w-[72px]"
                  >
                    {m}개월
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.cohortLabel}>
                  <td className="px-sm py-xs font-semibold text-content border border-line bg-surface">
                    {row.cohortLabel}
                  </td>
                  <td className="text-center px-sm py-xs text-content border border-line bg-surface">
                    {row.total > 0 ? `${row.total}명` : "-"}
                  </td>
                  {row.retention.map((rate, idx) => (
                    <td
                      key={idx}
                      className={cn(
                        "text-center px-sm py-xs border border-line font-medium",
                        cohortCellBg(rate)
                      )}
                    >
                      {rate === null ? (
                        <span className="text-content-secondary">-</span>
                      ) : (
                        `${rate}%`
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-lg text-content-secondary border border-line"
                  >
                    코호트 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-sm mt-md">
        <span className="text-[11px] text-content-secondary">색상 기준:</span>
        {[
          { label: "90%+", bg: "bg-green-200" },
          { label: "70~89%", bg: "bg-green-100" },
          { label: "50~69%", bg: "bg-yellow-100" },
          { label: "30~49%", bg: "bg-orange-100" },
          { label: "~29%", bg: "bg-red-100" },
        ].map(({ label, bg }) => (
          <span key={label} className={cn("text-[11px] px-sm py-[2px] rounded", bg)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// 퍼널 분석 데이터 타입
interface FunnelStep {
  label: string;
  count: number;
  color: string;
}

// 퍼널 분석 컴포넌트
function FunnelAnalysis({ branchId }: { branchId: number }) {
  const [steps, setSteps] = useState<FunnelStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFunnel() {
      setLoading(true);
      try {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
        // 3개월 전 기준
        const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString();

        // 병렬 조회 — 테이블 없으면 0으로 처리
        const [leadsRes, consultRes, memberNewRes, memberRetainRes, reRegRes] = await Promise.all([
          // 1. 리드 유입 (이번달)
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .gte("createdAt", monthStart)
            .lte("createdAt", monthEnd),
          // 2. 상담 완료 (이번달)
          supabase
            .from("consultations")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .eq("status", "완료")
            .gte("consultedAt", monthStart)
            .lte("consultedAt", monthEnd),
          // 3. 회원 등록 (이번달)
          supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .is("deletedAt", null)
            .gte("registeredAt", monthStart)
            .lte("registeredAt", monthEnd),
          // 4. 3개월 유지 (3개월 전 이전 등록 + 현재 ACTIVE)
          supabase
            .from("members")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .is("deletedAt", null)
            .eq("status", "ACTIVE")
            .lte("registeredAt", threeMonthsAgo),
          // 5. 재등록 (이번달)
          supabase
            .from("sales")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .eq("round", "재등록")
            .gte("saleDate", monthStart)
            .lte("saleDate", monthEnd),
        ]);

        const raw = [
          leadsRes.count ?? 0,
          consultRes.count ?? 0,
          memberNewRes.count ?? 0,
          memberRetainRes.count ?? 0,
          reRegRes.count ?? 0,
        ];

        const colors = [
          "bg-primary",
          "bg-primary/80",
          "bg-primary/60",
          "bg-primary/40",
          "bg-primary/25",
        ];

        const labels = [
          "리드 유입",
          "상담 완료",
          "회원 등록",
          "3개월 유지",
          "재등록",
        ];

        setSteps(labels.map((label, i) => ({ label, count: raw[i], color: colors[i] })));
      } catch (err) {
        console.error("[FunnelAnalysis] 데이터 로드 실패:", err);
        // 에러 시 0으로 표시
        setSteps([
          { label: "리드 유입", count: 0, color: "bg-primary" },
          { label: "상담 완료", count: 0, color: "bg-primary/80" },
          { label: "회원 등록", count: 0, color: "bg-primary/60" },
          { label: "3개월 유지", count: 0, color: "bg-primary/40" },
          { label: "재등록", count: 0, color: "bg-primary/25" },
        ]);
      } finally {
        setLoading(false);
      }
    }

    fetchFunnel();
  }, [branchId]);

  const firstCount = steps.length > 0 ? steps[0].count : 0;

  return (
    <div className="bg-surface border border-line rounded-xl p-lg mb-lg">
      <h3 className="text-[14px] font-bold text-content mb-xs">퍼널 분석</h3>
      <p className="text-[12px] text-content-secondary mb-md">
        리드 유입 → 상담 완료 → 회원 등록 → 3개월 유지 → 재등록 단계별 전환율
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-[120px] text-[13px] text-content-secondary">
          데이터 로딩 중...
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {steps.map((step, idx) => {
            const barWidth = firstCount > 0 ? Math.round((step.count / firstCount) * 100) : 0;
            const convRate = idx === 0
              ? 100
              : steps[idx - 1].count > 0
                ? Math.round((step.count / steps[idx - 1].count) * 100)
                : 0;

            return (
              <div key={step.label} className="flex items-center gap-md">
                {/* 라벨 */}
                <div className="w-[80px] shrink-0 text-[12px] text-content-secondary text-right">
                  {step.label}
                </div>
                {/* 바 영역 */}
                <div className="flex-1 flex items-center gap-sm">
                  <div className="flex-1 h-[26px] bg-surface-secondary rounded-md overflow-hidden">
                    <div
                      className={cn("h-full rounded-md transition-all duration-500", step.color)}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  {/* 인원 수 */}
                  <span className="w-[44px] shrink-0 text-[13px] font-semibold text-content text-right">
                    {step.count.toLocaleString("ko-KR")}명
                  </span>
                  {/* 전환율 */}
                  <span className="w-[52px] shrink-0 text-[12px] text-content-secondary">
                    {idx === 0 ? "기준" : `→ ${convRate}%`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && firstCount > 0 && (
        <p className="text-[11px] text-content-secondary mt-md">
          * 전환율은 직전 단계 대비 비율 / 바 너비는 첫 단계(리드 유입) 기준 비율
        </p>
      )}
    </div>
  );
}

export default function KpiDashboard() {
  const branchId = Number(localStorage.getItem("branchId")) || 1;
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<KpiMetrics>(EMPTY_METRICS);

  const today = new Date();
  const yearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [showTargetModal, setShowTargetModal] = useState(false);
  const [monthlyTarget, setMonthlyTarget] = useState<number | null>(() => {
    const saved = localStorage.getItem(`kpi_monthly_target_${Number(localStorage.getItem("branchId")) || 1}_${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`);
    return saved ? Number(saved) : null;
  });

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59).toISOString();
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);
      const in30DaysStr = in30Days.toISOString().slice(0, 10);

      // 7일 전
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().slice(0, 10);

      const base = () => supabase.from("members").select("id", { count: "exact", head: true }).eq("branchId", branchId).is("deletedAt", null);

      const [
        totalRes, activeRes, newRes, newPrevRes, expiredRes, expiringRes,
        revenueRes, prevRevenueRes,
        todayAttRes, weekAttRes,
        consultRes, consultCompRes,
        ptTotalRes, ptCompRes, ptNoShowRes,
        classRes, classAttendRes, classBookedRes,
      ] = await Promise.all([
        base(),
        base().eq("status", "ACTIVE"),
        base().gte("registeredAt", monthStart).lte("registeredAt", monthEnd),
        base().gte("registeredAt", prevMonthStart).lte("registeredAt", prevMonthEnd),
        base().eq("status", "EXPIRED"),
        base().eq("status", "ACTIVE").gte("membershipExpiry", todayStr).lte("membershipExpiry", in30DaysStr),
        // 매출
        supabase.from("sales").select("amount").eq("branchId", branchId).eq("status", "COMPLETED").gte("saleDate", monthStart).lte("saleDate", monthEnd),
        supabase.from("sales").select("amount").eq("branchId", branchId).eq("status", "COMPLETED").gte("saleDate", prevMonthStart).lte("saleDate", prevMonthEnd),
        // 출석
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("checkInAt", `${todayStr}T00:00:00`).lte("checkInAt", `${todayStr}T23:59:59`),
        supabase.from("attendance").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("checkInAt", `${weekAgoStr}T00:00:00`).lte("checkInAt", `${todayStr}T23:59:59`),
        // 상담
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("consultedAt", monthStart),
        supabase.from("consultations").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("consultedAt", monthStart).eq("status", "완료"),
        // PT (이번달)
        supabase.from("lesson_bookings").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("createdAt", monthStart),
        supabase.from("lesson_bookings").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("createdAt", monthStart).eq("status", "ATTENDED"),
        supabase.from("lesson_bookings").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("createdAt", monthStart).eq("status", "NO_SHOW"),
        // 수업
        supabase.from("classes").select("id, capacity", { count: "exact" }).eq("branchId", branchId).gte("startTime", monthStart).lte("startTime", monthEnd),
        supabase.from("lesson_bookings").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("createdAt", monthStart).eq("status", "ATTENDED"),
        supabase.from("lesson_bookings").select("id", { count: "exact", head: true }).eq("branchId", branchId).gte("createdAt", monthStart).in("status", ["BOOKED", "ATTENDED"]),
      ]);

      const sumAmount = (data: any[] | null) => (data ?? []).reduce((s: number, r: any) => s + (Number(r.amount) || 0), 0);

      setMetrics({
        totalMembers: totalRes.count ?? 0,
        activeMembers: activeRes.count ?? 0,
        newMembersThisMonth: newRes.count ?? 0,
        newMembersPrevMonth: newPrevRes.count ?? 0,
        expiredMembers: expiredRes.count ?? 0,
        expiringMembers: expiringRes.count ?? 0,
        monthlyRevenue: sumAmount(revenueRes.data),
        prevMonthRevenue: sumAmount(prevRevenueRes.data),
        todayAttendance: todayAttRes.count ?? 0,
        avgWeeklyAttendance: Math.round((weekAttRes.count ?? 0) / 7),
        totalConsultations: consultRes.count ?? 0,
        completedConsultations: consultCompRes.count ?? 0,
        totalPtSessions: ptTotalRes.count ?? 0,
        completedPtSessions: ptCompRes.count ?? 0,
        noShowPtSessions: ptNoShowRes.count ?? 0,
        totalClasses: classRes.count ?? 0,
        totalClassAttendees: classAttendRes.count ?? 0,
        totalClassBooked: classBookedRes.count ?? 0,
      });
    } catch (err) {
      console.error("[KpiDashboard] 데이터 로드 실패:", err);
      toast.error("KPI 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const m = metrics;

  // 계산된 KPI
  const consultConvRate = pct(m.completedConsultations, m.totalConsultations);
  const ptCompletionRate = pct(m.completedPtSessions, m.totalPtSessions);
  const ptNoShowRate = pct(m.noShowPtSessions, m.totalPtSessions);
  const activeRate = pct(m.activeMembers, m.totalMembers);
  const newMemberMoM = mom(m.newMembersThisMonth, m.newMembersPrevMonth);
  const revenueMoM = mom(m.monthlyRevenue, m.prevMonthRevenue);
  const classAttendRate = pct(m.totalClassAttendees, m.totalClassBooked);

  return (
    <AppLayout>
      {showTargetModal && (
        <TargetModal
          branchId={branchId}
          yearMonth={yearMonth}
          onClose={() => setShowTargetModal(false)}
          onSaved={(val) => setMonthlyTarget(val)}
        />
      )}
      <PageHeader
        title="KPI 대시보드"
        description="회사 성장 & Team Health 핵심 지표를 한눈에 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              className="flex items-center gap-xs px-md py-sm border border-line rounded-button text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors"
              onClick={() => setShowTargetModal(true)}
            >
              <Settings size={14} />
              목표 설정
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm border border-line rounded-button text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors"
              onClick={fetchMetrics}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              새로고침
            </button>
          </div>
        }
      />

      {/* 회원 현황 */}
      <h3 className="text-[14px] font-bold text-content mb-sm mt-md">회원 현황</h3>
      <StatCardGrid cols={6} className="mb-lg">
        <StatCard label="전체 회원" value={`${m.totalMembers}명`} icon={<Users size={18} />} />
        <StatCard label="활성 회원" value={`${m.activeMembers}명`} icon={<UserCheck size={18} />} variant="mint" />
        <StatCard label="활성 비율" value={`${activeRate}%`} icon={<Target size={18} />} />
        <StatCard label="이번달 신규" value={`${m.newMembersThisMonth}명`} icon={<TrendingUp size={18} />} variant="peach" />
        <StatCard label="만료 예정" value={`${m.expiringMembers}명`} icon={<AlertCircle size={18} />} />
        <StatCard label="만료 회원" value={`${m.expiredMembers}명`} icon={<UserMinus size={18} />} />
      </StatCardGrid>

      {/* 매출 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">매출</h3>
      <StatCardGrid cols={4} className="mb-sm">
        <StatCard label="이번달 매출" value={`${formatAmount(m.monthlyRevenue)}원`} icon={<DollarSign size={18} />} variant="mint" />
        <StatCard label="전월 매출" value={`${formatAmount(m.prevMonthRevenue)}원`} icon={<DollarSign size={18} />} />
        <StatCard label="MoM 성장률" value={`${revenueMoM >= 0 ? '+' : ''}${revenueMoM}%`} icon={revenueMoM >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} variant={revenueMoM >= 0 ? "mint" : "peach"} />
        <StatCard label="신규 MoM" value={`${newMemberMoM >= 0 ? '+' : ''}${newMemberMoM}%`} icon={revenueMoM >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} />
      </StatCardGrid>
      {/* 매출 달성률 게이지 */}
      <div className="bg-surface border border-line rounded-xl px-lg py-md mb-lg">
        <div className="flex items-center justify-between mb-xs">
          <span className="text-[13px] font-semibold text-content">이번달 매출 달성률</span>
          <button
            onClick={() => setShowTargetModal(true)}
            className="text-[11px] text-content-secondary hover:text-primary transition-colors flex items-center gap-[3px]"
          >
            <Settings size={11} />
            목표 수정
          </button>
        </div>
        <RevenueGauge revenue={m.monthlyRevenue} target={monthlyTarget} />
      </div>

      {/* 상담/전환 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">상담 / 전환</h3>
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="이번달 상담" value={`${m.totalConsultations}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="상담 완료" value={`${m.completedConsultations}건`} icon={<CalendarCheck size={18} />} variant="mint" />
        <StatCard label="상담 완료율" value={`${consultConvRate}%`} icon={<Target size={18} />} variant="peach" />
        <StatCard label="일평균 출석" value={`${m.avgWeeklyAttendance}명`} icon={<Users size={18} />} />
      </StatCardGrid>

      {/* PT */}
      <h3 className="text-[14px] font-bold text-content mb-sm">PT 수업</h3>
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="이번달 PT 세션" value={`${m.totalPtSessions}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="PT 완료" value={`${m.completedPtSessions}건`} icon={<CalendarCheck size={18} />} variant="mint" />
        <StatCard label="PT 완료율" value={`${ptCompletionRate}%`} icon={<Target size={18} />} variant={ptCompletionRate >= 85 ? "mint" : "peach"} />
        <StatCard label="PT 노쇼율" value={`${ptNoShowRate}%`} icon={<AlertCircle size={18} />} variant={ptNoShowRate <= 5 ? "mint" : "peach"} />
      </StatCardGrid>

      {/* GX 수업 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">GX 수업</h3>
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="이번달 수업" value={`${m.totalClasses}건`} icon={<BarChart3 size={18} />} />
        <StatCard label="예약 수" value={`${m.totalClassBooked}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="출석 수" value={`${m.totalClassAttendees}건`} icon={<UserCheck size={18} />} variant="mint" />
        <StatCard label="수업 출석률" value={`${classAttendRate}%`} icon={<Target size={18} />} variant={classAttendRate >= 80 ? "mint" : "peach"} />
      </StatCardGrid>

      {/* 코호트 분석 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">코호트 분석</h3>
      <CohortAnalysis branchId={branchId} />

      {/* 퍼널 분석 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">퍼널 분석</h3>
      <FunnelAnalysis branchId={branchId} />

      {/* 미구현 KPI 안내 */}
      <div className="bg-surface-secondary border border-line rounded-xl p-lg mt-md">
        <h3 className="text-[14px] font-bold text-content mb-sm">추가 예정 KPI (정책/인프라 확정 후)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-sm text-[12px] text-content-secondary">
          <div className="p-sm bg-surface rounded-lg border border-line">재등록률 (이탈 정의 필요)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">이탈률 (만료 후 N일 기준 필요)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">NPS 고객 추천 지수 (설문 시스템)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">LTV 회원 생애가치 (유지기간 추적)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">CAC 획득 비용 (마케팅비 데이터)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">영업이익률 (비용 관리 시스템)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">직원 생산성 지수 (담당회원 매핑)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">회원 만족도 (설문 시스템)</div>
          <div className="p-sm bg-surface rounded-lg border border-line">Today Tasks 완료율 (업무 시스템)</div>
        </div>
      </div>
    </AppLayout>
  );
}
