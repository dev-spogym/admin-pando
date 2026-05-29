'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  Bell,
  ShieldCheck,
  CalendarClock,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Textarea from '@/components/ui/Textarea';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import {
  MOCK_WAITLIST_CLASSES,
  MOCK_WAITLIST_ENTRIES,
  MOCK_ALTERNATIVE_SLOTS,
  type WaitlistEntry,
  type WaitlistMemberStatus,
} from '@/mocks/class';

// ─── SCR-C012 대기열 관리 (CLS-12) ────────────────────────────────────────────
// docs4/V1+V2/D04-수업관리/수업관리.md ## SCR-C012
// 만석 수업 대기 신청자 순번 관리 → 수동 배정 / 알림 발송 / 대기 취소.
// D10 자동 배정 정책 ON/OFF를 읽기 전용 배지로 표시(본 화면에서 토글 변경 X).
// DLG-C016 대안 일정 제시 모달 연결. 만료/페널티 회원 수동 배정 차단. 4축 상태.

const STATUS_VARIANT: Record<WaitlistMemberStatus, BadgeVariant> = {
  대기중: 'warning',
  배정가능: 'success',
  취소: 'default',
};

// D10 SCR-H1001 대기열 자동 알림/배정 정책 상태(읽기 전용). 목업: ON.
const AUTO_ASSIGN_POLICY_ON = true;

