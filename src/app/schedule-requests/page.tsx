'use client';
export const dynamic = 'force-dynamic';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  XOctagon,
  Clock,
  Filter,
  CalendarClock,
  Bell,
  AlertTriangle,
  X,
  RefreshCw,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import type { BadgeVariant } from '@/components/common/StatusBadge';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Textarea from '@/components/ui/Textarea';
import { toast } from 'sonner';
import { getBranchId } from '@/lib/getBranchId';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';

type RequestType = 'change' | 'cancel';
type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'alternative' | 'awaiting' | 'expired';

const REQUEST_TYPE_LABEL: Record<RequestType, string> = { change: '변경', cancel: '취소' };
const REQUEST_TYPE_VARIANT: Record<RequestType, BadgeVariant> = { change: 'info', cancel: 'warning' };

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: '대기',
  accepted: '수락',
  rejected: '거절',
  alternative: '대안제시',
  awaiting: '응답대기',
  expired: '만료',
};
const STATUS_VARIANT: Record<RequestStatus, BadgeVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  alternative: 'info',
  awaiting: 'peach',
  expired: 'default',
};

interface ScheduleRequestRow {
  id: number;
  requestType: RequestType;
  memberName: string;
  memberPhone: string | null;
  className: string;
  classTime: string;
  instructor: string | null;
  desiredTime: string | null;
  cancelReason: string | null;
  requestedAt: string;
  status: RequestStatus;
}

const TYPE_FILTERS: { key: 'all' | RequestType; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'change', label: '변경 요청' },
  { key: 'cancel', label: '취소 요청' },
];

const STATUS_FILTERS: { key: 'all' | 'pending' | 'done'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'done', label: '처리 완료' },
];

const isSlaExceeded = (row: ScheduleRequestRow): boolean => {
  if (row.status !== 'pending' && row.status !== 'awaiting') return false;
  const elapsedH = (Date.now() - new Date(row.requestedAt).getTime()) / 3_600_000;
  return elapsedH > 24;
};

