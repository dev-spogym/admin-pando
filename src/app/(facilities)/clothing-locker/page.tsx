'use client';
export const dynamic = 'force-dynamic';

// SCR-I004 옷 락커 운영 관리 (docs4 V1/V2 D11-통합운영, registry route /clothing-locker)
// 출석과 연동되는 당일용 옷 락커를 실시간 운영한다.
//  - 당일 옷 락커 그리드: 사용 현황(빈/사용중/만료임박/점검중)을 한눈에 파악
//  - 미배정 회원 패널: 출석 완료했으나 옷 락커 미배정인 회원 + 배정 버튼
//  - 출석 연동: 각 회원의 출석 채널·시각 표시, 배정/회수 시 그리드 즉시 갱신
//  - DLG-I002 옷 락커 배정 모달
// 당일 운영 상태는 날짜별 branch_settings에 저장하고, 미배정 회원은 attendance 원장에서 산출한다.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Shirt,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  QrCode,
  ScanFace,
  Smartphone,
  Hand,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast } from '@/lib/permissions';
import { getCurrentBranchId, loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';
import { supabase } from '@/lib/supabase';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type LockerStatus = 'available' | 'in_use' | 'expiring' | 'maintenance';
type AttendanceChannel = 'kiosk_qr' | 'app_qr' | 'face' | 'manual';

interface DailyLocker {
  id: string;
  number: string;
  status: LockerStatus;
  memberName: string | null;
  memberId?: string | null;
  memberNo?: string | null;
  channel?: AttendanceChannel | null;
  checkInAt?: string | null;
  membership?: string | null;
  fixedLocker?: string | null;
  assignedAt: string | null; // HH:mm
}

interface UnassignedMember {
  id: string;
  name: string;
  memberNo: string;
  channel: AttendanceChannel;
  checkInAt: string; // HH:mm
  membership: string;
  fixedLocker: string | null; // 보유 고정 물품 락커 번호
}

interface ClothingLockerState {
  lockers: DailyLocker[];
  updatedAt: string;
}

// ─── 상수 ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<LockerStatus, { label: string; cell: string; legend: string }> = {
  available: {
    label: '사용 가능',
    cell: 'bg-surface border-line text-content-secondary',
    legend: 'bg-surface border-line',
  },
  in_use: {
    label: '사용 중',
    cell: 'bg-state-info/10 border-state-info text-state-info',
    legend: 'bg-state-info/10 border-state-info',
  },
  expiring: {
    label: '만료 임박',
    cell: 'bg-primary/10 border-primary text-primary',
    legend: 'bg-primary/10 border-primary',
  },
  maintenance: {
    label: '점검 중',
    cell: 'bg-surface-secondary border-line text-content-tertiary grayscale opacity-50 cursor-not-allowed',
    legend: 'bg-surface-secondary border-line opacity-50',
  },
};

const CHANNEL_META: Record<AttendanceChannel, { label: string; icon: React.ReactNode }> = {
  kiosk_qr: { label: '키오스크 QR', icon: <QrCode size={12} /> },
  app_qr: { label: '앱 QR', icon: <Smartphone size={12} /> },
  face: { label: '얼굴인식', icon: <ScanFace size={12} /> },
  manual: { label: '수동', icon: <Hand size={12} /> },
};

// ─── 운영 상태 기본값/변환 ────────────────────────────────────────────────────

function getTodaySettingKey() {
  const today = new Date().toISOString().slice(0, 10);
  return `clothing_locker_daily_state_${today}`;
}

function buildDefaultLockers(): DailyLocker[] {
  const lockers: DailyLocker[] = [];
  const maintenanceSet = new Set([40, 41]);
  for (let i = 1; i <= 60; i++) {
    let status: LockerStatus = 'available';
    if (maintenanceSet.has(i)) {
      status = 'maintenance';
    }
    lockers.push({ id: `L-${i}`, number: String(i), status, memberName: null, assignedAt: null });
  }
  return lockers;
}

function normalizeLockers(lockers: DailyLocker[] | undefined): DailyLocker[] {
  const base = buildDefaultLockers();
  const saved = new Map((lockers ?? []).map((locker) => [locker.id, locker]));
  return base.map((locker) => ({ ...locker, ...(saved.get(locker.id) ?? {}) }));
}

