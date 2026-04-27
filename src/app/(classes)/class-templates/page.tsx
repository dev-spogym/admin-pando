'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, LayoutTemplate, CheckCircle, XCircle } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { supabase } from '@/lib/supabase';

// 수업 유형
const TYPE_OPTIONS = [
  { value: 'GX', label: 'GX' },
  { value: 'PT', label: 'PT' },
  { value: 'PILATES', label: '필라테스' },
  { value: 'YOGA', label: '요가' },
  { value: 'ETC', label: '기타' },
];

const TYPE_VARIANT: Record<string, 'info' | 'peach' | 'mint' | 'warning' | 'default'> = {
  GX: 'info',
  PT: 'peach',
  PILATES: 'mint',
  YOGA: 'warning',
  ETC: 'default',
};

// 색상 팔레트
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6',
];

interface ClassTemplate {
  id: number;
  branchId: number;
  name: string;
  type: string;
  defaultCapacity: number;
  defaultDurationMin: number;
  description: string | null;
  color: string;
  isActive: boolean;
}

const WEEKDAYS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

interface TemplateForm {
  name: string;
  type: string;
  defaultCapacity: string;
  defaultDurationMin: string;
  description: string;
  color: string;
  isActive: boolean;
  repeatDays: number[]; // 반복 요일 (0=일, 1=월, ... 6=토)
}

const DEFAULT_FORM: TemplateForm = {
  name: '',
  type: 'GX',
  defaultCapacity: '10',
  defaultDurationMin: '60',
  description: '',
  color: '#6366f1',
  isActive: true,
  repeatDays: [],
};

