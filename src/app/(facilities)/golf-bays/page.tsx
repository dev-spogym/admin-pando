'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Users, ArrowRightLeft, Power,
  Play, Square, UserCheck, Clock, AlertTriangle, RefreshCw,
  X, Monitor, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import Select from '@/components/ui/Select';

// ─── 타입 정의 ─────────────────────────────────────────────────
type BayStatus = 'available' | 'in_use' | 'reserved' | 'maintenance';

interface GolfBay {
  id: number;
  bayNumber: number;
  name: string;
  status: BayStatus;
  memberId: number | null;
  memberName: string | null;
  proId: number | null;
  proName: string | null;
  startedAt: string | null;
  durationMin: number;       // 이용 시간 (분)
  remainingMin: number;      // 남은 시간 (분)
  hasProjector: boolean;
  projectorOn: boolean;
}

interface WaitlistEntry {
  id: number;
  memberName: string;
  requestedAt: string;
  estimatedWait: number; // 분
}

interface Staff {
  id: number;
  name: string;
}

// ─── 상수 ───────────────────────────────────────────────────────
const BAY_STATUS_CONFIG: Record<BayStatus, {
  label: string;
  description: string;
  badge: 'success' | 'info' | 'warning' | 'default';
  dot: string;
  surface: string;
  border: string;
  text: string;
}> = {
  available: {
    label: '대기',
    description: '즉시 이용 가능',
    badge: 'success',
    dot: 'bg-state-success',
    surface: 'bg-emerald-50/80',
    border: 'border-emerald-200/80',
    text: 'text-state-success',
  },
  in_use: {
    label: '사용중',
    description: '타이머 진행 중',
    badge: 'info',
    dot: 'bg-state-info',
    surface: 'bg-blue-50/80',
    border: 'border-blue-200/80',
    text: 'text-state-info',
  },
  reserved: {
    label: '예약',
    description: '입장 대기 중',
    badge: 'warning',
    dot: 'bg-amber-500',
    surface: 'bg-amber-50/80',
    border: 'border-amber-200/80',
    text: 'text-amber-600',
  },
  maintenance: {
    label: '점검',
    description: '운영 제외',
    badge: 'default',
    dot: 'bg-content-tertiary',
    surface: 'bg-surface-secondary',
    border: 'border-line/80',
    text: 'text-content-secondary',
  },
};


// ─── 초기 Mock 데이터 (DB 연동 전) ────────────────────────────
const INITIAL_BAYS: GolfBay[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  bayNumber: i + 1,
  name: `${i + 1}번 타석`,
  status: i < 7 ? 'in_use' : i < 9 ? 'reserved' : i === 11 ? 'maintenance' : 'available' as BayStatus,
  memberId: i < 7 ? 100 + i : null,
  memberName: i < 7 ? ['김민수', '이영희', '박준호', '최수정', '정대현', '한지민', '오승환'][i] : null,
  proId: i < 3 ? 10 + i : null,
  proName: i < 3 ? ['이프로', '김프로', '박프로'][i] : null,
  startedAt: i < 7 ? new Date(Date.now() - (Math.random() * 50 + 10) * 60000).toISOString() : null,
  durationMin: 60,
  remainingMin: i < 7 ? Math.floor(Math.random() * 45) + 5 : 0,
  hasProjector: true,
  projectorOn: i < 7,
}));

const INITIAL_WAITLIST: WaitlistEntry[] = [
  { id: 1, memberName: '송형근', requestedAt: new Date(Date.now() - 15 * 60000).toISOString(), estimatedWait: 12 },
  { id: 2, memberName: '유재석', requestedAt: new Date(Date.now() - 8 * 60000).toISOString(), estimatedWait: 25 },
  { id: 3, memberName: '강호동', requestedAt: new Date(Date.now() - 3 * 60000).toISOString(), estimatedWait: 38 },
];

// ─── 유틸 ───────────────────────────────────────────────────────
const fmtTime = (min: number) => {
  if (min <= 0) return '0:00';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
};

const fmtRelative = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  return `${diff}분 전`;
};

const DB_TO_UI_STATUS: Record<string, BayStatus> = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  RESERVED: 'reserved',
  MAINTENANCE: 'maintenance',
  CLOSED: 'maintenance',
};

const UI_TO_DB_STATUS: Record<BayStatus, string> = {
  available: 'AVAILABLE',
  in_use: 'IN_USE',
  reserved: 'RESERVED',
  maintenance: 'MAINTENANCE',
};

const DEFAULT_BAY_DURATION_MIN = 60;

