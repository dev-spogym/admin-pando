// 상세내역 탭 — 홀딩/연장/양도/쿠폰/마일리지 서브탭
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { Plus, X, Pause, Play, ArrowRightLeft, Tag, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ── 타입 ────────────────────────────────────────────────────────
type HoldingRecord = {
  id: number;
  productId?: number | null;
  productName: string | null;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  status: string | null; // ACTIVE | CANCELLED
  createdByName: string | null;
  createdAt: string | null;
};

type ExtensionRecord = {
  id: number;
  productName: string | null;
  extraDays: number | null;
  originalEndDate: string | null;
  newEndDate: string | null;
  reason: string | null;
  createdByName: string | null;
  createdAt: string | null;
};

type TransferRecord = {
  id: number;
  fromMemberName: string | null;
  toMemberName: string | null;
  productName: string | null;
  reason: string | null;
  createdByName: string | null;
  createdAt: string | null;
};

type CouponRecord = {
  id: number;
  couponCode: string | null;
  couponName: string | null;
  discountAmount: number | null;
  usedAt: string | null;
  status: string | null;
};

type MileageRecord = {
  id: number;
  type: string | null; // EARN | USE
  amount: number | null;
  reason: string | null;
  createdAt: string | null;
};

interface Props {
  memberId: string;
  memberName: string;
}

// ── 서브탭 목록 ─────────────────────────────────────────────────
const SUB_TABS = [
  { key: "holding", label: "홀딩", icon: Pause },
  { key: "extension", label: "연장", icon: Play },
  { key: "transfer", label: "양도", icon: ArrowRightLeft },
  { key: "coupon", label: "쿠폰", icon: Tag },
  { key: "mileage", label: "마일리지", icon: Coins },
];

// ── 홀딩 탭 ─────────────────────────────────────────────────────
function TabHolding({ memberId, memberName }: { memberId: string; memberName: string }) {
  const authUser = useAuthStore(s => s.user);
  const [records, setRecords] = useState<HoldingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [form, setForm] = useState({
    productName: "",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("member_holdings")
      .select("*")
      .eq("memberId", memberId)
      .order("createdAt", { ascending: false });
    if (data) setRecords(data as HoldingRecord[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [memberId]);

  const handleAdd = async () => {
    if (!form.productName || !form.startDate || !form.endDate) {
      toast.error("상품명, 시작일, 종료일을 입력해주세요.");
      return;
    }
    const { error } = await supabase.from("member_holdings").insert({
      memberId: Number(memberId),
      productName: form.productName,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: "ACTIVE",
      createdBy: authUser?.id,
      createdByName: authUser?.name || "관리자",
    });
    if (error) { toast.error(`홀딩 등록 실패: ${error.message}`); return; }
    toast.success("홀딩이 등록되었습니다.");
    setShowModal(false);
    setForm({ productName: "", startDate: new Date().toISOString().slice(0, 10), endDate: "", reason: "" });
    load();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    const { error } = await supabase
      .from("member_holdings")
      .update({ status: "CANCELLED" })
      .eq("id", cancelId);
    if (error) { toast.error(`홀딩 취소 실패: ${error.message}`); return; }
    toast.success("홀딩이 취소되었습니다.");
    setCancelId(null);
    load();
  };

  const columns = [
    { key: "productName", header: "상품명", render: (v: string) => <span className="font-medium">{v || "-"}</span> },
    { key: "startDate", header: "시작일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "endDate", header: "종료일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "reason", header: "사유", render: (v: string) => <span className="text-[12px] text-content-secondary">{v || "-"}</span> },
    { key: "createdByName", header: "등록자", render: (v: string) => <span className="text-[12px]">{v || "-"}</span> },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => (
        <StatusBadge variant={v === "ACTIVE" ? "info" : "default"}>{v === "ACTIVE" ? "홀딩중" : "취소됨"}</StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: HoldingRecord) =>
        row.status === "ACTIVE" ? (
          <button
            className="text-[11px] px-sm py-xs rounded border border-state-error/40 text-state-error hover:bg-red-50 transition-colors"
            onClick={() => setCancelId(row.id)}
          >
            홀딩취소
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-md">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-xs px-md py-sm bg-state-info text-white rounded-button text-[13px] font-semibold hover:opacity-90 transition-all"
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} /> 홀딩하기
        </button>
      </div>
      <DataTable
        title="홀딩 이력"
        columns={columns}
        data={records}
        emptyMessage="홀딩 이력이 없습니다."
      />
      <ConfirmDialog
        open={cancelId !== null}
        title="홀딩 취소"
        description="해당 홀딩을 취소하시겠습니까?"
        confirmLabel="취소 처리"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelId(null)}
      />
      {/* 홀딩 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[420px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title font-bold text-content">홀딩 등록</h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {[
                { key: "productName", label: "상품명", type: "text", placeholder: "예: 3개월 회원권" },
                { key: "startDate", label: "홀딩 시작일", type: "date", placeholder: "" },
                { key: "endDate", label: "홀딩 종료일", type: "date", placeholder: "" },
                { key: "reason", label: "사유 (선택)", type: "text", placeholder: "예: 부상, 출장" },
              ].map(f => (
                <div key={f.key} className="space-y-xs">
                  <label className="text-[13px] font-semibold text-content">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-md py-sm border border-line rounded-input bg-surface-secondary text-[13px] focus:border-primary outline-none"
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary" onClick={() => setShowModal(false)}>취소</button>
              <button className="px-lg py-sm bg-state-info text-white rounded-button text-[13px] font-bold hover:opacity-90" onClick={handleAdd}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 연장 탭 ─────────────────────────────────────────────────────
function TabExtension({ memberId }: { memberId: string }) {
  const authUser = useAuthStore(s => s.user);
  const [records, setRecords] = useState<ExtensionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    productName: "",
    extraDays: "7",
    originalEndDate: "",
    newEndDate: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("member_extensions")
      .select("*")
      .eq("memberId", memberId)
      .order("createdAt", { ascending: false });
    if (data) setRecords(data as ExtensionRecord[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [memberId]);

  const handleAdd = async () => {
    if (!form.productName || !form.extraDays || !form.originalEndDate || !form.newEndDate) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    const { error } = await supabase.from("member_extensions").insert({
      memberId: Number(memberId),
      productName: form.productName,
      extraDays: Number(form.extraDays),
      originalEndDate: form.originalEndDate,
      newEndDate: form.newEndDate,
      reason: form.reason,
      createdBy: authUser?.id,
      createdByName: authUser?.name || "관리자",
    });
    if (error) { toast.error(`연장 등록 실패: ${error.message}`); return; }
    toast.success("연장이 등록되었습니다.");
    setShowModal(false);
    setForm({ productName: "", extraDays: "7", originalEndDate: "", newEndDate: "", reason: "" });
    load();
  };

  const columns = [
    { key: "productName", header: "상품명", render: (v: string) => <span className="font-medium">{v || "-"}</span> },
    { key: "extraDays", header: "연장 일수", align: "center" as const, render: (v: number) => <span className="font-bold text-primary">{v}일</span> },
    { key: "originalEndDate", header: "기존 종료일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "newEndDate", header: "변경 종료일", render: (v: string) => <span className="font-mono text-[12px] text-state-success font-semibold">{v ? v.slice(0, 10) : "-"}</span> },
    { key: "reason", header: "사유", render: (v: string) => <span className="text-[12px] text-content-secondary">{v || "-"}</span> },
    { key: "createdByName", header: "처리자", render: (v: string) => <span className="text-[12px]">{v || "-"}</span> },
    { key: "createdAt", header: "처리일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
  ];

  return (
    <div className="space-y-md">
      <div className="flex justify-end">
        <button
          className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-[13px] font-semibold hover:opacity-90 transition-all"
          onClick={() => setShowModal(true)}
        >
          <Plus size={14} /> 연장하기
        </button>
      </div>
      <DataTable title="연장 이력" columns={columns} data={records} emptyMessage="연장 이력이 없습니다." />
      {/* 연장 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[420px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title font-bold text-content">연장 등록</h2>
              <button className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-md">
              {[
                { key: "productName", label: "상품명", type: "text", placeholder: "예: 3개월 회원권" },
                { key: "extraDays", label: "연장 일수", type: "number", placeholder: "예: 7" },
                { key: "originalEndDate", label: "기존 종료일", type: "date", placeholder: "" },
                { key: "newEndDate", label: "변경 종료일", type: "date", placeholder: "" },
                { key: "reason", label: "사유 (선택)", type: "text", placeholder: "예: 운영 오류 보상" },
              ].map(f => (
                <div key={f.key} className="space-y-xs">
                  <label className="text-[13px] font-semibold text-content">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full px-md py-sm border border-line rounded-input bg-surface-secondary text-[13px] focus:border-primary outline-none"
                    value={form[f.key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-sm px-lg py-md border-t border-line">
              <button className="px-lg py-sm border border-line text-content-secondary rounded-button text-[13px] hover:bg-surface-secondary" onClick={() => setShowModal(false)}>취소</button>
              <button className="px-lg py-sm bg-primary text-white rounded-button text-[13px] font-bold hover:opacity-90" onClick={handleAdd}>등록</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 양도 탭 ─────────────────────────────────────────────────────
function TabTransfer({ memberId }: { memberId: string }) {
  const [records, setRecords] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("member_transfer_logs")
        .select("*")
        .or(`fromMemberId.eq.${memberId},toMemberId.eq.${memberId}`)
        .order("createdAt", { ascending: false });
      if (data) setRecords(data as TransferRecord[]);
      setLoading(false);
    };
    load();
  }, [memberId]);

  const columns = [
    { key: "productName", header: "상품명", render: (v: string) => <span className="font-medium">{v || "-"}</span> },
    { key: "fromMemberName", header: "양도인", render: (v: string) => <span className="text-[12px]">{v || "-"}</span> },
    { key: "toMemberName", header: "양수인", render: (v: string) => <span className="text-[12px] text-primary font-semibold">{v || "-"}</span> },
    { key: "reason", header: "사유", render: (v: string) => <span className="text-[12px] text-content-secondary">{v || "-"}</span> },
    { key: "createdByName", header: "처리자", render: (v: string) => <span className="text-[12px]">{v || "-"}</span> },
    { key: "createdAt", header: "처리일", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span> },
  ];

  return (
    <DataTable title="양도 이력" columns={columns} data={records} emptyMessage="양도 이력이 없습니다." />
  );
}

// ── 쿠폰 탭 (조회 전용) ──────────────────────────────────────────
function TabCoupon({ memberId }: { memberId: string }) {
  const [records, setRecords] = useState<CouponRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("member_coupons")
        .select("*")
        .eq("memberId", memberId)
        .order("usedAt", { ascending: false });
      if (data) setRecords(data as CouponRecord[]);
    };
    load();
  }, [memberId]);

  const columns = [
    { key: "couponCode", header: "쿠폰코드", render: (v: string) => <span className="font-mono text-[12px]">{v || "-"}</span> },
    { key: "couponName", header: "쿠폰명", render: (v: string) => <span className="font-medium">{v || "-"}</span> },
    {
      key: "discountAmount",
      header: "할인금액",
      align: "right" as const,
      render: (v: number) => <span className="font-bold text-orange-500">{v ? `${Number(v).toLocaleString()}원` : "-"}</span>,
    },
    { key: "usedAt", header: "사용일시", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 16).replace("T", " ") : "-"}</span> },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => <StatusBadge variant={v === "USED" ? "default" : "success"}>{v === "USED" ? "사용됨" : "미사용"}</StatusBadge>,
    },
  ];

  return (
    <DataTable title="쿠폰 이력" columns={columns} data={records} emptyMessage="쿠폰 이력이 없습니다." />
  );
}

// ── 마일리지 탭 ──────────────────────────────────────────────────
function TabMileageHistory({ memberId }: { memberId: string }) {
  const [records, setRecords] = useState<MileageRecord[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("member_mileage_logs")
        .select("*")
        .eq("memberId", memberId)
        .order("createdAt", { ascending: false });
      if (data) setRecords(data as MileageRecord[]);
    };
    load();
  }, [memberId]);

  const totalEarned = records.filter(r => r.type === "EARN").reduce((acc, r) => acc + Number(r.amount), 0);
  const totalUsed = records.filter(r => r.type === "USE").reduce((acc, r) => acc + Number(r.amount), 0);
  const balance = totalEarned - totalUsed;

  const columns = [
    {
      key: "type",
      header: "구분",
      align: "center" as const,
      render: (v: string) => (
        <StatusBadge variant={v === "EARN" ? "success" : "warning"}>{v === "EARN" ? "적립" : "사용"}</StatusBadge>
      ),
    },
    {
      key: "amount",
      header: "포인트",
      align: "right" as const,
      render: (v: number, row: MileageRecord) => (
        <span className={cn("font-bold", row.type === "EARN" ? "text-state-success" : "text-state-warning")}>
          {row.type === "EARN" ? "+" : "-"}{Number(v).toLocaleString()}P
        </span>
      ),
    },
    { key: "reason", header: "사유", render: (v: string) => <span className="text-[12px] text-content-secondary">{v || "-"}</span> },
    { key: "createdAt", header: "일시", render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 16).replace("T", " ") : "-"}</span> },
  ];

  return (
    <div className="space-y-md">
      <div className="grid grid-cols-3 gap-md">
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">누적 적립</p>
          <p className="text-[20px] font-bold text-state-success">{totalEarned.toLocaleString()}P</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">누적 사용</p>
          <p className="text-[20px] font-bold text-state-warning">{totalUsed.toLocaleString()}P</p>
        </div>
        <div className="bg-surface rounded-xl border border-line p-md text-center">
          <p className="text-[11px] text-content-secondary mb-xs">현재 잔액</p>
          <p className="text-[20px] font-bold text-primary">{balance.toLocaleString()}P</p>
        </div>
      </div>
      <DataTable title="마일리지 이력" columns={columns} data={records} emptyMessage="마일리지 이력이 없습니다." />
    </div>
  );
}

// ── 메인 컴포넌트 ────────────────────────────────────────────────
export default function TabDetailHistory({ memberId, memberName }: Props) {
  const [subTab, setSubTab] = useState("holding");

  return (
    <div className="space-y-lg">
      {/* 서브탭 네비게이션 */}
      <div className="flex gap-xs border-b border-line overflow-x-auto pb-0">
        {SUB_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className={cn(
                "flex items-center gap-xs px-md py-sm text-[13px] font-medium whitespace-nowrap border-b-2 -mb-[1px] transition-colors",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-content-secondary hover:text-content hover:border-line"
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 서브탭 콘텐츠 */}
      {subTab === "holding" && <TabHolding memberId={memberId} memberName={memberName} />}
      {subTab === "extension" && <TabExtension memberId={memberId} />}
      {subTab === "transfer" && <TabTransfer memberId={memberId} />}
      {subTab === "coupon" && <TabCoupon memberId={memberId} />}
      {subTab === "mileage" && <TabMileageHistory memberId={memberId} />}
    </div>
  );
}
