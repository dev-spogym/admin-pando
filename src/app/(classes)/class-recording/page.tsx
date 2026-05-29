'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Video,
  Play,
  Share2,
  Trash2,
  HardDrive,
  Eye,
  Upload,
  Clock,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import {
  MOCK_RECORDINGS,
  type ClassRecording,
  type RecordingStatus,
} from '@/mocks/class';

// ─── SCR-C015 수업 녹화 관리 (CLS-15, V2) ─────────────────────────────────────
// docs4/V2/D04-수업관리/수업관리.md ## SCR-C015
// 완료 수업 녹화 업로드·공유·삭제. 공유 상태 배지/대상 회원 수/공개 기간.
// 업로드 진행률, 비공개/공유중/기간만료 상태, 스토리지 한도 경고. 4축 상태.

const STATUS_VARIANT: Record<RecordingStatus, BadgeVariant> = {
  업로드중: 'info',
  비공개: 'default',
  공유중: 'success',
  기간만료: 'warning',
};

const STATUS_TABS: { key: 'ALL' | RecordingStatus; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: '공유중', label: '공유중' },
  { key: '비공개', label: '비공개' },
  { key: '업로드중', label: '업로드중' },
  { key: '기간만료', label: '기간만료' },
];

const STORAGE_LIMIT_GB = 500;

