'use client';
export const dynamic = 'force-dynamic';

// SCR-076 캠페인 관리 (docs4/V1/D08-마케팅/마케팅.md ## SCR-076, V2 ## SCR-076)
// 호스트 다이얼로그: DLG-076-001 캠페인 등록 / DLG-076-002 캠페인 삭제 확인
// 반영: 상태 필터(준비/진행/종료), 실적 추적 패널(도달·클릭·전환·ROI),
//       등록 시 세그먼트 0명·시작일>종료일·채널 미연결·예산 0 차단, 빈 상태 CTA, 로딩/오류 상태

import React, { useMemo, useState } from 'react';
import { Megaphone, Plus, Trash2, RefreshCw, Send, TrendingUp, Coins } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MultiSelect from '@/components/ui/MultiSelect';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  MOCK_CAMPAIGNS,
  CAMPAIGN_SEGMENTS,
  CAMPAIGN_CHANNELS,
  type MarketingCampaign,
  type CampaignStatus,
  type CampaignGoal,
} from '@/mocks/marketing';

const STATUS_BADGE: Record<CampaignStatus, { variant: 'success' | 'warning' | 'default'; label: string }> = {
  준비: { variant: 'warning', label: '준비 중' },
  진행: { variant: 'success', label: '진행 중' },
  종료: { variant: 'default', label: '종료' },
};

const GOAL_OPTIONS: { value: CampaignGoal; label: string }[] = [
  { value: '신규유치', label: '신규 회원 유치' },
  { value: '재등록', label: '재등록 유도' },
  { value: '인지도', label: '브랜드 인지도' },
  { value: '온보딩', label: '온보딩' },
  { value: '이벤트', label: '이벤트' },
];

type LoadState = 'loading' | 'error' | 'ready';

const EMPTY_FORM = {
  name: '',
  goal: '신규유치' as CampaignGoal,
  segment: CAMPAIGN_SEGMENTS[0].value,
  startDate: '',
  endDate: '',
  channels: [] as string[],
  budget: '',
};

