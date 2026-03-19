import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, BookOpen, Users, Clock, CalendarCheck, CheckSquare } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import { bulkUpdateClasses, bulkDeleteClasses } from '@/api/endpoints/classSchedule';

// 수업 유형 라벨
const LESSON_TYPE_LABEL: Record<string, string> = {
  GROUP: '그룹',
  PERSONAL: '1:1',
  SEMI: '세미',
};

// 수업 유형 배지 variant
const LESSON_TYPE_VARIANT: Record<string, 'info' | 'peach' | 'mint'> = {
  GROUP: 'info',
  PERSONAL: 'peach',
  SEMI: 'mint',
};

// 상태 라벨
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

const STATUS_VARIANT: Record<string, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

// 색상 팔레트
const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6',
];

interface Lesson {
  id: number;
  name: string;
  type: string;
  instructorId: number | null;
  instructorName?: string;
  capacity: number;
  durationMin: number;
  color: string;
  status: string;
  branchId: number;
}

interface Staff {
  id: number;
  name: string;
}

interface LessonForm {
  name: string;
  type: string;
  instructorId: string;
  capacity: string;
  durationMin: string;
  color: string;
  status: string;
}

// 일괄 변경 폼
interface BulkForm {
  instructorId: string;
  startTime: string;
  endTime: string;
  room: string;
  action: 'update' | 'cancel';
}

const DEFAULT_FORM: LessonForm = {
  name: '',
  type: 'GROUP',
  instructorId: '',
  capacity: '10',
  durationMin: '60',
  color: '#6366f1',
  status: 'ACTIVE',
};

const DEFAULT_BULK_FORM: BulkForm = {
  instructorId: '',
  startTime: '',
  endTime: '',
  room: '',
  action: 'update',
};

