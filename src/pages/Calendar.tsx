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
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Trash2,
  UserPlus,
  UserMinus,
  Settings2,
  AlertTriangle,
  Lock
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import { SearchFilter } from "@/components/SearchFilter";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

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

const MOCK_EVENTS = [
  {
    id: "E1",
    title: "그룹 필라테스",
    instructor: "김태희",
    instructorId: "1",
    start: "2026-03-11T09:00:00",
    end: "2026-03-11T10:00:00",
    room: "필라테스룸",
    capacity: 14,
    currentCount: 8,
    status: "예약"
  },
  {
    id: "E2",
    title: "그룹 요가",
    instructor: "이효리",
    instructorId: "2",
    start: "2026-03-11T11:00:00",
    end: "2026-03-11T12:00:00",
    room: "GX룸",
    capacity: 14,
    currentCount: 14,
    status: "완료"
  },
  {
    id: "E3",
    title: "그룹 스피닝",
    instructor: "박재범",
    instructorId: "4",
    start: "2026-03-12T10:00:00",
    end: "2026-03-12T11:00:00",
    room: "스피닝룸",
    capacity: 21,
    currentCount: 15,
    status: "예약"
  },
  {
    id: "E4",
    title: "PT 세션",
    instructor: "정지훈",
    instructorId: "3",
    start: "2026-02-10T14:00:00",  // 과거 날짜
    end: "2026-02-10T15:00:00",
    room: "PT룸",
    capacity: 1,
    currentCount: 1,
    status: "완료"
  },
  {
    id: "E5",
    title: "그룹 줌바",
    instructor: "유재석",
    instructorId: "5",
    start: "2026-03-13T14:00:00",
    end: "2026-03-13T15:00:00",
    room: "GX룸",
    capacity: 16,
    currentCount: 10,
    status: "예약"
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

// --- 트레이너 색상 매핑 ---
const TRAINER_COLORS: Record<string, { bg: string; border: string; text: string; light: string }> = {
  "1": { bg: "bg-rose-100", border: "border-rose-400", text: "text-rose-700", light: "bg-rose-50" },
  "2": { bg: "bg-violet-100", border: "border-violet-400", text: "text-violet-700", light: "bg-violet-50" },
  "3": { bg: "bg-sky-100", border: "border-sky-400", text: "text-sky-700", light: "bg-sky-50" },
  "4": { bg: "bg-amber-100", border: "border-amber-400", text: "text-amber-700", light: "bg-amber-50" },
  "5": { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-700", light: "bg-emerald-50" },
};

const DEFAULT_COLOR = { bg: "bg-gray-100", border: "border-gray-400", text: "text-gray-700", light: "bg-gray-50" };

// --- 충돌 감지 함수 ---
interface EventLike {
  id: string;
  instructor: string;
  instructorId: string;
  room: string;
  start: string;
  end: string;
  title: string;
}

function validateConflict(
  newStart: string,
  newEnd: string,
  newInstructorId: string,
  newRoom: string,
  events: EventLike[],
  excludeId?: string
): { hasConflict: boolean; message: string } {
  const start = new Date(newStart).getTime();
  const end = new Date(newEnd).getTime();

  for (const ev of events) {
    if (excludeId && ev.id === excludeId) continue;
    const evStart = new Date(ev.start).getTime();
    const evEnd = new Date(ev.end).getTime();
    const overlaps = start < evEnd && end > evStart;
    if (!overlaps) continue;

    if (ev.instructorId === newInstructorId) {
      const trainer = MOCK_INSTRUCTORS.find(i => i.id === newInstructorId);
      return {
        hasConflict: true,
        message: `해당 시간에 ${trainer?.name ?? "해당 트레이너"}의 수업이 이미 있습니다. (${ev.title})`,
      };
    }
    if (ev.room === newRoom) {
      return {
        hasConflict: true,
        message: `해당 시간에 ${newRoom}은 이미 사용 중입니다. (${ev.title})`,
      };
    }
  }
  return { hasConflict: false, message: "" };
}

// --- 과거 여부 + 수정 가능 시간 체크 ---
function isEventEditable(startStr: string): { editable: boolean; reason: string } {
  const now = new Date();
  const start = new Date(startStr);

  if (start < now) {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (start < startOfToday) {
      return { editable: false, reason: "과거 일정은 수정할 수 없습니다." };
    }
    // 당일이지만 이미 지난 경우
    return { editable: false, reason: "이미 시작된 수업은 수정할 수 없습니다." };
  }

  const twoHoursBefore = new Date(start.getTime() - 2 * 60 * 60 * 1000);
  if (now >= twoHoursBefore) {
    return { editable: false, reason: "수업 시작 2시간 전까지만 수정할 수 있습니다." };
  }

  return { editable: true, reason: "" };
}

// --- Sub-components ---

interface CalendarGridProps {
  viewType: string;
  events: typeof MOCK_EVENTS;
  onEventClick: (event: typeof MOCK_EVENTS[0]) => void;
}

const CalendarGrid = ({ viewType, events, onEventClick }: CalendarGridProps) => {
  const hours = Array.from({ length: 14 }, (_, i) => i + 8);
  const days = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="bg-3 rounded-card-normal border border-border-light overflow-hidden shadow-card-soft">
      <div className="grid grid-cols-8 border-b border-border-light bg-bg-main-light-blue/30">
        <div className="p-md border-r border-border-light text-center text-Label text-text-grey-blue font-bold">시간</div>
        {days.map((day, idx) => (
          <div className="p-md border-r border-border-light text-center last:border-r-0" key={idx}>
            <div className="text-Label text-text-grey-blue">{day}</div>
            <div className="text-Body font-bold text-text-dark-grey">11 ~ 17</div>
          </div>
        ))}
      </div>
      <div className="h-[600px] overflow-y-auto scrollbar-hide">
        {hours.map((hour) => (
          <div className="grid grid-cols-8 border-b border-border-light last:border-b-0" key={hour}>
            <div className="p-sm border-r border-border-light text-center text-[10px] text-text-grey-blue font-medium">
              {hour}:00
            </div>
            {days.map((_, dayIdx) => {
              const currentHourEvents = events.filter((e) => {
                const eventDate = new Date(e.start);
                return eventDate.getHours() === hour && eventDate.getDay() === dayIdx;
              });

              return (
                <div
                  className="p-xs border-r border-border-light last:border-r-0 min-h-[60px] relative hover:bg-bg-soft-peach/10 transition-colors cursor-pointer"
                  key={dayIdx}
                >
                  {currentHourEvents.map((event) => {
                    const colors = TRAINER_COLORS[event.instructorId] ?? DEFAULT_COLOR;
                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "p-sm rounded-md text-[10px] mb-xs shadow-sm border-l-4 cursor-pointer hover:opacity-80 transition-opacity",
                          colors.bg,
                          colors.border,
                          colors.text
                        )}
                        onClick={() => onEventClick(event)}
                      >
                        <div className="font-bold truncate">{event.title}</div>
                        <div className="flex items-center gap-xs mt-[2px]">
                          <Users size={8} />
                          <span>{event.currentCount}/{event.capacity}</span>
                          <span className="mx-xs opacity-50">|</span>
                          <span className="truncate">{event.instructor}</span>
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

// --- 이벤트 상세 모달 ---
interface EventDetailModalProps {
  event: typeof MOCK_EVENTS[0];
  onClose: () => void;
  onEdit: () => void;
}

const EventDetailModal = ({ event, onClose, onEdit }: EventDetailModalProps) => {
  const { editable, reason } = isEventEditable(event.start);
  const colors = TRAINER_COLORS[event.instructorId] ?? DEFAULT_COLOR;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-3 rounded-modal w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className={cn("px-xl py-lg border-b border-border-light flex items-center justify-between", colors.light)}>
          <div className="flex items-center gap-sm">
            <div className={cn("w-3 h-3 rounded-full", colors.border.replace("border-", "bg-"))} />
            <h2 className="text-Heading font-bold text-text-dark-grey">{event.title}</h2>
          </div>
          <button className="p-sm hover:bg-2 rounded-full transition-colors" onClick={onClose}>
            <XCircle className="text-text-grey-blue" size={20} />
          </button>
        </div>

        <div className="p-xl space-y-md">
          <div className="grid grid-cols-2 gap-md text-Body text-text-dark-grey">
            <div className="flex items-center gap-sm">
              <Users size={16} className="text-text-grey-blue" />
              <span>{event.instructor} 강사</span>
            </div>
            <div className="flex items-center gap-sm">
              <MapPin size={16} className="text-text-grey-blue" />
              <span>{event.room}</span>
            </div>
            <div className="flex items-center gap-sm">
              <Clock size={16} className="text-text-grey-blue" />
              <span>
                {new Date(event.start).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                {" ~ "}
                {new Date(event.end).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="flex items-center gap-sm">
              <Users size={16} className="text-text-grey-blue" />
              <span>예약 {event.currentCount} / {event.capacity}명</span>
            </div>
          </div>

          {!editable && (
            <div className="flex items-start gap-sm p-md bg-bg-soft-peach/50 rounded-card-normal border border-primary-coral/20">
              <Lock size={16} className="text-primary-coral mt-[2px] flex-shrink-0" />
              <p className="text-Label text-primary-coral font-medium">{reason}</p>
            </div>
          )}
        </div>

        <div className="px-xl py-lg border-t border-border-light flex items-center justify-end gap-md">
          <button
            className="px-lg py-sm rounded-button text-Label font-semibold text-error border border-error/30 hover:bg-error/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!editable}
          >
            <Trash2 size={14} className="inline mr-xs" />
            삭제
          </button>
          <button
            className="px-xl py-sm rounded-button bg-primary-coral text-white text-Label font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

// --- 충돌 경고 모달 ---
interface ConflictModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConflictModal = ({ message, onConfirm, onCancel }: ConflictModalProps) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-md">
    <div className="bg-3 rounded-modal w-full max-w-[400px] shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className="px-xl py-lg border-b border-border-light flex items-center gap-sm">
        <AlertTriangle className="text-amber-500" size={22} />
        <h2 className="text-Heading font-bold text-text-dark-grey">수업 일정 충돌</h2>
      </div>
      <div className="p-xl">
        <p className="text-Body text-text-dark-grey">{message}</p>
        <p className="text-Label text-text-grey-blue mt-sm">그래도 등록하시겠습니까?</p>
      </div>
      <div className="px-xl py-lg border-t border-border-light flex items-center justify-end gap-md">
        <button
          className="px-xl py-sm rounded-button text-Label font-semibold text-text-grey-blue hover:bg-2 transition-all"
          onClick={onCancel}
        >
          취소
        </button>
        <button
          className="px-xl py-sm rounded-button bg-amber-500 text-white text-Label font-bold hover:opacity-90 transition-all"
          onClick={onConfirm}
        >
          그래도 등록
        </button>
      </div>
    </div>
  </div>
);

// --- 트레이너 범례 ---
const TrainerLegend = () => (
  <div className="flex flex-wrap items-center gap-sm">
    {MOCK_INSTRUCTORS.map((instructor) => {
      const colors = TRAINER_COLORS[instructor.id] ?? DEFAULT_COLOR;
      return (
        <div key={instructor.id} className="flex items-center gap-xs">
          <div className={cn("w-3 h-3 rounded-sm border-l-4", colors.border)} />
          <span className="text-Label text-text-grey-blue">{instructor.name}</span>
        </div>
      );
    })}
  </div>
);

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [calendarView, setCalendarView] = useState("week");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<typeof MOCK_EVENTS[0] | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<{ hasConflict: boolean; message: string } | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 수업 등록 폼 상태
  const [formInstructorId, setFormInstructorId] = useState(MOCK_INSTRUCTORS[0].id);
  const [formRoom, setFormRoom] = useState(MOCK_ROOMS[0].name);
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");

  const tabs = [
    { key: "schedule", label: "일정표", icon: CalendarIcon },
    { key: "classes", label: "수업 관리", count: MOCK_CLASS_MANAGEMENT.length },
    { key: "counts", label: "횟수 관리" },
    { key: "penalty", label: "페널티 관리", count: MOCK_PENALTY.length },
    { key: "valid", label: "유효 수업 목록" },
  ];

  const handleTabChange = (key: string) => setActiveTab(key);

  const handleAddClass = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: typeof MOCK_EVENTS[0]) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  const handleDetailEdit = () => {
    setIsDetailModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (formDate && formStartTime && formEndTime) {
      const startStr = `${formDate}T${formStartTime}:00`;
      const endStr = `${formDate}T${formEndTime}:00`;
      const result = validateConflict(
        startStr,
        endStr,
        formInstructorId,
        formRoom,
        MOCK_EVENTS,
        selectedEvent?.id
      );
      if (result.hasConflict) {
        setConflictInfo(result);
        setPendingSubmit(true);
        return;
      }
    }
    setIsModalOpen(false);
  };

  const handleConflictConfirm = () => {
    setConflictInfo(null);
    setPendingSubmit(false);
    setIsModalOpen(false);
  };

  const handleConflictCancel = () => {
    setConflictInfo(null);
    setPendingSubmit(false);
  };

  const filters: import("@/components/SearchFilter").FilterOption[] = [
    {
      key: "instructor",
      label: "강사 선택",
      type: "select",
      options: MOCK_INSTRUCTORS.map(i => ({ value: i.id, label: `${i.name} (${i.type})` }))
    },
    {
      key: "status",
      label: "처리 상태",
      type: "select",
      options: [
        { value: "all", label: "전체" },
        { value: "reserved", label: "예약" },
        { value: "completed", label: "완료" }
      ]
    },
    {
      key: "room",
      label: "장소(룸) 필터",
      type: "select",
      options: MOCK_ROOMS.map(r => ({ value: r.id, label: r.name }))
    }
  ];

  return (
    <AppLayout>
      <PageHeader
        title="수업/캘린더"
        description="PT 및 그룹 수업 스케줄을 관리하고 회원의 예약 현황을 확인합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint hover:bg-secondary-mint hover:text-white transition-all rounded-button text-Label font-semibold">
              <Settings2 size={16} />
              스케줄 일괄 변경
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white hover:opacity-90 transition-all rounded-button text-Label font-semibold shadow-card-soft"
              onClick={handleAddClass}
            >
              <Plus size={16} />
              수업 등록
            </button>
          </div>
        }
      />

      <TabNav className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="space-y-lg">
        {activeTab === "schedule" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-3 p-md rounded-card-normal border border-border-light shadow-card-soft">
              <div className="flex items-center gap-md">
                <div className="flex items-center bg-input-bg-light rounded-button p-xs">
                  {(["month", "week", "day"] as const).map((view, idx) => (
                    <button
                      key={view}
                      className={cn(
                        "px-lg py-xs text-Label font-bold rounded-button transition-all",
                        calendarView === view ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                      )}
                      onClick={() => setCalendarView(view)}
                    >
                      {["월", "주", "일"][idx]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-sm">
                  <button className="p-xs rounded-full hover:bg-2 text-text-grey-blue">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-Body font-bold text-text-dark-grey">2026.03.11 ~ 2026.03.17</span>
                  <button className="p-xs rounded-full hover:bg-2 text-text-grey-blue">
                    <ChevronRight size={20} />
                  </button>
                  <button className="px-md py-xs border border-border-light rounded-button text-Label font-semibold text-text-grey-blue hover:bg-2">
                    오늘
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-sm">
                <SearchFilter filters={filters} searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="수업명, 강사명 검색..." />
              </div>
            </div>

            {/* 트레이너 색상 범례 */}
            <div className="bg-3 rounded-card-normal border border-border-light px-lg py-sm shadow-card-soft">
              <div className="flex items-center gap-md">
                <span className="text-Label text-text-grey-blue font-semibold flex-shrink-0">강사 범례</span>
                <TrainerLegend />
              </div>
            </div>

            <CalendarGrid viewType={calendarView} events={MOCK_EVENTS} onEventClick={handleEventClick} />
          </>
        )}

        {activeTab === "classes" && (
          <div className="space-y-md">
            <SearchFilter filters={filters} searchValue={searchQuery} onSearchChange={setSearchQuery} />
            <DataTable
              columns={[
                { key: "name", header: "수업명", sortable: true },
                { key: "type", header: "유형" },
                { key: "instructor", header: "강사", sortable: true },
                { key: "room", header: "장소" },
                { key: "schedule", header: "스케줄" },
                {
                  key: "status",
                  header: "상태",
                  render: (val: string) => (
                    <StatusBadge
                      status={val === "진행중" ? "success" : val === "마감" ? "error" : "warning"}
                      label={val}
                    />
                  )
                },
                {
                  key: "actions",
                  header: "관리",
                  align: "center",
                  render: () => (
                    <button className="p-sm hover:bg-2 rounded-full text-text-grey-blue">
                      <MoreHorizontal size={16} />
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
          <div className="bg-3 rounded-card-normal border border-border-light p-xxl text-center shadow-card-soft">
            <div className="w-20 h-20 bg-bg-soft-peach rounded-full flex items-center justify-center text-primary-coral mx-auto mb-lg">
              <Clock size={40} />
            </div>
            <h3 className="text-Heading text-text-dark-grey mb-xs">횟수 관리 서비스 준비 중</h3>
            <p className="text-Body text-text-grey-blue">회원별 수강권 잔여 횟수 및 소진 내역을 관리하는 기능이 곧 제공될 예정입니다.</p>
          </div>
        )}

        {activeTab === "penalty" && (
          <div className="space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="text-Heading text-text-dark-grey">페널티 부여 내역</h3>
              <div className="flex items-center gap-sm">
                <button className="flex items-center gap-xs px-md py-sm border border-border-light rounded-button text-Label font-semibold text-text-grey-blue hover:bg-2">
                  <Filter size={14} />
                  필터
                </button>
              </div>
            </div>
            <DataTable
              columns={[
                {
                  key: "memberName",
                  header: "회원명",
                  sortable: true,
                  render: (val: string) => (
                    <button
                      className="text-primary-coral font-bold hover:underline"
                      onClick={() => moveToPage(985)}
                    >
                      {val}
                    </button>
                  )
                },
                { key: "className", header: "수업명" },
                { key: "date", header: "날짜", sortable: true },
                { key: "type", header: "페널티 유형" },
                { key: "points", header: "부여 벌점", align: "center" },
                {
                  key: "status",
                  header: "처리 상태",
                  render: (val: string) => (
                    <StatusBadge
                      status={val === "벌점부여" ? "error" : "warning"}
                      label={val}
                    />
                  )
                },
                {
                  key: "actions",
                  header: "관리",
                  align: "center",
                  render: () => (
                    <div className="flex items-center gap-xs">
                      <button className="p-xs text-text-grey-blue hover:text-primary-coral" title="수정"><Settings2 size={16} /></button>
                      <button className="p-xs text-text-grey-blue hover:text-error" title="취소"><Trash2 size={16} /></button>
                    </div>
                  )
                }
              ]}
              data={MOCK_PENALTY}
            />
          </div>
        )}

        {activeTab === "valid" && (
          <DataTable
            columns={[
              { key: "title", header: "수업명", sortable: true },
              { key: "instructor", header: "강사" },
              { key: "start", header: "시작 시간", sortable: true, render: (val: string) => val.split("T")[1].substring(0, 5) },
              { key: "room", header: "장소" },
              { key: "capacity", header: "정원", align: "center" },
              { key: "currentCount", header: "예약 인원", align: "center" },
              {
                key: "status",
                header: "상태",
                render: (val: string) => (
                  <StatusBadge
                    status={val === "예약" ? "info" : "success"}
                    label={val}
                  />
                )
              }
            ]}
            data={MOCK_EVENTS}
            title="오늘의 유효 수업 목록"
          />
        )}
      </div>

      {/* 이벤트 상세 모달 */}
      {isDetailModalOpen && selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setIsDetailModalOpen(false)}
          onEdit={handleDetailEdit}
        />
      )}

      {/* 충돌 경고 모달 */}
      {conflictInfo?.hasConflict && (
        <ConflictModal
          message={conflictInfo.message}
          onConfirm={handleConflictConfirm}
          onCancel={handleConflictCancel}
        />
      )}

      {/* 수업 등록/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
          <div className="bg-3 rounded-modal w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="sticky top-0 bg-3 px-xl py-lg border-b border-border-light flex items-center justify-between z-10">
              <h2 className="text-Heading font-bold text-text-dark-grey">{selectedEvent ? "수업 수정" : "새 수업 등록"}</h2>
              <button className="p-sm hover:bg-2 rounded-full transition-colors" onClick={() => setIsModalOpen(false)}>
                <XCircle className="text-text-grey-blue" size={24} />
              </button>
            </div>

            <div className="p-xl space-y-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl">
                <div className="space-y-lg">
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">수업 템플릿 <span className="text-error">*</span></label>
                    <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none">
                      <option>템플릿을 선택하세요</option>
                      {MOCK_CLASS_TYPES.map(t => <option key={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">수업명 <span className="text-error">*</span></label>
                    <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none" placeholder="수업 이름을 입력하세요" />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-Label text-text-grey-blue mb-sm">수업 유형 <span className="text-error">*</span></label>
                      <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none">
                        <option>그룹 수업</option>
                        <option>PT / OT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-Label text-text-grey-blue mb-sm">정원수 <span className="text-error">*</span></label>
                      <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="number" defaultValue={14} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">담당 강사 <span className="text-error">*</span></label>
                    <select
                      className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                      value={formInstructorId}
                      onChange={e => setFormInstructorId(e.target.value)}
                    >
                      {MOCK_INSTRUCTORS.map(i => <option key={i.id} value={i.id}>{i.name} ({i.type})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-lg">
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">수업 날짜 <span className="text-error">*</span></label>
                    <input
                      className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                      type="date"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div>
                      <label className="block text-Label text-text-grey-blue mb-sm">시작 시간 <span className="text-error">*</span></label>
                      <input
                        className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-Label text-text-grey-blue mb-sm">종료 시간 <span className="text-error">*</span></label>
                      <input
                        className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">반복 설정</label>
                    <div className="p-md bg-bg-main-light-blue/50 rounded-card-normal space-y-md">
                      <div className="flex flex-wrap gap-xs">
                        {["월", "화", "수", "목", "금", "토", "일"].map(day => (
                          <button
                            key={day}
                            className="w-10 h-10 rounded-full bg-3 border border-border-light text-Label font-bold text-text-grey-blue hover:border-primary-coral hover:text-primary-coral transition-colors"
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-sm">
                        <input className="flex-1 h-10 rounded-input bg-3 border border-border-light px-md text-Body outline-none" type="date" placeholder="시작일" />
                        <span className="text-text-grey-blue">~</span>
                        <input className="flex-1 h-10 rounded-input bg-3 border border-border-light px-md text-Body outline-none" type="date" placeholder="종료일" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">장소(룸) 선택 <span className="text-error">*</span></label>
                    <select
                      className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                      value={formRoom}
                      onChange={e => setFormRoom(e.target.value)}
                    >
                      {MOCK_ROOMS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">예약 방식 <span className="text-error">*</span></label>
                    <div className="flex gap-md">
                      {["현장", "모바일"].map((type) => (
                        <label key={type} className="flex-1 flex items-center justify-center h-12 rounded-input bg-input-bg-light cursor-pointer hover:bg-bg-soft-peach/50 transition-colors">
                          <input className="hidden peer" type="radio" name="reservation_type" defaultChecked={type === "모바일"} />
                          <span className="text-Body font-medium text-text-grey-blue peer-checked:text-primary-coral peer-checked:font-bold">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">모바일 예약 가능 인원</label>
                    <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="number" placeholder="제한 없음" />
                  </div>
                  <div>
                    <label className="block text-Label text-text-grey-blue mb-sm">예약 공개 방식 <span className="text-error">*</span></label>
                    <div className="flex gap-md">
                      {["공개", "비공개", "공개예약"].map((type) => (
                        <label key={type} className="flex-1 flex items-center justify-center h-12 rounded-input bg-input-bg-light cursor-pointer hover:bg-bg-soft-peach/50 transition-colors">
                          <input className="hidden peer" type="radio" name="visibility" defaultChecked={type === "공개"} />
                          <span className="text-Body font-medium text-text-grey-blue peer-checked:text-primary-coral peer-checked:font-bold">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-Label text-text-grey-blue mb-sm">수업 메모</label>
                <textarea
                  className="w-full h-24 rounded-input bg-input-bg-light border-none p-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none resize-none"
                  placeholder="강사나 회원에게 전달할 메모를 입력하세요"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-bg-main-light-blue/50 backdrop-blur-sm px-xl py-lg border-t border-border-light flex items-center justify-end gap-md z-10">
              <button
                className="px-xl py-md rounded-button text-Body font-bold text-text-grey-blue hover:bg-7 transition-all"
                onClick={() => setIsModalOpen(false)}
              >
                취소
              </button>
              <button
                className="px-xxl py-md rounded-button bg-primary-coral text-white text-Body font-bold shadow-md hover:opacity-90 transition-all"
                onClick={handleSubmit}
              >
                {selectedEvent ? "수정 완료" : "수업 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
