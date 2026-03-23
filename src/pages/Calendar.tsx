import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
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
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  XOctagon,
  Bell,
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

// --- FullCalendar ---
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import koLocale from "@fullcalendar/core/locales/ko";
import type { EventClickArg, EventDropArg, EventContentArg } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * SCR-021: 수업/캘린더
 * UI-125 캘린더 뷰 (월/주/일/리스트), UI-126 일정 상세 모달
 * FullCalendar 기반으로 전환 — 드래그&드롭, 리사이즈, 클릭 생성/편집 지원
 */

// #15 일정 유형 색상 매핑
const SCHEDULE_COLORS: Record<string, string> = {
  '방문':   '#3B82F6',  // 파랑
  'OT':     '#10B981',  // 초록
  '상담':   '#F59E0B',  // 노랑
  '체성분': '#8B5CF6',  // 보라
  '수업':   '#EF4444',  // 빨강
  'PT':     '#F97316',  // 주황
  '기타':   '#6B7280',  // 회색
};

// #17 일정 분류 목록
const SCHEDULE_CATEGORIES = ['상담', 'OT', '체성분', '방문', '수업', 'PT', '기타'] as const;

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

// 페널티 데이터는 DB 테이블 미구현 — 빈 배열로 초기화 (추후 Supabase 연동 시 교체)

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
  // #17 일정 분류
  scheduleCategory?: string | null;
  // #16 대상 유형
  targetType?: "회원" | "비회원" | "직원" | null;
  targetName?: string | null;
  targetPhone?: string | null;
  // #18 미승인 처리
  approvalStatus?: "pending" | "approved" | "rejected" | null;
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

// --- lessons 테이블 타입 ---
interface Lesson {
  id: number;
  branchId: number;
  name: string;
  type: string;
  instructorId: number | null;
  instructorName: string | null;
  capacity: number;
  duration: number;
  color: string | null;
  isActive: boolean;
}

// --- lesson_schedules 테이블 타입 ---
interface LessonSchedule {
  id: number;
  lessonId: number;
  branchId: number;
  instructorId: number | null;
  startAt: string;
  endAt: string;
  currentCount: number;
  capacity: number;
  status: string;
  memo: string | null;
  // join
  lessonName?: string;
  instructorName?: string;
  lessonColor?: string | null;
}

// --- 수업 유형별 CSS 색상 (FullCalendar 이벤트용 hex) ---
const EVENT_TYPE_HEX: Record<EventType, { bg: string; border: string; text: string }> = {
  PT:       { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8" },
  GX:       { bg: "#eff8ff", border: "#0ea5e9", text: "#0369a1" },
  개인레슨: { bg: "#f0fdf4", border: "#22c55e", text: "#15803d" },
  기타:     { bg: "#f5f5f5", border: "#a3a3a3", text: "#525252" },
};

// --- 트레이너별 CSS 색상 ---
const TRAINER_HEX: Record<string, { bg: string; border: string; text: string }> = {
  "1": { bg: "#fff1f2", border: "#fb7185", text: "#be123c" },
  "2": { bg: "#f5f3ff", border: "#a78bfa", text: "#6d28d9" },
  "3": { bg: "#f0f9ff", border: "#38bdf8", text: "#0369a1" },
  "4": { bg: "#fffbeb", border: "#fbbf24", text: "#b45309" },
  "5": { bg: "#ecfdf5", border: "#34d399", text: "#047857" },
};
const DEFAULT_HEX = { bg: "#f5f5f5", border: "#d4d4d4", text: "#525252" };

// --- 수업 유형별 Tailwind 클래스 (모달용) ---
const EVENT_TYPE_COLORS: Record<EventType, { bg: string; border: string; text: string; light: string }> = {
  PT:       { bg: "bg-primary/10",      border: "border-primary",      text: "text-primary",       light: "bg-primary/5" },
  GX:       { bg: "bg-state-info/10",   border: "border-state-info",   text: "text-state-info",    light: "bg-state-info/5" },
  개인레슨: { bg: "bg-state-success/10",border: "border-state-success",text: "text-state-success", light: "bg-state-success/5" },
  기타:     { bg: "bg-surface-tertiary",border: "border-line",         text: "text-content-secondary", light: "bg-surface-secondary" },
};

// --- 트레이너별 Tailwind 클래스 (범례용) ---
const TRAINER_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  "1": { bg: "bg-rose-50",    border: "border-rose-400",   text: "text-rose-700",   light: "bg-rose-50" },
  "2": { bg: "bg-violet-50",  border: "border-violet-400", text: "text-violet-700", light: "bg-violet-50" },
  "3": { bg: "bg-sky-50",     border: "border-sky-400",    text: "text-sky-700",    light: "bg-sky-50" },
  "4": { bg: "bg-amber-50",   border: "border-amber-400",  text: "text-amber-700",  light: "bg-amber-50" },
  "5": { bg: "bg-emerald-50", border: "border-emerald-400",text: "text-emerald-700",light: "bg-emerald-50" },
};
const DEFAULT_COLOR = { bg: "bg-surface-secondary", border: "border-line", text: "text-content-secondary", light: "bg-surface-secondary" };

const PATH_TO_TAB: Record<string, string> = {
  "/calendar": "schedule",
  "/lessons": "classes",
  "/lesson-counts": "counts",
  "/penalties": "penalty",
  "/valid-lessons": "valid",
};

