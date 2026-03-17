import React, { useState, useMemo, useEffect } from "react";
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
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import { SearchFilter } from "@/components/SearchFilter";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";

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
  password?: string;
  memo?: string;
  history?: { date: string; action: string; member: string }[];
}

interface MemberOption {
  id: string;
  name: string;
  contact: string;
}

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
  isOpen,
  locker,
  onClose,
  onRelease,
}: {
  isOpen: boolean;
  locker: LockerData | null;
  onClose: () => void;
  onRelease: (id: string) => void;
}) => {
  if (!locker) return null;
  const dday = getDDay(locker.expiryDate);
  const ddayLabel = getDDayLabel(locker.expiryDate);
  const isOccupied = locker.status === "in_use" || locker.status === "expiring";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-lg">
        {/* 락커 번호 + 상태 헤더 */}
        <div className="flex items-center gap-sm pb-lg border-b border-line -mt-xs">
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
        {isOccupied ? (
          <>
            {/* 배정 회원명 */}
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-content-secondary">배정 회원</span>
                <button
                  className="text-[13px] font-bold text-primary hover:underline flex items-center gap-xs"
                  onClick={() => locker.memberId && moveToPage(985, { id: locker.memberId })}
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
    </Modal>
  );
};

// 락커 액션 타입
type LockerAction = "history" | "move" | "reclaim" | "broken" | "assign";

export default function Locker() {
  const [lockers, setLockers] = useState<LockerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeZone, setActiveZone] = useState<"A" | "B" | "C">("A");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

  // 액션 모달 상태
  const [actionModal, setActionModal] = useState<{ action: LockerAction; locker: LockerData } | null>(null);
  // 이동 모달: 대상 번호 입력
  const [moveTargetNumber, setMoveTargetNumber] = useState("");
  // 비밀번호/메모 편집 상태 (상세 모달)
  const [editPassword, setEditPassword] = useState("");
  const [editMemo, setEditMemo] = useState("");
  // 일괄 배정 모달
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignMemberName, setBulkAssignMemberName] = useState("");
  const [bulkAssignExpiryDate, setBulkAssignExpiryDate] = useState("");
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberForAssign, setSelectedMemberForAssign] = useState<MemberOption | null>(null);

  const branchId = Number(localStorage.getItem("branchId") ?? 1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 락커 데이터 (lockers 테이블)
        const { data: lockerData } = await supabase
          .from("lockers")
          .select("id, number, status, memberId, memberName, assignedAt, expiresAt, branchId, zone, password, memo")
          .eq("branchId", branchId);

        if (lockerData) {
          const mapped: LockerData[] = lockerData.map((l: any) => ({
            id: String(l.id),
            number: l.number ?? 0,
            zone: (l.zone as "A" | "B" | "C") ?? "A",
            status: (l.status as LockerStatus) ?? "available",
            memberName: l.memberName ?? undefined,
            memberId: l.memberId ? String(l.memberId) : undefined,
            assignedDate: l.assignedAt ? String(l.assignedAt).split("T")[0] : undefined,
            expiryDate: l.expiresAt ? String(l.expiresAt).split("T")[0] : undefined,
            password: l.password ?? undefined,
            memo: l.memo ?? undefined,
            history: [],
          }));
          setLockers(mapped);
        }
        // 회원 목록 (일괄 배정용)
        const { data: memberData } = await supabase
          .from("members")
          .select("id, name, phone")
          .eq("branchId", branchId)
          .eq("status", "ACTIVE");
        if (memberData) {
          setMemberOptions(memberData.map((m: any) => ({ id: String(m.id), name: m.name ?? "", contact: m.phone ?? "" })));
        }
      } catch (err) {
        console.error("Locker 데이터 로드 실패:", err);
        toast.error("락커 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  /** 액션 버튼 클릭 — 모달 열기 */
  const openAction = (action: LockerAction, locker: LockerData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === "history" || action === "move" || action === "reclaim" || action === "broken" || action === "assign") {
      if (action === "move") setMoveTargetNumber("");
      if (action === "assign") {
        setMemberSearch("");
        setSelectedMemberForAssign(null);
        setBulkAssignExpiryDate("");
      }
      setActionModal({ action, locker });
    }
  };

  /** 이동: 락커 번호 변경 */
  const handleMove = async () => {
    if (!actionModal) return;
    const targetNum = Number(moveTargetNumber);
    if (!targetNum) { toast.error("이동할 락커 번호를 입력해주세요."); return; }
    const { error } = await supabase
      .from("lockers")
      .update({ number: targetNum })
      .eq("id", actionModal.locker.id);
    if (error) { toast.error("락커 이동에 실패했습니다."); return; }
    setLockers(prev => prev.map(l => l.id === actionModal.locker.id ? { ...l, number: targetNum } : l));
    toast.success(`락커가 ${targetNum}번으로 이동되었습니다.`);
    setActionModal(null);
  };

  /** 회수: 락커 비우기 (memberId null) */
  const handleReclaim = async () => {
    if (!actionModal) return;
    const { error } = await supabase
      .from("lockers")
      .update({ status: "available", memberId: null, memberName: null, assignedAt: null, expiresAt: null })
      .eq("id", actionModal.locker.id);
    if (error) { toast.error("락커 회수에 실패했습니다."); return; }
    setLockers(prev => prev.map(l =>
      l.id === actionModal.locker.id
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, assignedDate: undefined, expiryDate: undefined }
        : l
    ));
    toast.success("락커가 회수되었습니다.");
    setActionModal(null);
  };

  /** 고장: isBroken 토글 (status "broken" 전환) */
  const handleToggleBroken = async () => {
    if (!actionModal) return;
    const newStatus: LockerStatus = actionModal.locker.status === "broken" ? "available" : "broken";
    const { error } = await supabase
      .from("lockers")
      .update({ status: newStatus })
      .eq("id", actionModal.locker.id);
    if (error) { toast.error("고장 상태 변경에 실패했습니다."); return; }
    setLockers(prev => prev.map(l =>
      l.id === actionModal.locker.id ? { ...l, status: newStatus } : l
    ));
    toast.success(newStatus === "broken" ? "고장 처리되었습니다." : "고장 해제되었습니다.");
    setActionModal(null);
  };

  /** 비밀번호/메모 저장 */
  const handleSavePasswordMemo = async (lockerId: string, password: string, memo: string) => {
    const { error } = await supabase
      .from("lockers")
      .update({ password, memo })
      .eq("id", lockerId);
    if (error) { toast.error("저장에 실패했습니다."); return; }
    setLockers(prev => prev.map(l => l.id === lockerId ? { ...l, password, memo } : l));
    toast.success("비밀번호/메모가 저장되었습니다.");
  };

  /** 개별 배정: 선택 회원 + 만료일로 락커 배정 */
  const handleAssign = async () => {
    if (!actionModal || !selectedMemberForAssign) { toast.error("배정할 회원을 선택해주세요."); return; }
    const { error } = await supabase
      .from("lockers")
      .update({
        status: "in_use",
        memberId: selectedMemberForAssign.id,
        memberName: selectedMemberForAssign.name,
        assignedAt: new Date().toISOString(),
        expiresAt: bulkAssignExpiryDate ? `${bulkAssignExpiryDate}T23:59:59` : null,
      })
      .eq("id", actionModal.locker.id);
    if (error) { toast.error("락커 배정에 실패했습니다."); return; }
    setLockers(prev => prev.map(l =>
      l.id === actionModal.locker.id
        ? { ...l, status: "in_use", memberName: selectedMemberForAssign.name, memberId: selectedMemberForAssign.id, assignedDate: new Date().toISOString().slice(0, 10), expiryDate: bulkAssignExpiryDate || undefined }
        : l
    ));
    toast.success(`${actionModal.locker.number}번 락커가 ${selectedMemberForAssign.name}님께 배정되었습니다.`);
    setActionModal(null);
  };

  /** 일괄 배정: 미배정 락커 선택 후 회원 배정 */
  const handleBulkAssign = async () => {
    if (!selectedMemberForAssign) { toast.error("배정할 회원을 선택해주세요."); return; }
    if (selectedBulkIds.size === 0) { toast.error("배정할 락커를 선택해주세요."); return; }
    const ids = Array.from(selectedBulkIds);
    const { error } = await supabase
      .from("lockers")
      .update({
        status: "in_use",
        memberId: selectedMemberForAssign.id,
        memberName: selectedMemberForAssign.name,
        assignedAt: new Date().toISOString(),
        expiresAt: bulkAssignExpiryDate ? `${bulkAssignExpiryDate}T23:59:59` : null,
      })
      .in("id", ids);
    if (error) { toast.error("일괄 배정에 실패했습니다."); return; }
    setLockers(prev => prev.map(l =>
      selectedBulkIds.has(l.id)
        ? { ...l, status: "in_use", memberName: selectedMemberForAssign.name, memberId: selectedMemberForAssign.id, assignedDate: new Date().toISOString().slice(0, 10), expiryDate: bulkAssignExpiryDate || undefined }
        : l
    ));
    toast.success(`${ids.length}개 락커가 ${selectedMemberForAssign.name}님께 배정되었습니다.`);
    setSelectedBulkIds(new Set());
    setBulkMode(false);
    setBulkAssignOpen(false);
    setSelectedMemberForAssign(null);
    setBulkAssignExpiryDate("");
  };

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
      // 일괄 배정 모드: available 락커만 선택
      if (bulkAssignOpen) {
        if (locker.status !== "available") return;
      } else {
        // 일괄 해제 모드: expiring 락커만 선택
        if (locker.status !== "expiring") return;
      }
      setSelectedBulkIds(prev => {
        const next = new Set(prev);
        next.has(locker.id) ? next.delete(locker.id) : next.add(locker.id);
        return next;
      });
      return;
    }
    setSelectedLockerId(locker.id);
  };

  const handleRelease = async (id: string) => {
    const { error } = await supabase
      .from("lockers")
      .update({ status: "available", memberId: null, memberName: null, assignedAt: null, expiresAt: null })
      .eq("id", id);

    if (error) {
      toast.error("락커 해제에 실패했습니다.");
      return;
    }

    setLockers(prev => prev.map(l =>
      l.id === id
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, assignedDate: undefined, expiryDate: undefined }
        : l
    ));
    toast.success("락커 배정이 해제되었습니다.");
  };

  const handleBulkRelease = async () => {
    const ids = Array.from(selectedBulkIds);
    const { error } = await supabase
      .from("lockers")
      .update({ status: "available", memberId: null, memberName: null, assignedAt: null, expiresAt: null })
      .in("id", ids);

    if (error) {
      toast.error("일괄 해제에 실패했습니다.");
      setIsBulkDialogOpen(false);
      return;
    }

    setLockers(prev => prev.map(l =>
      selectedBulkIds.has(l.id)
        ? { ...l, status: "available", memberName: undefined, memberId: undefined, assignedDate: undefined, expiryDate: undefined }
        : l
    ));
    toast.success(`${ids.length}개 락커가 일괄 해제되었습니다.`);
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
            <button
              className="flex items-center gap-xs rounded-lg border border-line bg-surface px-md py-sm text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold"
              onClick={() => {
                setLoading(true);
                supabase
                  .from("lockers")
                  .select("id, number, status, memberId, memberName, assignedAt, expiresAt, branchId, zone")
                  .eq("branchId", branchId)
                  .then(({ data }) => {
                    if (data) {
                      setLockers(data.map((l: any) => ({
                        id: String(l.id),
                        number: l.number ?? 0,
                        zone: (l.zone as "A" | "B" | "C") ?? "A",
                        status: (l.status as LockerStatus) ?? "available",
                        memberName: l.memberName ?? undefined,
                        memberId: l.memberId ? String(l.memberId) : undefined,
                        assignedDate: l.assignedAt ? String(l.assignedAt).split("T")[0] : undefined,
                        expiryDate: l.expiresAt ? String(l.expiresAt).split("T")[0] : undefined,
                        history: [],
                      })));
                    }
                    setLoading(false);
                  });
              }}
            >
              <RefreshCcw size={15} /> 새로고침
            </button>
            <button
              className="flex items-center gap-xs rounded-lg border border-line bg-surface px-md py-sm text-content-secondary hover:text-primary transition-colors text-[13px] font-semibold"
              onClick={() => {
                const exportColumns = [
                  { key: 'number', header: '번호' },
                  { key: 'zone', header: '구역' },
                  { key: 'status', header: '상태' },
                  { key: 'memberName', header: '이용자' },
                  { key: 'assignedAt', header: '배정일' },
                  { key: 'expiresAt', header: '만료일' },
                ];
                exportToExcel(filteredLockers as unknown as Record<string, unknown>[], exportColumns, { filename: '락커목록' });
                toast.success(`${filteredLockers.length}건 엑셀 다운로드 완료`);
              }}
            >
              <Download size={15} /> 엑셀 다운로드
            </button>
            <button
              className="flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/5 px-md py-sm text-primary text-[13px] font-semibold hover:bg-primary/10 transition-colors"
              onClick={() => {
                setBulkMode(true);
                setBulkAssignOpen(true);
                setSelectedBulkIds(new Set());
                setMemberSearch("");
                setSelectedMemberForAssign(null);
                setBulkAssignExpiryDate("");
              }}
            >
              <UserPlus size={15} /> 일괄 배정
            </button>
            <button
              className="flex items-center gap-xs rounded-lg bg-primary px-md py-sm text-white shadow-sm hover:opacity-90 transition-opacity text-[13px] font-bold"
              onClick={() => toast.info("락커 추가 기능은 준비 중입니다.")}
            >
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

      {loading && (
        <div className="flex items-center justify-center py-xl text-[13px] text-content-secondary">
          데이터를 불러오는 중...
        </div>
      )}

      {!loading && (
        /* 구역 탭 — UI-053 */
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
            <div className={cn(
              "border-b px-lg py-sm flex items-center gap-sm",
              bulkAssignOpen ? "bg-primary/5 border-primary/20" : "bg-amber-50 border-amber-200"
            )}>
              <CheckSquare size={15} className={bulkAssignOpen ? "text-primary flex-shrink-0" : "text-amber-600 flex-shrink-0"} />
              <span className={cn("text-[12px] font-medium", bulkAssignOpen ? "text-primary" : "text-amber-700")}>
                {bulkAssignOpen
                  ? `빈 락커를 클릭하여 선택하세요. 선택 후 오른쪽 패널에서 회원을 배정합니다. (${selectedBulkIds.size}개 선택됨)`
                  : "만료임박 락커를 클릭하여 선택하세요. 선택 후 일괄 해제 버튼을 누르면 배정 정보가 초기화됩니다."
                }
              </span>
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
                      "relative group rounded-xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97] select-none",
                      "aspect-square",
                      styles.cell,
                      selectedLockerId === locker.id && !bulkMode ? "ring-2 ring-primary ring-offset-2" : "",
                      isSelected ? "ring-2 ring-state-error ring-offset-2 scale-[1.02]" : "",
                      bulkMode && locker.status !== "available" ? "opacity-40 cursor-not-allowed hover:scale-100" : "",
                      isBroken ? "opacity-70" : ""
                    )}
                    role="button"
                    tabIndex={bulkMode && locker.status !== "available" ? -1 : 0}
                    aria-label={`${locker.zone}구역 ${locker.number}번 락커 ${STATUS_LABELS[locker.status]}${locker.memberName ? ` - ${locker.memberName}` : ""}`}
                    aria-pressed={selectedBulkIds.has(locker.id) || selectedLockerId === locker.id}
                    onClick={() => handleLockerClick(locker)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleLockerClick(locker); } }}
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
                        <span className="text-[11px] font-medium truncate max-w-[60px]">{locker.memberName}</span>
                        {locker.expiryDate && (
                          <span className={cn(
                            "text-[10px] mt-[1px] font-semibold",
                            dday !== null && dday <= 0 ? "text-state-error" :
                            dday !== null && dday <= 7 ? "text-amber-600" : "opacity-60"
                          )}>
                            {getDDayLabel(locker.expiryDate)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] opacity-60">{STATUS_LABELS[locker.status]}</span>
                    )}

                    {/* 호버 시 액션 버튼 오버레이 */}
                    {!bulkMode && (
                      <div className="absolute inset-0 rounded-xl bg-content/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-[3px] p-[4px]">
                        <button
                          className="w-full text-white text-[10px] font-semibold bg-white/20 hover:bg-white/30 rounded-md py-[2px] transition-colors"
                          onClick={(e) => openAction("history", locker, e)}
                          title="이력 보기"
                        >기록</button>
                        <button
                          className="w-full text-white text-[10px] font-semibold bg-white/20 hover:bg-white/30 rounded-md py-[2px] transition-colors"
                          onClick={(e) => openAction("move", locker, e)}
                          title="다른 번호로 이동"
                        >이동</button>
                        {locker.status !== "available" && (
                          <button
                            className="w-full text-white text-[10px] font-semibold bg-state-error/60 hover:bg-state-error/80 rounded-md py-[2px] transition-colors"
                            onClick={(e) => openAction("reclaim", locker, e)}
                            title="락커 회수"
                          >회수</button>
                        )}
                        {locker.status === "available" && (
                          <button
                            className="w-full text-white text-[10px] font-semibold bg-state-info/60 hover:bg-state-info/80 rounded-md py-[2px] transition-colors"
                            onClick={(e) => openAction("assign", locker, e)}
                            title="회원 배정"
                          >배정</button>
                        )}
                        <button
                          className={cn(
                            "w-full text-white text-[10px] font-semibold rounded-md py-[2px] transition-colors",
                            isBroken ? "bg-amber-500/60 hover:bg-amber-500/80" : "bg-content-secondary/60 hover:bg-content-secondary/80"
                          )}
                          onClick={(e) => openAction("broken", locker, e)}
                          title={isBroken ? "고장 해제" : "고장 처리"}
                        >{isBroken ? "복구" : "고장"}</button>
                      </div>
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
      )}

      {/* UI-056 락커 상세 모달 */}
      <LockerDetailModal
        isOpen={!!selectedLockerId && !bulkMode}
        locker={selectedLocker ?? null}
        onClose={() => setSelectedLockerId(null)}
        onRelease={handleRelease}
      />

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

      {/* ── 기록 모달 ── */}
      <Modal
        isOpen={actionModal?.action === "history"}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.locker.number}번 락커 이용 이력`}
        size="md"
      >
        {actionModal?.locker.history && actionModal.locker.history.length > 0 ? (
          <div className="border border-line rounded-lg overflow-hidden">
            {actionModal.locker.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between px-md py-sm border-b border-line last:border-b-0 hover:bg-surface-secondary/30 transition-colors">
                <span className="text-[12px] text-content">{h.date}</span>
                <StatusBadge variant={h.action === "배정" ? "success" : "default"} label={h.action} />
                <span className="text-[12px] text-content-secondary">{h.member}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-xl text-center text-[13px] text-content-secondary">이력이 없습니다.</div>
        )}
        {/* 비밀번호 / 메모 편집 */}
        {actionModal?.locker && (
          <div className="mt-lg space-y-md border-t border-line pt-lg">
            <div>
              <label className="block text-[12px] font-semibold text-content-secondary mb-xs">비밀번호</label>
              <input
                className="w-full h-9 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
                placeholder="락커 비밀번호"
                defaultValue={actionModal.locker.password ?? ""}
                id="locker-password-input"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-content-secondary mb-xs">메모</label>
              <textarea
                className="w-full rounded-lg bg-surface-secondary border border-line px-md py-sm text-[13px] focus:border-primary outline-none resize-none"
                rows={3}
                placeholder="락커 메모"
                defaultValue={actionModal.locker.memo ?? ""}
                id="locker-memo-input"
              />
            </div>
            <button
              className="w-full py-sm rounded-lg bg-primary text-white text-[13px] font-semibold hover:opacity-90 transition-all"
              onClick={() => {
                const pw = (document.getElementById("locker-password-input") as HTMLInputElement)?.value ?? "";
                const memo = (document.getElementById("locker-memo-input") as HTMLTextAreaElement)?.value ?? "";
                handleSavePasswordMemo(actionModal.locker.id, pw, memo);
                setActionModal(null);
              }}
            >저장</button>
          </div>
        )}
      </Modal>

      {/* ── 이동 모달 ── */}
      <Modal
        isOpen={actionModal?.action === "move"}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.locker.number}번 락커 이동`}
        size="sm"
        footer={
          <div className="flex gap-sm justify-end">
            <button className="px-md py-[7px] rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary" onClick={() => setActionModal(null)}>취소</button>
            <button className="px-md py-[7px] rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90" onClick={handleMove}>이동</button>
          </div>
        }
      >
        <p className="text-[13px] text-content-secondary mb-md">이동할 새 락커 번호를 입력하세요.</p>
        <input
          className="w-full h-10 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
          type="number"
          min={1}
          placeholder="예: 42"
          value={moveTargetNumber}
          onChange={e => setMoveTargetNumber(e.target.value)}
        />
      </Modal>

      {/* ── 회수 확인 모달 ── */}
      <ConfirmDialog
        open={actionModal?.action === "reclaim"}
        title="락커 회수"
        description={`${actionModal?.locker.number}번 락커를 회수하시겠습니까?\n배정된 회원 정보가 초기화됩니다.`}
        variant="danger"
        confirmLabel="회수"
        onConfirm={handleReclaim}
        onCancel={() => setActionModal(null)}
      />

      {/* ── 고장 토글 확인 모달 ── */}
      <ConfirmDialog
        open={actionModal?.action === "broken"}
        title={actionModal?.locker.status === "broken" ? "고장 해제" : "고장 처리"}
        description={
          actionModal?.locker.status === "broken"
            ? `${actionModal?.locker.number}번 락커의 고장 상태를 해제하시겠습니까?`
            : `${actionModal?.locker.number}번 락커를 고장 처리하시겠습니까?`
        }
        variant="danger"
        confirmLabel={actionModal?.locker.status === "broken" ? "고장 해제" : "고장 처리"}
        onConfirm={handleToggleBroken}
        onCancel={() => setActionModal(null)}
      />

      {/* ── 개별 배정 모달 ── */}
      <Modal
        isOpen={actionModal?.action === "assign"}
        onClose={() => setActionModal(null)}
        title={`${actionModal?.locker.number}번 락커 회원 배정`}
        size="md"
        footer={
          <div className="flex gap-sm justify-end">
            <button className="px-md py-[7px] rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary" onClick={() => setActionModal(null)}>취소</button>
            <button className="px-md py-[7px] rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90" onClick={handleAssign}>배정</button>
          </div>
        }
      >
        <div className="space-y-md">
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-xs">회원 검색 <span className="text-state-error">*</span></label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
              <input
                className="w-full h-10 rounded-lg bg-surface-secondary border border-line pl-[36px] pr-md text-[13px] focus:border-primary outline-none"
                placeholder="회원명 검색"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelectedMemberForAssign(null); }}
              />
            </div>
            {memberSearch && !selectedMemberForAssign && (
              <div className="mt-xs bg-surface border border-line rounded-lg shadow-md overflow-hidden max-h-[140px] overflow-y-auto">
                {memberOptions.filter(m => m.name.includes(memberSearch)).length === 0
                  ? <p className="p-md text-[12px] text-content-secondary text-center">검색 결과 없음</p>
                  : memberOptions.filter(m => m.name.includes(memberSearch)).map(m => (
                    <button key={m.id} className="w-full px-md py-sm text-left text-[13px] hover:bg-surface-secondary flex justify-between" onClick={() => { setSelectedMemberForAssign(m); setMemberSearch(m.name); }}>
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-[11px] text-content-secondary">{m.contact}</span>
                    </button>
                  ))
                }
              </div>
            )}
            {selectedMemberForAssign && (
              <div className="mt-xs flex items-center gap-sm p-sm bg-state-success/5 rounded-lg border border-state-success/20">
                <CheckSquare size={15} className="text-state-success" />
                <span className="text-[12px] font-semibold text-state-success">{selectedMemberForAssign.name} 선택됨</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-xs">만료일</label>
            <input
              className="w-full h-10 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
              type="date"
              value={bulkAssignExpiryDate}
              onChange={e => setBulkAssignExpiryDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* ── 일괄 배정 사이드 패널 (모달) ── */}
      <Modal
        isOpen={bulkAssignOpen && bulkMode}
        onClose={() => { setBulkAssignOpen(false); setBulkMode(false); setSelectedBulkIds(new Set()); }}
        title="일괄 배정"
        size="md"
        footer={
          <div className="flex gap-sm justify-end">
            <button
              className="px-md py-[7px] rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary"
              onClick={() => { setBulkAssignOpen(false); setBulkMode(false); setSelectedBulkIds(new Set()); }}
            >취소</button>
            <button
              className="px-md py-[7px] rounded-lg bg-primary text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40"
              disabled={selectedBulkIds.size === 0 || !selectedMemberForAssign}
              onClick={handleBulkAssign}
            >
              {selectedBulkIds.size}개 락커 배정
            </button>
          </div>
        }
      >
        <div className="space-y-md">
          <p className="text-[13px] text-content-secondary">그리드에서 빈 락커를 클릭하여 선택 후, 배정할 회원과 만료일을 지정하세요.</p>
          <div className="flex items-center gap-sm p-sm bg-primary/5 rounded-lg border border-primary/20">
            <CheckSquare size={15} className="text-primary" />
            <span className="text-[13px] font-semibold text-primary">{selectedBulkIds.size}개 락커 선택됨</span>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-xs">배정 회원 <span className="text-state-error">*</span></label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
              <input
                className="w-full h-10 rounded-lg bg-surface-secondary border border-line pl-[36px] pr-md text-[13px] focus:border-primary outline-none"
                placeholder="회원명 검색"
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelectedMemberForAssign(null); }}
              />
            </div>
            {memberSearch && !selectedMemberForAssign && (
              <div className="mt-xs bg-surface border border-line rounded-lg shadow-md overflow-hidden max-h-[140px] overflow-y-auto">
                {memberOptions.filter(m => m.name.includes(memberSearch)).length === 0
                  ? <p className="p-md text-[12px] text-content-secondary text-center">검색 결과 없음</p>
                  : memberOptions.filter(m => m.name.includes(memberSearch)).map(m => (
                    <button key={m.id} className="w-full px-md py-sm text-left text-[13px] hover:bg-surface-secondary flex justify-between" onClick={() => { setSelectedMemberForAssign(m); setMemberSearch(m.name); }}>
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-[11px] text-content-secondary">{m.contact}</span>
                    </button>
                  ))
                }
              </div>
            )}
            {selectedMemberForAssign && (
              <div className="mt-xs flex items-center gap-sm p-sm bg-state-success/5 rounded-lg border border-state-success/20">
                <CheckSquare size={15} className="text-state-success" />
                <span className="text-[12px] font-semibold text-state-success">{selectedMemberForAssign.name} 선택됨</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-xs">만료일</label>
            <input
              className="w-full h-10 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none"
              type="date"
              value={bulkAssignExpiryDate}
              onChange={e => setBulkAssignExpiryDate(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
