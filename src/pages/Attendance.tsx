import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Search,
  Bell,
  BellOff,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  CreditCard,
  Smartphone,
  CheckCircle2,
  XCircle,
  ArrowRight,
  UserCheck,
  Users,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { SearchFilter } from "@/components/SearchFilter";

/**
 * SCR-020: 출석 관리 (Attendance)
 * UI-123 날짜 필터, UI-124 출석 테이블
 */

// --- 출석 유형 색상 (시맨틱 토큰) ---
const ATTENDANCE_TYPE_MAP: Record<string, { bg: string; text: string; border: string; variant: "default" | "success" | "info" | "warning" | "error" | "peach" | "mint" }> = {
  일반: { bg: "bg-state-info/10", text: "text-state-info", border: "border-state-info/30", variant: "info" },
  PT:   { bg: "bg-state-success/10", text: "text-state-success", border: "border-state-success/30", variant: "success" },
  GX:   { bg: "bg-primary/10", text: "text-primary", border: "border-primary/30", variant: "peach" },
  수동: { bg: "bg-surface-tertiary", text: "text-content-secondary", border: "border-line", variant: "default" },
};

// --- Mock 출석 데이터 (10건+) ---
const MOCK_ATTENDANCE: Array<{
  id: number; date: string; time: string; memberName: string;
  attendanceType: "일반" | "PT" | "GX" | "수동";
  checkInMethod: "키오스크" | "앱";
  isOtherBranch: boolean; status: "성공" | "실패";
  memberId: number; tel: string; presence: "재실" | "부재";
}> = [
  { id: 1,  date: "2026-03-11", time: "07:12", memberName: "김철수", attendanceType: "일반", checkInMethod: "키오스크", isOtherBranch: false, status: "성공", memberId: 101, tel: "010-1234-5678", presence: "재실" },
  { id: 2,  date: "2026-03-11", time: "07:30", memberName: "이영희", attendanceType: "PT",   checkInMethod: "앱",       isOtherBranch: false, status: "성공", memberId: 102, tel: "010-2345-6789", presence: "재실" },
  { id: 3,  date: "2026-03-11", time: "08:05", memberName: "박지민", attendanceType: "GX",   checkInMethod: "키오스크", isOtherBranch: true,  status: "성공", memberId: 103, tel: "010-3456-7890", presence: "재실" },
  { id: 4,  date: "2026-03-11", time: "08:45", memberName: "최강호", attendanceType: "PT",   checkInMethod: "앱",       isOtherBranch: false, status: "성공", memberId: 104, tel: "010-4567-8901", presence: "부재" },
  { id: 5,  date: "2026-03-11", time: "09:00", memberName: "한소희", attendanceType: "일반", checkInMethod: "키오스크", isOtherBranch: false, status: "성공", memberId: 105, tel: "010-5678-9012", presence: "재실" },
  { id: 6,  date: "2026-03-11", time: "09:15", memberName: "정민준", attendanceType: "GX",   checkInMethod: "앱",       isOtherBranch: false, status: "실패", memberId: 106, tel: "010-6789-0123", presence: "부재" },
  { id: 7,  date: "2026-03-11", time: "10:00", memberName: "유지훈", attendanceType: "일반", checkInMethod: "키오스크", isOtherBranch: true,  status: "성공", memberId: 107, tel: "010-7890-1234", presence: "재실" },
  { id: 8,  date: "2026-03-11", time: "10:30", memberName: "김나연", attendanceType: "PT",   checkInMethod: "앱",       isOtherBranch: false, status: "성공", memberId: 108, tel: "010-8901-2345", presence: "재실" },
  { id: 9,  date: "2026-03-11", time: "11:00", memberName: "박서준", attendanceType: "수동", checkInMethod: "키오스크", isOtherBranch: false, status: "성공", memberId: 109, tel: "010-9012-3456", presence: "재실" },
  { id: 10, date: "2026-03-11", time: "11:20", memberName: "이수빈", attendanceType: "GX",   checkInMethod: "앱",       isOtherBranch: false, status: "성공", memberId: 110, tel: "010-0123-4567", presence: "부재" },
  { id: 11, date: "2026-03-11", time: "13:00", memberName: "조현우", attendanceType: "PT",   checkInMethod: "키오스크", isOtherBranch: false, status: "성공", memberId: 111, tel: "010-1122-3344", presence: "재실" },
  { id: 12, date: "2026-03-11", time: "14:10", memberName: "강민서", attendanceType: "일반", checkInMethod: "앱",       isOtherBranch: true,  status: "실패", memberId: 112, tel: "010-2233-4455", presence: "부재" },
];