export default function ClassWaitlistPage() {
  const authUser = useAuthStore((s) => s.user);
  const role = normalizeRole(authUser?.role ?? '');
  // 수동 배정·대기 취소·알림은 매니저 이상 또는 FC/스태프. (트레이너 조회 전용은 별도 역할 분리 시 처리)
  const canManage = authUser?.isSuperAdmin || isRoleAtLeast(role, 'manager') || role === 'fc' || role === 'staff';

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [classId, setClassId] = useState(MOCK_WAITLIST_CLASSES[0]?.id ?? '');
  const [search, setSearch] = useState('');

  // DLG-C016 대안 일정 제시 모달
  const [altTarget, setAltTarget] = useState<WaitlistEntry | null>(null);
  const [altSlotId, setAltSlotId] = useState('');
  const [altMessage, setAltMessage] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setEntries(MOCK_WAITLIST_ENTRIES);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const selectedClass = useMemo(() => MOCK_WAITLIST_CLASSES.find((c) => c.id === classId) ?? null, [classId]);

  const classEntries = useMemo(
    () => entries.filter((e) => e.classId === classId).sort((a, b) => a.rank - b.rank),
    [entries, classId]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return classEntries;
    return classEntries.filter((e) => e.memberName.includes(q) || e.memberPhone.includes(q));
  }, [classEntries, search]);

  const stats = useMemo(() => {
    const waiting = classEntries.length;
    const assignable = classEntries.filter((e) => e.status === '배정가능').length;
    const seatsOpen = selectedClass ? Math.max(0, selectedClass.capacity - selectedClass.reserved) : 0;
    return { waiting, assignable, seatsOpen };
  }, [classEntries, selectedClass]);

  // 수동 배정: 만료/페널티 차단
  const handleAssign = (entry: WaitlistEntry) => {
    if (!entry.passValid) {
      toast.error('이용권이 만료된 회원입니다. 횟수 충전 후 배정할 수 있습니다.');
      return;
    }
    if (entry.hasPenalty) {
      toast.error('페널티 보유 회원입니다. 페널티 해제 후 배정할 수 있습니다.');
      return;
    }
    // 배정 = 대기열에서 제거 + 잔여 순번 재정렬
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entry.id);
      let rank = 0;
      return next.map((e) => (e.classId === entry.classId ? { ...e, rank: ++rank } : e));
    });
    toast.success(`${entry.memberName}님을 예약 확정 처리했습니다.`);
  };

  const handleNotify = (entry: WaitlistEntry) => {
    toast.success(`${entry.memberName}님에게 자리 발생 알림을 발송했습니다.`);
  };

  const handleCancel = (entry: WaitlistEntry) => {
    setEntries((prev) => {
      const next = prev.filter((e) => e.id !== entry.id);
      let rank = 0;
      return next.map((e) => (e.classId === entry.classId ? { ...e, rank: ++rank } : e));
    });
    toast.success(`${entry.memberName}님의 대기 신청을 취소했습니다.`);
  };

  // DLG-C016 대안 일정 발송
  const handleSendAlternative = () => {
    if (!altTarget) return;
    if (!altSlotId) {
      toast.error('제안할 대안 일정을 선택해주세요.');
      return;
    }
    const slot = MOCK_ALTERNATIVE_SLOTS.find((s) => s.id === altSlotId);
    setAltTarget(null);
    setAltSlotId('');
    setAltMessage('');
    toast.success(`${altTarget.memberName}님에게 대안 일정(${slot?.date} ${slot?.time})을 제안했습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="대기열 관리"
        description="만석 수업의 대기 신청자를 순번대로 관리하고 자리 발생 시 배정·알림을 처리합니다."
        actions={
          <StatusBadge variant={AUTO_ASSIGN_POLICY_ON ? 'mint' : 'default'} dot>
            <ShieldCheck size={12} className="mr-[2px]" />
            자동 배정 정책 {AUTO_ASSIGN_POLICY_ON ? 'ON' : 'OFF'}
          </StatusBadge>
        }
      />

      {/* 수업 선택 + 요약 */}
      <div className="mb-lg flex flex-col gap-md lg:flex-row lg:items-center">
        <div className="w-full lg:w-[280px]">
          <Select
            label="대기열 조회 수업"
            value={classId}
            onChange={setClassId}
            options={MOCK_WAITLIST_CLASSES.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.schedule}) · ${c.reserved}/${c.capacity}`,
            }))}
          />
        </div>
        {!AUTO_ASSIGN_POLICY_ON && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
            자동 배정 정책이 OFF입니다. 자리 발생 시 수동 배정 버튼으로 직접 처리하세요.
          </div>
        )}
      </div>

      <StatCardGrid cols={3} className="mb-xl">
        <StatCard label="전체 대기" value={`${stats.waiting}명`} icon={<Users />} variant="peach" loading={loading} />
        <StatCard label="배정 가능" value={`${stats.assignable}명`} icon={<UserCheck />} variant="mint" loading={loading} />
        <StatCard label="발생 자리" value={`${stats.seatsOpen}석`} icon={<CalendarClock />} loading={loading} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line p-lg">
          <h3 className="text-[14px] font-semibold text-content">
            {selectedClass ? `${selectedClass.name} 대기 신청자` : '대기 신청자'}
          </h3>
          <div className="relative w-[220px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
            <input
              type="text"
              placeholder="회원명·연락처 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-[6px] bg-surface-secondary border border-line rounded-lg text-[13px] text-content placeholder-content-tertiary focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* 4축 상태 */}
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-md px-lg py-4">
                <div className="h-8 w-8 animate-pulse rounded-full bg-surface-tertiary" />
                <div className="h-4 w-32 animate-pulse rounded bg-surface-tertiary" />
                <div className="ml-auto h-7 w-48 animate-pulse rounded bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? Search : Users}
            title={search ? '검색 결과가 없어요' : '대기 신청자가 없어요'}
            description={
              search
                ? '회원명이나 연락처를 다시 확인해 보세요.'
                : '다른 수업을 선택하거나, 정원이 차면 대기 신청이 표시됩니다.'
            }
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <div className="divide-y divide-line/60">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-md px-lg py-4 hover:bg-surface-secondary/60 transition-colors">
                <div className="flex items-center gap-md">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-[13px] font-bold text-primary">
                    {entry.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[14px] font-semibold text-content">{entry.memberName}</span>
                      <StatusBadge variant={STATUS_VARIANT[entry.status]} dot>{entry.status}</StatusBadge>
                      {!entry.passValid && <StatusBadge variant="error">이용권 만료</StatusBadge>}
                      {entry.hasPenalty && <StatusBadge variant="warning">페널티</StatusBadge>}
                    </div>
                    <div className="mt-[2px] flex items-center gap-xs text-[11px] text-content-tertiary">
                      <span className="tabular-nums">{entry.memberPhone}</span>
                      <span>·</span>
                      <span>신청 {entry.requestedAt}</span>
                      <span>·</span>
                      <span>{entry.autoAssignAgreed ? '자동 배정 동의' : '알림만'}</span>
                    </div>
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-xs">
                    <Button variant="outline" size="sm" icon={<CalendarClock size={13} />} onClick={() => setAltTarget(entry)}>
                      대안 제시
                    </Button>
                    <Button variant="outline" size="sm" icon={<Bell size={13} />} onClick={() => handleNotify(entry)}>
                      알림
                    </Button>
                    <Button variant="primary" size="sm" disabled={!entry.passValid || entry.hasPenalty} onClick={() => handleAssign(entry)}>
                      수동 배정
                    </Button>
                    <button
                      onClick={() => handleCancel(entry)}
                      className="rounded-md border border-line px-2 py-[6px] text-[11px] font-semibold text-content-secondary hover:bg-red-50 hover:text-state-error hover:border-red-200 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DLG-C016 대안 일정 제시 */}
      <Modal
        isOpen={altTarget !== null}
        onClose={() => { setAltTarget(null); setAltSlotId(''); setAltMessage(''); }}
        title="대안 일정 제시"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => { setAltTarget(null); setAltSlotId(''); setAltMessage(''); }}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleSendAlternative}>제안 발송</Button>
          </div>
        }
      >
        {altTarget && (
          <div className="space-y-md">
            {/* 원래 수업 정보 (읽기 전용) */}
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">대기 중 수업</p>
              <p className="mt-[2px] text-[13px] font-bold text-content">{selectedClass?.name} · {selectedClass?.schedule}</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{altTarget.memberName} · 순번 {altTarget.rank}번</p>
            </div>

            {/* 대안 일정 목록 (같은 유형, 잔여 자리 있는 수업) */}
            <div>
              <p className="mb-sm text-[12px] font-semibold text-content-secondary">대안 일정 선택</p>
              <div className="space-y-xs">
                {MOCK_ALTERNATIVE_SLOTS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setAltSlotId(slot.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-md py-sm text-left transition-colors',
                      altSlotId === slot.id ? 'border-primary bg-primary-light/40' : 'border-line bg-surface hover:bg-surface-secondary'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-xs">
                        <span className="text-[13px] font-semibold text-content">{slot.className}</span>
                        <StatusBadge variant="info">{slot.sessionType}</StatusBadge>
                      </div>
                      <div className="mt-[2px] text-[11px] text-content-tertiary">{slot.date} {slot.time} · {slot.instructor} · {slot.room}</div>
                    </div>
                    <span className="text-[12px] font-semibold text-state-success tabular-nums">잔여 {slot.remainingSeats}석</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 안내 메시지 (선택) */}
            <div>
              <label className="mb-xs block text-[12px] font-semibold text-content-secondary">안내 메시지 (선택)</label>
              <Textarea
                rows={2}
                placeholder="회원에게 전달할 추가 메시지를 입력하세요."
                value={altMessage}
                onChange={(e) => setAltMessage(e.target.value)}
              />
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
