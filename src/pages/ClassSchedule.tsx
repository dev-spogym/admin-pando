import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { CalendarPlus, Eye } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
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
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
    if (!startTime || !endTime) { toast.error('시작/종료 시간을 입력하세요.'); return; }

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
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loading}
            >
              <option value="">템플릿 선택</option>
              {templates.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.defaultDurationMin}분 / 정원 {t.defaultCapacity}명)
                </option>
              ))}
            </select>
          </div>

          {/* 담당 강사 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">담당 강사</label>
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
              disabled={loading}
            >
              <option value="">강사 선택 (선택사항)</option>
              {staffList.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.name}</option>
              ))}
            </select>
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
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">
                시작 시간 <span className="text-state-error">*</span>
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">
                종료 시간 <span className="text-state-error">*</span>
              </label>
              <input
                type="time"
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* 적용 기간 */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">
                시작일 <span className="text-state-error">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">
                종료일 <span className="text-state-error">*</span>
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>

          {/* 정원 / 장소 */}
          <div className="grid grid-cols-2 gap-md">
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">정원 (명)</label>
              <input
                type="number"
                min={1}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">장소/룸</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
                placeholder="예: 1스튜디오"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
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
            <div className="overflow-y-auto max-h-[480px] rounded-lg border border-line">
              <table className="w-full text-[12px]">
                <thead className="bg-surface-secondary sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-content-secondary font-medium">날짜</th>
                    <th className="px-3 py-2 text-left text-content-secondary font-medium">요일</th>
                    <th className="px-3 py-2 text-left text-content-secondary font-medium">시간</th>
                    <th className="px-3 py-2 text-left text-content-secondary font-medium">강사</th>
                    <th className="px-3 py-2 text-center text-content-secondary font-medium">정원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {previewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-secondary/50">
                      <td className="px-3 py-2 text-content">{row.date}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.weekday}</td>
                      <td className="px-3 py-2 text-content">{row.startTime} ~ {row.endTime}</td>
                      <td className="px-3 py-2 text-content-secondary">{row.instructor}</td>
                      <td className="px-3 py-2 text-center text-content">{row.capacity}명</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
