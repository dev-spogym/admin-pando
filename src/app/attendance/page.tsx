'use client';
export const dynamic = 'force-dynamic';

import { getBranchId } from '@/lib/getBranchId';
import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Loader2,
  Building2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import { formatCount } from "@/lib/format";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import { SearchFilter } from "@/components/common/SearchFilter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";
import { deductSession } from "@/lib/businessLogic";
import { checkOutMember } from "@/api/endpoints/attendance";
import Button from "@/components/ui/Button";

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

// 주간/월간 데이터 타입
interface WeekDayData {
  day: string;
  date: string;
  count: number;
  success: number;
  fail: number;
}

// DB 영문 → 한글 매핑
const TYPE_KO: Record<string, string> = {
  REGULAR: '일반', PT: 'PT', GX: 'GX', MANUAL: '수동',
  '일반': '일반', '수동': '수동',
};
const METHOD_KO: Record<string, string> = {
  APP: '앱', KIOSK: '키오스크', MANUAL: '수동',
  '앱': '앱', '키오스크': '키오스크',
};

// 사용자 유형 (MEMBER/STAFF/GUEST)
const USER_TYPE_KO: Record<string, string> = {
  MEMBER: '회원', STAFF: '직원', GUEST: '게스트',
};

interface AttendanceRecord {
  id: number;
  date: string;
  time: string;
  memberName: string;
  attendanceType: "일반" | "PT" | "GX" | "수동";
  checkInMethod: "키오스크" | "앱";
  isOtherBranch: boolean;
  sourceBranchId?: number | null;
  status: "성공" | "실패";
  failReason?: string | null;
  memberId: number;
  tel: string;
  presence: "재실" | "부재";
  userType?: string | null;
}

interface MemberOption {
  id: number;
  name: string;
}

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
  isOpen,
  onClose,
  onSubmit,
  members,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { memberId: number; memberName: string; type: string; time: string }) => void | Promise<void>;
  members: MemberOption[];
}) => {
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<{ id: number; name: string } | null>(null);
  const [attendanceType, setAttendanceType] = useState("일반");
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = members.filter(m =>
    m.name.includes(memberSearch) || String(m.id).includes(memberSearch)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="수동 출석 등록"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-md">
          <button
            className="px-xl py-sm rounded-lg text-[13px] font-semibold text-content-secondary hover:bg-surface-secondary transition-all"
            onClick={onClose}
          >취소</button>
          <button
            className="px-xl py-sm rounded-lg bg-primary text-white text-[13px] font-bold shadow-sm hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!selectedMember || isSubmitting}
            onClick={async () => {
              if (!selectedMember || isSubmitting) return;
              setIsSubmitting(true);
              await onSubmit({ memberId: selectedMember.id, memberName: selectedMember.name, type: attendanceType, time });
              setIsSubmitting(false);
              onClose();
            }}
          >{isSubmitting ? '등록 중...' : '등록'}</button>
        </div>
      }
    >
      <div className="space-y-lg">
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
    </Modal>
  );
};

