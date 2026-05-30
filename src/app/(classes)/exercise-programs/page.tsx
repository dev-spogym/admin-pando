'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Dumbbell, PlusCircle, X, Users, UserPlus } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from '@/lib/utils';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast, normalizeRole } from '@/lib/permissions';
import {
  getExercisePrograms,
  createExerciseProgram,
  updateExerciseProgram,
  deleteExerciseProgram,
  assignProgram,
  unassignProgram,
  type ExerciseProgram,
  type ProgramLevel,
  type ExerciseItem,
} from '@/api/endpoints/exercisePrograms';
import { supabase } from '@/lib/supabase';

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

interface MemberCandidate {
  id: number;
  name: string;
  phone: string;
}

interface ProgramAssignment {
  id: number;
  memberId: number;
  memberName: string;
  memberPhone: string;
  status: string;
}

export default function ExerciseProgramManagement() {
  const branchId = getBranchId();
  const currentUser = useAuthStore((state) => state.user);
  const isSuperAdmin = currentUser?.isSuperAdmin ?? false;
  const role = normalizeRole(currentUser?.role ?? 'readonly');
  // 트레이너 이상만 프로그램 생성·수정·배정 가능. FC/스태프는 조회만 — SCR-C010 권한표
  const canManage = isSuperAdmin || isRoleAtLeast(role, 'fc');

  const [programs, setPrograms] = useState<ExerciseProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExerciseProgram | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState('전체');
  // 필터: 배정 회원 있는 프로그램만 보기
  const [onlyAssigned, setOnlyAssigned] = useState(false);
  const [assignments, setAssignments] = useState<Record<number, ProgramAssignment[]>>({});
  const [memberCandidates, setMemberCandidates] = useState<MemberCandidate[]>([]);
  const [assignTarget, setAssignTarget] = useState<ExerciseProgram | null>(null);
  const [memberSearch, setMemberSearch] = useState('');

  const fetchAssignments = async () => {
    const [{ data: assignmentData }, { data: memberData }] = await Promise.all([
      supabase
        .from('member_exercise_programs')
        .select('id, memberId, programId, status')
        .eq('branchId', branchId)
        .in('status', ['ACTIVE', 'active']),
      supabase
        .from('members')
        .select('id, name, phone')
        .eq('branchId', branchId)
        .neq('status', 'WITHDRAWN')
        .order('name', { ascending: true }),
    ]);

    const memberMap = new Map((memberData ?? []).map((member: any) => [Number(member.id), member]));
    const grouped: Record<number, ProgramAssignment[]> = {};
    (assignmentData ?? []).forEach((row: any) => {
      const programId = Number(row.programId);
      const member = memberMap.get(Number(row.memberId));
      grouped[programId] ??= [];
      grouped[programId].push({
        id: Number(row.id),
        memberId: Number(row.memberId),
        memberName: member?.name ?? '-',
        memberPhone: member?.phone ?? '-',
        status: String(row.status ?? 'ACTIVE'),
      });
    });

    setAssignments(grouped);
    setMemberCandidates(
      (memberData ?? []).map((member: any) => ({
        id: Number(member.id),
        name: String(member.name ?? '-'),
        phone: String(member.phone ?? '-'),
      }))
    );
  };

  const fetchPrograms = async () => {
    setIsLoading(true);
    const [data] = await Promise.all([
      getExercisePrograms(branchId),
      fetchAssignments(),
    ]);
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
      // 버그 수정: 기존 동작 목록을 그대로 불러와 수정 진입 시 유실되지 않도록 함
      exercises: program.exercises.length > 0
        ? program.exercises.map((e) => ({ ...e }))
        : [{ ...EMPTY_EXERCISE }],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('프로그램 이름을 입력해주세요.'); return; }
    const validExercises = form.exercises.filter(e => e.name.trim());
    // 명세: 동작 0개 저장 차단
    if (validExercises.length === 0) { toast.error('최소 1개 동작이 필요해요.'); return; }
    // 명세: 활성 프로그램명 중복 차단
    const dup = programs.some(p => p.name.trim() === form.name.trim() && p.id !== editTarget?.id);
    if (dup) { toast.error('이미 같은 이름의 프로그램이 있어요.'); return; }
    setIsSaving(true);

    const payload = {
      branchId,
      name: form.name.trim(),
      category: form.category || null,
      level: form.level || null,
      description: form.description || null,
      exercises: validExercises,
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
    await supabase.from('member_exercise_programs').delete().eq('programId', deleteTarget);
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

  // 회원 배정 (목업)
  const openAssign = (program: ExerciseProgram) => {
    if (!canManage) return;
    setMemberSearch('');
    setAssignTarget(program);
  };
  const addAssignment = async (member: MemberCandidate) => {
    if (!assignTarget) return;
    if ((assignments[assignTarget.id] ?? []).some((assignment) => assignment.memberId === member.id)) return;
    const assignedBy = Number((currentUser as { id?: number | string } | null)?.id ?? 0);
    try {
      await assignProgram(member.id, assignTarget.id, assignedBy, branchId);
      toast.success(`${member.name} 회원에게 배정했습니다.`);
      await fetchAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '회원 배정에 실패했습니다.');
    }
  };
  const removeAssignment = async (assignmentId: number) => {
    try {
      await unassignProgram(assignmentId);
      toast.success('회원 배정을 해제했습니다.');
      await fetchAssignments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '배정 해제에 실패했습니다.');
    }
  };
  const assignedCount = (programId: number) => (assignments[programId] ?? []).length;

  const filtered = programs.filter((p) => {
    if (filterCategory !== '전체' && p.category !== filterCategory) return false;
    if (onlyAssigned && assignedCount(p.id) === 0) return false;
    return true;
  });

  const assignCandidates = memberCandidates.filter(
    (member) =>
      !memberSearch ||
      member.name.includes(memberSearch) ||
      member.phone.replace(/\D/g, '').includes(memberSearch.replace(/\D/g, ''))
  );

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
      key: 'exercises', header: '동작 수', width: 80, align: 'center' as const,
      render: (_: unknown, row: ExerciseProgram) => <span className="text-[12px] tabular-nums">{row.exercises.length}개</span>,
    },
    {
      key: 'assigned', header: '배정 회원', width: 90, align: 'center' as const,
      render: (_: unknown, row: ExerciseProgram) => {
        const cnt = assignedCount(row.id);
        return cnt > 0
          ? <span className="text-[12px] font-semibold text-primary tabular-nums">{cnt}명</span>
          : <span className="text-[12px] text-content-tertiary">-</span>;
      },
    },
    {
      key: 'updatedAt', header: '수정일', width: 110,
      render: (_: unknown, row: ExerciseProgram) => {
        const d = row.updatedAt ?? row.createdAt;
        return <span className="text-[12px] text-content-tertiary tabular-nums">{d ? d.slice(0, 10) : '-'}</span>;
      },
    },
    {
      key: 'actions', header: '', width: 130, align: 'center' as const,
      render: (_: unknown, row: ExerciseProgram) => (
        <div className="flex items-center justify-center gap-xs">
          {canManage && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openAssign(row)} title="회원 배정">
                <UserPlus size={15} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => openEdit(row)} title="수정">
                <Edit2 size={15} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(row.id); setDeleteDialogOpen(true); }} title="삭제">
                <Trash2 size={15} />
              </Button>
            </>
          )}
          {!canManage && <span className="text-[11px] text-content-tertiary">조회 전용</span>}
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
          canManage ? (
            <Button variant="primary" size="sm" icon={<Plus size={16} />} onClick={openCreate}>
              프로그램 추가
            </Button>
          ) : null
        }
      />

      {/* 카테고리 필터 + 배정 회원 필터 */}
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
        <div className="w-px h-5 bg-line mx-xs" />
        <button
          onClick={() => setOnlyAssigned((v) => !v)}
          className={cn(
            'flex items-center gap-xs px-md py-xs rounded-button text-[12px] font-semibold transition-colors',
            onlyAssigned
              ? 'bg-primary text-surface'
              : 'bg-surface border border-line text-content-secondary hover:bg-surface-secondary'
          )}
        >
          <Users size={13} /> 배정 회원 있는 프로그램만
        </button>
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
                  <Select
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">난이도</label>
                  <Select
                    value={form.level}
                    onChange={(v) => setForm({ ...form, level: v as ProgramLevel })}
                    options={LEVELS.map(l => ({ value: l, label: l }))}
                  />
                </div>
              </div>

              {/* 설명 */}
              <div>
                <label className="text-[12px] font-semibold text-content-secondary mb-[4px] block">설명</label>
                <Textarea
                  rows={3}
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
              <Button variant="outline" fullWidth onClick={() => setModalOpen(false)}>취소</Button>
              <Button variant="primary" fullWidth loading={isSaving} disabled={isSaving} onClick={handleSave}>
                {isSaving ? '저장 중...' : (editTarget ? '수정 저장' : '등록')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 회원 배정 드로어 */}
      {assignTarget && (
        <div className="fixed inset-0 z-[9999] flex justify-end bg-black/40" onClick={() => setAssignTarget(null)}>
          <div className="w-full max-w-sm h-full bg-surface shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-line flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-content flex items-center gap-xs"><UserPlus size={16} /> 회원 배정</h3>
                <p className="text-[12px] text-content-secondary mt-0.5">{assignTarget.name}</p>
              </div>
              <button onClick={() => setAssignTarget(null)} className="p-1.5 rounded-md hover:bg-surface-secondary text-content-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="p-md border-b border-line">
              <p className="text-[12px] font-semibold text-content-secondary mb-xs">배정된 회원 ({(assignments[assignTarget.id] ?? []).length}명)</p>
              {(assignments[assignTarget.id] ?? []).length === 0 ? (
                <p className="text-[12px] text-content-tertiary">아직 배정된 회원이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-xs">
                  {(assignments[assignTarget.id] ?? []).map((assignment) => (
                    <span key={assignment.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-light text-primary text-[12px] font-medium">
                      {assignment.memberName}
                      <button onClick={() => removeAssignment(assignment.id)} className="hover:text-state-error"><X size={12} /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-md flex-1 overflow-y-auto">
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="회원 이름 검색..."
                className="w-full h-9 px-3 mb-sm rounded-lg border border-line text-[13px] focus:outline-none focus:border-primary"
              />
              {assignCandidates.length === 0 ? (
                <p className="text-[12px] text-content-tertiary text-center py-md">검색 결과가 없어요.</p>
              ) : (
                <ul className="space-y-xs">
                  {assignCandidates.map((member) => {
                    const already = (assignments[assignTarget.id] ?? []).some((assignment) => assignment.memberId === member.id);
                    return (
                      <li key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-secondary">
                        <span className="text-[13px] text-content">
                          {member.name}
                          <span className="ml-2 text-[11px] text-content-tertiary">{member.phone}</span>
                        </span>
                        <button
                          disabled={already}
                          onClick={() => addAssignment(member)}
                          className="text-[12px] font-semibold text-primary disabled:text-content-tertiary disabled:cursor-not-allowed"
                        >
                          {already ? '배정됨' : '배정'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialogOpen}
        title="운동 프로그램 삭제"
        description={
          deleteTarget !== null && assignedCount(deleteTarget) > 0
            ? `배정 회원 ${assignedCount(deleteTarget)}명(${(assignments[deleteTarget] ?? []).map((assignment) => assignment.memberName).join(', ')})이 있습니다. 삭제하면 배정이 해제되고 회원에게 안내됩니다. 계속하시겠습니까?`
            : '정말로 이 운동 프로그램을 삭제하시겠습니까?'
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </AppLayout>
  );
}
