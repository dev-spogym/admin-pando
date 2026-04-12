import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { LogIn, LogOut, Calendar, Users, CheckCircle, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
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
  const [selectedDate, setSelectedDate] = useState(fmtLocal(new Date()));
  const [attendances, setAttendances] = useState<StaffAttendanceItem[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string; role?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getBranchId = () => Number(localStorage.getItem('branchId')) || 1;

  const fetchAttendances = async () => {
    setIsLoading(true);
    const { data, error } = await getStaffAttendance(undefined, selectedDate);
    setIsLoading(false);
    if (error) { toast.error('근태 데이터를 불러오지 못했습니다.'); return; }
    setAttendances(data ?? []);
  };

  // 직원 목록 로드
  useEffect(() => {
    supabase.from('staff').select('id, name, role').eq('branchId', getBranchId()).then(({ data }) => {
      if (data) setStaffList(data.map((s: Record<string, unknown>) => ({ id: s.id as number, name: s.name as string, role: s.role as string | undefined })));
    });
  }, []);

  useEffect(() => { fetchAttendances(); }, [selectedDate]);

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

  return (
    <AppLayout>
      <PageHeader
        title="직원 근태 관리"
        description="직원별 출퇴근 기록 및 근태 현황을 관리합니다."
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md mb-xl">
        <StatCard label="총 근무일" value={monthlySummary.total} icon={<Calendar />} variant="peach" />
        <StatCard label="정상 출근" value={monthlySummary.normal} icon={<CheckCircle />} variant="mint" />
        <StatCard label="지각" value={monthlySummary.late} icon={<AlertCircle />} />
        <StatCard label="결근" value={monthlySummary.absent} icon={<Users />} />
      </div>

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
        {/* 월간 요약 */}
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

      {/* 테이블 */}
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
    </AppLayout>
  );
}
