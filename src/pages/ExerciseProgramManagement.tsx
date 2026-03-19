import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Dumbbell, PlusCircle, X } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import {
  getExercisePrograms,
  createExerciseProgram,
  updateExerciseProgram,
  deleteExerciseProgram,
  type ExerciseProgram,
  type ProgramLevel,
  type ExerciseItem,
} from '@/api/endpoints/exercisePrograms';

const CATEGORIES = ['근력', '유산소', '유연성', '재활'];
const LEVELS: ProgramLevel[] = ['초급', '중급', '고급'];

const CATEGORY_VARIANT: Record<string, 'info' | 'warning' | 'mint' | 'default'> = {
  근력: 'info',
  유산소: 'warning',
  유연성: 'mint',
  재활: 'default',
};

const LEVEL_VARIANT: Record<string, 'mint' | 'warning' | 'error'> = {
  초급: 'mint',
  중급: 'warning',
  고급: 'error',
};

const EMPTY_EXERCISE: ExerciseItem = { name: '', sets: null, reps: null, weight: null, duration: null, memo: '' };

const EMPTY_FORM = {
  name: '',
  category: '근력',
  level: '초급' as ProgramLevel,
  description: '',
  exercises: [{ ...EMPTY_EXERCISE }] as ExerciseItem[],
};

