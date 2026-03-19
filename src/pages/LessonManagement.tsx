import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Plus, Edit2, Trash2, BookOpen, Users, Clock, CalendarCheck,
  CheckSquare, Check, X, Pen, AlertTriangle, Eye, Settings2, Shield,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import SignaturePad from '@/components/SignaturePad';
import { supabase } from '@/lib/supabase';
import { bulkUpdateClasses, bulkDeleteClasses } from '@/api/endpoints/classSchedule';

// ─── 수업 상태 설정 ────────────────────────────────────────────
type LessonStatus = 'scheduled' | 'in_progress' | 'completed' | 'no_show' | 'cancelled';

const LESSON_STATUS_CONFIG: Record<LessonStatus, { bg: string; text: string; label: string; variant: 'info' | 'peach' | 'mint' | 'success' | 'default' | 'error' }> = {
  scheduled:   { bg: 'bg-blue-100',   text: 'text-blue-700',   label: '예정',   variant: 'info' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '진행중', variant: 'peach' },
  completed:   { bg: 'bg-green-100',  text: 'text-green-700',  label: '완료',   variant: 'mint' },
  no_show:     { bg: 'bg-red-100',    text: 'text-red-700',    label: '노쇼',   variant: 'error' },
  cancelled:   { bg: 'bg-gray-100',   text: 'text-gray-500',   label: '취소',   variant: 'default' },
};

// 수업 유형 라벨
const LESSON_TYPE_LABEL: Record<string, string> = {
  GROUP: '그룹',
  PERSONAL: '1:1',
  SEMI: '세미',
};

const LESSON_TYPE_VARIANT: Record<string, 'info' | 'peach' | 'mint'> = {
  GROUP: 'info',
  PERSONAL: 'peach',
  SEMI: 'mint',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
};

const STATUS_VARIANT: Record<string, 'success' | 'default'> = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6',
];

// ─── 타입 정의 ────────────────────────────────────────────────
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

// classes 테이블 행 (수업 기록)
interface ClassRecord {
  id: number;
  title: string;
  type: string;
  staffId: number;
  staffName: string;
  room: string | null;
  startTime: string;
  endTime: string;
  capacity: number;
  booked: number;
  branchId: number;
  lesson_status: LessonStatus;
  signature_url: string | null;
  cancel_deadline_hours: number;
  completed_at: string | null;
  signature_at: string | null;
  member_id: number | null;
  member_name: string | null;
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

// ─── 수업 상태 배지 컴포넌트 ──────────────────────────────────
function LessonStatusBadge({ status }: { status: LessonStatus }) {
  const cfg = LESSON_STATUS_CONFIG[status] ?? LESSON_STATUS_CONFIG.scheduled;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ─── 날짜/시간 포맷 헬퍼 ──────────────────────────────────────
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function LessonManagement() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 체크박스 다중 선택
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 수업 등록/수정 모달
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

  // ── 수업 기록(classes) 상세 모달 ──────────────────────────────
  const [classRecords, setClassRecords] = useState<ClassRecord[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [classDetailOpen, setClassDetailOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);

  // 서명 모달
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signSaving, setSignSaving] = useState(false);

  // 서명 이미지 뷰어
  const [signViewOpen, setSignViewOpen] = useState(false);

  // ── 노쇼/취소 정책 설정 ───────────────────────────────────────
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState('3');
  const [noShowDeductsSession, setNoShowDeductsSession] = useState(true);
  const [autoCompleteHours, setAutoCompleteHours] = useState('24');
  const [lateCancelPenalty, setLateCancelPenalty] = useState(true);
  const [maxNoShowCount, setMaxNoShowCount] = useState('3');

  // ── 수업 목록 조회 ────────────────────────────────────────────
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

  // 강사 목록 조회
  const fetchStaff = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, name')
      .eq('branchId', branchId)
      .in('role', ['fc', 'staff', 'manager', 'owner', 'primary']);
    if (data) setStaffList(data);
  };

