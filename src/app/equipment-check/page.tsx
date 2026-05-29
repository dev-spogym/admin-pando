'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Wrench, AlertTriangle, CheckCircle2, ClipboardCheck, Plus, RefreshCw, CalendarClock } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  EquipmentRegisterModal,
  EquipmentCheckModal,
  EquipmentRepairModal,
} from '@/components/common/FacilityModals';
import {
  MOCK_EQUIPMENT,
  MOCK_FACILITY_STAFF,
  type FacilityEquipment,
  type EquipmentStatus,
  type EquipmentType,
} from '@/mocks/facility';

// SCR-056 장비 점검 일정 (docs4/V2/D06-시설관리/시설관리.md ## SCR-056)
// 호스트 다이얼로그: DLG-056-001 장비 등록 / DLG-056-002 점검 등록 / DLG-056-003 수리 등록

const STATUS_META: Record<EquipmentStatus, { variant: 'success' | 'warning' | 'error' | 'default'; label: string; icon: React.ReactNode }> = {
  정상: { variant: 'success', label: '정상 운영', icon: <CheckCircle2 size={15} /> },
  점검예정: { variant: 'warning', label: '점검 예정', icon: <CalendarClock size={15} /> },
  수리중: { variant: 'error', label: '수리중', icon: <Wrench size={15} /> },
  고장: { variant: 'error', label: '고장', icon: <AlertTriangle size={15} /> },
};

/** 오늘 yyyy-mm-dd */
const today = (): string => new Date().toISOString().slice(0, 10);
const addDays = (base: string, days: number): string => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** 다음 점검 예정일까지 남은 일수 */
const daysUntil = (date: string): number => Math.ceil((new Date(date).getTime() - new Date(today()).getTime()) / 86400000);

