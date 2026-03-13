import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  User,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
  MoveRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { supabase } from "@/lib/supabase";
import { exportToExcel } from "@/lib/exportExcel";
import { toast } from "sonner";

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-051: 락커 배정 관리
 * UI-089 회원 검색 AutoComplete
 * UI-090 빈 락커 선택 그리드
 * UI-091 배정 버튼 (회원+락커 모두 선택 시 활성화)
 * UI-092 일괄 해제 버튼 (만료 락커 일괄 해제, 확인 모달)
 */

type LockerStatus = "available" | "in_use" | "overtime" | "abnormal" | "disabled";
type LockerType   = "daily" | "personal" | "golf";

interface Locker {
  id: string;
  number: string;
  type: LockerType;
  status: LockerStatus;
  gender?: "M" | "F";
  userName: string | null;
  expiryDate: string | null;
}

interface Member {
  id: string;
  name: string;
  contact: string;
  memberNo: string;
}


/** DB 락커 상태 → UI 상태 매핑 */
const mapLockerStatus = (dbStatus: string, expiresAt: string | null): LockerStatus => {
  if (dbStatus === "MAINTENANCE") return "disabled";
  if (dbStatus === "AVAILABLE") return "available";
  if (dbStatus === "IN_USE") {
    if (expiresAt && new Date(expiresAt) < new Date()) return "overtime";
    return "in_use";
  }
  return "available";
};

/** Supabase lockers → UI Locker 배열 변환 */
const mapDbLockers = (data: any[], type: LockerType): Locker[] =>
  data.map((r: any) => ({
    id: `${type}-${r.id}`,
    number: r.number,
    type,
    status: mapLockerStatus(r.status, r.expiresAt),
    userName: r.memberName ?? r.member?.name ?? null,
    expiryDate: r.expiresAt ? r.expiresAt.slice(0, 10) : null,
    gender: undefined,
  }));

// --- 상태별 셀 스타일 ---
const LOCKER_CELL_STYLES: Record<LockerStatus, string> = {
  available: "bg-surface border-line text-content cursor-pointer hover:border-primary hover:bg-primary/5",
  in_use:    "bg-state-info/10 border-state-info text-state-info cursor-pointer hover:opacity-80",
  overtime:  "bg-primary/10 border-primary text-primary cursor-pointer hover:opacity-80",
  abnormal:  "bg-state-error/5 border-state-error text-state-error cursor-not-allowed",
  disabled:  "bg-surface-secondary border-line text-content-secondary grayscale opacity-50 cursor-not-allowed",
};

