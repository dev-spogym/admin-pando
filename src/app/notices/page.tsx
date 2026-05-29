'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Pin, Eye, EyeOff, Bell, Search, Clock } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from '@/lib/utils';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import {
  getNotices,
  createNotice,
  updateNotice,
  deleteNotice,
  type Notice,
} from '@/api/endpoints/notices';
import { useAuthStore } from '@/stores/authStore';

// --- 게시 대상 역할 (docs4 SCR-085: 전체 / 특정 역할 다중 선택) ---
const TARGET_ROLES = [
  { code: 'all', label: '전체' },
  { code: 'primary', label: '최고관리자' },
  { code: 'owner', label: 'Owner(지점장)' },
  { code: 'manager', label: '매니저' },
  { code: 'fc', label: 'FC' },
  { code: 'staff', label: '스태프' },
] as const;

// 게시 상태 (docs4 SCR-085): 예정 / 게시 중 / 종료
type NoticeStatus = 'scheduled' | 'active' | 'ended';

const STATUS_TABS: { key: 'all' | NoticeStatus; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'active', label: '게시 중' },
  { key: 'scheduled', label: '예정' },
  { key: 'ended', label: '종료' },
];

const STATUS_META: Record<NoticeStatus, { label: string; variant: 'mint' | 'default' | 'warning' }> = {
  scheduled: { label: '예정', variant: 'warning' },
  active: { label: '게시 중', variant: 'mint' },
  ended: { label: '종료', variant: 'default' },
};

// 백엔드 미지원 메타데이터(게시 대상·기간·예약)는 목업으로 localStorage에 보관
interface NoticeMeta {
  targets: string[]; // TARGET_ROLES.code
  publishStart: string; // datetime-local 문자열, 빈값=즉시
  publishEnd: string;   // datetime-local 문자열, 빈값=무기한
}

const META_KEY = 'notice_meta_v1';

const loadMetaMap = (): Record<number, NoticeMeta> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(META_KEY);
    return stored ? (JSON.parse(stored) as Record<number, NoticeMeta>) : {};
  } catch { return {}; }
};

const saveMetaMap = (map: Record<number, NoticeMeta>) => {
  localStorage.setItem(META_KEY, JSON.stringify(map));
};

const DEFAULT_META: NoticeMeta = { targets: ['all'], publishStart: '', publishEnd: '' };

// 게시 기간 + 공개 여부로 게시 상태 산정
const deriveStatus = (meta: NoticeMeta | undefined, isPublic: boolean): NoticeStatus => {
  const now = Date.now();
  if (!isPublic) return 'ended';
  const start = meta?.publishStart ? new Date(meta.publishStart).getTime() : NaN;
  const end = meta?.publishEnd ? new Date(meta.publishEnd).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return 'scheduled';
  if (!Number.isNaN(end) && now > end) return 'ended';
  return 'active';
};

const formatPeriod = (meta: NoticeMeta | undefined): string => {
  const s = meta?.publishStart ? meta.publishStart.replace('T', ' ').slice(0, 16) : '즉시';
  const e = meta?.publishEnd ? meta.publishEnd.replace('T', ' ').slice(0, 16) : '무기한';
  return `${s} ~ ${e}`;
};

const formatTargets = (meta: NoticeMeta | undefined): string => {
  const codes = meta?.targets ?? ['all'];
  if (codes.includes('all') || codes.length === 0) return '전체';
  return codes.map(c => TARGET_ROLES.find(r => r.code === c)?.label ?? c).join(', ');
};

const EMPTY_FORM = {
  title: '',
  content: '',
  isPinned: false,
  isPublic: true,
  targets: ['all'] as string[],
  publishStart: '',
  publishEnd: '',
};

