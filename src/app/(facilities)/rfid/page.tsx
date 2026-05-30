'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import {
  Plus,
  Search,
  RefreshCcw,
  Edit2,
  Trash2,
  History,
  CreditCard,
  UserCheck,
  ShieldCheck,
  X,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import { SearchFilter } from "@/components/common/SearchFilter";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SimpleTable from "@/components/common/SimpleTable";
import RadioGroup from "@/components/ui/RadioGroup";

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

/**
 * SCR-052: RFID/밴드 카드 관리
 * UI-108 카드 번호 입력 + 스캔 버튼
 * UI-109 회원 매핑 (검색 → 선택 → 매핑)
 * UI-110 카드 이력 테이블 (등록일/카드번호/회원명/상태)
 */

type CardStatus = "활성" | "분실" | "해제";

interface RfidCard {
  no: number;
  cardNo: string;
  memberName: string | null;
  memberId: number | null;
  memberPhone?: string | null;
  status: CardStatus;
  registeredAt: string;
  issuedAt: string | null;
  lockerNo: string | null;
  userType: "회원" | "직원" | null;
}

interface Member {
  id: string;
  name: string;
  contact: string;
  memberNo: string;
  type?: "회원" | "직원";
}

// 카드 번호 형식: RF-XXXXXXXX(스캔 시뮬) 또는 16자리 HEX 허용
const CARD_NO_PATTERN = /^(RF-\d{8}|[0-9A-Fa-f]{16})$/;

const getTenantId = (): number => {
  if (typeof window === "undefined") return 1;
  const stored = localStorage.getItem("tenantId");
  return stored ? Number(stored) : 1;
};

const getCurrentUser = (): { id: number; name: string } => {
  if (typeof window === "undefined") return { id: 0, name: "" };
  try {
    const raw = localStorage.getItem("auth_user");
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      id: parsed?.id ? Number(parsed.id) : 0,
      name: parsed?.name ?? parsed?.email ?? "",
    };
  } catch {
    return { id: 0, name: "" };
  }
};

const mapRfidCard = (row: Record<string, unknown>): RfidCard => ({
  no: Number(row.id),
  cardNo: String(row.cardNo ?? ""),
  memberName: (row.memberName as string | null) ?? null,
  memberId: row.memberId == null ? null : Number(row.memberId),
  memberPhone: (row.memberPhone as string | null) ?? null,
  status: (row.status as CardStatus) ?? "활성",
  registeredAt: row.registeredAt ? String(row.registeredAt).slice(0, 10) : "",
  issuedAt: row.issuedAt ? String(row.issuedAt).slice(0, 10) : null,
  lockerNo: (row.lockerNo as string | null) ?? null,
  userType: (row.userType as "회원" | "직원" | null) ?? null,
});


const CARD_STATUS_VARIANT: Record<CardStatus, "success" | "error" | "default"> = {
  활성: "success",
  분실: "error",
  해제: "default",
};

interface RfidHistoryEntry {
  date: string;
  cardNo: string;
  user: string;
  status: CardStatus;
  action: string;
}

