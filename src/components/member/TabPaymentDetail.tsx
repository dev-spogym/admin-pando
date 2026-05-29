// 결제내역 탭 — BROJ CRM 스타일 (통계카드 + 상세 테이블)
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import StatusBadge from "@/components/common/StatusBadge";
import StatCard from "@/components/common/StatCard";
import DataTable from "@/components/common/DataTable";
import { CreditCard, Receipt, AlertCircle, RefreshCcw } from "lucide-react";

type SaleRecord = {
  id: number;
  saleDate: string | null;
  itemName: string | null;
  productName?: string | null;
  type?: string | null;
  paymentType?: string | null;
  saleCategory?: string | null;
  approvalNo?: string | null;
  memo?: string | null;
  staffName?: string | null;
  cardCompany?: string | null;
  cardNumber?: string | null;
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

type PaymentLine = {
  id: number;
  saleId: number;
  productName: string;
  method: string;
  amount: number;
  refundedAmount: number;
  approvalNo: string | null;
  terminalId: string | null;
  externalTransactionId: string | null;
  bankPayerName: string | null;
  transferConfirmNo: string | null;
  cashReceiptIssued: boolean | null;
  cashReceiptType: string | null;
  cashReceiptIdentifier: string | null;
  memo: string | null;
  lineType: string | null;
};

const METHOD_KO: Record<string, string> = {
  CARD: "카드",
  CASH: "현금",
  TRANSFER: "계좌이체",
  MILEAGE: "포인트",
  MIXED: "혼합결제",
};

const isRefundHistoryRow = (row: SaleRecord) => {
  const status = String(row.status ?? "").trim().toUpperCase();
  const text = [
    row.status,
    row.type,
    row.paymentType,
    row.saleCategory,
  ].map((value) => String(value ?? ""));

  return status.startsWith("REFUND")
    || status === "REFUNDED"
    || text.some((value) => value.includes("환불") || value.includes("취소"));
};

const isRefundablePaymentRow = (row: SaleRecord) => {
  const status = String(row.status ?? "").trim();
  const statusKey = status.toUpperCase();

  if (Number(row.salePrice) <= 0) return false;
  if (isRefundHistoryRow(row)) return false;
  if (statusKey === "UNPAID" || statusKey === "PENDING" || status.includes("미납") || status.includes("대기")) return false;
  if (status && statusKey !== "COMPLETED" && status !== "완료") return false;

  return true;
};

const formatKRW = (value: number) => `${Number(value || 0).toLocaleString()}원`;

const fallbackInternalApprovalNo = (sale: SaleRecord) => {
  const memoMatch = String(sale.memo ?? "").match(/CRM 내부 승인번호:\s*([^\n]+)/);
  if (memoMatch?.[1]) return memoMatch[1].trim();
  return sale.approvalNo || `SALE-${sale.id}`;
};

const extractReceiptUrl = (memo?: string | null) => {
  const match = String(memo ?? "").match(/영수증:\s*.+?\((https?:\/\/[^)\s]+)\)/);
  return match?.[1] ?? null;
};

