'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useCallback, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import Button from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import {
  Users,
  UserCheck,
  Clock,
  UserMinus,
  Calendar,
  DollarSign,
  ChevronRight,
  X,
  RefreshCw,
  TrendingUp,
  Gift,
  AlertCircle,
  PauseCircle,
  Hourglass,
  ArrowRight,
} from "lucide-react";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { runDailySync, getFavoriteVisitsToday } from "@/lib/businessLogic";
import { useAuthStore } from "@/stores/authStore";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatAmount(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return amount.toLocaleString("ko-KR");
}

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  expiringCount: number;
  expiredMembers: number;
  todayAttendance: number;
  monthlyRevenue: number;
  monthlyAttendance: number;
  monthlyRefundCount: number;
  unpaidTotal: number;
}

interface GenderDist {
  male: number;
  female: number;
}

interface AgeDist {
  label: string;
  value: number;
  color: string;
}

interface MonthlyRevenue {
  month: string;
  value: number;
}

interface WeeklyAttendance {
  day: string;
  count: number;
}

interface BirthdayMember {
  id: number;
  name: string;
  birth: string;
  status: string;
}

interface UnpaidMember {
  id: number;
  name: string;
  amount: string;
  item: string;
  overdueDays: number;
}

interface HoldingMember {
  id: number;
  name: string;
  period: string;
  remaining: number;
}

interface ExpiringMember {
  id: number;
  name: string;
  expiry: string;
  dday: string;
  ddayNum: number;
}

interface AuditLog {
  id: number;
  createdAt: string;
  action: string;
  targetType: string;
  targetId: string | number;
  userName: string;
}

/** 연령대 계산 */
function getAgeGroup(birthDate: string): string {
  const birth = new Date(birthDate);
  const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 20) return "10대";
  if (age < 30) return "20대";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  return "60대+";
}

const AGE_COLORS: Record<string, string> = {
  "10대": "bg-blue-400",
  "20대": "bg-primary",
  "30대": "bg-accent",
  "40대": "bg-content-tertiary",
  "50대": "bg-amber-400",
  "60대+": "bg-line",
};