// --- 이력 상세 모달 ---
const HistoryModal = ({ card, onClose }: { card: RfidCard; onClose: () => void }) => {
  const [history, setHistory] = useState<RfidHistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("createdAt, action, detail, afterValue, beforeValue")
        .eq("targetType", "rfid_card")
        .eq("targetId", card.no)
        .order("createdAt", { ascending: false });

      setHistory((data ?? []).map((row: Record<string, unknown>) => {
        const detail = (row.detail ?? {}) as Record<string, unknown>;
        const afterValue = (row.afterValue ?? {}) as Partial<RfidCard>;
        const beforeValue = (row.beforeValue ?? {}) as Partial<RfidCard>;
        const source = afterValue.cardNo ? afterValue : beforeValue;
        return {
          date: new Date(row.createdAt as string).toLocaleString("ko-KR"),
          cardNo: source.cardNo ?? card.cardNo,
          user: source.memberName ?? card.memberName ?? "-",
          status: (source.status as CardStatus) ?? card.status,
          action: String(detail.title ?? row.action ?? ""),
        };
      }));
    })();
  }, [card]);

  return (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-md">
    <div className="bg-surface rounded-xl w-full max-w-[680px] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between px-xl py-lg border-b border-line">
        <div>
          <h2 className="text-[16px] font-bold text-content flex items-center gap-sm">
            <History className="text-primary" size={20} />
            사용 이력 조회
          </h2>
          <p className="text-[12px] text-content-secondary mt-xs">
            카드 ID: <span className="font-bold text-content">{card.cardNo}</span>
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<X size={22} />} onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mb-lg flex items-center gap-sm">
          <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <span className="text-content-secondary">~</span>
          <Input type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <Button variant="outline" size="sm" icon={<RefreshCcw size={13} />}>조회</Button>
        </div>

        {/* UI-110 카드 이력 테이블 — 등록일/카드번호/회원명/상태 */}
        <SimpleTable
          columns={[
            { key: 'date', header: '등록일', render: (v: string) => <span className="text-[12px] text-content font-mono">{v}</span> },
            { key: 'cardNo', header: '카드번호', render: (v: string) => <span className="text-[12px] text-content font-mono">{v}</span> },
            { key: 'user', header: '회원명', render: (v: string) => <Button variant="ghost" size="sm" onClick={() => moveToPage(985)}>{v}</Button> },
            { key: 'status', header: '상태', align: 'center', render: (v: CardStatus) => <StatusBadge variant={CARD_STATUS_VARIANT[v]} label={v} dot /> },
            { key: 'action', header: '처리 내용' },
          ]}
          data={history}
        />
      </div>

      <div className="px-xl py-lg border-t border-line flex justify-end">
        <Button variant="outline" onClick={onClose}>닫기</Button>
      </div>
    </div>
  </div>
  );
};

