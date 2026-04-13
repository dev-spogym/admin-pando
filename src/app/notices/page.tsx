'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Pin, Eye, EyeOff, Bell } from 'lucide-react';
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

const EMPTY_FORM = { title: '', content: '', isPinned: false, isPublic: true };

export default function Notices() {
  const authUser = useAuthStore(s => s.user);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Notice | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  useEffect(() => { fetchNotices(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (notice: Notice) => {
    setEditTarget(notice);
    setForm({ title: notice.title, content: notice.content, isPinned: notice.isPinned, isPublic: notice.isPublic });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { toast.error('내용을 입력해주세요.'); return; }
    setIsSaving(true);

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

    setIsSaving(false);
    setModalOpen(false);
    fetchNotices();
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    const { error } = await deleteNotice(deleteTarget);
    if (error) { toast.error('삭제에 실패했습니다.'); return; }
    toast.success('공지사항이 삭제되었습니다.');
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchNotices();
  };

  const sortedNotices = [...notices].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const fmtDate = (iso: string) => iso?.slice(0, 10) ?? '';

  const readCount = sortedNotices.filter(n => readIds.has(n.id)).length;

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
      key: 'readStatus', header: '읽음', width: 72, align: 'center' as const,
      render: (_: unknown, row: Notice) => readIds.has(row.id)
        ? <span className="text-[11px] text-content-tertiary">읽음</span>
        : <span className="text-[11px] font-semibold text-primary">NEW</span>,
    },
    { key: 'authorName', header: '작성자', width: 100 },
    { key: 'createdAt', header: '작성일', width: 110, align: 'center' as const, render: (v: string) => fmtDate(v) },
    {
      key: 'isPublic', header: '공개', width: 80, align: 'center' as const,
      render: (v: boolean) => (
        <StatusBadge variant={v ? 'mint' : 'default'}>
          {v ? '공개' : '비공개'}
        </StatusBadge>
      ),
    },
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
        description="센터 공지사항을 작성하고 관리합니다."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>공지 작성</Button>
        }
      />

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          data={sortedNotices as unknown as Record<string, unknown>[]}
          loading={isLoading}
          title={`총 ${notices.length}건 · 읽음 ${readCount}건`}
          emptyMessage="등록된 공지사항이 없습니다."
          pagination={{ page: 1, pageSize: 20, total: notices.length }}
          onRowClick={(row) => setDetailNotice(row as unknown as Notice)}
        />
      </div>

      {/* 작성/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[540px] mx-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-sm px-lg py-md border-b border-line">
              <Bell size={18} className="text-primary" />
              <h3 className="text-[15px] font-bold text-content">{editTarget ? '공지사항 수정' : '공지사항 작성'}</h3>
            </div>

            <div className="p-lg space-y-md">
              {/* 제목 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">제목 *</label>
                <input
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder="공지 제목을 입력하세요"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">내용 *</label>
                <Textarea
                  rows={6}
                  placeholder="공지 내용을 입력하세요"
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                />
              </div>

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
                  </div>
                  <h3 className="text-[16px] font-bold text-content">{detailNotice.title}</h3>
                  <p className="text-[12px] text-content-tertiary mt-xs">{detailNotice.authorName} · {fmtDate(detailNotice.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setDetailNotice(null)}>×</Button>
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
