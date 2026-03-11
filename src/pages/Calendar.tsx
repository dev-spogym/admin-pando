import React, { useState } from "react";
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

/**
 * SCR-021: 수업/캘린더
 * UI-125 캘린더 뷰 (월/주/일), UI-126 일정 상세 모달
 */

// --- Mock Data ---
const MOCK_INSTRUCTORS = [
  { id: "1", name: "김태희", type: "PT" },
  { id: "2", name: "이효리", type: "Yoga" },
  { id: "3", name: "정지훈", type: "Pilates" },
  { id: "4", name: "박재범", type: "Spinning" },
  { id: "5", name: "유재석", type: "Zumba" },
];

const MOCK_ROOMS = [
  { id: "R1", name: "GX룸" },
  { id: "R2", name: "스피닝룸" },
  { id: "R3", name: "필라테스룸" },
  { id: "R4", name: "기구필라테스룸" },
  { id: "R5", name: "PT룸" },
];

const MOCK_CLASS_TYPES = [
  { id: "T1", name: "그룹 필라테스", capacity: 14, room: "필라테스룸" },
  { id: "T2", name: "그룹 요가", capacity: 14, room: "요가룸(GX룸)" },
  { id: "T3", name: "그룹 스피닝", capacity: 21, room: "스피닝룸" },
  { id: "T4", name: "그룹 줌바", capacity: 16, room: "GX룸" },
  { id: "T5", name: "그룹 기구필라테스", capacity: 6, room: "기구필라테스룸" },
];

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
}

const MOCK_EVENTS: ScheduleEvent[] = [
  {
    id: "E1", title: "그룹 필라테스", instructor: "김태희", instructorId: "1",
    start: "2026-03-11T09:00:00", end: "2026-03-11T10:00:00",
    room: "필라테스룸", capacity: 14, currentCount: 8, status: "예약", type: "GX",
  },
  {
    id: "E2", title: "그룹 요가", instructor: "이효리", instructorId: "2",
    start: "2026-03-11T11:00:00", end: "2026-03-11T12:00:00",
    room: "GX룸", capacity: 14, currentCount: 14, status: "완료", type: "GX",
  },
  {
    id: "E3", title: "그룹 스피닝", instructor: "박재범", instructorId: "4",
    start: "2026-03-12T10:00:00", end: "2026-03-12T11:00:00",
    room: "스피닝룸", capacity: 21, currentCount: 15, status: "예약", type: "GX",
  },
  {
    id: "E4", title: "PT 세션", instructor: "정지훈", instructorId: "3",
    start: "2026-03-11T14:00:00", end: "2026-03-11T15:00:00",
    room: "PT룸", capacity: 1, currentCount: 1, status: "완료", type: "PT",
  },
  {
    id: "E5", title: "그룹 줌바", instructor: "유재석", instructorId: "5",
    start: "2026-03-13T14:00:00", end: "2026-03-13T15:00:00",
    room: "GX룸", capacity: 16, currentCount: 10, status: "예약", type: "GX",
  },
  {
    id: "E6", title: "개인 레슨", instructor: "김태희", instructorId: "1",
    start: "2026-03-14T16:00:00", end: "2026-03-14T17:00:00",
    room: "PT룸", capacity: 1, currentCount: 1, status: "예약", type: "개인레슨",
  },
];

const MOCK_CLASS_MANAGEMENT = [
  { id: 1, name: "오전 요가 A", type: "그룹 요가", instructor: "이효리", room: "GX룸", schedule: "월/수/금 09:00", status: "진행중" },
  { id: 2, name: "필라테스 비기너", type: "그룹 필라테스", instructor: "김태희", room: "필라테스룸", schedule: "화/목 10:00", status: "진행중" },
  { id: 3, name: "저녁 스피닝", type: "그룹 스피닝", instructor: "박재범", room: "스피닝룸", schedule: "매일 19:00", status: "마감" },
];

