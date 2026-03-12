import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Users,
  MapPin,
  Clock,
  MoreHorizontal,
  XCircle,
  Trash2,
  Settings2,
  AlertTriangle,
  Lock,
  Filter,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import { SearchFilter } from "@/components/SearchFilter";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";

/**
 * SCR-021: 수업/캘린더
 * UI-125 캘린더 뷰 (월/주/일), UI-126 일정 상세 모달
 */

// --- 하드코딩 유지 (DB 테이블 없음) ---
const ROOMS = [
  { id: "R1", name: "GX룸" },
  { id: "R2", name: "스피닝룸" },
  { id: "R3", name: "필라테스룸" },
  { id: "R4", name: "기구필라테스룸" },
  { id: "R5", name: "PT룸" },
];

const CLASS_TYPES = [
  { id: "T1", name: "그룹 필라테스", capacity: 14, room: "필라테스룸" },
  { id: "T2", name: "그룹 요가", capacity: 14, room: "요가룸(GX룸)" },
  { id: "T3", name: "그룹 스피닝", capacity: 21, room: "스피닝룸" },
  { id: "T4", name: "그룹 줌바", capacity: 16, room: "GX룸" },
  { id: "T5", name: "그룹 기구필라테스", capacity: 6, room: "기구필라테스룸" },
];

const PENALTY_DATA = [
  { id: 1, memberName: "홍길동", className: "그룹 요가", date: "2026-02-18", type: "노쇼", status: "벌점부여", points: 5 },
  { id: 2, memberName: "김철수", className: "그룹 필라테스", date: "2026-02-17", type: "당일취소", status: "경고", points: 2 },
];

// 요일 이름 배열
const DAY_NAMES_KO = ["일", "월", "화", "수", "목", "금", "토"];

type EventType = "PT" | "GX" | "개인레슨" | "기타";

interface ScheduleEvent {
  id: string;
  title: string;
  instructor: string;
  instructorId: string;
  start: string;
  end: string;
  room: string;
  capacity: number;
  currentCount: number;
  status: "예약" | "완료" | "취소";
  type: EventType;
  // FN-034: 예약 오픈 설정
  maxCapacity?: number;
  currentReservations?: number;
  reservationDeadline?: string;
  // FN-037: 좌석 설정 (rows x cols)
  seatRows?: number;
  seatCols?: number;
  reservedSeats?: number[];
}

interface Instructor {
  id: string;
  name: string;
  type: string;
}

interface ClassManagement {
  id: number;
  name: string;
  type: string;
  instructor: string;
  room: string;
  schedule: string;
  status: string;
}

// --- 수업 유형별 색상 (시맨틱 토큰) ---
const EVENT_TYPE_COLORS: Record<EventType, { bg: string; border: string; text: string; light: string }> = {
  PT:       { bg: "bg-primary/10",      border: "border-primary",      text: "text-primary",       light: "bg-primary/5" },
  GX:       { bg: "bg-state-info/10",   border: "border-state-info",   text: "text-state-info",    light: "bg-state-info/5" },
  개인레슨: { bg: "bg-state-success/10",border: "border-state-success",text: "text-state-success", light: "bg-state-success/5" },
  기타:     { bg: "bg-surface-tertiary",border: "border-line",         text: "text-content-secondary", light: "bg-surface-secondary" },
};

// --- 트레이너별 색상 ---
const TRAINER_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  "1": { bg: "bg-rose-50",    border: "border-rose-400",   text: "text-rose-700",   light: "bg-rose-50" },
  "2": { bg: "bg-violet-50",  border: "border-violet-400", text: "text-violet-700", light: "bg-violet-50" },
  "3": { bg: "bg-sky-50",     border: "border-sky-400",    text: "text-sky-700",    light: "bg-sky-50" },
  "4": { bg: "bg-amber-50",   border: "border-amber-400",  text: "text-amber-700",  light: "bg-amber-50" },
  "5": { bg: "bg-emerald-50", border: "border-emerald-400",text: "text-emerald-700",light: "bg-emerald-50" },
};
const DEFAULT_COLOR = { bg: "bg-surface-secondary", border: "border-line", text: "text-content-secondary", light: "bg-surface-secondary" };

// --- 수업 편집 가능 여부 체크 ---
function isEventEditable(startStr: string): { editable: boolean; reason: string } {
  const now = new Date();
  const start = new Date(startStr);
  if (start < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    return { editable: false, reason: "과거 일정은 수정할 수 없습니다." };
  }
  if (start < now) {
    return { editable: false, reason: "이미 시작된 수업은 수정할 수 없습니다." };
  }
  const twoHoursBefore = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  if (now >= twoHoursBefore) {
    return { editable: false, reason: "수업 시작 2시간 전까지만 수정할 수 있습니다." };
  }
  return { editable: true, reason: "" };
}