// --- 등록/수정 모달 ---
const CardModal = ({
  card,
  onClose,
  onSave,
  memberList = [],
  existingCards = [],
}: {
  card: Partial<RfidCard> | null;
  onClose: () => void;
  onSave: (data: { cardNo: string; memberId: number | null; memberName: string; memberPhone: string | null; userType: "회원" | "직원"; lockerNo: string }) => void;
  memberList?: Member[];
  existingCards?: RfidCard[];
}) => {
  const [cardNo,     setCardNo]     = useState(card?.cardNo || "");
  const [memberSearch, setMemberSearch] = useState(card?.memberName || "");
  const [selectedMember, setSelectedMember] = useState<Member | null>(
    card?.memberName ? { id: String(card.memberId ?? ""), name: card.memberName, contact: card.memberPhone ?? "", memberNo: card.memberId ? `M-${card.memberId}` : "" } : null
  );
  const [userType, setUserType]     = useState<"회원" | "직원">(card?.userType || "회원");
  const [lockerNo, setLockerNo]     = useState(card?.lockerNo || "");
  const [isScanning, setIsScanning] = useState(!card?.cardNo);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredMembers = memberSearch.trim()
    ? memberList.filter(m =>
        (m.type ?? "회원") === userType &&
        (m.name.includes(memberSearch) || m.memberNo.includes(memberSearch))
      )
    : [];

  // UI-108 스캔 시뮬레이션
  const handleScan = () => {
    const randomId = "RF-" + Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
    setCardNo(randomId);
    setIsScanning(false);
  };

  // 카드 번호 형식·중복 검증 (자기 자신 수정은 제외)
  const trimmedNo = cardNo.trim();
  const duplicateCard = trimmedNo
    ? existingCards.find(c => c.cardNo === trimmedNo && c.cardNo !== card?.cardNo)
    : undefined;
  const formatError = trimmedNo && !CARD_NO_PATTERN.test(trimmedNo)
    ? "올바른 형식이 아닙니다 (16자리 HEX)"
    : null;
  const duplicateError = duplicateCard
    ? `동일 카드 번호가 이미 등록됨${duplicateCard.memberName ? ` (${duplicateCard.memberName})` : ""}`
    : null;
  const cardNoError = formatError || duplicateError;

  const isValid = trimmedNo && selectedMember && !cardNoError;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[560px] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-xl py-lg border-b border-line bg-surface-secondary/30">
          <div>
            <h2 className="text-[16px] font-bold text-content">
              {card?.cardNo ? "카드 정보 수정" : "신규 카드 등록"}
            </h2>
            <p className="text-[12px] text-content-secondary mt-xs">RFID 리더기를 통해 카드 번호를 자동 입력하거나 수동으로 입력하세요.</p>
          </div>
          <Button variant="ghost" size="sm" icon={<X size={22} />} onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-xl space-y-xl">
          {/* UI-108 카드 번호 입력 + 스캔 버튼 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              카드 번호 <span className="text-state-error">*</span>
            </label>
            {/* 스캔 대기 UI */}
            <div className={cn(
              "rounded-xl border-2 border-dashed p-lg flex flex-col items-center gap-md mb-md transition-all",
              isScanning ? "border-primary bg-primary/5" : "border-line bg-surface-secondary/30"
            )}>
              <div className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                isScanning ? "bg-primary text-white animate-pulse" : "bg-surface-tertiary text-content-secondary"
              )}>
                <Wifi size={24} />
              </div>
              <div className="text-center">
                <p className={cn("text-[13px] font-bold", isScanning ? "text-primary" : "text-content-secondary")}>
                  {isScanning ? "카드를 리더기에 대주세요" : "리더기 대기 중..."}
                </p>
                <p className="text-[12px] text-content-secondary mt-xs">태그 시 카드 번호가 자동 입력됩니다.</p>
              </div>
              {isScanning && (
                <Button variant="ghost" size="sm" onClick={handleScan}>[시뮬레이션: 카드 스캔하기]</Button>
              )}
            </div>
            <div className="flex gap-sm">
              <Input
                className="flex-1 font-mono"
                placeholder="RF-XXXXXXXX (직접 입력)"
                value={cardNo}
                onChange={e => setCardNo(e.target.value)}
              />
              <Button variant="primary" onClick={handleScan}>스캔</Button>
            </div>
            {cardNoError ? (
              <div className="mt-xs flex items-center gap-xs text-state-error">
                <AlertCircle size={13} />
                <span className="text-[12px] font-semibold">{cardNoError}</span>
              </div>
            ) : cardNo && (
              <div className="mt-xs flex items-center gap-xs text-state-success">
                <CheckCircle2 size={13} />
                <span className="text-[12px] font-semibold">카드 번호 입력됨: <span className="font-mono">{cardNo}</span></span>
              </div>
            )}
          </div>

          {/* UI-109 회원 매핑 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              사용자 유형 <span className="text-state-error">*</span>
            </label>
            <RadioGroup
              options={[
                { value: '회원', label: '회원' },
                { value: '직원', label: '직원' },
              ]}
              value={userType}
              onChange={(v) => setUserType(v as "회원" | "직원")}
              direction="horizontal"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              회원 선택 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
              <Input
                className="pl-[36px]"
                placeholder={`${userType} 이름 또는 번호 검색`}
                value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setSelectedMember(null); setIsDropdownOpen(true); }}
                onBlur={() => setTimeout(() => setIsDropdownOpen(false), 150)}
              />
              {isDropdownOpen && filteredMembers.length > 0 && (
                <div className="absolute top-full mt-xs left-0 right-0 bg-surface border border-line rounded-lg shadow-lg z-20 max-h-[180px] overflow-y-auto">
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      className="w-full flex items-center gap-md px-md py-sm hover:bg-surface-secondary transition-colors text-left border-b border-line last:border-b-0"
                      onMouseDown={() => { setSelectedMember(m); setMemberSearch(m.name); setIsDropdownOpen(false); }}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <UserCheck size={13} className="text-primary" />
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

            {/* 매핑 상태 표시 */}
            {selectedMember && (
              <div className="mt-sm p-sm bg-state-success/5 rounded-lg border border-state-success/20 flex items-center gap-sm">
                <CheckCircle2 size={14} className="text-state-success" />
                <div>
                  <p className="text-[12px] font-bold text-state-success">{selectedMember.name} 매핑됨</p>
                  {selectedMember.memberNo && (
                    <p className="text-[11px] text-content-secondary">{selectedMember.memberNo}</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={() => { setSelectedMember(null); setMemberSearch(""); }} className="ml-auto" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">연결 사물함 번호</label>
            <Input
              placeholder="사물함 번호 입력 (선택)"
              value={lockerNo}
              onChange={e => setLockerNo(e.target.value)}
            />
          </div>
        </div>

        <div className="px-xl py-lg border-t border-line flex justify-end gap-sm">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            disabled={!isValid}
            onClick={() => {
              if (!isValid || !selectedMember) return;
              onSave({
                cardNo,
                memberId: userType === "회원" && selectedMember.id ? Number(selectedMember.id) : null,
                memberName: selectedMember.name,
                memberPhone: selectedMember.contact || null,
                userType,
                lockerNo,
              });
              onClose();
            }}
          >
            {card?.cardNo ? "수정 완료" : "등록 완료"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function RfidManagement() {
  const [cards, setCards]         = useState<RfidCard[]>([]);
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const writeCardAudit = async (
    action: "CREATE" | "UPDATE" | "DELETE" | "MARK_LOST",
    targetId: number,
    beforeValue: RfidCard | null,
    afterValue: RfidCard | null,
  ) => {
    const user = getCurrentUser();
    const card = afterValue ?? beforeValue;
    const titleMap = {
      CREATE: "카드 등록",
      UPDATE: "카드 수정",
      DELETE: "카드 삭제",
      MARK_LOST: "분실 처리",
    };
    await supabase.from("audit_log").insert({
      tenantId: getTenantId(),
      userId: user.id,
      action,
      targetType: "rfid_card",
      targetId,
      fromBranchId: getBranchId(),
      beforeValue,
      afterValue,
      detail: {
        userName: user.name,
        title: titleMap[action],
        cardNo: card?.cardNo,
        memberName: card?.memberName,
      },
      userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
    }).then(() => undefined);
  };

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rfid_cards")
      .select("*")
      .eq("branchId", getBranchId())
      .order("registeredAt", { ascending: false });
    if (error) {
      toast.error("카드 목록을 불러오지 못했습니다.");
    } else {
      setCards((data ?? []).map((row: Record<string, unknown>) => mapRfidCard(row)));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  useEffect(() => {
    const fetchMembers = async () => {
      const [{ data: memberData, error: memberError }, { data: staffData }] = await Promise.all([
        supabase
        .from('members')
        .select('id, name, phone')
          .eq('branchId', getBranchId()),
        supabase
          .from('staff')
          .select('id, name, phone')
          .eq('branchId', getBranchId())
          .eq('isActive', true),
      ]);
      if (!memberError) {
        const members = (memberData ?? []).map((m: any, i: number) => ({
          id: String(m.id),
          name: m.name,
          contact: m.phone,
          memberNo: `M-${10234 + i}`,
          type: "회원" as const,
        }));
        const staff = (staffData ?? []).map((s: any) => ({
          id: String(s.id),
          name: s.name,
          contact: s.phone ?? "",
          memberNo: `ST-${s.id}`,
          type: "직원" as const,
        }));
        setMemberList([...members, ...staff]);
      }
    };
    fetchMembers();
  }, []);
  const [searchValue, setSearch]  = useState("");
  const [filterStatus, setFilter] = useState("");
  const [isAddModalOpen, setAddModal]   = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [isDeleteOpen,  setDeleteOpen]  = useState(false);
  const [selectedCard,  setSelectedCard] = useState<RfidCard | null>(null);

  const filteredCards = cards.filter(c => {
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchSearch = !searchValue ||
      c.cardNo.toLowerCase().includes(searchValue.toLowerCase()) ||
      (c.memberName && c.memberName.includes(searchValue));
    return matchStatus && matchSearch;
  });

  const handleSave = async (data: { cardNo: string; memberId: number | null; memberName: string; memberPhone: string | null; userType: "회원" | "직원"; lockerNo: string }) => {
    if (selectedCard) {
      const { data: updated, error } = await supabase
        .from("rfid_cards")
        .update({
          cardNo: data.cardNo,
          memberId: data.memberId,
          memberName: data.memberName,
          memberPhone: data.memberPhone,
          userType: data.userType,
          lockerNo: data.lockerNo || null,
          status: "활성",
          issuedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq("id", selectedCard.no)
        .select("*")
        .single();
      if (error || !updated) {
        toast.error("카드 수정에 실패했습니다.");
        return;
      }
      const mapped = mapRfidCard(updated as Record<string, unknown>);
      await writeCardAudit("UPDATE", selectedCard.no, selectedCard, mapped);
      setCards(prev => prev.map(c => c.no === selectedCard.no ? mapped : c));
      toast.success("카드 정보가 수정되었습니다.");
    } else {
      const { data: inserted, error } = await supabase
        .from("rfid_cards")
        .insert({
          branchId: getBranchId(),
          cardNo: data.cardNo,
          memberId: data.memberId,
          memberName: data.memberName,
          memberPhone: data.memberPhone,
          userType: data.userType,
          lockerNo: data.lockerNo || null,
          status: "활성",
          registeredAt: new Date().toISOString(),
          issuedAt: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error || !inserted) {
        toast.error("카드 등록에 실패했습니다.");
        return;
      }
      const mapped = mapRfidCard(inserted as Record<string, unknown>);
      await writeCardAudit("CREATE", mapped.no, null, mapped);
      setCards(prev => [mapped, ...prev]);
      toast.success("신규 카드가 등록되었습니다.");
    }
  };

  const handleMarkLost = async (card: RfidCard) => {
    const { data, error } = await supabase
      .from("rfid_cards")
      .update({ status: "분실", updatedAt: new Date().toISOString() })
      .eq("id", card.no)
      .select("*")
      .single();
    if (error || !data) {
      toast.error("분실 처리에 실패했습니다.");
      return;
    }
    const mapped = mapRfidCard(data as Record<string, unknown>);
    await writeCardAudit("MARK_LOST", card.no, card, mapped);
    setCards(prev => prev.map(c => c.no === card.no ? mapped : c));
    toast.success("분실 처리되었습니다.");
  };

  const handleDelete = async () => {
    if (!selectedCard) return;
    const before = selectedCard;
    const { error } = await supabase
      .from("rfid_cards")
      .update({ status: "해제", memberId: null, memberName: null, memberPhone: null, lockerNo: null, issuedAt: null, updatedAt: new Date().toISOString() })
      .eq("id", selectedCard.no);
    if (error) {
      toast.error("카드 해제에 실패했습니다.");
      return;
    }
    const after: RfidCard = {
      ...before,
      memberId: null,
      memberName: null,
      memberPhone: null,
      lockerNo: null,
      issuedAt: null,
      status: "해제",
    };
    await writeCardAudit("DELETE", selectedCard.no, before, after);
    setCards(prev => prev.map(c => c.no === selectedCard.no ? after : c));
    setDeleteOpen(false);
    setSelectedCard(null);
    toast.success("카드가 해제되었습니다.");
  };

  // UI-110 카드 이력 테이블 컬럼 (등록일/카드번호/회원명/상태)
  const columns = [
    { key: "no",       header: "No", width: 55, align: "center" as const },
    {
      key: "registeredAt",
      header: "등록일", width: 110, align: "center" as const,
      render: (val: string) => <span className="text-[12px] font-mono text-content">{val}</span>
    },
    {
      key: "cardNo",
      header: "카드번호", sortable: true,
      render: (val: string) => <span className="text-[12px] font-mono font-semibold text-content">{val}</span>
    },
    {
      key: "memberName",
      header: "회원명",
      render: (val: string | null, row: RfidCard) => val ? (
        <Button variant="ghost" size="sm" onClick={() => row.memberId && moveToPage(985, { id: row.memberId })}>
          {val}
        </Button>
      ) : <span className="text-content-tertiary text-[12px]">-</span>
    },
    {
      key: "memberPhone",
      header: "연락처", width: 120,
      render: (val: string | null) => val ? <span className="text-[12px] font-mono text-content">{val}</span> : <span className="text-content-tertiary text-[12px]">-</span>
    },
    {
      key: "userType",
      header: "유형", width: 80, align: "center" as const,
      render: (val: string | null) => val
        ? <StatusBadge variant={val === "회원" ? "info" : "warning"} label={val} />
        : <span className="text-[12px] text-content-tertiary">-</span>
    },
    {
      key: "status",
      header: "상태", width: 90, align: "center" as const,
      render: (val: CardStatus) => (
        <StatusBadge variant={CARD_STATUS_VARIANT[val]} label={val} dot />
      )
    },
    {
      key: "issuedAt",
      header: "배정일", width: 100, align: "center" as const,
      render: (val: string | null) => <span className="text-[12px] font-mono text-content">{val || "-"}</span>
    },
    {
      key: "lockerNo",
      header: "사물함", width: 80, align: "center" as const,
      render: (val: string | null) => val || "-"
    },
    {
      key: "actions",
      header: "메뉴", width: 110, align: "center" as const,
      render: (_: any, row: RfidCard) => (
        <div className="flex items-center justify-center gap-xs">
          <Button variant="ghost" size="sm" icon={<History size={15} />} title="이력 보기" onClick={() => { setSelectedCard(row); setHistoryOpen(true); }} />
          <Button variant="ghost" size="sm" icon={<AlertCircle size={15} />} title="분실 처리" onClick={() => handleMarkLost(row)} disabled={row.status === "분실"} />
          <Button variant="ghost" size="sm" icon={<Edit2 size={15} />} title="수정" onClick={() => { setSelectedCard(row); setAddModal(true); }} />
          <Button variant="ghost" size="sm" icon={<Trash2 size={15} />} title="삭제" onClick={() => { setSelectedCard(row); setDeleteOpen(true); }} />
        </div>
      )
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-lg">
        <PageHeader
          title="밴드/카드 관리"
          description="RFID 밴드 및 카드를 등록하고 회원/직원과 연결하여 출입 및 시설 이용을 관리합니다."
          actions={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setSelectedCard(null); setAddModal(true); }}>신규 등록</Button>
          }
        />

        {/* 통계 카드 */}
        <StatCardGrid cols={3}>
          <StatCard label="전체 카드"        value={cards.length}                                   icon={<CreditCard />} />
          <StatCard label="활성 (사용 중)"   value={cards.filter(c => c.status === "활성").length}  icon={<UserCheck />}  variant="mint" />
          <StatCard label="미사용/해제/분실" value={cards.filter(c => c.status !== "활성").length}  icon={<ShieldCheck />} variant="peach" />
        </StatCardGrid>

        {/* 검색/필터 */}
        <SearchFilter
          searchPlaceholder="카드번호 또는 회원명 검색"
          searchValue={searchValue}
          onSearchChange={setSearch}
          filters={[
            {
              key: "status", label: "상태", type: "select",
              options: [
                { value: "활성", label: "활성" },
                { value: "분실", label: "분실" },
                { value: "해제", label: "해제" },
              ]
            }
          ]}
          onFilterChange={(key, val) => key === "status" && setFilter(val)}
          onReset={() => { setSearch(""); setFilter(""); }}
        />

        {/* UI-110 카드 이력 테이블 */}
        <DataTable
          columns={columns}
          data={filteredCards}
          title={loading ? "카드 이력 목록 로딩 중" : "카드 이력 목록"}
          pagination={{ page: 1, pageSize: 20, total: filteredCards.length }}
          onDownloadExcel={() => {
            const exportColumns = [
              { key: 'no', header: 'No' },
              { key: 'registeredAt', header: '등록일' },
              { key: 'cardNo', header: '카드번호' },
              { key: 'memberName', header: '회원명' },
              { key: 'userType', header: '유형' },
              { key: 'status', header: '상태' },
              { key: 'issuedAt', header: '발급일' },
              { key: 'lockerNo', header: '사물함' },
            ];
            exportToExcel(filteredCards as unknown as Record<string, unknown>[], exportColumns, { filename: 'RFID카드목록' });
            toast.success(`${filteredCards.length}건 엑셀 다운로드 완료`);
          }}
        />
      </div>

      {/* UI-108, UI-109 등록/수정 모달 */}
      {isAddModalOpen && (
        <CardModal
          card={selectedCard}
          onClose={() => { setAddModal(false); setSelectedCard(null); }}
          onSave={handleSave}
          memberList={memberList}
          existingCards={cards}
        />
      )}

      {/* 이력 모달 */}
      {isHistoryOpen && selectedCard && (
        <HistoryModal card={selectedCard} onClose={() => { setHistoryOpen(false); setSelectedCard(null); }} />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="카드 해제"
        description={`카드 ID: ${selectedCard?.cardNo} 를 해제하시겠습니까?\n연결된 회원/직원, 사물함 매핑이 해제되고 이력은 유지됩니다.`}
        confirmLabel="해제하기"
        variant="danger"
        confirmationText="해제"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setSelectedCard(null); }}
      />
    </AppLayout>
  );
}
