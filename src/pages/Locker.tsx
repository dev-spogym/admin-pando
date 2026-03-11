
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
  UserPlus
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

// --- Mock Data ---
const MOCK_LOCKERS: LockerData[] = [
  ...Array.from({ length: 40 }, (_, i) => ({
    id: `p-${i + 1}`,
    number: i + 1,
    type: "personal" as LockerType,
    area: i < 20 ? "A구역" : "B구역",
    status: (["available", "in_use", "expiring", "expired", "unavailable"])[Math.floor(Math.random() * 5)] as LockerStatus,
    memberName: Math.random() > 0.4 ? ["김민수", "이영희", "박지성", "최유나", "정재욱"][Math.floor(Math.random() * 5)] : undefined,
    expiryDate: "2026-03-15",
  })),
  ...Array.from({ length: 30 }, (_, i) => ({
    id: `d-${i + 1}`,
    number: 100 + i + 1,
    type: "daily" as LockerType,
    area: i < 15 ? "남자" : "여자",
    status: (["available", "in_use"])[Math.floor(Math.random() * 2)] as LockerStatus,
    memberName: Math.random() > 0.7 ? "임시회원" : undefined,
    gender: i < 15 ? "M" : "F",
    lastUpdated: "10:30",
  })),
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `g-${i + 1}`,
    number: 500 + i + 1,
    type: "golf" as LockerType,
    area: "골프구역",
    status: (["available", "in_use", "expired"])[Math.floor(Math.random() * 3)] as LockerStatus,
    memberName: Math.random() > 0.5 ? "골프회원" : undefined,
    expiryDate: "2026-04-01",
  })),
];

export default function Locker() {
  const [activeTab, setActiveTab] = useState("personal");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArea, setSelectedArea] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  
  // Dialog states
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [isUnavailableDialogOpen, setIsUnavailableDialogOpen] = useState(false);

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
    return MOCK_LOCKERS.filter((locker) => {
      const matchTab = locker.type === activeTab;
      const matchArea = selectedArea ? locker.area === selectedArea : true;
      const matchSearch = searchQuery
        ? locker.number.toString().includes(searchQuery) || 
          (locker.memberName && locker.memberName.includes(searchQuery))
        : true;
      return matchTab && matchArea && matchSearch;
    });
  }, [activeTab, selectedArea, searchQuery]);

  const selectedLocker = useMemo(() => 
    MOCK_LOCKERS.find(l => l.id === selectedLockerId), 
    [selectedLockerId]
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

  // Handler Actions
  const handleLockerClick = (id: string) => {
    setSelectedLockerId(id);
  };

  const getStatusColor = (status: LockerStatus) => {
    switch (status) {
      case "in_use": return "bg-bg-soft-mint border-secondary-mint text-secondary-mint";
      case "expiring": return "bg-bg-soft-peach border-warning text-warning";
      case "expired": return "bg-[#FFEEEE] border-error text-error";
      case "unavailable": return "bg-input-bg-light border-border-light text-text-grey-blue opacity-60";
      default: return "bg-white border-border-light text-text-dark-grey";
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-border-light bg-white p-md rounded-t-card-normal" >
          <TabNav 
            className="border-none" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
          <div className="flex items-center gap-sm" >
            <div className="flex items-center bg-input-bg-light rounded-button p-[4px]" >
              <button
                className={cn(
                  "p-xs rounded-button transition-all",
                  viewMode === "grid" ? "bg-white shadow-sm text-primary-coral" : "text-text-grey-blue"
                )} onClick={() => setViewMode("grid")}>
                <LayoutGrid size={20}/>
              </button>
              <button
                className={cn(
                  "p-xs rounded-button transition-all",
                  viewMode === "list" ? "bg-white shadow-sm text-primary-coral" : "text-text-grey-blue"
                )} onClick={() => setViewMode("list")}>
                <List size={20}/>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white px-md pb-md" >
          <SearchFilter searchPlaceholder="락커 번호 또는 회원명 검색" searchValue={searchQuery} onSearchChange={setSearchQuery} filters={filterOptions} onFilterChange={(key, val) => key === "area" && setSelectedArea(val)} onReset={() => {
              setSearchQuery("");
              setSelectedArea("");
            }}/>
        </div>

        {/* Grid / List Content */}
        <div className="flex gap-lg items-start" >
          <div className="flex-1 bg-white p-lg rounded-card-normal shadow-card-soft min-h-[600px]" >
            {viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-md" >
                {filteredLockers.map((locker) => (
                  <div
                    className={cn(
                      "group relative flex flex-col items-center justify-center aspect-square rounded-card-normal border-[2px] transition-all cursor-pointer hover:scale-[1.05] active:scale-[0.98]",
                      getStatusColor(locker.status),
                      selectedLockerId === locker.id ? "ring-2 ring-primary-coral ring-offset-2" : ""
                    )} key={locker.id} onClick={() => handleLockerClick(locker.id)}>
                    <span className="text-Heading 2 font-bold mb-xs" >{locker.number}</span>
                    {locker.status !== "available" && locker.status !== "unavailable" ? (
                      <div className="flex flex-col items-center" >
                        <span className="text-Label truncate max-w-[80px]" >{locker.memberName}</span>
                        {locker.expiryDate && (
                          <span className="text-[10px] opacity-70 mt-[2px]" >{locker.expiryDate.split("-").slice(1).join("/")}</span>
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
                ))}
                
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
                  { key: "expiryDate", header: "만료일", width: 150, render: (val) => val || "-" },
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
                ]} data={filteredLockers} selectable="true"/>
            )}
          </div>

          {/* Right Detail Panel */}
          {selectedLocker && (
            <div className="w-[360px] flex-shrink-0 bg-white rounded-card-normal shadow-card-soft border border-border-light overflow-hidden sticky top-lg animate-in slide-in-from-right-4 duration-300" >
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
                        className="text-Body 1 font-bold text-text-dark-grey hover:text-primary-coral transition-colors flex items-center gap-xs" onClick={() => moveToPage(985, { memberId: selectedLocker.memberId })}>
                        {selectedLocker.memberName}
                        <ChevronRight size={14}/>
                      </button>
                    </div>
                    <div className="flex items-center justify-between" >
                      <span className="text-Body 2 text-text-grey-blue" >이용 기간</span>
                      <div className="text-right" >
                        <p className="text-Body 2 font-medium" >2026-02-01 ~</p>
                        <p className="text-Body 2 font-bold text-primary-coral" >{selectedLocker.expiryDate}</p>
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
                    <button className="bg-secondary-mint text-white px-lg py-sm rounded-button text-Label font-bold hover:opacity-90" >
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

      {/* Dialogs */}
      <ConfirmDialog open={isReturnDialogOpen} title="락커 반납 처리" description={`${selectedLocker?.number}번 락커를 반납 처리하시겠습니까? 반납 시 해당 회원의 배정 정보가 초기화됩니다.`} confirmLabel="반납 처리" onConfirm={() => {
          setIsReturnDialogOpen(false);
          alert("반납 처리되었습니다.");
        }} onCancel={() => setIsReturnDialogOpen(false)}/>

      <ConfirmDialog open={isUnavailableDialogOpen} title="사용 불가 설정" description="해당 락커를 '사용 불가' 상태로 전환하시겠습니까? 시설 보수나 기타 사유로 인해 회원 배정이 차단됩니다." variant="danger" confirmLabel="설정하기" onConfirm={() => {
          setIsUnavailableDialogOpen(false);
          alert("사용 불가로 설정되었습니다.");
        }} onCancel={() => setIsUnavailableDialogOpen(false)}/>
    </AppLayout>
  );
}