// --- 날짜를 YYYY-MM-DD 문자열로 변환 ---
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// --- selectedDate 기준 해당 주의 일요일~토요일 배열 반환 ---
function getWeekDays(date: Date): Date[] {
  const day = date.getDay(); // 0=일, 6=토
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

// --- 상단 날짜 범위 텍스트 포맷 ---
function formatDateRange(view: "month" | "week" | "day", date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (view === "month") {
    return `${y}년 ${m}월`;
  }
  if (view === "week") {
    const weekDays = getWeekDays(date);
    const start = weekDays[0];
    const end = weekDays[6];
    return `${toDateStr(start)} ~ ${toDateStr(end)}`;
  }
  // 일 뷰
  return `${toDateStr(date)} (${DAY_NAMES_KO[date.getDay()]})`;
}

// --- 월 뷰 캘린더 그리드 ---
const MonthView = ({
  events,
  selectedDate,
  onEventClick,
}: {
  events: ScheduleEvent[];
  selectedDate: Date;
  onEventClick: (e: ScheduleEvent) => void;
}) => {
  // selectedDate에서 년/월 동적 추출
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth(); // 0-indexed

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  const getEventsForDay = (day: number | null) => {
    if (!day) return [];
    // 현재 뷰의 년/월/일 기준 날짜 문자열 생성
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.start.startsWith(dateStr));
  };

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-line bg-surface-secondary/50">
        {["일", "월", "화", "수", "목", "금", "토"].map(d => (
          <div key={d} className="py-sm text-center text-[12px] font-semibold text-content-secondary">{d}</div>
        ))}
      </div>
      {/* 날짜 그리드 7xN */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((day, di) => {
            const dayEvents = getEventsForDay(day);
            // 오늘 여부: 년/월/일 모두 비교
            const isToday =
              day !== null &&
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <div
                key={di}
                className={cn(
                  "min-h-[96px] p-xs border-r border-line last:border-r-0 hover:bg-surface-secondary/30 transition-colors",
                  !day && "bg-surface-tertiary/30"
                )}
              >
                {day && (
                  <>
                    <span className={cn(
                      "text-[12px] font-bold inline-flex w-6 h-6 items-center justify-center rounded-full",
                      isToday ? "bg-primary text-white" : "text-content"
                    )}>{day}</span>
                    <div className="mt-xs space-y-[2px]">
                      {dayEvents.slice(0, 3).map(ev => {
                        const colors = EVENT_TYPE_COLORS[ev.type] ?? EVENT_TYPE_COLORS["기타"];
                        return (
                          <button
                            key={ev.id}
                            className={cn(
                              "w-full text-left px-xs py-[2px] rounded text-[10px] font-semibold truncate border-l-2 transition-opacity hover:opacity-80",
                              colors.bg, colors.border, colors.text
                            )}
                            onClick={() => onEventClick(ev)}
                          >
                            {new Date(ev.start).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} {ev.title}
                          </button>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-content-secondary pl-xs">+{dayEvents.length - 3}개</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// --- 주 뷰 ---
const WeekView = ({
  events,
  selectedDate,
  onEventClick,
}: {
  events: ScheduleEvent[];
  selectedDate: Date;
  onEventClick: (e: ScheduleEvent) => void;
}) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  // selectedDate 기준 해당 주의 날짜 배열 (일~토)
  const weekDays = getWeekDays(selectedDate);

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="grid grid-cols-8 border-b border-line bg-surface-secondary/30">
        <div className="p-sm border-r border-line text-center text-[11px] text-content-secondary font-semibold">시간</div>
        {weekDays.map((dayDate, idx) => {
          const today = new Date();
          const isToday =
            dayDate.getDate() === today.getDate() &&
            dayDate.getMonth() === today.getMonth() &&
            dayDate.getFullYear() === today.getFullYear();
          return (
            <div key={idx} className="p-sm border-r border-line last:border-r-0 text-center">
              <div className="text-[11px] text-content-secondary">{DAY_NAMES_KO[dayDate.getDay()]}</div>
              <div className={cn(
                "text-[13px] font-bold",
                isToday ? "text-primary" : "text-content"
              )}>
                {dayDate.getDate()}
              </div>
            </div>
          );
        })}
      </div>
      <div className="h-[560px] overflow-y-auto">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-line last:border-b-0">
            <div className="p-xs border-r border-line text-center text-[10px] text-content-secondary font-medium">
              {hour}:00
            </div>
            {weekDays.map((dayDate, dayIdx) => {
              const dayDateStr = toDateStr(dayDate);
              // 해당 날짜 + 해당 시간에 해당하는 이벤트 필터
              const dayEvents = events.filter(e => {
                const d = new Date(e.start);
                return (
                  e.start.startsWith(dayDateStr) &&
                  d.getHours() === hour
                );
              });
              return (
                <div key={dayIdx} className="p-xs border-r border-line last:border-r-0 min-h-[52px] hover:bg-primary/5 transition-colors cursor-pointer">
                  {dayEvents.map(ev => {
                    const colors = TRAINER_COLORS[ev.instructorId] ?? DEFAULT_COLOR;
                    return (
                      <div
                        key={ev.id}
                        className={cn("p-xs rounded text-[10px] mb-xs shadow-xs border-l-[3px] cursor-pointer hover:opacity-80 transition-opacity", colors.bg, colors.border, colors.text)}
                        onClick={() => onEventClick(ev)}
                      >
                        <div className="font-bold truncate">{ev.title}</div>
                        <div className="flex items-center gap-xs mt-[2px] opacity-80">
                          <Users size={8} />
                          <span>{ev.currentCount}/{ev.capacity}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 일 뷰 ---
const DayView = ({
  events,
  selectedDate,
  onEventClick,
}: {
  events: ScheduleEvent[];
  selectedDate: Date;
  onEventClick: (e: ScheduleEvent) => void;
}) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  // selectedDate 기준 날짜 문자열로 필터
  const dateStr = toDateStr(selectedDate);
  const todayEvents = events.filter(e => e.start.startsWith(dateStr));

  // 일 뷰 헤더 텍스트: "2026년 3월 11일 (수)" 형태
  const dayLabel = selectedDate.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) + ` (${DAY_NAMES_KO[selectedDate.getDay()]})`;

  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line bg-surface-secondary/30">
        <p className="text-[13px] font-bold text-content">{dayLabel}</p>
      </div>
      <div className="h-[560px] overflow-y-auto">
        {hours.map(hour => {
          const hourEvents = todayEvents.filter(e => new Date(e.start).getHours() === hour);
          return (
            <div key={hour} className="flex border-b border-line last:border-b-0 min-h-[52px]">
              <div className="w-16 flex-shrink-0 p-sm text-center text-[11px] text-content-secondary border-r border-line">
                {hour}:00
              </div>
              <div className="flex-1 p-xs flex gap-sm">
                {hourEvents.map(ev => {
                  const colors = EVENT_TYPE_COLORS[ev.type] ?? EVENT_TYPE_COLORS["기타"];
                  return (
                    <button
                      key={ev.id}
                      className={cn("flex-1 text-left p-sm rounded-lg border-l-[3px] cursor-pointer hover:opacity-80 transition-opacity", colors.bg, colors.border, colors.text)}
                      onClick={() => onEventClick(ev)}
                    >
                      <p className="text-[12px] font-bold">{ev.title}</p>
                      <p className="text-[11px] mt-[2px] opacity-70">
                        {new Date(ev.start).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}~
                        {new Date(ev.end).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-center gap-xs mt-xs text-[11px] opacity-70">
                        <Users size={10} /> {ev.currentCount}/{ev.capacity}명
                        <MapPin size={10} className="ml-xs" /> {ev.room}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- FN-037: 좌석 그리드 컴포넌트 ---
const SeatGrid = ({
  rows,
  cols,
  reservedSeats,
  onToggle,
}: {
  rows: number;
  cols: number;
  reservedSeats: number[];
  onToggle: (idx: number) => void;
}) => {
  const [selected, setSelected] = React.useState<number[]>([]);

  const handleClick = (idx: number) => {
    if (reservedSeats.includes(idx)) return; // 이미 예약된 좌석은 토글 불가
    setSelected(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
    onToggle(idx);
  };

  return (
    <div className="space-y-sm">
      <p className="text-[11px] text-content-secondary text-center">강단 / 스크린</p>
      <div
        className="grid gap-[6px] mx-auto w-fit"
        style={{ gridTemplateColumns: `repeat(${cols}, 2rem)` }}
      >
        {Array.from({ length: rows * cols }, (_, idx) => {
          const isReserved = reservedSeats.includes(idx);
          const isSelected = selected.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              title={`좌석 ${idx + 1}`}
              onClick={() => handleClick(idx)}
              className={cn(
                "w-8 h-8 rounded text-[10px] font-bold border transition-colors",
                isReserved
                  ? "bg-state-info/20 border-state-info text-state-info cursor-not-allowed"
                  : isSelected
                  ? "bg-state-warning/80 border-state-warning text-white"
                  : "bg-surface-tertiary border-line text-content-secondary hover:border-primary hover:text-primary"
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-md text-[11px] text-content-secondary mt-xs">
        <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded bg-state-info/20 border border-state-info inline-block" />예약됨</span>
        <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded bg-state-warning/80 border border-state-warning inline-block" />선택 중</span>
        <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded bg-surface-tertiary border border-line inline-block" />빈 좌석</span>
      </div>
    </div>
  );
};

// --- UI-126 일정 상세 모달 ---
const EventDetailModal = ({
  event,
  onClose,
  onEdit,
}: {
  event: ScheduleEvent;
  onClose: () => void;
  onEdit: () => void;
}) => {
  const { editable, reason } = isEventEditable(event.start);
  const colors = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS["기타"];
  const [showSeats, setShowSeats] = React.useState(false);
  const [toggledSeats, setToggledSeats] = React.useState<number[]>([]);

  const hasSeatGrid = (event.seatRows ?? 0) > 0 && (event.seatCols ?? 0) > 0;
  const reservedSeats = event.reservedSeats ?? [];

  const handleSeatToggle = (idx: number) => {
    setToggledSeats(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  // FN-034: 예약 현황 계산
  const maxCap = event.maxCapacity ?? event.capacity;
  const curRes = event.currentReservations ?? event.currentCount;
  const reservationRatio = maxCap > 0 ? Math.min((curRes / maxCap) * 100, 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className={cn("px-xl py-lg border-b border-line flex items-center justify-between", colors.light)}>
          <div className="flex items-center gap-sm">
            <div className={cn("w-3 h-3 rounded-full border-2", colors.border)} />
            <h2 className="text-[16px] font-bold text-content">{event.title}</h2>
            <StatusBadge
              variant={event.status === "완료" ? "success" : event.status === "취소" ? "error" : "info"}
              label={event.status}
            />
          </div>
          <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={onClose}>
            <XCircle className="text-content-secondary" size={20} />
          </button>
        </div>

        <div className="p-xl space-y-md">
          <div className="grid grid-cols-2 gap-md">
            <div className="flex items-center gap-sm text-[13px] text-content">
              <Users size={15} className="text-content-secondary" />
              <span>{event.instructor} 강사</span>
            </div>
            <div className="flex items-center gap-sm text-[13px] text-content">
              <MapPin size={15} className="text-content-secondary" />
              <span>{event.room}</span>
            </div>
            <div className="flex items-center gap-sm text-[13px] text-content">
              <Clock size={15} className="text-content-secondary" />
              <span>
                {new Date(event.start).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                {" ~ "}
                {new Date(event.end).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-sm text-[13px] text-content">
              <Users size={15} className="text-content-secondary" />
              <span>예약 {curRes} / {maxCap}명</span>
            </div>
          </div>

          {/* FN-034: 예약 현황 바 */}
          <div className="space-y-xs">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-content-secondary font-semibold">예약 현황</span>
              <span className={cn("font-bold", reservationRatio >= 100 ? "text-state-error" : reservationRatio >= 80 ? "text-state-warning" : "text-state-success")}>
                {curRes}/{maxCap}명 ({Math.round(reservationRatio)}%)
              </span>
            </div>
            <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", reservationRatio >= 100 ? "bg-state-error" : reservationRatio >= 80 ? "bg-state-warning" : "bg-state-success")}
                style={{ width: `${reservationRatio}%` }}
              />
            </div>
            {event.reservationDeadline && (
              <p className="text-[11px] text-content-secondary">
                예약 마감: {event.reservationDeadline}
              </p>
            )}
          </div>

          {/* 날짜 */}
          <div className="flex items-center gap-sm text-[13px] text-content">
            <CalendarIcon size={15} className="text-content-secondary" />
            <span>{new Date(event.start).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>

          {/* 수업 유형 */}
          <div className={cn("inline-flex items-center gap-xs px-sm py-xs rounded-md text-[12px] font-semibold border", colors.bg, colors.text, colors.border)}>
            {event.type} 수업
          </div>

          {/* FN-037: 좌석 그리드 토글 */}
          {hasSeatGrid && (
            <div className="border border-line rounded-xl overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-md py-sm bg-surface-secondary hover:bg-surface-tertiary transition-colors text-[13px] font-semibold text-content"
                onClick={() => setShowSeats(v => !v)}
              >
                <span>좌석 배치도 ({reservedSeats.length + toggledSeats.filter(s => !reservedSeats.includes(s)).length}/{(event.seatRows ?? 0) * (event.seatCols ?? 0)}석 예약)</span>
                <span className="text-content-secondary text-[11px]">{showSeats ? "접기" : "펼치기"}</span>
              </button>
              {showSeats && (
                <div className="p-lg">
                  <SeatGrid
                    rows={event.seatRows ?? 4}
                    cols={event.seatCols ?? 5}
                    reservedSeats={reservedSeats}
                    onToggle={handleSeatToggle}
                  />
                </div>
              )}
            </div>
          )}

          {!editable && (
            <div className="flex items-start gap-sm p-md bg-surface-secondary rounded-lg border border-line">
              <Lock size={15} className="text-content-secondary mt-[2px] flex-shrink-0" />
              <p className="text-[12px] text-content-secondary">{reason}</p>
            </div>
          )}
        </div>

        <div className="px-xl py-lg border-t border-line flex items-center justify-end gap-md">
          <button
            className="px-lg py-sm rounded-lg text-[12px] font-semibold text-state-error border border-state-error/20 hover:bg-state-error/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!editable}
          >
            <Trash2 size={13} className="inline mr-xs" />
            삭제
          </button>
          <button
            className="px-xl py-sm rounded-lg bg-primary text-white text-[12px] font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!editable}
            onClick={onEdit}
          >
            수정
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 트레이너 범례 ---
const TrainerLegend = ({ instructors }: { instructors: Instructor[] }) => (
  <div className="flex flex-wrap items-center gap-sm">
    {instructors.map(inst => {
      const colors = TRAINER_COLORS[inst.id] ?? DEFAULT_COLOR;
      return (
        <div key={inst.id} className="flex items-center gap-xs">
          <div className={cn("w-3 h-3 rounded-sm border-l-[3px]", colors.border)} />
          <span className="text-[12px] text-content-secondary">{inst.name}</span>
        </div>
      );
    })}
  </div>
);

// --- 수업 유형 범례 ---
const EventTypeLegend = () => (
  <div className="flex flex-wrap items-center gap-sm">
    {(Object.entries(EVENT_TYPE_COLORS) as [EventType, typeof EVENT_TYPE_COLORS[EventType]][]).map(([type, colors]) => (
      <div key={type} className="flex items-center gap-xs">
        <div className={cn("w-3 h-3 rounded-sm border-l-[3px]", colors.border)} />
        <span className="text-[12px] text-content-secondary">{type}</span>
      </div>
    ))}
  </div>
);

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [calendarView, setCalendarView] = useState<"month" | "week" | "day">("month");
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");

  // --- 선택된 날짜: 오늘로 초기화 ---
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  // --- 수업 등록 폼 상태 ---
  const [formTemplate, setFormTemplate] = useState("");
  const [formName, setFormName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formType, setFormType] = useState("그룹 수업");
  const [formCapacity, setFormCapacity] = useState(14);
  const [formInstructor, setFormInstructor] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formRoom, setFormRoom] = useState(ROOMS[0].name);
  const [formMemo, setFormMemo] = useState("");
  // 반복 설정 요일 토글 상태 (월~일, 인덱스 0=월 ... 6=일)
  const [selectedDays, setSelectedDays] = useState<boolean[]>(Array(7).fill(false));

  // --- FN-034: 예약 오픈 설정 폼 상태 ---
  const [formMaxCapacity, setFormMaxCapacity] = useState(0);
  const [formReservationDeadline, setFormReservationDeadline] = useState("");
  // --- FN-037: 좌석 설정 폼 상태 ---
  const [formSeatRows, setFormSeatRows] = useState(0);
  const [formSeatCols, setFormSeatCols] = useState(0);

  // --- 로컬 상태에 추가된 수업 이벤트 ---
  const [localEvents, setLocalEvents] = useState<ScheduleEvent[]>([]);

  // --- Supabase 상태 ---
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classManagement, setClassManagement] = useState<ClassManagement[]>([]);
  const [loading, setLoading] = useState(true);

  const branchId = Number(localStorage.getItem("branchId") ?? 1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 트레이너 목록 (staff 테이블, role = '트레이너')
        const { data: staffData } = await supabase
          .from("staff")
          .select("id, name, type")
          .eq("role", "트레이너")
          .eq("branchId", branchId);

        if (staffData) {
          setInstructors(staffData.map((s: any) => ({
            id: String(s.id),
            name: s.name,
            type: s.type ?? "",
          })));
        }

        // 수업 일정 (classes 테이블)
        const { data: classData } = await supabase
          .from("classes")
          .select("id, title, type, staffId, staffName, room, startTime, endTime, capacity, booked, isRecurring, branchId, status")
          .eq("branchId", branchId);

        if (classData) {
          const mapped: ScheduleEvent[] = classData.map((c: any) => ({
            id: String(c.id),
            title: c.title ?? "",
            instructor: c.staffName ?? "",
            instructorId: String(c.staffId ?? ""),
            start: c.startTime ?? "",
            end: c.endTime ?? "",
            room: c.room ?? "",
            capacity: c.capacity ?? 0,
            currentCount: c.booked ?? 0,
            status: (c.status as "예약" | "완료" | "취소") ?? "예약",
            type: (c.type as EventType) ?? "기타",
          }));
          setEvents(mapped);
          setClassManagement(classData.map((c: any) => ({
            id: c.id,
            name: c.title ?? "",
            type: c.type ?? "",
            instructor: c.staffName ?? "",
            room: c.room ?? "",
            schedule: c.startTime ? c.startTime.split("T")[0] : "",
            status: c.status ?? "진행중",
          })));
        }
      } catch (err) {
        console.error("Calendar 데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  // 선택된 트레이너 필터 + 로컬 추가 이벤트 합산
  const allEvents = [...events, ...localEvents];
  const filteredEvents = selectedInstructor
    ? allEvents.filter(e => e.instructorId === selectedInstructor)
    : allEvents;

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  // --- 이전/다음/오늘 버튼 핸들러 ---
  const handlePrev = () => {
    const d = new Date(selectedDate);
    if (calendarView === "month") {
      d.setMonth(d.getMonth() - 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d);
  };

  const handleNext = () => {
    const d = new Date(selectedDate);
    if (calendarView === "month") {
      d.setMonth(d.getMonth() + 1);
    } else if (calendarView === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setDate(d.getDate() + 1);
    }
    setSelectedDate(d);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  // --- 반복 요일 토글 ---
  const toggleDay = (idx: number) => {
    setSelectedDays(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  // --- 수업 등록 폼 초기화 ---
  const resetForm = () => {
    setFormTemplate("");
    setFormName("");
    setFormType("그룹 수업");
    setFormCapacity(14);
    setFormInstructor(instructors[0]?.id ?? "");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormRoom(ROOMS[0].name);
    setFormMemo("");
    setSelectedDays(Array(7).fill(false));
    setFormMaxCapacity(0);
    setFormReservationDeadline("");
    setFormSeatRows(0);
    setFormSeatCols(0);
  };

  // --- 수업 등록 제출 핸들러 ---
  const handleAddClass = () => {
    // 중복 등록 방지
    if (isSaving) return;

    if (!formName.trim()) {
      toast.error("수업명을 입력해주세요.");
      return;
    }
    if (!formDate) {
      toast.error("수업 날짜를 선택해주세요.");
      return;
    }
    if (!formStartTime || !formEndTime) {
      toast.error("시작/종료 시간을 입력해주세요.");
      return;
    }

    setIsSaving(true);
    try {
    // 로컬 이벤트 생성 (DB 테이블 없으므로 로컬 상태에만 추가)
    const instructorInfo = instructors.find(i => i.id === formInstructor);
    const newEvent: ScheduleEvent = {
      id: `local-${Date.now()}`,
      title: formName,
      instructor: instructorInfo?.name ?? "",
      instructorId: formInstructor,
      start: `${formDate}T${formStartTime}:00`,
      end: `${formDate}T${formEndTime}:00`,
      room: formRoom,
      capacity: formCapacity,
      currentCount: 0,
      status: "예약",
      type: formType === "PT / OT" ? "PT" : formType === "개인 레슨" ? "개인레슨" : "GX",
      // FN-034: 예약 오픈 설정
      maxCapacity: formMaxCapacity > 0 ? formMaxCapacity : formCapacity,
      currentReservations: 0,
      reservationDeadline: formReservationDeadline || undefined,
      // FN-037: 좌석 설정
      seatRows: formSeatRows > 0 ? formSeatRows : undefined,
      seatCols: formSeatCols > 0 ? formSeatCols : undefined,
      reservedSeats: [],
    };

    setLocalEvents(prev => [...prev, newEvent]);
    toast.success("수업이 등록되었습니다.");
    setIsAddModalOpen(false);
    resetForm();
    setSelectedEvent(null);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: "schedule", label: "일정표", icon: CalendarIcon },
    { key: "classes",  label: "수업 관리", count: classManagement.length },
    { key: "counts",   label: "횟수 관리" },
    { key: "penalty",  label: "페널티 관리", count: PENALTY_DATA.length },
    { key: "valid",    label: "유효 수업 목록" },
  ];

  const calendarViewButtons: { key: "month" | "week" | "day"; label: string }[] = [
    { key: "month", label: "월" },
    { key: "week",  label: "주" },
    { key: "day",   label: "일" },
  ];

  // 요일 라벨 (반복 설정: 월~일 순)
  const REPEAT_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

  return (
    <AppLayout>
      <PageHeader
        title="수업/캘린더"
        description="PT 및 그룹 수업 스케줄을 관리하고 회원의 예약 현황을 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs px-md py-sm bg-surface-secondary border border-line text-content-secondary hover:text-primary transition-all rounded-lg text-[13px] font-semibold">
              <Settings2 size={15} />
              스케줄 일괄 변경
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary text-white hover:opacity-90 transition-all rounded-lg text-[13px] font-semibold shadow-sm"
              onClick={() => {
                setSelectedEvent(null);
                resetForm();
                setIsAddModalOpen(true);
              }}
            >
              <Plus size={15} />
              수업 등록
            </button>
          </div>
        }
      />

      <TabNav className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {loading && (
        <div className="flex items-center justify-center py-xl text-[13px] text-content-secondary">
          데이터를 불러오는 중...
        </div>
      )}

      {!loading && (
        <div className="space-y-lg">
          {activeTab === "schedule" && (
            <>
              {/* 컨트롤 바 */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface p-md rounded-xl border border-line shadow-xs">
                <div className="flex items-center gap-md">
                  {/* 뷰 전환 — UI-125 */}
                  <div className="flex items-center bg-surface-tertiary rounded-lg p-[3px] gap-[2px]">
                    {calendarViewButtons.map(btn => (
                      <button
                        key={btn.key}
                        className={cn(
                          "px-md py-[6px] text-[13px] font-medium rounded-md transition-all",
                          calendarView === btn.key ? "bg-surface text-content shadow-xs" : "text-content-secondary hover:text-content"
                        )}
                        onClick={() => setCalendarView(btn.key)}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-sm">
                    {/* 이전 버튼: 뷰에 따라 월/주/일 이동 */}
                    <button
                      className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                      onClick={handlePrev}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {/* 날짜 범위 텍스트: selectedDate 기반 동적 포맷 */}
                    <span className="text-[13px] font-bold text-content">
                      {formatDateRange(calendarView, selectedDate)}
                    </span>
                    {/* 다음 버튼 */}
                    <button
                      className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                      onClick={handleNext}
                    >
                      <ChevronRight size={18} />
                    </button>
                    {/* 오늘 버튼: selectedDate를 오늘로 리셋 */}
                    <button
                      className="px-md py-xs border border-line rounded-lg text-[12px] font-semibold text-content-secondary hover:bg-surface-secondary transition-colors"
                      onClick={handleToday}
                    >
                      오늘
                    </button>
                  </div>
                </div>
                {/* 트레이너 필터 Select */}
                <div className="flex items-center gap-sm">
                  <select
                    className="h-9 rounded-lg bg-surface-secondary border border-line px-md text-[13px] text-content outline-none focus:border-primary transition-colors"
                    value={selectedInstructor}
                    onChange={e => setSelectedInstructor(e.target.value)}
                  >
                    <option value="">전체 강사</option>
                    {instructors.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 범례 */}
              <div className="bg-surface rounded-xl border border-line px-lg py-sm shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center gap-md">
                  <div className="flex items-center gap-md">
                    <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">강사 범례</span>
                    <TrainerLegend instructors={instructors} />
                  </div>
                  <div className="hidden md:block w-px h-4 bg-line" />
                  <div className="flex items-center gap-md">
                    <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">수업 유형</span>
                    <EventTypeLegend />
                  </div>
                </div>
              </div>

              {/* 캘린더 뷰 — UI-125 */}
              {calendarView === "month" && (
                <MonthView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onEventClick={handleEventClick}
                />
              )}
              {calendarView === "week" && (
                <WeekView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onEventClick={handleEventClick}
                />
              )}
              {calendarView === "day" && (
                <DayView
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onEventClick={handleEventClick}
                />
              )}
            </>
          )}

          {activeTab === "classes" && (
            <div className="space-y-md">
              <SearchFilter
                filters={[
                  { key: "instructor", label: "강사", type: "select", options: instructors.map(i => ({ value: i.id, label: `${i.name} (${i.type})` })) },
                  { key: "room", label: "장소", type: "select", options: ROOMS.map(r => ({ value: r.id, label: r.name })) },
                ]}
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <DataTable
                columns={[
                  { key: "name",       header: "수업명",    sortable: true },
                  { key: "type",       header: "유형" },
                  { key: "instructor", header: "강사",      sortable: true },
                  { key: "room",       header: "장소" },
                  { key: "schedule",   header: "스케줄" },
                  {
                    key: "status",
                    header: "상태",
                    render: (val: string) => (
                      <StatusBadge
                        variant={val === "진행중" ? "success" : val === "마감" ? "error" : "warning"}
                        label={val} dot
                      />
                    )
                  },
                  {
                    key: "actions", header: "관리", align: "center" as const,
                    render: () => (
                      <button className="p-sm hover:bg-surface-secondary rounded-full text-content-secondary transition-colors">
                        <MoreHorizontal size={15} />
                      </button>
                    )
                  }
                ]}
                data={classManagement}
                title="수업 관리 목록"
                onDownloadExcel={() => {
                  const exportColumns = [
                    { key: 'name',       header: '수업명' },
                    { key: 'type',       header: '유형' },
                    { key: 'instructor', header: '강사' },
                    { key: 'room',       header: '장소' },
                    { key: 'schedule',   header: '스케줄' },
                    { key: 'status',     header: '상태' },
                  ];
                  exportToExcel(classManagement as unknown as Record<string, unknown>[], exportColumns, { filename: '수업관리목록' });
                  toast.success(`${classManagement.length}건 엑셀 다운로드 완료`);
                }}
              />
            </div>
          )}

          {activeTab === "counts" && (
            <div className="bg-surface rounded-xl border border-line p-xxl text-center shadow-xs">
              <div className="w-16 h-16 bg-surface-tertiary rounded-full flex items-center justify-center mx-auto mb-lg">
                <Clock size={32} className="text-content-secondary" />
              </div>
              <h3 className="text-[16px] font-bold text-content mb-xs">횟수 관리 서비스 준비 중</h3>
              <p className="text-[13px] text-content-secondary">회원별 수강권 잔여 횟수 및 소진 내역을 관리하는 기능이 곧 제공될 예정입니다.</p>
            </div>
          )}

          {activeTab === "penalty" && (
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-content">페널티 부여 내역</h3>
                <button className="flex items-center gap-xs px-md py-sm border border-line rounded-lg text-[12px] font-semibold text-content-secondary hover:bg-surface-secondary transition-colors">
                  <Filter size={13} /> 필터
                </button>
              </div>
              <DataTable
                columns={[
                  {
                    key: "memberName", header: "회원명", sortable: true,
                    render: (val: string, row: any) => (
                      <button className="text-primary font-bold hover:underline text-[13px]" onClick={() => moveToPage(985, { id: row.id })}>{val}</button>
                    )
                  },
                  { key: "className", header: "수업명" },
                  { key: "date",      header: "날짜", sortable: true },
                  { key: "type",      header: "페널티 유형" },
                  { key: "points",    header: "부여 벌점", align: "center" as const },
                  {
                    key: "status", header: "처리 상태",
                    render: (val: string) => (
                      <StatusBadge variant={val === "벌점부여" ? "error" : "warning"} label={val} />
                    )
                  },
                ]}
                data={PENALTY_DATA}
              />
            </div>
          )}

          {activeTab === "valid" && (
            <DataTable
              columns={[
                { key: "title",        header: "수업명",   sortable: true },
                { key: "instructor",   header: "강사" },
                { key: "start",        header: "시작 시간", sortable: true, render: (val: string) => val.split("T")[1]?.substring(0, 5) },
                { key: "room",         header: "장소" },
                { key: "capacity",     header: "정원",     align: "center" as const },
                { key: "currentCount", header: "예약 인원", align: "center" as const },
                {
                  key: "status", header: "상태",
                  render: (val: string) => (
                    <StatusBadge variant={val === "예약" ? "info" : "success"} label={val} />
                  )
                },
              ]}
              data={allEvents}
              title="오늘의 유효 수업 목록"
            />
          )}
        </div>
      )}

      {/* UI-126 일정 상세 모달 */}
      {isDetailModalOpen && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => { setIsDetailModalOpen(false); setIsAddModalOpen(true); }}
        />
      )}

      {/* 수업 등록/수정 모달 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
          <div className="bg-surface rounded-xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-surface px-xl py-lg border-b border-line flex items-center justify-between z-10">
              <h2 className="text-[16px] font-bold text-content">
                {selectedEvent ? "수업 수정" : "새 수업 등록"}
              </h2>
              <button
                className="p-sm hover:bg-surface-secondary rounded-full transition-colors"
                onClick={() => { setIsAddModalOpen(false); resetForm(); setSelectedEvent(null); }}
              >
                <XCircle className="text-content-secondary" size={22} />
              </button>
            </div>

            <div className="p-xl space-y-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                <div className="space-y-lg">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 템플릿 <span className="text-state-error">*</span></label>
                    <select
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      value={formTemplate}
                      onChange={e => {
                        setFormTemplate(e.target.value);
                        // 템플릿 선택 시 수업명 자동 채우기
                        const tpl = CLASS_TYPES.find(t => t.id === e.target.value);
                        if (tpl) {
                          setFormName(tpl.name);
                          setFormCapacity(tpl.capacity);
                          setFormRoom(tpl.room);
                        }
                      }}
                    >
                      <option value="">템플릿을 선택하세요</option>
                      {CLASS_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업명 <span className="text-state-error">*</span></label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      placeholder="수업 이름을 입력하세요"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 유형 <span className="text-state-error">*</span></label>
                      <select
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        value={formType}
                        onChange={e => setFormType(e.target.value)}
                      >
                        <option>그룹 수업</option>
                        <option>PT / OT</option>
                        <option>개인 레슨</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">정원수 <span className="text-state-error">*</span></label>
                      <input
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        type="number"
                        value={formCapacity}
                        onChange={e => setFormCapacity(Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">담당 강사 <span className="text-state-error">*</span></label>
                    <select
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      value={formInstructor}
                      onChange={e => setFormInstructor(e.target.value)}
                    >
                      <option value="">강사를 선택하세요</option>
                      {instructors.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-lg">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 날짜 <span className="text-state-error">*</span></label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">시작 시간 <span className="text-state-error">*</span></label>
                      <input
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">종료 시간 <span className="text-state-error">*</span></label>
                      <input
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">장소(룸) 선택 <span className="text-state-error">*</span></label>
                    <select
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      value={formRoom}
                      onChange={e => setFormRoom(e.target.value)}
                    >
                      {ROOMS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">반복 설정</label>
                    <div className="p-md bg-surface-secondary rounded-xl space-y-md">
                      <div className="flex flex-wrap gap-xs">
                        {/* 요일 버튼: 클릭 시 선택/해제 토글 */}
                        {REPEAT_DAYS.map((day, idx) => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={cn(
                              "w-9 h-9 rounded-full text-[12px] font-bold transition-colors border",
                              selectedDays[idx]
                                ? "bg-primary text-white border-primary"
                                : "bg-surface border-line text-content-secondary hover:border-primary hover:text-primary"
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FN-034: 예약 오픈 설정 */}
              <div className="border border-line rounded-xl p-lg space-y-md">
                <h3 className="text-[13px] font-bold text-content">예약 오픈 설정</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">최대 예약 인원</label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      type="number"
                      min={0}
                      placeholder="0 = 정원수 동일"
                      value={formMaxCapacity || ""}
                      onChange={e => setFormMaxCapacity(Number(e.target.value))}
                    />
                    <p className="text-[11px] text-content-secondary mt-xs">0 입력 시 정원수와 동일하게 설정됩니다.</p>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">예약 마감일</label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      type="date"
                      value={formReservationDeadline}
                      onChange={e => setFormReservationDeadline(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* FN-037: 좌석 배치 설정 */}
              <div className="border border-line rounded-xl p-lg space-y-md">
                <h3 className="text-[13px] font-bold text-content">좌석 배치 설정 <span className="text-[11px] font-normal text-content-secondary">(스피닝/GX 좌석 예약)</span></h3>
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">행 수 (Rows)</label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      type="number"
                      min={0}
                      max={10}
                      placeholder="0 = 좌석 미사용"
                      value={formSeatRows || ""}
                      onChange={e => setFormSeatRows(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">열 수 (Cols)</label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      type="number"
                      min={0}
                      max={10}
                      placeholder="0 = 좌석 미사용"
                      value={formSeatCols || ""}
                      onChange={e => setFormSeatCols(Number(e.target.value))}
                    />
                  </div>
                </div>
                {formSeatRows > 0 && formSeatCols > 0 && (
                  <p className="text-[12px] text-state-info">
                    총 {formSeatRows * formSeatCols}석 좌석 그리드가 생성됩니다.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 메모</label>
                <textarea
                  className="w-full h-20 rounded-lg bg-surface-secondary border border-line p-md text-[13px] focus:border-primary outline-none resize-none transition-all"
                  placeholder="강사나 회원에게 전달할 메모를 입력하세요"
                  value={formMemo}
                  onChange={e => setFormMemo(e.target.value)}
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface/80 backdrop-blur-sm px-xl py-lg border-t border-line flex items-center justify-end gap-md">
              <button
                className="px-xl py-sm rounded-lg text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary transition-all"
                onClick={() => { setIsAddModalOpen(false); resetForm(); setSelectedEvent(null); }}
              >취소</button>
              {/* 수업 등록 버튼: 폼 데이터 수집 후 로컬 상태에 추가 */}
              <button
                className="px-xl py-sm rounded-lg bg-primary text-white text-[13px] font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddClass}
                disabled={isSaving}
              >
                {isSaving ? "등록 중..." : selectedEvent ? "수정 완료" : "수업 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
