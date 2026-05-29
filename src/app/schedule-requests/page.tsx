'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  XOctagon,
  Clock,
  Filter,
  CalendarClock,
  Bell,
  AlertTriangle,
  X,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import type { BadgeVariant } from "@/components/common/StatusBadge";
import { cn } from "@/lib/utils";
import Textarea from '@/components/ui/Textarea';
import { toast } from "sonner";
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';

/**
 * SCR-C009 일정 요청 처리 (/schedule-requests)
 * 회원이 앱에서 보낸 수업 "변경/취소" 요청을 운영자가 수락·거절·대안제시 처리.
 * 백엔드 미구현 — 목업 데이터로 명세 축(요청유형 2종 / 처리상태 6종)을 구현.
 */

// 요청 유형: 변경 / 취소
type RequestType = 'change' | 'cancel';
// 처리 상태 6종: 대기 / 수락 / 거절 / 대안제시 / 응답대기 / 만료
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
  memberPhone: string;
  className: string;
  classTime: string;       // 원래 수업 일시
  instructor: string;
  desiredTime: string | null; // 변경 희망 일시
  cancelReason: string | null; // 취소 사유
  requestedAt: string;     // 요청 일시 (ISO)
  status: RequestStatus;
}

// 목업 데이터 (백엔드 미구현)
const MOCK_REQUESTS: ScheduleRequestRow[] = [
  { id: 1, requestType: 'change', memberName: '김민수', memberPhone: '010-1234-5678', className: 'PT 50분', classTime: '2026-05-30 10:00', instructor: '박코치', desiredTime: '2026-05-31 14:00', cancelReason: null, requestedAt: '2026-05-29T08:10:00', status: 'pending' },
  { id: 2, requestType: 'cancel', memberName: '이서연', memberPhone: '010-2222-3333', className: '필라테스 그룹', classTime: '2026-05-30 19:00', instructor: '최강사', desiredTime: null, cancelReason: '개인 사정으로 참석이 어렵습니다', requestedAt: '2026-05-28T07:00:00', status: 'pending' },
  { id: 3, requestType: 'change', memberName: '정도윤', memberPhone: '010-4444-5555', className: 'PT 50분', classTime: '2026-05-29 11:00', instructor: '박코치', desiredTime: '2026-05-29 16:00', cancelReason: null, requestedAt: '2026-05-29T09:30:00', status: 'alternative' },
  { id: 4, requestType: 'cancel', memberName: '강하늘', memberPhone: '010-6666-7777', className: 'GX 스피닝', classTime: '2026-05-28 18:00', instructor: '윤강사', desiredTime: null, cancelReason: '컨디션 난조', requestedAt: '2026-05-27T10:00:00', status: 'awaiting' },
  { id: 5, requestType: 'change', memberName: '한지민', memberPhone: '010-8888-9999', className: 'PT 30분', classTime: '2026-05-26 09:00', instructor: '박코치', desiredTime: '2026-05-27 09:00', cancelReason: null, requestedAt: '2026-05-25T08:00:00', status: 'accepted' },
  { id: 6, requestType: 'cancel', memberName: '오세훈', memberPhone: '010-1010-2020', className: '골프 레슨', classTime: '2026-05-25 15:00', instructor: '김프로', desiredTime: null, cancelReason: '중복 예약', requestedAt: '2026-05-24T11:00:00', status: 'rejected' },
  { id: 7, requestType: 'change', memberName: '임준호', memberPhone: '010-3030-4040', className: 'PT 50분', classTime: '2026-05-24 13:00', instructor: '최강사', desiredTime: '2026-05-25 13:00', cancelReason: null, requestedAt: '2026-05-23T09:00:00', status: 'expired' },
];

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

// 요청 생성 후 24시간 초과 + 미처리(대기/응답대기) → SLA 초과
const isSlaExceeded = (row: ScheduleRequestRow): boolean => {
  if (row.status !== 'pending' && row.status !== 'awaiting') return false;
  const elapsedH = (Date.now() - new Date(row.requestedAt).getTime()) / 3_600_000;
  return elapsedH > 24;
};