export default function Notices() {
  const authUser = useAuthStore(s => s.user);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [metaMap, setMetaMap] = useState<Record<number, NoticeMeta>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Notice | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 상태 필터 탭 + 키워드 검색 (docs4 SCR-085)
  const [statusFilter, setStatusFilter] = useState<'all' | NoticeStatus>('all');
  const [keyword, setKeyword] = useState('');

  const [readIds, setReadIds] = useState<Set<number>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = localStorage.getItem('notice_read_ids');
      return stored ? new Set<number>(JSON.parse(stored) as number[]) : new Set<number>();
    } catch { return new Set<number>(); }
  });

  const markAsRead = (id: number) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('notice_read_ids', JSON.stringify([...next]));
      return next;
    });
  };

  const fetchNotices = async () => {
    setIsLoading(true);
    const { data, error } = await getNotices();
    setIsLoading(false);
    if (error) { toast.error('공지사항을 불러오지 못했습니다.'); return; }
    setNotices(data ?? []);
  };

  useEffect(() => { fetchNotices(); setMetaMap(loadMetaMap()); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditTarget(notice);
    const meta = metaMap[notice.id] ?? DEFAULT_META;
    setForm({
      title: notice.title,
      content: notice.content,
      isPinned: notice.isPinned,
      isPublic: notice.isPublic,
      targets: meta.targets.length ? meta.targets : ['all'],
      publishStart: meta.publishStart,
      publishEnd: meta.publishEnd,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const toggleTarget = (code: string) => {
    setForm(prev => {
      if (code === 'all') return { ...prev, targets: ['all'] };
      const without = prev.targets.filter(c => c !== 'all' && c !== code);
      const next = prev.targets.includes(code) ? without : [...without, code];
      return { ...prev, targets: next.length ? next : ['all'] };
    });
  };

  const handleSave = async () => {
    setFormError(null);
    if (!form.title.trim()) { setFormError('제목을 입력해주세요'); return; }
    if (!form.content.trim()) { toast.error('내용을 입력해주세요.'); return; }
    // 게시 기간 역순 검증 (docs4 SCR-085 예외처리)
    if (form.publishStart && form.publishEnd && new Date(form.publishEnd) < new Date(form.publishStart)) {
      setFormError('종료일은 시작일 이후여야 합니다'); return;
    }
    // 예약 발행 시각이 과거 검증
    if (form.publishStart && new Date(form.publishStart).getTime() < Date.now()) {
      setFormError('예약 발행 시각을 미래로 설정해주세요'); return;
    }
    setIsSaving(true);

    let savedId = editTarget?.id ?? null;
    if (editTarget) {
      const { error } = await updateNotice(editTarget.id, { title: form.title, content: form.content, isPinned: form.isPinned, isPublic: form.isPublic });
      if (error) { toast.error('수정에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('공지사항이 수정되었습니다.');
    } else {
      const { error } = await createNotice({
        title: form.title,
        content: form.content,
        authorName: authUser?.name ?? '관리자',
        isPinned: form.isPinned,
        isPublic: form.isPublic,
      });
      if (error) { toast.error('등록에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('공지사항이 등록되었습니다.');
    }

    // 게시 대상·기간 메타데이터 저장 (목업). 신규 등록은 재조회 후 최신 id에 매핑.
    const { data: refreshed } = await getNotices();
    const list = refreshed ?? [];
    setNotices(list);
    if (savedId === null && list.length > 0) {
      // 신규: 가장 최근 작성 공지의 id로 추정 매핑
      savedId = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].id;
    }
    if (savedId !== null) {
      const nextMeta = { ...metaMap, [savedId]: { targets: form.targets, publishStart: form.publishStart, publishEnd: form.publishEnd } };
      setMetaMap(nextMeta);
      saveMetaMap(nextMeta);
    }

    setIsSaving(false);
    setModalOpen(false);
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    const { error } = await deleteNotice(deleteTarget);
    if (error) { toast.error('삭제에 실패했습니다.'); return; }
    toast.success('공지사항이 삭제되었습니다.');
    const nextMeta = { ...metaMap };
    delete nextMeta[deleteTarget];
    setMetaMap(nextMeta);
    saveMetaMap(nextMeta);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchNotices();
  };

  const fmtDate = (iso: string) => iso?.slice(0, 10) ?? '';

  // 상태 필터 + 키워드 검색 + 고정/최신 정렬
  const filteredNotices = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return [...notices]
      .filter(n => {
        const status = deriveStatus(metaMap[n.id], n.isPublic);
        if (statusFilter !== 'all' && status !== statusFilter) return false;
        if (kw && !n.title.toLowerCase().includes(kw)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notices, metaMap, statusFilter, keyword]);

  const readCount = filteredNotices.filter(n => readIds.has(n.id)).length;

  // 상태별 카운트 (탭 배지)
  const statusCounts = useMemo(() => {
    const c: Record<'all' | NoticeStatus, number> = { all: notices.length, scheduled: 0, active: 0, ended: 0 };
    notices.forEach(n => { c[deriveStatus(metaMap[n.id], n.isPublic)] += 1; });
    return c;
  }, [notices, metaMap]);

  const columns = [
    {
      key: 'isPinned', header: '', width: 36, align: 'center' as const,
      render: (v: boolean) => v ? <Pin size={14} className="text-primary mx-auto" /> : null,
    },
    {
      key: 'title', header: '제목',
      render: (v: string, row: Notice) => (
        <button
          className={cn('flex items-center gap-xs text-[13px] font-semibold text-left hover:text-primary transition-colors', row.isPinned && 'text-primary')}
          onClick={() => { setDetailNotice(row); markAsRead(row.id); }}
        >
          {row.isPinned && <span className="mr-xs text-[10px] bg-primary/10 text-primary px-xs py-[1px] rounded-full">공지</span>}
          {v}
          {!readIds.has(row.id) && (
            <span className="ml-xs inline-block h-2 w-2 rounded-full bg-primary shrink-0" title="읽지 않음" />
          )}
        </button>
      ),
    },
    {
      key: 'targets', header: '게시 대상', width: 140,
      render: (_: unknown, row: Notice) => (
        <span className="text-[12px] text-content-secondary">{formatTargets(metaMap[row.id])}</span>
      ),
    },
    {
      key: 'period', header: '게시 기간', width: 220,
      render: (_: unknown, row: Notice) => (
        <span className="text-[11px] text-content-tertiary">{formatPeriod(metaMap[row.id])}</span>
      ),
    },
    {
      key: 'status', header: '게시 상태', width: 90, align: 'center' as const,
      render: (_: unknown, row: Notice) => {
        const meta = STATUS_META[deriveStatus(metaMap[row.id], row.isPublic)];
        return <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>;
      },
    },
    { key: 'authorName', header: '작성자', width: 90 },
    { key: 'createdAt', header: '작성일', width: 100, align: 'center' as const, render: (v: string) => fmtDate(v) },
    {
      key: 'actions', header: '', width: 80, align: 'center' as const,
      render: (_: unknown, row: Notice) => (
        <div className="flex items-center justify-center gap-xs">
          <Button variant="ghost" size="sm" icon={<Edit2 size={15} />} onClick={() => openEdit(row)} title="수정" />
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} onClick={() => { setDeleteTarget(row.id); setDeleteDialogOpen(true); }} title="삭제" />
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="공지사항"
        description="센터 공지사항을 작성하고 게시 대상·게시 기간을 관리합니다."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>공지 등록</Button>
        }
      />

      {/* 상태 필터 탭 + 키워드 검색 */}
      <div className="flex flex-wrap items-center justify-between gap-md mb-md">
        <div className="flex items-center gap-xs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={cn(
                'rounded-full px-md py-xs text-[12px] font-semibold transition-colors',
                statusFilter === tab.key ? 'bg-primary text-white' : 'bg-surface-secondary text-content-secondary hover:bg-line'
              )}
            >
              {tab.label}
              <span className="ml-xs text-[11px] opacity-70">{statusCounts[tab.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            className="h-[36px] w-[240px] rounded-lg border border-line bg-surface-secondary pl-[34px] pr-md text-[13px] focus:border-primary focus:outline-none"
            placeholder="제목 검색"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          data={filteredNotices as unknown as Record<string, unknown>[]}
          loading={isLoading}
          title={`총 ${filteredNotices.length}건 · 읽음 ${readCount}건`}
          emptyMessage={keyword.trim() ? '검색 결과가 없습니다.' : '등록된 공지사항이 없습니다.'}
          pagination={{ page: 1, pageSize: 20, total: filteredNotices.length }}
          onRowClick={(row) => { setDetailNotice(row as unknown as Notice); markAsRead((row as unknown as Notice).id); }}
        />
      </div>

      {/* 작성/수정 모달 (DLG-085-001) */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[560px] mx-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-sm px-lg py-md border-b border-line">
              <Bell size={18} className="text-primary" />
              <h3 className="text-[15px] font-bold text-content">{editTarget ? '공지 수정' : '공지 등록'}</h3>
            </div>

            <div className="p-lg space-y-md">
              {/* 제목 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">제목 *</label>
                <input
                  className={cn(
                    'w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border focus:outline-none',
                    formError === '제목을 입력해주세요' ? 'border-state-error focus:border-state-error' : 'border-line focus:border-primary'
                  )}
                  placeholder="공지 제목을 입력하세요"
                  value={form.title}
                  onChange={e => { setForm({ ...form, title: e.target.value }); setFormError(null); }}
                />
                {formError === '제목을 입력해주세요' && (
                  <p className="text-[12px] text-state-error mt-[4px]">제목을 입력해주세요</p>
                )}
              </div>

              {/* 내용 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">내용 *</label>
                <Textarea
                  rows={5}
                  placeholder="공지 내용을 입력하세요"
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                />
              </div>

              {/* 게시 대상 (전체 / 특정 역할 다중 선택) */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">게시 대상</label>
                <div className="flex flex-wrap gap-xs">
                  {TARGET_ROLES.map(role => {
                    const active = form.targets.includes(role.code);
                    return (
                      <button
                        key={role.code}
                        type="button"
                        onClick={() => toggleTarget(role.code)}
                        className={cn(
                          'rounded-full px-md py-xs text-[12px] font-medium transition-colors',
                          active ? 'bg-primary text-white' : 'bg-surface-secondary text-content-secondary hover:bg-line'
                        )}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 게시 기간 (예약 발행 + 종료일) */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-[12px] font-semibold text-content-secondary mb-[4px] flex items-center gap-xs">
                    <Clock size={13} /> 게시 시작일시
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                    value={form.publishStart}
                    onChange={e => { setForm({ ...form, publishStart: e.target.value }); setFormError(null); }}
                  />
                  <p className="text-[10px] text-content-tertiary mt-[2px]">빈칸 시 즉시 게시 · 미래 설정 시 예약 발행</p>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">게시 종료일시</label>
                  <input
                    type="datetime-local"
                    className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                    value={form.publishEnd}
                    onChange={e => { setForm({ ...form, publishEnd: e.target.value }); setFormError(null); }}
                  />
                  <p className="text-[10px] text-content-tertiary mt-[2px]">빈칸 시 무기한 게시</p>
                </div>
              </div>

              {formError && formError !== '제목을 입력해주세요' && (
                <p className="text-[12px] text-state-error">{formError}</p>
              )}

              {/* 옵션 토글 */}
              <div className="grid grid-cols-2 gap-md">
                {([
                  { key: 'isPinned', label: '상단 고정', desc: '목록 맨 위에 고정됩니다', icon: Pin },
                  { key: 'isPublic', label: '공개 여부', desc: '회원에게 공개됩니다', icon: Eye },
                ] as const).map(item => (
                  <div key={item.key} className="flex items-center justify-between p-md bg-surface-secondary rounded-lg border border-line">
                    <div>
                      <p className="text-[12px] font-semibold text-content">{item.label}</p>
                      <p className="text-[10px] text-content-tertiary">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, [item.key]: !form[item.key] })}
                      className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form[item.key] ? 'bg-accent' : 'bg-line')}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform', form[item.key] ? 'translate-x-4' : 'translate-x-0.5')} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-sm px-lg py-md border-t border-line">
              <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>취소</Button>
              <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving} loading={isSaving}>{editTarget ? '수정 저장' : '등록'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* 상세 보기 모달 */}
      {detailNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setDetailNotice(null)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[540px] mx-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-line">
              <div className="flex items-start justify-between gap-md">
                <div>
                  <div className="flex items-center gap-sm mb-xs">
                    {detailNotice.isPinned && <Pin size={14} className="text-primary" />}
                    {detailNotice.isPublic
                      ? <Eye size={13} className="text-state-success" />
                      : <EyeOff size={13} className="text-content-tertiary" />
                    }
                    <StatusBadge variant={STATUS_META[deriveStatus(metaMap[detailNotice.id], detailNotice.isPublic)].variant}>
                      {STATUS_META[deriveStatus(metaMap[detailNotice.id], detailNotice.isPublic)].label}
                    </StatusBadge>
                  </div>
                  <h3 className="text-[16px] font-bold text-content">{detailNotice.title}</h3>
                  <p className="text-[12px] text-content-tertiary mt-xs">{detailNotice.authorName} · {fmtDate(detailNotice.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetailNotice(null)}>×</Button>
              </div>
              <div className="mt-sm flex flex-wrap gap-md text-[11px] text-content-secondary">
                <span>게시 대상: {formatTargets(metaMap[detailNotice.id])}</span>
                <span>게시 기간: {formatPeriod(metaMap[detailNotice.id])}</span>
              </div>
            </div>
            <div className="p-lg">
              <p className="text-[14px] text-content whitespace-pre-wrap leading-relaxed">{detailNotice.content}</p>
            </div>
            <div className="px-lg py-md border-t border-line flex justify-end gap-sm">
              <Button variant="outline" onClick={() => { const n = detailNotice; setDetailNotice(null); openEdit(n); }}>수정</Button>
              <Button variant="primary" onClick={() => setDetailNotice(null)}>닫기</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="공지사항 삭제"
        description="정말로 이 공지사항을 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
