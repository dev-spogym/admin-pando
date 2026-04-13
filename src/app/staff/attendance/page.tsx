import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { LogIn, LogOut, Calendar, Users, CheckCircle, AlertCircle, List } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import {
  getStaffAttendance,
  clockIn,
  clockOut,
  type StaffAttendanceItem,
  type AttendanceStatus,
} from '@/api/endpoints/staffAttendance';

const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const STATUS_VARIANT: Record<AttendanceStatus, 'mint' | 'warning' | 'error' | 'default' | 'info'> = {
  정상: 'mint',
  지각: 'warning',
  조퇴: 'default',
  결근: 'error',
  연차: 'info',
  휴무: 'default',
};

export default function StaffAttendance() {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(fmtLocal(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(fmtLocal(new Date()).slice(0, 7)); // YYYY-MM
  const [attendances, setAttendances] = useState<StaffAttendanceItem[]>([]);
  const [monthlyAttendances, setMonthlyAttendances] = useState<StaffAttendanceItem[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string; role?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  const getBranchId = () => Number(localStorage.getItem('branchId')) || 1;

  const fetchAttendances = async () => {
    setIsLoading(true);
    const { data, error } = await getStaffAttendance(undefined, selectedDate);
    setIsLoading(false);
    if (error) { toast.error('근태 데이터를 불러오지 못했습니다.'); return; }
    setAttendances(data ?? []);
  };

  const fetchMonthlyAttendances = async () => {
    setIsMonthlyLoading(true);
    const startDate = `${selectedMonth}-01`;
    const year = parseInt(selectedMonth.slice(0, 4));
    const month = parseInt(selectedMonth.slice(5, 7));
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
    const { data, error } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('branchId', getBranchId())
      .gte('date', startDate)
      .lte('date', endDate);
    setIsMonthlyLoading(false);
    if (error) { toast.error('월별 근태 데이터를 불러오지 못했습니다.'); return; }
    setMonthlyAttendances((data ?? []).map((r: Record<string, unknown>) => ({
      id: r.id as number,
      staffId: r.staffId as number,
      staffName: r.staffName as string,
      date: r.date as string,
      clockIn: r.clockIn as string | null,
      clockOut: r.clockOut as string | null,
      workMinutes: r.workMinutes as number | null,
      status: r.status as AttendanceStatus,
      memo: r.memo as string,
      branchId: r.branchId as number,
    })));
  };

  // 직원 목록 로드
  useEffect(() => {
    supabase.from('staff').select('id, name, role').eq('branchId', getBranchId()).then(({ data }) => {
      if (data) setStaffList(data.map((s: Record<string, unknown>) => ({ id: s.id as number, name: s.name as string, role: s.role as string | undefined })));
    });
  }, []);

  useEffect(() => { fetchAttendances(); }, [selectedDate]);
  useEffect(() => { if (viewMode === 'monthly') fetchMonthlyAttendances(); }, [selectedMonth, viewMode]);

  // 직원별 근태 데이터 병합 (근태 기록 없는 직원도 포함)
  const mergedData = useMemo(() => {
    return staffList.map(staff => {
      const att = attendances.find(a => a.staffId === staff.id);
      const base = att ?? {
        id: 0,
        staffId: staff.id,
        staffName: staff.name,
        date: selectedDate,
        clockIn: null,
        clockOut: null,
        workMinutes: null,
        status: '결근' as AttendanceStatus,
        memo: '',
        branchId: getBranchId(),
      };
      return { ...base, role: staff.role };
    });
  }, [staffList, attendances, selectedDate]);

  // 월간 요약 (selectedDate 기준 해당 월)
  const monthlySummary = useMemo(() => {
    const normal = attendances.filter(a => a.status === '정상').length;
    const late = attendances.filter(a => a.status === '지각').length;
    const earlyLeave = attendances.filter(a => a.status === '조퇴').length;
    const absent = staffList.length - attendances.length;
    return { total: attendances.length, normal, late, earlyLeave, absent: Math.max(0, absent) };
  }, [attendances, staffList]);

  // 월별 요약: 직원별 출근일수, 지각횟수, 결근횟수, 연차 사용일수
  const monthlyStaffSummary = useMemo(() => {
    return staffList.map(staff => {
      const records = monthlyAttendances.filter(a => a.staffId === staff.id);
      const workDays = records.filter(a => ['정상', '지각', '조퇴'].includes(a.status)).length;
      const lateCnt = records.filter(a => a.status === '지각').length;
      const absentCnt = records.filter(a => a.status === '결근').length;
      const annualCnt = records.filter(a => a.status === '연차').length;
      return { staffId: staff.id, staffName: staff.name, role: staff.role, workDays, lateCnt, absentCnt, annualCnt };
    });
  }, [staffList, monthlyAttendances]);

  const handleClockIn = async (staffId: number, staffName: string) => {
    const { id, error } = await clockIn(staffId, staffName, selectedDate);
    if (error || !id) { toast.error('출근 기록에 실패했습니다.'); return; }
    toast.success(`${staffName} 출근 처리 완료`);
    fetchAttendances();
  };

  const handleClockOut = async (item: StaffAttendanceItem) => {
    if (!item.id) { toast.error('출근 기록이 없습니다.'); return; }
    const { error } = await clockOut(item.staffId, item.id);
    if (error) { toast.error('퇴근 기록에 실패했습니다.'); return; }
    toast.success(`${item.staffName} 퇴근 처리 완료`);
    fetchAttendances();
  };

  const fmtWorkTime = (minutes: number | null) => {
    if (minutes == null) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}시간 ${m}분`;
  };

  const columns = [
    { key: 'staffName', header: '직원명', width: 120 },
    {
      key: 'role', header: '직급', width: 100, align: 'center' as const,
      render: (v: string | undefined) => {
        if (!v) return <span className="text-content-tertiary text-[12px]">-</span>;
        const lower = v.toLowerCase();
        let cls = 'bg-gray-100 text-gray-600';
        if (lower === 'manager' || lower === '매니저' || lower === '원장') cls = 'bg-blue-100 text-blue-700';
        else if (lower === 'fc' || lower === '프론트' || lower === 'staff' || lower === '직원') cls = 'bg-green-100 text-green-700';
        else if (lower === 'trainer' || lower === '트레이너' || lower === '강사') cls = 'bg-purple-100 text-purple-700';
        else if (lower === 'owner' || lower === '대표' || lower === 'primary') cls = 'bg-amber-100 text-amber-700';
        return <span className={`inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold ${cls}`}>{v}</span>;
      },
    },
    {
      key: 'clockIn', header: '출근 시간', width: 110, align: 'center' as const,
      render: (v: string | null) => v ? <span className="tabular-nums text-state-success font-semibold">{v}</span> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'clockOut', header: '퇴근 시간', width: 110, align: 'center' as const,
      render: (v: string | null) => v ? <span className="tabular-nums text-primary font-semibold">{v}</span> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'workMinutes', header: '근무시간', width: 120, align: 'center' as const,
      render: (v: number | null) => <span className="tabular-nums">{fmtWorkTime(v)}</span>,
    },
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (v: AttendanceStatus) => (
        <StatusBadge variant={STATUS_VARIANT[v] ?? 'default'} dot>{v}</StatusBadge>
      ),
    },
    {
      key: 'actions', header: '', width: 160, align: 'center' as const,
      render: (_: unknown, row: StaffAttendanceItem) => (
        <div className="flex items-center justify-center gap-xs">
          {!row.clockIn ? (
            <button
              onClick={() => handleClockIn(row.staffId, row.staffName)}
              className="flex items-center gap-xs px-sm py-xs bg-state-success/10 text-state-success rounded-button text-[12px] font-semibold hover:bg-state-success/20 transition-colors"
            >
              <LogIn size={13} /> 출근
            </button>
          ) : !row.clockOut ? (
            <button
              onClick={() => handleClockOut(row)}
              className="flex items-center gap-xs px-sm py-xs bg-primary/10 text-primary rounded-button text-[12px] font-semibold hover:bg-primary/20 transition-colors"
            >
              <LogOut size={13} /> 퇴근
            </button>
          ) : (
            <span className="text-[12px] text-content-tertiary">완료</span>
          )}
        </div>
      ),
    },
  ];

  const monthlyColumns = [
    { key: 'staffName', header: '직원명', width: 120 },
    {
      key: 'role', header: '직급', width: 100, align: 'center' as const,
      render: (v: string | undefined) => v ? <span className="text-[12px] text-content-secondary">{v}</span> : <span className="text-content-tertiary text-[12px]">-</span>,
    },
    {
      key: 'workDays', header: '출근일수', width: 100, align: 'center' as const,
      render: (v: number) => <span className="tabular-nums font-semibold text-state-success">{v}일</span>,
    },
    {
      key: 'lateCnt', header: '지각횟수', width: 100, align: 'center' as const,
      render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-amber-500' : 'text-content-tertiary')}>{v}회</span>,
    },
    {
      key: 'absentCnt', header: '결근횟수', width: 100, align: 'center' as const,
      render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-state-error' : 'text-content-tertiary')}>{v}회</span>,
    },
    {
      key: 'annualCnt', header: '연차사용', width: 100, align: 'center' as const,
      render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-info' : 'text-content-tertiary')}>{v}일</span>,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="직원 근태 관리"
        description="직원별 출퇴근 기록 및 근태 현황을 관리합니다."
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="총 근무일" value={monthlySummary.total} icon={<Calendar />} variant="peach" />
        <StatCard label="정상 출근" value={monthlySummary.normal} icon={<CheckCircle />} variant="mint" />
        <StatCard label="지각" value={monthlySummary.late} icon={<AlertCircle />} />
        <StatCard label="결근" value={monthlySummary.absent} icon={<Users />} />
      </StatCardGrid>

      {/* 뷰 모드 토글 */}
      <div className="flex items-center gap-xs mb-lg">
        <button
          onClick={() => setViewMode('daily')}
          className={cn(
            'flex items-center gap-xs px-md py-sm rounded-button text-[13px] font-semibold border transition-all',
            viewMode === 'daily'
              ? 'bg-primary text-surface border-primary'
              : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
          )}
        >
          <Calendar size={14} />
          일별 뷰
        </button>
        <button
          onClick={() => setViewMode('monthly')}
          className={cn(
            'flex items-center gap-xs px-md py-sm rounded-button text-[13px] font-semibold border transition-all',
            viewMode === 'monthly'
              ? 'bg-primary text-surface border-primary'
              : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
          )}
        >
          <List size={14} />
          월별 요약
        </button>
      </div>

      {viewMode === 'daily' && <>
        {/* 날짜 선택 */}
        <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex items-center gap-md">
          <Calendar size={16} className="text-content-tertiary" />
          <span className="text-[13px] font-semibold text-content-secondary">날짜 선택</span>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          {/* 일별 요약 */}
          <div className="ml-auto flex items-center gap-lg">
            {([
              { label: '정상', value: monthlySummary.normal, color: 'text-state-success' },
              { label: '지각', value: monthlySummary.late, color: 'text-amber-500' },
              { label: '조퇴', value: monthlySummary.earlyLeave, color: 'text-orange-500' },
              { label: '결근', value: monthlySummary.absent, color: 'text-state-error' },
            ]).map(item => (
              <div key={item.label} className="text-center">
                <p className="text-[10px] text-content-tertiary mb-[2px]">{item.label}</p>
                <p className={cn('text-[16px] font-bold tabular-nums', item.color)}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 일별 테이블 */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <DataTable
            columns={columns}
            data={mergedData}
            loading={isLoading}
            title={`${selectedDate} 근태 현황`}
            emptyMessage="직원 목록이 없습니다."
            pagination={{ page: 1, pageSize: 50, total: mergedData.length }}
          />
        </div>
      </>}

      {viewMode === 'monthly' && <>
        {/* 월 선택 */}
        <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex items-center gap-md">
          <Calendar size={16} className="text-content-tertiary" />
          <span className="text-[13px] font-semibold text-content-secondary">월 선택</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
        </div>

        {/* 월별 요약 테이블 */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <DataTable
            columns={monthlyColumns}
            data={monthlyStaffSummary as unknown as Record<string, unknown>[]}
            loading={isMonthlyLoading}
            title={`${selectedMonth} 직원별 근태 요약`}
            emptyMessage="직원 목록이 없습니다."
            pagination={{ page: 1, pageSize: 50, total: monthlyStaffSummary.length }}
          />
        </div>
      </>}
    </AppLayout>
  );
}
