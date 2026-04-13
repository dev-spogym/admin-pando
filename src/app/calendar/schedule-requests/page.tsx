import React, { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XOctagon,
  Clock,
  Users,
  Filter,
  Loader2,
  CalendarDays,
  Bell,
  CalendarClock,
  X,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getScheduleRequests,
  approveSchedule,
  rejectSchedule,
  type ScheduleRequest,
} from "@/api/endpoints/scheduleRequests";

/**
 * SCR-XXX: 일정 요청 처리 (#19)
 * 회원 앱에서 요청된 일정을 승인/거절 처리
 */

// 분류 색상
const CATEGORY_COLORS: Record<string, string> = {
  방문:   '#3B82F6',
  OT:     '#10B981',
  상담:   '#F59E0B',
  체성분: '#8B5CF6',
  수업:   '#EF4444',
  PT:     '#F97316',
  기타:   '#6B7280',
};

const TYPE_FILTERS = ['전체', '방문', 'OT', '상담', '체성분', '수업', 'PT', '기타'] as const;

export default function ScheduleRequests() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('전체');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  // 대안 제시 모달
  const [alternativeModal, setAlternativeModal] = useState<{ open: boolean; requestId: number | null }>({ open: false, requestId: null });
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('');
  const [altMemo, setAltMemo] = useState('');

  const branchId = Number(localStorage.getItem('branchId') ?? 1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getScheduleRequests(branchId);
      if (res.success) {
        setRequests(res.data ?? []);
      } else {
        toast.error(res.message ?? '일정 요청을 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 필터링
  const filtered = requests.filter(r => {
    if (typeFilter !== '전체' && r.schedule_category !== typeFilter) return false;
    if (dateFrom && r.startTime && r.startTime < dateFrom) return false;
    if (dateTo && r.startTime && r.startTime > dateTo + 'T23:59:59') return false;
    return true;
  });

  const handleApprove = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await approveSchedule(id);
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
        toast.success('일정이 승인되었습니다.');
      } else {
        toast.error(res.message ?? '승인에 실패했습니다.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openAlternativeModal = (id: number) => {
    setAltDate('');
    setAltTime('');
    setAltMemo('');
    setAlternativeModal({ open: true, requestId: id });
  };

  const handleAlternativeSubmit = () => {
    if (!altDate || !altTime) {
      toast.error('대안 날짜와 시간을 입력해주세요.');
      return;
    }
    toast.success(`대안 일정(${altDate} ${altTime})을 제시했습니다.`);
    setAlternativeModal({ open: false, requestId: null });
  };

  const handleReject = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await rejectSchedule(id);
      if (res.success) {
        setRequests(prev => prev.filter(r => r.id !== id));
        toast.success('일정이 거절되었습니다.');
      } else {
        toast.error(res.message ?? '거절에 실패했습니다.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const columns = [
    {
      key: 'no',
      header: 'No',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, i: number) => i + 1,
    },
    {
      key: 'createdAt',
      header: '요청일',
      width: 120,
      render: (val: string | null) =>
        val ? (
          <span className="text-[12px] font-mono text-content">{val.split('T')[0]}</span>
        ) : (
          <span className="text-[12px] text-content-tertiary">-</span>
        ),
    },
    {
      key: 'targetName',
      header: '대상',
      width: 120,
      render: (val: string | null, row: ScheduleRequest) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-content">{val ?? '-'}</span>
          {row.target_type && (
            <span className="text-[11px] text-content-secondary">{row.target_type}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      width: 90,
      render: (val: string | null) =>
        val ? (
          <StatusBadge variant="info" label={val} />
        ) : (
          <span className="text-[12px] text-content-tertiary">-</span>
        ),
    },
    {
      key: 'scheduleCategory',
      header: '분류',
      width: 90,
      render: (val: string | null) => {
        if (!val) return <span className="text-[12px] text-content-tertiary">-</span>;
        const color = CATEGORY_COLORS[val] ?? '#6B7280';
        return (
          <span
            className="inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold"
            style={{ backgroundColor: color + '20', color }}
          >
            {val}
          </span>
        );
      },
    },
    {
      key: 'startTime',
      header: '일시',
      width: 160,
      render: (val: string | null, row: ScheduleRequest) => {
        if (!val) return <span className="text-[12px] text-content-tertiary">-</span>;
        const start = new Date(val).toLocaleString('ko-KR', {
          month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const end = row.endTime
          ? new Date(row.endTime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
          : '';
        return (
          <div className="flex items-center gap-xs text-[12px] text-content">
            <Clock size={12} className="text-content-secondary flex-shrink-0" />
            <span>{start}{end ? ` ~ ${end}` : ''}</span>
          </div>
        );
      },
    },
    {
      key: 'memo',
      header: '요청 내용',
      render: (val: string | null) =>
        val ? (
          <span className="text-[12px] text-content truncate max-w-[200px] block">{val}</span>
        ) : (
          <span className="text-[12px] text-content-tertiary">-</span>
        ),
    },
    {
      key: 'approvalStatus',
      header: '상태',
      width: 80,
      render: (val: string) => (
        <StatusBadge
          variant={val === 'approved' ? 'success' : val === 'rejected' ? 'error' : 'warning'}
          label={val === 'pending' ? '미승인' : val === 'approved' ? '승인' : '거절'}
          dot
        />
      ),
    },
    {
      key: 'actions',
      header: '처리',
      width: 140,
      align: 'center' as const,
      render: (_: any, row: ScheduleRequest) => {
        const isProcessing = processingId === row.id;
        return (
          <div className="flex items-center gap-xs justify-center">
            <button
              disabled={isProcessing}
              className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-success/10 text-state-success border border-state-success/30 hover:bg-state-success/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => handleApprove(row.id)}
            >
              {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
              승인
            </button>
            <button
              disabled={isProcessing}
              className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-information/10 text-information border border-information/30 hover:bg-information/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => openAlternativeModal(row.id)}
            >
              <CalendarClock size={11} />
              대안 제시
            </button>
            <button
              disabled={isProcessing}
              className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-error/10 text-state-error border border-state-error/30 hover:bg-state-error/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => handleReject(row.id)}
            >
              <XOctagon size={11} />
              거절
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="일정 요청 처리"
          description="회원 앱에서 요청된 일정을 승인하거나 거절합니다."
        />

        {/* 미승인 건수 배지 */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-sm p-sm bg-amber-50 border border-amber-200 rounded-xl">
            <Bell size={15} className="text-amber-600 flex-shrink-0" />
            <span className="text-[13px] font-semibold text-amber-700">
              처리 대기 중인 일정 요청 <span className="font-bold">{filtered.length}건</span>
            </span>
          </div>
        )}

        {/* 필터 영역 */}
        <div className="bg-surface rounded-xl border border-line p-md shadow-xs flex flex-wrap items-center gap-md">
          <Filter size={14} className="text-content-secondary" />
          {/* 유형별 필터 */}
          <div className="flex flex-wrap items-center gap-xs">
            {TYPE_FILTERS.map(t => {
              const color = t !== '전체' ? (CATEGORY_COLORS[t] ?? '#6B7280') : null;
              const isSelected = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "h-8 px-md rounded-full text-[12px] font-semibold border transition-all",
                    isSelected && !color
                      ? "bg-primary text-white border-primary"
                      : !isSelected
                      ? "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                      : ""
                  )}
                  style={color && isSelected
                    ? { backgroundColor: color, color: '#fff', borderColor: color }
                    : color && !isSelected
                    ? { backgroundColor: color + '15', color, borderColor: color + '40' }
                    : {}
                  }
                >
                  {t}
                </button>
              );
            })}
          </div>
          {/* 기간 필터 */}
          <div className="flex items-center gap-xs ml-auto">
            <CalendarDays size={14} className="text-content-secondary" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 rounded-lg bg-surface-secondary border border-line px-sm text-[12px] outline-none focus:border-primary transition-colors"
            />
            <span className="text-[12px] text-content-secondary">~</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 rounded-lg bg-surface-secondary border border-line px-sm text-[12px] outline-none focus:border-primary transition-colors"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="h-9 px-sm text-[12px] text-content-secondary hover:text-content transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-sm py-xl text-[13px] text-content-secondary">
            <Loader2 size={18} className="animate-spin text-primary" />
            데이터를 불러오는 중...
          </div>
        ) : (
          <DataTable
            columns={columns as any}
            data={filtered}
            title={`미승인 일정 요청 목록 (${filtered.length}건)`}
            pagination={{ page: 1, pageSize: 20, total: filtered.length }}
          />
        )}
      </div>

      {/* 대안 제시 모달 */}
      {alternativeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[420px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <CalendarClock className="text-information" size={17} />
                대안 일정 제시
              </h2>
              <button
                onClick={() => setAlternativeModal({ open: false, requestId: null })}
                className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors"
              >
                <X size={17} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              <p className="text-[12px] text-content-secondary">
                회원에게 제안할 대안 날짜와 시간을 입력하세요.
              </p>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">
                  대안 날짜 <span className="text-state-error">*</span>
                </label>
                <input
                  type="date"
                  value={altDate}
                  onChange={e => setAltDate(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">
                  대안 시간 <span className="text-state-error">*</span>
                </label>
                <input
                  type="time"
                  value={altTime}
                  onChange={e => setAltTime(e.target.value)}
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">메모 (선택)</label>
                <textarea
                  rows={2}
                  value={altMemo}
                  onChange={e => setAltMemo(e.target.value)}
                  placeholder="대안 제시 사유나 안내 메시지를 입력하세요"
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button
                className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors"
                onClick={() => setAlternativeModal({ open: false, requestId: null })}
              >
                취소
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-information text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
                onClick={handleAlternativeSubmit}
              >
                대안 제시
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
