
import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Settings,
  Moon,
  Sun,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  MapPin,
  Clock,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ArrowRight,
  Plus,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

// 공통 컴포넌트 임포트
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { SearchFilter } from "@/components/SearchFilter";

/**
 * SCR-006: 출석 관리 (Attendance)
 * 회원의 방문(입퇴장) 이력을 관리하고 실시간 입장 알림을 제공하는 화면입니다.
 */

// --- 출석 유형 색상 ---
const ATTENDANCE_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "일반":  { bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300" },
  "PT":    { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  "GX":    { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-300" },
  "수동":  { bg: "bg-gray-100",   text: "text-gray-600",   border: "border-gray-300" },
};

// --- Mock Data ---
const MOCK_ATTENDANCE_DATA = [
  {
    id: 1,
    type: "회원",
    status: "성공",
    attendanceType: "일반",
    category: "입장 출석",
    door: "정문 게이트 #1",
    memberName: "김철수",
    memberId: 101,
    presence: "재실",
    gender: "남",
    tel: "010-1234-5678",
    inTime: "09:12:45",
    outTime: "-",
    visitCount: 24,
    passInfo: "헬스 3개월권 (잔여 12일)",
    expiryDate: "2026-03-02",
    lockerNo: "A-12",
    isOtherBranch: false,
    address: "서울시 종로구"
  },
  {
    id: 2,
    type: "직원",
    status: "성공",
    attendanceType: "일반",
    category: "출근",
    door: "직원 전용 통로",
    memberName: "이영희 (트레이너)",
    memberId: 201,
    presence: "재실",
    gender: "여",
    tel: "010-9876-5432",
    inTime: "08:55:02",
    outTime: "-",
    visitCount: 156,
    passInfo: "직원 근태 관리",
    expiryDate: "-",
    lockerNo: "-",
    isOtherBranch: false,
    address: "서울시 강남구"
  },
  {
    id: 3,
    type: "회원",
    status: "실패",
    attendanceType: "GX",
    category: "입장 거부",
    door: "정문 게이트 #2",
    memberName: "박지민",
    memberId: 105,
    presence: "부재",
    gender: "여",
    tel: "010-5555-4444",
    inTime: "10:05:30",
    outTime: "10:05:31",
    visitCount: 12,
    passInfo: "요가 10회권 (잔여 0회)",
    expiryDate: "2026-02-10",
    lockerNo: "-",
    isOtherBranch: true,
    address: "수원시 팔달구"
  },
  {
    id: 4,
    type: "회원",
    status: "성공",
    attendanceType: "PT",
    category: "입장 출석",
    door: "정문 게이트 #1",
    memberName: "최강호",
    memberId: 110,
    presence: "부재",
    gender: "남",
    tel: "010-1111-2222",
    inTime: "07:30:15",
    outTime: "09:00:22",
    visitCount: 45,
    passInfo: "프리미엄 연간회원",
    expiryDate: "2026-12-31",
    lockerNo: "B-05",
    isOtherBranch: false,
    address: "서울시 중구"
  },
  {
    id: 5,
    type: "회원",
    status: "성공",
    attendanceType: "수동",
    category: "입장 출석",
    door: "정문 게이트 #2",
    memberName: "한소희",
    memberId: 120,
    presence: "재실",
    gender: "여",
    tel: "010-9999-8888",
    inTime: "14:20:00",
    outTime: "-",
    visitCount: 8,
    passInfo: "필라테스 패키지",
    expiryDate: "2026-05-20",
    lockerNo: "C-21",
    isOtherBranch: false,
    address: "서울시 서대문구"
  }
];

// 주별 통계 mock
const MOCK_WEEKLY_STATS = [
  { day: "월", date: "03/11", count: 128, success: 122, fail: 6 },
  { day: "화", date: "03/12", count: 145, success: 140, fail: 5 },
  { day: "수", date: "03/13", count: 112, success: 108, fail: 4 },
  { day: "목", date: "03/14", count: 98,  success: 95,  fail: 3 },
  { day: "금", date: "03/15", count: 167, success: 160, fail: 7 },
  { day: "토", date: "03/16", count: 89,  success: 85,  fail: 4 },
  { day: "일", date: "03/17", count: 54,  success: 52,  fail: 2 },
];

// 월별 통계 mock
const MOCK_MONTHLY_STATS: Record<number, number> = {
  1: 120, 2: 134, 3: 98, 4: 145, 5: 167, 6: 112,
  7: 89, 8: 143, 9: 128, 10: 156, 11: 98, 12: 134,
  13: 120, 14: 89, 15: 145, 16: 112, 17: 134, 18: 167,
  19: 98, 20: 120, 21: 134, 22: 89, 23: 112, 24: 145,
  25: 98, 26: 120, 27: 134, 28: 89,
};

// 회원 목록 mock (수동 등록용)
const MOCK_MEMBERS = [
  { id: 101, name: "김철수" },
  { id: 105, name: "박지민" },
  { id: 110, name: "최강호" },
  { id: 120, name: "한소희" },
  { id: 130, name: "정민준" },
];

// --- 출석 유형 배지 ---
const AttendanceTypeBadge = ({ type }: { type: string }) => {
  const colors = ATTENDANCE_TYPE_COLORS[type] ?? ATTENDANCE_TYPE_COLORS["수동"];
  return (
    <span className={cn("inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold border", colors.bg, colors.text, colors.border)}>
      {type}
    </span>
  );
};

// --- 주별 뷰 ---
const WeeklyView = () => {
  const maxCount = Math.max(...MOCK_WEEKLY_STATS.map(d => d.count));
  return (
    <div className="bg-3 rounded-card-normal border border-border-light shadow-card-soft overflow-hidden">
      <div className="px-lg py-md border-b border-border-light">
        <h3 className="text-Body font-bold text-text-dark-grey">주간 출석 현황 (2026.03.11 ~ 03.17)</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-md">
          {MOCK_WEEKLY_STATS.map((stat) => (
            <div key={stat.day} className="flex flex-col items-center gap-sm">
              <span className="text-Label text-text-grey-blue">{stat.date}</span>
              <div className="w-full bg-bg-main-light-blue/50 rounded-card-normal h-[160px] flex flex-col justify-end overflow-hidden">
                <div
                  className="w-full bg-primary-coral/80 rounded-t-md transition-all duration-500"
                  style={{ height: `${(stat.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-Label font-bold text-text-dark-grey">{stat.count}</span>
              <span className="text-[10px] text-text-grey-blue font-bold">{stat.day}요일</span>
              <div className="flex gap-xs">
                <span className="text-[10px] text-secondary-mint font-semibold">{stat.success}</span>
                <span className="text-[10px] text-text-grey-blue">/</span>
                <span className="text-[10px] text-error font-semibold">{stat.fail}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-lg mt-md pt-md border-t border-border-light">
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-primary-coral/80" />
            <span className="text-Label text-text-grey-blue">총 출석</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-secondary-mint" />
            <span className="text-Label text-text-grey-blue">성공</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-error" />
            <span className="text-Label text-text-grey-blue">실패</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 월별 뷰 ---
const MonthlyView = () => {
  const daysInMonth = 28; // 2026년 2월 기준 mock
  const maxCount = Math.max(...Object.values(MOCK_MONTHLY_STATS));

  return (
    <div className="bg-3 rounded-card-normal border border-border-light shadow-card-soft overflow-hidden">
      <div className="px-lg py-md border-b border-border-light">
        <h3 className="text-Body font-bold text-text-dark-grey">월간 출석 현황 (2026년 3월)</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-xs mb-sm">
          {["일", "월", "화", "수", "목", "금", "토"].map(d => (
            <div key={d} className="text-center text-Label text-text-grey-blue font-semibold py-xs">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-xs">
          {/* 3월 1일은 일요일 */}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const count = MOCK_MONTHLY_STATS[day] ?? 0;
            const intensity = count / maxCount;
            const isToday = day === 11;
            return (
              <div
                key={day}
                className={cn(
                  "rounded-card-normal p-xs flex flex-col items-center gap-[2px] min-h-[56px] cursor-pointer hover:ring-2 hover:ring-primary-coral/30 transition-all",
                  isToday ? "ring-2 ring-primary-coral" : "border border-border-light"
                )}
                style={{ backgroundColor: count > 0 ? `rgba(255, 107, 71, ${0.08 + intensity * 0.35})` : undefined }}
              >
                <span className={cn("text-Label font-bold", isToday ? "text-primary-coral" : "text-text-dark-grey")}>{day}</span>
                {count > 0 && (
                  <span className="text-[10px] font-semibold text-text-grey-blue">{count}건</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-sm mt-md pt-md border-t border-border-light">
          <span className="text-Label text-text-grey-blue">출석 밀도:</span>
          <div className="flex items-center gap-xs">
            {[0.08, 0.2, 0.35, 0.5, 0.65].map((op, i) => (
              <div key={i} className="w-5 h-5 rounded-sm" style={{ backgroundColor: `rgba(255, 107, 71, ${op})` }} />
            ))}
            <span className="text-Label text-text-grey-blue ml-xs">많음</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 수동 출석 등록 모달 ---
interface ManualAttendanceModalProps {
  onClose: () => void;
  onSubmit: (data: { memberId: number; memberName: string; type: string; time: string }) => void;
}

const ManualAttendanceModal = ({ onClose, onSubmit }: ManualAttendanceModalProps) => {
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);
  const [attendanceType, setAttendanceType] = useState("일반");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const filteredMembers = MOCK_MEMBERS.filter(m =>
    m.name.includes(memberSearch) || String(m.id).includes(memberSearch)
  );

  const handleSubmit = () => {
    if (!selectedMember) return;
    onSubmit({ memberId: selectedMember.id, memberName: selectedMember.name, type: attendanceType, time });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-3 rounded-modal w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-3 px-xl py-lg border-b border-border-light flex items-center justify-between">
          <h2 className="text-Heading font-bold text-text-dark-grey">수동 출석 등록</h2>
          <button className="p-sm hover:bg-2 rounded-full transition-colors" onClick={onClose}>
            <XCircle className="text-text-grey-blue" size={22} />
          </button>
        </div>

        <div className="p-xl space-y-lg">
          {/* 회원 검색 */}
          <div>
            <label className="block text-Label text-text-grey-blue mb-sm">
              회원 검색 <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={16} />
              <input
                className="w-full h-12 rounded-input bg-input-bg-light border-none pl-[40px] pr-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
                placeholder="회원명 또는 회원번호 검색"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelectedMember(null); }}
              />
            </div>
            {memberSearch && !selectedMember && (
              <div className="mt-xs bg-3 border border-border-light rounded-card-normal shadow-card-soft overflow-hidden max-h-[160px] overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <p className="p-md text-Label text-text-grey-blue text-center">검색 결과 없음</p>
                ) : (
                  filteredMembers.map(m => (
                    <button
                      key={m.id}
                      className="w-full px-md py-sm text-left text-Body text-text-dark-grey hover:bg-bg-soft-peach/30 transition-colors flex items-center justify-between"
                      onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                    >
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-Label text-text-grey-blue">#{m.id}</span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedMember && (
              <div className="mt-xs flex items-center gap-sm p-sm bg-bg-soft-mint/50 rounded-card-normal border border-secondary-mint/30">
                <CheckCircle2 size={16} className="text-secondary-mint" />
                <span className="text-Label font-semibold text-secondary-mint">{selectedMember.name} (#{selectedMember.id}) 선택됨</span>
              </div>
            )}
          </div>

          {/* 출석 유형 */}
          <div>
            <label className="block text-Label text-text-grey-blue mb-sm">
              출석 유형 <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-4 gap-sm">
              {["일반", "PT", "GX", "수동"].map(type => {
                const colors = ATTENDANCE_TYPE_COLORS[type];
                const isSelected = attendanceType === type;
                return (
                  <button
                    key={type}
                    className={cn(
                      "py-sm rounded-input text-Label font-semibold border-2 transition-all",
                      isSelected ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-input-bg-light text-text-grey-blue border-transparent hover:border-border-light"
                    )}
                    onClick={() => setAttendanceType(type)}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 시간 입력 */}
          <div>
            <label className="block text-Label text-text-grey-blue mb-sm">
              출석 시간 <span className="text-error">*</span>
            </label>
            <input
              className="w-full h-12 rounded-input bg-input-bg-light border-none px-md text-Body focus:ring-2 focus:ring-secondary-mint/30 outline-none"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="px-xl py-lg border-t border-border-light flex items-center justify-end gap-md">
          <button
            className="px-xl py-md rounded-button text-Body font-bold text-text-grey-blue hover:bg-2 transition-all"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="px-xxl py-md rounded-button bg-primary-coral text-white text-Body font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedMember}
            onClick={handleSubmit}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Attendance() {
  const [loading, setLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState(MOCK_ATTENDANCE_DATA);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isNightMode, setIsNightMode] = useState(false);
  const [isRealtimePopupEnabled, setIsRealtimePopupEnabled] = useState(true);
  const [popups, setPopups] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // 실시간 팝업 추가 핸들러 (데모용)
  const addMockPopup = () => {
    if (!isRealtimePopupEnabled) return;
    const newPopup = {
      id: Date.now(),
      name: "한소희",
      status: "입장 성공",
      pass: "필라테스 패키지",
      remainDays: 92,
      photo: "/images/attendance-welcome-3d?sid=70",
    };
    setPopups(prev => [newPopup, ...prev]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== newPopup.id));
    }, 5000);
  };

  const handleClosePopup = (id: number) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const handleManualAttendanceSubmit = (data: { memberId: number; memberName: string; type: string; time: string }) => {
    const newRecord = {
      id: Date.now(),
      type: "회원",
      status: "성공",
      attendanceType: data.type,
      category: "입장 출석",
      door: "수동 등록",
      memberName: data.memberName,
      memberId: data.memberId,
      presence: "재실",
      gender: "-",
      tel: "-",
      inTime: data.time,
      outTime: "-",
      visitCount: 1,
      passInfo: "-",
      expiryDate: "-",
      lockerNo: "-",
      isOtherBranch: false,
      address: "-"
    };
    setAttendanceRecords(prev => [newRecord, ...prev]);
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      key: "no",
      header: "No",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      key: "type",
      header: "사용자 유형",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "회원" ? "default" : "warning"} label={val} />
      )
    },
    {
      key: "attendanceType",
      header: "출석 유형",
      width: 90,
      render: (val: string) => <AttendanceTypeBadge type={val} />
    },
    {
      key: "status",
      header: "출석 여부",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "성공" ? "success" : "error"} label={val} dot={true} />
      )
    },
    { key: "category", header: "출석 구분", width: 120 },
    { key: "door", header: "출입문", width: 140 },
    {
      key: "memberName",
      header: "회원명",
      width: 150,
      render: (val: string) => (
        <button
          className="font-semibold text-primary-coral hover:underline text-left"
          onClick={() => moveToPage(985)}
        >
          {val}
        </button>
      )
    },
    {
      key: "presence",
      header: "재실 여부",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "재실" ? "info" : "default"} label={val} />
      )
    },
    { key: "gender", header: "성별", width: 60, align: "center" as const },
    { key: "tel", header: "연락처", width: 130 },
    { key: "inTime", header: "입장 시간", width: 100, align: "center" as const },
    { key: "outTime", header: "퇴장 시간", width: 100, align: "center" as const },
    { key: "visitCount", header: "방문 회차", width: 80, align: "center" as const },
    { key: "passInfo", header: "이용권 내역", width: 180 },
    { key: "expiryDate", header: "만료일", width: 100 },
    { key: "lockerNo", header: "락커 번호", width: 80, align: "center" as const },
    {
      key: "isOtherBranch",
      header: "타지점",
      width: 80,
      align: "center" as const,
      render: (val: boolean) => val ? <StatusBadge variant="warning" label="Y" /> : "-"
    },
    { key: "address", header: "주소", width: 150 },
  ];

  return (
    <AppLayout>
      <div
        className={cn(
          "flex flex-col gap-lg transition-colors duration-500 min-h-screen",
          isNightMode ? "bg-slate-900 -m-lg p-lg text-slate-100" : "bg-2"
        )}
      >
        {/* 페이지 헤더 */}
        <PageHeader
          title="출석 관리"
          description="실시간 회원 입퇴장 현황과 출석 이력을 관리합니다."
          actions={
            <div className="flex items-center gap-md">
              {/* 날짜 네비게이션 */}
              <div className="flex items-center gap-sm bg-2 p-sm rounded-button shadow-sm">
                <button
                  className="p-xs hover:bg-2 rounded-md transition-colors text-5"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="flex items-center gap-xs px-sm font-semibold text-5">
                  <CalendarIcon size={18} className="text-primary-coral" />
                  <span className="text-Data-Monospace-Tabular">{selectedDate}</span>
                </div>
                <button
                  className="p-xs hover:bg-2 rounded-md transition-colors text-5"
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* 뷰 전환 버튼 (일/주/월) */}
              <div className="flex items-center gap-xs bg-2 p-[4px] rounded-button shadow-sm">
                {(["day", "week", "month"] as const).map((mode, idx) => (
                  <button
                    key={mode}
                    className={cn(
                      "flex items-center gap-xs px-md py-sm rounded-button text-Label transition-all",
                      viewMode === mode ? "bg-0 text-white shadow-md" : "text-5 hover:bg-2"
                    )}
                    onClick={() => setViewMode(mode)}
                  >
                    {["일", "주", "월"][idx]}
                  </button>
                ))}
              </div>

              {/* 데이/나이트 모드 */}
              <div className="flex items-center gap-xs bg-2 p-[4px] rounded-button shadow-sm">
                <button
                  className={cn(
                    "flex items-center gap-xs px-md py-sm rounded-button text-Label transition-all",
                    !isNightMode ? "bg-0 text-white shadow-md" : "text-5 hover:bg-2"
                  )}
                  onClick={() => setIsNightMode(false)}
                >
                  <Sun size={14} /> 데이
                </button>
                <button
                  className={cn(
                    "flex items-center gap-xs px-md py-sm rounded-button text-Label transition-all",
                    isNightMode ? "bg-indigo-600 text-white shadow-md" : "text-5 hover:bg-2"
                  )}
                  onClick={() => setIsNightMode(true)}
                >
                  <Moon size={14} /> 나이트
                </button>
              </div>

              {/* 실시간 팝업 토글 */}
              <button
                className={cn(
                  "flex items-center gap-xs px-md py-md rounded-button text-Label font-bold transition-all border",
                  isRealtimePopupEnabled
                    ? "bg-bg-soft-mint border-secondary-mint text-secondary-mint"
                    : "bg-2 border-7 text-5"
                )}
                onClick={() => setIsRealtimePopupEnabled(!isRealtimePopupEnabled)}
              >
                {isRealtimePopupEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                실시간 팝업 {isRealtimePopupEnabled ? "ON" : "OFF"}
              </button>

              {/* 수동 출석 등록 버튼 */}
              <button
                className="flex items-center gap-xs px-md py-md bg-primary-coral text-white rounded-button text-Label font-bold hover:opacity-90 transition-all shadow-sm"
                onClick={() => setIsManualModalOpen(true)}
              >
                <UserCheck size={18} />
                수동 출석
              </button>

              {/* 데모용 팝업 트리거 */}
              <button
                className="p-md bg-2 border border-7 rounded-button text-5 hover:text-primary-coral transition-colors shadow-sm"
                onClick={addMockPopup}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          }
        />

        {/* 뷰 모드 표시 영역 */}
        {viewMode === "day" && (
          <>
            {/* 요약 카드 영역 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <StatCard
                label="조회일 총 출석"
                value="128건"
                icon={<User />}
                description="전일 대비 12건 증가"
                change={{ value: 10.3, label: "증가" }}
              />
              <StatCard
                label="출석 성공"
                value="122건"
                variant="mint"
                icon={<CheckCircle2 />}
                description="전체 시도의 95.3%"
              />
              <StatCard
                label="출석 실패"
                value="6건"
                variant="peach"
                icon={<XCircle />}
                description="기간 내 거부된 건수"
                change={{ value: -2.1, label: "감소" }}
              />
            </div>

            {/* 출석 유형별 범례 */}
            <div className="bg-3 rounded-card-normal border border-border-light px-lg py-sm shadow-card-soft">
              <div className="flex items-center gap-lg flex-wrap">
                <span className="text-Label text-text-grey-blue font-semibold flex-shrink-0">출석 유형</span>
                {Object.entries(ATTENDANCE_TYPE_COLORS).map(([type, colors]) => (
                  <div key={type} className="flex items-center gap-xs">
                    <div className={cn("w-3 h-3 rounded-sm border", colors.bg, colors.border)} />
                    <span className="text-Label text-text-grey-blue">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 검색 및 필터 영역 */}
            <SearchFilter
              searchPlaceholder="회원명, 연락처, 이용권명 검색"
              filters={[
                {
                  key: "type",
                  label: "사용자 유형",
                  type: "select",
                  options: [
                    { value: "member", label: "회원" },
                    { value: "staff", label: "직원" }
                  ]
                },
                {
                  key: "attendanceType",
                  label: "출석 유형",
                  type: "select",
                  options: [
                    { value: "일반", label: "일반" },
                    { value: "PT", label: "PT" },
                    { value: "GX", label: "GX" },
                    { value: "수동", label: "수동" },
                  ]
                },
                {
                  key: "status",
                  label: "출석 구분",
                  type: "select",
                  options: [
                    { value: "entry", label: "입장 출석" },
                    { value: "work", label: "출근" },
                    { value: "deny", label: "입장 거부" }
                  ]
                }
              ]}
            />

            {/* 데이터 테이블 */}
            <DataTable
              columns={columns}
              data={attendanceRecords}
              loading={loading}
              selectable={true}
              title="출석 이력 목록"
              pagination={{ page: 1, pageSize: 10, total: 128 }}
              onDownloadExcel={() => alert("Excel 다운로드 준비 중...")}
            />
          </>
        )}

        {viewMode === "week" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <StatCard
                label="주간 총 출석"
                value="793건"
                icon={<User />}
                description="전주 대비 48건 증가"
                change={{ value: 6.4, label: "증가" }}
              />
              <StatCard
                label="주간 출석 성공"
                value="762건"
                variant="mint"
                icon={<CheckCircle2 />}
                description="전체 시도의 96.1%"
              />
              <StatCard
                label="주간 출석 실패"
                value="31건"
                variant="peach"
                icon={<XCircle />}
                description="기간 내 거부된 건수"
              />
            </div>
            <WeeklyView />
          </>
        )}

        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
              <StatCard
                label="월간 총 출석"
                value="3,421건"
                icon={<User />}
                description="전월 대비 213건 증가"
                change={{ value: 6.6, label: "증가" }}
              />
              <StatCard
                label="월간 출석 성공"
                value="3,289건"
                variant="mint"
                icon={<CheckCircle2 />}
                description="전체 시도의 96.1%"
              />
              <StatCard
                label="월간 출석 실패"
                value="132건"
                variant="peach"
                icon={<XCircle />}
                description="기간 내 거부된 건수"
              />
            </div>
            <MonthlyView />
          </>
        )}

        {/* 실시간 입장 팝업 */}
        <div className="fixed bottom-lg right-lg flex flex-col gap-md z-50 pointer-events-none">
          {popups.map(popup => (
            <div
              key={popup.id}
              className="pointer-events-auto w-[320px] bg-2 rounded-card-strong shadow-5 border-2 border-secondary-mint animate-in slide-in-from-right duration-300 overflow-hidden"
            >
              <div className="flex p-md gap-md">
                <div className="w-[80px] h-[80px] rounded-card-normal overflow-hidden flex-shrink-0 bg-bg-soft-mint">
                  <img className="w-full h-full object-cover" src={popup.photo} alt={popup.name} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-Page-Title text-5 font-bold">{popup.name}</h4>
                    <button className="text-7 hover:text-4" onClick={() => handleClosePopup(popup.id)}>
                      <XCircle size={18} />
                    </button>
                  </div>
                  <div className="mt-xs">
                    <StatusBadge variant="success" label={popup.status} dot={true} />
                  </div>
                  <div className="mt-sm space-y-xs">
                    <p className="text-Body-Primary-KR text-5 flex items-center gap-xs">
                      <CreditCard size={14} /> {popup.pass}
                    </p>
                    <p className="text-Label text-secondary-mint font-bold">
                      만료 D-{popup.remainDays}일
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-bg-soft-mint px-md py-sm border-t border-secondary-mint/20 flex items-center gap-sm">
                <Smartphone className="text-secondary-mint" size={14} />
                <span className="text-Data-Monospace-Tabular text-[11px] text-5 font-medium">
                  AI 음성 안내: "반갑습니다. 즐거운 운동 되세요!"
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수동 출석 등록 모달 */}
      {isManualModalOpen && (
        <ManualAttendanceModal
          onClose={() => setIsManualModalOpen(false)}
          onSubmit={handleManualAttendanceSubmit}
        />
      )}
    </AppLayout>
  );
}
