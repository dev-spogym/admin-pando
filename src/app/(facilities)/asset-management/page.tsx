'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Building2, Wrench, AlertTriangle, MinusCircle, RefreshCw, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import { EmptyState } from '@/components/common/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import {
  MOCK_ASSETS,
  type FacilityAsset,
  type AssetStatus,
  type AssetTab,
} from '@/mocks/facility';

// SCR-059 공간 자산 관리 (docs4/V2/D06-시설관리/시설관리.md ## SCR-059)
// 운동룸·골프 타석·기타 공간의 상태/예약 현황/운영 가능 여부를 통합 조회한다.
// 자산별 상세 관리는 원 도메인(SCR-053 운동룸 / SCR-054 골프 타석)을 따른다.

const STATUS_META: Record<AssetStatus, { variant: 'success' | 'warning' | 'error' | 'default'; label: string }> = {
  운영중: { variant: 'success', label: '운영중' },
  점검중: { variant: 'warning', label: '점검중' },
  고장: { variant: 'error', label: '고장' },
  미사용: { variant: 'default', label: '미사용' },
};

const STATUS_OPTIONS: { value: AssetStatus; label: AssetStatus }[] = [
  { value: '운영중', label: '운영중' },
  { value: '점검중', label: '점검중' },
  { value: '고장', label: '고장' },
  { value: '미사용', label: '미사용' },
];

const TABS: { key: AssetTab; label: string }[] = [
  { key: '운동룸', label: '운동룸' },
  { key: '골프타석', label: '골프 타석' },
  { key: '기타공간', label: '기타 공간' },
];

type LoadState = 'loading' | 'error' | 'ready';

