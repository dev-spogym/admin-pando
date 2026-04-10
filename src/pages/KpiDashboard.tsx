import React, { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  Users, TrendingUp, TrendingDown, UserCheck, UserMinus, DollarSign,
  CalendarCheck, BarChart3, Target, AlertCircle, RefreshCw,
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

export default function KpiDashboard() {
  const branchId = Number(localStorage.getItem("branchId")) || 1;
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<KpiMetrics>(EMPTY_METRICS);

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
      <PageHeader
        title="KPI 대시보드"
        description="회사 성장 & Team Health 핵심 지표를 한눈에 확인합니다."
        actions={
          <button
            className="flex items-center gap-xs px-md py-sm border border-line rounded-button text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors"
            onClick={fetchMetrics}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
        }
      />

      {/* 회원 현황 */}
      <h3 className="text-[14px] font-bold text-content mb-sm mt-md">회원 현황</h3>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-md mb-lg">
        <StatCard label="전체 회원" value={`${m.totalMembers}명`} icon={<Users size={18} />} />
        <StatCard label="활성 회원" value={`${m.activeMembers}명`} icon={<UserCheck size={18} />} variant="mint" />
        <StatCard label="활성 비율" value={`${activeRate}%`} icon={<Target size={18} />} />
        <StatCard label="이번달 신규" value={`${m.newMembersThisMonth}명`} icon={<TrendingUp size={18} />} variant="peach" />
        <StatCard label="만료 예정" value={`${m.expiringMembers}명`} icon={<AlertCircle size={18} />} />
        <StatCard label="만료 회원" value={`${m.expiredMembers}명`} icon={<UserMinus size={18} />} />
      </div>

      {/* 매출 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">매출</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="이번달 매출" value={`${formatAmount(m.monthlyRevenue)}원`} icon={<DollarSign size={18} />} variant="mint" />
        <StatCard label="전월 매출" value={`${formatAmount(m.prevMonthRevenue)}원`} icon={<DollarSign size={18} />} />
        <StatCard label="MoM 성장률" value={`${revenueMoM >= 0 ? '+' : ''}${revenueMoM}%`} icon={revenueMoM >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} variant={revenueMoM >= 0 ? "mint" : "peach"} />
        <StatCard label="신규 MoM" value={`${newMemberMoM >= 0 ? '+' : ''}${newMemberMoM}%`} icon={revenueMoM >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />} />
      </div>

      {/* 상담/전환 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">상담 / 전환</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="이번달 상담" value={`${m.totalConsultations}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="상담 완료" value={`${m.completedConsultations}건`} icon={<CalendarCheck size={18} />} variant="mint" />
        <StatCard label="상담 완료율" value={`${consultConvRate}%`} icon={<Target size={18} />} variant="peach" />
        <StatCard label="일평균 출석" value={`${m.avgWeeklyAttendance}명`} icon={<Users size={18} />} />
      </div>

      {/* PT */}
      <h3 className="text-[14px] font-bold text-content mb-sm">PT 수업</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="이번달 PT 세션" value={`${m.totalPtSessions}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="PT 완료" value={`${m.completedPtSessions}건`} icon={<CalendarCheck size={18} />} variant="mint" />
        <StatCard label="PT 완료율" value={`${ptCompletionRate}%`} icon={<Target size={18} />} variant={ptCompletionRate >= 85 ? "mint" : "peach"} />
        <StatCard label="PT 노쇼율" value={`${ptNoShowRate}%`} icon={<AlertCircle size={18} />} variant={ptNoShowRate <= 5 ? "mint" : "peach"} />
      </div>

      {/* GX 수업 */}
      <h3 className="text-[14px] font-bold text-content mb-sm">GX 수업</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="이번달 수업" value={`${m.totalClasses}건`} icon={<BarChart3 size={18} />} />
        <StatCard label="예약 수" value={`${m.totalClassBooked}건`} icon={<CalendarCheck size={18} />} />
        <StatCard label="출석 수" value={`${m.totalClassAttendees}건`} icon={<UserCheck size={18} />} variant="mint" />
        <StatCard label="수업 출석률" value={`${classAttendRate}%`} icon={<Target size={18} />} variant={classAttendRate >= 80 ? "mint" : "peach"} />
      </div>

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
