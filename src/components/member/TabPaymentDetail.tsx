// 결제내역 탭 — BROJ CRM 스타일 (통계카드 + 상세 테이블)
import React, { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/StatusBadge";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import ConfirmDialog from "@/components/ConfirmDialog";
import { CreditCard, Receipt, AlertCircle, RefreshCcw } from "lucide-react";

type SaleRecord = {
  id: number;
  saleDate: string | null;
  itemName: string | null;
  productName?: string | null;
  type?: string | null;
  amount: number;
  salePrice: number;
  originalPrice: number;
  discountPrice: number;
  cash: number;
  card: number;
  mileageUsed: number;
  unpaid: number;
  paymentMethod: string | null;
  status: string | null;
};

interface Props {
  sales: SaleRecord[];
  memberId: string | null;
  memberName: string;
  onRefresh?: () => void;
}

export default function TabPaymentDetail({ sales, memberId, memberName, onRefresh }: Props) {
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<SaleRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<SaleRecord | null>(null);
  const PAGE_SIZE = 10;
  const paged = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // 통계 계산
  const totalCount = sales.filter(s => s.status !== 'REFUNDED' && Number(s.salePrice) > 0).length;
  const totalAmount = sales
    .filter(s => s.status !== 'REFUNDED' && Number(s.salePrice) > 0)
    .reduce((acc, s) => acc + Number(s.salePrice), 0);
  const totalUnpaid = sales.reduce((acc, s) => acc + Number(s.unpaid), 0);
  const totalRefund = sales
    .filter(s => s.status === 'REFUNDED' || Number(s.salePrice) < 0)
    .reduce((acc, s) => acc + Math.abs(Number(s.salePrice)), 0);

  // 분류 레이블 매핑
  const typeLabel = (type?: string | null) => {
    const map: Record<string, string> = {
      MEMBERSHIP: "회원권",
      PT: "수강권",
      LOCKER: "락커",
      GENERAL: "일반",
      환불: "환불",
    };
    return map[type ?? ""] || type || "-";
  };

  const columns = [
    {
      key: "saleDate",
      header: "결제일",
      render: (v: string) => <span className="font-mono text-[12px]">{v ? v.slice(0, 10) : "-"}</span>,
    },
    {
      key: "itemName",
      header: "품목",
      render: (v: string, row: SaleRecord) => (
        <span className="text-[13px] font-medium">{row.productName || v || "-"}</span>
      ),
    },
    {
      key: "type",
      header: "분류",
      align: "center" as const,
      render: (v: string) => <span className="text-[12px] text-content-secondary">{typeLabel(v)}</span>,
    },
    {
      key: "originalPrice",
      header: "정가",
      align: "right" as const,
      render: (v: number) => <span className="text-[12px] text-content-secondary">{Number(v).toLocaleString()}원</span>,
    },
    {
      key: "salePrice",
      header: "판매금액",
      align: "right" as const,
      render: (v: number) => (
        <span className={`text-[13px] font-bold ${Number(v) < 0 ? "text-state-error" : "text-content"}`}>
          {Number(v).toLocaleString()}원
        </span>
      ),
    },
    {
      key: "discountPrice",
      header: "할인금액",
      align: "right" as const,
      render: (v: number) => (
        <span className="text-[12px] text-orange-500">
          {Number(v) > 0 ? `-${Number(v).toLocaleString()}원` : "-"}
        </span>
      ),
    },
    {
      key: "unpaid",
      header: "미수금",
      align: "right" as const,
      render: (v: number) => (
        <span className={`text-[12px] font-semibold ${Number(v) > 0 ? "text-state-error" : "text-content-secondary"}`}>
          {Number(v) > 0 ? `${Number(v).toLocaleString()}원` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (v: string) => (
        <StatusBadge variant={v === "REFUNDED" ? "error" : "success"} dot>
          {v === "REFUNDED" ? "환불" : "완료"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "관리",
      align: "center" as const,
      render: (_: unknown, row: SaleRecord) => (
        <div className="flex items-center justify-center gap-xs">
          <button
            className="text-[11px] px-sm py-xs rounded border border-line text-content-secondary hover:bg-surface-secondary transition-colors"
            onClick={() => setDetailTarget(row)}
          >
            상세
          </button>
          {row.status !== "REFUNDED" && Number(row.salePrice) > 0 && (
            <button
              className="text-[11px] px-sm py-xs rounded border border-state-error/40 text-state-error hover:bg-red-50 transition-colors"
              onClick={() => setRefundTarget(row)}
            >
              환불
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-lg">
      {/* 통계 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard
          label="누적 결제건수"
          value={`${totalCount}건`}
          icon={<Receipt size={20} />}
          variant="default"
        />
        <StatCard
          label="누적 결제금액"
          value={`${totalAmount.toLocaleString()}원`}
          icon={<CreditCard size={20} />}
          variant="mint"
        />
        <StatCard
          label="미수금"
          value={`${totalUnpaid.toLocaleString()}원`}
          icon={<AlertCircle size={20} />}
          variant={totalUnpaid > 0 ? "peach" : "default"}
        />
        <StatCard
          label="환불금액"
          value={`${totalRefund.toLocaleString()}원`}
          icon={<RefreshCcw size={20} />}
          variant="default"
        />
      </div>

      {/* 결제 테이블 */}
      <DataTable
        title="결제 이력"
        columns={columns}
        data={paged}
        pagination={{ page, pageSize: PAGE_SIZE, total: sales.length }}
        onPageChange={setPage}
        emptyMessage="결제 이력이 없습니다."
      />

      {/* 환불 확인 다이얼로그 */}
      <ConfirmDialog
        open={refundTarget !== null}
        title="환불 처리"
        description={`[${refundTarget?.productName || refundTarget?.itemName}] ${Number(refundTarget?.salePrice).toLocaleString()}원 결제 건을 환불 처리하시겠습니까?`}
        confirmLabel="환불 처리"
        variant="danger"
        onConfirm={async () => {
          if (!refundTarget) return;
          const { error } = await supabase.from("sale").insert({
            branchId: Number(localStorage.getItem("branchId") || "1"),
            memberId: Number(memberId),
            memberName,
            productName: refundTarget.productName || refundTarget.itemName,
            type: "환불",
            amount: -Math.abs(Number(refundTarget.salePrice)),
            salePrice: -Math.abs(Number(refundTarget.salePrice)),
            originalPrice: Number(refundTarget.originalPrice),
            discountPrice: 0,
            paymentMethod: (refundTarget.paymentMethod as "CARD" | "CASH" | "TRANSFER" | "MILEAGE") ?? "CARD",
            status: "REFUNDED",
            saleDate: new Date().toISOString(),
            memo: `환불: ${refundTarget.productName || refundTarget.itemName}`,
          });
          if (error) {
            toast.error(`환불 처리 실패: ${error.message}`);
            return;
          }
          await supabase.from("sale").update({ status: "REFUNDED" }).eq("id", refundTarget.id);
          toast.success("환불 처리가 완료되었습니다.");
          setRefundTarget(null);
          onRefresh?.();
        }}
        onCancel={() => setRefundTarget(null)}
      />

      {/* 결제 상세 모달 */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[400px] mx-md overflow-hidden">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title text-content font-bold">결제 상세</h2>
              <button
                className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                onClick={() => setDetailTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-sm">
              {[
                { label: "상품명", value: detailTarget.productName || detailTarget.itemName || "-" },
                { label: "분류", value: typeLabel(detailTarget.type) },
                { label: "결제일", value: detailTarget.saleDate ? detailTarget.saleDate.slice(0, 10) : "-" },
                { label: "정가", value: `${Number(detailTarget.originalPrice).toLocaleString()}원` },
                { label: "할인금액", value: `${Number(detailTarget.discountPrice).toLocaleString()}원` },
                { label: "결제금액", value: `${Number(detailTarget.salePrice).toLocaleString()}원` },
                { label: "카드", value: `${Number(detailTarget.card).toLocaleString()}원` },
                { label: "현금", value: `${Number(detailTarget.cash).toLocaleString()}원` },
                { label: "미수금", value: `${Number(detailTarget.unpaid).toLocaleString()}원` },
                { label: "결제방법", value: detailTarget.paymentMethod || "-" },
                { label: "상태", value: detailTarget.status === "REFUNDED" ? "환불" : "완료" },
              ].map(item => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-xs border-b border-line last:border-0"
                >
                  <span className="text-[13px] text-content-secondary">{item.label}</span>
                  <span className="text-[13px] font-semibold text-content">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="px-lg py-md border-t border-line flex justify-end">
              <button
                className="px-lg py-sm bg-surface-secondary text-content rounded-button text-[13px] font-medium hover:bg-surface-tertiary transition-colors"
                onClick={() => setDetailTarget(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
