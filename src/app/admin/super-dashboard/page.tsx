import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  UserCheck,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ShieldAlert,
  Clock,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getBranches, type Branch } from '@/api/endpoints/auth';
import { getAuditLogs, type AuditLogEntry } from '@/api/endpoints/auditLog';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// ─── 유틸 ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.round(amount / 10_000)}만`;
  return amount.toLocaleString('ko-KR');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── 타입 ──────────────────────────────────────────────────────────────────

interface KpiData {
  totalMembers: number;
  totalRevenue: number;
  todayAttendance: number;
  totalStaff: number;
  newMembers: number;
  expiringMembers: number;
  expiredMembers: number;
  // 전월 대비 계산용
  prevMonthMembers: number;
  prevMonthRevenue: number;
  yesterdayAttendance: number;
}

interface BranchStats {
  members: number;
  staff: number;
  revenue: number;
  expiredMembers: number;
  todayAttendance: number;
}

// ─── 지점 상태 배지 ────────────────────────────────────────────────────────

function BranchStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase?.() ?? '';
  // 폐점: CLOSED, closed, 폐점
  if (s === 'closed' || status === '폐점') {
    return (
      <span className="inline-flex items-center gap-[4px] rounded-full bg-red-50 px-[8px] py-[3px] text-[11px] font-medium text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        폐점
      </span>
    );
  }
  // 휴업: SUSPENDED, suspended, inactive, 임시휴업
  if (s === 'suspended' || s === 'inactive' || status === '임시휴업') {
    return (
      <span className="inline-flex items-center gap-[4px] rounded-full bg-amber-50 px-[8px] py-[3px] text-[11px] font-medium text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        휴업
      </span>
    );
  }
  // 운영중: ACTIVE, active, 운영중 또는 기타
  return (
    <span className="inline-flex items-center gap-[4px] rounded-full bg-green-50 px-[8px] py-[3px] text-[11px] font-medium text-green-600">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      운영중
    </span>
  );
}

// ─── KPI 카드 ──────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  change: number; // 양수=증가, 음수=감소
  changeLabel: string;
  loading?: boolean;
}

function KpiCard({ label, value, icon, change, changeLabel, loading }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-line flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-content-secondary font-medium">{label}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-24 rounded-md bg-surface-secondary animate-pulse" />
      ) : (
        <p className="text-[28px] font-bold text-content leading-none">{value}</p>
      )}
      <div className="flex items-center gap-[4px]">
        {change >= 0 ? (
          <ArrowUpRight size={14} className="text-green-500 shrink-0" />
        ) : (
          <ArrowDownRight size={14} className="text-red-500 shrink-0" />
        )}
        <span className={cn('text-[12px] font-semibold', change >= 0 ? 'text-green-600' : 'text-red-500')}>
          {change >= 0 ? '+' : ''}{change}%
        </span>
        <span className="text-[11px] text-content-tertiary">{changeLabel}</span>
      </div>
    </div>
  );
}

