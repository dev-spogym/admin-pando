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

const getBranchId = (): number => {
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
}

// --- 카드 초기 데이터 (rfid 테이블 없으므로 로컬 상태 유지) ---
const INITIAL_CARDS: RfidCard[] = [
  { no: 1, cardNo: "RF-10293847", memberName: "홍길동",  memberId: 10234, status: "활성", registeredAt: "2026-01-10", issuedAt: "2026-02-01", lockerNo: "A-102", userType: "회원" },
  { no: 2, cardNo: "RF-55667788", memberName: "김민수",  memberId: null,  status: "활성", registeredAt: "2026-01-12", issuedAt: "2026-02-05", lockerNo: null,    userType: "직원" },
  { no: 3, cardNo: "RF-99881122", memberName: null,     memberId: null,  status: "해제", registeredAt: "2026-01-15", issuedAt: null,          lockerNo: null,    userType: null  },
  { no: 4, cardNo: "RF-33445566", memberName: "이영희",  memberId: 10567, status: "활성", registeredAt: "2026-01-20", issuedAt: "2026-02-10", lockerNo: "B-205", userType: "회원" },
  { no: 5, cardNo: "RF-77112233", memberName: null,     memberId: null,  status: "해제", registeredAt: "2026-01-25", issuedAt: null,          lockerNo: null,    userType: null  },
  { no: 6, cardNo: "RF-44332211", memberName: "박지성",  memberId: 10890, status: "분실", registeredAt: "2026-02-01", issuedAt: "2026-02-15", lockerNo: "C-301", userType: "회원" },
  { no: 7, cardNo: "RF-88776655", memberName: "최유나",  memberId: 10901, status: "활성", registeredAt: "2026-02-05", issuedAt: "2026-02-20", lockerNo: null,    userType: "회원" },
  { no: 8, cardNo: "RF-11223344", memberName: "정재욱",  memberId: 10456, status: "활성", registeredAt: "2026-02-10", issuedAt: "2026-02-25", lockerNo: "A-201", userType: "회원" },
];


const CARD_STATUS_VARIANT: Record<CardStatus, "success" | "error" | "default"> = {
  활성: "success",
  분실: "error",
  해제: "default",
};

