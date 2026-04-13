import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from '@/lib/utils';
import {
  getDiscountPolicies,
  createDiscountPolicy,
  updateDiscountPolicy,
  deleteDiscountPolicy,
  type DiscountPolicy,
} from '@/api/endpoints/discountPolicies';

const EMPTY_FORM = {
  name: '',
  type: 'percentage' as 'percentage' | 'fixed',
  value: '',
  minDuration: '',
  maxDiscount: '',
  isActive: true,
};

export default function DiscountSettings() {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountPolicy | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchPolicies = async () => {
    setIsLoading(true);
    const { data, error } = await getDiscountPolicies();
    setIsLoading(false);
    if (error) { toast.error('할인 설정을 불러오지 못했습니다.'); return; }
    setPolicies(data ?? []);
  };

  useEffect(() => { fetchPolicies(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (policy: DiscountPolicy) => {
    setEditTarget(policy);
    setForm({
      name: policy.name,
      type: policy.type,
      value: String(policy.value),
      minDuration: policy.minDuration != null ? String(policy.minDuration) : '',
      maxDiscount: policy.maxDiscount != null ? String(policy.maxDiscount) : '',
      isActive: policy.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('할인명을 입력해주세요.'); return; }
    if (!form.value || isNaN(Number(form.value))) { toast.error('할인 값을 입력해주세요.'); return; }
    setIsSaving(true);

    const payload = {
      name: form.name.trim(),
      type: form.type,
      value: Number(form.value),
      minDuration: form.minDuration ? Number(form.minDuration) : null,
      maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : null,
      isActive: form.isActive,
    };

    if (editTarget) {
      const { error } = await updateDiscountPolicy(editTarget.id, payload);
      if (error) { toast.error('수정에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('할인 정책이 수정되었습니다.');
    } else {
      const { error } = await createDiscountPolicy(payload);
      if (error) { toast.error('등록에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('할인 정책이 등록되었습니다.');
    }

    setIsSaving(false);
    setModalOpen(false);
    fetchPolicies();
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    const { error } = await deleteDiscountPolicy(deleteTarget);
    if (error) { toast.error('삭제에 실패했습니다.'); return; }
    toast.success('할인 정책이 삭제되었습니다.');
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchPolicies();
  };

  const columns = [
    { key: 'name', header: '할인명', width: 200 },
    {
      key: 'type', header: '유형', width: 100, align: 'center' as const,
      render: (v: string) => (
        <StatusBadge variant={v === 'percentage' ? 'info' : 'warning'}>
          {v === 'percentage' ? '정률' : '정액'}
        </StatusBadge>
      ),
    },
    {
      key: 'value', header: '할인 값', width: 120, align: 'right' as const,
      render: (v: number, row: DiscountPolicy) => (
        <span className="tabular-nums font-semibold">
          {row.type === 'percentage' ? `${v}%` : `₩${v.toLocaleString()}`}
        </span>
      ),
    },
    {
      key: 'minDuration', header: '조건', width: 100, align: 'center' as const,
      render: (v: number | null) => v != null ? `${v}일 이상` : '-',
    },
    {
      key: 'maxDiscount', header: '한도', width: 120, align: 'right' as const,
      render: (v: number | null) => v != null ? `₩${v.toLocaleString()}` : '-',
    },
    {
      key: 'isActive', header: '상태', width: 90, align: 'center' as const,
      render: (v: boolean) => (
        <StatusBadge variant={v ? 'mint' : 'default'} dot={v}>{v ? '활성' : '비활성'}</StatusBadge>
      ),
    },
    {
      key: 'actions', header: '', width: 80, align: 'center' as const,
      render: (_: unknown, row: DiscountPolicy) => (
        <div className="flex items-center justify-center gap-xs">
          <button className="p-xs text-content-tertiary hover:text-accent transition-colors" onClick={() => openEdit(row)} title="수정">
            <Edit2 size={15} />
          </button>
          <button className="p-xs text-content-tertiary hover:text-state-error transition-colors" onClick={() => { setDeleteTarget(row.id); setDeleteDialogOpen(true); }} title="삭제">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="할인 설정"
        description="상품 판매 시 적용할 할인 정책을 관리합니다."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> 할인 추가
          </button>
        }
      />

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          data={policies as unknown as Record<string, unknown>[]}
          loading={isLoading}
          title={`총 ${policies.length}개`}
          emptyMessage="등록된 할인 정책이 없습니다."
          pagination={{ page: 1, pageSize: 20, total: policies.length }}
        />
      </div>

      {/* 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[480px] mx-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-sm px-lg py-md border-b border-line">
              <Tag size={18} className="text-primary" />
              <h3 className="text-[15px] font-bold text-content">{editTarget ? '할인 정책 수정' : '할인 정책 추가'}</h3>
            </div>

            <div className="p-lg space-y-md">
              {/* 할인명 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">할인명 *</label>
                <input
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder="예: 재등록 10% 할인"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* 유형 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[6px] block">할인 유형</label>
                <div className="flex gap-md">
                  {([{ value: 'percentage', label: '정률 (%)' }, { value: 'fixed', label: '정액 (원)' }] as const).map(opt => (
                    <label key={opt.value} className="flex items-center gap-sm cursor-pointer">
                      <input
                        type="radio"
                        className="accent-primary"
                        checked={form.type === opt.value}
                        onChange={() => setForm({ ...form, type: opt.value })}
                      />
                      <span className="text-[13px] text-content">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 할인 값 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">
                  할인 값 * {form.type === 'percentage' ? '(%)' : '(원)'}
                </label>
                <input
                  type="number"
                  min={0}
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder={form.type === 'percentage' ? '예: 10' : '예: 50000'}
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                />
              </div>

              {/* 최소 계약 기간 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">최소 계약 기간 (일, 선택)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder="예: 90"
                  value={form.minDuration}
                  onChange={e => setForm({ ...form, minDuration: e.target.value })}
                />
              </div>

              {/* 최대 할인금액 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">최대 할인금액 (원, 선택)</label>
                <input
                  type="number"
                  min={0}
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder="예: 100000"
                  value={form.maxDiscount}
                  onChange={e => setForm({ ...form, maxDiscount: e.target.value })}
                />
              </div>

              {/* 활성 토글 */}
              <div className="flex items-center justify-between p-md bg-surface-secondary rounded-lg border border-line">
                <span className="text-[13px] font-semibold text-content">활성 상태</span>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', form.isActive ? 'bg-accent' : 'bg-line')}
                >
                  <span className={cn('inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform', form.isActive ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>

            <div className="flex gap-sm px-lg py-md border-t border-line">
              <button onClick={() => setModalOpen(false)} className="flex-1 h-[38px] rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-secondary transition-colors">취소</button>
              <button onClick={handleSave} disabled={isSaving} className="flex-1 h-[38px] rounded-lg bg-primary text-[13px] font-semibold text-surface hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {isSaving ? '저장 중...' : (editTarget ? '수정 저장' : '등록')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="할인 정책 삭제"
        description="정말로 이 할인 정책을 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