export default function CampaignsPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(MOCK_CAMPAIGNS);
  const [filter, setFilter] = useState<'전체' | CampaignStatus>('전체');

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MarketingCampaign | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const stats = useMemo(() => {
    const active = campaigns.filter((c) => c.status === '진행').length;
    const totalReach = campaigns.reduce((s, c) => s + c.reach, 0);
    const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0);
    const totalCost = campaigns.reduce((s, c) => s + c.cost, 0);
    const convRate = totalReach > 0 ? Math.round((totalConv / totalReach) * 100) : 0;
    return { active, totalReach, convRate, totalCost };
  }, [campaigns]);

  const filtered = filter === '전체' ? campaigns : campaigns.filter((c) => c.status === filter);

  const selectedSegmentSize = CAMPAIGN_SEGMENTS.find((s) => s.value === form.segment)?.size ?? 0;

  const resetForm = () => setForm({ ...EMPTY_FORM });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    // 필수 예외처리 (docs4 SCR-076 / DLG-076-001)
    if (!form.name.trim()) { toast.error('캠페인 이름을 입력하세요.'); return; }
    if (selectedSegmentSize === 0) { toast.error('대상 회원이 없습니다.'); return; }
    if (form.channels.length === 0) { toast.error('메시지·쿠폰 채널을 최소 1개 연결하세요.'); return; }
    if (!form.startDate || !form.endDate) { toast.error('캠페인 기간을 입력하세요.'); return; }
    if (form.startDate > form.endDate) { toast.error('시작일은 종료일보다 빠를 수 없습니다.'); return; }
    const budget = Number(form.budget);
    if (!budget || budget <= 0) { toast.error('예산은 0보다 커야 합니다.'); return; }

    setCampaigns((prev) => [
      {
        id: Math.max(0, ...prev.map((c) => c.id)) + 1,
        name: form.name.trim(),
        goal: form.goal,
        segment: form.segment,
        segmentSize: selectedSegmentSize,
        startDate: form.startDate,
        endDate: form.endDate,
        status: '준비',
        channels: form.channels,
        budget,
        reach: 0, clicks: 0, conversions: 0, cost: 0,
      },
      ...prev,
    ]);
    setCreateOpen(false);
    resetForm();
    toast.success('저장되었습니다.');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setCampaigns((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('처리되었습니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="캠페인 관리"
        description="목적별 마케팅 캠페인을 구성하고 도달·전환 실적과 ROI를 분석합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
              onClick={() => { setLoadState('loading'); setTimeout(() => { setCampaigns(MOCK_CAMPAIGNS); setLoadState('ready'); }, 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => { resetForm(); setCreateOpen(true); }}>
              캠페인 생성
            </Button>
          </div>
        }
      />

      {/* 오류 상태 */}
      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>캠페인 정보를 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      {/* 실적 요약 카드 (도달/전환율/비용) */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="진행 중 캠페인" value={`${stats.active}개`} icon={<Megaphone />} variant={stats.active > 0 ? 'mint' : undefined} />
        <StatCard label="총 도달 수" value={`${stats.totalReach.toLocaleString()}명`} icon={<Send />} />
        <StatCard label="평균 전환율" value={`${stats.convRate}%`} icon={<TrendingUp />} variant="peach" />
        <StatCard label="누적 비용" value={`₩${stats.totalCost.toLocaleString()}`} icon={<Coins />} />
      </StatCardGrid>

      {loadState === 'loading' ? (
        <div className="space-y-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white">
          <EmptyState icon={Megaphone} title="등록된 캠페인이 없습니다"
            description="아직 등록된 캠페인이 없습니다. 캠페인을 생성하면 세그먼트에 메시지·쿠폰을 묶어 발송하고 실적을 추적할 수 있습니다."
            action={{ label: '캠페인 생성', onClick: () => { resetForm(); setCreateOpen(true); } }} />
        </div>
      ) : (
        <>
          {/* 상태 필터 */}
          <div className="mb-md flex flex-wrap gap-sm">
            {(['전체', '준비', '진행', '종료'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                  filter === f ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
                {f === '전체' ? '전체' : STATUS_BADGE[f].label}
              </button>
            ))}
          </div>

          {/* 캠페인 목록 + 실적 추적 패널 */}
          <div className="space-y-md">
            {filtered.map((c) => {
              const badge = STATUS_BADGE[c.status];
              const ctr = c.reach > 0 ? Math.round((c.clicks / c.reach) * 100) : 0;
              const cvr = c.reach > 0 ? Math.round((c.conversions / c.reach) * 100) : 0;
              const roi = c.cost > 0 ? Math.round((c.conversions / c.cost) * 10000) : 0; // 전환 1건당 만원 환산 효율
              return (
                <div key={c.id} className="rounded-2xl border border-line bg-white p-lg transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex items-center gap-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <Megaphone size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-sm">
                          <p className="text-[14px] font-bold text-content">{c.name}</p>
                          <StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge>
                          <StatusBadge variant="info">{GOAL_OPTIONS.find((g) => g.value === c.goal)?.label}</StatusBadge>
                        </div>
                        <p className="mt-xs text-[12px] text-content-secondary">
                          대상: {c.segment} ({c.segmentSize.toLocaleString()}명) · {c.startDate} ~ {c.endDate} · 채널 {c.channels.join(', ')}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteTarget(c)} title="삭제" />
                  </div>

                  {/* 실적 추적 패널 (도달/클릭/전환/ROI) */}
                  <div className="mt-md grid grid-cols-2 gap-sm border-t border-line/70 pt-md sm:grid-cols-5">
                    <Metric label="도달" value={c.reach.toLocaleString()} />
                    <Metric label="클릭" value={`${c.clicks.toLocaleString()} (${ctr}%)`} />
                    <Metric label="전환" value={`${c.conversions.toLocaleString()} (${cvr}%)`} accent />
                    <Metric label="비용" value={`₩${c.cost.toLocaleString()}`} />
                    <Metric label="ROI 지수" value={c.cost > 0 ? `${roi}` : '-'} />
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-line bg-white px-4 py-10 text-center text-[13px] text-content-tertiary">
                해당 상태의 캠페인이 없습니다.
              </div>
            )}
          </div>
        </>
      )}

      {/* DLG-076-001 캠페인 등록 */}
      <FormModal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="캠페인 등록"
        size="lg"
        submitLabel="저장"
        onSubmit={handleCreate}
      >
        <Input label="캠페인 이름" placeholder="예: 6월 여름 프로모션" value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Select label="캠페인 목표" value={form.goal} onChange={(v) => setForm((p) => ({ ...p, goal: v as CampaignGoal }))}
            options={GOAL_OPTIONS} />
          <Select label="대상 세그먼트" value={form.segment} onChange={(v) => setForm((p) => ({ ...p, segment: v }))}
            options={CAMPAIGN_SEGMENTS.map((s) => ({ value: s.value, label: s.label }))}
            hint={selectedSegmentSize === 0 ? '대상 회원이 없습니다 — 저장 불가' : `예상 대상 ${selectedSegmentSize.toLocaleString()}명`}
            error={selectedSegmentSize === 0 ? '대상 회원이 없습니다' : undefined} />
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input label="시작일" type="date" value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <Input label="종료일" type="date" value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
        <MultiSelect label="연결 채널 (최소 1개)" placeholder="메시지·쿠폰 채널 선택"
          options={CAMPAIGN_CHANNELS.map((c) => ({ value: c, label: c }))}
          value={form.channels} onChange={(v) => setForm((p) => ({ ...p, channels: v }))} searchable={false} />
        <Input label="예산 (원)" type="number" placeholder="예: 500000" value={form.budget}
          onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} />
      </FormModal>

      {/* DLG-076-002 캠페인 삭제 확인 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="캠페인 삭제"
        description={deleteTarget?.status === '진행'
          ? `진행 중인 "${deleteTarget?.name}" 캠페인을 삭제하면 즉시 종료되며 실적은 보존됩니다. 삭제하시겠습니까?`
          : `"${deleteTarget?.name}" 캠페인을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center">
      <p className="text-[11px] text-content-tertiary">{label}</p>
      <p className={cn('text-[14px] font-bold tabular-nums', accent ? 'text-primary' : 'text-content')}>{value}</p>
    </div>
  );
}