  // classes 테이블에서 수업 기록 조회
  const fetchClassRecords = async () => {
    setClassLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('branchId', branchId)
      .order('startTime', { ascending: false })
      .limit(100);
    if (!error && data) {
      setClassRecords(
        data.map((c: any) => ({
          ...c,
          lesson_status: c.lesson_status ?? 'scheduled',
        }))
      );
    }
    setClassLoading(false);
  };

  // ── 노쇼/취소 정책 로드 ──────────────────────────────────────
  const fetchPolicy = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('branchId', branchId)
      .eq('key', 'lesson_policy')
      .single();
    if (data?.value) {
      try {
        const policy = JSON.parse(data.value);
        setCancelDeadlineHours(policy.cancelDeadlineHours?.toString() ?? '3');
        setNoShowDeductsSession(policy.noShowDeductsSession ?? true);
        setAutoCompleteHours(policy.autoCompleteHours?.toString() ?? '24');
        setLateCancelPenalty(policy.lateCancelPenalty ?? true);
        setMaxNoShowCount(policy.maxNoShowCount?.toString() ?? '3');
      } catch { /* 파싱 실패 시 기본값 유지 */ }
    }
  };

  const savePolicy = async () => {
    setPolicySaving(true);
    const policyValue = JSON.stringify({
      cancelDeadlineHours: Number(cancelDeadlineHours) || 3,
      noShowDeductsSession,
      autoCompleteHours: Number(autoCompleteHours) || 24,
      lateCancelPenalty,
      maxNoShowCount: Number(maxNoShowCount) || 3,
    });

    // upsert: 있으면 업데이트, 없으면 생성
    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('branchId', branchId)
      .eq('key', 'lesson_policy')
      .single();

    if (existing) {
      await supabase
        .from('settings')
        .update({ value: policyValue })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('settings')
        .insert({ branchId, key: 'lesson_policy', value: policyValue });
    }
    setPolicySaving(false);
    toast.success('노쇼/취소 정책이 저장되었습니다.');
    setPolicyOpen(false);
  };

  useEffect(() => {
    fetchLessons();
    fetchStaff();
    fetchClassRecords();
    fetchPolicy();
  }, []);

  // ── 통계 집계 ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = lessons.length;
    const active = lessons.filter((l) => l.status === 'ACTIVE').length;
    const instructors = new Set(lessons.map((l) => l.instructorId).filter(Boolean)).size;
    const completedToday = classRecords.filter((c) => {
      if (c.lesson_status !== 'completed') return false;
      const today = new Date().toDateString();
      return new Date(c.startTime).toDateString() === today;
    }).length;
    return { total, active, instructors, completedToday };
  }, [lessons, classRecords]);

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

  // ── 선택 핸들러 ───────────────────────────────────────────────
  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((l) => l.id)));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── 수업 등록/수정 ────────────────────────────────────────────
  const openCreate = () => {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  };

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

  // ── 일괄 변경 ─────────────────────────────────────────────────
  const handleBulkSave = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setBulkSaving(true);
    try {
      if (bulkForm.action === 'cancel') {
        await bulkDeleteClasses(ids);
        toast.success(`${ids.length}개 수업이 취소되었습니다.`);
      } else {
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

  // ── 수업 기록 상태 변경 ───────────────────────────────────────
  const updateClassStatus = async (classId: number, newStatus: LessonStatus) => {
    const extra: Record<string, any> = { lesson_status: newStatus };
    if (newStatus === 'completed') extra.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('classes')
      .update(extra)
      .eq('id', classId);

    if (error) {
      toast.error('상태 변경에 실패했습니다.');
      return false;
    }
    toast.success(
      newStatus === 'in_progress' ? '수업이 시작되었습니다.' :
      newStatus === 'no_show' ? '노쇼 처리되었습니다.' :
      newStatus === 'cancelled' ? '수업이 취소되었습니다.' : '상태가 변경되었습니다.'
    );
    await fetchClassRecords();
    // 모달 내 선택 클래스 동기화
    setSelectedClass(prev => prev?.id === classId ? { ...prev, ...extra } : prev);
    return true;
  };

  // 수업 완료 처리 (서명 필수)
  const handleCompleteClass = (cls: ClassRecord) => {
    setSelectedClass(cls);
    setSignatureDataUrl(null);
    setSignModalOpen(true);
  };

  // 서명 확정 후 완료 처리
  const handleSignConfirm = async () => {
    if (!selectedClass || !signatureDataUrl) {
      toast.error('서명이 필요합니다.');
      return;
    }
    setSignSaving(true);

    try {
      // Supabase Storage에 서명 이미지 업로드
      const fileName = `signatures/class_${selectedClass.id}_${Date.now()}.png`;
      const blob = await (await fetch(signatureDataUrl)).blob();
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });

      let signatureUrl: string | null = null;
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('files').getPublicUrl(fileName);
        signatureUrl = urlData.publicUrl;
      }
      // 업로드 실패해도 완료 처리는 진행 (서명 URL만 null)

      const { error } = await supabase
        .from('classes')
        .update({
          lesson_status: 'completed',
          completed_at: new Date().toISOString(),
          signature_url: signatureUrl,
          signature_at: new Date().toISOString(),
        })
        .eq('id', selectedClass.id);

      if (error) {
        toast.error('수업 완료 처리에 실패했습니다.');
      } else {
        toast.success('수업이 완료 처리되었습니다.');
        setSignModalOpen(false);
        setClassDetailOpen(false);
        await fetchClassRecords();
      }
    } catch {
      toast.error('서명 저장 중 오류가 발생했습니다.');
    }
    setSignSaving(false);
  };

  // ── 테이블 컬럼 (수업 정의) ───────────────────────────────────
  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  const lessonColumns = [
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
    {
      key: 'name', header: '수업명', render: (v: string, row: Lesson) => (
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
          <span className="font-medium text-content">{v}</span>
        </div>
      ),
    },
    {
      key: 'type', header: '유형', render: (v: string) => (
        <StatusBadge variant={LESSON_TYPE_VARIANT[v] ?? 'default'} label={LESSON_TYPE_LABEL[v] ?? v} />
      ),
    },
    { key: 'instructorName', header: '강사명' },
    { key: 'capacity', header: '정원', render: (v: number) => `${v}명` },
    { key: 'durationMin', header: '시간(분)', render: (v: number) => `${v}분` },
    {
      key: 'status', header: '상태', render: (v: string) => (
        <StatusBadge variant={STATUS_VARIANT[v] ?? 'default'} label={STATUS_LABEL[v] ?? v} dot />
      ),
    },
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

  // ── 수업 기록 테이블 컬럼 ─────────────────────────────────────
  const classColumns = [
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    {
      key: 'title', header: '수업명', render: (v: string) => (
        <span className="font-medium text-content">{v}</span>
      ),
    },
    {
      key: 'startTime', header: '일시', render: (v: string) => (
        <span className="text-[12px] tabular-nums">{fmtDateTime(v)}</span>
      ),
    },
    { key: 'staffName', header: '강사' },
    { key: 'member_name', header: '회원', render: (v: string | null) => v ?? '-' },
    {
      key: 'lesson_status', header: '상태', render: (v: LessonStatus) => (
        <LessonStatusBadge status={v} />
      ),
    },
    {
      key: 'signature_url', header: '서명', render: (v: string | null) => (
        v
          ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-semibold">
              <Check size={12} /> 서명완료
            </span>
          : <span className="text-[11px] text-content-tertiary">대기</span>
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (_: any, row: ClassRecord) => (
        <button
          className="p-1.5 rounded-md text-content-secondary hover:text-primary hover:bg-primary-light transition-colors"
          onClick={() => { setSelectedClass(row); setClassDetailOpen(true); }}
          title="상세"
        >
          <Eye size={14} />
        </button>
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
              className="flex items-center gap-1.5 px-4 py-2 border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-tertiary transition-colors"
              onClick={() => setPolicyOpen(true)}
            >
              <Shield size={15} />
              노쇼/취소 정책
            </button>
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
        <StatCard label="오늘 완료" value={stats.completedToday} icon={<Clock />} variant="mint" />
      </div>

      {/* 수업 정의 목록 */}
      <DataTable
        title="수업 목록"
        columns={lessonColumns}
        data={filtered}
        loading={loading}
        emptyMessage="등록된 수업이 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="수업명, 강사명 검색..."
      />

      {/* 수업 기록 (classes 테이블) */}
      <div className="mt-lg">
        <DataTable
          title="수업 기록"
          columns={classColumns}
          data={classRecords}
          loading={classLoading}
          emptyMessage="수업 기록이 없습니다."
        />
      </div>

      {/* ── 수업 등록/수정 모달 ─────────────────────────────────── */}
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

      {/* ── 일괄 변경 모달 ──────────────────────────────────────── */}
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

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="block text-[12px] font-medium text-content-secondary mb-xs">시작 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                    value={bulkForm.startTime}
                    onChange={(e) => setBulkForm((f) => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-content-secondary mb-xs">종료 시간</label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                    value={bulkForm.endTime}
                    onChange={(e) => setBulkForm((f) => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>

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

      {/* ── 수업 기록 상세 모달 ──────────────────────────────────── */}
      <Modal
        isOpen={classDetailOpen}
        onClose={() => setClassDetailOpen(false)}
        title="수업 상세"
        size="md"
        footer={
          <button
            className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
            onClick={() => setClassDetailOpen(false)}
          >
            닫기
          </button>
        }
      >
        {selectedClass && (
          <div className="flex flex-col gap-md">
            {/* 수업 기본 정보 */}
            <div className="p-md bg-surface-secondary rounded-lg space-y-xs">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-content">{selectedClass.title}</span>
                <LessonStatusBadge status={selectedClass.lesson_status} />
              </div>
              <div className="grid grid-cols-2 gap-xs text-[12px] text-content-secondary">
                <span>강사: <strong className="text-content">{selectedClass.staffName}</strong></span>
                <span>회원: <strong className="text-content">{selectedClass.member_name ?? '-'}</strong></span>
                <span>시작: <strong className="text-content tabular-nums">{fmtDateTime(selectedClass.startTime)}</strong></span>
                <span>종료: <strong className="text-content tabular-nums">{fmtDateTime(selectedClass.endTime)}</strong></span>
                {selectedClass.room && (
                  <span>장소: <strong className="text-content">{selectedClass.room}</strong></span>
                )}
              </div>
            </div>

            {/* 상태 변경 버튼 */}
            {selectedClass.lesson_status !== 'completed' &&
             selectedClass.lesson_status !== 'no_show' &&
             selectedClass.lesson_status !== 'cancelled' && (
              <div className="space-y-xs">
                <p className="text-[12px] font-semibold text-content-secondary">상태 변경</p>
                <div className="flex flex-wrap gap-sm">
                  {selectedClass.lesson_status === 'scheduled' && (
                    <button
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-[13px] font-medium hover:bg-yellow-100 transition-colors"
                      onClick={async () => {
                        const ok = await updateClassStatus(selectedClass.id, 'in_progress');
                        if (ok) setSelectedClass(prev => prev ? { ...prev, lesson_status: 'in_progress' } : prev);
                      }}
                    >
                      <Clock size={14} />
                      수업 시작
                    </button>
                  )}
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-[13px] font-medium hover:bg-green-100 transition-colors"
                    onClick={() => handleCompleteClass(selectedClass)}
                  >
                    <Pen size={14} />
                    수업 완료 (서명)
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium hover:bg-red-100 transition-colors"
                    onClick={async () => {
                      const ok = await updateClassStatus(selectedClass.id, 'no_show');
                      if (ok) setSelectedClass(prev => prev ? { ...prev, lesson_status: 'no_show' } : prev);
                    }}
                  >
                    <AlertTriangle size={14} />
                    노쇼 처리
                  </button>
                  <button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-[13px] font-medium hover:bg-gray-100 transition-colors"
                    onClick={async () => {
                      const ok = await updateClassStatus(selectedClass.id, 'cancelled');
                      if (ok) setSelectedClass(prev => prev ? { ...prev, lesson_status: 'cancelled' } : prev);
                    }}
                  >
                    <X size={14} />
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 완료/노쇼 안내 */}
            {(selectedClass.lesson_status === 'completed' || selectedClass.lesson_status === 'no_show') && (
              <div className={`p-md rounded-lg border ${
                selectedClass.lesson_status === 'completed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-[13px] font-semibold ${
                  selectedClass.lesson_status === 'completed' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {selectedClass.lesson_status === 'completed' ? '수업 완료' : '노쇼 처리됨'}
                </p>
                {selectedClass.completed_at && (
                  <p className="text-[12px] text-content-secondary mt-xs">
                    처리 시각: {fmtDateTime(selectedClass.completed_at)}
                  </p>
                )}
              </div>
            )}

            {/* 서명 이미지 표시 */}
            {selectedClass.signature_url && (
              <div className="space-y-xs">
                <p className="text-[12px] font-semibold text-content-secondary flex items-center gap-1">
                  <Check size={12} className="text-green-600" />
                  서명 완료
                  {selectedClass.signature_at && (
                    <span className="font-normal text-content-tertiary ml-1">
                      ({fmtDateTime(selectedClass.signature_at)})
                    </span>
                  )}
                </p>
                <div
                  className="border border-line rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSignViewOpen(true)}
                >
                  <img
                    src={selectedClass.signature_url}
                    alt="서명"
                    className="w-full max-h-[120px] object-contain bg-white p-2"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── 서명 모달 ────────────────────────────────────────────── */}
      <Modal
        isOpen={signModalOpen}
        onClose={() => !signSaving && setSignModalOpen(false)}
        title="수업 완료 서명"
        size="lg"
        footer={
          <div className="flex justify-between items-center w-full">
            <p className="text-[12px] text-content-secondary flex items-center gap-1">
              <AlertTriangle size={12} className="text-yellow-500" />
              서명 없이는 완료 처리가 불가합니다.
            </p>
            <div className="flex gap-sm">
              <button
                className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
                onClick={() => setSignModalOpen(false)}
                disabled={signSaving}
              >
                취소
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                onClick={handleSignConfirm}
                disabled={!signatureDataUrl || signSaving}
              >
                {signSaving ? (
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                {signSaving ? '처리 중...' : '서명 확인 및 완료'}
              </button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-md">
          {selectedClass && (
            <div className="p-sm bg-surface-secondary rounded-lg text-[12px] text-content-secondary">
              <strong className="text-content">{selectedClass.title}</strong>
              {' · '}
              {fmtDateTime(selectedClass.startTime)}
              {selectedClass.member_name && ` · ${selectedClass.member_name}`}
            </div>
          )}
          <SignaturePad
            onSign={(dataUrl) => setSignatureDataUrl(dataUrl)}
            height={180}
          />
        </div>
      </Modal>

      {/* ── 서명 이미지 확대 뷰어 ────────────────────────────────── */}
      <Modal
        isOpen={signViewOpen}
        onClose={() => setSignViewOpen(false)}
        title="서명 확인"
        size="md"
        footer={
          <button
            className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
            onClick={() => setSignViewOpen(false)}
          >
            닫기
          </button>
        }
      >
        {selectedClass?.signature_url && (
          <img
            src={selectedClass.signature_url}
            alt="서명"
            className="w-full rounded-lg border border-line bg-white p-4 object-contain"
          />
        )}
      </Modal>

      {/* ── 삭제 확인 다이얼로그 ─────────────────────────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="수업 삭제"
        description="이 수업을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
        confirmLabel="삭제"
        variant="danger"
      />

      {/* ── 노쇼/취소 정책 설정 모달 ──────────────────────────────── */}
      <Modal
        isOpen={policyOpen}
        onClose={() => setPolicyOpen(false)}
        title="노쇼/취소 정책 설정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setPolicyOpen(false)}
              disabled={policySaving}
            >
              취소
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              onClick={savePolicy}
              disabled={policySaving}
            >
              {policySaving ? '저장 중...' : '정책 저장'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-lg">
          {/* 취소 마감 시간 */}
          <div className="p-md bg-surface-secondary rounded-xl border border-line space-y-md">
            <div className="flex items-center gap-sm">
              <Clock size={16} className="text-primary" />
              <h4 className="text-[14px] font-bold text-content">취소 마감 설정</h4>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-content">수업 시작 전 취소 마감</p>
                <p className="text-[11px] text-content-tertiary mt-xs">설정 시간 이후에는 취소 불가</p>
              </div>
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  min={0}
                  max={72}
                  value={cancelDeadlineHours}
                  onChange={e => setCancelDeadlineHours(e.target.value)}
                  className="w-[70px] px-sm py-[6px] border border-line rounded-lg text-[13px] text-center bg-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[12px] text-content-secondary">시간 전</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-content">마감 후 취소 시 패널티</p>
                <p className="text-[11px] text-content-tertiary mt-xs">마감 이후 취소하면 수업 진행으로 처리 (횟수 차감)</p>
              </div>
              <button
                type="button"
                onClick={() => setLateCancelPenalty(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${lateCancelPenalty ? 'bg-accent' : 'bg-line'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${lateCancelPenalty ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>

          {/* 노쇼 정책 */}
          <div className="p-md bg-surface-secondary rounded-xl border border-line space-y-md">
            <div className="flex items-center gap-sm">
              <AlertTriangle size={16} className="text-state-error" />
              <h4 className="text-[14px] font-bold text-content">노쇼 처리 정책</h4>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-content">노쇼 시 횟수 차감</p>
                <p className="text-[11px] text-content-tertiary mt-xs">노쇼 = 수업 진행으로 간주하여 세션 횟수 차감</p>
              </div>
              <button
                type="button"
                onClick={() => setNoShowDeductsSession(v => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${noShowDeductsSession ? 'bg-accent' : 'bg-line'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform ${noShowDeductsSession ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-content">연속 노쇼 경고 기준</p>
                <p className="text-[11px] text-content-tertiary mt-xs">연속 N회 노쇼 시 회원 메모에 경고 기록</p>
              </div>
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxNoShowCount}
                  onChange={e => setMaxNoShowCount(e.target.value)}
                  className="w-[70px] px-sm py-[6px] border border-line rounded-lg text-[13px] text-center bg-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[12px] text-content-secondary">회</span>
              </div>
            </div>
          </div>

          {/* 자동 완료 정책 */}
          <div className="p-md bg-surface-secondary rounded-xl border border-line space-y-md">
            <div className="flex items-center gap-sm">
              <Settings2 size={16} className="text-state-info" />
              <h4 className="text-[14px] font-bold text-content">자동 처리 정책</h4>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] text-content">미처리 수업 자동 완료</p>
                <p className="text-[11px] text-content-tertiary mt-xs">수업 종료 N시간 후에도 미처리 시 자동 완료 전환</p>
              </div>
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  min={1}
                  max={72}
                  value={autoCompleteHours}
                  onChange={e => setAutoCompleteHours(e.target.value)}
                  className="w-[70px] px-sm py-[6px] border border-line rounded-lg text-[13px] text-center bg-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[12px] text-content-secondary">시간 후</span>
              </div>
            </div>
          </div>

          {/* 정책 요약 */}
          <div className="p-sm bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[12px] text-blue-700 font-medium">현재 정책 요약</p>
            <ul className="mt-xs space-y-xs text-[11px] text-blue-600">
              <li>• 수업 {cancelDeadlineHours}시간 전까지 취소 가능</li>
              {lateCancelPenalty && <li>• 마감 후 취소 시 횟수 차감</li>}
              {noShowDeductsSession && <li>• 노쇼 시 세션 횟수 차감 (수업 진행으로 간주)</li>}
              <li>• {maxNoShowCount}회 연속 노쇼 시 경고</li>
              <li>• 수업 종료 {autoCompleteHours}시간 후 미처리 건 자동 완료</li>
            </ul>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