export default function ExerciseProgramManagement() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;
  const [programs, setPrograms] = useState<ExerciseProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExerciseProgram | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('전체');

  const fetchPrograms = async () => {
    setIsLoading(true);
    const data = await getExercisePrograms(branchId);
    setIsLoading(false);
    setPrograms(data);
  };

  useEffect(() => { fetchPrograms(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, exercises: [{ ...EMPTY_EXERCISE }] });
    setModalOpen(true);
  };

  const openEdit = (program: ExerciseProgram) => {
    setEditTarget(program);
    setForm({
      name: program.name,
      category: program.category ?? '근력',
      level: (program.level ?? '초급') as ProgramLevel,
      description: program.description ?? '',
      exercises: [{ ...EMPTY_EXERCISE }],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('프로그램 이름을 입력해주세요.'); return; }
    setIsSaving(true);

    const payload = {
      branchId,
      name: form.name.trim(),
      category: form.category || null,
      level: form.level || null,
      description: form.description || null,
      exercises: form.exercises.filter(e => e.name.trim()),
    };

    if (editTarget) {
      const { error } = await updateExerciseProgram(editTarget.id, payload);
      if (error) { toast.error('수정에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('운동 프로그램이 수정되었습니다.');
    } else {
      const { error } = await createExerciseProgram(payload);
      if (error) { toast.error('등록에 실패했습니다.'); setIsSaving(false); return; }
      toast.success('운동 프로그램이 등록되었습니다.');
    }

    setIsSaving(false);
    setModalOpen(false);
    fetchPrograms();
  };

  const handleDelete = async () => {
    if (deleteTarget === null) return;
    const { error } = await deleteExerciseProgram(deleteTarget);
    if (error) { toast.error('삭제에 실패했습니다.'); return; }
    toast.success('운동 프로그램이 삭제되었습니다.');
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchPrograms();
  };

  const addExercise = () => setForm(prev => ({ ...prev, exercises: [...prev.exercises, { ...EMPTY_EXERCISE }] }));
  const removeExercise = (idx: number) => setForm(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));
  const updateExercise = (idx: number, field: keyof ExerciseItem, value: string | number | null) => {
    setForm(prev => ({
      ...prev,
      exercises: prev.exercises.map((e, i) => i === idx ? { ...e, [field]: value } : e),
    }));
  };

  const filtered = filterCategory === '전체' ? programs : programs.filter(p => p.category === filterCategory);

  const columns = [
    { key: 'name', header: '프로그램명', width: 220 },
    {
      key: 'category', header: '카테고리', width: 100, align: 'center' as const,
      render: (v: string | null) => v ? <StatusBadge variant={CATEGORY_VARIANT[v] ?? 'default'}>{v}</StatusBadge> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'level', header: '난이도', width: 90, align: 'center' as const,
      render: (v: string | null) => v ? <StatusBadge variant={LEVEL_VARIANT[v] ?? 'default'}>{v}</StatusBadge> : <span className="text-content-tertiary">-</span>,
    },
    {
      key: 'description', header: '설명', width: 280,
      render: (v: string | null) => <span className="text-[12px] text-content-tertiary line-clamp-1">{v ?? '-'}</span>,
    },
    {
      key: 'actions', header: '', width: 80, align: 'center' as const,
      render: (_: unknown, row: ExerciseProgram) => (
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
        title="운동 프로그램 관리"
        description="센터에서 운영하는 운동 프로그램을 등록하고 관리합니다."
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-xs px-md py-sm bg-primary text-surface rounded-button text-[13px] font-bold shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus size={16} /> 프로그램 추가
          </button>
        }
      />

      {/* 카테고리 필터 */}
      <div className="flex items-center gap-xs flex-wrap mb-lg">
        {['전체', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'px-md py-xs rounded-button text-[12px] font-semibold transition-colors',
              filterCategory === cat
                ? 'bg-primary text-surface'
                : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns as Parameters<typeof DataTable>[0]['columns']}
          data={filtered as unknown as Record<string, unknown>[]}
          loading={isLoading}
          title={`총 ${filtered.length}개`}
          emptyMessage="등록된 운동 프로그램이 없습니다."
          pagination={{ page: 1, pageSize: 20, total: filtered.length }}
        />
      </div>

      {/* 추가/수정 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-surface rounded-xl shadow-lg border border-line w-full max-w-[600px] mx-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-sm px-lg py-md border-b border-line sticky top-0 bg-surface z-10">
              <Dumbbell size={18} className="text-primary" />
              <h3 className="text-[15px] font-bold text-content">{editTarget ? '운동 프로그램 수정' : '운동 프로그램 추가'}</h3>
            </div>

            <div className="p-lg space-y-md">
              {/* 이름 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">프로그램 이름 *</label>
                <input
                  className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                  placeholder="예: 초보자 근력 루틴"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>

              {/* 카테고리 + 난이도 */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">카테고리</label>
                  <select
                    className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">난이도</label>
                  <select
                    className="w-full h-[38px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none"
                    value={form.level}
                    onChange={e => setForm({ ...form, level: e.target.value as ProgramLevel })}
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">설명</label>
                <textarea
                  rows={3}
                  className="w-full px-md py-sm bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary focus:outline-none resize-none"
                  placeholder="프로그램 설명을 입력하세요."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* 운동 구성 */}
              <div>
                <div className="flex items-center justify-between mb-sm">
                  <label className="text-[12px] font-semibold text-content-secondary">운동 구성</label>
                  <button
                    type="button"
                    onClick={addExercise}
                    className="flex items-center gap-xs text-[12px] text-primary font-semibold hover:text-primary-dark transition-colors"
                  >
                    <PlusCircle size={14} /> 운동 추가
                  </button>
                </div>
                <div className="space-y-sm">
                  {form.exercises.map((ex, idx) => (
                    <div key={idx} className="p-md bg-surface-secondary rounded-lg border border-line space-y-sm">
                      <div className="flex items-center gap-sm">
                        <input
                          className="flex-1 h-[32px] px-sm bg-surface rounded-md text-[12px] border border-line focus:border-primary focus:outline-none"
                          placeholder="운동명"
                          value={ex.name}
                          onChange={e => updateExercise(idx, 'name', e.target.value)}
                        />
                        <button type="button" onClick={() => removeExercise(idx)} className="text-content-tertiary hover:text-state-error transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-xs">
                        {([
                          { field: 'sets', label: '세트' },
                          { field: 'reps', label: '횟수' },
                          { field: 'weight', label: '무게(kg)' },
                          { field: 'duration', label: '시간(분)' },
                        ] as const).map(({ field, label }) => (
                          <div key={field}>
                            <p className="text-[10px] text-content-tertiary mb-[2px]">{label}</p>
                            <input
                              type="number"
                              min={0}
                              className="w-full h-[30px] px-xs bg-surface rounded-md text-[12px] border border-line focus:border-primary focus:outline-none text-center"
                              placeholder="-"
                              value={ex[field] ?? ''}
                              onChange={e => updateExercise(idx, field, e.target.value ? Number(e.target.value) : null)}
                            />
                          </div>
                        ))}
                      </div>
                      <input
                        className="w-full h-[30px] px-sm bg-surface rounded-md text-[12px] border border-line focus:border-primary focus:outline-none"
                        placeholder="메모"
                        value={ex.memo}
                        onChange={e => updateExercise(idx, 'memo', e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-sm px-lg py-md border-t border-line sticky bottom-0 bg-surface">
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
        title="운동 프로그램 삭제"
        description="정말로 이 운동 프로그램을 삭제하시겠습니까?"
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