export default function TabPaymentDetail({ sales }: Props) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [detailTarget, setDetailTarget] = useState<SaleRecord | null>(null);
  const [paymentLinesBySaleId, setPaymentLinesBySaleId] = useState<Record<number, PaymentLine[]>>({});
  const PAGE_SIZE = 10;
  const paged = sales.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const saleIds = sales.map((sale) => sale.id).filter((id) => Number.isFinite(id));
    if (saleIds.length === 0) {
      setPaymentLinesBySaleId({});
      return;
    }

    let cancelled = false;

    const fetchPaymentLines = async () => {
      const { data, error } = await supabase
        .from("sale_payment_lines")
        .select("id, saleId, productName, method, amount, refundedAmount, approvalNo, terminalId, externalTransactionId, bankPayerName, transferConfirmNo, cashReceiptIssued, cashReceiptType, cashReceiptIdentifier, memo, lineType")
        .in("saleId", saleIds)
        .order("id", { ascending: true });

      if (cancelled) return;

      if (error) {
        console.warn("상품별 수납 행 조회 실패:", error.message);
        setPaymentLinesBySaleId({});
        return;
      }

      const grouped = (data ?? []).reduce<Record<number, PaymentLine[]>>((acc, row: Record<string, unknown>) => {
        const saleId = Number(row.saleId);
        if (!Number.isFinite(saleId)) return acc;
        const line: PaymentLine = {
          id: Number(row.id),
          saleId,
          productName: String(row.productName ?? "상품 미지정"),
          method: String(row.method ?? "CARD"),
          amount: Number(row.amount) || 0,
          refundedAmount: Number(row.refundedAmount) || 0,
          approvalNo: row.approvalNo == null ? null : String(row.approvalNo),
          terminalId: row.terminalId == null ? null : String(row.terminalId),
          externalTransactionId: row.externalTransactionId == null ? null : String(row.externalTransactionId),
          bankPayerName: row.bankPayerName == null ? null : String(row.bankPayerName),
          transferConfirmNo: row.transferConfirmNo == null ? null : String(row.transferConfirmNo),
          cashReceiptIssued: row.cashReceiptIssued == null ? null : Boolean(row.cashReceiptIssued),
          cashReceiptType: row.cashReceiptType == null ? null : String(row.cashReceiptType),
          cashReceiptIdentifier: row.cashReceiptIdentifier == null ? null : String(row.cashReceiptIdentifier),
          memo: row.memo == null ? null : String(row.memo),
          lineType: row.lineType == null ? null : String(row.lineType),
        };
        acc[saleId] = [...(acc[saleId] ?? []), line];
        return acc;
      }, {});

      setPaymentLinesBySaleId(grouped);
    };

    fetchPaymentLines();

    return () => {
      cancelled = true;
    };
  }, [sales]);

  const detailPaymentLines = useMemo(() => {
    if (!detailTarget) return [];
    const lines = paymentLinesBySaleId[detailTarget.id] ?? [];
    if (lines.length > 0) return lines;

    const fallbackLines = [
      { method: "CARD", amount: Number(detailTarget.card) || 0, productName: "카드 수납" },
      { method: "CASH", amount: Number(detailTarget.cash) || 0, productName: "현금/계좌 수납" },
      { method: "MILEAGE", amount: Number(detailTarget.mileageUsed) || 0, productName: "포인트 사용" },
    ].filter((line) => line.amount > 0);

    const baseLines = fallbackLines.length > 0
      ? fallbackLines
      : [{ method: detailTarget.paymentMethod || "CARD", amount: Number(detailTarget.salePrice) || 0, productName: detailTarget.productName || detailTarget.itemName || "상품 미지정" }];

    return baseLines.map((line, index): PaymentLine => ({
      id: -index - 1,
      saleId: detailTarget.id,
      productName: line.productName,
      method: line.method,
      amount: line.amount,
      refundedAmount: 0,
      approvalNo: detailTarget.approvalNo ?? null,
      terminalId: null,
      externalTransactionId: null,
      bankPayerName: null,
      transferConfirmNo: null,
      cashReceiptIssued: null,
      cashReceiptType: null,
      cashReceiptIdentifier: null,
      memo: null,
      lineType: "PAYMENT",
    }));
  }, [detailTarget, paymentLinesBySaleId]);

  const detailReceiptUrl = useMemo(() => {
    if (!detailTarget) return null;
    return extractReceiptUrl(detailTarget.memo);
  }, [detailTarget]);

  // 통계 계산
  const totalCount = sales.filter(isRefundablePaymentRow).length;
  const totalAmount = sales
    .filter(isRefundablePaymentRow)
    .reduce((acc, s) => acc + Number(s.salePrice), 0);
  const totalUnpaid = sales.reduce((acc, s) => acc + Number(s.unpaid), 0);
  const totalRefund = sales
    .filter(s => isRefundHistoryRow(s) || Number(s.salePrice) < 0)
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
      key: "approvalNo",
      header: "내부 승인번호",
      render: (_: string, row: SaleRecord) => (
        <span className="font-mono text-[12px] text-blue-700">{fallbackInternalApprovalNo(row)}</span>
      ),
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
        <StatusBadge variant={String(v).startsWith("REFUND") || v === "REFUNDED" ? "error" : v === "UNPAID" ? "warning" : "success"} dot>
          {String(v).startsWith("REFUND") || v === "REFUNDED" ? "환불" : v === "UNPAID" ? "미납" : "완료"}
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
          {isRefundablePaymentRow(row) && (
            <button
              className="text-[11px] px-sm py-xs rounded border border-state-error/40 text-state-error hover:bg-red-50 transition-colors"
              onClick={() => router.push(`/sales/cancel-refund?saleId=${row.id}`)}
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

      {/* 결제 상세 모달 */}
      {detailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface rounded-xl border border-line shadow-lg w-full max-w-[780px] mx-md max-h-[86vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-lg py-md border-b border-line">
              <h2 className="text-Section-Title text-content font-bold">결제 상세</h2>
              <button
                className="p-xs rounded-full hover:bg-surface-secondary text-content-secondary transition-colors"
                onClick={() => setDetailTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-lg space-y-lg overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-lg gap-y-xs">
                {[
                  { label: "CRM 내부 승인번호", value: fallbackInternalApprovalNo(detailTarget) },
                  { label: "결제번호", value: `SALE-${detailTarget.id}` },
                  { label: "상품명", value: detailTarget.productName || detailTarget.itemName || "-" },
                  { label: "분류", value: typeLabel(detailTarget.type) },
                  { label: "결제일", value: detailTarget.saleDate ? detailTarget.saleDate.slice(0, 10) : "-" },
                  { label: "판매 담당자", value: detailTarget.staffName || "-" },
                  { label: "정가", value: formatKRW(Number(detailTarget.originalPrice)) },
                  { label: "할인금액", value: formatKRW(Number(detailTarget.discountPrice)) },
                  { label: "포인트 사용", value: formatKRW(Number(detailTarget.mileageUsed)) },
                  { label: "실결제 금액", value: formatKRW(Number(detailTarget.salePrice)) },
                  { label: "카드", value: formatKRW(Number(detailTarget.card)) },
                  { label: "현금/계좌", value: formatKRW(Number(detailTarget.cash)) },
                  { label: "미수잔액", value: formatKRW(Number(detailTarget.unpaid)) },
                  { label: "결제방법", value: METHOD_KO[detailTarget.paymentMethod ?? ""] ?? detailTarget.paymentMethod ?? "-" },
                  { label: "상태", value: isRefundHistoryRow(detailTarget) ? "환불" : detailTarget.status === "UNPAID" ? "미납" : "완료" },
                ].map(item => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-md py-xs border-b border-line last:border-0"
                  >
                    <span className="text-[13px] text-content-secondary">{item.label}</span>
                    <span className="text-[13px] font-semibold text-content text-right">{item.value}</span>
                  </div>
                ))}
              </div>

              {detailReceiptUrl && (
                <div className="rounded-lg border border-line bg-surface-secondary px-md py-sm text-[13px]">
                  <span className="text-content-secondary">영수증 첨부</span>
                  <a
                    className="ml-sm font-semibold text-primary underline underline-offset-2"
                    href={detailReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    보기
                  </a>
                </div>
              )}

              <div className="space-y-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14px] font-bold text-content">상품별 수납 행</h3>
                  <span className="text-[12px] text-content-secondary">
                    {detailPaymentLines.length}개 행
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[720px] border-collapse text-[12px]">
                    <thead className="bg-surface-secondary text-content-secondary">
                      <tr>
                        <th className="px-sm py-sm text-left font-semibold">상품명</th>
                        <th className="px-sm py-sm text-center font-semibold">결제수단</th>
                        <th className="px-sm py-sm text-right font-semibold">수납금액</th>
                        <th className="px-sm py-sm text-right font-semibold">기환불액</th>
                        <th className="px-sm py-sm text-left font-semibold">승인/확인번호</th>
                        <th className="px-sm py-sm text-left font-semibold">현금영수증</th>
                        <th className="px-sm py-sm text-left font-semibold">영수증</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {detailPaymentLines.map((line) => {
                        const confirmNo = line.approvalNo || line.transferConfirmNo || line.externalTransactionId || "-";
                        const cashReceipt = line.cashReceiptIssued
                          ? [line.cashReceiptType, line.cashReceiptIdentifier].filter(Boolean).join(" / ") || "발행"
                          : line.method === "CASH" || line.method === "TRANSFER" ? "미발행/미입력" : "-";

                        return (
                          <tr key={line.id} className="bg-surface">
                            <td className="px-sm py-sm text-content">{line.productName}</td>
                            <td className="px-sm py-sm text-center text-content-secondary">{METHOD_KO[line.method] ?? line.method}</td>
                            <td className="px-sm py-sm text-right font-semibold text-content">{formatKRW(line.amount)}</td>
                            <td className="px-sm py-sm text-right text-state-error">{line.refundedAmount > 0 ? formatKRW(line.refundedAmount) : "-"}</td>
                            <td className="px-sm py-sm text-content-secondary">
                              <div>{confirmNo}</div>
                              {line.terminalId && <div className="text-[11px] text-content-tertiary">단말 {line.terminalId}</div>}
                              {line.bankPayerName && <div className="text-[11px] text-content-tertiary">입금자 {line.bankPayerName}</div>}
                            </td>
                            <td className="px-sm py-sm text-content-secondary">{cashReceipt}</td>
                            <td className="px-sm py-sm">
                              {detailReceiptUrl ? (
                                <a className="text-primary underline underline-offset-2" href={detailReceiptUrl} target="_blank" rel="noreferrer">
                                  보기
                                </a>
                              ) : (
                                <span className="text-content-tertiary">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