export default function Dashboard() {
  const authUser = useAuthStore((s) => s.user);
  const branchName = authUser?.branchName || '센터';

  const [showBanner, setShowBanner] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState<DashboardStats>({
    totalMembers: 0,
    activeMembers: 0,
    expiringCount: 0,
    expiredMembers: 0,
    todayAttendance: 0,
    monthlyRevenue: 0,
    monthlyAttendance: 0,
    monthlyRefundCount: 0,
    unpaidTotal: 0,
  });

  const [genderDist, setGenderDist] = useState<GenderDist>({ male: 0, female: 0 });
  const [ageDist, setAgeDist] = useState<AgeDist[]>([]);
  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState<WeeklyAttendance[]>([]);

  const [birthdayMembers, setBirthdayMembers] = useState<BirthdayMember[]>([]);
  const [unpaidMembers, setUnpaidMembers] = useState<UnpaidMember[]>([]);
  const [holdingMembers, setHoldingMembers] = useState<HoldingMember[]>([]);
  const [expiringMembers, setExpiringMembers] = useState<ExpiringMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<AuditLog[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      const branchId = getBranchId();
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);
      const in30DaysStr = in30Days.toISOString().slice(0, 10);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

      // 기본 회원 쿼리 빌더 (soft delete 필터 포함)
      const memberBase = () =>
        supabase.from("members").select("id", { count: "exact", head: true }).eq("branchId", branchId).is("deletedAt", null);

      // 병렬 쿼리
      const [
        totalRes,
        activeRes,
        expiringRes,
        expiredRes,
        attendanceRes,
        monthlyAttendanceRes,
        revenueRes,
        refundedRes,
        birthdayRes,
        unpaidRes,
        unpaidTotalRes,
        holdingRes,
        genderRes,
      ] = await Promise.all([
        // 전체 회원수 (soft delete 제외)
        memberBase(),
        // 활성 회원수
        memberBase().eq("status", "ACTIVE"),
        // 만료 임박 (30일 이내)
        memberBase().eq("status", "ACTIVE").gte("membershipExpiry", todayStr).lte("membershipExpiry", in30DaysStr),
        // 만료 회원
        memberBase().eq("status", "EXPIRED"),
        // 오늘 출석
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("branchId", branchId)
          .gte("checkInAt", `${todayStr}T00:00:00`)
          .lte("checkInAt", `${todayStr}T23:59:59`),
        // 이번달 출석
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("branchId", branchId)
          .gte("checkInAt", monthStart)
          .lte("checkInAt", monthEnd),
        // 이번달 매출
        supabase
          .from("sales")
          .select("amount")
          .eq("branchId", branchId)
          .eq("status", "COMPLETED")
          .gte("saleDate", monthStart)
          .lte("saleDate", monthEnd),
        // 이번달 환불 건수
        supabase
          .from("sales")
          .select("id", { count: "exact", head: true })
          .eq("branchId", branchId)
          .eq("status", "REFUNDED")
          .gte("saleDate", monthStart)
          .lte("saleDate", monthEnd),
        // 오늘 생일자 회원 (soft delete 제외)
        supabase
          .from("members")
          .select("id, name, birthDate, status")
          .eq("branchId", branchId)
          .is("deletedAt", null)
          .like("birthDate", `%-${todayStr.slice(5)}`),
        // 미수금 회원
        supabase
          .from("sales")
          .select("id, memberName, productName, amount, unpaid, saleDate")
          .eq("branchId", branchId)
          .eq("status", "UNPAID")
          .order("saleDate", { ascending: true })
          .limit(5),
        // 전체 미수금 합계
        supabase
          .from("sales")
          .select("amount, unpaid")
          .eq("branchId", branchId)
          .eq("status", "UNPAID"),
        // 홀딩 중인 회원 (soft delete 제외)
        supabase
          .from("members")
          .select("id, name, membershipStart, membershipExpiry")
          .eq("branchId", branchId)
          .is("deletedAt", null)
          .eq("status", "HOLDING")
          .limit(5),
        // 성별/연령 분포용 전체 회원 데이터 (soft delete 제외)
        supabase
          .from("members")
          .select("gender, birthDate")
          .eq("branchId", branchId)
          .is("deletedAt", null),
      ]);

      // 만료 임박 회원 상세
      const { data: expiringData } = await supabase
        .from("members")
        .select("id, name, membershipExpiry")
        .eq("branchId", branchId)
        .is("deletedAt", null)
        .eq("status", "ACTIVE")
        .gte("membershipExpiry", todayStr)
        .lte("membershipExpiry", in30DaysStr)
        .order("membershipExpiry", { ascending: true })
        .limit(5);

      // === 주간 출석 데이터 ===
      const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
      const dayOfWeek = today.getDay(); // 0=일
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + mondayOffset);
      weekStart.setHours(0, 0, 0, 0);

      const weekAttendanceData: WeeklyAttendance[] = [];
      const attendancePromises = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dStr = d.toISOString().slice(0, 10);
        attendancePromises.push(
          supabase
            .from("attendance")
            .select("id", { count: "exact", head: true })
            .eq("branchId", branchId)
            .gte("checkInAt", `${dStr}T00:00:00`)
            .lte("checkInAt", `${dStr}T23:59:59`)
        );
      }
      const weekResults = await Promise.all(attendancePromises);
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        weekAttendanceData.push({
          day: weekDays[d.getDay()],
          count: weekResults[i].count ?? 0,
        });
      }
      setWeeklyAttendance(weekAttendanceData);

      // === 월별 매출 (최근 6개월) ===
      const monthlyData: MonthlyRevenue[] = [];
      const monthPromises = [];
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const mStart = mDate.toISOString();
        const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59).toISOString();
        monthPromises.push(
          supabase
            .from("sales")
            .select("amount")
            .eq("branchId", branchId)
            .eq("status", "COMPLETED")
            .gte("saleDate", mStart)
            .lte("saleDate", mEnd)
        );
      }
      const monthResults = await Promise.all(monthPromises);
      for (let i = 5; i >= 0; i--) {
        const mDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const idx = 5 - i;
        const rows = monthResults[idx].data ?? [];
        const total = rows.reduce((sum: number, r: { amount: unknown }) => sum + (Number(r.amount) || 0), 0);
        monthlyData.push({
          month: `${mDate.getMonth() + 1}월`,
          value: total,
        });
      }
      setMonthlyRevenues(monthlyData);

      // === 이번달 매출 합계 ===
      const revenueRows = revenueRes.data ?? [];
      const monthlyRevenue = revenueRows.reduce((sum: number, r: { amount: unknown }) => sum + (Number(r.amount) || 0), 0);
      const unpaidRows = unpaidTotalRes.data ?? [];
      const unpaidTotal = unpaidRows.reduce(
        (sum: number, r: { unpaid: unknown; amount: unknown }) => sum + (Number(r.unpaid) || Number(r.amount) || 0),
        0
      );

      // === 성별/연령 분포 (실 데이터) ===
      const genderData = genderRes.data ?? [];
      const maleCount = genderData.filter((m: { gender: string }) => m.gender === "M").length;
      const femaleCount = genderData.filter((m: { gender: string }) => m.gender === "F").length;
      setGenderDist({ male: maleCount, female: femaleCount });

      // 연령대 집계
      const ageMap: Record<string, number> = {};
      genderData.forEach((m: { birthDate?: string }) => {
        if (m.birthDate) {
          const group = getAgeGroup(m.birthDate);
          ageMap[group] = (ageMap[group] || 0) + 1;
        }
      });
      const totalForAge = Object.values(ageMap).reduce((a, b) => a + b, 0);
      const ageArr = Object.entries(ageMap)
        .map(([label, count]) => ({
          label,
          value: totalForAge > 0 ? Math.round((count / totalForAge) * 100) : 0,
          color: AGE_COLORS[label] || "bg-line",
        }))
        .sort((a, b) => {
          const order = ["10대", "20대", "30대", "40대", "50대", "60대+"];
          return order.indexOf(a.label) - order.indexOf(b.label);
        });
      setAgeDist(ageArr);

      setStats({
        totalMembers: totalRes.count ?? 0,
        activeMembers: activeRes.count ?? 0,
        expiringCount: expiringRes.count ?? 0,
        expiredMembers: expiredRes.count ?? 0,
        todayAttendance: attendanceRes.count ?? 0,
        monthlyRevenue,
        monthlyAttendance: monthlyAttendanceRes.count ?? 0,
        monthlyRefundCount: refundedRes.count ?? 0,
        unpaidTotal,
      });

      // 생일자 가공
      setBirthdayMembers(
        (birthdayRes.data ?? []).map((m: { id: number; name: string; birthDate: string; status: string }) => ({
          id: m.id,
          name: m.name,
          birth: m.birthDate?.slice(0, 10) ?? "",
          status: m.status === "ACTIVE" ? "활성" : "만료",
        }))
      );

      // 미수금 가공
      setUnpaidMembers(
        (unpaidRes.data ?? []).map((s: { id: number; memberName: string; productName: string; amount: unknown; unpaid: unknown; saleDate: string }) => {
          const saleDate = new Date(s.saleDate);
          const overdueDays = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: s.id,
            name: s.memberName ?? "",
            amount: formatNumber(Number(s.unpaid) || Number(s.amount) || 0),
            item: s.productName ?? "",
            overdueDays,
          };
        })
      );

      // 홀딩 가공
      setHoldingMembers(
        (holdingRes.data ?? []).map((m: { id: number; name: string; membershipStart: string; membershipExpiry: string }) => {
          const endDate = m.membershipExpiry ? new Date(m.membershipExpiry) : null;
          const remaining = endDate
            ? Math.max(0, Math.floor((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
            : 0;
          const startStr = m.membershipStart ? m.membershipStart.slice(5, 10).replace("-", ".") : "";
          const endStr = m.membershipExpiry ? m.membershipExpiry.slice(5, 10).replace("-", ".") : "";
          return {
            id: m.id,
            name: m.name,
            period: `${startStr} ~ ${endStr}`,
            remaining,
          };
        })
      );

      // 만료 임박 가공
      setExpiringMembers(
        (expiringData ?? []).map((m: { id: number; name: string; membershipExpiry: string }) => {
          const expDate = new Date(m.membershipExpiry);
          const ddayNum = Math.max(0, Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
          return {
            id: m.id,
            name: m.name,
            expiry: m.membershipExpiry?.slice(0, 10).replace(/-/g, ".") ?? "",
            dday: `D-${ddayNum}`,
            ddayNum,
          };
        })
      );

      // 최근 활동 (audit_logs)
      const { data: auditData } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("branchId", branchId)
        .order("createdAt", { ascending: false })
        .limit(10);
      setRecentActivities(auditData ?? []);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error("[Dashboard] 데이터 로드 실패:", err);
      toast.error("대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 대시보드 로드 시 만료 회원/락커/쿠폰 일괄 동기화
    const lastSync = sessionStorage.getItem('lastDailySync');
    const today = new Date().toISOString().slice(0, 10);
    if (lastSync !== today) {
      runDailySync().then(result => {
        const total = result.expiredMembers + result.expiredLockers + result.expiredCoupons;
        if (total > 0) {
          toast.info(`만료 항목 자동 처리: 회원 ${result.expiredMembers}건, 락커 ${result.expiredLockers}건, 쿠폰 ${result.expiredCoupons}건`);
        }
        sessionStorage.setItem('lastDailySync', today);
      });
      // 즐겨찾기 회원 방문 알림
      getFavoriteVisitsToday().then(visits => {
        if (visits.length > 0) {
          const names = visits.map(v => v.name).join(', ');
          toast.info(`⭐ 즐겨찾기 회원 방문: ${names}`, { duration: 8000 });
        }
      });
    }
    fetchDashboard();
  }, [fetchDashboard]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDashboard().finally(() => setIsRefreshing(false));
  }, [fetchDashboard]);

  // 성별 비율 계산
  const totalGender = genderDist.male + genderDist.female;
  const malePct = totalGender > 0 ? Math.round((genderDist.male / totalGender) * 100) : 0;
  const femalePct = totalGender > 0 ? 100 - malePct : 0;

  // 매출 추이 최대값 (bar 높이 계산용)
  const maxRevenue = Math.max(...monthlyRevenues.map((m) => m.value), 1);
  const currentMonthIdx = monthlyRevenues.length - 1;

  // 주간 출석 최대값 (bar 높이 계산용)
  const maxAttendance = Math.max(...weeklyAttendance.map((d) => d.count), 1);

  const memberStats = [
    {
      label: "전체 회원",
      value: formatNumber(stats.totalMembers),
      icon: <Users />,
      change: { value: 0, label: "전월 대비" },
      variant: "default" as const,
      pageId: 967,
    },
    {
      label: "활성 회원",
      value: formatNumber(stats.activeMembers),
      icon: <UserCheck />,
      change: {
        value: 0,
        label: stats.totalMembers > 0
          ? `전체 ${((stats.activeMembers / stats.totalMembers) * 100).toFixed(1)}%`
          : "전체 0%",
      },
      variant: "default" as const,
      pageId: 967,
    },
    {
      label: "만료 임박",
      value: formatNumber(stats.expiringCount),
      icon: <Clock />,
      change: { value: 0, label: "30일 이내" },
      variant: "peach" as const,
      pageId: 967,
    },
    {
      label: "만료 회원",
      value: formatNumber(stats.expiredMembers),
      icon: <UserMinus />,
      change: {
        value: 0,
        label: stats.totalMembers > 0
          ? `전체 ${((stats.expiredMembers / stats.totalMembers) * 100).toFixed(1)}%`
          : "전체 0%",
      },
      variant: "default" as const,
      pageId: 967,
    },
    {
      label: "오늘 출석",
      value: formatNumber(stats.todayAttendance),
      icon: <Calendar />,
      change: { value: 0, label: "어제 대비" },
      variant: "default" as const,
      pageId: 968,
    },
    {
      label: "이번달 매출",
      value: formatAmount(stats.monthlyRevenue),
      icon: <DollarSign />,
      change: { value: 0, label: "목표 대비" },
      variant: "default" as const,
      pageId: 970,
    },
    {
      label: "활성 회원 비율",
      value: `${stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(1) : "0.0"}%`,
      icon: <TrendingUp />,
      change: {
        value: 0,
        label: `${formatNumber(stats.activeMembers)} / ${formatNumber(stats.totalMembers)}명`,
      },
      variant: "mint" as const,
      pageId: 967,
    },
    {
      label: "월 방문 빈도",
      value: `${stats.activeMembers > 0 ? (stats.monthlyAttendance / stats.activeMembers).toFixed(1) : "0.0"}회`,
      icon: <RefreshCw />,
      change: {
        value: 0,
        label: `이번달 출석 ${formatNumber(stats.monthlyAttendance)}건`,
      },
      variant: "default" as const,
      pageId: 968,
    },
    {
      label: "미수금 총액",
      value: `${formatAmount(stats.unpaidTotal)}원`,
      icon: <AlertCircle />,
      change: {
        value: 0,
        label: "미납 합계",
      },
      variant: "peach" as const,
      pageId: 970,
    },
    {
      label: "이번달 환불",
      value: `${formatNumber(stats.monthlyRefundCount)}건`,
      icon: <RefreshCw />,
      change: {
        value: 0,
        label: "REFUNDED 기준",
      },
      variant: "peach" as const,
      pageId: 970,
    },
  ];

  function getDdayVariant(ddayNum: number): "error" | "warning" | "default" {
    if (ddayNum <= 3) return "error";
    if (ddayNum <= 7) return "warning";
    return "default";
  }

  return (
    <AppLayout>
      {/* 공지 배너 */}
      {showBanner && (
        <div className="mb-lg flex items-center justify-between rounded-xl bg-primary-light border border-primary/10 px-lg py-md">
          <div className="flex items-center gap-md">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-content">신규 '전자계약' 기능이 업데이트 되었습니다!</p>
              <p className="text-[12px] text-content-secondary">종이 계약서 대신 모바일로 간편하게 서명을 받으세요.</p>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button
              className="rounded-lg bg-primary px-md py-[6px] text-[12px] font-semibold text-white hover:bg-primary-dark transition-colors"
              onClick={() => moveToPage(977)}
            >
              기능 보기
            </button>
            <button className="text-content-tertiary hover:text-content transition-colors" onClick={() => setShowBanner(false)}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 페이지 헤더 */}
      <PageHeader
        title="대시보드"
        description={`${branchName}의 실시간 센터 운영 현황입니다.`}
        actions={
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-[6px] rounded-lg border border-line bg-surface px-md py-[6px]">
              <span className="text-[12px] text-content-tertiary">갱신: {formatTime(lastRefreshed)}</span>
              <button
                className={cn("text-content-tertiary hover:text-primary transition-colors", isRefreshing && "animate-spin text-primary")}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <Button variant="primary" size="sm" onClick={() => moveToPage(986)}>
              회원 신규 등록
            </Button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={6} className="mb-xl">
        {memberStats.map((stat, idx) => (
          <StatCard key={idx} {...stat} loading={isLoading} onClick={() => moveToPage(stat.pageId)} />
        ))}
      </StatCardGrid>

      {/* 운영 현황 차트 */}
      <div className="mb-xl">
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-content">운영 현황</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {/* 회원 분포 (실 데이터) */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">회원 분포</h3>
              <StatusBadge variant="info">전체회원 기준</StatusBadge>
            </div>
            <div className="flex items-center gap-xl">
              <div className="relative h-20 w-20 shrink-0">
                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                  <circle className="stroke-surface-tertiary" cx="18" cy="18" r="16" fill="none" strokeWidth="3.5" />
                  {totalGender > 0 && (
                    <>
                      <circle
                        className="stroke-primary"
                        cx="18" cy="18" r="16" fill="none" strokeWidth="3.5"
                        strokeDasharray={`${femalePct} ${100 - femalePct}`}
                        strokeLinecap="round"
                      />
                      <circle
                        className="stroke-accent"
                        cx="18" cy="18" r="16" fill="none" strokeWidth="3.5"
                        strokeDasharray={`${malePct} ${100 - malePct}`}
                        strokeDashoffset={`-${femalePct}`}
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-content">{totalGender}명</span>
                </div>
              </div>
              <div className="flex-1 space-y-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-[12px] text-content-secondary">여성</span>
                  </div>
                  <span className="text-[12px] font-semibold text-content">{femalePct}% ({genderDist.female}명)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-[6px]">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-[12px] text-content-secondary">남성</span>
                  </div>
                  <span className="text-[12px] font-semibold text-content">{malePct}% ({genderDist.male}명)</span>
                </div>
              </div>
            </div>
            {ageDist.length > 0 && (
              <div className="mt-lg space-y-sm">
                {ageDist.map((age) => (
                  <div key={age.label} className="space-y-[3px]">
                    <div className="flex items-center justify-between text-[11px] text-content-secondary">
                      <span>{age.label}</span>
                      <span className="font-semibold">{age.value}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all", age.color)} style={{ width: `${age.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {ageDist.length === 0 && (
              <div className="mt-lg flex items-center justify-center h-16 text-[12px] text-content-tertiary">
                생년월일 데이터가 없습니다
              </div>
            )}
          </div>

          {/* 주간 출석 (실 데이터 - bar chart) */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">주간 출석</h3>
              <span className="text-[11px] text-content-tertiary">이번 주</span>
            </div>
            <div className="flex h-[180px] items-end justify-between gap-[6px]">
              {weeklyAttendance.map((d, idx) => {
                const heightPct = maxAttendance > 0 ? (d.count / maxAttendance) * 100 : 0;
                const isToday = idx === ((new Date().getDay() + 6) % 7); // 월=0
                return (
                  <div className="group relative flex flex-1 flex-col items-center justify-end h-full gap-[4px]" key={d.day}>
                    {d.count > 0 && (
                      <span className="text-[10px] font-semibold text-content-secondary mb-[2px]">{d.count}</span>
                    )}
                    <div
                      className={cn(
                        "w-full max-w-[32px] rounded-t-md transition-all",
                        isToday ? "bg-primary" : "bg-accent/60",
                        d.count === 0 && "bg-surface-tertiary"
                      )}
                      style={{ height: d.count > 0 ? `${Math.max(heightPct, 8)}%` : "4px" }}
                    />
                    <span className={cn("text-[10px] font-medium shrink-0", isToday ? "text-primary font-bold" : "text-content-tertiary")}>
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-md flex items-center justify-between rounded-lg bg-surface-secondary p-md">
              <div>
                <p className="text-[11px] text-content-secondary">오늘 총 방문</p>
                <p className="text-[18px] font-bold text-content">{formatNumber(stats.todayAttendance)}명</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-content-tertiary">실시간</p>
                <p className="text-[13px] font-semibold text-state-success">Live</p>
              </div>
            </div>
          </div>

          {/* 매출 추이 (실 데이터 - bar chart) */}
          <div className="rounded-xl border border-line bg-surface p-lg">
            <div className="mb-md flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-content">매출 추이</h3>
              <span className="text-[11px] text-content-tertiary">최근 6개월</span>
            </div>
            <div className="flex h-[180px] items-end justify-between gap-[6px]">
              {monthlyRevenues.map((d, idx) => {
                const heightPct = maxRevenue > 0 ? (d.value / maxRevenue) * 100 : 0;
                const isCurrent = idx === currentMonthIdx;
                return (
                  <div className="group relative flex flex-1 flex-col items-center justify-end h-full gap-[4px]" key={d.month}>
                    <div
                      className={cn(
                        "w-full max-w-[32px] rounded-t-md transition-all group-hover:opacity-80",
                        isCurrent ? "bg-primary" : "bg-accent/60",
                        d.value === 0 && "bg-surface-tertiary"
                      )}
                      style={{ height: d.value > 0 ? `${Math.max(heightPct, 8)}%` : "4px" }}
                    />
                    <span className="text-[10px] text-content-tertiary shrink-0">{d.month}</span>
                    {d.value > 0 && (
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-content px-[6px] py-[2px] text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {formatAmount(d.value)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-md grid grid-cols-2 gap-sm">
              <div className="rounded-lg bg-surface-secondary p-sm">
                <p className="text-[11px] text-content-tertiary">이번달 매출</p>
                <div className="flex items-center justify-between mt-[2px]">
                  <span className="text-[14px] font-bold text-content">{formatAmount(stats.monthlyRevenue)}</span>
                </div>
              </div>
              <div className="rounded-lg bg-surface-secondary p-sm">
                <p className="text-[11px] text-content-tertiary">활성 회원</p>
                <div className="flex items-center justify-between mt-[2px]">
                  <span className="text-[14px] font-bold text-content">{formatNumber(stats.activeMembers)}명</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="mb-xl rounded-xl border border-line bg-surface p-lg">
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-content">📋 최근 활동</h2>
          <button
            className="flex items-center gap-[3px] text-[12px] font-medium text-primary hover:underline"
            onClick={() => moveToPage(990)}
          >
            더보기
            <ArrowRight size={12} />
          </button>
        </div>
        {recentActivities.length > 0 ? (
          <ul className="divide-y divide-line">
            {recentActivities.map((log) => {
              const actionIconMap: Record<string, string> = {
                CREATE: "👤",
                LOGIN: "🔑",
                UPDATE: "✏️",
                DELETE: "🗑",
                REFUND: "↩️",
              };
              const icon = actionIconMap[log.action] ?? "📝";
              const timeStr = new Date(log.createdAt).toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
              return (
                <li key={log.id} className="flex items-center gap-md py-sm">
                  <span className="w-[38px] shrink-0 text-[11px] text-content-tertiary">{timeStr}</span>
                  <span className="text-[14px]">{icon}</span>
                  <span className="text-[12px] text-content">
                    {log.userName} {log.action} — {log.targetType} #{log.targetId}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center py-lg text-[12px] text-content-tertiary">
            최근 활동 내역이 없습니다
          </div>
        )}
      </div>

      {/* 리스트 카드 */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-md">
        <div className="space-y-md">
          {/* 생일자 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <Gift size={16} className="text-primary" />
                <h3 className="text-[13px] font-semibold text-content">오늘 생일자 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-primary">{birthdayMembers.length}명</span>
            </div>
            <div className="p-sm">
              {birthdayMembers.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "name", header: "이름", align: "left" },
                    { key: "birth", header: "생년월일", align: "center" },
                    {
                      key: "status", header: "상태", align: "center",
                      render: (val) => <StatusBadge variant={val === "활성" ? "success" : "default"}>{val}</StatusBadge>,
                    },
                    {
                      key: "action", header: "", align: "right",
                      render: (_val, row) => (
                        <button className="p-xs text-content-tertiary hover:text-primary transition-colors" onClick={() => moveToPage(985, { id: String(row.id) })}>
                          <ChevronRight size={14} />
                        </button>
                      ),
                    },
                  ]}
                  data={birthdayMembers}
                />
              ) : (
                <div className="flex items-center justify-center py-lg text-[12px] text-content-tertiary">
                  오늘 생일자가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 미수금 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <AlertCircle size={16} className="text-state-error" />
                <h3 className="text-[13px] font-semibold text-content">미수금 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-state-error">{unpaidMembers.length}건</span>
            </div>
            <div className="p-sm">
              {unpaidMembers.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "name", header: "이름", align: "left" },
                    { key: "item", header: "상품명", align: "left" },
                    {
                      key: "overdueDays", header: "연체", align: "center",
                      render: (val: number) => val > 30 ? <StatusBadge variant="error">장기미납</StatusBadge> : <span className="text-[12px] text-content-secondary">{val}일</span>,
                    },
                    {
                      key: "amount", header: "미납 금액", align: "right",
                      render: (val) => <span className="font-semibold text-content">{val}원</span>,
                    },
                    {
                      key: "action", header: "", align: "right",
                      render: () => (
                        <button className="rounded-md bg-primary-light px-[8px] py-[3px] text-[11px] font-medium text-primary hover:bg-primary hover:text-white transition-all" onClick={() => moveToPage(971)}>
                          결제
                        </button>
                      ),
                    },
                  ]}
                  data={unpaidMembers}
                />
              ) : (
                <div className="flex items-center justify-center py-lg text-[12px] text-content-tertiary">
                  미수금 내역이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-md">
          {/* 홀딩 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <PauseCircle size={16} className="text-content-secondary" />
                <h3 className="text-[13px] font-semibold text-content">연기(홀딩) 중인 회원</h3>
              </div>
              <span className="text-[12px] font-semibold text-content-secondary">{holdingMembers.length}명</span>
            </div>
            <div className="p-sm">
              {holdingMembers.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "name", header: "이름", align: "left" },
                    { key: "period", header: "홀딩 기간", align: "center" },
                    {
                      key: "remaining", header: "잔여일", align: "center",
                      render: (val) => <StatusBadge variant="info" dot>{val}일</StatusBadge>,
                    },
                    {
                      key: "action", header: "", align: "right",
                      render: (_val, row) => (
                        <button className="p-xs text-content-tertiary hover:text-primary transition-colors" onClick={() => moveToPage(985, { id: String(row.id) })}>
                          <ChevronRight size={14} />
                        </button>
                      ),
                    },
                  ]}
                  data={holdingMembers}
                />
              ) : (
                <div className="flex items-center justify-center py-lg text-[12px] text-content-tertiary">
                  홀딩 중인 회원이 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 만료 임박 */}
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <div className="flex items-center gap-sm">
                <Hourglass size={16} className="text-amber-500" />
                <h3 className="text-[13px] font-semibold text-content">이용권 만료 임박</h3>
              </div>
              <span className="text-[12px] font-semibold text-content">{expiringMembers.length}명</span>
            </div>
            <div className="p-sm">
              {expiringMembers.length > 0 ? (
                <DataTable
                  columns={[
                    { key: "name", header: "이름", align: "left" },
                    { key: "expiry", header: "만료 예정일", align: "center" },
                    {
                      key: "dday", header: "D-Day", align: "center",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      render: (val: any, row: any) => <StatusBadge variant={getDdayVariant(row.ddayNum)}>{val}</StatusBadge>,
                    },
                    {
                      key: "action", header: "", align: "right",
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      render: (_val: any, row: any) => (
                        <button
                          className="rounded-md bg-primary-light px-[8px] py-[3px] text-[11px] font-medium text-primary hover:bg-primary hover:text-white transition-all"
                          onClick={() => moveToPage(985, { id: String(row.id) })}
                        >
                          재등록 상담
                        </button>
                      ),
                    },
                  ]}
                  data={expiringMembers}
                />
              ) : (
                <div className="flex items-center justify-center py-lg text-[12px] text-content-tertiary">
                  만료 임박 회원이 없습니다
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 프로모션 배너 */}
      <div className="mt-xl grid grid-cols-1 lg:grid-cols-2 gap-md">
        <div
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dark p-xl text-white cursor-pointer transition-transform hover:scale-[1.005]"
          onClick={() => moveToPage(983)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-white/20 px-sm py-[3px] text-[10px] font-semibold backdrop-blur-sm">Premium</span>
            <h4 className="mt-md text-[17px] font-bold leading-snug">구독형 키오스크 패키지<br />출시 기념 30% 할인!</h4>
            <p className="mt-sm text-[12px] text-white/70">무인 센터 운영을 시작해보세요.</p>
            <div className="mt-md flex items-center gap-xs text-[13px] font-semibold">
              <span>혜택 보기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={14} />
            </div>
          </div>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-2xl" />
        </div>

        <div
          className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-content to-content-secondary p-xl text-white cursor-pointer transition-transform hover:scale-[1.005]"
          onClick={() => moveToPage(980)}
        >
          <div className="relative z-10">
            <span className="rounded-full bg-white/20 px-sm py-[3px] text-[10px] font-semibold backdrop-blur-sm">Automation</span>
            <h4 className="mt-md text-[17px] font-bold leading-snug">알림톡 자동 발송으로<br />재등록률을 높이세요</h4>
            <p className="mt-sm text-[12px] text-white/70">만료 전 안내, 생일 축하 메시지를 자동 발송합니다.</p>
            <div className="mt-md flex items-center gap-xs text-[13px] font-semibold">
              <span>설정 바로가기</span>
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" size={14} />
            </div>
          </div>
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
        </div>
      </div>
    </AppLayout>
  );
}
