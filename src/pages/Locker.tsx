
import React, { useState, useMemo } from "react";
import {
  Plus,
  LayoutGrid,
  List,
  RefreshCcw,
  Download,
  Search,
  MoreVertical,
  User,
  Calendar as CalendarIcon,
  Clock,
  Lock,
  ChevronRight,
  ArrowRightLeft,
  XCircle,
  History,
  UserPlus,
  Trash2,
  CheckSquare
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import { SearchFilter } from "@/components/SearchFilter";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

/**
 * 락커 관리 (Locker Management)
 * 센터 내 모든 락커(일일/개인/골프)의 배정·반납·상태를 시각적으로 관리합니다.
 */

// --- Types ---
type LockerStatus = "available" | "in_use" | "expiring" | "expired" | "unavailable";
type LockerType = "personal" | "daily" | "golf";

interface LockerData {
  id: string;
  number: number;
  type: LockerType;
  area: string;
  status: LockerStatus;
  memberName?: string;
  memberId?: string;
  expiryDate?: string;
  gender?: "M" | "F";
  lastUpdated?: string;
}

interface MockMember {
  id: string;
  name: string;
  contact: string;
  lockerId?: string; // 이미 배정된 락커 ID
}

// --- Mock Members ---
const MOCK_MEMBERS: MockMember[] = [
  { id: "m1", name: "김민수", contact: "010-1111-2222", lockerId: "p-3" },
  { id: "m2", name: "이영희", contact: "010-2222-3333" },
  { id: "m3", name: "박지성", contact: "010-3333-4444", lockerId: "p-7" },
  { id: "m4", name: "최유나", contact: "010-4444-5555" },
  { id: "m5", name: "정재욱", contact: "010-5555-6666" },
  { id: "m6", name: "강수진", contact: "010-6666-7777" },
  { id: "m7", name: "윤태호", contact: "010-7777-8888" },
  { id: "m8", name: "임소연", contact: "010-8888-9999" },
];

// --- Mock Data ---
const INITIAL_LOCKERS: LockerData[] = ([
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `p-${i + 1}`,
    number: i + 1,
    type: "personal" as LockerType,
    area: i < 20 ? "A구역" : "B구역",
    status: (["available", "in_use", "expiring", "expired", "unavailable"])[i % 5] as LockerStatus,
    memberName: i % 5 !== 0 && i % 5 !== 4 ? ["김민수", "이영희", "박지성", "최유나"][i % 4] : undefined,
    memberId: i % 5 !== 0 && i % 5 !== 4 ? ["m1", "m2", "m3", "m4"][i % 4] : undefined,
    expiryDate: i % 5 === 2 ? "2026-03-13" : i % 5 === 3 ? "2026-03-10" : "2026-03-15",
  })),
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `d-${i + 1}`,
    number: 100 + i + 1,
    type: "daily" as LockerType,
    area: i < 15 ? "남자" : "여자",
    status: (["available", "in_use"])[i % 2] as LockerStatus,
    memberName: i % 2 === 1 ? "임시회원" : undefined,
    gender: (i < 15 ? "M" : "F") as "M" | "F",
    lastUpdated: "10:30",
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `g-${i + 1}`,
    number: 500 + i + 1,
    type: "golf" as LockerType,
    area: "골프구역",
    status: (["available", "in_use", "expired"])[i % 3] as LockerStatus,
    memberName: i % 3 === 1 ? "골프회원" : undefined,
    expiryDate: "2026-04-01",
  })),
] as LockerData[]);

