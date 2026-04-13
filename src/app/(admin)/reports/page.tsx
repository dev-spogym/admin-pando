'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Download,
  Mail,
  RefreshCw,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  UserPlus,
  X,
  ChevronDown,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import DataTable from '@/components/common/DataTable';
import ExportButton from '@/components/common/ExportButton';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type ReportStatus = 'READY' | 'GENERATING' | 'FAILED';

interface ReportKpi {
  totalRevenue: number;
  totalMembers: number;
  newMembers: number;
  totalAttendance: number;
  avgDailyAttendance: number;
  revenueChange?: number;
  memberChange?: number;
}

interface Report {
  id: string;
  type: ReportType;
  periodLabel: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  status: ReportStatus;
  kpi: ReportKpi;
  branchId?: number;
  branchName?: string;
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function formatAmount(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString('ko-KR')}만`;
  return n.toLocaleString('ko-KR');
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
  return `${s.getFullYear()}.${fmt(s)} ~ ${fmt(e)}`;
}

function formatGeneratedAt(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const TYPE_LABEL: Record<ReportType, string> = {
  DAILY: '일간',
  WEEKLY: '주간',
  MONTHLY: '월간',
};

const TYPE_COLOR: Record<ReportType, string> = {
  DAILY: 'bg-blue-50 text-blue-600',
  WEEKLY: 'bg-green-50 text-green-600',
  MONTHLY: 'bg-purple-50 text-purple-600',
};

// ─── Supabase에서 집계 데이터 가져오기 ────────────────────────────────────────

async function fetchReportKpi(
  branchId: number | undefined,
  startDate: string,
  endDate: string
): Promise<ReportKpi> {
  const branchFilter = branchId ? { branch_id: branchId } : {};

  // 매출 합계
  let revenueQuery = supabase
    .from('sales')
    .select('amount')
    .gte('sale_date', startDate)
    .lte('sale_date', endDate)
    .eq('status', 'COMPLETED');
  if (branchId) revenueQuery = revenueQuery.eq('branch_id', branchId);
  const { data: salesData } = await revenueQuery;
  const totalRevenue = (salesData ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);

  // 전체 활성 회원 수
  let memberQuery = supabase.from('members').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE');
  if (branchId) memberQuery = memberQuery.eq('branch_id', branchId);
  const { count: totalMembers } = await memberQuery;

  // 기간 내 신규 회원
  let newMemberQuery = supabase
    .from('members')
    .select('id', { count: 'exact', head: true })
    .gte('registered_at', startDate)
    .lte('registered_at', endDate);
  if (branchId) newMemberQuery = newMemberQuery.eq('branch_id', branchId);
  const { count: newMembers } = await newMemberQuery;

  // 출석 수
  let attQuery = supabase
    .from('attendances')
    .select('id', { count: 'exact', head: true })
    .gte('check_in_time', startDate)
    .lte('check_in_time', endDate);
  if (branchId) attQuery = attQuery.eq('branch_id', branchId);
  const { count: totalAttendance } = await attQuery;

  // 일 수 계산
  const days = Math.max(
    1,
    Math.round(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
    ) + 1
  );

  return {
    totalRevenue,
    totalMembers: totalMembers ?? 0,
    newMembers: newMembers ?? 0,
    totalAttendance: totalAttendance ?? 0,
    avgDailyAttendance: Math.round((totalAttendance ?? 0) / days),
  };
}

// 자동 리포트 목록 생성 (최근 3개월 일간/주간/월간)
async function generateReportList(
  branchId: number | undefined,
  branchName: string
): Promise<Report[]> {
  const reports: Report[] = [];
  const now = new Date();

  // 최근 7일 일간 리포트
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const kpi = await fetchReportKpi(branchId, dateStr, dateStr);
    reports.push({
      id: `daily-${dateStr}`,
      type: 'DAILY',
      periodLabel: `${d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`,
      startDate: dateStr,
      endDate: dateStr,
      generatedAt: new Date(d.getTime() + 24 * 3600 * 1000).toISOString(),
      status: 'READY',
      kpi,
      branchId,
      branchName,
    });
  }

  // 최근 4주 주간 리포트
  for (let i = 1; i <= 4; i++) {
    const endD = new Date(now);
    endD.setDate(endD.getDate() - (i - 1) * 7 - endD.getDay());
    const startD = new Date(endD);
    startD.setDate(startD.getDate() - 6);
    const startStr = startD.toISOString().slice(0, 10);
    const endStr = endD.toISOString().slice(0, 10);
    const kpi = await fetchReportKpi(branchId, startStr, endStr);
    reports.push({
      id: `weekly-${startStr}`,
      type: 'WEEKLY',
      periodLabel: `${startD.getMonth() + 1}월 ${Math.ceil(startD.getDate() / 7)}주차`,
      startDate: startStr,
      endDate: endStr,
      generatedAt: new Date(endD.getTime() + 24 * 3600 * 1000).toISOString(),
      status: 'READY',
      kpi,
      branchId,
      branchName,
    });
  }

  // 최근 3개월 월간 리포트
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const startD = new Date(d.getFullYear(), d.getMonth(), 1);
    const endD = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const startStr = startD.toISOString().slice(0, 10);
    const endStr = endD.toISOString().slice(0, 10);
    const kpi = await fetchReportKpi(branchId, startStr, endStr);
    reports.push({
      id: `monthly-${startStr}`,
      type: 'MONTHLY',
      periodLabel: `${d.getFullYear()}년 ${d.getMonth() + 1}월`,
      startDate: startStr,
      endDate: endStr,
      generatedAt: new Date(endD.getTime() + 24 * 3600 * 1000).toISOString(),
      status: 'READY',
      kpi,
      branchId,
      branchName,
    });
  }

  return reports;
}

// ─── 리포트 생성 모달 ─────────────────────────────────────────────────────────

interface GenerateModalProps {
  onClose: () => void;
  onGenerate: (type: ReportType, startDate: string, endDate: string) => void;
}

function GenerateModal({ onClose, onGenerate }: GenerateModalProps) {
  const [type, setType] = useState<ReportType>('MONTHLY');
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      toast.error('시작일이 종료일보다 클 수 없습니다.');
      return;
    }
    onGenerate(type, startDate, endDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-xl border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[15px] font-semibold text-content">리포트 생성</h2>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* 리포트 유형 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-1.5">
              리포트 유형
            </label>
            <div className="relative">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full appearance-none px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="DAILY">일간 리포트</option>
                <option value="WEEKLY">주간 리포트</option>
                <option value="MONTHLY">월간 리포트</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-content-tertiary pointer-events-none" />
            </div>
          </div>

          {/* 기간 선택 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-1.5">
                시작일
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-1.5">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-[13px] border border-line rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-[13px] font-medium text-content-secondary border border-line rounded-lg hover:bg-surface-tertiary transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              생성
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 리포트 상세 모달 ─────────────────────────────────────────────────────────

interface DetailModalProps {
  report: Report;
  onClose: () => void;
}

function DetailModal({ report, onClose }: DetailModalProps) {
  const exportData = [
    {
      항목: '기간',
      값: formatDateRange(report.startDate, report.endDate),
    },
    { 항목: '총 매출', 값: `${report.kpi.totalRevenue.toLocaleString('ko-KR')}원` },
    { 항목: '전체 회원', 값: `${report.kpi.totalMembers}명` },
    { 항목: '신규 회원', 값: `${report.kpi.newMembers}명` },
    { 항목: '총 출석', 값: `${report.kpi.totalAttendance}회` },
    { 항목: '일 평균 출석', 값: `${report.kpi.avgDailyAttendance}회` },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[520px] rounded-xl border border-line bg-surface shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                TYPE_COLOR[report.type]
              )}
            >
              {TYPE_LABEL[report.type]}
            </span>
            <h2 className="text-[15px] font-semibold text-content">{report.periodLabel} 리포트</h2>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[12px] text-content-tertiary">
            기간: {formatDateRange(report.startDate, report.endDate)}
          </p>

          {/* KPI 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line bg-surface-secondary p-4">
              <p className="text-[11px] font-medium text-content-tertiary mb-1">총 매출</p>
              <p className="text-[20px] font-bold text-content">
                {formatAmount(report.kpi.totalRevenue)}원
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4">
              <p className="text-[11px] font-medium text-content-tertiary mb-1">전체 회원</p>
              <p className="text-[20px] font-bold text-content">
                {report.kpi.totalMembers.toLocaleString()}명
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4">
              <p className="text-[11px] font-medium text-content-tertiary mb-1">신규 회원</p>
              <p className="text-[20px] font-bold text-content">
                +{report.kpi.newMembers}명
              </p>
            </div>
            <div className="rounded-xl border border-line bg-surface-secondary p-4">
              <p className="text-[11px] font-medium text-content-tertiary mb-1">총 출석</p>
              <p className="text-[20px] font-bold text-content">
                {report.kpi.totalAttendance.toLocaleString()}회
              </p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2 pt-1">
            <ExportButton
              data={exportData}
              columns={[
                { key: '항목', header: '항목' },
                { key: '값', header: '값' },
              ]}
              fileName={`report-${report.id}`}
              className="flex-1 justify-center"
            />
            <button
              onClick={() => toast.info('이메일 발송 기능은 준비 중입니다.')}
              className="flex-1 flex items-center justify-center gap-2 py-[9px] text-[13px] font-medium text-content border border-line rounded-lg bg-surface hover:bg-surface-secondary transition-colors"
            >
              <Mail size={15} />
              이메일 발송
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const authUser = useAuthStore((s) => s.user);
  const branchId = authUser?.currentBranchId
    ? Number(authUser.currentBranchId)
    : authUser?.branchId
    ? Number(authUser.branchId)
    : undefined;
  const branchName = authUser?.branchName ?? '전체';

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [typeFilter, setTypeFilter] = useState<ReportType | 'ALL'>('ALL');

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateReportList(branchId, branchName);
      setReports(data);
    } catch {
      toast.error('리포트 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [branchId, branchName]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerate = async (type: ReportType, startDate: string, endDate: string) => {
    const tempId = `custom-${type.toLowerCase()}-${startDate}`;
    const tempReport: Report = {
      id: tempId,
      type,
      periodLabel: `${startDate} ~ ${endDate}`,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      status: 'GENERATING',
      kpi: {
        totalRevenue: 0,
        totalMembers: 0,
        newMembers: 0,
        totalAttendance: 0,
        avgDailyAttendance: 0,
      },
      branchId,
      branchName,
    };
    setReports((prev) => [tempReport, ...prev]);
    toast.info('리포트를 생성하고 있습니다...');

    try {
      const kpi = await fetchReportKpi(branchId, startDate, endDate);
      setReports((prev) =>
        prev.map((r) =>
          r.id === tempId ? { ...r, status: 'READY', kpi } : r
        )
      );
      toast.success('리포트가 생성되었습니다.');
    } catch {
      setReports((prev) =>
        prev.map((r) => (r.id === tempId ? { ...r, status: 'FAILED' } : r))
      );
      toast.error('리포트 생성에 실패했습니다.');
    }
  };

  const filteredReports =
    typeFilter === 'ALL' ? reports : reports.filter((r) => r.type === typeFilter);

  // 최신 월간 리포트 KPI (요약 카드용)
  const latestMonthly = reports.find((r) => r.type === 'MONTHLY' && r.status === 'READY');

  // DataTable 컬럼 정의
  const columns = [
    {
      key: 'type',
      header: '유형',
      width: 80,
      render: (_: unknown, row: Report) => (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-[11px] font-semibold',
            TYPE_COLOR[row.type]
          )}
        >
          {TYPE_LABEL[row.type]}
        </span>
      ),
    },
    {
      key: 'periodLabel',
      header: '기간',
      render: (_: unknown, row: Report) => (
        <div>
          <p className="text-[13px] font-medium text-content">{row.periodLabel}</p>
          <p className="text-[11px] text-content-tertiary">
            {formatDateRange(row.startDate, row.endDate)}
          </p>
        </div>
      ),
    },
    {
      key: 'kpi.totalRevenue',
      header: '총 매출',
      align: 'right' as const,
      render: (_: unknown, row: Report) => (
        <span className="text-[13px] font-semibold text-content tabular-nums">
          {row.status === 'GENERATING' ? (
            <span className="text-content-tertiary">생성중...</span>
          ) : row.status === 'FAILED' ? (
            <span className="text-state-error text-[12px]">실패</span>
          ) : (
            `${formatAmount(row.kpi.totalRevenue)}원`
          )}
        </span>
      ),
    },
    {
      key: 'kpi.newMembers',
      header: '신규 회원',
      align: 'right' as const,
      render: (_: unknown, row: Report) => (
        <span className="text-[13px] text-content tabular-nums">
          {row.status === 'READY' ? `+${row.kpi.newMembers}명` : '-'}
        </span>
      ),
    },
    {
      key: 'kpi.totalAttendance',
      header: '출석',
      align: 'right' as const,
      render: (_: unknown, row: Report) => (
        <span className="text-[13px] text-content tabular-nums">
          {row.status === 'READY' ? `${row.kpi.totalAttendance.toLocaleString()}회` : '-'}
        </span>
      ),
    },
    {
      key: 'generatedAt',
      header: '생성일시',
      render: (_: unknown, row: Report) => (
        <span className="text-[12px] text-content-tertiary">
          {formatGeneratedAt(row.generatedAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 120,
      render: (_: unknown, row: Report) => (
        <div className="flex items-center gap-1.5">
          <button
            disabled={row.status !== 'READY'}
            onClick={(e) => {
              e.stopPropagation();
              if (row.status === 'READY') setSelectedReport(row);
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
              row.status === 'READY'
                ? 'border-line text-content-secondary hover:bg-surface-tertiary'
                : 'border-line text-content-tertiary opacity-40 cursor-not-allowed'
            )}
          >
            <FileText size={12} />
            보기
          </button>
          <button
            disabled={row.status !== 'READY'}
            onClick={(e) => {
              e.stopPropagation();
              toast.info('이메일 발송 기능은 준비 중입니다.');
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors',
              row.status === 'READY'
                ? 'border-line text-content-secondary hover:bg-surface-tertiary'
                : 'border-line text-content-tertiary opacity-40 cursor-not-allowed'
            )}
          >
            <Mail size={12} />
            발송
          </button>
        </div>
      ),
    },
  ];

  // 내보내기 데이터
  const exportColumns = [
    { key: 'type', header: '유형' },
    { key: 'periodLabel', header: '기간명' },
    { key: 'startDate', header: '시작일' },
    { key: 'endDate', header: '종료일' },
    { key: 'totalRevenue', header: '총 매출(원)' },
    { key: 'totalMembers', header: '전체 회원' },
    { key: 'newMembers', header: '신규 회원' },
    { key: 'totalAttendance', header: '총 출석' },
    { key: 'generatedAt', header: '생성일시' },
  ];
  const exportData = filteredReports
    .filter((r) => r.status === 'READY')
    .map((r) => ({
      type: TYPE_LABEL[r.type],
      periodLabel: r.periodLabel,
      startDate: r.startDate,
      endDate: r.endDate,
      totalRevenue: r.kpi.totalRevenue,
      totalMembers: r.kpi.totalMembers,
      newMembers: r.kpi.newMembers,
      totalAttendance: r.kpi.totalAttendance,
      generatedAt: formatGeneratedAt(r.generatedAt),
    }));

  return (
    <AppLayout>
      <PageHeader
        title="자동 리포트"
        description="일간·주간·월간 KPI 리포트를 자동으로 생성하고 관리합니다."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={loadReports}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-[9px] text-[13px] font-medium text-content-secondary border border-line rounded-lg bg-surface hover:bg-surface-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              새로고침
            </button>
            <ExportButton
              data={exportData}
              columns={exportColumns}
              fileName={`reports-${new Date().toISOString().slice(0, 10)}`}
            />
            <button
              onClick={() => setShowGenerateModal(true)}
              className="flex items-center gap-1.5 px-3 py-[9px] text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={14} />
              리포트 생성
            </button>
          </div>
        }
      />

      {/* 최신 월간 요약 카드 */}
      {latestMonthly && (
        <StatCardGrid className="mb-lg">
          <StatCard
            label="월간 총 매출"
            value={`${formatAmount(latestMonthly.kpi.totalRevenue)}원`}
            icon={<TrendingUp />}
            description={latestMonthly.periodLabel}
            variant="peach"
          />
          <StatCard
            label="전체 회원"
            value={`${latestMonthly.kpi.totalMembers.toLocaleString()}명`}
            icon={<Users />}
            description="활성 회원 기준"
          />
          <StatCard
            label="신규 가입"
            value={`+${latestMonthly.kpi.newMembers}명`}
            icon={<UserPlus />}
            description={latestMonthly.periodLabel}
            variant="mint"
          />
          <StatCard
            label="총 출석"
            value={`${latestMonthly.kpi.totalAttendance.toLocaleString()}회`}
            icon={<Clock />}
            description={`일 평균 ${latestMonthly.kpi.avgDailyAttendance}회`}
          />
        </StatCardGrid>
      )}

      {/* 필터 탭 */}
      <div className="flex items-center gap-1 mb-md">
        {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors',
              typeFilter === t
                ? 'bg-primary text-white'
                : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
            )}
          >
            {t === 'ALL' ? '전체' : TYPE_LABEL[t]}
          </button>
        ))}
        <span className="ml-2 text-[12px] text-content-tertiary">
          총 {filteredReports.length}건
        </span>
      </div>

      {/* 리포트 테이블 */}
      <DataTable
        columns={columns}
        data={filteredReports}
        loading={loading}
        emptyMessage="생성된 리포트가 없습니다."
        onRowClick={(row) => {
          if (row.status === 'READY') setSelectedReport(row);
        }}
      />

      {/* 리포트 생성 모달 */}
      {showGenerateModal && (
        <GenerateModal
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerate}
        />
      )}

      {/* 리포트 상세 모달 */}
      {selectedReport && (
        <DetailModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AppLayout>
  );
}