const estimateRemainingMin = (expectedEndedAt?: string | null) => {
  if (!expectedEndedAt) return DEFAULT_BAY_DURATION_MIN;
  return Math.max(0, Math.ceil((new Date(expectedEndedAt).getTime() - Date.now()) / 60000));
};

const mapBayRow = (row: Record<string, unknown>): GolfBay => {
  const status = DB_TO_UI_STATUS[String(row.status ?? 'AVAILABLE')] ?? 'available';
  return {
    id: Number(row.id),
    bayNumber: Number(row.bayNumber) || Number(row.id),
    name: String(row.name ?? `${row.bayNumber ?? row.id}번 타석`),
    status,
    memberId: row.currentMemberId == null ? null : Number(row.currentMemberId),
    memberName: (row.currentMemberName as string | null) ?? null,
    proId: null,
    proName: (row.currentStaffName as string | null) ?? null,
    startedAt: (row.startedAt as string | null) ?? null,
    durationMin: DEFAULT_BAY_DURATION_MIN,
    remainingMin: status === 'in_use' ? estimateRemainingMin(row.expectedEndedAt as string | null) : 0,
    hasProjector: true,
    projectorOn: status === 'in_use',
  };
};

const mapWaitlistRow = (row: Record<string, unknown>, index: number): WaitlistEntry => ({
  id: Number(row.id),
  memberName: String(row.memberName ?? ''),
  requestedAt: (row.requestedAt as string | null) ?? new Date().toISOString(),
  estimatedWait: (index + 1) * 15,
});

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function GolfBayManagement() {
  const [bays, setBays] = useState<GolfBay[]>(INITIAL_BAYS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedBay, setSelectedBay] = useState<GolfBay | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<number | null>(null);
  const [startMemberName, setStartMemberName] = useState('');
  const [startProId, setStartProId] = useState('');
  const [waitlistName, setWaitlistName] = useState('');
  const [dbBacked, setDbBacked] = useState(false);

  const currentSelectedBay = useMemo(() => {
    if (!selectedBay) return null;
    return bays.find(bay => bay.id === selectedBay.id) ?? selectedBay;
  }, [bays, selectedBay]);

  const loadGolfState = useCallback(async () => {
    const branchId = getBranchId();
    const { data: bayRows, error: bayError } = await supabase
      .from('golf_bays')
      .select('*')
      .eq('branchId', branchId)
      .order('bayNumber', { ascending: true });

    if (bayError) {
      setDbBacked(false);
      return;
    }

    let rows = (bayRows ?? []) as Record<string, unknown>[];
    if (rows.length === 0) {
      const seedRows = Array.from({ length: 12 }, (_, index) => ({
        branchId,
        bayNumber: index + 1,
        name: `${index + 1}번 타석`,
        status: 'AVAILABLE',
      }));
      const { data: insertedRows, error: insertError } = await supabase
        .from('golf_bays')
        .insert(seedRows)
        .select('*')
        .order('bayNumber', { ascending: true });
      if (!insertError && insertedRows) {
        rows = insertedRows as Record<string, unknown>[];
      }
    }

    const { data: waitRows } = await supabase
      .from('golf_waitlist')
      .select('*')
      .eq('branchId', branchId)
      .in('status', ['WAITING', 'CALLED'])
      .order('requestedAt', { ascending: true });

    setBays(rows.map(mapBayRow));
    setWaitlist(((waitRows ?? []) as Record<string, unknown>[]).map(mapWaitlistRow));
    setDbBacked(true);
  }, []);

  // 프로 목록 로드
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('branchId', getBranchId())
        .in('role', ['ADMIN', 'MANAGER', 'STAFF']);
      if (data) setStaffList(data);
    })();
  }, []);

  useEffect(() => {
    loadGolfState();
  }, [loadGolfState]);

  // 실시간 타이머 (1분마다 남은 시간 감소)
  useEffect(() => {
    const timer = setInterval(() => {
      setBays(prev => prev.map(bay => {
        if (bay.status !== 'in_use' || bay.remainingMin <= 0) return bay;
        const next = bay.remainingMin - 1;
        if (next <= 0) {
          toast.warning(`⏰ ${bay.name} 시간 종료! (${bay.memberName})`);
          return { ...bay, remainingMin: 0 };
        }
        return { ...bay, remainingMin: next };
      }));
    }, 60000); // 1분 간격
    return () => clearInterval(timer);
  }, []);

  // ─── 통계 ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: bays.length,
    inUse: bays.filter(b => b.status === 'in_use').length,
    available: bays.filter(b => b.status === 'available').length,
    reserved: bays.filter(b => b.status === 'reserved').length,
    waitCount: waitlist.length,
  }), [bays, waitlist]);

  const handleOpenDetail = (bay: GolfBay) => {
    setSelectedBay(bay);
    setStartMemberName(bay.memberName ?? '');
    setStartProId(bay.proId ? String(bay.proId) : '');
    setDetailOpen(true);
  };

  // ─── 타석 시작 ────────────────────────────────────────────────
  const handleStart = async (bayId: number) => {
    const memberName = startMemberName.trim();
    if (!memberName) {
      toast.error('이용 회원명을 입력하세요.');
      return;
    }
    const proId = startProId ? Number(startProId) : null;
    const proName = staffList.find(s => s.id === proId)?.name ?? null;
    const bay = bays.find(item => item.id === bayId);
    const startedAt = new Date();
    const expectedEndedAt = new Date(startedAt.getTime() + (bay?.durationMin ?? DEFAULT_BAY_DURATION_MIN) * 60000);

    if (dbBacked) {
      const { error } = await supabase
        .from('golf_bays')
        .update({
          status: 'IN_USE',
          currentMemberName: memberName,
          currentStaffName: proName,
          startedAt: startedAt.toISOString(),
          expectedEndedAt: expectedEndedAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', bayId);
      if (error) {
        toast.error('타석 시작 정보를 저장하지 못했습니다.');
        return;
      }
      await supabase.from('golf_bay_sessions').insert({
        branchId: getBranchId(),
        bayId,
        memberName,
        staffName: proName,
        status: 'IN_USE',
        startedAt: startedAt.toISOString(),
        durationMinutes: bay?.durationMin ?? DEFAULT_BAY_DURATION_MIN,
      });
    }

    setBays(prev => prev.map(b =>
      b.id === bayId ? {
        ...b,
        status: 'in_use' as BayStatus,
        memberName,
        proId,
        proName,
        startedAt: startedAt.toISOString(),
        remainingMin: b.durationMin,
        projectorOn: b.hasProjector,
      } : b
    ));
    setSelectedBay(prev => prev ? {
      ...prev,
      status: 'in_use',
      memberName,
      proId,
      proName,
      startedAt: startedAt.toISOString(),
      remainingMin: prev.durationMin,
      projectorOn: prev.hasProjector,
    } : prev);
    toast.success(`${memberName}님 타석 이용이 시작되었습니다.`);
    setDetailOpen(false);
    setStartMemberName('');
    setStartProId('');
  };

  // ─── 점검 처리/해제 ───────────────────────────────────────────
  const handleMaintenance = async (bayId: number, toMaintenance: boolean) => {
    const nextStatus: BayStatus = toMaintenance ? 'maintenance' : 'available';
    if (dbBacked) {
      const { error } = await supabase
        .from('golf_bays')
        .update({
          status: UI_TO_DB_STATUS[nextStatus],
          currentMemberId: null,
          currentMemberName: null,
          currentStaffName: null,
          startedAt: null,
          expectedEndedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', bayId);
      if (error) {
        toast.error('타석 상태를 저장하지 못했습니다.');
        return;
      }
    }
    setBays(prev => prev.map(b =>
      b.id === bayId ? { ...b, status: nextStatus, memberId: null, memberName: null, proId: null, proName: null, startedAt: null, remainingMin: 0 } : b
    ));
    setSelectedBay(prev => prev ? { ...prev, status: nextStatus } : prev);
    toast.success(toMaintenance ? '점검 처리되었습니다.' : '점검이 해제되었습니다.');
  };

  // ─── 타석 종료 ────────────────────────────────────────────────
  const handleEnd = async (bayId: number) => {
    const bay = bays.find(b => b.id === bayId);
    const next = waitlist[0];

    if (dbBacked) {
      const bayUpdate = next
        ? {
            status: 'RESERVED',
            currentMemberId: null,
            currentMemberName: next.memberName,
            currentStaffName: null,
            startedAt: null,
            expectedEndedAt: null,
            updatedAt: new Date().toISOString(),
          }
        : {
            status: 'AVAILABLE',
            currentMemberId: null,
            currentMemberName: null,
            currentStaffName: null,
            startedAt: null,
            expectedEndedAt: null,
            updatedAt: new Date().toISOString(),
          };
      const { error } = await supabase.from('golf_bays').update(bayUpdate).eq('id', bayId);
      if (error) {
        toast.error('타석 종료 정보를 저장하지 못했습니다.');
        return;
      }
      await supabase
        .from('golf_bay_sessions')
        .update({ status: 'COMPLETED', endedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        .eq('bayId', bayId)
        .eq('status', 'IN_USE');
      if (next) {
        await supabase
          .from('golf_waitlist')
          .update({ status: 'SEATED', seatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
          .eq('id', next.id);
      }
    }

    setBays(prev => prev.map(b =>
      b.id === bayId ? {
        ...b,
        status: 'available' as BayStatus,
        memberId: null,
        memberName: null,
        proId: null,
        proName: null,
        startedAt: null,
        remainingMin: 0,
        projectorOn: false,
      } : b
    ));

    // 대기열에서 자동 배정 (꼬리물기)
    if (next) {
      setWaitlist(prev => prev.slice(1));
      setBays(prev => prev.map(b =>
        b.id === bayId ? {
          ...b,
          status: 'reserved' as BayStatus,
          memberName: next.memberName,
        } : b
      ));
      toast.info(`🔄 ${next.memberName}님이 ${bay?.name}에 자동 배정되었습니다.`);
    } else {
      toast.success('타석 이용이 종료되었습니다.');
    }
    setDetailOpen(false);
  };

  // ─── 타석 이동 ────────────────────────────────────────────────
  const handleMove = async () => {
    if (!currentSelectedBay || !moveTargetId) return;
    const targetBay = bays.find(b => b.id === moveTargetId);
    if (!targetBay || targetBay.status !== 'available') {
      toast.error('이동할 수 없는 타석입니다.');
      return;
    }

    if (dbBacked) {
      const now = new Date().toISOString();
      const sourceUpdate = {
        status: 'AVAILABLE',
        currentMemberId: null,
        currentMemberName: null,
        currentStaffName: null,
        startedAt: null,
        expectedEndedAt: null,
        updatedAt: now,
      };
      const targetUpdate = {
        status: UI_TO_DB_STATUS[currentSelectedBay.status],
        currentMemberId: currentSelectedBay.memberId,
        currentMemberName: currentSelectedBay.memberName,
        currentStaffName: currentSelectedBay.proName,
        startedAt: currentSelectedBay.startedAt,
        expectedEndedAt: currentSelectedBay.status === 'in_use'
          ? new Date(Date.now() + currentSelectedBay.remainingMin * 60000).toISOString()
          : null,
        updatedAt: now,
      };
      const [sourceResult, targetResult] = await Promise.all([
        supabase.from('golf_bays').update(sourceUpdate).eq('id', currentSelectedBay.id),
        supabase.from('golf_bays').update(targetUpdate).eq('id', moveTargetId),
      ]);
      if (sourceResult.error || targetResult.error) {
        toast.error('타석 이동 정보를 저장하지 못했습니다.');
        return;
      }
      await supabase
        .from('golf_bay_sessions')
        .update({ bayId: moveTargetId, updatedAt: now })
        .eq('bayId', currentSelectedBay.id)
        .eq('status', 'IN_USE');
    }

    setBays(prev => prev.map(b => {
      if (b.id === currentSelectedBay.id) {
        return { ...b, status: 'available' as BayStatus, memberId: null, memberName: null, proId: null, proName: null, startedAt: null, remainingMin: 0, projectorOn: false };
      }
      if (b.id === moveTargetId) {
        return { ...b, status: currentSelectedBay.status, memberId: currentSelectedBay.memberId, memberName: currentSelectedBay.memberName, proId: currentSelectedBay.proId, proName: currentSelectedBay.proName, startedAt: currentSelectedBay.startedAt, remainingMin: currentSelectedBay.remainingMin, projectorOn: currentSelectedBay.projectorOn };
      }
      return b;
    }));
    toast.success(`${currentSelectedBay.memberName}님이 ${targetBay.name}으로 이동했습니다.`);
    setMoveModalOpen(false);
    setDetailOpen(false);
  };

  // ─── 프로젝터 토글 ───────────────────────────────────────────
  const toggleProjector = (bayId: number) => {
    setBays(prev => prev.map(b =>
      b.id === bayId ? { ...b, projectorOn: !b.projectorOn } : b
    ));
  };

  // ─── 대기열 등록 ──────────────────────────────────────────────
  const handleAddWaitlist = async () => {
    const name = waitlistName.trim();
    if (!name) {
      toast.error('대기 등록할 회원 이름을 입력하세요.');
      return;
    }
    if (dbBacked) {
      const { data, error } = await supabase
        .from('golf_waitlist')
        .insert({
          branchId: getBranchId(),
          memberName: name,
          status: 'WAITING',
          requestedAt: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (error || !data) {
        toast.error('대기열을 저장하지 못했습니다.');
        return;
      }
      setWaitlist(prev => [...prev, mapWaitlistRow(data as Record<string, unknown>, prev.length)]);
      setWaitlistName('');
      toast.success(`${name}님이 대기열에 등록되었습니다.`);
      return;
    }

    const lastWait = waitlist.length > 0 ? waitlist[waitlist.length - 1].estimatedWait : 0;
    setWaitlist(prev => [...prev, {
      id: Date.now(),
      memberName: name,
      requestedAt: new Date().toISOString(),
      estimatedWait: lastWait + 15,
    }]);
    setWaitlistName('');
    toast.success(`${name}님이 대기열에 등록되었습니다.`);
  };

  const handleCancelWaitlist = async (entryId: number) => {
    if (dbBacked) {
      const { error } = await supabase
        .from('golf_waitlist')
        .update({ status: 'CANCELLED', updatedAt: new Date().toISOString() })
        .eq('id', entryId);
      if (error) {
        toast.error('대기 취소를 저장하지 못했습니다.');
        return;
      }
    }
    setWaitlist(prev => prev.filter(w => w.id !== entryId));
  };

  const availableMoveBays = useMemo(() => bays.filter(b => b.status === 'available'), [bays]);
  const selectedStatusConfig = currentSelectedBay ? BAY_STATUS_CONFIG[currentSelectedBay.status] : null;

  return (
    <AppLayout>
      <PageHeader
        title="골프 타석 관리"
        description="타석 현황, 대기열, 프로 배정을 실시간으로 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button
              type="button"
              variant="outline"
              size="md"
              icon={<Users size={14} />}
              onClick={() => document.getElementById('waitlist-name')?.focus()}
            >
              대기 등록
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              icon={<RefreshCw size={14} />}
              onClick={() => {
                setBays(prev => prev.map(b => b.status === 'in_use' && b.remainingMin <= 0
                  ? { ...b, status: 'available' as BayStatus, memberId: null, memberName: null, proId: null, proName: null, startedAt: null, projectorOn: false }
                  : b
                ));
                toast.success('시간 종료 타석이 정리되었습니다.');
              }}
            >
              일괄 정리
            </Button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={5} className="mb-lg">
        <StatCard label="전체 타석" value={`${stats.total}석`} icon={<Monitor />} />
        <StatCard label="사용중" value={`${stats.inUse}석`} icon={<Play />} variant="peach" />
        <StatCard label="대기중" value={`${stats.available}석`} icon={<Clock />} variant="mint" />
        <StatCard label="예약" value={`${stats.reserved}석`} icon={<UserCheck />} variant="mint" />
        <StatCard label="대기열" value={`${stats.waitCount}명`} icon={<Users />} variant={stats.waitCount > 0 ? 'peach' : undefined} />
      </StatCardGrid>

      <div className="grid grid-cols-1 gap-lg xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── 좌측: 타석 현황 보드 ── */}
        <div className="min-w-0">
          <Card
            padding="none"
            className="overflow-hidden"
            header={
              <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <span className="text-Section-Title text-content">타석 현황</span>
                  <p className="mt-1 text-[12px] text-content-secondary">카드를 선택하면 상세 운영 패널이 열립니다.</p>
                </div>
                <div className="flex flex-wrap items-center gap-sm text-[11px]">
                {Object.entries(BAY_STATUS_CONFIG).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-xs">
                    <span className={cn('h-2.5 w-2.5 rounded-full', cfg.dot)} />
                    <span className="text-content-secondary">{cfg.label}</span>
                  </span>
                ))}
                </div>
              </div>
            }
          >

            {/* 타석 그리드 */}
            <div className="grid grid-cols-2 gap-sm p-lg sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
              {bays.map(bay => {
                const cfg = BAY_STATUS_CONFIG[bay.status];
                const isUrgent = bay.status === 'in_use' && bay.remainingMin <= 5 && bay.remainingMin > 0;
                const isExpired = bay.status === 'in_use' && bay.remainingMin <= 0;
                return (
                  <button
                    key={bay.id}
                    type="button"
                    onClick={() => handleOpenDetail(bay)}
                    className={cn(
                      'group relative min-h-[150px] overflow-hidden rounded-[22px] border bg-white/82 p-md text-left shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-card-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                      isExpired ? 'border-red-300 bg-red-50/90' :
                      isUrgent ? 'border-amber-300 bg-amber-50/90' :
                      `${cfg.border} ${cfg.surface}`
                    )}
                  >
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/0 via-white/65 to-white/0" />
                    <div className="flex items-start justify-between gap-sm">
                      <div>
                        <span className={cn('block text-[28px] font-black leading-none tabular-nums', isExpired ? 'text-state-error' : cfg.text)}>
                          {bay.bayNumber}
                        </span>
                        <span className="mt-1 block text-[11px] font-semibold text-content-tertiary">
                          {bay.name}
                        </span>
                      </div>
                      <StatusBadge variant={isExpired ? 'error' : cfg.badge} dot>
                        {isExpired ? '종료' : cfg.label}
                      </StatusBadge>
                    </div>

                    {/* 사용중: 회원명 + 남은 시간 */}
                    {bay.status === 'in_use' && (
                      <div className="mt-lg space-y-xs">
                        <span className="block truncate text-[13px] font-bold text-content">
                          {bay.memberName ?? '회원 미지정'}
                        </span>
                        <span className={cn(
                          'inline-flex items-center gap-xs rounded-full bg-white/70 px-sm py-1 text-[13px] font-bold tabular-nums shadow-sm',
                          isExpired ? 'text-state-error' : isUrgent ? 'text-amber-600' : 'text-state-info'
                        )}>
                          <Clock size={13} />
                          {isExpired ? '시간 종료' : fmtTime(bay.remainingMin)}
                        </span>
                        {bay.proName && (
                          <span className="block truncate text-[11px] text-content-secondary">
                            담당 {bay.proName}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 예약 */}
                    {bay.status === 'reserved' && bay.memberName && (
                      <div className="mt-lg rounded-2xl bg-white/70 px-sm py-xs shadow-sm">
                        <p className="text-[11px] text-content-tertiary">예약 회원</p>
                        <p className="truncate text-[13px] font-bold text-content">{bay.memberName}</p>
                      </div>
                    )}

                    {/* 대기 */}
                    {bay.status === 'available' && (
                      <div className="mt-lg flex items-center gap-xs text-[12px] font-semibold text-state-success">
                        <Play size={13} />
                        이용 시작 가능
                      </div>
                    )}

                    {/* 점검 */}
                    {bay.status === 'maintenance' && (
                      <div className="mt-lg flex items-center gap-xs text-[12px] font-semibold text-content-secondary">
                        <Wrench size={13} />
                        점검중
                      </div>
                    )}

                    {/* 프로젝터 상태 아이콘 */}
                    {bay.hasProjector && (
                      <span className={cn(
                        'absolute bottom-sm right-sm inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold',
                        bay.projectorOn
                          ? 'border-emerald-200 bg-emerald-50 text-state-success'
                          : 'border-line/80 bg-white/70 text-content-tertiary'
                      )}>
                        <Power size={10} />
                        {bay.projectorOn ? 'ON' : 'OFF'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── 우측: 대기열 패널 ── */}
        <div className="min-w-0 xl:w-[320px]">
          <Card
            padding="none"
            className="overflow-hidden xl:sticky xl:top-[72px]"
            header={
              <div className="flex items-center justify-between gap-sm">
                <div>
                  <span className="text-Section-Title text-content">대기열</span>
                  <p className="mt-1 text-[12px] text-content-secondary">빈 타석 발생 시 순번대로 안내합니다.</p>
                </div>
              <StatusBadge variant={waitlist.length > 0 ? 'peach' : 'default'}>
                {waitlist.length}명
              </StatusBadge>
              </div>
            }
          >

            {waitlist.length === 0 ? (
              <div className="mx-lg my-md rounded-[20px] border border-dashed border-line/80 bg-surface-secondary/60 p-lg text-center">
                <Users className="mx-auto mb-sm text-content-tertiary" size={22} />
                <p className="text-[13px] font-semibold text-content">대기 없음</p>
                <p className="mt-1 text-[12px] text-content-tertiary">회원명을 입력해 대기열에 추가하세요.</p>
              </div>
            ) : (
              <div className="divide-y divide-line-light">
                {waitlist.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-sm px-lg py-md">
                    <span className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl text-[12px] font-bold',
                      idx === 0 ? 'bg-primary text-white shadow-sm' : 'bg-surface-secondary text-content-secondary'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-content truncate">{entry.memberName}</p>
                      <p className="text-[10px] text-content-tertiary">{fmtRelative(entry.requestedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-primary tabular-nums">~{entry.estimatedWait}분</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelWaitlist(entry.id)}
                      className="rounded-full p-xs text-content-tertiary transition-colors hover:bg-red-50 hover:text-state-error"
                      aria-label={`${entry.memberName} 대기 취소`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-line/70 bg-surface-secondary/45 p-lg">
              <div className="flex flex-col gap-sm">
                <Input
                  id="waitlist-name"
                  value={waitlistName}
                  onChange={e => setWaitlistName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleAddWaitlist();
                  }}
                  placeholder="대기 회원명"
                  aria-label="대기 회원명"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<Plus size={13} />}
                  onClick={handleAddWaitlist}
                >
                  대기 추가
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 타석 상세 모달 ─────────────────────────────────────── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={currentSelectedBay ? `${currentSelectedBay.name} 상세` : '타석 상세'}
        size="lg"
        footer={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setDetailOpen(false)}
          >
            닫기
          </Button>
        }
      >
        {currentSelectedBay && selectedStatusConfig && (
          <div className="space-y-lg">
            {/* 상태 정보 */}
            <div className="overflow-hidden rounded-[18px] border border-line/80 bg-white p-lg">
              <div className="flex flex-col gap-lg sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-sm flex flex-wrap items-center gap-sm">
                    <StatusBadge variant={selectedStatusConfig.badge} dot>
                      {selectedStatusConfig.label}
                    </StatusBadge>
                    <span className="text-[12px] font-medium text-content-secondary">
                      {selectedStatusConfig.description}
                    </span>
                  </div>
                  <p className="text-[30px] font-black leading-none text-content">{currentSelectedBay.name}</p>
                  <p className="mt-sm text-[13px] text-content-secondary">
                    {currentSelectedBay.memberName
                      ? `${currentSelectedBay.memberName} 회원 운영 정보`
                      : '현재 배정된 회원이 없습니다.'}
                  </p>
                </div>
                {currentSelectedBay.status === 'in_use' && (
                  <div className="rounded-2xl border border-line/80 bg-surface-secondary/55 px-lg py-md text-right">
                    <p className={cn(
                      'text-[32px] font-black tabular-nums',
                      currentSelectedBay.remainingMin <= 0 ? 'text-state-error' : currentSelectedBay.remainingMin <= 5 ? 'text-amber-600' : 'text-primary'
                    )}>
                      {currentSelectedBay.remainingMin <= 0 ? '종료' : fmtTime(currentSelectedBay.remainingMin)}
                    </p>
                    <p className="text-[11px] font-semibold text-content-tertiary">남은 시간</p>
                  </div>
                )}
              </div>
            </div>

            {/* 이용자 정보 */}
            <div className="grid grid-cols-2 gap-sm text-[12px] lg:grid-cols-4">
              <div className="rounded-2xl border border-line/70 bg-surface-secondary/45 p-md">
                <p className="text-content-tertiary">회원</p>
                <p className="mt-1 truncate font-bold text-content">{currentSelectedBay.memberName ?? '미배정'}</p>
              </div>
              <div className="rounded-2xl border border-line/70 bg-surface-secondary/45 p-md">
                <p className="text-content-tertiary">담당 프로</p>
                <p className="mt-1 truncate font-bold text-content">{currentSelectedBay.proName ?? '배정 없음'}</p>
              </div>
              <div className="rounded-2xl border border-line/70 bg-surface-secondary/45 p-md">
                <p className="text-content-tertiary">기본 이용시간</p>
                <p className="mt-1 font-bold text-content">{currentSelectedBay.durationMin}분</p>
              </div>
              <div className="rounded-2xl border border-line/70 bg-surface-secondary/45 p-md">
                <p className="text-content-tertiary">프로젝터</p>
                <p className={cn('mt-1 font-bold', currentSelectedBay.projectorOn ? 'text-state-success' : 'text-content-secondary')}>
                  {currentSelectedBay.hasProjector ? (currentSelectedBay.projectorOn ? 'ON' : 'OFF') : '없음'}
                </p>
              </div>
              {currentSelectedBay.startedAt && (
                <div className="col-span-2 rounded-2xl border border-line/70 bg-surface-secondary/45 p-md lg:col-span-4">
                  <p className="text-content-tertiary">이용 시작</p>
                  <p className="mt-1 font-bold text-content">
                    {new Date(currentSelectedBay.startedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>

            {(currentSelectedBay.status === 'available' || currentSelectedBay.status === 'reserved') && (
              <div className="rounded-[18px] border border-line/70 bg-white p-lg">
                <div className="mb-md flex items-center gap-sm">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-light text-primary">
                    <Play size={16} />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-content">이용 시작</p>
                    <p className="text-[12px] text-content-secondary">회원명과 담당 프로를 확인한 뒤 타석을 시작합니다.</p>
                  </div>
                </div>
                <div className="grid gap-sm sm:grid-cols-2">
                  <Input
                    label="회원명"
                    value={startMemberName}
                    onChange={e => setStartMemberName(e.target.value)}
                    placeholder="회원명을 입력하세요"
                  />
                  <Select
                    label="담당 프로"
                    value={startProId}
                    onChange={setStartProId}
                    options={[
                      { value: '', label: '프로 없음' },
                      ...staffList.map(s => ({ value: String(s.id), label: s.name })),
                    ]}
                  />
                </div>
              </div>
            )}

            {/* 프로 배정 */}
            {currentSelectedBay.status === 'in_use' && (
              <div className="rounded-[18px] border border-line/70 bg-white p-lg">
                <Select
                  label="프로 배정 변경"
                  value={currentSelectedBay.proId?.toString() ?? ''}
                  onChange={v => {
                    const proId = v ? Number(v) : null;
                    const proName = staffList.find(s => s.id === proId)?.name ?? null;
                    setBays(prev => prev.map(b => b.id === currentSelectedBay.id ? { ...b, proId, proName } : b));
                    setSelectedBay(prev => prev ? { ...prev, proId, proName } : prev);
                    toast.success(proName ? `${proName} 프로가 배정되었습니다.` : '프로 배정이 해제되었습니다.');
                  }}
                  options={[
                    { value: '', label: '프로 없음' },
                    ...staffList.map(s => ({ value: String(s.id), label: s.name })),
                  ]}
                />
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-sm">
              {(currentSelectedBay.status === 'available' || currentSelectedBay.status === 'reserved') && (
                <Button
                  type="button"
                  variant="primary"
                  icon={<Play size={14} />}
                  onClick={() => handleStart(currentSelectedBay.id)}
                >
                  이용 시작
                </Button>
              )}
              {(currentSelectedBay.status === 'available' || currentSelectedBay.status === 'in_use') && (
                <Button
                  type="button"
                  variant="outline"
                  icon={<AlertTriangle size={14} />}
                  onClick={() => handleMaintenance(currentSelectedBay.id, true)}
                >
                  점검 처리
                </Button>
              )}
              {currentSelectedBay.status === 'maintenance' && (
                <Button
                  type="button"
                  variant="outline"
                  icon={<RefreshCw size={14} />}
                  onClick={() => handleMaintenance(currentSelectedBay.id, false)}
                >
                  점검 해제
                </Button>
              )}
              {currentSelectedBay.status === 'in_use' && (
                <>
                  <Button
                    type="button"
                    variant="danger"
                    icon={<Square size={14} />}
                    onClick={() => handleEnd(currentSelectedBay.id)}
                  >
                    이용 종료
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    icon={<ArrowRightLeft size={14} />}
                    onClick={() => { setMoveTargetId(null); setMoveModalOpen(true); }}
                  >
                    타석 이동
                  </Button>
                </>
              )}
              {currentSelectedBay.hasProjector && (
                <Button
                  type="button"
                  variant="secondary"
                  icon={<Power size={14} />}
                  onClick={() => {
                    toggleProjector(currentSelectedBay.id);
                    setSelectedBay(prev => prev ? { ...prev, projectorOn: !prev.projectorOn } : prev);
                  }}
                >
                  프로젝터 {currentSelectedBay.projectorOn ? 'ON' : 'OFF'}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── 타석 이동 모달 ─────────────────────────────────────── */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="타석 이동"
        size="sm"
        footer={
          <div className="flex justify-end gap-sm">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setMoveModalOpen(false)}
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleMove}
              disabled={!moveTargetId}
            >
              이동 확인
            </Button>
          </div>
        }
      >
        <div className="space-y-md">
          <p className="rounded-2xl bg-surface-secondary/70 px-md py-sm text-[13px] text-content">
            <strong>{currentSelectedBay?.memberName}</strong>님을 이동할 타석을 선택하세요.
          </p>
          <div className="grid grid-cols-3 gap-sm sm:grid-cols-4">
            {availableMoveBays.map(bay => (
              <button
                key={bay.id}
                type="button"
                onClick={() => setMoveTargetId(bay.id)}
                className={cn(
                  'rounded-2xl border p-sm text-center transition-all hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
                  moveTargetId === bay.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-line/80 bg-white/82 text-content hover:border-primary/40'
                )}
              >
                <span className="text-[16px] font-bold">{bay.id}</span>
                <p className="text-[10px] text-content-tertiary">대기</p>
              </button>
            ))}
          </div>
          {availableMoveBays.length === 0 && (
            <p className="rounded-2xl border border-dashed border-line/80 py-md text-center text-[13px] text-content-tertiary">
              이동 가능한 타석이 없습니다.
            </p>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