export default function AssetManagementPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [assets, setAssets] = useState<FacilityAsset[]>(MOCK_ASSETS);
  const [tab, setTab] = useState<AssetTab>('운동룸');

  // 상태 변경 모달
  const [statusTarget, setStatusTarget] = useState<FacilityAsset | null>(null);
  const [nextStatus, setNextStatus] = useState<AssetStatus>('운영중');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const tabCounts = useMemo(() => ({
    운동룸: assets.filter((a) => a.tab === '운동룸').length,
    골프타석: assets.filter((a) => a.tab === '골프타석').length,
    기타공간: assets.filter((a) => a.tab === '기타공간').length,
  }), [assets]);

  const stats = useMemo(() => ({
    operating: assets.filter((a) => a.status === '운영중').length,
    inspection: assets.filter((a) => a.status === '점검중').length,
    broken: assets.filter((a) => a.status === '고장').length,
    idle: assets.filter((a) => a.status === '미사용').length,
  }), [assets]);

  const tabAssets = useMemo(() => assets.filter((a) => a.tab === tab), [assets, tab]);

  const openStatusModal = (asset: FacilityAsset) => {
    setStatusTarget(asset);
    setNextStatus(asset.status);
    setReason('');
  };

  const noChange = statusTarget != null && nextStatus === statusTarget.status;
  const noReason = !reason.trim(); // 상태 변경 사유 필수
  // 사용중(예약 존재) 자산을 점검/고장으로 전환 시 경고
  const hasActiveUsage = statusTarget != null && statusTarget.status === '운영중' && statusTarget.todayReservations > 0
    && (nextStatus === '점검중' || nextStatus === '고장');
  // 고장 → 운영중 전환 시 수리 완료 확인 경고
  const repairWarn = statusTarget != null && statusTarget.status === '고장' && nextStatus === '운영중';
  const blocked = noChange || noReason;

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    if (noChange) { toast.error('변경할 상태를 선택하세요.'); return; }
    if (noReason) { toast.error('변경 사유를 입력하세요.'); return; }
    if (hasActiveUsage && !window.confirm('현재 이용 중인 회원이 있습니다. 강제 종료하고 상태를 변경하시겠습니까?')) return;
    if (repairWarn && !window.confirm('수리 완료 기록이 없습니다. 그래도 운영중으로 전환하시겠습니까?')) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setAssets((prev) => prev.map((a) =>
      a.id === statusTarget.id
        ? { ...a, status: nextStatus, todayReservations: nextStatus === '운영중' ? a.todayReservations : 0, note: reason.trim() }
        : a,
    ));
    setSaving(false);
    toast.success('처리되었습니다.');
    setStatusTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="공간 자산 관리"
        description="운동룸·골프 타석·기타 공간의 상태와 예약 현황을 통합 조회합니다. 상세 등록은 각 원 도메인에서 처리합니다."
        actions={
          <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
            onClick={() => { setLoadState('loading'); setTimeout(() => { setAssets(MOCK_ASSETS); setLoadState('ready'); }, 500); }}>
            새로고침
          </Button>
        }
      />

      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>자산 현황을 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      {/* 상태 요약 카드 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="운영중" value={`${stats.operating}곳`} icon={<Building2 />} variant="mint" />
        <StatCard label="점검중" value={`${stats.inspection}곳`} icon={<Wrench />} variant={stats.inspection > 0 ? 'peach' : undefined} />
        <StatCard label="고장" value={`${stats.broken}곳`} icon={<AlertTriangle />} variant={stats.broken > 0 ? 'peach' : undefined} />
        <StatCard label="미사용" value={`${stats.idle}곳`} icon={<MinusCircle />} />
      </StatCardGrid>

      <TabNav
        className="mb-lg"
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, count: tabCounts[t.key] }))}
        activeTab={tab}
        onTabChange={(k) => setTab(k as AssetTab)}
      />

      {loadState === 'loading' ? (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : tabAssets.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white">
          <EmptyState icon={Building2} title="등록된 자산이 없습니다"
            description="이 분류에 등록된 공간 자산이 없습니다. 자산 등록은 운동룸·골프 타석 등 원 도메인 화면에서 처리합니다." />
        </div>
      ) : (
        <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
          {tabAssets.map((a) => {
            const meta = STATUS_META[a.status];
            const occupancy = a.todaySlots > 0 ? Math.round((a.todayReservations / a.todaySlots) * 100) : 0;
            return (
              <div key={a.id} className={cn('rounded-3xl border bg-white p-lg shadow-card',
                a.status === '고장' ? 'border-state-error/40' : a.status === '점검중' ? 'border-amber-300/60' : 'border-line')}>
                <div className="mb-md flex items-start justify-between">
                  <div>
                    <p className="text-[15px] font-bold text-content">{a.name}</p>
                    <p className="mt-0.5 text-[12px] text-content-secondary">{a.location} · 수용 {a.capacity}</p>
                  </div>
                  <StatusBadge variant={meta.variant} dot>{meta.label}</StatusBadge>
                </div>

                {/* 오늘 예약 현황 / 혼잡도 */}
                <div className="mb-md rounded-2xl border border-line bg-surface-secondary/50 px-md py-sm">
                  <div className="flex items-center justify-between text-[12px] text-content-secondary">
                    <span className="flex items-center gap-xs"><CalendarClock size={13} /> 오늘 예약</span>
                    <span className="font-bold text-content tabular-nums">{a.todayReservations}/{a.todaySlots}</span>
                  </div>
                  <div className="mt-xs h-1.5 w-full rounded-full bg-line">
                    <div className={cn('h-1.5 rounded-full', occupancy >= 80 ? 'bg-state-error' : occupancy >= 50 ? 'bg-amber-400' : 'bg-state-success')}
                      style={{ width: `${Math.min(occupancy, 100)}%` }} />
                  </div>
                </div>

                {a.note && <p className="mb-md text-[12px] text-content-tertiary">메모: {a.note}</p>}

                <Button type="button" variant="outline" size="sm" fullWidth onClick={() => openStatusModal(a)}>
                  상태 변경
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 상태 변경 모달 ── */}
      <Modal
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={statusTarget ? `${statusTarget.name} 상태 변경` : '상태 변경'}
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setStatusTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" loading={saving} disabled={blocked} onClick={handleStatusChange}>변경 적용</Button>
          </div>
        }
      >
        {statusTarget && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md text-[12px] text-content-secondary">
              현재 상태 <StatusBadge variant={STATUS_META[statusTarget.status].variant}>{STATUS_META[statusTarget.status].label}</StatusBadge>
              <span className="ml-2">오늘 예약 {statusTarget.todayReservations}건</span>
            </div>
            <Select label="변경할 상태 *" options={STATUS_OPTIONS} value={nextStatus} onChange={(v) => setNextStatus(v as AssetStatus)} />
            {hasActiveUsage && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
                이용 중인 회원이 있습니다. 강제 종료 시 남은 시간만큼 보상 시간이 추가됩니다.
              </div>
            )}
            {repairWarn && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
                수리 완료 기록이 없습니다. 강행할 수 있습니다.
              </div>
            )}
            <div>
              <p className="mb-xs text-[12px] font-semibold text-content-secondary">변경 사유 <span className="text-state-error">*</span></p>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="상태 변경 사유를 입력하세요" rows={2} />
              {noChange && <p className="mt-xs text-[12px] text-content-tertiary">현재와 다른 상태를 선택하세요.</p>}
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
