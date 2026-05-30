'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { getBranchId } from '@/lib/getBranchId';
import { toast } from 'sonner';
import { Calendar, Users, CheckCircle, AlertCircle, List, Clock, Edit2, Plus, Percent } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { normalizeRole, isRoleAtLeast } from '@/lib/permissions';
import {
  createStaffAttendance,
  getStaffAttendance,
  updateStaffAttendance,
  type StaffAttendanceItem,
  type AttendanceStatus,
  type AttendanceSource,
} from '@/api/endpoints/staffAttendance';

const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// 근태 상태 배지 6종 (정상/지각/결근/조퇴/외근/휴가)
const STATUS_VARIANT: Record<AttendanceStatus, 'mint' | 'warning' | 'error' | 'default' | 'info'> = {
  정상: 'mint',
  지각: 'warning',
  결근: 'error',
  조퇴: 'default',
  외근: 'info',
  휴가: 'info',
};
const STATUS_OPTIONS: AttendanceStatus[] = ['정상', '지각', '결근', '조퇴', '외근', '휴가'];

// 근태 출처 배지 4종
const SOURCE_VARIANT: Record<AttendanceSource, string> = {
  '키오스크': 'bg-blue-100 text-blue-700',
  'IoT': 'bg-purple-100 text-purple-700',
  '수동 보정': 'bg-amber-100 text-amber-700',
  '누락 추가': 'bg-green-100 text-green-700',
};

// 지점별 직원 지각 허용 시간 기본값 (D09 SCR-086 출석 관리 설정에서 변경)
const LATE_TOLERANCE_MIN = 10;

interface CorrectionForm {
  clockIn: string;
  clockOut: string;
  status: AttendanceStatus;
  reason: string;
}