// ─── 감사 로그 액션 라벨 ───────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  LOGIN: '로그인',
  LOGOUT: '로그아웃',
  LOGIN_FAILED: '로그인 실패',
  CREATE: '생성',
  UPDATE: '수정',
  DELETE: '삭제',
  BRANCH_SWITCH: '지점 전환',
  ROLE_CHANGE: '권한 변경',
  RESIGN: '퇴직',
  TRANSFER: '이동',
  LEAVE_START: '휴직 시작',
  LEAVE_END: '휴직 종료',
  MEMBER_TRANSFER: '회원 이적',
  MEMBER_WITHDRAW: '회원 탈퇴',
  REFUND: '환불',
  EXPORT: '내보내기',
  SETTINGS_CHANGE: '설정 변경',
  BRANCH_CREATE: '지점 생성',
  BRANCH_CLOSE: '지점 폐점',
  SUPER_ADMIN_GRANT: '슈퍼관리자 권한 부여',
  SUPER_ADMIN_REVOKE: '슈퍼관리자 권한 회수',
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function SuperDashboard() {
  const navigate = useNavigate();
  const { user, switchBranch } = useAuthStore();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(() => new Date());

  const [kpiData, setKpiData] = useState<KpiData>({
    totalMembers: 0,
    totalRevenue: 0,
    todayAttendance: 0,
    totalStaff: 0,
    newMembers: 0,
    expiringMembers: 0,
    expiredMembers: 0,
    prevMonthMembers: 0,
    prevMonthRevenue: 0,
    yesterdayAttendance: 0,
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchStats, setBranchStats] = useState<Record<number, BranchStats>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // ─── 지점별 통계 조회 ────────────────────────────────────────────────────

  const fetchBranchStats = useCallback(async (branchList: Branch[]) => {
    // TODO: 통합 API 구현 시 교체 — 현재는 지점별 병렬 조회
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const statsMap: Record<number, BranchStats> = {};

    await Promise.all(
      branchList.map(async (branch) => {
        const [membersRes, staffRes, revenueRes, attendanceRes, expiredRes] = await Promise.all([
          supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('branchId', branch.id)
            .eq('status', 'ACTIVE')
            .is('deletedAt', null),
          supabase
            .from('users')
            .select('id', { count: 'exact', head: true })
            .eq('branchId', branch.id)
            .eq('isActive', true),
          supabase
            .from('sales')
            .select('amount')
            .eq('branchId', branch.id)
            .eq('status', 'COMPLETED')
            .gte('saleDate', monthStart)
            .lte('saleDate', monthEnd),
          supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('branchId', branch.id)
            .gte('checkInAt', `${todayStr}T00:00:00`)
            .lte('checkInAt', `${todayStr}T23:59:59`),
          supabase
            .from('members')
            .select('id', { count: 'exact', head: true })
            .eq('branchId', branch.id)
            .eq('status', 'EXPIRED')
            .is('deletedAt', null),
        ]);

        const revenue = (revenueRes.data ?? []).reduce(
          (sum: number, r: { amount: unknown }) => sum + (Number(r.amount) || 0),
          0
        );

        statsMap[branch.id] = {
          members: membersRes.count ?? 0,
          staff: staffRes.count ?? 0,
          revenue,
          expiredMembers: expiredRes.count ?? 0,
          todayAttendance: attendanceRes.count ?? 0,
        };
      })
    );

    setBranchStats(statsMap);

    // TODO: 통합 API 구현 시 교체 — 전 지점 합산 KPI 계산
    const totalMembers = Object.values(statsMap).reduce((s, b) => s + b.members, 0);
    const totalRevenue = Object.values(statsMap).reduce((s, b) => s + b.revenue, 0);
    const totalStaff = Object.values(statsMap).reduce((s, b) => s + b.staff, 0);

    // 오늘 전 지점 출석 합산
    const attendanceResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branch.id)
          .gte('checkInAt', `${todayStr}T00:00:00`)
          .lte('checkInAt', `${todayStr}T23:59:59`)
      )
    );
    const todayAttendance = attendanceResults.reduce((s, r) => s + (r.count ?? 0), 0);

    // 신규/만료예정/만료 회원 전 지점 합산
    const newMemberResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branch.id)
          .is('deletedAt', null)
          .gte('registeredAt', monthStart)
          .lte('registeredAt', monthEnd)
      )
    );
    const newMembers = newMemberResults.reduce((s, r) => s + (r.count ?? 0), 0);

    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    const in30DaysStr = in30Days.toISOString().slice(0, 10);

    const expiringResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branch.id)
          .is('deletedAt', null)
          .eq('status', 'ACTIVE')
          .gte('membershipExpiry', todayStr)
          .lte('membershipExpiry', in30DaysStr)
      )
    );
    const expiringMembers = expiringResults.reduce((s, r) => s + (r.count ?? 0), 0);

    const expiredResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branch.id)
          .is('deletedAt', null)
          .eq('status', 'EXPIRED')
      )
    );
    const expiredMembers = expiredResults.reduce((s, r) => s + (r.count ?? 0), 0);

    // 전월 매출 합산 (MoM 계산용)
    const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59).toISOString();
    const prevRevenueResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('sales')
          .select('amount')
          .eq('branchId', branch.id)
          .eq('status', 'COMPLETED')
          .gte('saleDate', prevMonthStart)
          .lte('saleDate', prevMonthEnd)
      )
    );
    const prevMonthRevenue = prevRevenueResults.reduce(
      (s, r) => s + (r.data ?? []).reduce((sum: number, row: { amount: unknown }) => sum + (Number(row.amount) || 0), 0),
      0
    );

    // 전월 회원 수 (전월 말 기준 활성 회원 — 근사치: 현재 활성 - 이번달 신규 + 이번달 만료)
    const prevMonthMembers = Math.max(0, totalMembers - newMembers + expiredMembers);

    // 어제 출석 합산
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const yesterdayAttResults = await Promise.all(
      branchList.map((branch) =>
        supabase
          .from('attendance')
          .select('id', { count: 'exact', head: true })
          .eq('branchId', branch.id)
          .gte('checkInAt', `${yesterdayStr}T00:00:00`)
          .lte('checkInAt', `${yesterdayStr}T23:59:59`)
      )
    );
    const yesterdayAttendance = yesterdayAttResults.reduce((s, r) => s + (r.count ?? 0), 0);

    setKpiData({ totalMembers, totalRevenue, todayAttendance, totalStaff, newMembers, expiringMembers, expiredMembers, prevMonthMembers, prevMonthRevenue, yesterdayAttendance });
  }, []);

  // ─── 전체 데이터 로드 ────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      // 지점 목록 (슈퍼관리자는 전체, tenantId 기준)
      const tenantId = user?.tenantId ? Number(user.tenantId) : undefined;
      const [branchRes, auditRes] = await Promise.all([
        getBranches(tenantId),
        getAuditLogs({ page: 1, size: 10 }),
      ]);

      if (branchRes.success) {
        setBranches(branchRes.data);
        await fetchBranchStats(branchRes.data);
      } else {
        toast.error('지점 목록을 불러오지 못했습니다.');
      }

      if (auditRes.success) {
        setAuditLogs(auditRes.data.data);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[SuperDashboard] 데이터 로드 실패:', err);
      toast.error('대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId, fetchBranchStats]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchAll().finally(() => setIsRefreshing(false));
  }, [fetchAll]);

  // ─── 지점 전환 ───────────────────────────────────────────────────────────

  const handleSwitchBranch = (branch: Branch) => {
    switchBranch(String(branch.id), branch.name);
    toast.success(`"${branch.name}" 지점으로 전환되었습니다.`);
    navigate('/');
  };

  // ─── 권한 없음 ───────────────────────────────────────────────────────────

  if (!isSuperAdmin) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-md text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-400">
            <ShieldAlert size={32} />
          </div>
          <div>
            <p className="text-[18px] font-bold text-content">접근 권한이 없습니다</p>
            <p className="mt-xs text-[13px] text-content-secondary">
              이 페이지는 슈퍼관리자 전용 메뉴입니다.
            </p>
          </div>
          <button
            className="mt-sm rounded-lg bg-primary px-lg py-[8px] text-[13px] font-semibold text-white hover:bg-primary-dark transition-colors"
            onClick={() => navigate('/')}
          >
            대시보드로 이동
          </button>
        </div>
      </AppLayout>
    );
  }

  // ─── KPI 정의 ────────────────────────────────────────────────────────────

  // 전월 대비 변동률 계산 함수
  const mom = (curr: number, prev: number): number =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;

  const memberChange = mom(kpiData.totalMembers, kpiData.prevMonthMembers);
  const revenueChange = mom(kpiData.totalRevenue, kpiData.prevMonthRevenue);
  const attendanceChange = kpiData.yesterdayAttendance > 0
    ? mom(kpiData.todayAttendance, kpiData.yesterdayAttendance)
    : 0;

  const kpiCards = [
    {
      label: '전체 회원',
      value: kpiData.totalMembers.toLocaleString('ko-KR') + '명',
      icon: <Users size={18} />,
      change: memberChange,
      changeLabel: '전월 대비',
    },
    {
      label: '전체 매출',
      value: formatAmount(kpiData.totalRevenue) + '원',
      icon: <DollarSign size={18} />,
      change: revenueChange,
      changeLabel: '이번달 전월 대비',
    },
    {
      label: '전체 출석',
      value: kpiData.todayAttendance.toLocaleString('ko-KR') + '명',
      icon: <UserCheck size={18} />,
      change: attendanceChange,
      changeLabel: '어제 대비',
    },
    {
      label: '전체 직원',
      value: kpiData.totalStaff.toLocaleString('ko-KR') + '명',
      icon: <LayoutDashboard size={18} />,
      change: 0,
      changeLabel: '전월 대비',
    },
    {
      label: '이번달 신규',
      value: kpiData.newMembers.toLocaleString('ko-KR') + '명',
      icon: <ArrowUpRight size={18} />,
      change: 0,
      changeLabel: '이번달',
    },
    {
      label: '만료 예정 (30일)',
      value: kpiData.expiringMembers.toLocaleString('ko-KR') + '명',
      icon: <Clock size={18} />,
      change: 0,
      changeLabel: '30일 이내',
    },
    {
      label: '만료 회원',
      value: kpiData.expiredMembers.toLocaleString('ko-KR') + '명',
      icon: <ShieldAlert size={18} />,
      change: 0,
      changeLabel: '현재',
    },
  ];

  // ─── 렌더 ────────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      {/* 페이지 헤더 */}
      <PageHeader
        title="통합 대시보드"
        description="전체 지점 현황을 한눈에 확인하세요."
        actions={
          <div className="flex items-center gap-sm">
            <div className="flex items-center gap-[6px] rounded-lg border border-line bg-surface px-md py-[6px]">
              <span className="text-[12px] text-content-tertiary">갱신: {formatTime(lastRefreshed)}</span>
              <button
                className={cn(
                  'text-content-tertiary hover:text-primary transition-colors',
                  isRefreshing && 'animate-spin text-primary'
                )}
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw size={13} />
              </button>
            </div>
            <span className="inline-flex items-center gap-[6px] rounded-full bg-primary/10 px-md py-[5px] text-[12px] font-semibold text-primary">
              <ShieldAlert size={13} />
              슈퍼관리자 모드
            </span>
          </div>
        }
      />

      {/* ── 섹션 1: KPI 카드 ─────────────────────────────────────────────── */}
      <section className="mb-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {kpiCards.map((card) => (
            <KpiCard key={card.label} {...card} loading={loading} />
          ))}
        </div>
      </section>

      {/* ── 섹션 2: 위험 신호 ────────────────────────────────────────────── */}
      {(() => {
        const activeBranchCount = branches.length;
        const avgRevenue = activeBranchCount > 0
          ? Object.values(branchStats).reduce((s, b) => s + b.revenue, 0) / activeBranchCount
          : 0;

        const alerts: { branch: Branch; reasons: string[] }[] = [];

        branches.forEach((branch) => {
          const stats = branchStats[branch.id];
          if (!stats) return;

          const reasons: string[] = [];

          // 규칙 1: 매출 급감 — 이번달 매출이 0이거나 전 지점 평균의 50% 이하
          if (stats.revenue === 0 || (avgRevenue > 0 && stats.revenue <= avgRevenue * 0.5)) {
            reasons.push(
              stats.revenue === 0
                ? '이번달 매출 없음'
                : `매출 급감 (평균 대비 ${Math.round((stats.revenue / avgRevenue) * 100)}%)`
            );
          }

          // 규칙 2: 만료 회원 급증 — 만료 회원이 활성 회원의 30% 이상
          if (stats.members > 0 && stats.expiredMembers >= stats.members * 0.3) {
            reasons.push(
              `만료 회원 급증 (활성 대비 ${Math.round((stats.expiredMembers / stats.members) * 100)}%)`
            );
          }

          // 규칙 3: 출석 저조 — 오늘 출석이 활성 회원의 10% 이하
          if (stats.members > 0 && stats.todayAttendance <= stats.members * 0.1) {
            reasons.push(
              `출석 저조 (활성 대비 ${Math.round((stats.todayAttendance / stats.members) * 100)}%)`
            );
          }

          if (reasons.length > 0) {
            alerts.push({ branch, reasons });
          }
        });

        if (loading || alerts.length === 0) return null;

        return (
          <section className="mb-xl">
            <div className="mb-md flex items-center gap-sm">
              <AlertTriangle size={17} className="text-amber-500" />
              <h2 className="text-[16px] font-semibold text-content">위험 신호</h2>
              <span className="ml-xs text-[13px] font-normal text-content-tertiary">
                ({alerts.length}개 지점)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
              {alerts.map(({ branch, reasons }) => (
                <div
                  key={branch.id}
                  className="flex items-start gap-md rounded-xl border border-amber-200 bg-amber-50 p-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-500">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-amber-900 truncate">{branch.name}</p>
                    <ul className="mt-[4px] space-y-[3px]">
                      {reasons.map((reason) => (
                        <li key={reason} className="text-[12px] text-amber-700 flex items-center gap-[4px]">
                          <span className="inline-block h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* ── 섹션 3: 지점별 현황 ─────────────────────────────────────────── */}
      <section className="mb-xl">
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-content flex items-center gap-sm">
            <Building2 size={17} className="text-primary" />
            지점별 현황
            <span className="ml-xs text-[13px] font-normal text-content-tertiary">
              ({branches.length}개 지점)
            </span>
          </h2>
          <button
            className="flex items-center gap-xs text-[12px] text-primary font-medium hover:underline"
            onClick={() => navigate('/branches')}
          >
            지점 관리
            <ExternalLink size={12} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-line p-lg space-y-md animate-pulse">
                <div className="h-4 w-1/2 rounded bg-surface-secondary" />
                <div className="h-3 w-1/3 rounded bg-surface-secondary" />
                <div className="grid grid-cols-3 gap-sm">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-10 rounded-lg bg-surface-secondary" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : branches.length === 0 ? (
          <div className="flex items-center justify-center rounded-xl border border-line bg-surface py-xl text-[13px] text-content-tertiary">
            등록된 지점이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {branches.map((branch) => {
              const stats = branchStats[branch.id];
              return (
                <div
                  key={branch.id}
                  className="bg-white rounded-xl border border-line p-lg flex flex-col gap-md hover:shadow-md transition-shadow"
                >
                  {/* 지점 헤더 */}
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex items-center gap-sm min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-content truncate">{branch.name}</p>
                        {branch.address && (
                          <p className="text-[11px] text-content-tertiary truncate">{branch.address}</p>
                        )}
                      </div>
                    </div>
                    <BranchStatusBadge status={branch.status} />
                  </div>

                  {/* 통계 */}
                  <div className="grid grid-cols-3 gap-sm">
                    <div className="rounded-lg bg-surface-secondary p-sm text-center">
                      <p className="text-[10px] text-content-tertiary mb-[2px]">활성 회원</p>
                      {stats ? (
                        <p className="text-[15px] font-bold text-content">
                          {stats.members.toLocaleString('ko-KR')}
                          <span className="text-[10px] font-normal text-content-tertiary ml-[2px]">명</span>
                        </p>
                      ) : (
                        <div className="h-5 w-full rounded bg-surface-secondary animate-pulse mx-auto" />
                      )}
                    </div>
                    <div className="rounded-lg bg-surface-secondary p-sm text-center">
                      <p className="text-[10px] text-content-tertiary mb-[2px]">직원</p>
                      {stats ? (
                        <p className="text-[15px] font-bold text-content">
                          {stats.staff.toLocaleString('ko-KR')}
                          <span className="text-[10px] font-normal text-content-tertiary ml-[2px]">명</span>
                        </p>
                      ) : (
                        <div className="h-5 w-full rounded bg-surface-secondary animate-pulse mx-auto" />
                      )}
                    </div>
                    <div className="rounded-lg bg-surface-secondary p-sm text-center">
                      <p className="text-[10px] text-content-tertiary mb-[2px]">이번달 매출</p>
                      {stats ? (
                        <p className="text-[15px] font-bold text-content">
                          {formatAmount(stats.revenue)}
                        </p>
                      ) : (
                        <div className="h-5 w-full rounded bg-surface-secondary animate-pulse mx-auto" />
                      )}
                    </div>
                  </div>

                  {/* 상세 보기 버튼 */}
                  <button
                    className="flex w-full items-center justify-center gap-xs rounded-lg border border-primary/30 bg-primary/5 py-[7px] text-[12px] font-semibold text-primary hover:bg-primary hover:text-white transition-all"
                    onClick={() => handleSwitchBranch(branch)}
                  >
                    상세 보기
                    <ChevronRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 섹션 4: 최근 감사 로그 ───────────────────────────────────────── */}
      <section>
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-[16px] font-semibold text-content flex items-center gap-sm">
            <Clock size={17} className="text-primary" />
            최근 활동 (감사 로그)
          </h2>
          <button
            className="flex items-center gap-xs text-[12px] text-primary font-medium hover:underline"
            onClick={() => navigate('/audit-log')}
          >
            전체 보기
            <ExternalLink size={12} />
          </button>
        </div>

        <div className="bg-white rounded-xl border border-line overflow-hidden">
          {loading ? (
            <div className="divide-y divide-line">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-md px-lg py-md animate-pulse">
                  <div className="h-3 w-24 rounded bg-surface-secondary shrink-0" />
                  <div className="h-3 w-16 rounded bg-surface-secondary shrink-0" />
                  <div className="h-3 w-20 rounded bg-surface-secondary shrink-0" />
                  <div className="h-3 flex-1 rounded bg-surface-secondary" />
                </div>
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex items-center justify-center py-xl text-[13px] text-content-tertiary">
              감사 로그가 없습니다.
            </div>
          ) : (
            <>
              {/* 헤더 */}
              <div className="grid grid-cols-[120px_100px_110px_1fr] gap-md px-lg py-[10px] border-b border-line bg-surface-secondary">
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">시간</span>
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">사용자</span>
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">액션</span>
                <span className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wide">대상</span>
              </div>

              <div className="divide-y divide-line">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[120px_100px_110px_1fr] gap-md px-lg py-[10px] hover:bg-surface-secondary/60 transition-colors"
                  >
                    <span className="text-[12px] text-content-tertiary font-mono truncate">
                      {formatDateTime(log.createdAt)}
                    </span>
                    <span className="text-[12px] text-content font-medium truncate">
                      {log.userName ?? `#${log.userId}`}
                    </span>
                    <span className="text-[12px]">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-[7px] py-[2px] text-[10px] font-semibold',
                        log.action === 'LOGIN' && 'bg-green-50 text-green-700',
                        log.action === 'LOGOUT' && 'bg-surface-secondary text-content-secondary',
                        log.action === 'LOGIN_FAILED' && 'bg-red-50 text-red-600',
                        log.action === 'DELETE' && 'bg-red-50 text-red-600',
                        log.action === 'CREATE' && 'bg-blue-50 text-blue-600',
                        log.action === 'UPDATE' && 'bg-amber-50 text-amber-600',
                        log.action === 'BRANCH_SWITCH' && 'bg-purple-50 text-purple-600',
                        !['LOGIN','LOGOUT','LOGIN_FAILED','DELETE','CREATE','UPDATE','BRANCH_SWITCH'].includes(log.action) && 'bg-surface-secondary text-content-secondary',
                      )}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </span>
                    <span className="text-[12px] text-content-secondary truncate">
                      {log.targetType
                        ? `${log.targetType}${log.targetId ? ` #${log.targetId}` : ''}`
                        : log.detail
                        ? JSON.stringify(log.detail).slice(0, 60)
                        : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