export default function LessonManagement() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 체크박스 다중 선택
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Lesson | null>(null);
  const [form, setForm] = useState<LessonForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // 일괄 변경 모달
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkForm>(DEFAULT_BULK_FORM);
  const [bulkSaving, setBulkSaving] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 수업 목록 조회
  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lessons')
      .select('*, users(name)')
      .eq('branchId', branchId)
      .order('id');
    if (!error && data) {
      setLessons(
        data.map((l: any) => ({
          ...l,
          instructorName: l.users?.name ?? '-',
        }))
      );
    }
    setLoading(false);
  };

  // 강사 목록 조회 (users 테이블 staff 역할)
  const fetchStaff = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('branchId', branchId)
      .in('role', ['fc', 'staff', 'manager', 'owner', 'primary']);
    if (data) setStaffList(data);
  };

  useEffect(() => {
    fetchLessons();
    fetchStaff();
  }, []);

  // 통계 집계
  const stats = useMemo(() => {
    const total = lessons.length;
    const active = lessons.filter((l) => l.status === 'ACTIVE').length;
    const instructors = new Set(lessons.map((l) => l.instructorId).filter(Boolean)).size;
    return { total, active, instructors };
  }, [lessons]);

  // 검색 필터
  const filtered = useMemo(() => {
    const q = searchValue.toLowerCase();
    if (!q) return lessons;
    return lessons.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.instructorName ?? '').toLowerCase().includes(q)
    );
  }, [lessons, searchValue]);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  // 단건 선택/해제
  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 모달 열기 (등록)
  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

  // 모달 열기 (수정)
  const openEdit = (lesson: Lesson) => {
    setEditTarget(lesson);
    setForm({
      name: lesson.name,
      type: lesson.type,
      instructorId: lesson.instructorId ? String(lesson.instructorId) : '',
      capacity: String(lesson.capacity),
      durationMin: String(lesson.durationMin),
      color: lesson.color,
      status: lesson.status,
    });
    setModalOpen(true);
  };

  // 저장 (등록/수정)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('수업명을 입력하세요.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      instructorId: form.instructorId ? Number(form.instructorId) : null,
      capacity: Number(form.capacity) || 10,
      durationMin: Number(form.durationMin) || 60,
      color: form.color,
      status: form.status,
      branchId,
    };

    if (editTarget) {
      const { error } = await supabase
        .from('lessons')
        .update(payload)
        .eq('id', editTarget.id);
      if (error) {
        toast.error('수업 수정에 실패했습니다.');
      } else {
        toast.success('수업이 수정되었습니다.');
        setModalOpen(false);
        fetchLessons();
      }
    } else {
      const { error } = await supabase.from('lessons').insert(payload);
      if (error) {
        toast.error('수업 등록에 실패했습니다.');
      } else {
        toast.success('수업이 등록되었습니다.');
        setModalOpen(false);
        fetchLessons();
      }
    }
    setSaving(false);
  };

  // 삭제
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', deleteTargetId);
    if (error) {
      toast.error('수업 삭제에 실패했습니다.');
    } else {
      toast.success('수업이 삭제되었습니다.');
      fetchLessons();
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  // 일괄 변경 실행
  const handleBulkSave = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkSaving(true);

    try {
      if (bulkForm.action === 'cancel') {
        // 일괄 취소 → classes 테이블의 선택된 수업 삭제
        await bulkDeleteClasses(ids);
        toast.success(`${ids.length}개 수업이 취소되었습니다.`);
      } else {
        // 일괄 수정
        const updates: Record<string, any> = {};
        if (bulkForm.instructorId) updates.instructorId = Number(bulkForm.instructorId);
        if (bulkForm.startTime) updates.startTime = bulkForm.startTime;
        if (bulkForm.endTime) updates.endTime = bulkForm.endTime;
        if (bulkForm.room) updates.room = bulkForm.room;

        if (Object.keys(updates).length === 0) {
          toast.error('변경할 항목을 하나 이상 입력하세요.');
          setBulkSaving(false);
          return;
        }
        await bulkUpdateClasses(ids, updates);
        toast.success(`${ids.length}개 수업이 수정되었습니다.`);
      }

      setSelectedIds(new Set());
      setBulkModalOpen(false);
      fetchLessons();
    } catch {
      toast.error('일괄 변경에 실패했습니다.');
    }
    setBulkSaving(false);
  };

  // 테이블 컬럼 정의
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-line accent-primary cursor-pointer"
          checked={allSelected}
          onChange={handleSelectAll}
          title={allSelected ? '전체 해제' : '전체 선택'}
        />
      ),
      width: 40,
      render: (_: any, row: Lesson) => (
        <input
          type="checkbox"
          className="w-4 h-4 rounded border-line accent-primary cursor-pointer"
          checked={selectedIds.has(row.id)}
          onChange={() => handleToggleSelect(row.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    { key: 'name', header: '수업명', render: (v: string, row: Lesson) => (
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: row.color }}
        />
        <span className="font-medium text-content">{v}</span>
      </div>
    )},
    { key: 'type', header: '유형', render: (v: string) => (
      <StatusBadge variant={LESSON_TYPE_VARIANT[v] ?? 'default'} label={LESSON_TYPE_LABEL[v] ?? v} />
    )},
    { key: 'instructorName', header: '강사명' },
    { key: 'capacity', header: '정원', render: (v: number) => `${v}명` },
    { key: 'durationMin', header: '시간(분)', render: (v: number) => `${v}분` },
    { key: 'status', header: '상태', render: (v: string) => (
      <StatusBadge variant={STATUS_VARIANT[v] ?? 'default'} label={STATUS_LABEL[v] ?? v} dot />
    )},
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (_: any, row: Lesson) => (
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
        title="수업 관리"
        description="수업을 등록하고 강사를 배정합니다."
        actions={
          <div className="flex items-center gap-sm">
            {/* 선택된 수업 수 + 일괄 변경 버튼 */}
            {selectedIds.size > 0 && (
              <button
                className="flex items-center gap-1.5 px-4 py-2 border border-primary text-primary rounded-lg text-[13px] font-medium hover:bg-primary-light transition-colors"
                onClick={() => { setBulkForm(DEFAULT_BULK_FORM); setBulkModalOpen(true); }}
              >
                <CheckSquare size={15} />
                {selectedIds.size}개 선택 — 일괄 변경
              </button>
            )}
            <button
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
              onClick={openCreate}
            >
              <Plus size={15} />
              수업 등록
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="전체 수업" value={stats.total} icon={<BookOpen />} />
        <StatCard label="활성 수업" value={stats.active} icon={<CalendarCheck />} variant="mint" />
        <StatCard label="강사 수" value={stats.instructors} icon={<Users />} variant="peach" />
        <StatCard label="이번주 예약" value="-" icon={<Clock />} />
      </div>

      {/* 수업 목록 테이블 */}
      <DataTable
        title="수업 목록"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="등록된 수업이 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="수업명, 강사명 검색..."
      />

      {/* 수업 등록/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? '수업 수정' : '수업 등록'}
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
          {/* 수업명 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              수업명 <span className="text-state-error">*</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              placeholder="수업명 입력"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* 유형 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">유형</label>
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="GROUP">그룹</option>
              <option value="PERSONAL">1:1</option>
              <option value="SEMI">세미</option>
            </select>
          </div>

          {/* 강사 선택 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">강사</label>
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={form.instructorId}
              onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))}
            >
              <option value="">강사 선택</option>
              {staffList.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* 정원 / 시간 */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">정원 (명)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">시간 (분)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
              />
            </div>
          </div>

          {/* 색상 선택 */}
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

          {/* 상태 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">상태</label>
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* 일괄 변경 모달 */}
      <Modal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title={`일괄 변경 — ${selectedIds.size}개 선택됨`}
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setBulkModalOpen(false)}
              disabled={bulkSaving}
            >
              취소
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-white text-[13px] font-medium transition-colors disabled:opacity-50 ${
                bulkForm.action === 'cancel'
                  ? 'bg-state-error hover:bg-state-error/90'
                  : 'bg-primary hover:bg-primary/90'
              }`}
              onClick={handleBulkSave}
              disabled={bulkSaving}
            >
              {bulkSaving ? '처리 중...' : bulkForm.action === 'cancel' ? '일괄 취소' : '일괄 변경'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-md">
          {/* 작업 선택 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">작업</label>
            <div className="flex gap-sm">
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                  bulkForm.action === 'update'
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-line text-content-secondary hover:bg-surface-tertiary'
                }`}
                onClick={() => setBulkForm((f) => ({ ...f, action: 'update' }))}
              >
                수업 수정
              </button>
              <button
                type="button"
                className={`flex-1 py-2 rounded-lg border text-[13px] font-medium transition-colors ${
                  bulkForm.action === 'cancel'
                    ? 'border-state-error bg-red-50 text-state-error'
                    : 'border-line text-content-secondary hover:bg-surface-tertiary'
                }`}
                onClick={() => setBulkForm((f) => ({ ...f, action: 'cancel' }))}
              >
                수업 취소
              </button>
            </div>
          </div>

          {bulkForm.action === 'update' && (
            <>
              {/* 강사 변경 */}
              <div>
                <label className="block text-[12px] font-medium text-content-secondary mb-xs">강사 변경</label>
                <select
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                  value={bulkForm.instructorId}
                  onChange={(e) => setBulkForm((f) => ({ ...f, instructorId: e.target.value }))}
                >
                  <option value="">(변경 안 함)</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* 시간 변경 */}
              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[12px] font-medium text-content-secondary mb-xs">시작 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                    value={bulkForm.startTime}
                    onChange={(e) => setBulkForm((f) => ({ ...f, startTime: e.target.value }))}
                    placeholder="(변경 안 함)"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-content-secondary mb-xs">종료 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                    value={bulkForm.endTime}
                    onChange={(e) => setBulkForm((f) => ({ ...f, endTime: e.target.value }))}
                    placeholder="(변경 안 함)"
                  />
                </div>
              </div>

              {/* 장소 변경 */}
              <div>
                <label className="block text-[12px] font-medium text-content-secondary mb-xs">장소/룸 변경</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="(변경 안 함)"
                  value={bulkForm.room}
                  onChange={(e) => setBulkForm((f) => ({ ...f, room: e.target.value }))}
                />
              </div>
            </>
          )}

          {bulkForm.action === 'cancel' && (
            <div className="p-md bg-red-50 border border-red-200 rounded-lg">
              <p className="text-[13px] text-state-error font-medium">
                선택한 {selectedIds.size}개 수업을 취소합니다.
              </p>
              <p className="text-[12px] text-red-400 mt-xs">취소된 수업은 복구할 수 없습니다.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="수업 삭제"
        description="이 수업을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
      />
    </AppLayout>
  );
}
