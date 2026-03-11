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
  Settings2
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
    start: "2026-02-19T09:00:00", 
    end: "2026-02-19T10:00:00", 
    room: "필라테스룸", 
    capacity: 14, 
    currentCount: 8, 
    status: "예약" 
  },
  { 
    id: "E2", 
    title: "그룹 요가", 
    instructor: "이효리", 
    start: "2026-02-19T11:00:00", 
    end: "2026-02-19T12:00:00", 
    room: "GX룸", 
    capacity: 14, 
    currentCount: 14, 
    status: "완료" 
  },
  { 
    id: "E3", 
    title: "그룹 스피닝", 
    instructor: "박재범", 
    start: "2026-02-20T10:00:00", 
    end: "2026-02-20T11:00:00", 
    room: "스피닝룸", 
    capacity: 21, 
    currentCount: 15, 
    status: "예약" 
  },
  { 
    id: "E4", 
    title: "PT 세션", 
    instructor: "정지훈", 
    start: "2026-02-19T14:00:00", 
    end: "2026-02-19T15:00:00", 
    room: "PT룸", 
    capacity: 1, 
    currentCount: 1, 
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

// --- Sub-components ---

const CalendarGrid = ({ viewType, events }: { viewType: string; events: any[] }) => {
  // Simplified calendar grid for demonstration
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 08:00 to 21:00
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  
  return (
    <div className="bg-3 rounded-card-normal border border-border-light overflow-hidden shadow-card-soft" >
      <div className="grid grid-cols-8 border-b border-border-light bg-bg-main-light-blue/30" >
        <div className="p-md border-r border-border-light text-center text-Label text-text-grey-blue font-bold" >시간</div>
        {days.map((day, idx) => (
          <div className="p-md border-r border-border-light text-center last:border-r-0" key={idx}>
            <div className="text-Label text-text-grey-blue" >{day}</div>
            <div className="text-Body 1 font-bold text-text-dark-grey" >{15 + idx}</div>
          </div>
        ))}
      </div>
      <div className="h-[600px] overflow-y-auto scrollbar-hide" >
        {hours.map((hour) => (
          <div className="grid grid-cols-8 border-b border-border-light last:border-b-0" key={hour}>
            <div className="p-sm border-r border-border-light text-center text-[10px] text-text-grey-blue font-medium" >
              {hour}:00
            </div>
            {days.map((_, dayIdx) => {
              const currentHourEvents = events.filter((e: any) => {
                const eventDate = new Date(e.start);
                return eventDate.getHours() === hour && (eventDate.getDay() === dayIdx);
              });

              return (
                <div className="p-xs border-r border-border-light last:border-r-0 min-h-[60px] relative hover:bg-bg-soft-peach/10 transition-colors cursor-pointer" key={dayIdx}>
                  {currentHourEvents.map((event: any) => (
                    <div
                      className={cn(
                        "p-sm rounded-md text-[10px] mb-xs shadow-sm border-l-4",
                        event.status === "완료" ? "bg-bg-soft-mint text-secondary-mint border-secondary-mint" : "bg-bg-soft-peach text-primary-coral border-primary-coral"
                      )} key={event.id}>
                      <div className="font-bold truncate" >{event.title}</div>
                      <div className="flex items-center gap-xs mt-[2px]" >
                        <Users size={8}/>
                        <span >{event.currentCount}/{event.capacity}</span>
                        <span className="mx-xs opacity-50" >|</span>
                        <span className="truncate" >{event.instructor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Calendar() {
  const [activeTab, setActiveTab] = useState("schedule");
  const [calendarView, setCalendarView] = useState("week"); // month, week, day
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const tabs = [
    { key: "schedule", label: "일정표", icon: CalendarIcon },
    { key: "classes", label: "수업 관리", count: MOCK_CLASS_MANAGEMENT.length },
    { key: "counts", label: "횟수 관리" },
    { key: "penalty", label: "페널티 관리", count: MOCK_PENALTY.length },
    { key: "valid", label: "유효 수업 목록" },
  ];

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const handleAddClass = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
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
    <AppLayout >
      <PageHeader title="수업/캘린더" description="PT 및 그룹 수업 스케줄을 관리하고 회원의 예약 현황을 확인합니다." actions={
          <div className="flex items-center gap-sm" >
            <button className="flex items-center gap-xs px-md py-sm bg-bg-soft-mint text-secondary-mint hover:bg-secondary-mint hover:text-white transition-all rounded-button text-Label font-semibold" >
              <Settings2 size={16}/>
              스케줄 일괄 변경
            </button>
            <button 
              className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white hover:opacity-90 transition-all rounded-button text-Label font-semibold shadow-card-soft"
              onClick={handleAddClass}>
              <Plus size={16}/>
              수업 등록
            </button>
          </div>
        }/>

      <TabNav className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange}/>

      {/* Tab Content */}
      <div className="space-y-lg" >
        {activeTab === "schedule" && (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-3 p-md rounded-card-normal border border-border-light shadow-card-soft" >
              <div className="flex items-center gap-md" >
                <div className="flex items-center bg-input-bg-light rounded-button p-xs" >
                  <button 
                    className={cn(
                      "px-lg py-xs text-Label font-bold rounded-button transition-all",
                      calendarView === "month" ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                    )} onClick={() => setCalendarView("month")}>
                    월
                  </button>
                  <button 
                    className={cn(
                      "px-lg py-xs text-Label font-bold rounded-button transition-all",
                      calendarView === "week" ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                    )} onClick={() => setCalendarView("week")}>
                    주
                  </button>
                  <button 
                    className={cn(
                      "px-lg py-xs text-Label font-bold rounded-button transition-all",
                      calendarView === "day" ? "bg-3 text-primary-coral shadow-sm" : "text-text-grey-blue hover:text-text-dark-grey"
                    )} onClick={() => setCalendarView("day")}>
                    일
                  </button>
                </div>
                <div className="flex items-center gap-sm" >
                  <button className="p-xs rounded-full hover:bg-2 text-text-grey-blue" >
                    <ChevronLeft size={20}/>
                  </button>
                  <span className="text-Body 1 font-bold text-text-dark-grey" >2026.02.15 ~ 2026.02.21</span>
                  <button className="p-xs rounded-full hover:bg-2 text-text-grey-blue" >
                    <ChevronRight size={20}/>
                  </button>
                  <button className="px-md py-xs border border-border-light rounded-button text-Label font-semibold text-text-grey-blue hover:bg-2" >
                    오늘
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-sm" >
                <SearchFilter filters={filters} searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="수업명, 강사명 검색..."/>
              </div>
            </div>
            
            <CalendarGrid viewType={calendarView} events={MOCK_EVENTS}/>
          </>
        )}

        {activeTab === "classes" && (
          <div className="space-y-md" >
             <SearchFilter filters={filters} searchValue={searchQuery} onSearchChange={setSearchQuery}/>
              <DataTable columns={[
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
                      <button className="p-sm hover:bg-2 rounded-full text-text-grey-blue" >
                        <MoreHorizontal size={16}/>
                      </button>
                    )
                  }
                ]} data={MOCK_CLASS_MANAGEMENT} title="수업 관리 목록" onDownloadExcel={() => {}}/>
          </div>
        )}

        {activeTab === "counts" && (
           <div className="bg-3 rounded-card-normal border border-border-light p-xxl text-center shadow-card-soft" >
             <div className="w-20 h-20 bg-bg-soft-peach rounded-full flex items-center justify-center text-primary-coral mx-auto mb-lg" >
               <Clock size={40}/>
             </div>
             <h3 className="text-Heading 2 text-text-dark-grey mb-xs" >횟수 관리 서비스 준비 중</h3>
             <p className="text-Body 2 text-text-grey-blue" >회원별 수강권 잔여 횟수 및 소진 내역을 관리하는 기능이 곧 제공될 예정입니다.</p>
           </div>
        )}

        {activeTab === "penalty" && (
          <div className="space-y-md" >
            <div className="flex items-center justify-between" >
              <h3 className="text-Heading 2 text-text-dark-grey" >페널티 부여 내역</h3>
              <div className="flex items-center gap-sm" >
                 <button className="flex items-center gap-xs px-md py-sm border border-border-light rounded-button text-Label font-semibold text-text-grey-blue hover:bg-2" >
                   <Filter size={14}/>
                   필터
                 </button>
              </div>
            </div>
            <DataTable columns={[
                { 
                  key: "memberName", 
                  header: "회원명", 
                  sortable: true,
                  render: (val, row) => (
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
                  render: (val) => (
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
                    <div className="flex items-center gap-xs" >
                      <button className="p-xs text-text-grey-blue hover:text-primary-coral" title="수정"><Settings2 size={16}/></button>
                      <button className="p-xs text-text-grey-blue hover:text-error" title="취소"><Trash2 size={16}/></button>
                    </div>
                  )
                }
              ]} data={MOCK_PENALTY}/>
          </div>
        )}

        {activeTab === "valid" && (
           <DataTable columns={[
              { key: "title", header: "수업명", sortable: true },
              { key: "instructor", header: "강사" },
              { key: "start", header: "시작 시간", sortable: true, render: (val) => val.split("T")[1].substring(0, 5) },
              { key: "room", header: "장소" },
              { key: "capacity", header: "정원", align: "center" },
              { key: "currentCount", header: "예약 인원", align: "center" },
              { 
                key: "status", 
                header: "상태",
                render: (val) => (
                  <StatusBadge 
                    status={val === "예약" ? "info" : "success"}
                    label={val}
                  />
                )
              }
            ]} data={MOCK_EVENTS} title="오늘의 유효 수업 목록"/>
        )}
      </div>

      {/* Class Registration Modal (Mockup) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md" >
          <div className="bg-3 rounded-modal w-full max-w-[800px] max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200" >
            <div className="sticky top-0 bg-3 px-xl py-lg border-b border-border-light flex items-center justify-between z-10" >
              <h2 className="text-Heading 2 text-text-dark-grey" >{selectedEvent ? "수업 수정" : "새 수업 등록"}</h2>
              <button className="p-sm hover:bg-2 rounded-full transition-colors" onClick={() => setIsModalOpen(false)}>
                <XCircle className="text-text-grey-blue" size={24}/>
              </button>
            </div>
            
            <div className="p-xl space-y-xl" >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" >
                <div className="space-y-lg" >
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >수업 템플릿 <span className="text-error" >*</span></label>
                    <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" >
                      <option >템플릿을 선택하세요</option>
                      {MOCK_CLASS_TYPES.map(t => <option key={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >수업명 <span className="text-error" >*</span></label>
                    <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" placeholder="수업 이름을 입력하세요"/>
                  </div>
                  <div className="grid grid-cols-2 gap-md" >
                    <div >
                      <label className="block text-Label text-text-grey-blue mb-sm" >수업 유형 <span className="text-error" >*</span></label>
                      <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 2 focus:ring-2 focus:ring-secondary-mint/30 outline-none" >
                        <option >그룹 수업</option>
                        <option >PT / OT</option>
                      </select>
                    </div>
                    <div >
                      <label className="block text-Label text-text-grey-blue mb-sm" >정원수 <span className="text-error" >*</span></label>
                      <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="number" defaultValue={14}/>
                    </div>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >담당 강사 <span className="text-error" >*</span></label>
                    <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" >
                      {MOCK_INSTRUCTORS.map(i => <option key={i.id}>{i.name} ({i.type})</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-lg" >
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >수업 날짜 <span className="text-error" >*</span></label>
                    <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="date"/>
                  </div>
                  <div className="grid grid-cols-2 gap-md" >
                    <div >
                      <label className="block text-Label text-text-grey-blue mb-sm" >시작 시간 <span className="text-error" >*</span></label>
                      <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="time"/>
                    </div>
                    <div >
                      <label className="block text-Label text-text-grey-blue mb-sm" >종료 시간 <span className="text-error" >*</span></label>
                      <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="time"/>
                    </div>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >반복 설정</label>
                    <div className="p-md bg-bg-main-light-blue/50 rounded-card-normal space-y-md" >
                      <div className="flex flex-wrap gap-xs" >
                        {["월", "화", "수", "목", "금", "토", "일"].map(day => (
                          <button className="w-10 h-10 rounded-full bg-3 border border-border-light text-Label font-bold text-text-grey-blue hover:border-primary-coral hover:text-primary-coral transition-colors" key={day}>
                            {day}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-sm" >
                        <input className="flex-1 h-10 rounded-input bg-3 border border-border-light px-md text-Body 2 outline-none" type="date" placeholder="시작일"/>
                        <span className="text-text-grey-blue" >~</span>
                        <input className="flex-1 h-10 rounded-input bg-3 border border-border-light px-md text-Body 2 outline-none" type="date" placeholder="종료일"/>
                      </div>
                    </div>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >장소(룸) 선택 <span className="text-error" >*</span></label>
                    <select className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" >
                      {MOCK_ROOMS.map(r => <option key={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >예약 방식 <span className="text-error" >*</span></label>
                    <div className="flex gap-md" >
                      {["현장", "모바일"].map((type) => (
                        <label className="flex-1 flex items-center justify-center h-12 rounded-input bg-input-bg-light cursor-pointer hover:bg-bg-soft-peach/50 transition-colors" key={type}>
                          <input className="hidden peer" type="radio" name="reservation_type" defaultChecked={type === "모바일"}/>
                          <span className="text-Body 2 font-medium text-text-grey-blue peer-checked:text-primary-coral peer-checked:font-bold" >{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >모바일 예약 가능 인원</label>
                    <input className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body 1 focus:ring-2 focus:ring-secondary-mint/30 outline-none" type="number" placeholder="제한 없음"/>
                  </div>
                  <div >
                    <label className="block text-Label text-text-grey-blue mb-sm" >예약 공개 방식 <span className="text-error" >*</span></label>
                    <div className="flex gap-md" >
                      {["공개", "비공개", "공개예약"].map((type) => (
                        <label className="flex-1 flex items-center justify-center h-12 rounded-input bg-input-bg-light cursor-pointer hover:bg-bg-soft-peach/50 transition-colors" key={type}>
                          <input className="hidden peer" type="radio" name="visibility" defaultChecked={type === "공개"}/>
                          <span className="text-Body 2 font-medium text-text-grey-blue peer-checked:text-primary-coral peer-checked:font-bold" >{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div >
                <label className="block text-Label text-text-grey-blue mb-sm" >수업 메모</label>
                <textarea 
                  className="w-full h-24 rounded-input bg-input-bg-light border-none p-md text-Body 2 focus:ring-2 focus:ring-secondary-mint/30 outline-none resize-none" placeholder="강사나 회원에게 전달할 메모를 입력하세요"/>
              </div>
            </div>

            <div className="sticky bottom-0 bg-bg-main-light-blue/50 backdrop-blur-sm px-xl py-lg border-t border-border-light flex items-center justify-end gap-md z-10" >
              <button 
                className="px-xl py-md rounded-button text-Body 1 font-bold text-text-grey-blue hover:bg-7 transition-all" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button 
                className="px-xxl py-md rounded-button bg-primary-coral text-white text-Body 1 font-bold shadow-md hover:opacity-90 transition-all" onClick={() => setIsModalOpen(false)}>
                {selectedEvent ? "수정 완료" : "수업 등록"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