// --- 주간 뷰 ---
const WeeklyView = ({ data, weekLabel }: { data: WeekDayData[]; weekLabel: string }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line">
        <h3 className="text-[14px] font-bold text-content">주간 출석 현황 ({weekLabel})</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-md">
          {data.map(stat => (
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
        {data.some(d => d.count > 0) ? (
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
        ) : (
          <div className="mt-md pt-md border-t border-line text-center text-[12px] text-content-tertiary">
            이번 주 출석 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

// --- 월간 뷰 ---
const MonthlyView = ({ data, year, month, todayDay }: { data: Record<number, number>; year: number; month: number; todayDay: number }) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=일, 1=월, ...
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
      <div className="px-lg py-md border-b border-line">
        <h3 className="text-[14px] font-bold text-content">월간 출석 현황 ({year}년 {month}월)</h3>
      </div>
      <div className="p-lg">
        <div className="grid grid-cols-7 gap-xs mb-sm">
          {["일", "월", "화", "수", "목", "금", "토"].map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-content-secondary py-xs">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-xs">
          {/* 빈 칸 (월 시작 요일까지) */}
          {Array.from({ length: firstDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="min-h-[52px]" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const count = data[day] ?? 0;
            const intensity = count / max;
            const isToday = day === todayDay;
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
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(true);
  const [popups, setPopups] = useState<Array<{ id: number; name: string; status: string; pass: string }>>([]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // 검색/필터 상태 (BUG-09: SearchFilter 실제 필터링 연결)
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const branchId = getBranchId();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 출석 데이터 (attendance 테이블)
        const { data: attendanceData } = await supabase
          .from("attendance")
          .select("id, memberId, memberName, checkInAt, checkOutAt, type, checkInMethod, branchId")
          .eq("branchId", branchId)
          .order("checkInAt", { ascending: false });

        const memberIds = Array.from(
          new Set((attendanceData ?? []).map((a: any) => a.memberId).filter((id: unknown) => typeof id === "number"))
        );
        const { data: memberPhoneData } = memberIds.length > 0
          ? await supabase
              .from("members")
              .select("id, phone")
              .in("id", memberIds)
          : { data: [] as Array<{ id: number; phone: string | null }> };
        const phoneMap = new Map((memberPhoneData ?? []).map((m: any) => [m.id, m.phone ?? "-"]));

        if (attendanceData) {
          const mapped: AttendanceRecord[] = attendanceData.map((a: any) => {
            const checkInAt: string = a.checkInAt ?? "";
            const datePart = checkInAt.split("T")[0] ?? "";
            const timePart = checkInAt.split("T")[1]?.substring(0, 5) ?? "";
            const typeKo = TYPE_KO[a.type] ?? a.type ?? "일반";
            const methodKo = METHOD_KO[a.checkInMethod] ?? a.checkInMethod ?? "키오스크";
            const phone = phoneMap.get(a.memberId) ?? "-";
            return {
              id: a.id,
              date: datePart,
              time: timePart,
              memberName: a.memberName ?? "",
              attendanceType: typeKo as "일반" | "PT" | "GX" | "수동",
              checkInMethod: methodKo as "키오스크" | "앱",
              isOtherBranch: false,
              sourceBranchId: null,
              status: "성공",
              failReason: null,
              memberId: a.memberId ?? 0,
              tel: phone,
              presence: a.checkOutAt ? "부재" as const : "재실" as const,
              userType: null,
            };
          });
          setRecords(mapped);
        }

        // 회원 목록 (members 테이블, 수동 출석 검색용)
        const { data: memberData } = await supabase
          .from("members")
          .select("id, name")
          .eq("branchId", branchId);

        if (memberData) {
          setMembers(memberData.map((m: any) => ({ id: m.id, name: m.name ?? "" })));
        }
      } catch (err) {
        console.error("Attendance 데이터 로드 실패:", err);
        toast.error("출석 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  // #14 실시간 입장 팝업 — Supabase Realtime attendance INSERT 구독
  useEffect(() => {
    if (!isRealtimeEnabled) return;
    const channel = supabase
      .channel('attendance-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `branchId=eq.${branchId}`,
        },
        (payload: any) => {
          const memberName = payload.new?.memberName ?? '회원';
          toast.info(`${memberName}님이 입장했습니다.`);
          // 새 레코드를 목록에 즉시 반영
          const checkInAt: string = payload.new?.checkInAt ?? '';
          const datePart = checkInAt.split('T')[0] ?? '';
          const timePart = checkInAt.split('T')[1]?.substring(0, 5) ?? '';
          const newRecord: AttendanceRecord = {
            id: payload.new?.id ?? Date.now(),
            date: datePart,
            time: timePart,
            memberName,
            attendanceType: (TYPE_KO[payload.new?.type as string] ?? '일반') as '일반' | 'PT' | 'GX' | '수동',
            checkInMethod: (METHOD_KO[payload.new?.checkInMethod] ?? '키오스크') as '키오스크' | '앱',
            isOtherBranch: false,
            status: '성공',
            memberId: payload.new?.memberId ?? 0,
            tel: '-',
            presence: '재실',
          };
          setRecords(prev => [newRecord, ...prev]);
          // 팝업 표시
          if (isRealtimeEnabled) {
            const popupItem = { id: Date.now(), name: memberName, status: '입장 성공', pass: '' };
            setPopups(prev => [popupItem, ...prev]);
            setTimeout(() => setPopups(prev => prev.filter(p => p.id !== popupItem.id)), 5000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [branchId, isRealtimeEnabled]);

  // #13 퇴장 처리
  const handleCheckOut = useCallback(async (record: AttendanceRecord) => {
    const result = await checkOutMember(record.id);
    if (!result.success) {
      toast.error('퇴장 처리에 실패했습니다.');
      return;
    }
    setRecords(prev =>
      prev.map(r => r.id === record.id ? { ...r, presence: '부재' as const } : r)
    );
    toast.success(`${record.memberName}님이 퇴장했습니다.`);
  }, []);

  const addMockPopup = () => {
    if (!isRealtimeEnabled) return;
    const newPopup = { id: Date.now(), name: "한소희", status: "입장 성공", pass: "필라테스 패키지" };
    setPopups(prev => [newPopup, ...prev]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== newPopup.id)), 5000);
  };

  const handleManualSubmit = async (data: { memberId: number; memberName: string; type: string; time: string }) => {
    // DB에 출석 기록 저장
    const { error } = await supabase.from('attendance').insert({
      memberId: data.memberId,
      memberName: data.memberName,
      checkInAt: `${selectedDate}T${data.time}:00`,
      type: data.type === '일반' ? 'REGULAR' : data.type === '수동' ? 'MANUAL' : data.type,
      checkInMethod: 'MANUAL',
      isOtherBranch: false,
      branchId,
    });

    if (error) {
      toast.error('출석 등록에 실패했습니다.');
      return;
    }

    // PT/GX 출석 시 잔여횟수 차감
    const dbType = data.type === '일반' ? 'REGULAR' : data.type;
    if (dbType === 'PT' || dbType === 'GX') {
      const result = await deductSession(data.memberId, dbType as 'PT' | 'GX');
      if (result.success && result.remaining !== undefined) {
        toast.info(result.message);
      }
    }

    const newRecord: AttendanceRecord = {
      id: Date.now(), date: selectedDate, time: data.time,
      memberName: data.memberName,
      attendanceType: data.type as "일반" | "PT" | "GX" | "수동",
      checkInMethod: "키오스크",
      isOtherBranch: false, status: "성공",
      memberId: data.memberId, tel: "-", presence: "재실",
    };
    setRecords(prev => [newRecord, ...prev]);
    toast.success(`${data.memberName}님 출석이 등록되었습니다.`);
  };

  // --- 주간/월간 데이터 계산 (실 데이터 기반) ---
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const todayDayOfMonth = now.getDate();

  // 이번 주 월~일 날짜 범위 계산
  const weekData = useMemo((): WeekDayData[] => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=일, 1=월, ...
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const days = ["월", "화", "수", "목", "금", "토", "일"];
    return days.map((dayName, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayRecords = records.filter(r => r.date === dateStr);
      const successCount = dayRecords.filter(r => r.status === "성공").length;
      const failCount = dayRecords.filter(r => r.status === "실패").length;
      return {
        day: dayName,
        date: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
        count: dayRecords.length,
        success: successCount,
        fail: failCount,
      };
    });
  }, [records]);

  const weekLabel = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    return `${fmt(monday)} ~ ${fmt(sunday)}`;
  }, []);

  // 월간 일별 출석 집계
  const monthlyData = useMemo((): Record<number, number> => {
    const result: Record<number, number> = {};
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}-`;
    records.forEach(r => {
      if (r.date.startsWith(monthPrefix)) {
        const day = parseInt(r.date.split('-')[2], 10);
        result[day] = (result[day] ?? 0) + 1;
      }
    });
    return result;
  }, [records, currentYear, currentMonth]);

  // 주간/월간 통계 합계
  const weekTotal = weekData.reduce((s, d) => s + d.count, 0);
  const weekPT = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return records.filter(r => r.date >= fmtD(monday) && r.date <= fmtD(sunday) && r.attendanceType === "PT").length;
  }, [records]);
  const weekGX = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmtD = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return records.filter(r => r.date >= fmtD(monday) && r.date <= fmtD(sunday) && r.attendanceType === "GX").length;
  }, [records]);

  const monthTotal = Object.values(monthlyData).reduce((s, v) => s + v, 0);
  const monthPT = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}-`;
    return records.filter(r => r.date.startsWith(monthPrefix) && r.attendanceType === "PT").length;
  }, [records, currentYear, currentMonth]);
  const monthNew = useMemo(() => {
    const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}-`;
    const prevPrefix = currentMonth > 1
      ? `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}-`
      : `${currentYear - 1}-12-`;
    const thisMonthIds = new Set(records.filter(r => r.date.startsWith(monthPrefix)).map(r => r.memberId));
    const prevIds = new Set(records.filter(r => r.date < monthPrefix).map(r => r.memberId));
    return [...thisMonthIds].filter(id => !prevIds.has(id)).length;
  }, [records, currentYear, currentMonth]);

  // 오늘 통계 계산
  const todayRecords = records.filter(r => r.date === selectedDate);
  const todayTotal     = todayRecords.length;
  const todaySuccess   = todayRecords.filter(r => r.status === "성공").length;
  const todayFail      = todayRecords.filter(r => r.status === "실패").length;
  const todayPT        = todayRecords.filter(r => r.attendanceType === "PT").length;
  const todayGX        = todayRecords.filter(r => r.attendanceType === "GX").length;
  // #12 현재 재실 인원 (checkInAt 있고 checkOutAt 없는 회원)
  const currentPresence = records.filter(r => r.presence === "재실").length;

  // BUG-09: SearchFilter 필터링 적용된 레코드
  const filteredTodayRecords = useMemo(() => {
    return todayRecords.filter(r => {
      // 출석유형 필터
      if (filterValues.attendanceType && r.attendanceType !== filterValues.attendanceType) return false;
      // 체크인방식 필터
      if (filterValues.checkInMethod && r.checkInMethod !== filterValues.checkInMethod) return false;
      // 검색어 필터 (회원명 또는 연락처)
      if (searchValue) {
        const keyword = searchValue.trim();
        const matchName = r.memberName.includes(keyword);
        const matchTel  = r.tel.includes(keyword);
        if (!matchName && !matchTel) return false;
      }
      return true;
    });
  }, [todayRecords, filterValues, searchValue]);

  // UX-10: StatCard "오늘 출석" 라벨 — 선택 날짜 기준 동적 표시
  const todayLabel = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (selectedDate === today) return "오늘 출석";
    // MM/DD 형식으로 날짜 표시
    const [, mm, dd] = selectedDate.split("-");
    return `${mm}/${dd} 출석`;
  }, [selectedDate]);
  // 신규 방문: 해당 날짜에 처음 출석한 회원 수 (같은 memberId가 이전 기록에 없는 경우)
  const todayNew = (() => {
    const todayIds = new Set(todayRecords.map(r => r.memberId));
    const prevIds = new Set(records.filter(r => r.date < selectedDate).map(r => r.memberId));
    return [...todayIds].filter(id => !prevIds.has(id)).length;
  })();

  // 테이블 컬럼 (SCR-020 UI-124)
  const columns: any[] = [
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
      render: (val: string, row: AttendanceRecord) => (
        <Button variant="ghost" size="sm" onClick={() => moveToPage(985, { id: row.memberId })}>{val}</Button>
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
      key: "userType",
      header: "사용자 유형",
      width: 100,
      align: "center" as const,
      render: (val: string | null) => {
        if (!val) return <span className="text-[12px] text-content-tertiary">-</span>;
        const label = USER_TYPE_KO[val] ?? val;
        const variant = val === "MEMBER" ? "info" : val === "STAFF" ? "success" : "default";
        return <StatusBadge variant={variant as "info" | "success" | "default"} label={label} />;
      }
    },
    {
      key: "isOtherBranch",
      header: "타지점",
      width: 80,
      align: "center" as const,
      render: (val: boolean, row: AttendanceRecord) => val || row.sourceBranchId
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
      key: "failReason",
      header: "실패 사유",
      width: 130,
      render: (val: string | null) =>
        val
          ? <span className="text-[12px] text-state-error">{val}</span>
          : <span className="text-[12px] text-content-tertiary">-</span>
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
    {
      // #13 퇴장 버튼 — 재실 상태일 때만 활성
      key: "checkOut",
      header: "퇴장",
      width: 80,
      align: "center" as const,
      render: (_: any, row: AttendanceRecord) =>
        row.presence === "재실" ? (
          <button
            className="flex items-center gap-xs px-sm py-[3px] rounded-md bg-surface-secondary border border-line text-[11px] font-semibold text-content-secondary hover:bg-state-error/10 hover:border-state-error/30 hover:text-state-error transition-all"
            onClick={() => handleCheckOut(row)}
          >
            <LogOut size={11} />
            퇴장
          </button>
        ) : (
          <span className="text-[11px] text-content-tertiary">-</span>
        ),
    },
  ];

  const navigate = (dir: 1 | -1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
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
                <Button variant="ghost" size="sm" icon={<ChevronLeft size={18} />} onClick={() => navigate(-1)} />
                <div className="flex items-center gap-xs px-xs">
                  <CalendarIcon size={15} className="text-primary" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="text-[13px] font-mono font-semibold text-content bg-transparent border-none outline-none cursor-pointer"
                  />
                </div>
                <Button variant="ghost" size="sm" icon={<ChevronRight size={18} />} onClick={() => navigate(1)} />
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

        {loading && (
          <div className="flex items-center justify-center gap-sm py-xl text-[13px] text-content-secondary">
            <Loader2 size={18} className="animate-spin text-primary" />
            데이터를 불러오는 중...
          </div>
        )}

        {/* 일별 뷰 */}
        {!loading && viewMode === "day" && (
          <>
            {/* 상단 통계 카드 — 총 건수, 성공, 실패 + 기존 카드 */}
            <StatCardGrid cols={5} className="lg:grid-cols-7">
              {/* UX-10: 선택 날짜 기준으로 동적 라벨 표시 */}
              <StatCard label={todayLabel} value={`${todayTotal}건`} icon={<Users />} description="총 출석 시도 건수" />
              <StatCard label="출석 성공" value={`${todaySuccess}건`} variant="mint" icon={<CheckCircle2 />} description="성공 체크인 건수" />
              <StatCard label="출석 실패" value={`${todayFail}건`} icon={<XCircle />} description="실패 건수" />
              <StatCard label="PT 수업" value={`${todayPT}건`} variant="mint" icon={<CheckCircle2 />} description="PT 출석 건수" />
              <StatCard label="GX 수업" value={`${todayGX}건`} variant="peach" icon={<MapPin />} description="GX 수업 출석" />
              <StatCard label="신규 방문" value={`${todayNew}명`} icon={<User />} description="첫 방문 회원 수" />
              {/* #12 현재 재실 인원 */}
              <StatCard label="현재 재실" value={`${currentPresence}명`} variant="mint" icon={<Building2 />} description="현재 센터 내 인원" />
            </StatCardGrid>

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

            {/* 검색/필터 (BUG-09: onSearchChange, onFilterChange, onReset 연결) */}
            <SearchFilter
              searchPlaceholder="회원명, 연락처 검색"
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              onSearch={setSearchValue}
              filterValues={filterValues}
              onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
              onReset={() => { setSearchValue(""); setFilterValues({}); }}
              onRemoveFilter={(key) => setFilterValues(prev => { const next = { ...prev }; delete next[key]; return next; })}
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

            {/* 출석 테이블 — UI-124 (BUG-09: 필터링된 데이터 사용) */}
            <DataTable
              columns={columns}
              data={filteredTodayRecords}
              title="출석 이력 목록"
              pagination={{ page: 1, pageSize: 10, total: filteredTodayRecords.length }}
              selectable
              onDownloadExcel={() => {
                const exportColumns = [
                  { key: 'date', header: '날짜' },
                  { key: 'time', header: '시간' },
                  { key: 'memberName', header: '회원명' },
                  { key: 'attendanceType', header: '출석유형' },
                  { key: 'checkInMethod', header: '체크인방식' },
                  { key: 'status', header: '출석여부' },
                  { key: 'presence', header: '재실여부' },
                  { key: 'tel', header: '연락처' },
                ];
                exportToExcel(filteredTodayRecords as unknown as Record<string, unknown>[], exportColumns, { filename: '출석내역' });
                toast.success(`${filteredTodayRecords.length}건 엑셀 다운로드 완료`);
              }}
            />
          </>
        )}

        {!loading && viewMode === "week" && (
          <>
            <StatCardGrid cols={3}>
              <StatCard label="주간 총 출석" value={formatCount(weekTotal)} icon={<Users />} description="이번 주 출석" />
              <StatCard label="주간 PT 수업" value={`${weekPT}건`} variant="mint" icon={<CheckCircle2 />} description="이번 주 PT" />
              <StatCard label="주간 GX 수업" value={`${weekGX}건`} variant="peach" icon={<MapPin />} description="이번 주 GX" />
            </StatCardGrid>
            <WeeklyView data={weekData} weekLabel={weekLabel} />
          </>
        )}

        {!loading && viewMode === "month" && (
          <>
            <StatCardGrid cols={3}>
              <StatCard label="월간 총 출석" value={formatCount(monthTotal)} icon={<Users />} description={`${currentMonth}월 출석`} />
              <StatCard label="월간 PT 수업" value={`${monthPT}건`} variant="mint" icon={<CheckCircle2 />} description={`${currentMonth}월 PT`} />
              <StatCard label="월간 신규 방문" value={`${monthNew}명`} variant="peach" icon={<User />} description="첫 방문 회원" />
            </StatCardGrid>
            <MonthlyView data={monthlyData} year={currentYear} month={currentMonth} todayDay={todayDayOfMonth} />
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
                    <Button variant="ghost" size="sm" icon={<XCircle size={16} />} onClick={() => setPopups(p => p.filter(x => x.id !== popup.id))} />
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

      {/* ── 동선 분석 (구역별 트래킹) ─────────────────────────────── */}
      <div className="mt-lg">
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
          <div className="px-lg py-md border-b border-line flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-content">구역별 이용 현황</h3>
              <p className="text-[11px] text-content-tertiary mt-xs">시간대별 구역 이용 밀도를 파악하여 운영 효율을 높입니다</p>
            </div>
            <StatusBadge variant="info">실시간</StatusBadge>
          </div>
          <div className="p-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
              {[
                { zone: '웨이트 구역', current: Math.floor(Math.random() * 20) + 5, capacity: 30, color: 'bg-blue-500' },
                { zone: '유산소 구역', current: Math.floor(Math.random() * 15) + 3, capacity: 20, color: 'bg-green-500' },
                { zone: 'GX룸', current: Math.floor(Math.random() * 10), capacity: 15, color: 'bg-purple-500' },
                { zone: '탈의실', current: Math.floor(Math.random() * 8) + 2, capacity: 25, color: 'bg-orange-500' },
              ].map(zone => {
                const usage = Math.round((zone.current / zone.capacity) * 100);
                return (
                  <div key={zone.zone} className="p-md bg-surface-secondary rounded-xl border border-line">
                    <div className="flex items-center justify-between mb-sm">
                      <span className="text-[13px] font-semibold text-content">{zone.zone}</span>
                      <span className={cn(
                        "text-[11px] font-bold px-xs py-[2px] rounded-full",
                        usage > 80 ? "bg-red-100 text-red-700" :
                        usage > 50 ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      )}>
                        {usage}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-line rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", zone.color)}
                        style={{ width: `${Math.min(usage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-xs">
                      <span className="text-[11px] text-content-tertiary">현재 {zone.current}명</span>
                      <span className="text-[11px] text-content-tertiary">정원 {zone.capacity}명</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 시간대별 히트맵 미니 차트 */}
            <div className="mt-lg">
              <p className="text-[12px] font-semibold text-content-secondary mb-sm">시간대별 방문 밀도</p>
              <div className="flex gap-[3px]">
                {Array.from({ length: 18 }, (_, i) => {
                  const hour = i + 6; // 06:00 ~ 23:00
                  const density = hour >= 7 && hour <= 9 ? 0.8 :
                                  hour >= 11 && hour <= 13 ? 0.6 :
                                  hour >= 17 && hour <= 20 ? 0.9 :
                                  hour >= 21 ? 0.4 : 0.2 + Math.random() * 0.3;
                  return (
                    <div key={hour} className="flex flex-col items-center flex-1">
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height: '32px',
                          backgroundColor: `rgba(59, 130, 246, ${density})`,
                        }}
                        title={`${hour}:00 — 밀도 ${Math.round(density * 100)}%`}
                      />
                      {hour % 3 === 0 && (
                        <span className="text-[9px] text-content-tertiary mt-[2px]">{hour}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-md mt-sm text-[10px] text-content-tertiary">
                <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }} /> 한산</span>
                <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.6)' }} /> 보통</span>
                <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(59, 130, 246, 0.9)' }} /> 혼잡</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={handleManualSubmit}
        members={members}
      />
    </AppLayout>
  );
}