export default function ScheduleRequests() {
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const role = normalizeRole(currentUser?.role ?? 'readonly');
  // 수락·거절·대안제시는 트레이너 이상(FC/스태프는 조회만) — SCR-C009 권한표
  const canProcess = isSuperAdmin || isRoleAtLeast(role, 'fc');

  const [requests, setRequests] = useState<ScheduleRequestRow[]>(MOCK_REQUESTS);
  const [typeFilter, setTypeFilter] = useState<'all' | RequestType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');

  // 대안 제시 모달
  const [alternativeModal, setAlternativeModal] = useState<{ open: boolean; requestId: number | null }>({ open: false, requestId: null });
  const [altDate, setAltDate] = useState('');
  const [altTime, setAltTime] = useState('');
  const [altMemo, setAltMemo] = useState('');

  // 거절 모달
  const [rejectModal, setRejectModal] = useState<{ open: boolean; requestId: number | null }>({ open: false, requestId: null });
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter !== 'all' && r.requestType !== typeFilter) return false;
      if (statusFilter === 'pending' && !(r.status === 'pending' || r.status === 'awaiting')) return false;
      if (statusFilter === 'done' && !(r.status === 'accepted' || r.status === 'rejected' || r.status === 'expired')) return false;
      return true;
    });
  }, [requests, typeFilter, statusFilter]);

  // 미처리 건수(대기/응답대기) 및 SLA 초과 건수
  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending' || r.status === 'awaiting').length, [requests]);
  const slaCount = useMemo(() => requests.filter(isSlaExceeded).length, [requests]);

  const handleAccept = (id: number) => {
    if (!canProcess) return;
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'accepted' } : r)));
    toast.success('요청을 수락했습니다. 수업 일정에 자동 반영되고 회원에게 알림이 발송됩니다.');
  };

  const openReject = (id: number) => {
    if (!canProcess) return;
    setRejectReason('');
    setRejectModal({ open: true, requestId: id });
  };

  const handleRejectSubmit = () => {
    if (rejectReason.trim().length < 5) {
      toast.error('거절 사유를 5자 이상 입력해주세요.');
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === rejectModal.requestId ? { ...r, status: 'rejected' } : r)));
    toast.success('요청을 거절하고 회원에게 안내를 발송했습니다.');
    setRejectModal({ open: false, requestId: null });
  };

  const openAlternative = (id: number) => {
    if (!canProcess) return;
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
    setRequests((prev) => prev.map((r) => (r.id === alternativeModal.requestId ? { ...r, status: 'alternative' } : r)));
    toast.success(`대안 일정(${altDate} ${altTime})을 제시했습니다. 회원 응답을 기다립니다.`);
    setAlternativeModal({ open: false, requestId: null });
  };

  const columns = [
    { key: 'no', header: 'No', width: 50, align: 'center' as const, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      key: 'requestType', header: '요청 유형', width: 80,
      render: (v: RequestType) => <StatusBadge variant={REQUEST_TYPE_VARIANT[v]} label={REQUEST_TYPE_LABEL[v]} />,
    },
    {
      key: 'memberName', header: '회원', width: 120,
      render: (v: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-semibold text-content">{v}</span>
          <span className="text-[11px] text-content-secondary">{row.memberPhone}</span>
        </div>
      ),
    },
    {
      key: 'className', header: '원래 수업', width: 180,
      render: (v: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-medium text-content">{v}</span>
          <span className="text-[11px] text-content-secondary flex items-center gap-1">
            <Clock size={10} /> {row.classTime} · {row.instructor}
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
      render: (v: string, row: ScheduleRequestRow) => (
        <div className="flex flex-col">
          <span className="text-[12px] font-mono text-content">{v.slice(0, 16).replace('T', ' ')}</span>
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
      render: (v: RequestStatus) => <StatusBadge variant={STATUS_VARIANT[v]} label={STATUS_LABEL[v]} dot />,
    },
    ...(canProcess
      ? [{
          key: 'actions', header: '처리', width: 200, align: 'center' as const,
          render: (_: unknown, row: ScheduleRequestRow) => {
            const terminal = row.status === 'accepted' || row.status === 'rejected' || row.status === 'expired';
            if (terminal) return <span className="text-[11px] text-content-tertiary">처리 완료</span>;
            return (
              <div className="flex items-center gap-xs justify-center">
                <button
                  className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-success/10 text-state-success border border-state-success/30 hover:bg-state-success/20 transition-all"
                  onClick={() => handleAccept(row.id)}
                >
                  <CheckCircle2 size={11} /> 수락
                </button>
                {row.requestType === 'cancel' && (
                  <button
                    className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-info/10 text-state-info border border-state-info/30 hover:bg-state-info/20 transition-all"
                    onClick={() => openAlternative(row.id)}
                  >
                    <CalendarClock size={11} /> 대안 제시
                  </button>
                )}
                <button
                  className="flex items-center gap-xs px-sm py-[4px] rounded-md text-[11px] font-semibold bg-state-error/10 text-state-error border border-state-error/30 hover:bg-state-error/20 transition-all"
                  onClick={() => openReject(row.id)}
                >
                  <XOctagon size={11} /> 거절
                </button>
              </div>
            );
          },
        }]
      : []),
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="일정 요청 처리"
          description="회원이 앱에서 보낸 수업 변경·취소 요청을 검토하고 수락·거절·대안 제시합니다."
        />

        {/* 미처리 건수 + SLA 초과 배지 */}
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

        {/* 필터 영역 */}
        <div className="bg-surface rounded-xl border border-line p-md shadow-xs flex flex-wrap items-center gap-lg">
          <div className="flex items-center gap-xs">
            <Filter size={14} className="text-content-secondary" />
            <span className="text-[12px] font-semibold text-content-secondary">요청 유형</span>
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTypeFilter(t.key)}
                className={cn(
                  "h-8 px-md rounded-full text-[12px] font-semibold border transition-all",
                  typeFilter === t.key
                    ? "bg-primary text-white border-primary"
                    : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-xs">
            <span className="text-[12px] font-semibold text-content-secondary">처리 상태</span>
            {STATUS_FILTERS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatusFilter(s.key)}
                className={cn(
                  "h-8 px-md rounded-full text-[12px] font-semibold border transition-all",
                  statusFilter === s.key
                    ? "bg-primary text-white border-primary"
                    : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns as never}
          data={filtered}
          title={`일정 요청 목록 (${filtered.length}건)`}
          emptyMessage="처리할 요청이 없습니다."
          pagination={{ page: 1, pageSize: 20, total: filtered.length }}
        />
      </div>

      {/* 거절 모달 */}
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
              <Textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="거절 사유를 입력하세요" />
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors" onClick={() => setRejectModal({ open: false, requestId: null })}>취소</button>
              <button className="px-4 py-2 rounded-lg bg-state-error text-white text-[13px] font-medium hover:opacity-90 transition-opacity" onClick={handleRejectSubmit}>거절</button>
            </div>
          </div>
        </div>
      )}

      {/* 대안 제시 모달 */}
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
                <input type="date" value={altDate} onChange={(e) => setAltDate(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">대안 시간 <span className="text-state-error">*</span></label>
                <input type="time" value={altTime} onChange={(e) => setAltTime(e.target.value)} className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
              </div>
              <div className="space-y-xs">
                <label className="text-[12px] font-semibold text-content">메모 (선택)</label>
                <Textarea rows={2} value={altMemo} onChange={(e) => setAltMemo(e.target.value)} placeholder="대안 제시 사유나 안내 메시지를 입력하세요" />
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
