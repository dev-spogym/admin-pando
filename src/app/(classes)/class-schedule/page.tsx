'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Eye } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import Modal from "@/components/ui/Modal";
import Select from '@/components/ui/Select';
import SimpleTable from '@/components/common/SimpleTable';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { bulkCreateClasses } from '@/api/endpoints/classSchedule';

// 요일 목록 (0=일,1=월,...,6=토)
const WEEKDAYS = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
];

interface ClassTemplate {
  id: number;
  name: string;
  defaultCapacity: number;
  defaultDurationMin: number;
  color: string;
}

interface Staff {
  id: number;
  name: string;
}

interface PreviewRow {
  date: string;
  weekday: string;
  startTime: string;
  endTime: string;
  title: string;
  instructor: string;
  capacity: number;
  room: string;
}

const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

/** YYYY-MM-DD 형식 날짜 범위의 각 날짜 생성 */
const buildPreviewRows = (
  templateName: string,
  instructorName: string,
  weekdays: number[],
  startTime: string,
  endTime: string,
  periodStart: string,
  periodEnd: string,
  capacity: number,
  room: string
): PreviewRow[] => {
  if (!periodStart || !periodEnd || weekdays.length === 0) return [];
  const rows: PreviewRow[] = [];
  const [sy, sm, sd] = periodStart.split('-').map(Number);
  const [ey, em, ed] = periodEnd.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  if (start > end) return [];
  const cur = new Date(start);
  while (cur <= end) {
    if (weekdays.includes(cur.getDay())) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      rows.push({
        date: `${y}-${m}-${d}`,
        weekday: WEEKDAY_LABEL[cur.getDay()],
        startTime,
        endTime,
        title: templateName,
        instructor: instructorName || '-',
        capacity,
        room,
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return rows;
};

export default function ClassSchedule() {
  const branchId = getBranchId();

  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 폼 상태
  const [templateId, setTemplateId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [capacity, setCapacity] = useState('10');
  const [room, setRoom] = useState('');

  // 선택된 템플릿 정보
  const selectedTemplate = useMemo(
    () => templates.find((t) => String(t.id) === templateId) ?? null,
    [templates, templateId]
  );

  // 선택된 강사 이름
  const selectedInstructorName = useMemo(
    () => staffList.find((s) => String(s.id) === instructorId)?.name ?? '',
    [staffList, instructorId]
  );

  // 미리보기 행
  const previewRows = useMemo(() => {
    if (!showPreview) return [];
    return buildPreviewRows(
      selectedTemplate?.name ?? '',
      selectedInstructorName,
      weekdays,
      startTime,
      endTime,
      periodStart,
      periodEnd,
      Number(capacity) || 10,
      room
    );
  }, [showPreview, selectedTemplate, selectedInstructorName, weekdays, startTime, endTime, periodStart, periodEnd, capacity, room]);

  // 데이터 로드
  const fetchData = async () => {
    setLoading(true);
    const [tmplRes, staffRes] = await Promise.all([
      supabase.from('class_templates').select('id, name, default_capacity, default_duration, color').eq('branch_id', branchId).eq('is_active', true).order('name'),
      supabase.from('users').select('id, name').eq('branchId', branchId).in('role', ['ADMIN', 'MANAGER', 'STAFF']),
    ]);
    if (!tmplRes.error && tmplRes.data) setTemplates(tmplRes.data.map((r: Record<string, unknown>) => ({
      id: r.id as number,
      name: r.name as string,
      defaultCapacity: r.default_capacity as number,
      defaultDurationMin: r.default_duration as number,
      color: r.color as string,
    })));
    if (!staffRes.error && staffRes.data) setStaffList(staffRes.data as Staff[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 템플릿 선택 시 기본정원 자동 채우기
  useEffect(() => {
    if (selectedTemplate) {
      setCapacity(String(selectedTemplate.defaultCapacity));
    }
  }, [selectedTemplate]);

  // 요일 토글
  const toggleWeekday = (day: number) => {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // 일괄 생성
  const handleBulkCreate = async () => {
    if (!templateId) { toast.error('템플릿을 선택하세요.'); return; }
    if (weekdays.length === 0) { toast.error('요일을 하나 이상 선택하세요.'); return; }
    if (!periodStart || !periodEnd) { toast.error('적용 기간을 입력하세요.'); return; }
    if (periodStart > periodEnd) { toast.error('종료일은 시작일 이후여야 합니다.'); return; }
    if (!startTime || !endTime) { toast.error('시작/종료 시간을 입력하세요.'); return; }

    setConfirmOpen(true);
  };

  const handleBulkCreateConfirmed = async () => {
    setConfirmOpen(false);
    setCreating(true);
    try {
      const result = await bulkCreateClasses(
        {
          templateId: Number(templateId),
          templateName: selectedTemplate?.name ?? '',
          instructorId: instructorId ? Number(instructorId) : null,
          weekdays,
          startTime,
          endTime,
          periodStart,
          periodEnd,
          capacity: Number(capacity) || 10,
          room,
        },
        branchId
      );
      if (result.success) {
        toast.success(result.message ?? `${result.data}개 수업이 생성되었습니다.`);
        setShowPreview(false);
      } else {
        toast.error(result.message ?? '생성에 실패했습니다.');
      }
    } catch {
      toast.error('수업 생성에 실패했습니다.');
    }
    setCreating(false);
  };

  return (
    <AppLayout>
      <PageHeader
        title="시간표 일괄 등록"
        description="그룹수업 템플릿을 선택하고 요일·기간을 설정해 수업을 일괄 생성합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* 폼 영역 */}
        <div className="bg-surface border border-line rounded-xl p-lg flex flex-col gap-md">
          <h3 className="text-[14px] font-semibold text-content">수업 설정</h3>

          {/* 템플릿 선택 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              수업 템플릿 <span className="text-state-error">*</span>
            </label>
            <Select
              value={templateId}
              onChange={(v) => setTemplateId(v)}
              disabled={loading}
              options={[
                { value: '', label: '템플릿 선택' },
                ...templates.map((t) => ({ value: String(t.id), label: `${t.name} (${t.defaultDurationMin}분 / 정원 ${t.defaultCapacity}명)` })),
              ]}
            />
          </div>

          {/* 담당 강사 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">담당 강사</label>
            <Select
              value={instructorId}
              onChange={(v) => setInstructorId(v)}
              disabled={loading}
              options={[
                { value: '', label: '강사 선택 (선택사항)' },
                ...staffList.map((s) => ({ value: String(s.id), label: s.name })),
              ]}
            />
          </div>

          {/* 요일 선택 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              요일 <span className="text-state-error">*</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAYS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  className={`w-9 h-9 rounded-full text-[13px] font-medium border transition-colors ${
                    weekdays.includes(w.value)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-content-secondary border-line hover:border-primary'
                  }`}
                  onClick={() => toggleWeekday(w.value)}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* 시작/종료 시간 */}
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="시작 시간 *"
              type="time"
              size="sm"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <Input
              label="종료 시간 *"
              type="time"
              size="sm"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          {/* 적용 기간 */}
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="시작일 *"
              type="date"
              size="sm"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
            <Input
              label="종료일 *"
              type="date"
              size="sm"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>

          {/* 정원 / 장소 */}
          <div className="grid grid-cols-2 gap-md">
            <Input
              label="정원 (명)"
              type="number"
              size="sm"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
            <Input
              label="장소/룸"
              type="text"
              size="sm"
              placeholder="예: 1스튜디오"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-sm pt-sm">
            <button
              className="flex items-center gap-1.5 px-4 py-2 border border-line text-[13px] text-content-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye size={14} />
              {showPreview ? '미리보기 숨기기' : '미리보기'}
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              onClick={handleBulkCreate}
              disabled={creating}
            >
              <CalendarPlus size={14} />
              {creating ? '생성 중...' : '일괄 생성'}
            </button>
          </div>
        </div>

        {/* 미리보기 영역 */}
        <div className="bg-surface border border-line rounded-xl p-lg flex flex-col gap-md">
          <h3 className="text-[14px] font-semibold text-content">
            생성 예정 수업 미리보기
            {showPreview && previewRows.length > 0 && (
              <span className="ml-2 text-primary font-bold">{previewRows.length}개</span>
            )}
          </h3>

          {!showPreview ? (
            <p className="text-[13px] text-content-tertiary py-xl text-center">
              미리보기 버튼을 눌러 생성될 수업 목록을 확인하세요.
            </p>
          ) : previewRows.length === 0 ? (
            <p className="text-[13px] text-content-tertiary py-xl text-center">
              요일과 기간을 설정하면 미리보기가 표시됩니다.
            </p>
          ) : (
            <div className="overflow-y-auto max-h-[480px]">
              <SimpleTable
                columns={[
                  { key: 'date', header: '날짜' },
                  { key: 'weekday', header: '요일' },
                  { key: 'time', header: '시간', render: (_: unknown, row: PreviewRow) => `${row.startTime} ~ ${row.endTime}` },
                  { key: 'instructor', header: '강사' },
                  { key: 'capacity', header: '정원', align: 'center', render: (v: number) => `${v}명` },
                ]}
                data={previewRows}
                stickyHeader
              />
            </div>
          )}
        </div>
      </div>

      {/* 일괄 생성 확인 모달 */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="일괄 생성 확인"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setConfirmOpen(false)}
            >
              취소
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
              onClick={handleBulkCreateConfirmed}
            >
              생성
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-md">
          <p className="text-[14px] text-content">
            <span className="font-bold text-primary">{previewRows.length}개</span>의 수업이 생성됩니다. 진행하시겠습니까?
          </p>
          {previewRows.length > 0 && (
            <div className="max-h-60 overflow-y-auto">
              <SimpleTable
                columns={[
                  { key: 'date', header: '날짜' },
                  { key: 'weekday', header: '요일' },
                  { key: 'time', header: '시간', render: (_: unknown, row: PreviewRow) => `${row.startTime} ~ ${row.endTime}` },
                  { key: 'instructor', header: '강사' },
                ]}
                data={previewRows.slice(0, 20)}
                stickyHeader
              />
              {previewRows.length > 20 && (
                <p className="px-3 py-2 text-center text-[11px] text-content-tertiary">
                  외 {previewRows.length - 20}개 더...
                </p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
