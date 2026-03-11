import React, { useState, useMemo } from "react";
import {
  Plus,
  RefreshCcw,
  Download,
  Search,
  Lock,
  User,
  Clock,
  XCircle,
  History,
  UserPlus,
  Trash2,
  CheckSquare,
  ChevronRight,
  ArrowRightLeft,
  MoreVertical,
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
 * SCR-050: 락커 관리
 * UI-053 구역 탭 (A/B/C), UI-054 4x8 락커 그리드, UI-055 범례, UI-056 락커 상세 모달
 */

type LockerStatus = "available" | "in_use" | "expiring" | "broken";

interface LockerData {
  id: string;
  number: number;
  zone: "A" | "B" | "C";
  status: LockerStatus;
  memberName?: string;
  memberId?: string;
  assignedDate?: string;
  expiryDate?: string;
  history?: { date: string; action: string; member: string }[];
}

// --- 구역별 4x8 = 32개 락커 Mock 데이터 ---
const buildZoneLockers = (zone: "A" | "B" | "C", offset: number): LockerData[] =>
  Array.from({ length: 32 }, (_, i) => {
    const num = offset + i + 1;
    const statuses: LockerStatus[] = ["available", "in_use", "expiring", "broken"];
    const status = statuses[i % 4];
    const memberNames = ["김철수", "이영희", "박지민", "최강호", "한소희", "정민준", "유지훈", "김나연"];
    const isOccupied = status === "in_use" || status === "expiring";
    return {
      id: `${zone}-${num}`,
      number: num,
      zone,
      status,
      memberName:    isOccupied ? memberNames[i % memberNames.length] : undefined,
      memberId:      isOccupied ? `m${(i % 8) + 1}` : undefined,
      assignedDate:  isOccupied ? "2026-02-01" : undefined,
      expiryDate:    status === "expiring" ? "2026-03-13" : isOccupied ? "2026-06-30" : undefined,
      history: isOccupied ? [
        { date: "2026-02-01", action: "배정", member: memberNames[i % memberNames.length] },
        { date: "2025-11-15", action: "반납", member: "이전회원" },
      ] : [],
    };
  });

const MOCK_LOCKERS: LockerData[] = [
  ...buildZoneLockers("A", 0),
  ...buildZoneLockers("B", 32),
  ...buildZoneLockers("C", 64),
];

const MOCK_MEMBERS = [
  { id: "m1", name: "김철수",  contact: "010-1111-2222" },
  { id: "m2", name: "이영희",  contact: "010-2222-3333" },
  { id: "m3", name: "박지성",  contact: "010-3333-4444" },
  { id: "m4", name: "최유나",  contact: "010-4444-5555" },
  { id: "m5", name: "정재욱",  contact: "010-5555-6666" },
  { id: "m6", name: "강수진",  contact: "010-6666-7777" },
  { id: "m7", name: "윤태호",  contact: "010-7777-8888" },
  { id: "m8", name: "임소연",  contact: "010-8888-9999" },
];

// --- D-Day 계산 ---
function getDDay(expiryDate?: string): number | null {
  if (!expiryDate) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDDayLabel(expiryDate?: string): string | null {
  const d = getDDay(expiryDate);
  if (d === null) return null;
  if (d < 0) return `D+${Math.abs(d)}`;
  if (d === 0) return "D-0";
  return `D-${d}`;
}

// --- 상태별 스타일 (시맨틱 토큰) ---
const STATUS_STYLES: Record<LockerStatus, { cell: string; badge: "success" | "warning" | "error" | "default" }> = {
  available: { cell: "bg-surface-tertiary border-line text-content-secondary",          badge: "default" },
  in_use:    { cell: "bg-state-info/10 border-state-info text-state-info",              badge: "success" },
  expiring:  { cell: "bg-amber-50 border-amber-400 text-amber-700",                     badge: "warning" },
  broken:    { cell: "bg-state-error/5 border-state-error text-state-error",            badge: "error"   },
};

const STATUS_LABELS: Record<LockerStatus, string> = {
  available: "빈 락커",
  in_use:    "사용중",
  expiring:  "만료임박",
  broken:    "고장",
};

// --- UI-056 락커 상세 모달 ---
const LockerDetailModal = ({
  locker,
  onClose,
  onRelease,
}: {
  locker: LockerData;
  onClose: () => void;
  onRelease: (id: string) => void;
}) => {
  const dday = getDDay(locker.expiryDate);
  const ddayLabel = getDDayLabel(locker.expiryDate);
  const isOccupied = locker.status === "in_use" || locker.status === "expiring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[480px] shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="px-xl py-lg border-b border-line flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-[16px]">
              {locker.number}
            </div>
            <div>
              <p className="text-[11px] text-content-secondary">{locker.zone}구역</p>
              <StatusBadge
                variant={STATUS_STYLES[locker.status].badge}
                label={STATUS_LABELS[locker.status]}
                dot
              />
            </div>
          </div>
          <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={onClose}>
            <XCircle className="text-content-secondary" size={20} />
          </button>
        </div>

        <div className="p-xl space-y-lg">
          {isOccupied ? (
            <>
              {/* 배정 회원명 */}
              <div className="space-y-md">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-content-secondary">배정 회원</span>
                  <button
                    className="text-[13px] font-bold text-primary hover:underline flex items-center gap-xs"
                    onClick={() => moveToPage(985)}
                  >
                    {locker.memberName}
                    <ChevronRight size={13} />
                  </button>
                </div>
                {/* 배정일 */}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-content-secondary">배정일</span>
                  <span className="text-[13px] font-medium text-content">{locker.assignedDate}</span>
                </div>
                {/* 만료일 */}
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-content-secondary">만료일</span>
                  <div className="text-right">
                    <span className={cn(
                      "text-[13px] font-bold",
                      dday !== null && dday <= 0 ? "text-state-error" :
                      dday !== null && dday <= 7 ? "text-amber-600" : "text-content"
                    )}>
                      {locker.expiryDate}
                    </span>
                    {ddayLabel && (
                      <span className={cn(
                        "ml-sm text-[11px] font-semibold px-xs py-[1px] rounded",
                        dday !== null && dday <= 0 ? "bg-state-error/10 text-state-error" :
                        dday !== null && dday <= 7 ? "bg-amber-50 text-amber-600" :
                        "bg-surface-tertiary text-content-secondary"
                      )}>
                        {ddayLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 이력 */}
              {locker.history && locker.history.length > 0 && (
                <div>
                  <p className="text-[12px] font-semibold text-content-secondary mb-sm">이용 이력</p>
                  <div className="border border-line rounded-lg overflow-hidden">
                    {locker.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between px-md py-sm border-b border-line last:border-b-0 bg-surface hover:bg-surface-secondary/30 transition-colors">
                        <span className="text-[12px] text-content">{h.date}</span>
                        <StatusBadge variant={h.action === "배정" ? "success" : "default"} label={h.action} />
                        <span className="text-[12px] text-content-secondary">{h.member}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="w-full py-sm rounded-lg border border-state-error/20 text-state-error text-[13px] font-semibold hover:bg-state-error/5 transition-all"
                onClick={() => { onRelease(locker.id); onClose(); }}
              >
                배정 해제
              </button>
            </>
          ) : (
            <div className="py-xl flex flex-col items-center justify-center">
              <UserPlus className="text-content-tertiary mb-sm" size={32} />
              <p className="text-[13px] text-content-secondary mb-md">현재 배정된 회원이 없습니다.</p>
              <button
                className="px-lg py-sm bg-primary text-white rounded-lg text-[13px] font-bold hover:opacity-90 transition-all"
                onClick={onClose}
              >
                회원 배정하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Locker() {
  const [lockers, setLockers] = useState<LockerData[]>(MOCK_LOCKERS);
  const [activeZone, setActiveZone] = useState<"A" | "B" | "C">("A");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  const zoneTabs = [
    { key: "A", label: "A구역" },
    { key: "B", label: "B구역" },
    { key: "C", label: "C구역" },
  ];

  const stats = useMemo(() => {
    const total    = lockers.length;
    const inUse    = lockers.filter(l => l.status === "in_use").length;
    const expiring = lockers.filter(l => l.status === "expiring").length;
    const broken   = lockers.filter(l => l.status === "broken").length;
    return { total, inUse, expiring, broken };
  }, [lockers]);

  const zoneLockers = useMemo(() =>
    lockers.filter(l => l.zone === activeZone),
    [lockers, activeZone]
  );

  const filteredLockers = useMemo(() => {
    if (!searchQuery) return zoneLockers;
    return zoneLockers.filter(l =>
      String(l.number).includes(searchQuery) ||
      (l.memberName && l.memberName.includes(searchQuery))
    );
  }, [zoneLockers, searchQuery]);

  const expiredLockers = useMemo(() =>
    filteredLockers.filter(l => l.status === "expiring"),
    [filteredLockers]
  );

  const selectedLocker = useMemo(() =>
    lockers.find(l => l.id === selectedLockerId),
    [lockers, selectedLockerId]
  );

  const handleLockerClick = (locker: LockerData) => {
    if (bulkMode) {
      if (locker.status !== "expiring") return;
      setSelectedBulkIds(prev => {
        const next = new Set(prev);
        next.has(locker.id) ? next.delete(locker.id) : next.add(locker.id);
        return next;
      });
      return;
    }
    setSelectedLockerId(locker.id);
  };

  const handleRelease = (id: string) => {
    setLockers(prev => prev.map(l =>
      l.id === id
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, assignedDate: undefined, expiryDate: undefined }
        : l
    ));
  };

  const handleBulkRelease = () => {
    setLockers(prev => prev.map(l =>
      selectedBulkIds.has(l.id)
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, assignedDate: undefined, expiryDate: undefined }
        : l
    ));
    setSelectedBulkIds(new Set());
    setBulkMode(false);
    setIsBulkDialogOpen(false);
  };

  // 리스트 뷰용 컬럼
  const tableColumns = [
    { key: "number",     header: "번호",    width: 70,  align: "center" as const },
    { key: "zone",       header: "구역",    width: 80,  render: (val: string) => `${val}구역` },
    {
      key: "status",
      header: "상태", width: 110,
      render: (val: LockerStatus) => (
        <StatusBadge variant={STATUS_STYLES[val].badge} label={STATUS_LABELS[val]} dot />
      )
    },
    { key: "memberName", header: "이용자",  width: 120, render: (val?: string) => val || "-" },
    {
      key: "expiryDate",
      header: "만료일", width: 160,
      render: (val?: string) => {
        if (!val) return "-";
        const dday = getDDay(val);
        return (
          <span className={cn(
            dday !== null && dday <= 0 ? "text-state-error font-bold" :
            dday !== null && dday <= 7 ? "text-amber-600 font-semibold" : ""
          )}>
            {val}
            {dday !== null && <span className="text-[11px] ml-xs">({getDDayLabel(val)})</span>}
          </span>
        );
      }
    },
    {
      key: "actions",
      header: "관리",
      width: 70,
      align: "center" as const,
      render: (_: any, row: LockerData) => (
        <button
          className="p-xs hover:bg-surface-secondary rounded-full transition-colors"
          onClick={e => { e.stopPropagation(); handleLockerClick(row); }}
        >
          <MoreVertical size={15} />
        </button>
      )
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="락커 관리"
        description="센터 내 모든 락커의 배정 현황 및 상태를 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button className="flex items-center gap-xs rounded-lg border border-line bg-surface px-md py-sm text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold">
              <RefreshCcw size={15} /> 새로고침
            </button>
            <button className="flex items-center gap-xs rounded-lg border border-line bg-surface px-md py-sm text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold">
              <Download size={15} /> 엑셀 다운로드
            </button>
            <button className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-white shadow-sm hover:opacity-90 transition-opacity text-[13px] font-bold">
              <Plus size={16} /> 락커 추가
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg mb-xl">
        <StatCard label="전체 락커 수"  value={stats.total}    icon={<Lock />} />
        <StatCard label="사용중"        value={stats.inUse}    icon={<User />}    variant="mint" />
        <StatCard label="만료임박"      value={stats.expiring} icon={<Clock />}   variant="peach" description="7일 이내 만료" />
        <StatCard label="고장"          value={stats.broken}   icon={<XCircle />} />
      </div>

      {/* 구역 탭 — UI-053 */}
      <div className="bg-surface rounded-xl border border-line shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-lg pt-sm border-b border-line">
          <TabNav
            tabs={zoneTabs}
            activeTab={activeZone}
            onTabChange={k => { setActiveZone(k as "A" | "B" | "C"); setBulkMode(false); setSelectedBulkIds(new Set()); }}
          />
          <div className="flex items-center gap-sm pb-sm">
            {expiredLockers.length > 0 && (
              bulkMode ? (
                <div className="flex items-center gap-xs">
                  <span className="text-[12px] text-content-secondary">{selectedBulkIds.size}개 선택</span>
                  <button
                    className="flex items-center gap-xs rounded-lg bg-state-error/10 border border-state-error/20 px-md py-xs text-state-error text-[12px] font-semibold hover:bg-state-error hover:text-white transition-all disabled:opacity-40"
                    disabled={selectedBulkIds.size === 0}
                    onClick={() => setIsBulkDialogOpen(true)}
                  >
                    <Trash2 size={13} /> 일괄 해제
                  </button>
                  <button
                    className="flex items-center gap-xs rounded-lg bg-surface-secondary border border-line px-md py-xs text-content-secondary text-[12px] font-semibold hover:bg-surface-tertiary transition-colors"
                    onClick={() => { setBulkMode(false); setSelectedBulkIds(new Set()); }}
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  className="flex items-center gap-xs rounded-lg bg-amber-50 border border-amber-200 px-md py-xs text-amber-700 text-[12px] font-semibold hover:bg-amber-100 transition-colors"
                  onClick={() => setBulkMode(true)}
                >
                  <CheckSquare size={13} /> 만료임박 일괄 해제
                </button>
              )
            )}
          </div>
        </div>

        {bulkMode && (
          <div className="bg-amber-50 border-b border-amber-200 px-lg py-sm flex items-center gap-sm">
            <CheckSquare size={15} className="text-amber-600 flex-shrink-0" />
            <span className="text-[12px] text-amber-700 font-medium">만료임박 락커를 클릭하여 선택하세요. 선택 후 일괄 해제 버튼을 누르면 배정 정보가 초기화됩니다.</span>
          </div>
        )}

        <div className="p-lg space-y-lg">
          {/* 검색 */}
          <div className="relative max-w-sm">
            <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
            <input
              className="w-full h-9 pl-[36px] pr-md rounded-lg bg-surface-secondary border border-line text-[13px] focus:border-primary outline-none transition-all"
              placeholder="락커 번호 또는 회원명 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* UI-054 락커 그리드 (4x8 = 32개) */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-md">
            {filteredLockers.map(locker => {
              const styles = STATUS_STYLES[locker.status];
              const dday = getDDay(locker.expiryDate);
              const isSelected = selectedBulkIds.has(locker.id);
              const isBroken = locker.status === "broken";

              return (
                <div
                  key={locker.id}
                  className={cn(
                    "relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.05] active:scale-[0.97] select-none",
                    styles.cell,
                    selectedLockerId === locker.id && !bulkMode ? "ring-2 ring-primary ring-offset-2" : "",
                    isSelected ? "ring-2 ring-state-error ring-offset-2 scale-[1.02]" : "",
                    bulkMode && locker.status !== "expiring" ? "opacity-40 cursor-not-allowed hover:scale-100" : "",
                    isBroken ? "opacity-70" : ""
                  )}
                  onClick={() => handleLockerClick(locker)}
                >
                  {/* 고장: 사선 표시 */}
                  {isBroken && (
                    <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                      <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-0 left-0 w-[141%] h-[1px] bg-state-error/40 origin-top-left rotate-45 translate-y-[45px]" />
                      </div>
                    </div>
                  )}

                  {/* 일괄 선택 체크 */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-state-error rounded-full flex items-center justify-center">
                      <CheckSquare size={9} className="text-white" />
                    </div>
                  )}

                  <span className="text-[13px] font-bold mb-[2px]">{locker.number}</span>
                  {locker.memberName ? (
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-medium truncate max-w-[60px]">{locker.memberName}</span>
                      {locker.expiryDate && (
                        <span className={cn(
                          "text-[8px] mt-[1px] font-semibold",
                          dday !== null && dday <= 0 ? "text-state-error" :
                          dday !== null && dday <= 7 ? "text-amber-600" : "opacity-60"
                        )}>
                          {getDDayLabel(locker.expiryDate)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] opacity-60">{STATUS_LABELS[locker.status]}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* UI-055 범례 */}
          <div className="pt-md border-t border-line">
            <div className="flex items-center gap-lg flex-wrap">
              <span className="text-[12px] font-semibold text-content-secondary">상태 범례</span>
              <div className="flex items-center gap-xs">
                <div className="w-4 h-4 rounded border-2 bg-state-info/10 border-state-info" />
                <span className="text-[12px] text-content-secondary">사용중</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-4 h-4 rounded border-2 bg-surface-tertiary border-line" />
                <span className="text-[12px] text-content-secondary">빈 락커</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-4 h-4 rounded border-2 bg-amber-50 border-amber-400" />
                <span className="text-[12px] text-content-secondary">만료임박</span>
              </div>
              <div className="flex items-center gap-xs">
                <div className="w-4 h-4 rounded border-2 bg-state-error/5 border-state-error" />
                <span className="text-[12px] text-content-secondary">고장</span>
              </div>
            </div>
          </div>

          {filteredLockers.length === 0 && (
            <div className="py-xxl flex flex-col items-center justify-center text-content-secondary">
              <Search className="mb-md opacity-20" size={40} />
              <p className="text-[13px]">검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* UI-056 락커 상세 모달 */}
      {selectedLockerId && selectedLocker && !bulkMode && (
        <LockerDetailModal
          locker={selectedLocker}
          onClose={() => setSelectedLockerId(null)}
          onRelease={handleRelease}
        />
      )}

      {/* 일괄 해제 확인 */}
      <ConfirmDialog
        open={isBulkDialogOpen}
        title="만료임박 락커 일괄 해제"
        description={`선택한 ${selectedBulkIds.size}개의 락커를 일괄 해제하시겠습니까?\n해제 시 배정된 회원 정보가 모두 초기화됩니다.`}
        variant="danger"
        confirmLabel={`${selectedBulkIds.size}개 일괄 해제`}
        onConfirm={handleBulkRelease}
        onCancel={() => setIsBulkDialogOpen(false)}
      />
    </AppLayout>
  );
}
