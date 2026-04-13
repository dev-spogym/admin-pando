import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Users, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { LessonSchedule } from "@/api/endpoints/lessons";

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

const getBranchId = (): number => { if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem("branchId");
  return stored ? Number(stored) : 1;
};

/** Date를 "YYYY-MM-DD" 문자열로 변환 */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" 형식으로 시간 추출 */
function toTimeStr(iso: string): string {
  return iso.slice(11, 16);
}

/** 요일 이름 (짧은 형태) */
const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

// ─── 조인된 수업 일정 타입 ──────────────────────────────────────────────────

interface ScheduleWithLesson extends LessonSchedule {
  lessonName: string;
  instructorName: string;
  color: string;
}

// ─── 미니 캘린더 컴포넌트 ──────────────────────────────────────────────────

interface MiniCalendarProps {
  selected: Date;
  onSelect: (d: Date) => void;
}

const MiniCalendar = ({ selected, onSelect }: MiniCalendarProps) => {
  const [viewYear, setViewYear]   = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  // 해당 월의 1일 요일(0=일)과 총 일수
  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const today = toDateStr(new Date());

  return (
    <div className="px-md pt-sm pb-xs">
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-xs">
        <button
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-tertiary transition-colors"
          onClick={prevMonth}
        >
          <ChevronLeft size={13} className="text-content-secondary" />
        </button>
        <span className="text-[12px] font-semibold text-content">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          className="flex h-6 w-6 items-center justify-center rounded hover:bg-surface-tertiary transition-colors"
          onClick={nextMonth}
        >
          <ChevronRight size={13} className="text-content-secondary" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-[2px]">
        {DAY_NAMES.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold py-[2px] ${
              i === 0 ? "text-state-error" : i === 6 ? "text-state-info" : "text-content-tertiary"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7 gap-y-[2px]">
        {/* 빈 셀 (1일 전 채우기) */}
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day     = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = toDateStr(selected) === dateStr;
          const isToday    = today === dateStr;
          const dow        = new Date(viewYear, viewMonth, day).getDay();

          return (
            <button
              key={day}
              className={`h-7 w-7 mx-auto rounded-full text-[12px] flex items-center justify-center transition-colors ${
                isSelected
                  ? "bg-primary text-white font-bold"
                  : isToday
                  ? "border border-primary text-primary font-semibold"
                  : dow === 0
                  ? "text-state-error hover:bg-surface-secondary"
                  : dow === 6
                  ? "text-state-info hover:bg-surface-secondary"
                  : "text-content hover:bg-surface-secondary"
              }`}
              onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── 메인 패널 ──────────────────────────────────────────────────────────────

const SchedulePanel = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedules, setSchedules]       = useState<ScheduleWithLesson[]>([]);
  const [loading, setLoading]           = useState(true);

  // 선택된 날짜의 일정 조회 (lesson_schedules + lessons 조인)
  const fetchSchedules = useCallback(async (date: Date) => {
    setLoading(true);
    try {
      const dateStr   = toDateStr(date);
      const startAt   = `${dateStr}T00:00:00`;
      const endAt     = `${dateStr}T23:59:59`;
      const branchId  = getBranchId();

      // lesson_schedules 조회
      const { data: scheduleData, error: scheduleError } = await supabase
        .from("lesson_schedules")
        .select("*")
        .eq("branchId", branchId)
        .gte("startAt", startAt)
        .lte("startAt", endAt)
        .order("startAt", { ascending: true });

      if (scheduleError) throw scheduleError;
      if (!scheduleData || scheduleData.length === 0) {
        setSchedules([]);
        return;
      }

      // lessons 조회 (lessonId 목록 기반)
      const lessonIds = [...new Set(scheduleData.map((s: LessonSchedule) => s.lessonId))];
      const { data: lessonData, error: lessonError } = await supabase
        .from("lessons")
        .select("id, name, instructorName, color")
        .in("id", lessonIds);

      if (lessonError) throw lessonError;

      type LessonPartial = { id: number; name: string; instructorName?: string; color?: string };
      const lessonMap = new Map<number, LessonPartial>(
        (lessonData ?? []).map((l: LessonPartial) => [l.id, l])
      );

      const merged: ScheduleWithLesson[] = scheduleData.map((s: LessonSchedule) => {
        const lesson = lessonMap.get(s.lessonId);
        return {
          ...s,
          lessonName:     lesson?.name ?? "수업명 없음",
          instructorName: lesson?.instructorName ?? "-",
          color:          lesson?.color ?? "#FF7F6E",
        };
      });

      setSchedules(merged);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules(selectedDate);
  }, [selectedDate, fetchSchedules]);

  const handleDateSelect = (d: Date) => {
    setSelectedDate(d);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-md py-sm border-b border-line shrink-0">
        <div className="flex items-center gap-sm">
          <Calendar size={16} className="text-primary" />
          <span className="text-[14px] font-semibold text-content">일정관리</span>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-content-tertiary hover:bg-surface-tertiary hover:text-content transition-colors"
          onClick={() => fetchSchedules(selectedDate)}
          title="새로고침"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* 미니 캘린더 */}
      <div className="border-b border-line shrink-0">
        <MiniCalendar selected={selectedDate} onSelect={handleDateSelect} />
      </div>

      {/* 선택 날짜 표시 */}
      <div className="px-md py-xs border-b border-line bg-surface-secondary shrink-0">
        <span className="text-[12px] font-semibold text-content">
          {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 ({DAY_NAMES[selectedDate.getDay()]})
        </span>
        <span className="ml-sm text-[11px] text-content-tertiary">
          {schedules.length}개 수업
        </span>
      </div>

      {/* 수업 일정 목록 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-md space-y-sm">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-sm animate-pulse">
                <div className="w-1 h-12 rounded bg-line shrink-0" />
                <div className="flex-1 space-y-1 py-1">
                  <div className="h-3 w-1/2 rounded bg-line" />
                  <div className="h-2 w-1/3 rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-sm text-content-tertiary py-xxl">
            <Calendar size={28} className="opacity-30" />
            <span className="text-[13px]">수업 일정이 없습니다</span>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {schedules.map((s) => (
              <li key={s.id} className="flex items-stretch gap-md px-md py-[10px] hover:bg-surface-secondary transition-colors">
                {/* 색상 인디케이터 바 */}
                <div
                  className="w-[3px] rounded-full shrink-0 self-stretch"
                  style={{ backgroundColor: s.color }}
                />
                <div className="flex flex-col gap-[3px] flex-1 min-w-0">
                  {/* 수업명 */}
                  <span className="text-[13px] font-semibold text-content truncate">
                    {s.lessonName}
                  </span>
                  {/* 시간 */}
                  <div className="flex items-center gap-xs text-[11px] text-content-secondary">
                    <Clock size={11} />
                    <span>
                      {toTimeStr(s.startAt)} ~ {toTimeStr(s.endAt)}
                    </span>
                  </div>
                  {/* 강사 + 예약/정원 */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-content-tertiary">{s.instructorName}</span>
                    <div className="flex items-center gap-xs text-[11px]">
                      <Users size={11} className="text-content-tertiary" />
                      <span
                        className={`font-medium ${
                          (s.currentCount ?? 0) >= (s.capacity ?? 0)
                            ? "text-state-error"
                            : "text-content-secondary"
                        }`}
                      >
                        {s.currentCount ?? 0}/{s.capacity ?? "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SchedulePanel;