export default function EquipmentCheckPage() {
  const [equipment, setEquipment] = useState<FacilityEquipment[]>(MOCK_EQUIPMENT);
  const [filter, setFilter] = useState<'전체' | EquipmentStatus>('전체');
  const [loading, setLoading] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [checkTarget, setCheckTarget] = useState<FacilityEquipment | null>(null);
  const [repairTarget, setRepairTarget] = useState<FacilityEquipment | null>(null);

  const stats = useMemo(() => ({
    total: equipment.length,
    due: equipment.filter((e) => e.status === '점검예정' || (e.status === '정상' && daysUntil(e.nextCheck) <= 7)).length,
    repair: equipment.filter((e) => e.status === '수리중').length,
    normal: equipment.filter((e) => e.status === '정상').length,
  }), [equipment]);

  const filtered = filter === '전체' ? equipment : equipment.filter((e) => e.status === filter);

  // ─── 핸들러 ───────────────────────────────────────────────────────────────
  const handleRegister = (p: { name: string; type: EquipmentType; location: string; cycleDays: number; nextCheck: string; memo: string }) => {
    setEquipment((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((e) => e.id)) + 1,
        name: p.name, type: p.type, location: p.location, cycleDays: p.cycleDays,
        lastCheck: '-', nextCheck: p.nextCheck, status: '정상', issue: p.memo || null,
      },
    ]);
  };

  const handleCheck = (target: FacilityEquipment, p: { date: string; checker: string; result: '정상' | '이상'; issue: string; nextCheck: string }) => {
    setEquipment((prev) => prev.map((e) =>
      e.id === target.id
        ? { ...e, lastCheck: p.date, nextCheck: p.nextCheck, status: p.result === '정상' ? '정상' : '점검예정', issue: p.result === '이상' ? p.issue : null }
        : e,
    ));
  };

  const handleRepair = (target: FacilityEquipment, p: { mode: 'open' | 'complete'; issue: string; date: string; vendor: string; result: string }) => {
    setEquipment((prev) => prev.map((e) => {
      if (e.id !== target.id) return e;
      if (p.mode === 'open') {
        return { ...e, status: '수리중', issue: p.issue, repairVendor: p.vendor, repairOpenedAt: p.date };
      }
      // 완료 → 정상 복구, 다음 점검 예정일 재산정
      return { ...e, status: '정상', issue: null, repairVendor: null, repairOpenedAt: null, lastCheck: p.date, nextCheck: addDays(p.date, e.cycleDays) };
    }));
  };

  // 수리 접수 시도: 이미 수리중이면 완료 모드로 (재수리 차단)
  const openRepair = (e: FacilityEquipment) => setRepairTarget(e);
  const repairMode: 'open' | 'complete' = repairTarget?.status === '수리중' ? 'complete' : 'open';

  return (
    <AppLayout>
      <PageHeader
        title="장비 점검 일정"
        description="시설 장비의 정기 점검 일정과 수리 이력을 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              onClick={() => { setLoading(true); setTimeout(() => { setEquipment(MOCK_EQUIPMENT); setLoading(false); }, 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => setRegisterOpen(true)}>
              장비 등록
            </Button>
          </div>
        }
      />

      {/* 현황 요약 카드 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="전체 장비" value={`${stats.total}대`} icon={<Wrench />} />
        <StatCard label="점검 예정(7일 내)" value={`${stats.due}대`} icon={<CalendarClock />} variant={stats.due > 0 ? 'peach' : undefined} />
        <StatCard label="수리중" value={`${stats.repair}대`} icon={<AlertTriangle />} variant={stats.repair > 0 ? 'peach' : undefined} />
        <StatCard label="정상 운영" value={`${stats.normal}대`} icon={<CheckCircle2 />} variant="mint" />
      </StatCardGrid>

      {/* 상태 필터 */}
      <div className="mb-md flex flex-wrap gap-sm">
        {(['전체', '정상', '점검예정', '수리중', '고장'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
              filter === f ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
            {f === '전체' ? '전체' : STATUS_META[f].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : equipment.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white">
          <EmptyState icon={Wrench} title="등록된 장비가 없습니다"
            description="등록된 장비가 없습니다. 장비를 등록하면 정기 점검 일정이 자동 생성됩니다."
            action={{ label: '장비 등록', onClick: () => setRegisterOpen(true) }} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white divide-y divide-line/70">
          {filtered.map((e) => {
            const meta = STATUS_META[e.status];
            const dleft = daysUntil(e.nextCheck);
            const overdue = e.status !== '수리중' && e.status !== '고장' && dleft < 0;
            const imminent = e.status !== '수리중' && e.status !== '고장' && dleft >= 0 && dleft <= 7;
            return (
              <div key={e.id} className={cn('flex items-center justify-between px-5 py-4',
                e.status === '수리중' || e.status === '고장' ? 'bg-red-50/40' : overdue ? 'bg-red-50/40' : imminent ? 'bg-amber-50/40' : 'hover:bg-surface-secondary/40')}>
                <div className="flex items-center gap-4">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl',
                    e.status === '정상' ? 'bg-emerald-100 text-state-success' : e.status === '점검예정' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-state-error')}>
                    {meta.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-sm">
                      <p className="text-[14px] font-semibold text-content">{e.name}</p>
                      <span className="text-[12px] text-content-tertiary">{e.type} · {e.location}</span>
                    </div>
                    {e.issue && <p className="mt-0.5 text-[12px] text-state-error">{e.issue}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-lg">
                  <div className="text-right">
                    <p className="text-[11px] text-content-tertiary">다음 점검</p>
                    <p className={cn('text-[12px] font-medium tabular-nums', overdue ? 'text-state-error' : imminent ? 'text-amber-600' : 'text-content-secondary')}>
                      {e.nextCheck}{overdue ? ' · 기한 초과' : imminent ? ` · D-${dleft}` : ''}
                    </p>
                  </div>
                  <StatusBadge variant={meta.variant} dot>{overdue ? '기한 초과' : meta.label}</StatusBadge>
                  <div className="flex gap-xs">
                    <Button type="button" variant="outline" size="sm" icon={<ClipboardCheck size={13} />} onClick={() => setCheckTarget(e)}>점검 등록</Button>
                    <Button type="button" variant="ghost" size="sm" icon={<Wrench size={13} />} onClick={() => openRepair(e)}>
                      {e.status === '수리중' ? '수리 완료' : '수리 접수'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px] text-content-tertiary">조건에 맞는 장비가 없습니다.</div>
          )}
        </div>
      )}

      {/* ── 다이얼로그 (DLG-056-001/002/003) ── */}
      <EquipmentRegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} existing={equipment} onSubmit={handleRegister} />
      <EquipmentCheckModal isOpen={checkTarget !== null} onClose={() => setCheckTarget(null)} target={checkTarget} staff={MOCK_FACILITY_STAFF}
        onSubmit={(p) => { if (checkTarget) handleCheck(checkTarget, p); }} />
      <EquipmentRepairModal isOpen={repairTarget !== null} onClose={() => setRepairTarget(null)} target={repairTarget} mode={repairMode}
        onSubmit={(p) => { if (repairTarget) handleRepair(repairTarget, p); }} />
    </AppLayout>
  );
}
