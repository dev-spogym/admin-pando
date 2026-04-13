'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Settings,
  Trash2,
  Grid,
  CheckCircle2,
  XCircle,
  Edit2,
  Users,
  Clock,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import TabNav from "@/components/common/TabNav";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import SimpleTable from "@/components/common/SimpleTable";
import Input from "@/components/ui/Input";
import { toast } from "sonner";
import { readBranchJson, writeBranchJson } from "@/lib/branchStorage";

/**
 * SCR-053: 운동룸 관리
 * UI-111 룸 카드 (GX룸/PT룸, 룸명/유형/수용인원/상태)
 * UI-112 룸 등록 모달 (룸명/유형/수용인원/설명)
 * 예약 가능 시간대 슬롯 시각화
 */

type RoomType   = "GX" | "PT" | "스피닝" | "필라테스" | "기타";
type RoomStatus = "운영중" | "점검중" | "고장" | "미사용";

interface Room {
  id: number;
  name: string;
  type: RoomType;
  capacity: number;
  status: RoomStatus;
  gate: string;
  description: string;
  // 예약 슬롯: 시간대 → 예약 비율 (0~1)
  slots: { hour: number; ratio: number; label?: string }[];
}

// --- Mock 룸 데이터 (GX룸 2개, PT룸 3개) ---
const INITIAL_ROOMS: Room[] = [
  {
    id: 1, name: "GX룸 A", type: "GX", capacity: 20, status: "운영중", gate: "A-1 게이트",
    description: "그룹 수업 전용 GX룸. 요가, 필라테스, 줌바 수업 진행.",
    slots: [
      { hour: 7,  ratio: 0.3 }, { hour: 8,  ratio: 0.7 }, { hour: 9,  ratio: 1.0, label: "만석" },
      { hour: 10, ratio: 0.8 }, { hour: 11, ratio: 0.5 }, { hour: 12, ratio: 0.2 },
      { hour: 13, ratio: 0.4 }, { hour: 14, ratio: 0.9 }, { hour: 15, ratio: 0.6 },
      { hour: 16, ratio: 0.3 }, { hour: 17, ratio: 0.8 }, { hour: 18, ratio: 1.0, label: "만석" },
      { hour: 19, ratio: 0.9 }, { hour: 20, ratio: 0.5 },
    ],
  },
  {
    id: 2, name: "GX룸 B", type: "GX", capacity: 16, status: "운영중", gate: "B-1 게이트",
    description: "스피닝 전용룸. 고정식 사이클 21대 구비.",
    slots: [
      { hour: 7,  ratio: 0.1 }, { hour: 8,  ratio: 0.4 }, { hour: 9,  ratio: 0.7 },
      { hour: 10, ratio: 0.5 }, { hour: 11, ratio: 0.3 }, { hour: 12, ratio: 0.0 },
      { hour: 13, ratio: 0.2 }, { hour: 14, ratio: 0.8 }, { hour: 15, ratio: 1.0, label: "만석" },
      { hour: 16, ratio: 0.6 }, { hour: 17, ratio: 0.4 }, { hour: 18, ratio: 0.7 },
      { hour: 19, ratio: 0.5 }, { hour: 20, ratio: 0.2 },
    ],
  },
  {
    id: 3, name: "PT룸 1", type: "PT", capacity: 2, status: "운영중", gate: "C-1 게이트",
    description: "1:1 PT 전용룸. 주요 운동기구 완비.",
    slots: [
      { hour: 7,  ratio: 0.5 }, { hour: 8,  ratio: 1.0, label: "예약" }, { hour: 9,  ratio: 1.0, label: "예약" },
      { hour: 10, ratio: 0.5 }, { hour: 11, ratio: 0.0 }, { hour: 12, ratio: 0.0 },
      { hour: 13, ratio: 1.0, label: "예약" }, { hour: 14, ratio: 1.0, label: "예약" }, { hour: 15, ratio: 0.5 },
      { hour: 16, ratio: 0.0 }, { hour: 17, ratio: 1.0, label: "예약" }, { hour: 18, ratio: 1.0, label: "예약" },
      { hour: 19, ratio: 0.5 }, { hour: 20, ratio: 0.0 },
    ],
  },
  {
    id: 4, name: "PT룸 2", type: "PT", capacity: 2, status: "점검중", gate: "-",
    description: "시설 점검 중. 3월 15일 재오픈 예정.",
    slots: [],
  },
  {
    id: 5, name: "PT룸 3", type: "PT", capacity: 2, status: "운영중", gate: "D-1 게이트",
    description: "여성 전용 PT룸. 프라이버시 보호 설계.",
    slots: [
      { hour: 7,  ratio: 0.0 }, { hour: 8,  ratio: 0.5 }, { hour: 9,  ratio: 1.0, label: "예약" },
      { hour: 10, ratio: 1.0, label: "예약" }, { hour: 11, ratio: 0.5 }, { hour: 12, ratio: 0.0 },
      { hour: 13, ratio: 0.0 }, { hour: 14, ratio: 0.5 }, { hour: 15, ratio: 1.0, label: "예약" },
      { hour: 16, ratio: 1.0, label: "예약" }, { hour: 17, ratio: 0.5 }, { hour: 18, ratio: 0.0 },
      { hour: 19, ratio: 0.0 }, { hour: 20, ratio: 0.0 },
    ],
  },
];