// --- 만료 D-Day 계산 ---
function getDDay(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Locker() {
  const [lockers, setLockers] = useState<LockerData[]>(INITIAL_LOCKERS);
  const [activeTab, setActiveTab] = useState("personal");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArea, setSelectedArea] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);

  // 만료 일괄 해제 선택
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedExpiredIds, setSelectedExpiredIds] = useState<Set<string>>(new Set());

  // Dialog states
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isUnavailableDialogOpen, setIsUnavailableDialogOpen] = useState(false);
  const [isBulkReleaseDialogOpen, setIsBulkReleaseDialogOpen] = useState(false);

  // 회원 배정 모달
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [assignExpiryDate, setAssignExpiryDate] = useState("");
  const [assignError, setAssignError] = useState("");

  // Tabs Definition
  const tabs = [
    { key: "personal", label: "개인 락커" },
    { key: "daily", label: "일일 락커" },
    { key: "golf", label: "골프 락커" },
  ];

  // Stats
  const stats = [
    { label: "총 락커 수", value: "637", icon: <Lock />, variant: "default" as const },
    { label: "이용자 수", value: "412", icon: <User />, variant: "mint" as const, change: { value: 12, label: "지난달 대비" } },
    { label: "만료 임박", value: "28", icon: <Clock />, variant: "peach" as const, description: "7일 이내 만료" },
    { label: "기간 만료", value: "15", icon: <XCircle />, variant: "default" as const, description: "현재 연체 중" },
  ];

  // Filtering Logic
  const filteredLockers = useMemo(() => {
    return lockers.filter((locker) => {
      const matchTab = locker.type === activeTab;
      const matchArea = selectedArea ? locker.area === selectedArea : true;
      const matchSearch = searchQuery
        ? locker.number.toString().includes(searchQuery) ||
          (locker.memberName && locker.memberName.includes(searchQuery))
        : true;
      return matchTab && matchArea && matchSearch;
    });
  }, [lockers, activeTab, selectedArea, searchQuery]);

  // 만료된 락커 목록
  const expiredLockers = useMemo(() =>
    filteredLockers.filter(l => l.status === "expired"),
    [filteredLockers]
  );

  const selectedLocker = useMemo(() =>
    lockers.find(l => l.id === selectedLockerId),
    [lockers, selectedLockerId]
  );

  // Filter Options
  const filterOptions = [
    {
      key: "area",
      label: "구역 선택",
      type: "select" as const,
      options: activeTab === "daily"
        ? [{ value: "남자", label: "남자 구역" }, { value: "여자", label: "여자 구역" }]
        : activeTab === "personal"
        ? [{ value: "A구역", label: "A구역" }, { value: "B구역", label: "B구역" }, { value: "C구역", label: "C구역" }]
        : [{ value: "골프구역", label: "골프구역" }]
    }
  ];

  // 회원 검색 결과
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return MOCK_MEMBERS;
    return MOCK_MEMBERS.filter(m =>
      m.name.includes(memberSearch) || m.contact.includes(memberSearch)
    );
  }, [memberSearch]);

  // Handler Actions
  const handleLockerClick = (id: string) => {
    if (bulkSelectMode) {
      const locker = lockers.find(l => l.id === id);
      if (!locker || locker.status !== "expired") return;
      setSelectedExpiredIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      return;
    }
    setSelectedLockerId(id);
    // 빈 락커 클릭 시 회원 배정 모달 열기
    const locker = lockers.find(l => l.id === id);
    if (locker && (locker.status === "available")) {
      setIsAssignModalOpen(true);
      setMemberSearch("");
      setSelectedMemberId(null);
      setAssignExpiryDate("");
      setAssignError("");
    }
  };

  // 회원 배정 처리
  const handleAssignConfirm = () => {
    if (!selectedMemberId) {
      setAssignError("배정할 회원을 선택해주세요.");
      return;
    }
    if (!assignExpiryDate) {
      setAssignError("만료일을 입력해주세요.");
      return;
    }
    const member = MOCK_MEMBERS.find(m => m.id === selectedMemberId);
    if (!member) return;
    if (member.lockerId) {
      setAssignError(`${member.name} 회원은 이미 ${member.lockerId} 락커에 배정되어 있습니다.`);
      return;
    }
    setLockers(prev => prev.map(l =>
      l.id === selectedLockerId
        ? { ...l, status: "in_use", memberName: member.name, memberId: member.id, expiryDate: assignExpiryDate }
        : l
    ));
    setIsAssignModalOpen(false);
    setSelectedLockerId(null);
  };

  // 만료 락커 일괄 해제
  const handleBulkRelease = () => {
    setLockers(prev => prev.map(l =>
      selectedExpiredIds.has(l.id)
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, expiryDate: undefined }
        : l
    ));
    setSelectedExpiredIds(new Set());
    setBulkSelectMode(false);
    setIsBulkReleaseDialogOpen(false);
  };

  const getStatusColor = (status: LockerStatus, expiryDate?: string) => {
    if (status === "expiring" || status === "in_use") {
      const dday = getDDay(expiryDate);
      if (dday !== null && dday <= 0) return "bg-[#FFEEEE] border-error text-error";
      if (dday !== null && dday <= 3) return "bg-[#FFF8E6] border-warning text-warning";
    }
    switch (status) {
      case "in_use": return "bg-bg-soft-mint border-secondary-mint text-secondary-mint";
      case "expiring": return "bg-bg-soft-peach border-warning text-warning";
      case "expired": return "bg-[#FFEEEE] border-error text-error";
      case "unavailable": return "bg-input-bg-light border-border-light text-text-grey-blue opacity-60";
      default: return "bg-3 border-border-light text-text-dark-grey";
    }
  };

  const getStatusLabel = (status: LockerStatus) => {
    switch (status) {
      case "available": return "사용 가능";
      case "in_use": return "사용 중";
      case "expiring": return "만료 임박";
      case "expired": return "기간 만료";
      case "unavailable": return "사용 불가";
    }
  };

  // D-Day 표시 레이블
  const getDDayLabel = (expiryDate?: string) => {
    const dday = getDDay(expiryDate);
    if (dday === null) return null;
    if (dday < 0) return `D+${Math.abs(dday)}`;
    if (dday === 0) return "D-0";
    return `D-${dday}`;
  };

  return (
    <AppLayout >
      {/* 1. Page Header */}
      <PageHeader title="락커 관리" description="센터 내 모든 락커의 배정 현황 및 상태를 관리합니다." actions={
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs rounded-button bg-bg-soft-peach px-md py-sm text-primary-coral hover:bg-primary-coral hover:text-white transition-colors">
              <RefreshCcw size={18} />
              <span className="text-Label">새로고침</span>
            </button>
            <button className="flex items-center gap-xs rounded-button bg-bg-soft-mint px-md py-sm text-secondary-mint hover:bg-secondary-mint hover:text-white transition-colors">
              <Download size={18} />
              <span className="text-Label">엑셀 다운로드</span>
            </button>
            <button className="flex items-center gap-xs rounded-button bg-primary-coral px-lg py-sm text-white shadow-sm hover:opacity-90 transition-opacity">
              <Plus size={20} />
              <span className="text-Body 1 font-bold">락커 추가</span>
            </button>
          </div>
        }/>

      {/* 2. Stats Overview */}
      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4 mb-xl" >
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat}/>
        ))}
      </div>

      {/* 3. Main Content Area */}
      <div className="flex flex-col gap-lg" >
        {/* Navigation & Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-border-light bg-3 p-md rounded-t-card-normal" >
          <TabNav
            className="border-none" tabs={tabs} activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setBulkSelectMode(false); setSelectedExpiredIds(new Set()); }}/>
          <div className="flex items-center gap-sm" >
            {/* 만료 락커 일괄 해제 버튼 */}
            {expiredLockers.length > 0 && (
              bulkSelectMode ? (
                <div className="flex items-center gap-xs">
                  <span className="text-Label text-text-grey-blue">{selectedExpiredIds.size}개 선택</span>
                  <button
                    className="flex items-center gap-xs rounded-button bg-error px-md py-sm text-white text-Label font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    disabled={selectedExpiredIds.size === 0}
                    onClick={() => setIsBulkReleaseDialogOpen(true)}
                  >
                    <Trash2 size={16} />
                    일괄 해제
                  </button>
                  <button
                    className="flex items-center gap-xs rounded-button bg-input-bg-light px-md py-sm text-text-grey-blue text-Label font-semibold hover:bg-border-light transition-colors"
                    onClick={() => { setBulkSelectMode(false); setSelectedExpiredIds(new Set()); }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-xs rounded-button bg-[#FFEEEE] px-md py-sm text-error text-Label font-semibold hover:bg-error hover:text-white transition-colors"
                  onClick={() => setBulkSelectMode(true)}
                >
                  <CheckSquare size={16} />
                  만료 락커 일괄 해제
                </button>
              )
            )}
            <div className="flex items-center bg-input-bg-light rounded-button p-[4px]" >
              <button
                className={cn(
                  "p-xs rounded-button transition-all",
                  viewMode === "grid" ? "bg-3 shadow-sm text-primary-coral" : "text-text-grey-blue"
                )} onClick={() => setViewMode("grid")}>
                <LayoutGrid size={20}/>
              </button>
              <button
                className={cn(
                  "p-xs rounded-button transition-all",
                  viewMode === "list" ? "bg-3 shadow-sm text-primary-coral" : "text-text-grey-blue"
                )} onClick={() => setViewMode("list")}>
                <List size={20}/>
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Select 안내 배너 */}
        {bulkSelectMode && (
          <div className="bg-[#FFF8E6] border border-warning rounded-card-normal px-md py-sm flex items-center gap-sm">
            <CheckSquare size={16} className="text-warning flex-shrink-0"/>
            <span className="text-Label text-warning font-medium">만료된 락커를 클릭하여 선택하세요. 선택 후 일괄 해제 버튼을 누르면 배정 정보가 초기화됩니다.</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-3 px-md pb-md" >
          <SearchFilter searchPlaceholder="락커 번호 또는 회원명 검색" searchValue={searchQuery} onSearchChange={setSearchQuery} filters={filterOptions} onFilterChange={(key, val) => key === "area" && setSelectedArea(val)} onReset={() => {
              setSearchQuery("");
              setSelectedArea("");
            }}/>
        </div>

        {/* Grid / List Content */}
        <div className="flex gap-lg items-start" >
          <div className="flex-1 bg-3 p-lg rounded-card-normal shadow-card-soft min-h-[600px]" >
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-md" >
                {filteredLockers.map((locker) => {
                  const dday = getDDay(locker.expiryDate);
                  const isExpiredAndSelectable = bulkSelectMode && locker.status === "expired";
                  const isSelected = selectedExpiredIds.has(locker.id);
                  return (
                    <div
                      className={cn(
                        "group relative flex flex-col items-center justify-center aspect-square rounded-card-normal border-[2px] transition-all cursor-pointer hover:scale-[1.05] active:scale-[0.98]",
                        getStatusColor(locker.status, locker.expiryDate),
                        selectedLockerId === locker.id && !bulkSelectMode ? "ring-2 ring-primary-coral ring-offset-2" : "",
                        isExpiredAndSelectable ? "cursor-pointer hover:scale-[1.05]" : "",
                        isSelected ? "ring-2 ring-error ring-offset-2 scale-[1.02]" : "",
                        bulkSelectMode && locker.status !== "expired" ? "opacity-40 cursor-not-allowed hover:scale-100" : ""
                      )} key={locker.id} onClick={() => handleLockerClick(locker.id)}>
                      {/* 일괄 선택 체크 */}
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-error text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <CheckSquare size={10}/>
                        </div>
                      )}
                      <span className="text-Heading 2 font-bold mb-xs" >{locker.number}</span>
                      {locker.status !== "available" && locker.status !== "unavailable" ? (
                        <div className="flex flex-col items-center" >
                          <span className="text-Label truncate max-w-[80px]" >{locker.memberName}</span>
                          {locker.expiryDate && (
                            <span className={cn(
                              "text-[10px] mt-[2px] font-semibold",
                              dday !== null && dday <= 0 ? "text-error" : dday !== null && dday <= 3 ? "text-warning" : "opacity-70"
                            )}>
                              {getDDayLabel(locker.expiryDate)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-Label font-medium" >{getStatusLabel(locker.status)}</span>
                      )}

                      {/* Hover indicator for Daily Locker */}
                      {locker.type === "daily" && locker.lastUpdated && (
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity" >
                          <Clock className="text-text-grey-blue" size={12}/>
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredLockers.length === 0 && (
                  <div className="col-span-full py-xxl flex flex-col items-center justify-center text-text-grey-blue" >
                    <XCircle className="mb-md opacity-20" size={48}/>
                    <p className="text-Body 1" >등록된 락커가 없습니다.</p>
                  </div>
                )}
              </div>
            ) : (
              <DataTable columns={[
                  { key: "number", header: "번호", width: 80, align: "center" },
                  { key: "area", header: "구역", width: 120 },
                  {
                    key: "status",
                    header: "상태",
                    width: 120,
                    render: (val: LockerStatus) => (
                      <StatusBadge
                        variant={val === "in_use" ? "success" : val === "expiring" ? "warning" : val === "expired" ? "error" : "default"}
                        dot
                      >
                        {getStatusLabel(val)}
                      </StatusBadge>
                    )
                  },
                  { key: "memberName", header: "이용자", width: 120, render: (val) => val || "-" },
                  {
                    key: "expiryDate",
                    header: "만료일",
                    width: 150,
                    render: (val: string | undefined, row: LockerData) => {
                      if (!val) return "-";
                      const dday = getDDay(val);
                      return (
                        <span className={cn(
                          dday !== null && dday <= 0 ? "text-error font-bold" : dday !== null && dday <= 3 ? "text-warning font-semibold" : ""
                        )}>
                          {val} {dday !== null && <span className="text-[11px]">({getDDayLabel(val)})</span>}
                        </span>
                      );
                    }
                  },
                  {
                    key: "actions",
                    header: "관리",
                    width: 80,
                    align: "center",
                    render: (_, row) => (
                      <button onClick={(e) => { e.stopPropagation(); handleLockerClick(row.id); }} className="p-xs hover:bg-bg-main-light-blue rounded-full">
                        <MoreVertical size={16} />
                      </button>
                    )
                  }
                ]} data={filteredLockers} selectable={true}/>
            )}
          </div>

          {/* Right Detail Panel */}
          {selectedLocker && !bulkSelectMode && (
            <div className="w-[360px] flex-shrink-0 bg-3 rounded-card-normal shadow-card-soft border border-border-light overflow-hidden sticky top-lg animate-in slide-in-from-right-4 duration-300" >
              <div className="p-lg border-b border-border-light bg-bg-soft-peach" >
                <div className="flex items-center justify-between mb-md" >
                  <h3 className="text-Heading 2 text-text-dark-grey font-bold" >
                    락커 상세 정보
                  </h3>
                  <button className="text-text-grey-blue hover:text-error" onClick={() => setSelectedLockerId(null)}>
                    <XCircle size={20}/>
                  </button>
                </div>
                <div className="flex items-center gap-md" >
                  <div className="w-xl h-xl bg-primary-coral rounded-card-normal flex items-center justify-center text-white" >
                    <span className="text-Heading 2 font-bold" >{selectedLocker.number}</span>
                  </div>
                  <div >
                    <p className="text-Label text-text-grey-blue" >{selectedLocker.area}</p>
                    <StatusBadge variant={selectedLocker.status === "in_use" ? "success" : selectedLocker.status === "expiring" ? "warning" : "default"}>
                      {getStatusLabel(selectedLocker.status)}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="p-lg space-y-xl" >
                {/* User Info */}
                {selectedLocker.status !== "available" && selectedLocker.status !== "unavailable" ? (
                  <div className="space-y-md" >
                    <div className="flex items-center justify-between" >
                      <span className="text-Body 2 text-text-grey-blue" >이용 회원</span>
                      <button
                        className="text-Body 1 font-bold text-text-dark-grey hover:text-primary-coral transition-colors flex items-center gap-xs" onClick={() => moveToPage(985)}>
                        {selectedLocker.memberName}
                        <ChevronRight size={14}/>
                      </button>
                    </div>
                    <div className="flex items-center justify-between" >
                      <span className="text-Body 2 text-text-grey-blue" >이용 기간</span>
                      <div className="text-right" >
                        <p className="text-Body 2 font-medium" >2026-02-01 ~</p>
                        <p className={cn(
                          "text-Body 2 font-bold",
                          (() => {
                            const d = getDDay(selectedLocker.expiryDate);
                            return d !== null && d <= 0 ? "text-error" : d !== null && d <= 3 ? "text-warning" : "text-primary-coral";
                          })()
                        )}>
                          {selectedLocker.expiryDate}
                          {selectedLocker.expiryDate && (
                            <span className="ml-xs text-[11px]">({getDDayLabel(selectedLocker.expiryDate)})</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between" >
                      <span className="text-Body 2 text-text-grey-blue" >비밀번호</span>
                      <div className="flex items-center gap-xs" >
                        <span className="text-Body 2 font-mono bg-input-bg-light px-sm py-[2px] rounded-sm" >****</span>
                        <button className="text-primary-coral text-Label underline" >조회</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-xl flex flex-col items-center justify-center border-2 border-dashed border-border-light rounded-card-normal" >
                    <UserPlus className="text-text-grey-blue mb-sm opacity-30" size={32}/>
                    <p className="text-Body 2 text-text-grey-blue mb-md" >현재 이용 중인 회원이 없습니다.</p>
                    <button
                      className="bg-secondary-mint text-white px-lg py-sm rounded-button text-Label font-bold hover:opacity-90"
                      onClick={() => {
                        setIsAssignModalOpen(true);
                        setMemberSearch("");
                        setSelectedMemberId(null);
                        setAssignExpiryDate("");
                        setAssignError("");
                      }}
                    >
                      회원 배정하기
                    </button>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-sm" >
                  {selectedLocker.status === "in_use" || selectedLocker.status === "expiring" || selectedLocker.status === "expired" ? (
                    <>
                      <button
                        className="flex flex-col items-center justify-center gap-xs p-md border border-border-light rounded-button hover:bg-bg-soft-peach hover:border-primary-coral transition-all group" onClick={() => setIsReturnDialogOpen(true)}>
                        <ArrowRightLeft className="text-text-grey-blue group-hover:text-primary-coral" size={20}/>
                        <span className="text-Label font-bold" >반납/이동</span>
                      </button>
                      <button className="flex flex-col items-center justify-center gap-xs p-md border border-border-light rounded-button hover:bg-bg-soft-mint hover:border-secondary-mint transition-all group" >
                        <History className="text-text-grey-blue group-hover:text-secondary-mint" size={20}/>
                        <span className="text-Label font-bold" >사용 이력</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="flex flex-col items-center justify-center gap-xs p-md border border-border-light rounded-button hover:bg-[#FFEEEE] hover:border-error transition-all group" onClick={() => setIsUnavailableDialogOpen(true)}>
                        <XCircle className="text-text-grey-blue group-hover:text-error" size={20}/>
                        <span className="text-Label font-bold" >사용불가 설정</span>
                      </button>
                      <button className="flex flex-col items-center justify-center gap-xs p-md border border-border-light rounded-button hover:bg-bg-soft-mint hover:border-secondary-mint transition-all group" >
                        <Plus className="text-text-grey-blue group-hover:text-secondary-mint" size={20}/>
                        <span className="text-Label font-bold" >정보 수정</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Additional Info (RFID) */}
                <div
                  className="bg-bg-main-light-blue p-md rounded-card-normal cursor-pointer hover:bg-bg-soft-mint transition-colors group" onClick={() => moveToPage(979)}>
                  <div className="flex items-center justify-between mb-xs" >
                    <div className="flex items-center gap-sm" >
                      <RefreshCcw className="text-secondary-mint" size={16}/>
                      <span className="text-Label font-bold text-text-dark-grey" >RFID 연동 정보</span>
                    </div>
                    <ChevronRight className="text-text-grey-blue group-hover:text-secondary-mint transition-colors" size={14}/>
                  </div>
                  <p className="text-[11px] text-text-grey-blue leading-relaxed" >
                    마지막 인식: 2026-02-19 09:45 (A-01 리더기)
                    <br />
                    태그 ID: 88:01:A2:FF:11:00
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 회원 배정 모달 */}
      {isAssignModalOpen && selectedLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-card-normal shadow-xl w-[480px] max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* 모달 헤더 */}
            <div className="p-lg border-b border-border-light bg-bg-soft-peach flex items-center justify-between">
              <div>
                <h3 className="text-Heading 2 font-bold text-text-dark-grey">회원 배정</h3>
                <p className="text-Label text-text-grey-blue mt-[2px]">{selectedLocker.number}번 락커 · {selectedLocker.area}</p>
              </div>
              <button className="text-text-grey-blue hover:text-error" onClick={() => setIsAssignModalOpen(false)}>
                <XCircle size={20}/>
              </button>
            </div>

            <div className="p-lg flex flex-col gap-lg overflow-y-auto flex-1">
              {/* 회원 검색 */}
              <div>
                <label className="text-Label font-semibold text-text-dark-grey block mb-sm">회원 검색</label>
                <div className="relative">
                  <Search size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue"/>
                  <input
                    type="text"
                    placeholder="회원명 또는 연락처 검색"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-xl pr-md py-sm border border-border-light rounded-button text-Body-2 focus:outline-none focus:border-primary-coral transition-colors"
                  />
                </div>
              </div>

              {/* 회원 목록 */}
              <div className="border border-border-light rounded-card-normal overflow-hidden max-h-[220px] overflow-y-auto">
                {filteredMembers.length === 0 ? (
                  <div className="p-lg text-center text-text-grey-blue text-Label">검색 결과가 없습니다.</div>
                ) : (
                  filteredMembers.map(member => {
                    const alreadyAssigned = !!member.lockerId;
                    return (
                      <button
                        key={member.id}
                        disabled={alreadyAssigned}
                        onClick={() => { setSelectedMemberId(member.id); setAssignError(""); }}
                        className={cn(
                          "w-full flex items-center justify-between px-md py-sm text-left transition-colors border-b border-border-light last:border-0",
                          selectedMemberId === member.id ? "bg-bg-soft-mint" : "hover:bg-bg-main-light-blue",
                          alreadyAssigned ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-sm">
                          <div className="w-[32px] h-[32px] bg-bg-soft-peach rounded-full flex items-center justify-center">
                            <User size={14} className="text-primary-coral"/>
                          </div>
                          <div>
                            <p className="text-Body 2 font-semibold text-text-dark-grey">{member.name}</p>
                            <p className="text-[11px] text-text-grey-blue">{member.contact}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-xs">
                          {alreadyAssigned && (
                            <span className="text-[10px] bg-[#FFEEEE] text-error px-xs py-[2px] rounded-sm font-medium">배정됨</span>
                          )}
                          {selectedMemberId === member.id && !alreadyAssigned && (
                            <span className="text-[10px] bg-bg-soft-mint text-secondary-mint px-xs py-[2px] rounded-sm font-medium">선택됨</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* 만료일 설정 */}
              <div>
                <label className="text-Label font-semibold text-text-dark-grey block mb-sm">
                  만료일 <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <CalendarIcon size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue pointer-events-none"/>
                  <input
                    type="date"
                    value={assignExpiryDate}
                    onChange={(e) => { setAssignExpiryDate(e.target.value); setAssignError(""); }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full pl-xl pr-md py-sm border border-border-light rounded-button text-Body-2 focus:outline-none focus:border-primary-coral transition-colors"
                  />
                </div>
              </div>

              {/* 에러 메시지 */}
              {assignError && (
                <div className="bg-[#FFEEEE] border border-error rounded-button px-md py-sm text-Label text-error">
                  {assignError}
                </div>
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="p-lg border-t border-border-light flex items-center justify-end gap-sm bg-white">
              <button
                className="px-lg py-sm rounded-button border border-border-light text-text-grey-blue text-Label font-semibold hover:bg-input-bg-light transition-colors"
                onClick={() => setIsAssignModalOpen(false)}
              >
                취소
              </button>
              <button
                className="px-lg py-sm rounded-button bg-secondary-mint text-white text-Label font-semibold hover:opacity-90 transition-opacity"
                onClick={handleAssignConfirm}
              >
                배정 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog open={isReturnDialogOpen} title="락커 반납 처리" description={`${selectedLocker?.number}번 락커를 반납 처리하시겠습니까? 반납 시 해당 회원의 배정 정보가 초기화됩니다.`} confirmLabel="반납 처리" onConfirm={() => {
          setIsReturnDialogOpen(false);
          alert("반납 처리되었습니다.");
        }} onCancel={() => setIsReturnDialogOpen(false)}/>

      <ConfirmDialog open={isUnavailableDialogOpen} title="사용 불가 설정" description="해당 락커를 '사용 불가' 상태로 전환하시겠습니까? 시설 보수나 기타 사유로 인해 회원 배정이 차단됩니다." variant="danger" confirmLabel="설정하기" onConfirm={() => {
          setIsUnavailableDialogOpen(false);
          alert("사용 불가로 설정되었습니다.");
        }} onCancel={() => setIsUnavailableDialogOpen(false)}/>

      <ConfirmDialog
        open={isBulkReleaseDialogOpen}
        title="만료 락커 일괄 해제"
        description={`선택한 ${selectedExpiredIds.size}개의 만료 락커를 일괄 해제하시겠습니까?\n해제 시 배정된 회원 정보가 모두 초기화됩니다.`}
        variant="danger"
        confirmLabel={`${selectedExpiredIds.size}개 일괄 해제`}
        onConfirm={handleBulkRelease}
        onCancel={() => setIsBulkReleaseDialogOpen(false)}
      />
    </AppLayout>
  );
}