export default function ClassRecordingPage() {
  const authUser = useAuthStore((s) => s.user);
  const role = normalizeRole(authUser?.role ?? '');
  // 업로드·삭제·공유 설정은 트레이너(fc) 이상. FC/스태프(접수)는 접근 불가 정책.
  const canManage = authUser?.isSuperAdmin || isRoleAtLeast(role, 'fc');

  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [statusTab, setStatusTab] = useState<'ALL' | RecordingStatus>('ALL');
  const [search, setSearch] = useState('');
  const [shareTarget, setShareTarget] = useState<ClassRecording | null>(null);
  const [shareScope, setShareScope] = useState('무기한');
  const [deleteTarget, setDeleteTarget] = useState<ClassRecording | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setRecordings(MOCK_RECORDINGS);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const stats = useMemo(() => {
    const total = recordings.length;
    const shared = recordings.filter((r) => r.status === '공유중').length;
    const usedGb = recordings.reduce((s, r) => s + r.fileSizeGb, 0);
    const views = recordings.reduce((s, r) => s + r.views, 0);
    return { total, shared, usedGb, remainingGb: Math.max(0, STORAGE_LIMIT_GB - usedGb), views };
  }, [recordings]);

  const storageWarning = stats.remainingGb < 100;

  const filtered = useMemo(() => {
    const q = search.trim();
    return recordings.filter((r) => {
      const matchTab = statusTab === 'ALL' || r.status === statusTab;
      const matchSearch = !q || r.className.includes(q) || r.instructor.includes(q) || r.fileName.includes(q);
      return matchTab && matchSearch;
    });
  }, [recordings, statusTab, search]);

  const handleUpload = () => {
    toast.success('업로드할 영상 파일을 선택하세요. (최대 5GB, mp4/mov)');
  };

  const openShare = (rec: ClassRecording) => {
    setShareTarget(rec);
    setShareScope(rec.expiresAt ? '특정 날짜까지' : '무기한');
  };

  const handleShare = () => {
    if (!shareTarget) return;
    setRecordings((prev) =>
      prev.map((r) =>
        r.id === shareTarget.id
          ? { ...r, status: '공유중' as RecordingStatus, expiresAt: shareScope === '무기한' ? null : '2026-06-30', sharedMemberCount: r.sharedMemberCount || 1 }
          : r
      )
    );
    setShareTarget(null);
    toast.success('공유 설정이 저장되었습니다.');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.status === '공유중') {
      toast.success('공유 중인 영상입니다. 대상 회원에게 안내 후 삭제되었습니다.');
    } else {
      toast.success('녹화 파일이 삭제되었습니다.');
    }
    setRecordings((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <PageHeader
        title="수업 녹화 관리 (V2/후속)"
        description="완료된 수업 녹화 파일을 업로드하고 회원에게 공유 범위와 기간을 설정해 제공합니다."
        actions={
          canManage && (
            <Button variant="danger" size="sm" icon={<Upload size={15} />} disabled onClick={handleUpload}>
              파일 업로드 V2/후속
            </Button>
          )
        }
      />

      <div className="mb-lg rounded-xl border border-red-200 bg-red-50 px-md py-sm text-[12px] font-semibold text-red-700">
        이 화면은 docs4 V2/SCR-C015 후속 범위입니다. V1 운영 화면에서는 범위 식별용으로만 노출하며, 실제 업로드·공유·삭제 처리는 활성화하지 않습니다.
      </div>

      {storageWarning && (
        <div className="mb-lg flex items-center gap-xs rounded-xl border border-state-error/30 bg-red-50 px-md py-sm text-[12px] font-semibold text-state-error">
          <HardDrive size={14} />
          클라우드 스토리지 잔여 용량이 부족합니다. 만료 영상을 정리해 주세요.
        </div>
      )}

      <StatCardGrid cols={4} className="mb-xl">
        <StatCard label="전체 녹화" value={`${stats.total}건`} icon={<Video />} variant="peach" loading={loading} />
        <StatCard label="공유 중" value={`${stats.shared}건`} icon={<Share2 />} variant="mint" loading={loading} />
        <StatCard label="총 시청" value={`${stats.views}회`} icon={<Eye />} loading={loading} />
        <StatCard label="잔여 용량" value={`${stats.remainingGb.toFixed(1)}GB`} icon={<HardDrive />} loading={loading} className={storageWarning ? 'border-state-error/20' : ''} />
      </StatCardGrid>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="flex flex-col gap-md border-b border-line p-lg lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-xs">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusTab(t.key)}
                className={cn(
                  'rounded-button px-md py-xs text-[12px] font-semibold transition-colors',
                  statusTab === t.key ? 'bg-primary text-white' : 'border border-line bg-surface text-content-secondary hover:bg-surface-secondary'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative w-full lg:w-[220px]">
            <Search className="absolute left-[10px] top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
            <input
              type="text"
              placeholder="수업·강사·파일 검색..."
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
                <div className="h-10 w-10 animate-pulse rounded-xl bg-surface-tertiary" />
                <div className="h-4 w-40 animate-pulse rounded bg-surface-tertiary" />
                <div className="ml-auto h-7 w-32 animate-pulse rounded bg-surface-tertiary" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={search ? Search : Video}
            title={search ? '검색 결과가 없어요' : '업로드된 녹화 파일이 없어요'}
            description={
              search
                ? '수업명·강사명·파일명을 다시 확인해 보세요.'
                : '상단의 파일 업로드 버튼으로 완료 수업의 녹화 영상을 추가하세요.'
            }
            action={search ? { label: '검색 초기화', onClick: () => setSearch('') } : canManage ? { label: '파일 업로드', onClick: handleUpload } : undefined}
          />
        ) : (
          <div className="divide-y divide-line/60">
            {filtered.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between gap-md px-lg py-4 hover:bg-surface-secondary/60 transition-colors">
                <div className="flex items-center gap-md">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-tertiary text-content-secondary">
                    <Video size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-xs">
                      <span className="text-[14px] font-semibold text-content">{rec.className}</span>
                      <StatusBadge variant={STATUS_VARIANT[rec.status]} dot>{rec.status}</StatusBadge>
                      {rec.status === '공유중' && <span className="text-[11px] text-content-tertiary">공유 {rec.sharedMemberCount}명 · {rec.expiresAt ? `~${rec.expiresAt}` : '무기한'}</span>}
                    </div>
                    <div className="mt-[2px] flex items-center gap-xs text-[11px] text-content-tertiary">
                      <span>{rec.instructor}</span>
                      <span>·</span>
                      <span>{rec.classDate}</span>
                      <span>·</span>
                      <HardDrive size={11} />
                      <span className="tabular-nums">{rec.fileSizeGb}GB</span>
                      <span>·</span>
                      <Eye size={11} />
                      <span className="tabular-nums">{rec.views}회</span>
                    </div>
                    {rec.status === '업로드중' && rec.uploadProgress != null && (
                      <div className="mt-2 flex items-center gap-xs">
                        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface-tertiary">
                          <div className="h-full rounded-full bg-state-info transition-all" style={{ width: `${rec.uploadProgress}%` }} />
                        </div>
                        <span className="flex items-center gap-[2px] text-[11px] text-state-info tabular-nums">
                          <Clock size={11} /> {rec.uploadProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-xs">
                  {rec.status !== '업로드중' && (
                    <button className="rounded-md p-1.5 text-content-secondary opacity-50" title="V2/후속" disabled>
                      <Play size={16} />
                    </button>
                  )}
                  {canManage && rec.status !== '업로드중' && (
                    <Button variant="outline" size="sm" icon={<Share2 size={13} />} disabled onClick={() => openShare(rec)}>
                      공유 설정 V2
                    </Button>
                  )}
                  {canManage && (
                    <button className="rounded-md p-1.5 text-content-secondary opacity-50" title="V2/후속" disabled onClick={() => setDeleteTarget(rec)}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 공유 설정 */}
      <Modal
        isOpen={shareTarget !== null}
        onClose={() => setShareTarget(null)}
        title="공유 설정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setShareTarget(null)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleShare}>공유 시작</Button>
          </div>
        }
      >
        {shareTarget && (
          <div className="space-y-md">
            <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
              <p className="text-[13px] font-bold text-content">{shareTarget.className}</p>
              <p className="mt-[2px] text-[12px] text-content-secondary">{shareTarget.instructor} · {shareTarget.classDate} · {shareTarget.fileName}</p>
            </div>
            <Select
              label="공개 기간"
              value={shareScope}
              onChange={setShareScope}
              options={[
                { value: '무기한', label: '무기한 공개' },
                { value: '특정 날짜까지', label: '특정 날짜까지 (2026-06-30)' },
              ]}
            />
            <p className="text-[11px] text-content-tertiary">공개 기간이 만료되면 자동으로 비공개 전환되며 회원 앱에서 열람이 차단됩니다.</p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="녹화 파일 삭제"
        description={
          deleteTarget?.status === '공유중'
            ? '공유 중인 영상입니다. 삭제 시 대상 회원에게 자동 안내됩니다. 삭제하시겠습니까?'
            : '이 녹화 파일을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
