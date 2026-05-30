'use client';
export const dynamic = 'force-dynamic';

// SCR-077 리퍼럴 프로그램 (docs4/V2/D08-마케팅/마케팅.md ## SCR-077)
// 호스트 다이얼로그: DLG-077-001 리퍼럴 이벤트 등록 / DLG-077-002 리퍼럴 이벤트 삭제 확인
// 반영: 이벤트 목록(추천인·피추천인 혜택/기간/참여수/상태), 등록/삭제(진행 중 안내),
//       실적 현황(추천·전환·지급 포인트), 추천/피추천 이력, 빈 상태 CTA, 로딩/오류 상태

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Share2, Gift, Plus, Trash2, RefreshCw, Users, CheckCircle2, Coins, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import FormModal from '@/components/common/FormModal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  type ReferralEvent,
  type ReferralRecord,
  type ReferralStatus,
  type ReferralMatchStatus,
} from '@/mocks/marketing';

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') || '1');
};

const EVENT_BADGE: Record<ReferralStatus, { variant: 'success' | 'warning' | 'default'; label: string }> = {
  준비: { variant: 'warning', label: '준비 중' },
  진행: { variant: 'success', label: '진행 중' },
  종료: { variant: 'default', label: '종료' },
};

const MATCH_BADGE: Record<ReferralMatchStatus, { variant: 'success' | 'warning' | 'default' | 'error'; label: string }> = {
  지급완료: { variant: 'success', label: '지급 완료' },
  지급대기: { variant: 'warning', label: '지급 대기' },
  미전환: { variant: 'default', label: '미전환' },
  취소: { variant: 'error', label: '취소' },
};

type LoadState = 'loading' | 'error' | 'ready';
type Tab = '이벤트' | '이력';

const EMPTY_FORM = {
  name: '',
  referrerReward: '',
  refereeReward: '',
  startDate: '',
  endDate: '',
};