const MOCK_MEMBERS = [
  { id: 101, name: "김철수" },
  { id: 102, name: "이영희" },
  { id: 103, name: "박지민" },
  { id: 105, name: "한소희" },
  { id: 109, name: "박서준" },
];

// --- 주간 통계 ---
const MOCK_WEEKLY = [
  { day: "월", date: "03/11", count: 128, success: 122, fail: 6 },
  { day: "화", date: "03/12", count: 145, success: 140, fail: 5 },
  { day: "수", date: "03/13", count: 112, success: 108, fail: 4 },
  { day: "목", date: "03/14", count: 98,  success: 95,  fail: 3 },
  { day: "금", date: "03/15", count: 167, success: 160, fail: 7 },
  { day: "토", date: "03/16", count: 89,  success: 85,  fail: 4 },
  { day: "일", date: "03/17", count: 54,  success: 52,  fail: 2 },
];

// --- 월간 통계 (히트맵) ---
const MOCK_MONTHLY: Record<number, number> = {
  1: 120, 2: 134, 3: 98,  4: 145, 5: 167, 6: 112,
  7: 89,  8: 143, 9: 128, 10: 156, 11: 98, 12: 134,
  13: 120, 14: 89, 15: 145, 16: 112, 17: 134, 18: 167,
  19: 98, 20: 120, 21: 134, 22: 89, 23: 112, 24: 145,
  25: 98, 26: 120, 27: 134, 28: 89,
};

// --- 출석 유형 배지 ---
const AttendanceTypeBadge = ({ type }: { type: string }) => {
  const map = ATTENDANCE_TYPE_MAP[type] ?? ATTENDANCE_TYPE_MAP["수동"];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border", map.bg, map.text, map.border)}>
      {type}
    </span>
  );
};