const ROOM_TYPE_STYLES: Record<RoomType, string> = {
  GX:     "bg-state-info/10 text-state-info border-state-info/20",
  PT:     "bg-primary/10 text-primary border-primary/20",
  스피닝:  "bg-state-success/10 text-state-success border-state-success/20",
  필라테스: "bg-amber-50 text-amber-700 border-amber-200",
  기타:   "bg-surface-tertiary text-content-secondary border-line",
};

const STATUS_VARIANT: Record<RoomStatus, "success" | "error" | "warning" | "default"> = {
  운영중: "success",
  점검중: "warning",
  고장:   "error",
  미사용: "default",
};

// --- 예약 슬롯 시각화 바 ---
const SlotBar = ({ slots }: { slots: Room["slots"] }) => {
  if (!slots || slots.length === 0) {
    return (
      <div className="flex items-center justify-center h-8 bg-surface-secondary rounded text-[11px] text-content-tertiary">
        점검 중 - 예약 불가
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-[2px] h-6">
        {slots.map(slot => {
          const bgClass =
            slot.ratio === 0   ? "bg-surface-tertiary" :
            slot.ratio < 0.5   ? "bg-state-success/40" :
            slot.ratio < 1.0   ? "bg-amber-300" :
            "bg-state-error/60";
          return (
            <div
              key={slot.hour}
              className={cn("flex-1 rounded-sm relative group cursor-default transition-all hover:scale-y-110", bgClass)}
              title={`${slot.hour}:00 - ${slot.label || Math.round(slot.ratio * 100) + "% 예약"}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-xs">
        <span className="text-[10px] text-content-tertiary">{slots[0]?.hour}:00</span>
        <span className="text-[10px] text-content-tertiary">{slots[slots.length - 1]?.hour}:00</span>
      </div>
    </div>
  );
};

// --- UI-111 룸 카드 ---
const RoomCard = ({
  room,
  onEdit,
  onDelete,
  onToggle,
}: {
  room: Room;
  onEdit: (room: Room) => void;
  onDelete: (room: Room) => void;
  onToggle: (id: number) => void;
}) => (
  <div className={cn(
    "bg-surface rounded-xl border shadow-xs overflow-hidden transition-all hover:shadow-md",
    room.status === "고장"   ? "border-state-error/40 bg-state-error/5" :
    room.status === "점검중" ? "border-amber-300/40 opacity-80" :
    "border-line"
  )}>
    {/* 카드 헤더 */}
    <div className={cn(
      "px-lg py-md border-b",
      room.status === "운영중" ? "border-line bg-surface" :
      room.status === "고장"   ? "border-state-error/20 bg-state-error/10" :
      "border-amber-200/40 bg-amber-50/50"
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-sm mb-xs">
            {/* 룸명 */}
            <h3 className="text-[15px] font-bold text-content">{room.name}</h3>
            {/* 유형 배지 */}
            <span className={cn("px-xs py-[2px] rounded text-[10px] font-bold border", ROOM_TYPE_STYLES[room.type])}>
              {room.type}
            </span>
          </div>
          <div className="flex items-center gap-md text-[12px] text-content-secondary">
            {/* 수용인원 */}
            <span className="flex items-center gap-xs">
              <Users size={12} /> {room.capacity}명
            </span>
            <span className="flex items-center gap-xs">
              <Clock size={12} /> {room.gate}
            </span>
          </div>
        </div>
        {/* 상태 + 토글 */}
        <div className="flex items-center gap-sm flex-shrink-0">
          <StatusBadge variant={STATUS_VARIANT[room.status]} label={room.status} dot />
          <button
            className="p-[5px] hover:bg-surface-secondary rounded-full transition-colors text-content-secondary"
            onClick={() => onToggle(room.id)}
            title="상태 전환"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>
    </div>

    {/* 설명 */}
    <div className="px-lg py-sm">
      <p className="text-[12px] text-content-secondary leading-relaxed">{room.description}</p>
    </div>

    {/* 예약 가능 시간대 슬롯 — 가로 바 시각화 */}
    <div className="px-lg pb-sm">
      <p className="text-[11px] font-semibold text-content-secondary mb-xs">오늘 예약 현황</p>
      <SlotBar slots={room.slots} />
    </div>

    {/* 범례 */}
    <div className="px-lg pb-sm flex items-center gap-md">
      <div className="flex items-center gap-xs">
        <div className="w-3 h-3 rounded-sm bg-state-success/40" />
        <span className="text-[10px] text-content-tertiary">여유</span>
      </div>
      <div className="flex items-center gap-xs">
        <div className="w-3 h-3 rounded-sm bg-amber-300" />
        <span className="text-[10px] text-content-tertiary">혼잡</span>
      </div>
      <div className="flex items-center gap-xs">
        <div className="w-3 h-3 rounded-sm bg-state-error/60" />
        <span className="text-[10px] text-content-tertiary">만석</span>
      </div>
    </div>

    {/* 액션 버튼 */}
    <div className="px-lg py-sm border-t border-line flex items-center justify-end gap-sm">
      <button
        className="p-[6px] hover:bg-state-info/10 rounded-lg text-state-info transition-colors"
        title="수정"
        onClick={() => onEdit(room)}
      >
        <Edit2 size={14} />
      </button>
      <button
        className="p-[6px] hover:bg-state-error/10 rounded-lg text-state-error transition-colors"
        title="삭제"
        onClick={() => onDelete(room)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  </div>
);

// --- UI-112 룸 등록 모달 ---
const RoomModal = ({
  room,
  onClose,
  onSave,
}: {
  room: Room | null;
  onClose: () => void;
  onSave: (data: { name: string; type: RoomType; capacity: number; description: string }) => void;
}) => {
  const [name,        setName]        = useState(room?.name        || "");
  const [type,        setType]        = useState<RoomType>(room?.type || "GX");
  const [capacity,    setCapacity]    = useState(room?.capacity    || 14);
  const [description, setDescription] = useState(room?.description || "");

  const isValid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="bg-surface rounded-xl w-full max-w-[500px] shadow-2xl animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="px-xl py-lg border-b border-line flex items-center justify-between">
          <h3 className="text-[16px] font-bold text-content">{room ? "운동룸 수정" : "새 운동룸 등록"}</h3>
          <button className="p-sm hover:bg-surface-secondary rounded-full transition-colors text-content-secondary" onClick={onClose}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-xl space-y-lg">
          {/* 룸명 (필수) */}
          <Input
            label="룸명 *"
            type="text"
            placeholder="예: GX룸 A, PT룸 1"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          {/* 유형 (GX/PT/기타) */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">
              룸 유형 <span className="text-state-error">*</span>
            </label>
            <div className="grid grid-cols-3 gap-sm">
              {(["GX", "PT", "스피닝", "필라테스", "기타"] as RoomType[]).map(t => (
                <button
                  key={t}
                  className={cn(
                    "py-sm rounded-lg text-[12px] font-semibold border-2 transition-all",
                    type === t
                      ? `${ROOM_TYPE_STYLES[t]} border-current`
                      : "bg-surface-secondary border-transparent text-content-secondary hover:border-line"
                  )}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 수용인원 */}
          <div>
            <label className="block text-[12px] font-semibold text-content-secondary mb-sm">수용인원</label>
            <div className="flex items-center gap-sm">
              <Input
                type="number"
                size="md"
                min={1}
                max={100}
                value={String(capacity)}
                onChange={e => setCapacity(Number(e.target.value))}
                className="w-28 text-center"
              />
              <span className="text-[13px] text-content-secondary">명</span>
              <div className="flex items-center gap-xs ml-sm">
                {[1, 2, 6, 10, 14, 16, 20, 22].map(n => (
                  <button
                    key={n}
                    className={cn(
                      "px-sm py-[3px] rounded text-[11px] font-semibold border transition-all",
                      capacity === n
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-secondary border-line text-content-secondary hover:border-primary hover:text-primary"
                    )}
                    onClick={() => setCapacity(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 설명 */}
          <div>
            <Textarea
              label="설명"
              placeholder="룸에 대한 설명을 입력하세요"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="h-20"
            />
          </div>
        </div>

        <div className="px-xl py-lg bg-surface-secondary flex gap-md">
          <button
            className="flex-1 h-11 rounded-lg border border-line text-content-secondary text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
            onClick={onClose}
          >취소</button>
          <button
            className={cn(
              "flex-1 h-11 rounded-lg text-[13px] font-bold shadow-sm transition-all",
              isValid ? "bg-primary text-white hover:opacity-90" : "bg-surface-tertiary text-content-tertiary cursor-not-allowed"
            )}
            disabled={!isValid}
            onClick={() => {
              if (!isValid) return;
              onSave({ name, type, capacity, description });
              onClose();
            }}
          >
            {room ? "수정 완료" : "등록하기"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- settings 저장/불러오기 헬퍼 ---
const SETTINGS_KEY = "room_management";
function getBranchId() { if (typeof window === "undefined") return "1"; return localStorage.getItem("branchId") || "1"; }
function getStorageKey() { return `settings_${getBranchId()}_${SETTINGS_KEY}`; }

async function loadRoomSettings(): Promise<Room[] | null> {
  const parsed = readBranchJson<Room[] | null>(SETTINGS_KEY, null, getBranchId());
  return Array.isArray(parsed) ? parsed : null;
}

async function saveRoomSettings(rooms: Room[]): Promise<boolean> {
  writeBranchJson(SETTINGS_KEY, rooms, getBranchId());
  return true;
}

export default function RoomManagement() {
  const [rooms,         setRooms]         = useState<Room[]>(INITIAL_ROOMS);
  const [activeTab,     setActiveTab]     = useState("cards");
  const [isRoomModal,   setRoomModal]     = useState(false);
  const [isDeleteOpen,  setDeleteOpen]    = useState(false);
  const [selectedRoom,  setSelectedRoom]  = useState<Room | null>(null);
  const [filterType,    setFilterType]    = useState<RoomType | "">("");
  const [loading,       setLoading]       = useState(true);

  // 초기 로딩: settings에서 데이터 조회
  useEffect(() => {
    (async () => {
      setLoading(true);
      const saved = await loadRoomSettings();
      if (saved) setRooms(saved);
      setLoading(false);
    })();
  }, []);

  // 룸 데이터 변경 시 자동 저장 (로딩 완료 후)
  const persistRooms = useCallback(async (newRooms: Room[]) => {
    const ok = await saveRoomSettings(newRooms);
    if (!ok) toast.error("저장에 실패했습니다. 로컬에 임시 저장되었습니다.");
  }, []);

  const filteredRooms = filterType ? rooms.filter(r => r.type === filterType) : rooms;
  const gxRooms = filteredRooms.filter(r => r.type === "GX");
  const ptRooms = filteredRooms.filter(r => r.type === "PT");

  const handleSave = (data: { name: string; type: RoomType; capacity: number; description: string }) => {
    let newRooms: Room[];
    if (selectedRoom) {
      newRooms = rooms.map(r => r.id === selectedRoom.id ? { ...r, ...data } : r);
    } else {
      const newRoom: Room = {
        id: Math.max(...rooms.map(r => r.id), 0) + 1,
        ...data,
        status: "운영중",
        gate: "-",
        slots: [],
      };
      newRooms = [...rooms, newRoom];
    }
    setRooms(newRooms);
    persistRooms(newRooms);
    toast.success(selectedRoom ? "운동룸이 수정되었습니다." : "운동룸이 등록되었습니다.");
  };

  const handleToggle = (id: number) => {
    const nextStatus = (s: RoomStatus): RoomStatus =>
      s === "운영중" ? "점검중" : s === "점검중" ? "고장" : "운영중";
    const newRooms = rooms.map(r =>
      r.id === id ? { ...r, status: nextStatus(r.status) } : r
    );
    setRooms(newRooms);
    persistRooms(newRooms);
  };

  const handleDelete = () => {
    if (!selectedRoom) return;
    const newRooms = rooms.filter(r => r.id !== selectedRoom.id);
    setRooms(newRooms);
    persistRooms(newRooms);
    toast.success("운동룸이 삭제되었습니다.");
    setDeleteOpen(false);
    setSelectedRoom(null);
  };

  const tabs = [
    { key: "cards",  label: "룸 카드 보기", icon: LayoutGrid },
    { key: "list",   label: "목록 보기",   icon: Grid },
  ];

  // 목록 뷰 컬럼
  const tableData = filteredRooms.map(r => ({
    ...r,
    capacityLabel: `${r.capacity}명`,
    typeLabel:     r.type,
  }));

  // 로딩 중 스켈레톤
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-xl animate-pulse">
          <div className="h-20 bg-surface rounded-xl border border-line" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface rounded-xl border border-line" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {[1,2].map(i => <div key={i} className="h-64 bg-surface rounded-xl border border-line" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="운동룸 관리"
          description="센터 내 운동룸의 현황, 예약 슬롯, 좌석 배치를 관리합니다."
          actions={
            <button
              className="flex items-center gap-sm bg-primary text-white px-md py-sm rounded-lg text-[13px] font-bold shadow-sm hover:opacity-90 transition-all"
              onClick={() => { setSelectedRoom(null); setRoomModal(true); }}
            >
              <Plus size={16} />
              새 운동룸 등록
            </button>
          }
        />

        {/* 통계 카드 */}
        <StatCardGrid cols={4}>
          <StatCard label="전체 운동룸"   value={rooms.length}                           icon={<Grid />} />
          <StatCard label="운영 중"       value={rooms.filter(r => r.status === "운영중").length} icon={<CheckCircle2 />} variant="mint" />
          <StatCard label="점검/고장/미사용" value={rooms.filter(r => r.status !== "운영중").length} icon={<XCircle />} variant="peach" />
          <StatCard label="GX룸 / PT룸"  value={`${rooms.filter(r => r.type === "GX").length} / ${rooms.filter(r => r.type === "PT").length}`} icon={<Users />} />
        </StatCardGrid>

        {/* 탭 + 필터 */}
        <div className="flex items-center justify-between">
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex items-center gap-sm">
            <Select
              value={filterType}
              onChange={v => setFilterType(v as RoomType | "")}
              options={[
                { value: "", label: "전체 유형" },
                ...( ["GX", "PT", "스피닝", "필라테스", "기타"] as RoomType[]).map(t => ({ value: t, label: t })),
              ]}
              className="w-40"
            />
          </div>
        </div>

        {/* UI-111 룸 카드 뷰 */}
        {activeTab === "cards" && (
          <div className="space-y-xl">
            {/* GX룸 섹션 */}
            {gxRooms.length > 0 && (
              <div>
                <h3 className="text-[14px] font-bold text-content mb-md flex items-center gap-sm">
                  <span className="w-2 h-2 rounded-full bg-state-info inline-block" />
                  GX룸 ({gxRooms.length}개)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {gxRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onEdit={r => { setSelectedRoom(r); setRoomModal(true); }}
                      onDelete={r => { setSelectedRoom(r); setDeleteOpen(true); }}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* PT룸 섹션 */}
            {ptRooms.length > 0 && (
              <div>
                <h3 className="text-[14px] font-bold text-content mb-md flex items-center gap-sm">
                  <span className="w-2 h-2 rounded-full bg-primary inline-block" />
                  PT룸 ({ptRooms.length}개)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                  {ptRooms.map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onEdit={r => { setSelectedRoom(r); setRoomModal(true); }}
                      onDelete={r => { setSelectedRoom(r); setDeleteOpen(true); }}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 기타 룸 */}
            {filteredRooms.filter(r => r.type !== "GX" && r.type !== "PT").length > 0 && (
              <div>
                <h3 className="text-[14px] font-bold text-content mb-md">기타 룸</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  {filteredRooms.filter(r => r.type !== "GX" && r.type !== "PT").map(room => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onEdit={r => { setSelectedRoom(r); setRoomModal(true); }}
                      onDelete={r => { setSelectedRoom(r); setDeleteOpen(true); }}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredRooms.length === 0 && (
              <div className="py-xxl flex flex-col items-center justify-center text-content-secondary border border-dashed border-line rounded-xl">
                <Grid className="mb-sm opacity-20" size={40} />
                <p className="text-[13px]">등록된 운동룸이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 목록 뷰 (간단 테이블) */}
        {activeTab === "list" && (
          <SimpleTable
            columns={[
              { key: 'name', header: '운동룸명', render: (v: string) => <span className="text-[13px] font-semibold text-content">{v}</span> },
              { key: 'type', header: '유형', render: (v: RoomType) => <span className={cn("px-sm py-[2px] rounded text-[11px] font-bold border", ROOM_TYPE_STYLES[v])}>{v}</span> },
              { key: 'capacity', header: '수용인원', render: (v: number) => <span className="text-[13px] text-content flex items-center gap-xs"><Users size={13} className="text-content-secondary" /> {v}명</span> },
              { key: 'gate', header: '게이트' },
              { key: 'status', header: '상태', render: (v: RoomStatus, row: Room) => (
                <div className="flex items-center gap-sm">
                  <StatusBadge variant={STATUS_VARIANT[v]} label={v} dot />
                  <button className="p-[4px] hover:bg-surface-secondary rounded transition-colors text-content-secondary" onClick={() => handleToggle(row.id)}><Settings size={13} /></button>
                </div>
              )},
              { key: 'actions', header: '메뉴', render: (_: unknown, row: Room) => (
                <div className="flex items-center gap-sm">
                  <button className="p-[5px] hover:bg-state-info/10 rounded text-state-info transition-colors" onClick={() => { setSelectedRoom(row); setRoomModal(true); }}><Edit2 size={14} /></button>
                  <button className="p-[5px] hover:bg-state-error/10 rounded text-state-error transition-colors" onClick={() => { setSelectedRoom(row); setDeleteOpen(true); }}><Trash2 size={14} /></button>
                </div>
              )},
            ]}
            data={filteredRooms}
          />
        )}
      </div>

      {/* UI-112 룸 등록/수정 모달 */}
      {isRoomModal && (
        <RoomModal
          room={selectedRoom}
          onClose={() => { setRoomModal(false); setSelectedRoom(null); }}
          onSave={handleSave}
        />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="운동룸 삭제"
        description={`"${selectedRoom?.name}"을(를) 삭제하시겠습니까?\n삭제된 정보는 복구할 수 없으며, 연결된 예약 정보에 영향을 줄 수 있습니다.`}
        confirmLabel="삭제"
        variant="danger"
        confirmationText="삭제"
        onConfirm={handleDelete}
        onCancel={() => { setDeleteOpen(false); setSelectedRoom(null); }}
      />
    </AppLayout>
  );
}