export default function ClassTemplates() {
  const branchId = getBranchId();

  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ClassTemplate | null>(null);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 템플릿 목록 조회
  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('class_templates')
      .select('*')
      .eq('branchId', branchId)
      .order('name');
    if (!error && data) setTemplates(data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      branchId: r.branchId as number,
      name: r.name as string,
      type: r.type as string,
      defaultCapacity: r.defaultCapacity as number,
      defaultDurationMin: r.defaultDuration as number,
      description: (r.description as string | null) ?? null,
      color: r.color as string,
      isActive: r.isActive as boolean,
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 통계
  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter((t) => t.isActive).length;
    return { total, active, inactive: total - active };
  }, [templates]);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.type.toLowerCase().includes(q)
    );
  }, [templates, searchValue]);

  // 모달 열기 (등록)
  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEdit = (t: ClassTemplate) => {
    setEditTarget(t);
    setForm({
      name: t.name,
      type: t.type,
      defaultCapacity: String(t.defaultCapacity),
      defaultDurationMin: String(t.defaultDurationMin),
      description: t.description ?? '',
      color: t.color,
      isActive: t.isActive,
      repeatDays: (t as ClassTemplate & { repeatDays?: number[] }).repeatDays ?? [],
    });
    setModalOpen(true);
  };

  // 저장 (등록/수정)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('템플릿 이름을 입력하세요.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      defaultCapacity: Number(form.defaultCapacity) || 10,
      defaultDuration: Number(form.defaultDurationMin) || 60,
      description: form.description.trim() || null,
      color: form.color,
      isActive: form.isActive,
      branchId: branchId,
    };

    if (editTarget) {
      const { error } = await supabase
        .from('class_templates')
        .update(payload)
        .eq('id', editTarget.id);
      if (error) {
        toast.error('템플릿 수정에 실패했습니다.');
      } else {
        toast.success('템플릿이 수정되었습니다.');
        setModalOpen(false);
        fetchTemplates();
      }
    } else {
      const { error } = await supabase.from('class_templates').insert(payload);
      if (error) {
        toast.error('템플릿 등록에 실패했습니다.');
      } else {
        toast.success('템플릿이 등록되었습니다.');
        setModalOpen(false);
        fetchTemplates();
      }
    }
    setSaving(false);
  };

  // 삭제
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase
      .from('class_templates')
      .delete()
      .eq('id', deleteTargetId);
    if (error) {
      toast.error('템플릿 삭제에 실패했습니다.');
    } else {
      toast.success('템플릿이 삭제되었습니다.');
      fetchTemplates();
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  // 테이블 컬럼
  const columns = [
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    {
      key: 'name',
      header: '템플릿명',
      render: (v: string, row: ClassTemplate) => (
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: row.color }}
          />
          <span className="font-medium text-content">{v}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      render: (v: string) => (
        <StatusBadge
          variant={TYPE_VARIANT[v] ?? 'default'}
          label={TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v}
        />
      ),
    },
    { key: 'defaultCapacity', header: '기본정원', align: 'center' as const, render: (v: number) => `${v}명` },
    { key: 'defaultDurationMin', header: '기본시간', align: 'center' as const, render: (v: number) => `${v}분` },
    {
      key: 'isActive',
      header: '상태',
      render: (v: boolean) =>
        v ? (
          <StatusBadge variant="success" label="활성" dot />
        ) : (
          <StatusBadge variant="default" label="비활성" dot />
        ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (_: any, row: ClassTemplate) => (
        <div className="flex items-center justify-center gap-1">
          <button
            className="p-1.5 rounded-md text-content-secondary hover:text-primary hover:bg-primary-light transition-colors"
            onClick={() => openEdit(row)}
            title="수정"
          >
            <Edit2 size={14} />
          </button>
          <button
            className="p-1.5 rounded-md text-content-secondary hover:text-state-error hover:bg-red-50 transition-colors"
            onClick={() => { setDeleteTargetId(row.id); setDeleteDialogOpen(true); }}
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="그룹수업 템플릿 관리"
        description="그룹수업 템플릿을 등록하고 시간표에 활용합니다."
        actions={
          <button
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
            onClick={openCreate}
          >
            <Plus size={15} />
            템플릿 등록
          </button>
        }
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="전체 템플릿" value={stats.total} icon={<LayoutTemplate />} />
        <StatCard label="활성 템플릿" value={stats.active} icon={<CheckCircle />} variant="mint" />
        <StatCard label="비활성 템플릿" value={stats.inactive} icon={<XCircle />} variant="peach" />
      </StatCardGrid>

      {/* 템플릿 목록 테이블 */}
      <DataTable
        title="템플릿 목록"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="등록된 템플릿이 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="템플릿명, 유형 검색..."
      />

      {/* 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '템플릿 수정' : '템플릿 등록'}
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              취소
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : editTarget ? '수정' : '등록'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-md">
          {/* 템플릿명 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              템플릿명 <span className="text-state-error">*</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="템플릿명 입력"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* 유형 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">유형</label>
            <Select
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              options={TYPE_OPTIONS}
            />
          </div>

          {/* 기본정원 / 기본시간 */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">기본정원 (명)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={form.defaultCapacity}
                onChange={(e) => setForm((f) => ({ ...f, defaultCapacity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">기본시간 (분)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={form.defaultDurationMin}
                onChange={(e) => setForm((f) => ({ ...f, defaultDurationMin: e.target.value }))}
              />
            </div>
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">설명</label>
            <Textarea
              rows={2}
              placeholder="수업 설명 (선택)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* 색상 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">색상</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    borderColor: form.color === color ? '#1a1a1a' : 'transparent',
                  }}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* 반복 요일 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">반복 요일</label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAYS.map((day) => {
                const checked = form.repeatDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        repeatDays: checked
                          ? f.repeatDays.filter((d) => d !== day.value)
                          : [...f.repeatDays, day.value].sort((a, b) => a - b),
                      }))
                    }
                    className={`w-9 h-9 rounded-full text-[13px] font-semibold border transition-colors ${
                      checked
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 활성 토글 */}
          <div className="flex items-center gap-sm">
            <button
              type="button"
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                form.isActive ? 'bg-primary' : 'bg-line'
              }`}
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            >
              <span
                className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                  form.isActive ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
            <span className="text-[13px] text-content">
              {form.isActive ? '활성' : '비활성'}
            </span>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="템플릿 삭제"
        description="이 템플릿을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
      />
    </AppLayout>
  );
}