const TAB_TO_PATH: Record<string, string> = {
  schedule: "/calendar",
  classes: "/lessons",
  counts: "/lesson-counts",
  penalty: "/penalties",
  valid: "/valid-lessons",
};

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
    if (reservedSeats.includes(idx)) return;
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
  onDelete,
  onApprove,
  onReject,
}: {
  event: ScheduleEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}) => {
  const { editable, reason } = isEventEditable(event.start);
  const colors = EVENT_TYPE_COLORS[event.type] ?? EVENT_TYPE_COLORS["기타"];
  const [showSeats, setShowSeats] = React.useState(false);
  const [toggledSeats, setToggledSeats] = React.useState<number[]>([]);
  const isPending = event.approvalStatus === 'pending';

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
        <div className={cn("px-xl py-lg border-b border-line flex items-center justify-between", isPending ? "bg-amber-50" : colors.light)}>
          <div className="flex items-center gap-sm flex-wrap">
            <div className={cn("w-3 h-3 rounded-full border-2", colors.border)} />
            <h2 className="text-[16px] font-bold text-content">{event.title}</h2>
            <StatusBadge
              variant={event.status === "완료" ? "success" : event.status === "취소" ? "error" : "info"}
              label={event.status}
            />
            {/* #18 미승인 배지 */}
            {isPending && (
              <span className="inline-flex items-center gap-xs px-sm py-[2px] rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold border border-amber-300">
                <Bell size={10} />
                미승인
              </span>
            )}
            {/* #17 카테고리 배지 */}
            {event.scheduleCategory && (
              <span
                className="inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: (SCHEDULE_COLORS[event.scheduleCategory] ?? '#6B7280') + '20',
                  color: SCHEDULE_COLORS[event.scheduleCategory] ?? '#6B7280',
                }}
              >
                {event.scheduleCategory}
              </span>
            )}
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

          {/* #16 대상 정보 */}
          {(event.targetType || event.targetName) && (
            <div className="flex items-center gap-sm p-sm bg-surface-secondary rounded-lg border border-line">
              <Users size={14} className="text-content-secondary flex-shrink-0" />
              <span className="text-[12px] text-content">
                <span className="font-semibold text-content-secondary mr-xs">{event.targetType ?? '대상'}:</span>
                {event.targetName ?? '-'}
              </span>
            </div>
          )}

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

        <div className="px-xl py-lg border-t border-line flex items-center justify-between gap-md">
          {/* #18 미승인 상태일 때 승인/거절 버튼 */}
          {isPending ? (
            <div className="flex items-center gap-sm">
              <button
                className="flex items-center gap-xs px-lg py-sm rounded-lg text-[12px] font-semibold bg-state-success/10 text-state-success border border-state-success/30 hover:bg-state-success/20 transition-all"
                onClick={() => { onApprove?.(); onClose(); }}
              >
                <CheckCircle2 size={13} />
                승인
              </button>
              <button
                className="flex items-center gap-xs px-lg py-sm rounded-lg text-[12px] font-semibold bg-state-error/10 text-state-error border border-state-error/30 hover:bg-state-error/20 transition-all"
                onClick={() => { onReject?.(); onClose(); }}
              >
                <XOctagon size={13} />
                거절
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-md">
            <button
              className="px-lg py-sm rounded-lg text-[12px] font-semibold text-state-error border border-state-error/20 hover:bg-state-error/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!editable}
              onClick={onDelete}
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

// --- ScheduleEvent -> FullCalendar EventInput 변환 ---
function toFullCalendarEvent(ev: ScheduleEvent) {
  const typeColors = EVENT_TYPE_HEX[ev.type] ?? EVENT_TYPE_HEX["기타"];
  const trainerColors = TRAINER_HEX[ev.instructorId] ?? DEFAULT_HEX;
  const { editable: canEdit } = isEventEditable(ev.start);

  // #15 scheduleCategory 색상 우선 적용
  const categoryColor = ev.scheduleCategory ? SCHEDULE_COLORS[ev.scheduleCategory] : null;
  const borderColor = categoryColor ?? trainerColors.border;

  // #18 미승인(pending) 이벤트는 반투명 처리
  const isPending = ev.approvalStatus === 'pending';

  return {
    id: ev.id,
    title: ev.title,
    start: ev.start,
    end: ev.end,
    editable: canEdit,
    backgroundColor: isPending ? '#f9fafb' : (categoryColor ? categoryColor + '18' : trainerColors.bg),
    borderColor,
    textColor: categoryColor ? borderColor : trainerColors.text,
    classNames: isPending ? ['fc-event-pending'] : [],
    extendedProps: {
      instructor: ev.instructor,
      instructorId: ev.instructorId,
      room: ev.room,
      capacity: ev.capacity,
      currentCount: ev.currentCount,
      status: ev.status,
      type: ev.type,
      maxCapacity: ev.maxCapacity,
      currentReservations: ev.currentReservations,
      reservationDeadline: ev.reservationDeadline,
      seatRows: ev.seatRows,
      seatCols: ev.seatCols,
      reservedSeats: ev.reservedSeats,
      typeColors,
      trainerColors,
      scheduleCategory: ev.scheduleCategory,
      approvalStatus: ev.approvalStatus,
      targetType: ev.targetType,
      targetName: ev.targetName,
    },
  };
}

// --- FullCalendar 커스텀 이벤트 렌더 ---
function renderEventContent(eventInfo: EventContentArg) {
  const { event, view } = eventInfo;
  const props = event.extendedProps;
  const typeColors = props.typeColors as { bg: string; border: string; text: string } | undefined;
  const isPending = props.approvalStatus === 'pending';
  // #15 scheduleCategory 색상 dot 색
  const categoryColor = props.scheduleCategory ? SCHEDULE_COLORS[props.scheduleCategory as string] : null;
  const dotColor = categoryColor ?? typeColors?.border ?? "#a3a3a3";

  // 월 뷰: 컴팩트
  if (view.type === "dayGridMonth") {
    return (
      <div className={cn("flex items-center gap-[3px] px-[3px] py-[1px] overflow-hidden w-full", isPending && "opacity-70")}>
        <div
          className="w-[6px] h-[6px] rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span className="text-[10px] font-semibold truncate" style={{ color: typeColors?.text ?? "#525252" }}>
          {event.start ? new Date(event.start).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) : ""}{" "}
          {event.title}
        </span>
        {isPending && <span className="text-[8px] font-bold text-amber-600 flex-shrink-0">미승인</span>}
      </div>
    );
  }

  // 리스트 뷰
  if (view.type === "listWeek") {
    return (
      <div className="flex items-center gap-sm">
        <span className="font-bold text-[13px]">{event.title}</span>
        {props.scheduleCategory && (
          <span className="text-[10px] px-xs py-[1px] rounded-full font-semibold" style={{ backgroundColor: dotColor + '22', color: dotColor }}>
            {props.scheduleCategory as string}
          </span>
        )}
        {isPending && <span className="text-[10px] px-xs py-[1px] rounded-full bg-amber-100 text-amber-700 font-semibold">미승인</span>}
        <span className="text-[11px] text-content-secondary">{props.instructor} / {props.room}</span>
        <span className="text-[11px] text-content-secondary">{props.currentCount}/{props.capacity}명</span>
      </div>
    );
  }

  // 주/일 뷰: 상세
  return (
    <div className={cn("flex flex-col gap-[1px] px-[4px] py-[2px] overflow-hidden w-full h-full", isPending && "opacity-80")}>
      <div className="flex items-center gap-[3px]">
        <span className="text-[11px] font-bold truncate">{event.title}</span>
        {isPending && <span className="text-[8px] font-bold text-amber-600 flex-shrink-0">미승인</span>}
      </div>
      {props.scheduleCategory && (
        <span className="text-[8px] font-semibold" style={{ color: dotColor }}>{props.scheduleCategory as string}</span>
      )}
      <div className="flex items-center gap-[4px] text-[9px] opacity-80">
        <Users size={8} />
        <span>{props.currentCount}/{props.capacity}</span>
        <span className="mx-[2px]">|</span>
        <span>{props.instructor}</span>
      </div>
      <div className="flex items-center gap-[4px] text-[9px] opacity-70">
        <MapPin size={8} />
        <span className="truncate">{props.room}</span>
      </div>
    </div>
  );
}

export default function Calendar() {
  const location = useLocation();
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);

  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInstructor, setSelectedInstructor] = useState("");
  // 추가 필터 상태 (BROJ 스타일)
  const [selectedLessonFilter, setSelectedLessonFilter] = useState("");
  const [capacityFilter, setCapacityFilter] = useState<"전체" | "여유" | "마감">("전체");
  // 우측 패널 선택 날짜
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  // 페널티 데이터 — DB 테이블 미구현, 빈 배열로 초기화 (추후 Supabase 연동 시 교체)
  const [penaltyData] = useState<{ id: number; memberName: string; className: string; date: string; type: string; status: string; points: number }[]>([]);

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
  // --- #17 분류 폼 상태 ---
  const [formScheduleCategory, setFormScheduleCategory] = useState("");
  // --- #16 대상 유형 폼 상태 ---
  const [formTargetType, setFormTargetType] = useState<"회원" | "비회원" | "직원">("회원");
  const [formTargetName, setFormTargetName] = useState("");
  const [formTargetPhone, setFormTargetPhone] = useState("");
  const [formTargetStaff, setFormTargetStaff] = useState("");
  // --- #17 카테고리 필터 ---
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // --- #18 미승인 처리 ---
  const [pendingCount, setPendingCount] = useState(0);

  // --- 로컬 상태에 추가된 수업 이벤트 ---
  const [localEvents, setLocalEvents] = useState<ScheduleEvent[]>([]);

  // --- Supabase 상태 ---
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [classManagement, setClassManagement] = useState<ClassManagement[]>([]);
  const [loading, setLoading] = useState(true);
  // lessons/lesson_schedules 관련 상태
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonSchedules, setLessonSchedules] = useState<LessonSchedule[]>([]);

  const branchId = Number(localStorage.getItem("branchId") ?? 1);
  const activeTab = useMemo(() => {
    const routeTab = PATH_TO_TAB[location.pathname];
    if (routeTab) return routeTab;
    const queryTab = new URLSearchParams(location.search).get("tab");
    return queryTab === "valid" ? "valid" : "schedule";
  }, [location.pathname, location.search]);

  const handleTabChange = useCallback((tab: string) => {
    const nextPath = TAB_TO_PATH[tab] ?? "/calendar";
    navigate(nextPath);
  }, [navigate]);

  // --- Supabase 데이터 로드 ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 트레이너 목록 (staff 테이블, role = '트레이너')
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, role")
        .eq("role", "트레이너")
        .eq("branchId", branchId);

      if (staffData) {
        setInstructors(staffData.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          type: s.role ?? "",
        })));
      }

      // 수업 일정 (classes 테이블)
      const { data: classData } = await supabase
        .from("classes")
        .select("id, title, type, staffId, staffName, room, startTime, endTime, capacity, booked, isRecurring, branchId")
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
          status: "예약",
          type: (c.type as EventType) ?? "기타",
          scheduleCategory: null,
          approvalStatus: null,
          targetType: null,
          targetName: null,
        }));
        // #18 미승인 건수 계산
        const pendingItems = mapped.filter(e => e.approvalStatus === 'pending');
        setPendingCount(pendingItems.length);
        setEvents(mapped);
        setClassManagement(classData.map((c: any) => ({
          id: c.id,
          name: c.title ?? "",
          type: c.type ?? "",
          instructor: c.staffName ?? "",
          room: c.room ?? "",
          schedule: c.startTime ? c.startTime.split("T")[0] : "",
          status: "진행중",
        })));
      }
      // lessons 테이블에서 유효 수업 목록 조회
      const { data: lessonsData } = await supabase
        .from("lessons")
        .select("*")
        .eq("branchId", branchId)
        .eq("isActive", true);

      if (lessonsData) {
        setLessons(lessonsData as Lesson[]);
      }

      // lesson_schedules 테이블에서 수업 일정 조회 (lessons 조인)
      const { data: scheduleData } = await supabase
        .from("lesson_schedules")
        .select("*")
        .eq("branchId", branchId);

      if (scheduleData) {
        const mapped: LessonSchedule[] = scheduleData.map((s: any) => ({
          id: s.id,
          lessonId: s.lessonId,
          branchId: s.branchId,
          instructorId: s.instructorId,
          startAt: s.startAt,
          endAt: s.endAt,
          currentCount: s.currentCount ?? 0,
          capacity: s.capacity ?? 0,
          status: s.status ?? "예약가능",
          memo: s.memo ?? null,
          lessonName: s.lessonName ?? "",
          instructorName: s.instructorName ?? "",
          lessonColor: s.lessonColor ?? null,
        }));
        setLessonSchedules(mapped);
      }
    } catch (err) {
      console.error("Calendar 데이터 로드 실패:", err);
      toast.error("데이터를 불러오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 선택된 트레이너 필터 + 로컬 추가 이벤트 합산
  const allEvents = useMemo(() => [...events, ...localEvents], [events, localEvents]);
  const filteredEvents = useMemo(() => {
    let result = allEvents;
    if (selectedInstructor) result = result.filter(e => e.instructorId === selectedInstructor);
    if (selectedLessonFilter) result = result.filter(e => e.title === selectedLessonFilter);
    if (capacityFilter === "여유") result = result.filter(e => e.currentCount < e.capacity);
    if (capacityFilter === "마감") result = result.filter(e => e.currentCount >= e.capacity);
    // #17 카테고리 멀티필터
    if (selectedCategories.length > 0) {
      result = result.filter(e => e.scheduleCategory && selectedCategories.includes(e.scheduleCategory));
    }
    return result;
  }, [allEvents, selectedInstructor, selectedLessonFilter, capacityFilter, selectedCategories]);

  // lesson_schedules → FullCalendar 이벤트 변환
  const lessonScheduleEvents = useMemo(() => {
    return lessonSchedules.map(s => {
      // lessons 색상 사용, 없으면 기본 primary 색
      const color = s.lessonColor ?? "#3b82f6";
      const isFull = s.currentCount >= s.capacity;
      // 강사 필터 적용
      if (selectedInstructor && String(s.instructorId) !== selectedInstructor) return null;
      // 수업명 필터 적용
      if (selectedLessonFilter && s.lessonName !== selectedLessonFilter) return null;
      // 정원 필터 적용
      if (capacityFilter === "여유" && isFull) return null;
      if (capacityFilter === "마감" && !isFull) return null;
      return {
        id: `ls-${s.id}`,
        title: s.lessonName ?? "수업",
        start: s.startAt,
        end: s.endAt,
        backgroundColor: isFull ? "#fee2e2" : "#eff6ff",
        borderColor: color,
        textColor: isFull ? "#dc2626" : "#1d4ed8",
        extendedProps: {
          instructor: s.instructorName ?? "",
          instructorId: String(s.instructorId ?? ""),
          room: "",
          capacity: s.capacity,
          currentCount: s.currentCount,
          status: s.status,
          type: "GX" as const,
          lessonColor: color,
          isLessonSchedule: true,
          scheduleId: s.id,
        },
      };
    }).filter((e): e is NonNullable<typeof e> => e !== null);
  }, [lessonSchedules, selectedInstructor, selectedLessonFilter, capacityFilter]);

  // 선택 날짜의 lesson_schedules 리스트 (우측 패널용)
  const selectedDateSchedules = useMemo(() => {
    return lessonSchedules.filter(s => {
      const dateStr = s.startAt?.split("T")[0];
      return dateStr === selectedDate;
    });
  }, [lessonSchedules, selectedDate]);

  // --- FullCalendar 이벤트 변환 (메모이즈) — classes + lesson_schedules 합산 ---
  const calendarEvents = useMemo(
    () => [
      ...filteredEvents.map(toFullCalendarEvent),
      ...lessonScheduleEvents,
    ],
    [filteredEvents, lessonScheduleEvents]
  );

  // --- ScheduleEvent 조회 헬퍼 ---
  const findScheduleEvent = useCallback(
    (id: string): ScheduleEvent | undefined => allEvents.find(e => e.id === id),
    [allEvents]
  );

  // --- 이벤트 클릭 → 상세 모달 열기 ---
  const handleEventClick = useCallback((info: EventClickArg) => {
    const ev = findScheduleEvent(info.event.id);
    if (ev) {
      setSelectedEvent(ev);
      setIsDetailModalOpen(true);
    }
  }, [findScheduleEvent]);

  // --- 빈 날짜/시간 클릭 → 수업 등록 모달 (날짜/시간 사전 입력) + 우측 패널 날짜 선택 ---
  const handleDateClick = useCallback((info: DateClickArg) => {
    const clickedDate = info.date;
    const dateStr = clickedDate.getFullYear() +
      "-" + String(clickedDate.getMonth() + 1).padStart(2, "0") +
      "-" + String(clickedDate.getDate()).padStart(2, "0");

    // 우측 패널 날짜 업데이트
    setSelectedDate(dateStr);

    setSelectedEvent(null);
    resetForm();
    setFormDate(dateStr);

    // 시간 뷰에서 클릭 시 시간도 사전 입력
    if (info.view.type === "timeGridWeek" || info.view.type === "timeGridDay") {
      const hours = String(clickedDate.getHours()).padStart(2, "0");
      const minutes = String(clickedDate.getMinutes()).padStart(2, "0");
      setFormStartTime(`${hours}:${minutes}`);
      // 기본 1시간 후 종료
      const endDate = new Date(clickedDate.getTime() + 60 * 60 * 1000);
      const endHours = String(endDate.getHours()).padStart(2, "0");
      const endMinutes = String(endDate.getMinutes()).padStart(2, "0");
      setFormEndTime(`${endHours}:${endMinutes}`);
    }

    setIsAddModalOpen(true);
  }, []);

  // --- 이벤트 드래그&드롭 → Supabase 업데이트 ---
  const handleEventDrop = useCallback(async (info: EventDropArg) => {
    const { event, revert } = info;
    const ev = findScheduleEvent(event.id);
    if (!ev) { revert(); return; }

    const { editable } = isEventEditable(ev.start);
    if (!editable) {
      toast.error("과거 또는 시작 임박 수업은 이동할 수 없습니다.");
      revert();
      return;
    }

    const newStart = event.start?.toISOString() ?? ev.start;
    const newEnd = event.end?.toISOString() ?? ev.end;

    // 로컬 이벤트인 경우 로컬 상태만 업데이트
    if (ev.id.startsWith("local-")) {
      setLocalEvents(prev => prev.map(e =>
        e.id === ev.id ? { ...e, start: newStart, end: newEnd } : e
      ));
      toast.success("수업 일정이 변경되었습니다.");
      return;
    }

    // Supabase 업데이트
    try {
      const { error } = await supabase
        .from("classes")
        .update({ startTime: newStart, endTime: newEnd })
        .eq("id", Number(ev.id));

      if (error) {
        toast.error("일정 변경에 실패했습니다.");
        revert();
        return;
      }

      setEvents(prev => prev.map(e =>
        e.id === ev.id ? { ...e, start: newStart, end: newEnd } : e
      ));
      toast.success("수업 일정이 변경되었습니다.");
    } catch {
      toast.error("일정 변경 중 오류가 발생했습니다.");
      revert();
    }
  }, [findScheduleEvent]);

  // --- 이벤트 리사이즈 → Supabase 업데이트 ---
  const handleEventResize = useCallback(async (info: EventResizeDoneArg) => {
    const { event, revert } = info;
    const ev = findScheduleEvent(event.id);
    if (!ev) { revert(); return; }

    const { editable } = isEventEditable(ev.start);
    if (!editable) {
      toast.error("과거 또는 시작 임박 수업은 변경할 수 없습니다.");
      revert();
      return;
    }

    const newStart = event.start?.toISOString() ?? ev.start;
    const newEnd = event.end?.toISOString() ?? ev.end;

    // 로컬 이벤트
    if (ev.id.startsWith("local-")) {
      setLocalEvents(prev => prev.map(e =>
        e.id === ev.id ? { ...e, start: newStart, end: newEnd } : e
      ));
      toast.success("수업 시간이 변경되었습니다.");
      return;
    }

    // Supabase 업데이트
    try {
      const { error } = await supabase
        .from("classes")
        .update({ startTime: newStart, endTime: newEnd })
        .eq("id", Number(ev.id));

      if (error) {
        toast.error("시간 변경에 실패했습니다.");
        revert();
        return;
      }

      setEvents(prev => prev.map(e =>
        e.id === ev.id ? { ...e, start: newStart, end: newEnd } : e
      ));
      toast.success("수업 시간이 변경되었습니다.");
    } catch {
      toast.error("시간 변경 중 오류가 발생했습니다.");
      revert();
    }
  }, [findScheduleEvent]);

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
    setFormInstructor("");
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
    // #17 분류 초기화
    setFormScheduleCategory("");
    // #16 대상 초기화
    setFormTargetType("회원");
    setFormTargetName("");
    setFormTargetPhone("");
    setFormTargetStaff("");
  };

  // --- 수업 등록 제출 핸들러 ---
  const handleAddClass = () => {
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
      const instructorInfo = instructors.find(i => i.id === formInstructor);
      // #16 대상명 결정
      const resolvedTargetName =
        formTargetType === "직원"
          ? (instructors.find(i => i.id === formTargetStaff)?.name ?? formTargetStaff)
          : formTargetName || null;
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
        maxCapacity: formMaxCapacity > 0 ? formMaxCapacity : formCapacity,
        currentReservations: 0,
        reservationDeadline: formReservationDeadline || undefined,
        seatRows: formSeatRows > 0 ? formSeatRows : undefined,
        seatCols: formSeatCols > 0 ? formSeatCols : undefined,
        reservedSeats: [],
        scheduleCategory: formScheduleCategory || null,
        targetType: formTargetType,
        targetName: resolvedTargetName,
        approvalStatus: null,
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

  // --- 수업 삭제 핸들러 ---
  const handleDeleteClass = useCallback(async () => {
    if (!selectedEvent) return;

    const { editable } = isEventEditable(selectedEvent.start);
    if (!editable) {
      toast.error("해당 수업은 삭제할 수 없습니다.");
      return;
    }

    // 로컬 이벤트
    if (selectedEvent.id.startsWith("local-")) {
      setLocalEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      toast.success("수업이 삭제되었습니다.");
      setIsDetailModalOpen(false);
      setSelectedEvent(null);
      return;
    }

    // Supabase 삭제
    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", Number(selectedEvent.id));

      if (error) {
        toast.error("수업 삭제에 실패했습니다.");
        return;
      }

      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setClassManagement(prev => prev.filter(c => String(c.id) !== selectedEvent.id));
      toast.success("수업이 삭제되었습니다.");
      setIsDetailModalOpen(false);
      setSelectedEvent(null);
    } catch {
      toast.error("수업 삭제 중 오류가 발생했습니다.");
    }
  }, [selectedEvent]);

  // #18 일정 승인 핸들러
  const handleApproveEvent = useCallback(async () => {
    if (!selectedEvent) return;
    const { error } = await supabase
      .from('classes')
      .update({ approvalStatus: 'approved' })
      .eq('id', Number(selectedEvent.id));
    if (error) { toast.error('승인에 실패했습니다.'); return; }
    setEvents(prev => prev.map(e =>
      e.id === selectedEvent.id ? { ...e, approvalStatus: 'approved' } : e
    ));
    setPendingCount(prev => Math.max(0, prev - 1));
    toast.success('일정이 승인되었습니다.');
    setIsDetailModalOpen(false);
  }, [selectedEvent]);

  // #18 일정 거절 핸들러
  const handleRejectEvent = useCallback(async () => {
    if (!selectedEvent) return;
    const { error } = await supabase
      .from('classes')
      .update({ approvalStatus: 'rejected' })
      .eq('id', Number(selectedEvent.id));
    if (error) { toast.error('거절에 실패했습니다.'); return; }
    setEvents(prev => prev.map(e =>
      e.id === selectedEvent.id ? { ...e, approvalStatus: 'rejected' } : e
    ));
    setPendingCount(prev => Math.max(0, prev - 1));
    toast.success('일정이 거절되었습니다.');
    setIsDetailModalOpen(false);
  }, [selectedEvent]);

  const tabs = [
    { key: "schedule", label: "일정표", icon: CalendarIcon },
    { key: "classes",  label: "수업 관리", count: classManagement.length },
    { key: "counts",   label: "횟수 관리" },
    { key: "penalty",  label: "페널티 관리", count: penaltyData.length },
    { key: "valid",    label: "유효 수업 목록" },
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

      <TabNav className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      {loading && (
        <div className="flex items-center justify-center py-xl text-[13px] text-content-secondary">
          데이터를 불러오는 중...
        </div>
      )}

      {!loading && (
        <div className="space-y-lg">
          {activeTab === "schedule" && (
            <>
              {/* #18 미승인 일정 알림 배지 */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-sm p-sm bg-amber-50 border border-amber-200 rounded-xl">
                  <Bell size={15} className="text-amber-600 flex-shrink-0" />
                  <span className="text-[13px] font-semibold text-amber-700">
                    미승인 일정 <span className="font-bold">{pendingCount}건</span>이 있습니다.
                  </span>
                </div>
              )}

              {/* 필터 바 (BROJ 스타일) */}
              <div className="flex flex-col gap-md bg-surface p-md rounded-xl border border-line shadow-xs">
                <div className="flex flex-wrap items-center gap-md">
                  {/* 강사 필터 */}
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
                  {/* 수업명 필터 */}
                  <select
                    className="h-9 rounded-lg bg-surface-secondary border border-line px-md text-[13px] text-content outline-none focus:border-primary transition-colors"
                    value={selectedLessonFilter}
                    onChange={e => setSelectedLessonFilter(e.target.value)}
                  >
                    <option value="">전체 수업</option>
                    {lessons.map(l => (
                      <option key={l.id} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                  {/* 정원 상태 필터 */}
                  <div className="flex items-center gap-xs">
                    {(["전체", "여유", "마감"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setCapacityFilter(opt)}
                        className={cn(
                          "h-9 px-md rounded-lg text-[12px] font-semibold border transition-colors",
                          capacityFilter === opt
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                {/* #17 카테고리 멀티셀렉트 필터 */}
                <div className="flex flex-wrap items-center gap-xs pt-xs border-t border-line">
                  <span className="text-[12px] font-semibold text-content-secondary mr-xs">분류</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategories([])}
                    className={cn(
                      "h-7 px-sm rounded-full text-[11px] font-semibold border transition-colors",
                      selectedCategories.length === 0
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                    )}
                  >
                    전체
                  </button>
                  {SCHEDULE_CATEGORIES.map(cat => {
                    const color = SCHEDULE_COLORS[cat] ?? '#6B7280';
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setSelectedCategories(prev =>
                            isSelected ? prev.filter(c => c !== cat) : [...prev, cat]
                          );
                        }}
                        className="h-7 px-sm rounded-full text-[11px] font-semibold border transition-all"
                        style={isSelected
                          ? { backgroundColor: color, color: '#fff', borderColor: color }
                          : { backgroundColor: color + '15', color, borderColor: color + '40' }
                        }
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
                {/* 범례 */}
                <div className="flex flex-wrap items-center gap-md pt-xs border-t border-line">
                  <div className="flex flex-col md:flex-row md:items-center gap-md">
                    <div className="flex items-center gap-md">
                      <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">강사</span>
                      <TrainerLegend instructors={instructors} />
                    </div>
                    <div className="hidden md:block w-px h-4 bg-line" />
                    <div className="flex items-center gap-md">
                      <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">유형</span>
                      <EventTypeLegend />
                    </div>
                    <div className="hidden md:block w-px h-4 bg-line" />
                    {/* #15 분류 색상 범례 */}
                    <div className="flex flex-wrap items-center gap-sm">
                      <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">분류</span>
                      {Object.entries(SCHEDULE_COLORS).map(([cat, color]) => (
                        <div key={cat} className="flex items-center gap-xs">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                          <span className="text-[11px] text-content-secondary">{cat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 캘린더 + 우측 패널 레이아웃 */}
              <div className="flex gap-lg items-start">
                {/* FullCalendar (좌) */}
                <div className="flex-1 min-w-0 bg-surface rounded-xl border border-line shadow-card p-md fc-theme-pando">
                <style>{`
                  /* FullCalendar 앱 테마 오버라이드 */
                  .fc-theme-pando .fc {
                    --fc-border-color: var(--color-line, #e5e7eb);
                    --fc-page-bg-color: transparent;
                    --fc-neutral-bg-color: var(--color-surface-secondary, #f9fafb);
                    --fc-today-bg-color: rgba(59, 130, 246, 0.04);
                    --fc-event-border-color: transparent;
                    font-family: inherit;
                  }
                  .fc-theme-pando .fc .fc-toolbar-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--color-content, #111827);
                  }
                  .fc-theme-pando .fc .fc-button {
                    background: var(--color-surface-secondary, #f9fafb);
                    border: 1px solid var(--color-line, #e5e7eb);
                    color: var(--color-content-secondary, #6b7280);
                    font-size: 12px;
                    font-weight: 600;
                    padding: 5px 12px;
                    border-radius: 8px;
                    text-transform: none;
                    transition: all 0.15s;
                    box-shadow: none;
                  }
                  .fc-theme-pando .fc .fc-button:hover {
                    background: var(--color-surface-tertiary, #f3f4f6);
                    color: var(--color-primary, #3b82f6);
                    border-color: var(--color-primary, #3b82f6);
                  }
                  .fc-theme-pando .fc .fc-button-active,
                  .fc-theme-pando .fc .fc-button.fc-button-active {
                    background: var(--color-primary, #3b82f6) !important;
                    color: white !important;
                    border-color: var(--color-primary, #3b82f6) !important;
                    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
                  }
                  .fc-theme-pando .fc .fc-button:focus {
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                  }
                  .fc-theme-pando .fc .fc-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                  }
                  .fc-theme-pando .fc .fc-col-header-cell {
                    padding: 8px 0;
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--color-content-secondary, #6b7280);
                    background: var(--color-surface-secondary, #f9fafb);
                  }
                  .fc-theme-pando .fc .fc-daygrid-day-number {
                    font-size: 12px;
                    font-weight: 700;
                    padding: 6px 8px;
                    color: var(--color-content, #111827);
                  }
                  .fc-theme-pando .fc .fc-day-today .fc-daygrid-day-number {
                    background: var(--color-primary, #3b82f6);
                    color: white;
                    border-radius: 9999px;
                    width: 24px;
                    height: 24px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    margin: 4px;
                  }
                  .fc-theme-pando .fc .fc-daygrid-day {
                    min-height: 96px;
                    transition: background 0.15s;
                  }
                  .fc-theme-pando .fc .fc-daygrid-day:hover {
                    background: rgba(0,0,0,0.015);
                  }
                  .fc-theme-pando .fc .fc-daygrid-day-frame {
                    cursor: pointer;
                  }
                  .fc-theme-pando .fc .fc-event {
                    border-radius: 4px;
                    border-left-width: 3px;
                    border-top: none;
                    border-bottom: none;
                    border-right: none;
                    padding: 1px 2px;
                    margin-bottom: 1px;
                    font-size: 11px;
                    cursor: pointer;
                    transition: opacity 0.15s;
                  }
                  .fc-theme-pando .fc .fc-event:hover {
                    opacity: 0.8;
                  }
                  .fc-theme-pando .fc .fc-timegrid-slot {
                    height: 48px;
                    font-size: 11px;
                  }
                  .fc-theme-pando .fc .fc-timegrid-slot-label-cushion {
                    font-size: 11px;
                    color: var(--color-content-secondary, #6b7280);
                  }
                  .fc-theme-pando .fc .fc-timegrid-event {
                    border-radius: 6px;
                    border-left-width: 3px;
                    padding: 2px;
                  }
                  .fc-theme-pando .fc .fc-list-event {
                    cursor: pointer;
                  }
                  .fc-theme-pando .fc .fc-list-day-cushion {
                    font-size: 13px;
                    font-weight: 700;
                    background: var(--color-surface-secondary, #f9fafb);
                  }
                  .fc-theme-pando .fc .fc-more-link {
                    font-size: 10px;
                    color: var(--color-content-secondary, #6b7280);
                    font-weight: 600;
                  }
                  .fc-theme-pando .fc .fc-non-business {
                    background: var(--color-surface-tertiary, #f3f4f6);
                    opacity: 0.3;
                  }
                  .fc-theme-pando .fc .fc-scrollgrid {
                    border-radius: 12px;
                    overflow: hidden;
                  }
                  .fc-theme-pando .fc .fc-toolbar {
                    margin-bottom: 12px;
                  }
                  .fc-theme-pando .fc .fc-toolbar .fc-button-group {
                    gap: 2px;
                  }
                  /* 이벤트 드래그 중 시각 피드백 */
                  .fc-theme-pando .fc .fc-event-dragging {
                    opacity: 0.7;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  }
                  .fc-theme-pando .fc .fc-event-resizing {
                    opacity: 0.7;
                  }
                  /* dayMaxEvents more 팝오버 */
                  .fc-theme-pando .fc .fc-popover {
                    border-radius: 12px;
                    border: 1px solid var(--color-line, #e5e7eb);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.1);
                  }
                  .fc-theme-pando .fc .fc-popover-header {
                    font-size: 12px;
                    font-weight: 700;
                    background: var(--color-surface-secondary, #f9fafb);
                    padding: 8px 12px;
                  }
                `}</style>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  locale={koLocale}
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
                  }}
                  buttonText={{
                    today: "오늘",
                    month: "월",
                    week: "주",
                    day: "일",
                    list: "목록",
                  }}
                  events={calendarEvents}
                  editable={true}
                  droppable={true}
                  eventDurationEditable={true}
                  eventStartEditable={true}
                  selectable={false}
                  dateClick={handleDateClick}
                  eventClick={handleEventClick}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventContent={renderEventContent}
                  businessHours={{
                    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
                    startTime: "06:00",
                    endTime: "22:00",
                  }}
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00"
                  allDaySlot={false}
                  nowIndicator={true}
                  dayMaxEvents={3}
                  height="auto"
                  contentHeight={650}
                  expandRows={true}
                  stickyHeaderDates={true}
                  handleWindowResize={true}
                  eventTimeFormat={{
                    hour: "2-digit",
                    minute: "2-digit",
                    meridiem: false,
                    hour12: false,
                  }}
                />
              </div>

                {/* 우측 패널: 선택 날짜 수업 일정 리스트 */}
                <div className="w-[280px] flex-shrink-0 bg-surface rounded-xl border border-line shadow-xs overflow-hidden">
                  {/* 날짜 선택 헤더 */}
                  <div className="px-md py-sm bg-surface-secondary border-b border-line flex items-center justify-between">
                    <button
                      type="button"
                      className="p-xs hover:bg-surface-tertiary rounded transition-colors"
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                      }}
                    >
                      <ChevronLeft size={14} className="text-content-secondary" />
                    </button>
                    <span className="text-[13px] font-bold text-content">
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                    </span>
                    <button
                      type="button"
                      className="p-xs hover:bg-surface-tertiary rounded transition-colors"
                      onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                      }}
                    >
                      <ChevronRight size={14} className="text-content-secondary" />
                    </button>
                  </div>
                  {/* 일정 수 요약 */}
                  <div className="px-md py-xs border-b border-line bg-surface flex items-center justify-between">
                    <span className="text-[11px] text-content-secondary">조회 일정</span>
                    <span className="text-[12px] font-bold text-primary">{selectedDateSchedules.length}건</span>
                  </div>
                  {/* 일정 리스트 */}
                  <div className="divide-y divide-line max-h-[600px] overflow-y-auto">
                    {selectedDateSchedules.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-xl text-center">
                        <BookOpen size={28} className="text-content-secondary mb-sm opacity-40" />
                        <p className="text-[12px] text-content-secondary">해당 날짜에 수업이 없습니다.</p>
                      </div>
                    ) : (
                      selectedDateSchedules.map(s => {
                        const isFull = s.currentCount >= s.capacity;
                        const color = s.lessonColor ?? "#3b82f6";
                        return (
                          <div key={s.id} className="px-md py-sm hover:bg-surface-secondary transition-colors">
                            <div className="flex items-start justify-between gap-xs mb-xs">
                              <div className="flex items-center gap-xs min-w-0">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0 mt-[3px]"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-[13px] font-semibold text-content truncate">{s.lessonName}</span>
                              </div>
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-xs py-[1px] rounded-full flex-shrink-0",
                                  isFull
                                    ? "bg-state-error/10 text-state-error"
                                    : "bg-state-success/10 text-state-success"
                                )}
                              >
                                {isFull ? "마감" : "여유"}
                              </span>
                            </div>
                            <div className="flex items-center gap-xs text-[11px] text-content-secondary mb-[2px]">
                              <Clock size={10} />
                              <span>
                                {new Date(s.startAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                                {" ~ "}
                                {new Date(s.endAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            {s.instructorName && (
                              <div className="flex items-center gap-xs text-[11px] text-content-secondary mb-[2px]">
                                <Users size={10} />
                                <span>{s.instructorName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-xs text-[11px]">
                              <Users size={10} className="text-content-secondary" />
                              <span className={cn("font-semibold", isFull ? "text-state-error" : "text-content-secondary")}>
                                {s.currentCount}/{s.capacity}명
                              </span>
                              {/* 정원 바 */}
                              <div className="flex-1 h-1 bg-surface-tertiary rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full", isFull ? "bg-state-error" : "bg-state-success")}
                                  style={{ width: `${Math.min((s.currentCount / s.capacity) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
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
                data={penaltyData}
              />
            </div>
          )}

          {activeTab === "valid" && (
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-content">
                  유효 수업 목록
                  <span className="ml-sm text-[13px] font-normal text-content-secondary">({lessons.length}개)</span>
                </h3>
              </div>
              {lessons.length === 0 ? (
                <div className="bg-surface rounded-xl border border-line p-xxl text-center shadow-xs">
                  <div className="w-16 h-16 bg-surface-tertiary rounded-full flex items-center justify-center mx-auto mb-lg">
                    <BookOpen size={32} className="text-content-secondary" />
                  </div>
                  <h3 className="text-[15px] font-bold text-content mb-xs">등록된 유효 수업이 없습니다</h3>
                  <p className="text-[13px] text-content-secondary">수업 관리 페이지에서 수업을 등록해주세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
                  {lessons.map(lesson => {
                    const color = lesson.color ?? "#3b82f6";
                    return (
                      <div
                        key={lesson.id}
                        className="bg-surface rounded-xl border border-line shadow-xs hover:shadow-card transition-shadow overflow-hidden"
                      >
                        {/* 색상 헤더 바 */}
                        <div className="h-1.5" style={{ backgroundColor: color }} />
                        <div className="p-md space-y-sm">
                          <div className="flex items-start justify-between gap-xs">
                            <h4 className="text-[14px] font-bold text-content leading-tight">{lesson.name}</h4>
                            <span
                              className="text-[10px] font-semibold px-xs py-[2px] rounded-full flex-shrink-0"
                              style={{ backgroundColor: color + "20", color }}
                            >
                              {lesson.type}
                            </span>
                          </div>
                          <div className="space-y-xs text-[12px] text-content-secondary">
                            {lesson.instructorName && (
                              <div className="flex items-center gap-xs">
                                <Users size={12} className="flex-shrink-0" />
                                <span>{lesson.instructorName}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-xs">
                              <Users size={12} className="flex-shrink-0" />
                              <span>정원 {lesson.capacity}명</span>
                            </div>
                            {lesson.duration > 0 && (
                              <div className="flex items-center gap-xs">
                                <Clock size={12} className="flex-shrink-0" />
                                <span>{lesson.duration}분</span>
                              </div>
                            )}
                          </div>
                          <div className="pt-xs border-t border-line flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-state-success flex items-center gap-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-state-success inline-block" />
                              활성
                            </span>
                            <div
                              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: color }}
                              title="수업 색상"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* UI-126 일정 상세 모달 */}
      {isDetailModalOpen && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={() => { setIsDetailModalOpen(false); setIsAddModalOpen(true); }}
          onDelete={handleDeleteClass}
          onApprove={handleApproveEvent}
          onReject={handleRejectEvent}
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

              {/* #17 일정 분류 */}
              <div className="border border-line rounded-xl p-lg space-y-md">
                <h3 className="text-[13px] font-bold text-content">일정 분류</h3>
                <div>
                  <label className="block text-[12px] font-semibold text-content-secondary mb-sm">분류 선택</label>
                  <div className="flex flex-wrap gap-xs">
                    <button
                      type="button"
                      onClick={() => setFormScheduleCategory("")}
                      className={cn(
                        "h-8 px-md rounded-full text-[12px] font-semibold border transition-all",
                        !formScheduleCategory
                          ? "bg-primary text-white border-primary"
                          : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                      )}
                    >
                      없음
                    </button>
                    {SCHEDULE_CATEGORIES.map(cat => {
                      const color = SCHEDULE_COLORS[cat] ?? '#6B7280';
                      const isSelected = formScheduleCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormScheduleCategory(cat)}
                          className="h-8 px-md rounded-full text-[12px] font-semibold border transition-all"
                          style={isSelected
                            ? { backgroundColor: color, color: '#fff', borderColor: color }
                            : { backgroundColor: color + '15', color, borderColor: color + '40' }
                          }
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* #16 대상 유형 */}
              <div className="border border-line rounded-xl p-lg space-y-md">
                <h3 className="text-[13px] font-bold text-content">대상 설정</h3>
                <div>
                  <label className="block text-[12px] font-semibold text-content-secondary mb-sm">대상 유형</label>
                  <div className="flex items-center gap-sm">
                    {(["회원", "비회원", "직원"] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormTargetType(t)}
                        className={cn(
                          "h-9 px-lg rounded-lg text-[12px] font-semibold border transition-all",
                          formTargetType === t
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-secondary text-content-secondary border-line hover:border-primary hover:text-primary"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {formTargetType === "회원" && (
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">회원명</label>
                    <input
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      placeholder="회원명을 입력하세요"
                      value={formTargetName}
                      onChange={e => setFormTargetName(e.target.value)}
                    />
                  </div>
                )}
                {formTargetType === "비회원" && (
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">이름</label>
                      <input
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        placeholder="이름 입력"
                        value={formTargetName}
                        onChange={e => setFormTargetName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-content-secondary mb-sm">연락처</label>
                      <input
                        className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                        placeholder="010-0000-0000"
                        value={formTargetPhone}
                        onChange={e => setFormTargetPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {formTargetType === "직원" && (
                  <div>
                    <label className="block text-[12px] font-semibold text-content-secondary mb-sm">직원 선택</label>
                    <select
                      className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
                      value={formTargetStaff}
                      onChange={e => setFormTargetStaff(e.target.value)}
                    >
                      <option value="">직원을 선택하세요</option>
                      {instructors.map(i => (
                        <option key={i.id} value={i.id}>{i.name} ({i.type})</option>
                      ))}
                    </select>
                  </div>
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