function toChannel(method?: string | null): AttendanceChannel {
  if (method === 'APP') return 'app_qr';
  if (method === 'MANUAL') return 'manual';
  return 'kiosk_qr';
}

function toHHMM(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function ClothingLockerOperationPage() {
  const role = useAuthStore((s) => s.user?.role);
  // 트레이너(readonly)는 조회만, 스태프 이상은 배정/회수 가능 (docs4 SCR-I004/DLG-I002 권한)
  const canAssign = isRoleAtLeast(role ?? '', 'staff');

  const [settingKey] = useState(getTodaySettingKey);
  const [isLoading, setIsLoading] = useState(true);
  const [settingsReady, setSettingsReady] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('-');
  const [lockers, setLockers] = useState<DailyLocker[]>(() => buildDefaultLockers());
  const [unassigned, setUnassigned] = useState<UnassignedMember[]>([]);

  // DLG-I002 옷 락커 배정 모달 상태
  const [assignTarget, setAssignTarget] = useState<UnassignedMember | null>(null);
  const [pickedLockerId, setPickedLockerId] = useState<string | null>(null);

  const stats = useMemo(() => ({
    total: lockers.length,
    inUse: lockers.filter((l) => l.status === 'in_use' || l.status === 'expiring').length,
    available: lockers.filter((l) => l.status === 'available').length,
    expiring: lockers.filter((l) => l.status === 'expiring').length,
    unassigned: unassigned.length,
  }), [lockers, unassigned]);

  const availableLockers = useMemo(
    () => lockers.filter((l) => l.status === 'available'),
    [lockers],
  );

  const loadUnassignedMembers = async (sourceLockers: DailyLocker[]) => {
    const branchId = getCurrentBranchId();
    const assignedIds = new Set(
      sourceLockers
        .filter((locker) => locker.status === 'in_use' || locker.status === 'expiring')
        .map((locker) => locker.memberId)
        .filter(Boolean),
    );
    const { start, end } = todayRange();
    const { data: attendances, error } = await supabase
      .from('attendance')
      .select('id, memberId, memberName, checkInAt, checkInMethod, branchId')
      .eq('branchId', branchId)
      .gte('checkInAt', start)
      .lt('checkInAt', end)
      .order('checkInAt', { ascending: false });

    if (error) throw error;

    const latestByMember = new Map<string, Record<string, any>>();
    (attendances ?? []).forEach((row) => {
      const memberId = String(row.memberId);
      if (!assignedIds.has(memberId) && !latestByMember.has(memberId)) {
        latestByMember.set(memberId, row);
      }
    });

    const memberIds = Array.from(latestByMember.keys()).map(Number).filter(Number.isFinite);
    const memberMap = new Map<number, Record<string, any>>();
    const fixedLockerMap = new Map<number, string>();

    if (memberIds.length > 0) {
      const [{ data: members }, { data: fixedLockers }] = await Promise.all([
        supabase.from('members').select('id, membershipType, membershipExpiry').eq('branchId', branchId).in('id', memberIds),
        supabase.from('lockers').select('memberId, number, zone, status').eq('branchId', branchId).in('memberId', memberIds),
      ]);

      (members ?? []).forEach((member) => memberMap.set(Number(member.id), member));
      (fixedLockers ?? []).forEach((locker) => {
        if (locker.memberId != null && locker.status !== 'AVAILABLE') {
          const label = locker.zone ? `${locker.zone}-${locker.number}` : String(locker.number);
          fixedLockerMap.set(Number(locker.memberId), label);
        }
      });
    }

    return Array.from(latestByMember.values()).map((row) => {
      const memberId = Number(row.memberId);
      const member = memberMap.get(memberId);
      return {
        id: String(row.memberId),
        name: row.memberName ?? `회원 ${row.memberId}`,
        memberNo: `M-${String(row.memberId).padStart(5, '0')}`,
        channel: toChannel(row.checkInMethod),
        checkInAt: toHHMM(row.checkInAt),
        membership: member?.membershipType ?? '이용권 미등록',
        fixedLocker: fixedLockerMap.get(memberId) ?? null,
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      setIsLoading(true);
      try {
        const saved = await loadBranchSetting<ClothingLockerState | null>(settingKey, null);
        const nextLockers = normalizeLockers(saved?.lockers);
        const nextUnassigned = await loadUnassignedMembers(nextLockers);
        if (cancelled) return;
        setLockers(nextLockers);
        setUnassigned(nextUnassigned);
        setLastSyncedAt(saved?.updatedAt ? new Date(saved.updatedAt).toLocaleTimeString('ko-KR') : new Date().toLocaleTimeString('ko-KR'));
        setSettingsReady(true);
      } catch (error) {
        console.error(error);
        if (!cancelled) toast.error('옷 락커 운영 상태를 불러오지 못했습니다.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadState();
    return () => {
      cancelled = true;
    };
  }, [settingKey]);

  useEffect(() => {
    if (!settingsReady) return;
    const updatedAt = new Date().toISOString();
    saveBranchSetting<ClothingLockerState>(settingKey, { lockers, updatedAt }).then((error) => {
      if (error) console.error('[clothing-locker] save failed:', error);
    });
  }, [lockers, settingKey, settingsReady]);

  // 배정 가능 권한 가드
  const guard = () => {
    if (!canAssign) {
      toast.error('락커 배정 권한이 없습니다. (트레이너는 조회만 가능)');
      return false;
    }
    return true;
  };

  // 미배정 회원 → 배정 모달 열기 (DLG-I002)
  const openAssign = (member: UnassignedMember) => {
    if (!guard()) return;
    setAssignTarget(member);
    setPickedLockerId(null);
  };

  // 배정 확정
  const confirmAssign = () => {
    if (!assignTarget || !pickedLockerId) return;
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setLockers((prev) =>
      prev.map((l) =>
        l.id === pickedLockerId
          ? {
              ...l,
              status: 'in_use',
              memberName: assignTarget.name,
              memberId: assignTarget.id,
              memberNo: assignTarget.memberNo,
              channel: assignTarget.channel,
              checkInAt: assignTarget.checkInAt,
              membership: assignTarget.membership,
              fixedLocker: assignTarget.fixedLocker,
              assignedAt: hhmm,
            }
          : l,
      ),
    );
    setUnassigned((prev) => prev.filter((m) => m.id !== assignTarget.id));
    const lockerNo = lockers.find((l) => l.id === pickedLockerId)?.number;
    toast.success(`${assignTarget.name} 회원에게 ${lockerNo}번 옷 락커가 배정되었습니다.`);
    setAssignTarget(null);
    setPickedLockerId(null);
  };

  // 락커 회수 (사용 중 셀 클릭)
  const releaseLocker = (locker: DailyLocker) => {
    if (locker.status !== 'in_use' && locker.status !== 'expiring') return;
    if (!guard()) return;
    setLockers((prev) =>
      prev.map((l) =>
        l.id === locker.id
          ? {
              ...l,
              status: 'available',
              memberName: null,
              memberId: null,
              memberNo: null,
              channel: null,
              checkInAt: null,
              membership: null,
              fixedLocker: null,
              assignedAt: null,
            }
          : l,
      ),
    );
    if (locker.memberId && locker.memberName) {
      setUnassigned((prev) => {
        if (prev.some((member) => member.id === locker.memberId)) return prev;
        return [
          ...prev,
          {
            id: locker.memberId ?? '',
            name: locker.memberName ?? '',
            memberNo: locker.memberNo ?? `M-${String(locker.memberId).padStart(5, '0')}`,
            channel: locker.channel ?? 'manual',
            checkInAt: locker.checkInAt ?? '-',
            membership: locker.membership ?? '이용권 미등록',
            fixedLocker: locker.fixedLocker ?? null,
          },
        ];
      });
    }
    toast.success(`${locker.number}번 옷 락커를 회수했습니다.`);
  };

  // 출석 원장 기준 미배정 회원 재계산
  const handleSync = async () => {
    try {
      const nextUnassigned = await loadUnassignedMembers(lockers);
      setUnassigned(nextUnassigned);
      const updatedAt = new Date().toISOString();
      await saveBranchSetting<ClothingLockerState>(settingKey, { lockers, updatedAt });
      setLastSyncedAt(new Date(updatedAt).toLocaleTimeString('ko-KR'));
      toast.success('출석 원장 기준으로 옷 락커 상태를 동기화했습니다.');
    } catch (error) {
      console.error(error);
      toast.error('옷 락커 상태 동기화에 실패했습니다.');
    }
  };

  // 엑셀 다운로드
  const handleExport = () => {
    toast.success('현재 옷 락커 현황 엑셀 다운로드를 시작합니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="옷 락커 운영 관리"
        description="출석과 연동되는 당일용 옷 락커를 실시간으로 운영합니다. 미배정 회원에게 빈 락커를 배정하거나 회수할 수 있습니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              className="flex items-center gap-xs px-md py-sm rounded-lg border border-line bg-surface text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold"
              onClick={handleSync}
            >
              <RefreshCw size={15} /> 상태 동기화
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm rounded-lg bg-state-info/10 border border-state-info/20 text-state-info hover:opacity-90 transition-opacity text-[13px] font-semibold"
              onClick={handleExport}
            >
              <Download size={15} /> 엑셀 다운로드
            </button>
          </div>
        }
      />

      {/* 상단 현황 카드 */}
      <StatCardGrid cols={5} className="mb-xl">
        <StatCard label="총 옷 락커" value={stats.total} icon={<Shirt />} />
        <StatCard label="사용 가능" value={stats.available} icon={<CheckCircle2 />} variant="mint" />
        <StatCard label="사용 중" value={stats.inUse} icon={<User />} />
        <StatCard label="만료 임박" value={stats.expiring} icon={<AlertTriangle />} variant="peach" />
        <StatCard label="미배정 회원" value={stats.unassigned} icon={<Clock />} />
      </StatCardGrid>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {/* 당일 옷 락커 그리드 */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-line shadow-sm p-lg">
          <div className="flex items-center justify-between mb-md">
            <h3 className="text-[14px] font-bold text-content">당일 옷 락커 현황</h3>
            <span className="text-[12px] text-content-secondary">
              최종 갱신: {lastSyncedAt}
            </span>
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-dashed border-line bg-surface-secondary py-xl text-center text-[13px] text-content-secondary">
              당일 출석과 옷 락커 상태를 불러오는 중입니다.
            </div>
          ) : (
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-sm">
            {lockers.map((locker) => {
              const clickable =
                canAssign && (locker.status === 'in_use' || locker.status === 'expiring');
              return (
                <button
                  key={locker.id}
                  type="button"
                  disabled={locker.status === 'maintenance'}
                  className={cn(
                    'relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-xs transition-all select-none',
                    STATUS_META[locker.status].cell,
                    clickable ? 'cursor-pointer hover:shadow-sm hover:scale-[1.03] active:scale-95' : '',
                    locker.status === 'available' ? 'cursor-default' : '',
                  )}
                  onClick={() => releaseLocker(locker)}
                  title={
                    locker.status === 'in_use' || locker.status === 'expiring'
                      ? `${locker.memberName} · ${locker.assignedAt} (클릭 시 회수)`
                      : STATUS_META[locker.status].label
                  }
                >
                  <span className="text-[12px] font-bold leading-none mb-[2px]">{locker.number}</span>
                  {locker.memberName ? (
                    <span className="text-[9px] font-medium truncate w-full text-center px-[2px]">
                      {locker.memberName}
                    </span>
                  ) : (
                    <span className="text-[9px] opacity-40">
                      {locker.status === 'maintenance' ? '점검' : '빈'}
                    </span>
                  )}
                  {locker.status === 'expiring' && (
                    <AlertTriangle className="absolute top-1 right-1 text-primary animate-pulse" size={10} />
                  )}
                  {locker.status === 'maintenance' && (
                    <XCircle className="absolute top-1 right-1 text-content-tertiary" size={10} />
                  )}
                </button>
              );
            })}
          </div>
          )}

          {/* 상태 범례 */}
          <div className="pt-md mt-md border-t border-line flex items-center gap-lg flex-wrap">
            <span className="text-[12px] font-semibold text-content-secondary">상태 범례</span>
            {(Object.keys(STATUS_META) as LockerStatus[]).map((key) => (
              <div key={key} className="flex items-center gap-xs">
                <div className={cn('w-4 h-4 rounded border-2', STATUS_META[key].legend)} />
                <span className="text-[12px] text-content-secondary">{STATUS_META[key].label}</span>
              </div>
            ))}
            <span className="ml-auto text-[11px] text-content-tertiary">
              사용 중 락커 클릭 시 회수 처리됩니다.
            </span>
          </div>
        </div>

        {/* 미배정 회원 패널 (출석 완료·옷 락커 미배정) */}
        <div className="bg-surface rounded-xl border border-line shadow-sm p-lg">
          <div className="flex items-center gap-xs mb-md">
            <Clock size={16} className="text-primary" />
            <h3 className="text-[14px] font-bold text-content">미배정 회원</h3>
            <span className="px-[6px] py-px rounded-full text-[10px] font-semibold bg-primary text-white tabular-nums">
              {unassigned.length}
            </span>
          </div>
          <p className="text-[11px] text-content-tertiary mb-md">
            출석은 완료했으나 옷 락커가 미배정 상태인 회원입니다.
          </p>

          {unassigned.length === 0 ? (
            <EmptyState
              title="미배정 회원이 없습니다"
              description="출석 완료 회원 모두 옷 락커가 배정되었습니다."
            />
          ) : (
            <div className="space-y-sm">
              {unassigned.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-sm p-sm rounded-lg border border-line bg-surface-secondary/40"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User size={15} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-xs">
                      <p className="text-[13px] font-semibold text-content truncate">{m.name}</p>
                      <span className="text-[10px] text-content-tertiary">{m.memberNo}</span>
                    </div>
                    <div className="flex items-center gap-xs text-[11px] text-content-secondary">
                      <span className="flex items-center gap-[2px]">
                        {CHANNEL_META[m.channel].icon}
                        {CHANNEL_META[m.channel].label}
                      </span>
                      <span>·</span>
                      <span>{m.checkInAt} 출석</span>
                    </div>
                  </div>
                  <button
                    className={cn(
                      'flex-shrink-0 px-md py-xs rounded-lg text-[12px] font-bold transition-all',
                      canAssign
                        ? 'bg-primary text-white hover:opacity-90'
                        : 'bg-surface-tertiary text-content-tertiary cursor-not-allowed',
                    )}
                    disabled={!canAssign}
                    onClick={() => openAssign(m)}
                  >
                    배정
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DLG-I002 옷 락커 배정 모달 */}
      <Modal
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        title="옷 락커 배정"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setAssignTarget(null)}>
              취소
            </Button>
            <Button onClick={confirmAssign} disabled={!pickedLockerId}>
              배정
            </Button>
          </div>
        }
      >
        {assignTarget && (
          <div className="space-y-lg">
            {/* 회원 정보 (읽기 전용) */}
            <div className="grid grid-cols-2 gap-sm p-md rounded-lg bg-surface-secondary/50 border border-line">
              <InfoRow label="회원명" value={assignTarget.name} />
              <InfoRow label="출석 시각" value={`${assignTarget.checkInAt} (${CHANNEL_META[assignTarget.channel].label})`} />
              <InfoRow label="이용권" value={assignTarget.membership} />
              <InfoRow label="고정 락커" value={assignTarget.fixedLocker ?? '-'} />
            </div>

            {/* 락커 선택 영역 */}
            <div>
              <div className="flex items-center justify-between mb-sm">
                <h4 className="text-[13px] font-bold text-content">
                  빈 락커 선택
                  <span className="ml-xs text-[11px] font-normal text-content-secondary">
                    ({availableLockers.length}개 사용 가능)
                  </span>
                </h4>
              </div>
              {availableLockers.length === 0 ? (
                <div className="py-lg flex flex-col items-center justify-center text-content-secondary border border-dashed border-line rounded-xl">
                  <XCircle className="mb-sm opacity-20" size={32} />
                  <p className="text-[13px]">배정 가능한 락커가 없습니다.</p>
                </div>
              ) : (
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-sm max-h-[240px] overflow-y-auto">
                  {availableLockers.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      className={cn(
                        'aspect-square rounded-xl border-2 flex items-center justify-center text-[12px] font-bold transition-all hover:scale-[1.05] active:scale-95',
                        pickedLockerId === l.id
                          ? 'bg-primary border-primary text-white shadow-md scale-[1.05]'
                          : 'bg-surface-tertiary border-line text-content-secondary hover:border-primary hover:text-primary hover:bg-primary/5',
                      )}
                      onClick={() => setPickedLockerId(pickedLockerId === l.id ? null : l.id)}
                    >
                      {l.number}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-content-tertiary mb-[2px]">{label}</p>
      <p className="text-[13px] font-semibold text-content">{value}</p>
    </div>
  );
}