function ScheduleRequestsContent() {
  const branchId = getBranchId();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const role = normalizeRole(currentUser?.role ?? 'readonly');
  const canProcessAll = isSuperAdmin || isRoleAtLeast(role, 'manager');

  const [requests, setRequests] = useState<ScheduleRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | RequestType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>(
    searchParams.get('status') === 'pending' ? 'pending' : 'all'
  );
  const [savingId, setSavingId] = useState<number | null>(null);

  const [alternativeModal, setAlternativeModal] = useState<{ open: boolean; requestId: number | null }>({ open: false, requestId: null });
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('');
  const [altMemo, setAltMemo] = useState('');

  const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: number | null }>({ open: false, requestId: null });
  const [rejectReason, setRejectReason] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('schedule_requests')
      .select('*')
      .eq('branchId', branchId)
      .order('requestedAt', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('일정 요청 목록을 불러오지 못했습니다.');
      setRequests([]);
    } else {
      setRequests((data ?? []) as ScheduleRequestRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, [branchId]);

  const canProcessRow = (row: ScheduleRequestRow) => {
    if (canProcessAll) return true;
    if (role !== 'fc') return false;
    return (row.instructor ?? '').trim() === (currentUser?.name ?? '').trim();
  };

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      if (typeFilter !== 'all' && request.requestType !== typeFilter) return false;
      if (statusFilter === 'pending' && !(request.status === 'pending' || request.status === 'awaiting')) return false;
      if (statusFilter === 'done' && !(request.status === 'accepted' || request.status === 'rejected' || request.status === 'expired')) return false;
      return true;
    });
  }, [requests, typeFilter, statusFilter]);

  const pendingCount = useMemo(() => requests.filter((request) => request.status === 'pending' || request.status === 'awaiting').length, [requests]);
  const slaCount = useMemo(() => requests.filter(isSlaExceeded).length, [requests]);

  const updateRequest = async (id: number, patch: Record<string, unknown>, successMessage: string) => {
    setSavingId(id);
    const { error } = await supabase
      .from('schedule_requests')
      .update({
        ...patch,
        processedBy: currentUser?.name ?? null,
        processedAt: new Date().toISOString(),
      })
      .eq('id', id);
    setSavingId(null);
    if (error) {
      toast.error('요청 처리에 실패했습니다.');
      return false;
    }
    toast.success(successMessage);
    loadRequests();
    return true;
  };

  const handleAccept = (row: ScheduleRequestRow) => {
    if (!canProcessRow(row)) return;
    updateRequest(row.id, { status: 'accepted' }, '요청을 수락했습니다. 수업 일정 반영과 회원 알림은 연동 큐에서 처리해야 합니다.');
  };

  const openReject = (row: ScheduleRequestRow) => {
    if (!canProcessRow(row)) return;
    setRejectReason('');
    setRejectModal({ open: true, requestId: row.id });
  };

  const handleRejectSubmit = async () => {
    if (rejectReason.trim().length < 5) {
      toast.error('거절 사유를 5자 이상 입력해주세요.');
      return;
    }
    const ok = await updateRequest(
      rejectModal.requestId!,
      { status: 'rejected', rejectReason: rejectReason.trim() },
      '요청을 거절하고 회원 안내 사유를 저장했습니다.'
    );
    if (ok) setRejectModal({ open: false, requestId: null });
  };

  const openAlternative = (row: ScheduleRequestRow) => {
    if (!canProcessRow(row)) return;
    setAltDate('');
    setAltTime('');
    setAltMemo('');
    setAlternativeModal({ open: true, requestId: row.id });
  };

  const handleAlternativeSubmit = async () => {
    if (!altDate || !altTime) {
      toast.error('대안 날짜와 시간을 입력해주세요.');
      return;
    }
    const ok = await updateRequest(
      alternativeModal.requestId!,
      {
        status: 'alternative',
        alternativeDate: altDate,
        alternativeTime: altTime,
        alternativeMemo: altMemo.trim() || null,
      },
      `대안 일정(${altDate} ${altTime})을 저장했습니다.`
    );
    if (ok) setAlternativeModal({ open: false, requestId: null });
  };

  const columns = [
    { key: 'no', header: 'No', width: 50, align: 'center' as const, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      key: 'requestType', header: '요청 유형', width: 80,
      render: (value: RequestType) => <StatusBadge variant={REQUEST_TYPE_VARIANT[value]} label={REQUEST_TYPE_LABEL[value]} />,
    },
    {
      key: 'memberName', header: '회원', width: 120,
      render: (value: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-content">{value}</span>
          <span className="text-[11px] text-content-secondary">{row.memberPhone ?? '-'}</span>
        </div>
      ),
    },
    {
      key: 'className', header: '원래 수업', width: 180,
      render: (value: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-content">{value}</span>
          <span className="text-[11px] text-content-secondary flex items-center gap-1">
            <Clock size={10} /> {row.classTime} · {row.instructor ?? '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'detail', header: '요청 내용',
      render: (_: unknown, row: ScheduleRequestRow) =>
        row.requestType === 'change' ? (
          <span className="text-[12px] text-content">희망: <span className="font-medium">{row.desiredTime ?? '-'}</span></span>
        ) : (
          <span className="text-[12px] text-content truncate max-w-[200px] block">{row.cancelReason ?? '-'}</span>
        ),
    },
    {
      key: 'requestedAt', header: '요청 일시', width: 130,
      render: (value: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-mono text-content">{value.slice(0, 16).replace('T', ' ')}</span>
          {isSlaExceeded(row) && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
              <AlertTriangle size={10} /> SLA 초과
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status', header: '처리 상태', width: 90,
      render: (value: RequestStatus) => <StatusBadge variant={STATUS_VARIANT[value]} label={STATUS_LABEL[value]} dot />,
    },
    {
      key: 'actions', header: '처리', width: 210, align: 'center' as const,
      render: (_: unknown, row: ScheduleRequestRow) => {
        const terminal = row.status === 'accepted' || row.status === 'rejected' || row.status === 'expired';
        if (terminal) return <span className="text-[11px] text-content-tertiary">처리 완료</span>;
        if (!canProcessRow(row)) return <span className="text-[11px] text-content-tertiary">조회만</span>;
        return (
          <div className="flex items-center gap-xs justify-center">
            <button
              className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-success/10 text-state-success border border-state-success/30 hover:bg-state-success/20 transition-all disabled:opacity-50"
              onClick={() => handleAccept(row)}
              disabled={savingId === row.id}
            >
              <CheckCircle2 size={11} /> 수락
            </button>
            {row.requestType === 'cancel' && (
              <button
                className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-info/10 text-state-info border border-state-info/30 hover:bg-state-info/20 transition-all disabled:opacity-50"
                onClick={() => openAlternative(row)}
                disabled={savingId === row.id}
              >
                <CalendarClock size={11} /> 대안 제시
              </button>
            )}
            <button
              className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-error/10 text-state-error border border-state-error/30 hover:bg-state-error/20 transition-all disabled:opacity-50"
              onClick={() => openReject(row)}
              disabled={savingId === row.id}
            >
              <XOctagon size={11} /> 거절
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
          description="회원이 앱에서 보낸 수업 변경·취소 요청을 검토하고 수락·거절·대안 제시합니다."
          actions={
            <Button variant="outline" size="sm" icon={<RefreshCw size={13} />} onClick={loadRequests} loading={loading}>
              새로고침
            </Button>
          }
        />

        {(pendingCount > 0 || slaCount > 0) && (
          <div className="flex flex-wrap items-center gap-sm">
            {pendingCount > 0 && (
              <div className="flex items-center gap-sm px-sm py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Bell size={15} className="text-amber-600 flex-shrink-0" />
                <span className="text-[13px] font-semibold text-amber-700">미처리 요청 <span className="font-bold">{pendingCount}건</span></span>
              </div>
            )}
            {slaCount > 0 && (
              <div className="flex items-center gap-sm px-sm py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
                <span className="text-[13px] font-semibold text-red-700">SLA 초과 (24시간) <span className="font-bold">{slaCount}건</span></span>
              </div>
            )}
          </div>
        )}

        <div className="bg-surface rounded-xl border border-line p-md shadow-xs flex flex-wrap items-center gap-lg">
          <div className="flex items-center gap-xs">
            <Filter size={14} className="text-content-secondary" />
            <span className="text-[12px] font-semibold text-content-secondary">요청 유형</span>
            {TYPE_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setTypeFilter(filter.key)}
                className={cn(
                  'h-8 px-md rounded-full text-[12px] font-semibold border transition-all',
                  typeFilter === filter.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-xs">
            <span className="text-[12px] font-semibold text-content-secondary">처리 상태</span>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  'h-8 px-md rounded-full text-[12px] font-semibold border transition-all',
                  statusFilter === filter.key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns as never}
          data={filtered}
          loading={loading}
          title={`일정 요청 목록 (${filtered.length}건)`}
          emptyMessage="처리할 요청이 없습니다."
          pagination={{ page: 1, pageSize: 20, total: filtered.length }}
        />
      </div>

      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[420px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <XOctagon className="text-state-error" size={17} /> 요청 거절
              </h2>
              <button onClick={() => setRejectModal({ open: false, requestId: null })} className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              <p className="text-[12px] text-content-secondary">거절 사유를 입력하세요. 회원에게 안내됩니다. (5자 이상)</p>
              <Textarea rows={3} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="거절 사유를 입력하세요" />
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors" onClick={() => setRejectModal({ open: false, requestId: null })}>취소</button>
              <button className="px-4 py-2 rounded-lg bg-state-error text-white text-[13px] font-medium hover:opacity-90 transition-opacity" onClick={handleRejectSubmit}>거절</button>
            </div>
          </div>
        </div>
      )}

      {alternativeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-[420px] mx-md overflow-hidden border border-line">
            <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface-secondary">
              <h2 className="text-[15px] font-bold text-content flex items-center gap-sm">
                <CalendarClock className="text-state-info" size={17} /> 대안 일정 제시
              </h2>
              <button onClick={() => setAlternativeModal({ open: false, requestId: null })} className="p-xs rounded-full hover:bg-surface-tertiary text-content-secondary transition-colors">
                <X size={17} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              <p className="text-[12px] text-content-secondary">회원에게 제안할 대안 날짜와 시간을 입력하세요.</p>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">대안 날짜 <span className="text-state-error">*</span></label>
                <input type="date" value={altDate} onChange={(event) => setAltDate(event.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">대안 시간 <span className="text-state-error">*</span></label>
                <input type="time" value={altTime} onChange={(event) => setAltTime(event.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">메모 (선택)</label>
                <Textarea rows={2} value={altMemo} onChange={(event) => setAltMemo(event.target.value)} placeholder="대안 제시 사유나 안내 메시지를 입력하세요" />
              </div>
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors" onClick={() => setAlternativeModal({ open: false, requestId: null })}>취소</button>
              <button className="px-4 py-2 rounded-lg bg-state-info text-white text-[13px] font-medium hover:opacity-90 transition-opacity" onClick={handleAlternativeSubmit}>대안 제시</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default function ScheduleRequests() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="rounded-xl border border-line bg-surface p-lg text-sm text-content-secondary">
            일정 요청 화면을 불러오는 중입니다.
          </div>
        </AppLayout>
      }
    >
      <ScheduleRequestsContent />
    </Suspense>
  );
}