export default function ReferralPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [records, setRecords] = useState<ReferralRecord[]>([]);
  const [tab, setTab] = useState<Tab>('이벤트');

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ReferralEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReferralEvent | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const loadReferral = useCallback(async () => {
    setLoadState('loading');
    const [{ data: eventRows, error: eventError }, { data: recordRows, error: recordError }] = await Promise.all([
      supabase
        .from('referral_events')
        .select('*')
        .eq('branchId', getBranchId())
        .order('createdAt', { ascending: false }),
      supabase
        .from('referral_records')
        .select('*')
        .eq('branchId', getBranchId())
        .order('date', { ascending: false }),
    ]);

    if (eventError || recordError) {
      setLoadState('error');
      toast.error(`리퍼럴 정보를 불러오지 못했습니다: ${eventError?.message ?? recordError?.message}`);
      return;
    }

    setEvents((eventRows ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      referrerReward: row.referrerReward,
      refereeReward: row.refereeReward,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      participants: Number(row.participants ?? 0),
      active: Boolean(row.active),
    })));
    setRecords((recordRows ?? []).map((row: any) => ({
      id: row.id,
      eventName: row.eventName,
      referrer: row.referrer,
      referee: row.referee,
      date: row.date,
      reward: row.reward,
      status: row.status,
    })));
    setLoadState('ready');
  }, []);

  useEffect(() => {
    void loadReferral();
  }, [loadReferral]);

  const stats = useMemo(() => {
    const totalReferrals = records.length;
    const converted = records.filter((r) => r.status === '지급완료').length;
    const convRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0;
    const paidPoints = records
      .filter((r) => r.status === '지급완료' && r.reward.endsWith('P'))
      .reduce((s, r) => s + Number(r.reward.replace(/[^0-9]/g, '')), 0);
    return { totalReferrals, converted, convRate, paidPoints };
  }, [records]);

  const resetForm = () => setForm({ ...EMPTY_FORM });

  const openEdit = (ev: ReferralEvent) => {
    setEditTarget(ev);
    setForm({
      name: ev.name,
      referrerReward: ev.referrerReward,
      refereeReward: ev.refereeReward === '-' ? '' : ev.refereeReward,
      startDate: ev.startDate,
      endDate: ev.endDate,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('이벤트명을 입력하세요.'); return; }
    if (!form.referrerReward.trim()) { toast.error('추천인 혜택을 입력하세요.'); return; }
    if (!form.startDate || !form.endDate) { toast.error('이벤트 기간을 입력하세요.'); return; }
    if (form.startDate > form.endDate) { toast.error('시작일은 종료일보다 빠를 수 없습니다.'); return; }

    if (editTarget) {
      // 진행 중 혜택 변경 차단 (docs4 예외처리: 이벤트 수정(혜택 변경) → 진행 중 차단)
      if (editTarget.status === '진행' &&
        (form.referrerReward !== editTarget.referrerReward || (form.refereeReward || '-') !== editTarget.refereeReward)) {
        toast.error('진행 중 이벤트의 혜택은 변경할 수 없습니다. 신규 이벤트로 등록하세요.');
        return;
      }
      const { error } = await supabase
        .from('referral_events')
        .update({
          name: form.name.trim(),
          referrerReward: form.referrerReward.trim(),
          refereeReward: form.refereeReward.trim() || '-',
          startDate: form.startDate,
          endDate: form.endDate,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', editTarget.id)
        .eq('branchId', getBranchId());
      if (error) {
        toast.error(`리퍼럴 이벤트 저장 실패: ${error.message}`);
        return;
      }
      await loadReferral();
      setEditTarget(null);
      toast.success('저장되었습니다.');
    } else {
      const { error } = await supabase
        .from('referral_events')
        .insert({
          branchId: getBranchId(),
          name: form.name.trim(),
          referrerReward: form.referrerReward.trim(),
          refereeReward: form.refereeReward.trim() || '-',
          startDate: form.startDate,
          endDate: form.endDate,
          status: '준비',
          participants: 0,
          active: true,
        });
      if (error) {
        toast.error(`리퍼럴 이벤트 등록 실패: ${error.message}`);
        return;
      }
      await loadReferral();
      setCreateOpen(false);
      toast.success('저장되었습니다.');
    }
    resetForm();
  };

  const handleToggleActive = async (ev: ReferralEvent) => {
    const { error } = await supabase
      .from('referral_events')
      .update({ active: !ev.active, updatedAt: new Date().toISOString() })
      .eq('id', ev.id)
      .eq('branchId', getBranchId());
    if (error) {
      toast.error(`상태 변경 실패: ${error.message}`);
      return;
    }
    await loadReferral();
    toast.success('저장되었습니다.');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from('referral_events')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('branchId', getBranchId());
    if (error) {
      toast.error(`리퍼럴 이벤트 삭제 실패: ${error.message}`);
      return;
    }
    await loadReferral();
    setDeleteTarget(null);
    toast.success('처리되었습니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="리퍼럴 프로그램"
        description="회원 추천 이벤트를 설정하고 추천·전환 실적과 혜택 지급 현황을 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
              onClick={() => { void loadReferral(); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => { resetForm(); setCreateOpen(true); }}>
              이벤트 등록
            </Button>
          </div>
        }
      />

      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>리퍼럴 정보를 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      {/* 실적 현황 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="전체 추천" value={`${stats.totalReferrals}건`} icon={<Share2 />} />
        <StatCard label="전환 성공" value={`${stats.converted}건`} icon={<CheckCircle2 />} variant="mint" />
        <StatCard label="전환율" value={`${stats.convRate}%`} icon={<Users />} variant="peach" />
        <StatCard label="지급 포인트" value={`${stats.paidPoints.toLocaleString()}P`} icon={<Coins />} />
      </StatCardGrid>

      {/* 탭 */}
      <div className="mb-md flex gap-sm">
        {(['이벤트', '이력'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn('rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors',
              tab === t ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
            {t === '이벤트' ? '리퍼럴 이벤트' : '추천 이력'}
          </button>
        ))}
      </div>

      {loadState === 'loading' ? (
        <div className="space-y-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : tab === '이벤트' ? (
        events.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white">
            <EmptyState icon={Gift} title="등록된 리퍼럴 이벤트가 없습니다"
              description="아직 등록된 추천 이벤트가 없습니다. 이벤트를 등록하면 회원 앱에 추천 코드가 발급되고 실적을 추적할 수 있습니다."
              action={{ label: '이벤트 등록', onClick: () => { resetForm(); setCreateOpen(true); } }} />
          </div>
        ) : (
          <div className="space-y-md">
            {events.map((ev) => {
              const badge = EVENT_BADGE[ev.status];
              return (
                <div key={ev.id} className="rounded-2xl border border-line bg-white p-lg transition-colors hover:border-primary/30">
                  <div className="flex items-start justify-between gap-md">
                    <div className="flex items-center gap-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-light text-accent">
                        <Gift size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-sm">
                          <p className="text-[14px] font-bold text-content">{ev.name}</p>
                          <StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge>
                          <StatusBadge variant={ev.active ? 'mint' : 'default'}>{ev.active ? '활성' : '비활성'}</StatusBadge>
                        </div>
                        <p className="mt-xs text-[12px] text-content-secondary">
                          추천인 {ev.referrerReward} · 피추천인 {ev.refereeReward} · {ev.startDate} ~ {ev.endDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-xs">
                      <div className="mr-sm text-right">
                        <p className="text-[11px] text-content-tertiary">참여</p>
                        <p className="text-[14px] font-bold tabular-nums text-content">{ev.participants}건</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleToggleActive(ev)}>
                        {ev.active ? '비활성화' : '활성화'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => openEdit(ev)}>편집</Button>
                      <Button type="button" variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => setDeleteTarget(ev)} title="삭제" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        // 추천/피추천 이력
        records.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white">
            <EmptyState icon={Share2} title="추천 이력이 없습니다"
              description="아직 추천 매칭 이력이 없습니다. 이벤트가 진행되면 추천·전환 내역이 여기에 표시됩니다." />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/60 text-content-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">이벤트</th>
                  <th className="px-4 py-3 text-left font-semibold">추천 관계</th>
                  <th className="px-4 py-3 text-left font-semibold">매칭일</th>
                  <th className="px-4 py-3 text-left font-semibold">혜택</th>
                  <th className="px-4 py-3 text-left font-semibold">지급 상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {records.map((r) => {
                  const badge = MATCH_BADGE[r.status];
                  return (
                    <tr key={r.id} className="text-content hover:bg-surface-secondary/40">
                      <td className="px-4 py-3 text-content-secondary">{r.eventName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-xs font-semibold">
                          {r.referrer} <ChevronRight size={13} className="text-content-tertiary" /> {r.referee}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-content-secondary">{r.date}</td>
                      <td className="px-4 py-3 font-semibold text-accent">{r.reward}</td>
                      <td className="px-4 py-3"><StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* DLG-077-001 리퍼럴 이벤트 등록 / 편집 */}
      <FormModal
        isOpen={createOpen || editTarget !== null}
        onClose={() => { setCreateOpen(false); setEditTarget(null); resetForm(); }}
        title={editTarget ? '리퍼럴 이벤트 편집' : '리퍼럴 이벤트 등록'}
        size="lg"
        submitLabel="저장"
        onSubmit={handleSave}
      >
        <Input label="이벤트명" placeholder="예: 친구 초대 이벤트" value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input label="추천인 혜택" placeholder="예: 10,000P" value={form.referrerReward}
            onChange={(e) => setForm((p) => ({ ...p, referrerReward: e.target.value }))} />
          <Input label="피추천인 혜택" placeholder="예: 10,000P (선택)" value={form.refereeReward}
            onChange={(e) => setForm((p) => ({ ...p, refereeReward: e.target.value }))} />
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Input label="시작일" type="date" value={form.startDate}
            onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
          <Input label="종료일" type="date" value={form.endDate}
            onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} />
        </div>
        {editTarget?.status === '진행' && (
          <p className="text-[12px] text-amber-600">진행 중 이벤트는 혜택 변경이 제한됩니다. 혜택을 바꾸려면 신규 이벤트로 등록하세요.</p>
        )}
      </FormModal>

      {/* DLG-077-002 리퍼럴 이벤트 삭제 확인 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="리퍼럴 이벤트 삭제"
        description={deleteTarget?.status === '진행'
          ? `진행 중인 "${deleteTarget?.name}" 이벤트를 삭제하면 발급된 추천 코드가 무효화됩니다. 삭제하시겠습니까?`
          : `"${deleteTarget?.name}" 이벤트를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