const MOCK_PENALTY = [
  { id: 1, memberName: "홍길동", className: "그룹 요가", date: "2026-02-18", type: "노쇼", status: "벌점부여", points: 5 },
  { id: 2, memberName: "김철수", className: "그룹 필라테스", date: "2026-02-17", type: "당일취소", status: "경고", points: 2 },
];

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

// --- 월 뷰 캘린더 그리드 ---
const MonthView = ({ events, onEventClick }: { events: ScheduleEvent[]; onEventClick: (e: ScheduleEvent) => void }) => {
  const year = 2026, month = 2; // 0-indexed: March
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
    const dateStr = `2026-03-${String(day).padStart(2, "0")}`;
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
      {/* 날짜 그리드 7x5 */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-line last:border-b-0">
          {week.map((day, di) => {
            const dayEvents = getEventsForDay(day);
            const isToday = day === 11;
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
const WeekView = ({ events, onEventClick }: { events: ScheduleEvent[]; onEventClick: (e: ScheduleEvent) => void }) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="grid grid-cols-8 border-b border-line bg-surface-secondary/30">
        <div className="p-sm border-r border-line text-center text-[11px] text-content-secondary font-semibold">시간</div>
        {days.map((day, idx) => (
          <div key={idx} className="p-sm border-r border-line last:border-r-0 text-center">
            <div className="text-[11px] text-content-secondary">{day}</div>
            <div className="text-[13px] font-bold text-content">11 ~ 17</div>
          </div>
        ))}
      </div>
      <div className="h-[560px] overflow-y-auto">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b border-line last:border-b-0">
            <div className="p-xs border-r border-line text-center text-[10px] text-content-secondary font-medium">
              {hour}:00
            </div>
            {days.map((_, dayIdx) => {
              const dayEvents = events.filter(e => {
                const d = new Date(e.start);
                return d.getHours() === hour && d.getDay() === dayIdx;
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
const DayView = ({ events, onEventClick }: { events: ScheduleEvent[]; onEventClick: (e: ScheduleEvent) => void }) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const todayEvents = events.filter(e => e.start.startsWith("2026-03-11"));
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line bg-surface-secondary/30">
        <p className="text-[13px] font-bold text-content">2026년 3월 11일 (수)</p>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200">
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
              <span>예약 {event.currentCount} / {event.capacity}명</span>
            </div>
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
const TrainerLegend = () => (
  <div className="flex flex-wrap items-center gap-sm">
    {MOCK_INSTRUCTORS.map(inst => {
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

  // 선택된 트레이너 필터
  const filteredEvents = selectedInstructor
    ? MOCK_EVENTS.filter(e => e.instructorId === selectedInstructor)
    : MOCK_EVENTS;

  const handleEventClick = (event: ScheduleEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const tabs = [
    { key: "schedule", label: "일정표", icon: CalendarIcon },
    { key: "classes",  label: "수업 관리", count: MOCK_CLASS_MANAGEMENT.length },
    { key: "counts",   label: "횟수 관리" },
    { key: "penalty",  label: "페널티 관리", count: MOCK_PENALTY.length },
    { key: "valid",    label: "유효 수업 목록" },
  ];

  const calendarViewButtons: { key: "month" | "week" | "day"; label: string }[] = [
    { key: "month", label: "월" },
    { key: "week",  label: "주" },
    { key: "day",   label: "일" },
  ];

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
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus size={15} />
              수업 등록
            </button>
          </div>
        }
      />

      <TabNav className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

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
                  <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-[13px] font-bold text-content">2026.03.11 ~ 2026.03.17</span>
                  <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors">
                    <ChevronRight size={18} />
                  </button>
                  <button className="px-md py-xs border border-line rounded-lg text-[12px] font-semibold text-content-secondary hover:bg-surface-secondary transition-colors">
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
                  {MOCK_INSTRUCTORS.map(i => (
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
                  <TrainerLegend />
                </div>
                <div className="hidden md:block w-px h-4 bg-line" />
                <div className="flex items-center gap-md">
                  <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">수업 유형</span>
                  <EventTypeLegend />
                </div>
              </div>
            </div>

            {/* 캘린더 뷰 — UI-125 */}
            {calendarView === "month" && <MonthView events={filteredEvents} onEventClick={handleEventClick} />}
            {calendarView === "week"  && <WeekView  events={filteredEvents} onEventClick={handleEventClick} />}
            {calendarView === "day"   && <DayView   events={filteredEvents} onEventClick={handleEventClick} />}
          </>
        )}

        {activeTab === "classes" && (
          <div className="space-y-md">
            <SearchFilter
              filters={[
                { key: "instructor", label: "강사", type: "select", options: MOCK_INSTRUCTORS.map(i => ({ value: i.id, label: `${i.name} (${i.type})` })) },
                { key: "room", label: "장소", type: "select", options: MOCK_ROOMS.map(r => ({ value: r.id, label: r.name })) },
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
              data={MOCK_CLASS_MANAGEMENT}
              title="수업 관리 목록"
              onDownloadExcel={() => {}}
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
                  render: (val: string) => (
                    <button className="text-primary font-bold hover:underline text-[13px]" onClick={() => moveToPage(985)}>{val}</button>
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
              data={MOCK_PENALTY}
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
            data={MOCK_EVENTS}
            title="오늘의 유효 수업 목록"
          />
        )}
      </div>

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
              <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={() => setIsAddModalOpen(false)}>
                <XCircle className="text-content-secondary" size={22} />
              </button>
            </div>

            <div className="p-xl space-y-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                <div className="space-y-lg">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 템플릿 <span className="text-state-error">*</span></label>
                    <select className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all">
                      <option>템플릿을 선택하세요</option>
                      {MOCK_CLASS_TYPES.map(t => <option key={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업명 <span className="text-state-error">*</span></label>
                    <input className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all" placeholder="수업 이름을 입력하세요" />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 유형 <span className="text-state-error">*</span></label>
                      <select className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all">
                        <option>그룹 수업</option>
                        <option>PT / OT</option>
                        <option>개인 레슨</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">정원수 <span className="text-state-error">*</span></label>
                      <input className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all" type="number" defaultValue={14} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">담당 강사 <span className="text-state-error">*</span></label>
                    <select className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all">
                      {MOCK_INSTRUCTORS.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-lg">
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 날짜 <span className="text-state-error">*</span></label>
                    <input className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all" type="date" />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">시작 시간 <span className="text-state-error">*</span></label>
                      <input className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all" type="time" />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">종료 시간 <span className="text-state-error">*</span></label>
                      <input className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all" type="time" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">장소(룸) 선택 <span className="text-state-error">*</span></label>
                    <select className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all">
                      {MOCK_ROOMS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">반복 설정</label>
                    <div className="p-md bg-surface-secondary rounded-xl space-y-md">
                      <div className="flex flex-wrap gap-xs">
                        {["월", "화", "수", "목", "금", "토", "일"].map(day => (
                          <button key={day} className="w-9 h-9 rounded-full bg-surface border border-line text-[12px] font-bold text-content-secondary hover:border-primary hover:text-primary transition-colors">
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수업 메모</label>
                <textarea className="w-full h-20 rounded-lg bg-surface-secondary border border-line p-md text-[13px] focus:border-primary outline-none resize-none transition-all" placeholder="강사나 회원에게 전달할 메모를 입력하세요" />
              </div>
            </div>

            <div className="sticky bottom-0 bg-surface/80 backdrop-blur-sm px-xl py-lg border-t border-line flex items-center justify-end gap-md">
              <button
                className="px-xl py-sm rounded-lg text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary transition-all"
                onClick={() => setIsAddModalOpen(false)}
              >취소</button>
              <button className="px-xl py-sm rounded-lg bg-primary text-white text-[13px] font-bold shadow-sm hover:opacity-90 transition-all">
                {selectedEvent ? "수정 완료" : "수업 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