// --- 이력 상세 모달 ---
const HistoryModal = ({ card, onClose }: { card: RfidCard; onClose: () => void }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-md">
    <div className="bg-surface rounded-xl w-full max-w-[600px] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[85vh]">
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
        <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={onClose}>
          <X className="text-content-secondary" size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-xl">
        <div className="mb-lg flex items-center gap-sm">
          <input className="rounded-lg border border-line px-md py-xs text-[13px] bg-surface-secondary outline-none focus:border-primary" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <span className="text-content-secondary">~</span>
          <input className="rounded-lg border border-line px-md py-xs text-[13px] bg-surface-secondary outline-none focus:border-primary" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          <button className="flex items-center gap-xs px-md py-xs bg-surface-secondary border border-line text-content-secondary rounded-lg text-[12px] font-semibold hover:bg-surface-tertiary transition-colors">
            <RefreshCcw size={13} /> 조회
          </button>
        </div>

        {/* UI-110 카드 이력 테이블 — 등록일/카드번호/회원명/상태 */}
        <div className="rounded-xl border border-line overflow-hidden">
          <table className="w-full border-collapse">
            <thead className="bg-surface-secondary/50">
              <tr>
                <th className="px-md py-sm text-left text-[12px] font-semibold text-content-secondary">등록일</th>
                <th className="px-md py-sm text-left text-[12px] font-semibold text-content-secondary">카드번호</th>
                <th className="px-md py-sm text-left text-[12px] font-semibold text-content-secondary">회원명</th>
                <th className="px-md py-sm text-center text-[12px] font-semibold text-content-secondary">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[
                { date: "2026-02-01 10:20", cardNo: card.cardNo, user: "홍길동", status: "활성" as CardStatus },
                { date: "2026-01-20 15:45", cardNo: card.cardNo, user: "이수진", status: "해제" as CardStatus },
                { date: "2026-01-05 09:10", cardNo: card.cardNo, user: "박철수", status: "활성" as CardStatus },
                { date: "2025-12-28 18:30", cardNo: card.cardNo, user: "정미영", status: "분실" as CardStatus },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-secondary/20 transition-colors">
                  <td className="px-md py-sm text-[12px] text-content font-mono">{item.date}</td>
                  <td className="px-md py-sm text-[12px] text-content font-mono">{item.cardNo}</td>
                  <td className="px-md py-sm">
                    <button className="text-[13px] font-semibold text-primary hover:underline" onClick={() => moveToPage(985)}>
                      {item.user}
                    </button>
                  </td>
                  <td className="px-md py-sm text-center">
                    <StatusBadge variant={CARD_STATUS_VARIANT[item.status]} label={item.status} dot />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-xl py-lg border-t border-line flex justify-end">
        <button className="px-xl py-sm rounded-lg bg-surface-secondary text-content-secondary text-[13px] font-semibold hover:bg-surface-tertiary transition-colors" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  </div>
);

// --- 등록/수정 모달 ---
const CardModal = ({
  card,
  onClose,
  onSave,
  memberList = [],
}: {
  card: Partial<RfidCard> | null;
  onClose: () => void;
  onSave: (data: { cardNo: string; memberName: string; userType: "회원" | "직원"; lockerNo: string }) => void;
  memberList?: Member[];
}) => {
  const [cardNo,     setCardNo]     = useState(card?.cardNo || "");
  const [memberSearch, setMemberSearch] = useState(card?.memberName || "");
  const [selectedMember, setSelectedMember] = useState<Member | null>(
    card?.memberName ? { id: "", name: card.memberName, contact: "", memberNo: "" } : null
  );
  const [userType, setUserType]     = useState<"회원" | "직원">(card?.userType || "회원");
  const [lockerNo, setLockerNo]     = useState(card?.lockerNo || "");
  const [isScanning, setIsScanning] = useState(!card?.cardNo);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredMembers = memberSearch.trim()
    ? memberList.filter(m => m.name.includes(memberSearch) || m.memberNo.includes(memberSearch))
    : [];

  // UI-108 스캔 시뮬레이션
  const handleScan = () => {
    const randomId = "RF-" + Math.floor(Math.random() * 100000000).toString().padStart(8, "0");
    setCardNo(randomId);
    setIsScanning(false);
  };

  const isValid = cardNo.trim() && selectedMember;

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
          <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors" onClick={onClose}>
            <X className="text-content-secondary" size={22} />
          </button>
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
                <button
                  className="text-[12px] text-primary hover:underline font-semibold"
                  onClick={handleScan}
                >
                  [시뮬레이션: 카드 스캔하기]
                </button>
              )}
            </div>
            <div className="flex gap-sm">
              <input
                className="flex-1 h-10 rounded-lg bg-surface-secondary border border-line px-md text-[13px] font-mono focus:border-primary outline-none transition-all"
                placeholder="RF-XXXXXXXX (직접 입력)"
                value={cardNo}
                onChange={e => setCardNo(e.target.value)}
              />
              <button
                className="px-lg h-10 rounded-lg bg-primary text-white text-[13px] font-bold hover:opacity-90 transition-all shadow-sm"
                onClick={handleScan}
              >
                스캔
              </button>
            </div>
            {cardNo && (
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
            <div className="flex items-center gap-lg h-10">
              {(["회원", "직원"] as const).map(type => (
                <label key={type} className="flex items-center gap-xs cursor-pointer group">
                  <input
                    className="w-4 h-4 accent-primary"
                    type="radio"
                    name="userType"
                    checked={userType === type}
                    onChange={() => setUserType(type)}
                  />
                  <span className={cn("text-[13px] group-hover:text-primary transition-colors", userType === type ? "text-primary font-semibold" : "text-content")}>
                    {type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              회원 선택 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={15} />
              <input
                className="w-full h-10 pl-[36px] pr-md rounded-lg bg-surface-secondary border border-line text-[13px] focus:border-primary outline-none transition-all"
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
                <button className="ml-auto text-content-tertiary hover:text-content-secondary" onClick={() => { setSelectedMember(null); setMemberSearch(""); }}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">연결 사물함 번호</label>
            <input
              className="w-full h-10 rounded-lg bg-surface-secondary border border-line px-md text-[13px] focus:border-primary outline-none transition-all"
              placeholder="사물함 번호 입력 (선택)"
              value={lockerNo}
              onChange={e => setLockerNo(e.target.value)}
            />
          </div>
        </div>

        <div className="px-xl py-lg border-t border-line flex justify-end gap-sm">
          <button
            className="px-lg py-sm rounded-lg border border-line text-content-secondary text-[13px] font-semibold hover:bg-surface-secondary transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className={cn(
              "px-xl py-sm rounded-lg text-[13px] font-bold shadow-sm transition-all",
              isValid ? "bg-primary text-white hover:opacity-90" : "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
            )}
            disabled={!isValid}
            onClick={() => {
              if (!isValid || !selectedMember) return;
              onSave({ cardNo, memberName: selectedMember.name, userType, lockerNo });
              onClose();
            }}
          >
            {card?.cardNo ? "수정 완료" : "등록 완료"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function RfidManagement() {
  const [cards, setCards]         = useState<RfidCard[]>(INITIAL_CARDS);
  const [memberList, setMemberList] = useState<Member[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setMemberList(data.map((m: any, i: number) => ({
          id: String(m.id),
          name: m.name,
          contact: m.phone,
          memberNo: `M-${10234 + i}`,
        })));
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

  const handleSave = (data: { cardNo: string; memberName: string; userType: "회원" | "직원"; lockerNo: string }) => {
    if (selectedCard) {
      setCards(prev => prev.map(c =>
        c.no === selectedCard.no
          ? { ...c, cardNo: data.cardNo, memberName: data.memberName, userType: data.userType, lockerNo: data.lockerNo || null, status: "활성" }
          : c
      ));
    } else {
      const newNo = Math.max(...cards.map(c => c.no), 0) + 1;
      setCards(prev => [{
        no: newNo,
        cardNo: data.cardNo,
        memberName: data.memberName,
        memberId: newNo * 100,
        status: "활성",
        registeredAt: new Date().toISOString().split("T")[0],
        issuedAt: new Date().toISOString().split("T")[0],
        lockerNo: data.lockerNo || null,
        userType: data.userType,
      }, ...prev]);
    }
  };

  const handleMarkLost = (card: RfidCard) => {
    setCards(prev => prev.map(c => c.no === card.no ? { ...c, status: "분실" } : c));
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
        <button className="text-[13px] font-semibold text-primary hover:underline" onClick={() => row.memberId && moveToPage(985, { id: row.memberId })}>
          {val}
        </button>
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
          <button
            className="p-xs text-content-secondary hover:text-primary transition-colors"
            title="이력 보기"
            onClick={() => { setSelectedCard(row); setHistoryOpen(true); }}
          >
            <History size={15} />
          </button>
          <button
            className="p-xs text-content-secondary hover:text-state-error transition-colors"
            title="분실 처리"
            onClick={() => handleMarkLost(row)}
            disabled={row.status === "분실"}
          >
            <AlertCircle size={15} className={row.status === "분실" ? "opacity-30" : ""} />
          </button>
          <button
            className="p-xs text-content-secondary hover:text-primary transition-colors"
            title="수정"
            onClick={() => { setSelectedCard(row); setAddModal(true); }}
          >
            <Edit2 size={15} />
          </button>
          <button
            className="p-xs text-content-secondary hover:text-state-error transition-colors"
            title="삭제"
            onClick={() => { setSelectedCard(row); setDeleteOpen(true); }}
          >
            <Trash2 size={15} />
          </button>
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
            <button
              className="flex items-center gap-sm bg-primary text-white px-lg py-sm rounded-lg text-[13px] font-bold shadow-sm hover:opacity-90 transition-all"
              onClick={() => { setSelectedCard(null); setAddModal(true); }}
            >
              <Plus size={16} /> 신규 등록
            </button>
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
          title="카드 이력 목록"
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
        />
      )}

      {/* 이력 모달 */}
      {isHistoryOpen && selectedCard && (
        <HistoryModal card={selectedCard} onClose={() => { setHistoryOpen(false); setSelectedCard(null); }} />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="카드 삭제"
        description={`카드 ID: ${selectedCard?.cardNo} 를 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없으며, 연결된 회원과의 관계가 끊어집니다.`}
        confirmLabel="삭제하기"
        variant="danger"
        confirmationText="삭제"
        onConfirm={() => {
          if (selectedCard) setCards(prev => prev.filter(c => c.no !== selectedCard.no));
          setDeleteOpen(false);
          setSelectedCard(null);
        }}
        onCancel={() => { setDeleteOpen(false); setSelectedCard(null); }}
      />
    </AppLayout>
  );
}