export default function LockerManagement() {
  const [activeTab, setActiveTab] = useState<LockerType>("daily");
  const [dailyLockers,    setDailyLockers]    = useState<Locker[]>([]);
  const [personalLockers, setPersonalLockers] = useState<Locker[]>([]);
  const [golfLockers,     setGolfLockers]     = useState<Locker[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase 회원 목록
  const [dbMembers, setDbMembers] = useState<Member[]>([]);

  /** 락커 데이터 Supabase에서 조회 */
  const fetchLockers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('lockers')
      .select('*, member:members(name, phone)')
      .eq('branchId', getBranchId())
      .order('number');

    if (error) {
      console.error("락커 데이터 로드 실패:", error);
      toast.error("락커 데이터를 불러오지 못했습니다.");
    } else if (data) {
      // number 기반으로 type 분류 (DB에 type 필드가 없으면 number 범위로 구분)
      // 일괄 매핑: 모든 락커를 daily 탭에 표시 (실제 운영 시 type 필드 추가 권장)
      setDailyLockers(mapDbLockers(data, "daily"));
      // personal, golf는 별도 type 필드가 있을 때 분류
      setPersonalLockers([]);
      setGolfLockers([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLockers();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setDbMembers(data.map((m: any, i: number) => ({
          id: String(m.id),
          name: m.name,
          contact: m.phone,
          memberNo: `M-${10234 + i}`,
        })));
      }
    };
    fetchMembers();
  }, []);

  // UI-089: 회원 검색 AutoComplete
  const [memberSearch,    setMemberSearch]    = useState("");
  const [isDropdownOpen,  setIsDropdownOpen]  = useState(false);
  const [selectedMember,  setSelectedMember]  = useState<Member | null>(null);

  // UI-090: 빈 락커 선택
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);

  // UI-092: 일괄 해제
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  // 만료일 입력 (기본값: 오늘 + 3개월)
  const defaultExpiryDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  })();
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);

  // 할당 완료 모달
  const [isAssignSuccess, setIsAssignSuccess] = useState(false);

  const currentLockers = useMemo(() => {
    switch (activeTab) {
      case "daily":    return dailyLockers;
      case "personal": return personalLockers;
      case "golf":     return golfLockers;
    }
  }, [activeTab, dailyLockers, personalLockers, golfLockers]);

  const setCurrentLockers = (updater: (prev: Locker[]) => Locker[]) => {
    switch (activeTab) {
      case "daily":    setDailyLockers(updater);    break;
      case "personal": setPersonalLockers(updater); break;
      case "golf":     setGolfLockers(updater);     break;
    }
  };

  const stats = useMemo(() => ({
    total:     currentLockers.length,
    inUse:     currentLockers.filter(l => l.status === "in_use").length,
    available: currentLockers.filter(l => l.status === "available").length,
    overtime:  currentLockers.filter(l => l.status === "overtime").length,
    abnormal:  currentLockers.filter(l => l.status === "abnormal").length,
  }), [currentLockers]);

  // UI-090: 빈 락커만 표시
  const availableLockers = useMemo(() =>
    currentLockers.filter(l => l.status === "available"),
    [currentLockers]
  );

  // FN-050: 추천 락커 — 번호가 가장 작은 AVAILABLE 락커
  const recommendedLocker = useMemo(() => {
    if (availableLockers.length === 0) return null;
    return availableLockers.reduce((min, l) =>
      Number(l.number) < Number(min.number) ? l : min
    );
  }, [availableLockers]);

  // 만료(overtime) 락커
  const overtimeLockers = useMemo(() =>
    currentLockers.filter(l => l.status === "overtime"),
    [currentLockers]
  );

  // UI-089: AutoComplete 필터
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return [];
    return dbMembers.filter(m =>
      m.name.includes(memberSearch) ||
      m.contact.includes(memberSearch) ||
      m.memberNo.includes(memberSearch)
    );
  }, [memberSearch, dbMembers]);

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setMemberSearch(member.name);
    setIsDropdownOpen(false);
  };

  // UI-091: 배정 버튼 — 회원 + 락커 모두 선택 시 활성화
  const canAssign = !!selectedMember && !!selectedLockerId;

  const handleAssign = () => {
    if (!canAssign || !selectedMember || !selectedLockerId) return;
    setCurrentLockers(prev => prev.map(l =>
      l.id === selectedLockerId
        ? { ...l, status: "in_use", userName: selectedMember.name, expiryDate }
        : l
    ));
    setSelectedMember(null);
    setMemberSearch("");
    setSelectedLockerId(null);
    setIsAssignSuccess(true);
    setTimeout(() => setIsAssignSuccess(false), 3000);
  };

  // UI-092: 일괄 해제 — 만료 락커 전부
  const handleBulkRelease = () => {
    setCurrentLockers(prev => prev.map(l =>
      l.status === "overtime"
        ? { ...l, status: "available", userName: null, expiryDate: null }
        : l
    ));
    setIsBulkDialogOpen(false);
  };

  const tabDefs = [
    { key: "daily",    label: "일일 사물함",  count: dailyLockers.length    },
    { key: "personal", label: "개인 사물함",  count: personalLockers.length },
    { key: "golf",     label: "골프 사물함",  count: golfLockers.length     },
  ];

  /** 상태 동기화: Supabase에서 최신 데이터 refetch */
  const handleSync = () => {
    fetchLockers();
    toast.success("락커 상태를 동기화했습니다.");
  };

  /** 엑셀 다운로드 */
  const handleExcelDownload = () => {
    const exportColumns = [
      { key: "number", header: "번호" },
      { key: "type", header: "구분" },
      { key: "status", header: "상태" },
      { key: "userName", header: "회원명" },
      { key: "expiryDate", header: "만료일" },
    ];
    const statusLabel: Record<LockerStatus, string> = {
      available: "사용가능", in_use: "사용중", overtime: "시간초과",
      abnormal: "비정상", disabled: "사용불가",
    };
    const typeLabel: Record<LockerType, string> = {
      daily: "일일", personal: "개인", golf: "골프",
    };
    const exportData = currentLockers.map(l => ({
      number: l.number,
      type: typeLabel[l.type],
      status: statusLabel[l.status],
      userName: l.userName ?? "",
      expiryDate: l.expiryDate ?? "",
    }));
    exportToExcel(exportData as Record<string, unknown>[], exportColumns, { filename: "사물함_현황" });
    toast.success("엑셀 다운로드가 완료되었습니다.");
  };

  const renderLockerSection = (lockers: Locker[], title?: string, filterGender?: "M" | "F") => {
    const list = filterGender ? lockers.filter(l => l.gender === filterGender) : lockers;
    return (
      <div className="mb-xl">
        {title && <h3 className="text-[14px] font-bold text-content mb-md">{title}</h3>}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-sm">
          {list.map(locker => (
            <div
              key={locker.id}
              className={cn(
                "relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center p-xs transition-all hover:shadow-sm active:scale-95 select-none",
                LOCKER_CELL_STYLES[locker.status]
              )}
              onClick={() => {
                if (locker.status !== "available" && locker.status !== "in_use" && locker.status !== "overtime") return;
                moveToPage(985, { id: locker.id });
              }}
            >
              <span className="text-[12px] font-bold mb-[2px]">{locker.number}</span>
              {locker.userName ? (
                <span
                  className="text-[9px] font-medium truncate w-full text-center hover:underline"
                  onClick={e => { e.stopPropagation(); moveToPage(985, { id: locker.id }); }}
                >
                  {locker.userName}
                </span>
              ) : (
                <span className="text-[9px] opacity-40">빈</span>
              )}
              {locker.status === "overtime" && (
                <div className="absolute top-1 right-1">
                  <AlertTriangle className="text-primary animate-pulse" size={10} />
                </div>
              )}
              {locker.status === "abnormal" && (
                <div className="absolute top-1 right-1">
                  <XCircle className="text-state-error" size={10} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <PageHeader
        title="사물함 배정 관리"
        description="시설 내 일일, 개인, 골프 사물함의 이용 현황을 실시간으로 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              className="flex items-center gap-xs px-md py-sm rounded-lg border border-line bg-surface text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold"
              onClick={() => moveToPage(979)}
            >
              <MoveRight size={15} /> 밴드/카드 관리
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm rounded-lg border border-line bg-surface text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold"
              onClick={handleSync}
            >
              <RefreshCw size={15} /> 상태 동기화
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm rounded-lg bg-state-info/10 border border-state-info/20 text-state-info hover:opacity-90 transition-opacity text-[13px] font-semibold"
              onClick={handleExcelDownload}
            >
              <Download size={15} /> 엑셀 다운로드
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-md mb-xl">
        <StatCard label="총 사물함"     value={stats.total}     icon={<User />} />
        <StatCard label="사용 가능"     value={stats.available} icon={<CheckCircle2 />} variant="mint" />
        <StatCard label="사용 중"       value={stats.inUse}     icon={<User />} />
        <StatCard label="시간 초과"     value={stats.overtime}  icon={<AlertTriangle />} variant="peach" />
        <StatCard label="상태 비정상"   value={stats.abnormal}  icon={<XCircle />} />
      </div>

      {/* 탭 + 콘텐츠 */}
      <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-lg pt-sm">
          <div className="flex items-center gap-[2px] bg-surface-tertiary rounded-lg p-[3px]">
            {tabDefs.map(tab => (
              <button
                key={tab.key}
                className={cn(
                  "flex items-center gap-[6px] px-md py-[6px] rounded-md text-[13px] font-medium transition-all whitespace-nowrap",
                  activeTab === tab.key ? "bg-surface text-content shadow-xs" : "text-content-secondary hover:text-content"
                )}
                onClick={() => {
                  setActiveTab(tab.key as LockerType);
                  setSelectedLockerId(null);
                }}
              >
                {tab.label}
                <span className={cn(
                  "px-[6px] py-px rounded-full text-[10px] font-semibold tabular-nums",
                  activeTab === tab.key ? "bg-primary text-white" : "bg-line text-content-secondary"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          <div className="text-[12px] text-content-secondary pb-sm">
            {isLoading ? "동기화 중..." : `최종 갱신: ${new Date().toLocaleString("ko-KR")}`}
          </div>
        </div>

        <div className="p-lg space-y-xl">
          {/* === UI-089 회원 검색 AutoComplete === */}
          <div className="bg-surface-secondary/50 rounded-xl p-lg border border-line">
            <h3 className="text-[14px] font-bold text-content mb-md">락커 배정</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
              {/* 회원 검색 */}
              <div className="md:col-span-1">
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
                  회원 검색 <span className="text-state-error">*</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
                  <input
                    className="w-full h-10 pl-[36px] pr-md rounded-lg bg-surface border border-line text-[13px] focus:border-primary outline-none transition-all"
                    placeholder="회원명, 연락처, 회원번호 검색"
                    value={memberSearch}
                    onChange={e => {
                      setMemberSearch(e.target.value);
                      setSelectedMember(null);
                      setIsDropdownOpen(true);
                    }}
                    onFocus={() => memberSearch && setIsDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
                  />
                  {/* AutoComplete 드롭다운 */}
                  {isDropdownOpen && filteredMembers.length > 0 && (
                    <div className="absolute top-full mt-xs left-0 right-0 bg-surface border border-line rounded-lg shadow-lg z-20 max-h-[200px] overflow-y-auto">
                      {filteredMembers.map(m => (
                        <button
                          key={m.id}
                          className="w-full flex items-center gap-md px-md py-sm hover:bg-surface-secondary transition-colors text-left border-b border-line last:border-b-0"
                          onMouseDown={() => handleMemberSelect(m)}
                        >
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-primary" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-content">{m.name}</p>
                            <p className="text-[11px] text-content-secondary">{m.memberNo} · {m.contact}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedMember && (
                  <div className="mt-xs flex items-center gap-sm p-sm bg-state-success/5 rounded-lg border border-state-success/20">
                    <CheckCircle2 size={14} className="text-state-success" />
                    <div>
                      <p className="text-[12px] font-bold text-state-success">{selectedMember.name}</p>
                      <p className="text-[11px] text-content-secondary">{selectedMember.memberNo}</p>
                    </div>
                    <button
                      className="ml-auto text-content-tertiary hover:text-content-secondary"
                      onClick={() => { setSelectedMember(null); setMemberSearch(""); }}
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* FN-050: 추천 락커 */}
              <div className="md:col-span-1">
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
                  추천 락커
                </label>
                {recommendedLocker ? (
                  <button
                    className="w-full h-10 rounded-lg border border-state-success/40 bg-state-success/5 flex items-center justify-between px-md text-[13px] text-state-success font-semibold hover:bg-state-success/10 transition-colors"
                    onClick={() => setSelectedLockerId(recommendedLocker.id)}
                    type="button"
                  >
                    <span>{recommendedLocker.number}번 락커 (최소 번호)</span>
                    <span className="text-[11px] font-normal opacity-70">클릭하여 선택</span>
                  </button>
                ) : (
                  <div className="h-10 rounded-lg border border-line bg-surface flex items-center px-md text-[13px] text-content-tertiary">
                    사용 가능한 락커 없음
                  </div>
                )}
              </div>

              {/* 선택된 락커 확인 */}
              <div className="md:col-span-1">
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
                  선택된 락커 <span className="text-state-error">*</span>
                </label>
                <div className={cn(
                  "h-10 rounded-lg border flex items-center px-md text-[13px] transition-all",
                  selectedLockerId
                    ? "bg-state-info/5 border-state-info text-state-info font-semibold"
                    : "bg-surface border-line text-content-tertiary"
                )}>
                  {selectedLockerId
                    ? `${availableLockers.find(l => l.id === selectedLockerId)?.number}번 락커 선택됨`
                    : "아래 그리드에서 빈 락커를 선택하세요"
                  }
                </div>
              </div>

              {/* 만료일 입력 */}
              <div className="md:col-span-1">
                <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
                  만료일 <span className="text-state-error">*</span>
                </label>
                <input
                  type="date"
                  className="w-full h-10 px-md rounded-lg bg-surface border border-line text-[13px] focus:border-primary outline-none transition-all"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                />
              </div>

              {/* UI-091 배정 버튼 */}
              <div className="md:col-span-1 flex flex-col justify-end">
                <button
                  className={cn(
                    "h-10 rounded-lg text-[13px] font-bold transition-all shadow-sm",
                    canAssign
                      ? "bg-primary text-white hover:opacity-90"
                      : "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
                  )}
                  disabled={!canAssign}
                  onClick={handleAssign}
                >
                  배정 완료
                </button>
                {isAssignSuccess && (
                  <p className="text-[12px] text-state-success mt-xs flex items-center gap-xs">
                    <CheckCircle2 size={13} /> 배정이 완료되었습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* UI-092 일괄 해제 버튼 */}
          {overtimeLockers.length > 0 && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-lg py-sm">
              <div className="flex items-center gap-sm">
                <AlertTriangle size={16} className="text-amber-600" />
                <span className="text-[13px] font-semibold text-amber-700">
                  시간 초과 사물함 {overtimeLockers.length}개
                </span>
                <span className="text-[12px] text-amber-600">일괄 반납 처리가 필요합니다.</span>
              </div>
              <button
                className="flex items-center gap-xs px-md py-xs rounded-lg bg-amber-600 text-white text-[12px] font-bold hover:opacity-90 transition-all"
                onClick={() => setIsBulkDialogOpen(true)}
              >
                <Trash2 size={13} />
                {overtimeLockers.length}개 일괄 해제
              </button>
            </div>
          )}

          {/* UI-090 빈 락커 선택 그리드 */}
          <div>
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-[14px] font-bold text-content">
                빈 사물함 선택
                <span className="ml-sm text-[12px] font-normal text-content-secondary">
                  ({availableLockers.length}개 사용 가능)
                </span>
              </h3>
            </div>
            {availableLockers.length === 0 ? (
              <div className="py-xl flex flex-col items-center justify-center text-content-secondary border border-dashed border-line rounded-xl">
                <XCircle className="mb-sm opacity-20" size={36} />
                <p className="text-[13px]">사용 가능한 사물함이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-sm">
                {availableLockers.map(locker => (
                  <button
                    key={locker.id}
                    className={cn(
                      "aspect-square rounded-xl border-2 flex flex-col items-center justify-center text-[12px] font-bold transition-all hover:scale-[1.05] active:scale-[0.97]",
                      selectedLockerId === locker.id
                        ? "bg-primary border-primary text-white shadow-md scale-[1.05]"
                        : "bg-surface-tertiary border-line text-content-secondary hover:border-primary hover:text-primary hover:bg-primary/5"
                    )}
                    onClick={() => setSelectedLockerId(
                      selectedLockerId === locker.id ? null : locker.id
                    )}
                  >
                    {locker.number}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 전체 사물함 그리드 (현황 파악용) */}
          <div>
            <h3 className="text-[14px] font-bold text-content mb-md">전체 현황</h3>
            {activeTab === "daily" ? (
              <>
                {renderLockerSection(currentLockers, "남자 구역 (88개)", "M")}
                <div className="border-t border-line my-xl" />
                {renderLockerSection(currentLockers, "여자 구역 (116개)", "F")}
              </>
            ) : (
              renderLockerSection(currentLockers)
            )}
          </div>

          {/* 상태 범례 */}
          <div className="pt-md border-t border-line flex items-center gap-lg flex-wrap">
            <span className="text-[12px] font-semibold text-content-secondary">상태 범례</span>
            {[
              { label: "사용 가능", color: "bg-surface border-line" },
              { label: "사용 중",   color: "bg-state-info/10 border-state-info" },
              { label: "시간 초과", color: "bg-primary/10 border-primary" },
              { label: "비정상",    color: "bg-state-error/5 border-state-error" },
              { label: "사용 불가", color: "bg-surface-secondary border-line opacity-50" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-xs">
                <div className={cn("w-4 h-4 rounded border-2", item.color)} />
                <span className="text-[12px] text-content-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UI-092 일괄 해제 확인 모달 */}
      <ConfirmDialog
        open={isBulkDialogOpen}
        title="시간 초과 사물함 일괄 해제"
        description={`시간 초과된 사물함 ${overtimeLockers.length}개를 일괄 반납 처리하시겠습니까?\n처리 시 배정된 회원 정보가 모두 초기화됩니다.`}
        variant="danger"
        confirmLabel={`${overtimeLockers.length}개 일괄 해제`}
        onConfirm={handleBulkRelease}
        onCancel={() => setIsBulkDialogOpen(false)}
      />
    </AppLayout>
  );
}

// 내부 헬퍼 (renderLockerSection)
function renderLockerSection(lockers: Locker[], title?: string, filterGender?: "M" | "F") {
  const list = filterGender ? lockers.filter(l => l.gender === filterGender) : lockers;

  const CELL_STYLES: Record<LockerStatus, string> = {
    available: "bg-surface border-line text-content",
    in_use:    "bg-state-info/10 border-state-info text-state-info",
    overtime:  "bg-primary/10 border-primary text-primary",
    abnormal:  "bg-state-error/5 border-state-error text-state-error",
    disabled:  "bg-surface-secondary border-line text-content-secondary grayscale opacity-50",
  };

  return (
    <div className="mb-xl">
      {title && <h3 className="text-[13px] font-bold text-content mb-sm">{title}</h3>}
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-xs">
        {list.map(locker => (
          <div
            key={locker.id}
            className={cn(
              "relative aspect-square rounded-lg border flex flex-col items-center justify-center p-xs transition-all select-none",
              CELL_STYLES[locker.status],
              (locker.status === "available" || locker.status === "in_use" || locker.status === "overtime")
                ? "cursor-pointer hover:shadow-sm hover:scale-[1.03] active:scale-95"
                : "cursor-not-allowed"
            )}
            onClick={() => {
              if (locker.status === "in_use" || locker.status === "overtime") moveToPage(985, { id: locker.id });
            }}
          >
            <span className="text-[10px] font-bold">{locker.number}</span>
            {locker.userName && (
              <span className="text-[8px] truncate w-full text-center opacity-80">{locker.userName}</span>
            )}
            {locker.status === "overtime" && (
              <AlertTriangle className="absolute top-[2px] right-[2px] text-primary animate-pulse" size={8} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