// --- 수동 출석 등록 모달 ---
const ManualAttendanceModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { memberId: number; memberName: string; type: string; time: string }) => void;
}) => {
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);
  const [attendanceType, setAttendanceType] = useState("일반");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));

  const filtered = MOCK_MEMBERS.filter(m =>
    m.name.includes(memberSearch) || String(m.id).includes(memberSearch)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="px-xl py-lg border-b border-line flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-content">수동 출석 등록</h2>
          <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={onClose}>
            <XCircle className="text-content-secondary" size={22} />
          </button>
        </div>

        <div className="p-xl space-y-lg">
          {/* 회원 검색 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              회원 검색 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
              <input
                className="w-full h-11 rounded-lg bg-surface-secondary border border-line pl-[40px] pr-md text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="회원명 또는 회원번호 검색"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelectedMember(null); }}
              />
            </div>
            {memberSearch && !selectedMember && (
              <div className="mt-xs bg-surface border border-line rounded-lg shadow-md overflow-hidden max-h-[160px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="p-md text-[12px] text-content-secondary text-center">검색 결과 없음</p>
                ) : filtered.map(m => (
                  <button
                    key={m.id}
                    className="w-full px-md py-sm text-left text-[13px] text-content hover:bg-surface-secondary transition-colors flex items-center justify-between"
                    onClick={() => { setSelectedMember(m); setMemberSearch(m.name); }}
                  >
                    <span className="font-semibold">{m.name}</span>
                    <span className="text-[11px] text-content-secondary">#{m.id}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedMember && (
              <div className="mt-xs flex items-center gap-sm p-sm bg-state-success/5 rounded-lg border border-state-success/20">
                <CheckCircle2 size={16} className="text-state-success" />
                <span className="text-[12px] font-semibold text-state-success">{selectedMember.name} (#{selectedMember.id}) 선택됨</span>
              </div>
            )}
          </div>

          {/* 출석 유형 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              출석 유형 <span className="text-state-error">*</span>
            </label>
            <div className="grid grid-cols-4 gap-sm">
              {(["일반", "PT", "GX", "수동"] as const).map(type => {
                const map = ATTENDANCE_TYPE_MAP[type];
                const isSelected = attendanceType === type;
                return (
                  <button
                    key={type}
                    className={cn(
                      "py-sm rounded-lg text-[12px] font-semibold border-2 transition-all",
                      isSelected ? `${map.bg} ${map.text} ${map.border}` : "bg-surface-secondary text-content-secondary border-transparent hover:border-line"
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
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              출석 시간 <span className="text-state-error">*</span>
            </label>
            <input
              className="w-full h-11 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="px-xl py-lg border-t border-line flex items-center justify-end gap-md">
          <button
            className="px-xl py-sm rounded-lg text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary transition-all"
            onClick={onClose}
          >취소</button>
          <button
            className="px-xl py-sm rounded-lg bg-primary text-white text-[13px] font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedMember}
            onClick={() => {
              if (!selectedMember) return;
              onSubmit({ memberId: selectedMember.id, memberName: selectedMember.name, type: attendanceType, time });
              onClose();
            }}
          >등록</button>
        </div>
      </div>
    </div>
  );
};

// --- 주간 뷰 ---
const WeeklyView = () => {
  const max = Math.max(...MOCK_WEEKLY.map(d => d.count));
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line">
        <h3 className="text-[14px] font-bold text-content">주간 출석 현황 (2026.03.11 ~ 03.17)</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-md">
          {MOCK_WEEKLY.map(stat => (
            <div key={stat.day} className="flex flex-col items-center gap-sm">
              <span className="text-[11px] text-content-secondary">{stat.date}</span>
              <div className="w-full bg-surface-tertiary rounded-xl h-[140px] flex flex-col justify-end overflow-hidden">
                <div
                  className="w-full bg-primary/70 rounded-t-md transition-all duration-500"
                  style={{ height: `${(stat.count / max) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-bold text-content">{stat.count}</span>
              <span className="text-[11px] text-content-secondary font-medium">{stat.day}요일</span>
              <div className="flex gap-xs">
                <span className="text-[10px] text-state-success font-semibold">{stat.success}</span>
                <span className="text-[10px] text-content-tertiary">/</span>
                <span className="text-[10px] text-state-error font-semibold">{stat.fail}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-lg mt-md pt-md border-t border-line">
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-primary/70" />
            <span className="text-[11px] text-content-secondary">총 출석</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-state-success" />
            <span className="text-[11px] text-content-secondary">성공</span>
          </div>
          <div className="flex items-center gap-xs">
            <div className="w-3 h-3 rounded-sm bg-state-error" />
            <span className="text-[11px] text-content-secondary">실패</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 월간 뷰 ---
const MonthlyView = () => {
  const daysInMonth = 28;
  const max = Math.max(...Object.values(MOCK_MONTHLY));
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line">
        <h3 className="text-[14px] font-bold text-content">월간 출석 현황 (2026년 3월)</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-xs mb-sm">
          {["일", "월", "화", "수", "목", "금", "토"].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-content-secondary py-xs">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-xs">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const count = MOCK_MONTHLY[day] ?? 0;
            const intensity = count / max;
            const isToday = day === 11;
            return (
              <div
                key={day}
                className={cn(
                  "rounded-lg p-xs flex flex-col items-center gap-[2px] min-h-[52px] cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all",
                  isToday ? "ring-2 ring-primary" : "border border-line"
                )}
                style={{ backgroundColor: count > 0 ? `rgba(255,107,71,${0.08 + intensity * 0.35})` : undefined }}
              >
                <span className={cn("text-[11px] font-bold", isToday ? "text-primary" : "text-content")}>{day}</span>
                {count > 0 && <span className="text-[10px] font-medium text-content-secondary">{count}건</span>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-sm mt-md pt-md border-t border-line">
          <span className="text-[11px] text-content-secondary">출석 밀도:</span>
          <div className="flex items-center gap-xs">
            {[0.08, 0.2, 0.35, 0.5, 0.65].map((op, i) => (
              <div key={i} className="w-5 h-5 rounded-sm" style={{ backgroundColor: `rgba(255,107,71,${op})` }} />
            ))}
            <span className="text-[11px] text-content-secondary ml-xs">많음</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Attendance() {
  const [records, setRecords] = useState(MOCK_ATTENDANCE);
  const [selectedDate, setSelectedDate] = useState("2026-03-11");
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [popups, setPopups] = useState<Array<{ id: number; name: string; status: string; pass: string }>>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const addMockPopup = () => {
    if (!isRealtimeEnabled) return;
    const newPopup = { id: Date.now(), name: "한소희", status: "입장 성공", pass: "필라테스 패키지" };
    setPopups(prev => [newPopup, ...prev]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== newPopup.id)), 5000);
  };

  const handleManualSubmit = (data: { memberId: number; memberName: string; type: string; time: string }) => {
    const newRecord = {
      id: Date.now(), date: selectedDate, time: data.time,
      memberName: data.memberName,
      attendanceType: data.type as "일반" | "PT" | "GX" | "수동",
      checkInMethod: "키오스크" as const,
      isOtherBranch: false, status: "성공" as const,
      memberId: data.memberId, tel: "-", presence: "재실" as const,
    };
    setRecords(prev => [newRecord, ...prev]);
  };

  // 오늘 통계 계산
  const todayRecords = records.filter(r => r.date === selectedDate);
  const todayTotal     = todayRecords.filter(r => r.status === "성공").length;
  const todayPT        = todayRecords.filter(r => r.attendanceType === "PT").length;
  const todayGX        = todayRecords.filter(r => r.attendanceType === "GX").length;
  const todayNew       = 3; // Mock

  // 테이블 컬럼 (SCR-020 UI-124)
  const columns = [
    { key: "no", header: "No", width: 55, align: "center" as const, render: (_: any, __: any, i: number) => i + 1 },
    {
      key: "date",
      header: "날짜",
      width: 110,
      render: (val: string) => <span className="text-[12px] font-mono text-content">{val}</span>
    },
    {
      key: "time",
      header: "시간",
      width: 80,
      align: "center" as const,
      render: (val: string) => <span className="text-[12px] font-mono text-content">{val}</span>
    },
    {
      key: "memberName",
      header: "회원명",
      width: 120,
      render: (val: string) => (
        <button className="font-semibold text-primary hover:underline text-left text-[13px]" onClick={() => moveToPage(985)}>
          {val}
        </button>
      )
    },
    {
      key: "attendanceType",
      header: "출석유형",
      width: 90,
      render: (val: string) => <AttendanceTypeBadge type={val} />
    },
    {
      key: "checkInMethod",
      header: "체크인방식",
      width: 100,
      render: (val: string) => (
        <StatusBadge variant={val === "앱" ? "info" : "default"} label={val} />
      )
    },
    {
      key: "isOtherBranch",
      header: "타지점",
      width: 80,
      align: "center" as const,
      render: (val: boolean) => val
        ? <StatusBadge variant="warning" label="타지점" dot />
        : <span className="text-[12px] text-content-tertiary">-</span>
    },
    {
      key: "status",
      header: "출석여부",
      width: 90,
      render: (val: string) => (
        <StatusBadge variant={val === "성공" ? "success" : "error"} label={val} dot />
      )
    },
    {
      key: "presence",
      header: "재실여부",
      width: 90,
      render: (val: string) => (
        <StatusBadge variant={val === "재실" ? "info" : "default"} label={val} />
      )
    },
    { key: "tel", header: "연락처", width: 130 },
  ];

  const navigate = (dir: 1 | -1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        {/* 페이지 헤더 */}
        <PageHeader
          title="출석 관리"
          description="실시간 회원 입퇴장 현황과 출석 이력을 관리합니다."
          actions={
            <div className="flex items-center gap-sm flex-wrap">
              {/* 날짜 네비게이션 + DatePicker */}
              <div className="flex items-center gap-xs bg-surface border border-line rounded-lg px-sm py-xs shadow-xs">
                <button className="p-xs hover:bg-surface-secondary rounded-md transition-colors text-content-secondary" onClick={() => navigate(-1)}>
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-xs px-xs">
                  <CalendarIcon size={15} className="text-primary" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="text-[13px] font-mono font-semibold text-content bg-transparent border-none outline-none cursor-pointer"
                  />
                </div>
                <button className="p-xs hover:bg-surface-secondary rounded-md transition-colors text-content-secondary" onClick={() => navigate(1)}>
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* 뷰 전환 (일/주/월) — UI-123 */}
              <div className="flex items-center bg-surface-tertiary rounded-lg p-[3px] gap-[2px]">
                {(["day", "week", "month"] as const).map((mode, idx) => (
                  <button
                    key={mode}
                    className={cn(
                      "px-md py-[6px] rounded-md text-[13px] font-medium transition-all",
                      viewMode === mode ? "bg-surface text-content shadow-xs" : "text-content-secondary hover:text-content"
                    )}
                    onClick={() => setViewMode(mode)}
                  >
                    {["일별", "주별", "월별"][idx]}
                  </button>
                ))}
              </div>

              {/* 실시간 팝업 토글 */}
              <button
                className={cn(
                  "flex items-center gap-xs px-md py-[6px] rounded-lg text-[13px] font-semibold border transition-all",
                  isRealtimeEnabled
                    ? "bg-state-success/5 border-state-success/20 text-state-success"
                    : "bg-surface-secondary border-line text-content-secondary"
                )}
                onClick={() => setIsRealtimeEnabled(!isRealtimeEnabled)}
              >
                {isRealtimeEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                실시간 {isRealtimeEnabled ? "ON" : "OFF"}
              </button>

              {/* 수동 출석 등록 */}
              <button
                className="flex items-center gap-xs px-md py-[6px] bg-primary text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-all shadow-sm"
                onClick={() => setIsManualModalOpen(true)}
              >
                <UserCheck size={16} />
                수동 출석
              </button>

              {/* 데모 팝업 트리거 */}
              <button
                className="p-[7px] bg-surface-secondary border border-line rounded-lg text-content-secondary hover:text-primary transition-colors"
                onClick={addMockPopup}
                title="팝업 테스트"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          }
        />

        {/* 일별 뷰 */}
        {viewMode === "day" && (
          <>
            {/* 상단 통계 카드 4개 — SCR-020 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
              <StatCard label="오늘 출석" value={`${todayTotal}건`} icon={<Users />} description="성공 체크인 건수" />
              <StatCard label="PT 수업" value={`${todayPT}건`} variant="mint" icon={<CheckCircle2 />} description="PT 출석 건수" />
              <StatCard label="GX 수업" value={`${todayGX}건`} variant="peach" icon={<MapPin />} description="GX 수업 출석" />
              <StatCard label="신규 방문" value={`${todayNew}명`} icon={<User />} description="첫 방문 회원 수" />
            </div>

            {/* 출석 유형 범례 */}
            <div className="bg-surface rounded-xl border border-line px-lg py-sm shadow-xs">
              <div className="flex items-center gap-lg flex-wrap">
                <span className="text-[12px] font-semibold text-content-secondary flex-shrink-0">출석 유형</span>
                {Object.entries(ATTENDANCE_TYPE_MAP).map(([type, map]) => (
                  <div key={type} className="flex items-center gap-xs">
                    <div className={cn("w-3 h-3 rounded-sm border", map.bg, map.border)} />
                    <span className="text-[12px] text-content-secondary">{type}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 검색/필터 */}
            <SearchFilter
              searchPlaceholder="회원명, 연락처 검색"
              filters={[
                {
                  key: "attendanceType", label: "출석유형", type: "select",
                  options: [
                    { value: "일반", label: "일반" },
                    { value: "PT",   label: "PT" },
                    { value: "GX",   label: "GX" },
                    { value: "수동", label: "수동" },
                  ]
                },
                {
                  key: "checkInMethod", label: "체크인방식", type: "select",
                  options: [
                    { value: "키오스크", label: "키오스크" },
                    { value: "앱",       label: "앱" },
                  ]
                },
              ]}
            />

            {/* 출석 테이블 — UI-124 */}
            <DataTable
              columns={columns}
              data={records}
              title="출석 이력 목록"
              pagination={{ page: 1, pageSize: 10, total: records.length }}
              selectable
              onDownloadExcel={() => alert("Excel 다운로드")}
            />
          </>
        )}

        {viewMode === "week" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-lg">
              <StatCard label="주간 총 출석" value="793건" icon={<Users />} change={{ value: 6.4, label: "전주 대비" }} />
              <StatCard label="주간 PT 수업" value="218건" variant="mint" icon={<CheckCircle2 />} />
              <StatCard label="주간 GX 수업" value="147건" variant="peach" icon={<MapPin />} />
            </div>
            <WeeklyView />
          </>
        )}

        {viewMode === "month" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-lg">
              <StatCard label="월간 총 출석" value="3,421건" icon={<Users />} change={{ value: 6.6, label: "전월 대비" }} />
              <StatCard label="월간 PT 수업" value="892건" variant="mint" icon={<CheckCircle2 />} />
              <StatCard label="월간 신규 방문" value="78명" variant="peach" icon={<User />} />
            </div>
            <MonthlyView />
          </>
        )}

        {/* 실시간 입장 팝업 */}
        <div className="fixed bottom-lg right-lg flex flex-col gap-md z-50 pointer-events-none">
          {popups.map(popup => (
            <div
              key={popup.id}
              className="pointer-events-auto w-[300px] bg-surface rounded-xl shadow-xl border border-line animate-in slide-in-from-right duration-300 overflow-hidden"
            >
              <div className="flex p-md gap-md items-start">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[14px] font-bold text-content">{popup.name}</p>
                    <button className="text-content-tertiary hover:text-content" onClick={() => setPopups(p => p.filter(x => x.id !== popup.id))}>
                      <XCircle size={16} />
                    </button>
                  </div>
                  <StatusBadge variant="success" label={popup.status} dot className="mt-xs" />
                  <p className="text-[12px] text-content-secondary mt-xs flex items-center gap-xs">
                    <CreditCard size={12} /> {popup.pass}
                  </p>
                </div>
              </div>
              <div className="bg-surface-secondary px-md py-sm border-t border-line flex items-center gap-sm">
                <Smartphone size={13} className="text-content-secondary" />
                <span className="text-[11px] text-content-secondary">AI 음성: "반갑습니다. 즐거운 운동 되세요!"</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isManualModalOpen && (
        <ManualAttendanceModal
          onClose={() => setIsManualModalOpen(false)}
          onSubmit={handleManualSubmit}
        />
      )}
    </AppLayout>
  );
}