export default function StaffAttendance() {
  const authUser = useAuthStore((s) => s.user);
  const userRole = normalizeRole(authUser?.role ?? '');
  // 수동 보정은 manager 이상만
  const canCorrect = isRoleAtLeast(userRole, 'manager');

  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(fmtLocal(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(fmtLocal(new Date()).slice(0, 7));
  const [attendances, setAttendances] = useState<StaffAttendanceItem[]>([]);
  const [monthlyAttendances, setMonthlyAttendances] = useState<StaffAttendanceItem[]>([]);
  const [staffList, setStaffList] = useState<{ id: number; name: string; role?: string }[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

  // 수동 보정 모달
  const [correctRow, setCorrectRow] = useState<StaffAttendanceItem | null>(null);
  const [correctForm, setCorrectForm] = useState<CorrectionForm>({ clockIn: '', clockOut: '', status: '정상', reason: '' });

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
      source: (r.source as AttendanceSource) ?? '키오스크',
      corrections: Array.isArray(r.corrections) ? (r.corrections as StaffAttendanceItem['corrections']) : [],
      memo: r.memo as string,
      branchId: r.branchId as number,
    })));
  };

  useEffect(() => {
    supabase.from('staff').select('id, name, role').eq('branchId', getBranchId()).then(({ data }) => {
      if (data) setStaffList(data.map((s: Record<string, unknown>) => ({ id: s.id as number, name: s.name as string, role: s.role as string | undefined })));
    });
  }, []);

  useEffect(() => { fetchAttendances(); }, [selectedDate]);
  useEffect(() => { if (viewMode === 'monthly') fetchMonthlyAttendances(); }, [selectedMonth, viewMode]);

  // 직원 필터 적용된 일별 데이터
  const filteredAttendances = useMemo(
    () => selectedStaffId ? attendances.filter(a => String(a.staffId) === selectedStaffId) : attendances,
    [attendances, selectedStaffId]
  );

  // 직원별 근태 데이터 병합 (근태 기록 없는 직원도 포함)
  const mergedData = useMemo(() => {
    const base = selectedStaffId ? staffList.filter(s => String(s.id) === selectedStaffId) : staffList;
    return base.map(staff => {
      const att = filteredAttendances.find(a => a.staffId === staff.id);
      const item: StaffAttendanceItem = att ?? {
        id: 0,
        staffId: staff.id,
        staffName: staff.name,
        date: selectedDate,
        clockIn: null,
        clockOut: null,
        workMinutes: null,
        status: '결근',
        source: '키오스크',
        corrections: [],
        memo: '',
        branchId: getBranchId(),
      };
      return { ...item, role: staff.role };
    });
  }, [staffList, filteredAttendances, selectedStaffId, selectedDate]);

  // 요약 지표 카드 5종
  const summary = useMemo(() => {
    const list = mergedData;
    const normal = list.filter(a => a.status === '정상').length;
    const late = list.filter(a => a.status === '지각').length;
    const absent = list.filter(a => a.status === '결근').length;
    const totalMinutes = list.reduce((s, a) => s + (a.workMinutes ?? 0), 0);
    // 평균 출근율 = (정상+지각) / 영업일(=대상 직원 수) × 100
    const denom = list.filter(a => a.status !== '휴가' && a.status !== '외근').length;
    const rate = denom > 0 ? Math.round(((normal + late) / denom) * 100) : 0;
    return { normal, late, absent, totalHours: Math.round(totalMinutes / 60), rate };
  }, [mergedData]);

  // 월별 요약: 직원별 출근일수/지각/결근/연차(휴가)
  const monthlyStaffSummary = useMemo(() => {
    const base = selectedStaffId ? staffList.filter(s => String(s.id) === selectedStaffId) : staffList;
    return base.map(staff => {
      const records = monthlyAttendances.filter(a => a.staffId === staff.id);
      const workDays = records.filter(a => ['정상', '지각', '조퇴'].includes(a.status)).length;
      const lateCnt = records.filter(a => a.status === '지각').length;
      const absentCnt = records.filter(a => a.status === '결근').length;
      const leaveCnt = records.filter(a => a.status === '휴가').length;
      return { staffId: staff.id, staffName: staff.name, role: staff.role, workDays, lateCnt, absentCnt, leaveCnt };
    });
  }, [staffList, monthlyAttendances, selectedStaffId]);

  const fmtWorkTime = (minutes: number | null) => {
    if (minutes == null) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}시간 ${m}분`;
  };

  // ── 수동 보정 ──────────────────────────────────────────────────────────────
  const openCorrect = (row: StaffAttendanceItem) => {
    if (!canCorrect) { toast.error('보정 권한이 없습니다.'); return; }
    if (row.status === '휴가' || row.status === '외근') { toast.warning('휴가/외근 일자는 휴가 모듈에서 관리합니다.'); return; }
    setCorrectRow(row);
    setCorrectForm({ clockIn: row.clockIn ?? '', clockOut: row.clockOut ?? '', status: row.status, reason: '' });
  };

  const handleCorrectSave = async () => {
    if (!correctRow) return;
    if (!correctForm.reason.trim()) { toast.error('보정 사유는 필수입니다.'); return; }
    if (correctForm.clockIn && correctForm.clockOut && correctForm.clockOut < correctForm.clockIn) {
      toast.error('퇴근 시각이 출근보다 빠릅니다.'); return;
    }
    const before = `${correctRow.clockIn ?? '-'} ~ ${correctRow.clockOut ?? '-'} / ${correctRow.status}`;
    const after = `${correctForm.clockIn || '-'} ~ ${correctForm.clockOut || '-'} / ${correctForm.status}`;
    const correction = {
      at: new Date().toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' }),
      by: authUser?.name ?? '관리자',
      reason: correctForm.reason,
      before,
      after,
    };

    const isNew = !correctRow.id;
    const source: AttendanceSource = isNew ? '누락 추가' : '수동 보정';
    const corrections = [...correctRow.corrections, correction];
    let savedRow: StaffAttendanceItem | null = null;

    if (!isNew) {
      const { data, error } = await updateStaffAttendance(correctRow.id, {
        date: correctRow.date || selectedDate,
        clockIn: correctForm.clockIn || undefined,
        clockOut: correctForm.clockOut || undefined,
        status: correctForm.status,
        source,
        corrections,
        memo: correctForm.reason,
      });
      if (error) { toast.error('근태 보정에 실패했습니다.'); return; }
      savedRow = data;
    } else {
      const { data, error } = await createStaffAttendance({
        staffId: correctRow.staffId,
        staffName: correctRow.staffName,
        date: correctRow.date || selectedDate,
        clockIn: correctForm.clockIn || null,
        clockOut: correctForm.clockOut || null,
        status: correctForm.status,
        source,
        corrections,
        memo: correctForm.reason,
        branchId: getBranchId(),
      });
      if (error) { toast.error('누락 근태 추가에 실패했습니다.'); return; }
      savedRow = data;
    }

    if (!savedRow) { toast.error('근태 저장 결과를 확인하지 못했습니다.'); return; }

    setAttendances(prev => {
      const exists = prev.find(a => a.id === correctRow.id && correctRow.id !== 0);
      if (exists) return prev.map(a => a.id === correctRow.id ? savedRow : a);
      return [...prev, savedRow];
    });
    toast.success(isNew ? '누락 근태가 추가되었습니다.' : '근태가 보정되었습니다.');
    setCorrectRow(null);
  };

  const columns = [
    { key: 'date', header: '날짜', width: 110, align: 'center' as const, render: (v: string) => <span className="text-[12px] tabular-nums">{v || selectedDate}</span> },
    { key: 'staffName', header: '직원명', width: 110 },
    {
      key: 'clockIn', header: '출근 시각', width: 90, align: 'center' as const,
      render: (v: string | null) => v ? <span className="tabular-nums text-state-success font-semibold">{v}</span> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'clockOut', header: '퇴근 시각', width: 90, align: 'center' as const,
      render: (v: string | null) => v ? <span className="tabular-nums text-primary font-semibold">{v}</span> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'workMinutes', header: '근무 시간', width: 110, align: 'center' as const,
      render: (v: number | null) => <span className="tabular-nums text-[12px]">{fmtWorkTime(v)}</span>,
    },
    {
      key: 'status', header: '상태', width: 80, align: 'center' as const,
      render: (v: AttendanceStatus) => <StatusBadge variant={STATUS_VARIANT[v] ?? 'default'} dot>{v}</StatusBadge>,
    },
    {
      key: 'source', header: '출처', width: 90, align: 'center' as const,
      render: (v: AttendanceSource) => (
        <span className={cn('inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold', SOURCE_VARIANT[v] ?? 'bg-gray-100 text-gray-600')}>{v}</span>
      ),
    },
    {
      key: 'corrections', header: '보정 이력', width: 90, align: 'center' as const,
      render: (v: StaffAttendanceItem['corrections']) => {
        if (!v || v.length === 0) return <span className="text-content-tertiary">-</span>;
        const last = v[v.length - 1];
        return (
          <span
            className="inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 cursor-help"
            title={`변경: ${last.before} → ${last.after}\n사유: ${last.reason}\n보정자: ${last.by}\n일시: ${last.at}`}
          >
            보정 {v.length}회
          </span>
        );
      },
    },
    {
      key: 'actions', header: '', width: 90, align: 'center' as const,
      render: (_: unknown, row: StaffAttendanceItem) => (
        canCorrect ? (
          <Button variant="outline" size="sm" icon={row.id ? <Edit2 size={12} /> : <Plus size={12} />} onClick={() => openCorrect(row)}>
            {row.id ? '보정' : '추가'}
          </Button>
        ) : <span className="text-[12px] text-content-tertiary">-</span>
      ),
    },
  ];

  const monthlyColumns = [
    { key: 'staffName', header: '직원명', width: 120 },
    {
      key: 'role', header: '직급', width: 100, align: 'center' as const,
      render: (v: string | undefined) => v ? <span className="text-[12px] text-content-secondary">{v}</span> : <span className="text-content-tertiary text-[12px]">-</span>,
    },
    { key: 'workDays', header: '출근일수', width: 100, align: 'center' as const, render: (v: number) => <span className="tabular-nums font-semibold text-state-success">{v}일</span> },
    { key: 'lateCnt', header: '지각횟수', width: 100, align: 'center' as const, render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-amber-500' : 'text-content-tertiary')}>{v}회</span> },
    { key: 'absentCnt', header: '결근횟수', width: 100, align: 'center' as const, render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-state-error' : 'text-content-tertiary')}>{v}회</span> },
    { key: 'leaveCnt', header: '휴가사용', width: 100, align: 'center' as const, render: (v: number) => <span className={cn('tabular-nums font-semibold', v > 0 ? 'text-info' : 'text-content-tertiary')}>{v}일</span> },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="직원 근태 관리"
        description="직원별 출퇴근 기록 및 근태 현황을 관리합니다."
        actions={
          <span className="inline-flex items-center gap-xs px-md py-xs rounded-full bg-primary-light text-primary text-[12px] font-semibold">
            <Percent size={13} /> 지각 허용 {LATE_TOLERANCE_MIN}분
          </span>
        }
      />

      {/* 요약 지표 카드 5종 */}
      <StatCardGrid cols={5} className="mb-xl">
        <StatCard label="정상 출근" value={`${summary.normal}일`} icon={<CheckCircle />} variant="mint" />
        <StatCard label="지각 횟수" value={`${summary.late}회`} icon={<AlertCircle />} variant="peach" />
        <StatCard label="결근 횟수" value={`${summary.absent}회`} icon={<Users />} variant="peach" />
        <StatCard label="총 근무 시간" value={`${summary.totalHours}시간`} icon={<Clock />} variant="default" />
        <StatCard label="평균 출근율" value={`${summary.rate}%`} icon={<Percent />} variant="mint" />
      </StatCardGrid>

      {/* 뷰 모드 토글 */}
      <div className="flex items-center gap-xs mb-lg">
        <button onClick={() => setViewMode('daily')} className={cn('flex items-center gap-xs px-md py-sm rounded-button text-[13px] font-semibold border transition-all', viewMode === 'daily' ? 'bg-primary text-surface border-primary' : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary')}>
          <Calendar size={14} /> 일별 뷰
        </button>
        <button onClick={() => setViewMode('monthly')} className={cn('flex items-center gap-xs px-md py-sm rounded-button text-[13px] font-semibold border transition-all', viewMode === 'monthly' ? 'bg-primary text-surface border-primary' : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary')}>
          <List size={14} /> 월별 요약
        </button>
      </div>

      {viewMode === 'daily' && <>
        {/* 날짜 + 직원 필터 */}
        <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex items-center gap-md flex-wrap">
          <Calendar size={16} className="text-content-tertiary" />
          <span className="text-[13px] font-semibold text-content-secondary">날짜 선택</span>
          <input
            type="date"
            value={selectedDate}
            max={fmtLocal(new Date())}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <span className="text-[13px] font-semibold text-content-secondary ml-md">직원</span>
          <div className="min-w-[160px]">
            <Select
              options={[{ value: '', label: '전체 직원' }, ...staffList.map(s => ({ value: String(s.id), label: s.name }))]}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
            />
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
        {/* 월 + 직원 필터 */}
        <div className="bg-surface rounded-xl border border-line p-lg mb-xl flex items-center gap-md flex-wrap">
          <Calendar size={16} className="text-content-tertiary" />
          <span className="text-[13px] font-semibold text-content-secondary">월 선택</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <span className="text-[13px] font-semibold text-content-secondary ml-md">직원</span>
          <div className="min-w-[160px]">
            <Select
              options={[{ value: '', label: '전체 직원' }, ...staffList.map(s => ({ value: String(s.id), label: s.name }))]}
              value={selectedStaffId}
              onChange={setSelectedStaffId}
            />
          </div>
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

      {/* 수동 보정 모달 (PAY-STF-01-05) */}
      <Modal
        isOpen={correctRow != null}
        onClose={() => setCorrectRow(null)}
        title={correctRow?.id ? '근태 수동 보정' : '누락 근태 추가'}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-sm">
            <Button variant="ghost" size="sm" onClick={() => setCorrectRow(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleCorrectSave}>저장</Button>
          </div>
        }
      >
        {correctRow && (
          <div className="space-y-md">
            <p className="text-Body-2 text-content-secondary">{correctRow.staffName} · {correctRow.date || selectedDate}</p>
            <div className="grid grid-cols-2 gap-md">
              <Input label="출근 시각" type="time" value={correctForm.clockIn} onChange={e => setCorrectForm(p => ({ ...p, clockIn: e.target.value }))} />
              <Input label="퇴근 시각" type="time" value={correctForm.clockOut} onChange={e => setCorrectForm(p => ({ ...p, clockOut: e.target.value }))} />
            </div>
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">상태</label>
              <Select options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))} value={correctForm.status} onChange={v => setCorrectForm(p => ({ ...p, status: v as AttendanceStatus }))} />
            </div>
            <div className="space-y-xs">
              <label className="text-Label font-semibold text-content-secondary">보정 사유 <span className="text-error">*</span></label>
              <Textarea value={correctForm.reason} onChange={e => setCorrectForm(p => ({ ...p, reason: e.target.value }))} rows={2} placeholder="보정 사유를 입력하세요" />
            </div>
            {/* 기존 보정 이력 */}
            {correctRow.corrections.length > 0 && (
              <div className="border-t border-line pt-sm space-y-xs">
                <p className="text-Label font-semibold text-content-secondary">보정 이력</p>
                {correctRow.corrections.map((c, i) => (
                  <div key={i} className="text-[11px] text-content-secondary">
                    <span className="font-semibold text-content">{c.at}</span> · {c.before} → {c.after} ({c.reason}, {c.by})
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
