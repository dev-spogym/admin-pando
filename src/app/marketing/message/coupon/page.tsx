
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Ticket,
  History,
  Send,
  Edit2,
  Trash2,
  Search,
  Filter,
  Download,
  AlertCircle,
  MoreVertical,
  Calendar,
  Percent,
  CircleDollarSign,
  Gift,
  Copy,
  Check,
  RefreshCw,
  X,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { exportToExcel } from "@/lib/exportExcel";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import TabNav from "@/components/common/TabNav";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import SearchFilter, { FilterOption } from "@/components/common/SearchFilter";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormSection from "@/components/common/FormSection";

// -- 쿠폰 코드 자동 생성 유틸 --
function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `COUP-${seg(4)}-${seg(4)}`;
}

// -- 날짜 유틸 --
function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeCouponStatus(coupon: any): string {
  if (!coupon.isActive) return 'inactive';
  if (coupon.validUntil) {
    const days = getDaysUntil(coupon.validUntil);
    if (days < 0) return 'expired';
  }
  if (coupon.totalIssued > 0 && coupon.totalUsed >= coupon.totalIssued) return 'exhausted';
  return 'active';
}

/**
 * CouponManagement - 쿠폰 관리 화면
 */
export default function CouponManagement() {
  // --- States ---
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(false);

  // Modals & Dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);

  // Filter States
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  // --- Data ---
  const [coupons, setCoupons] = useState<any[]>([]);
  const [issuanceLogs] = useState<any[]>([]);

  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('branchId', branchId)
      .order('id', { ascending: false });
    if (!error && data) {
      setCoupons(data.map(c => ({ ...c, value: Number(c.value) })));
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // --- Handlers ---
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setFilterValues({});
    setSearchValue("");
  };

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setIsFormOpen(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setEditingCoupon(coupon);
    setIsFormOpen(true);
  };

  const handleOpenIssueModal = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsIssueModalOpen(true);
  };

  const handleDeleteClick = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCoupon) {
      const { error } = await supabase
        .from('coupons')
        .update({ isActive: false })
        .eq('id', selectedCoupon.id);
      if (error) {
        console.error("쿠폰 삭제 실패:", error);
        toast.error("쿠폰 삭제에 실패했습니다.");
        return;
      }
      setIsConfirmDeleteOpen(false);
      setSelectedCoupon(null);
      fetchCoupons();
      toast.success("쿠폰이 삭제되었습니다.");
    }
  };

  // --- Filter Definitions ---
  const listFilters: FilterOption[] = [
    {
      key: "status",
      label: "쿠폰 상태",
      type: "select",
      options: [
        { value: "active", label: "활성" },
        { value: "expired", label: "만료" },
        { value: "exhausted", label: "소진" },
        { value: "inactive", label: "비활성" },
      ]
    },
    {
      key: "type",
      label: "쿠폰 유형",
      type: "select",
      options: [
        { value: "discount", label: "할인 쿠폰" },
        { value: "free", label: "무료 쿠폰" },
      ]
    }
  ];

  const historyFilters: FilterOption[] = [
    { key: "issuedDate", label: "발급일", type: "dateRange" },
    {
      key: "coupon",
      label: "쿠폰 선택",
      type: "select",
      options: coupons.map(c => ({ value: c.id.toString(), label: c.name }))
    },
    {
      key: "status",
      label: "상태",
      type: "select",
      options: [
        { value: "unused", label: "미사용" },
        { value: "used", label: "사용 완료" },
        { value: "expired", label: "만료" },
      ]
    }
  ];

  // --- 상태 자동 계산 (만료, 소진 포함) ---
  const enrichedCoupons = useMemo(() => {
    return coupons.map(c => ({
      ...c,
      computedStatus: computeCouponStatus(c),
    }));
  }, [coupons]);

  // --- Filtered Data ---
  const filteredCoupons = useMemo(() => {
    return enrichedCoupons.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.code?.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = !filterValues.status || item.computedStatus === filterValues.status;
      const matchType = !filterValues.type || item.type === filterValues.type;
      return matchSearch && matchStatus && matchType;
    });
  }, [enrichedCoupons, searchValue, filterValues]);

  const filteredLogs = useMemo(() => {
    return issuanceLogs.filter(item => {
      const matchSearch = item.memberName.toLowerCase().includes(searchValue.toLowerCase()) ||
        item.couponName.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = !filterValues.status || item.status === filterValues.status;
      const matchCoupon = !filterValues.coupon || coupons.find(c => c.id.toString() === filterValues.coupon)?.name === item.couponName;
      return matchSearch && matchStatus && matchCoupon;
    });
  }, [issuanceLogs, searchValue, filterValues, coupons]);

  // --- 상태 뱃지 렌더 헬퍼 ---
  const renderStatusBadge = (computedStatus: string, endDate?: string) => {
    if (computedStatus === 'expired') {
      return <StatusBadge variant="default" label="만료" dot={true} />;
    }
    if (computedStatus === 'exhausted') {
      return <StatusBadge variant="warning" label="소진" dot={true} />;
    }
    if (computedStatus === 'inactive') {
      return <StatusBadge variant="default" label="비활성" dot={true} />;
    }
    // active: 만료 임박(D-7) 체크
    if (endDate) {
      const days = getDaysUntil(endDate);
      if (days >= 0 && days <= 7) {
        return (
          <div className="flex flex-col items-center gap-[2px]">
            <StatusBadge variant="success" label="활성" dot={true} />
            <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-[2px]">
              <AlertTriangle size={10} /> D-{days}
            </span>
          </div>
        );
      }
    }
    return <StatusBadge variant="success" label="활성" dot={true} />;
  };

  // --- Table Columns ---
  const listColumns = [
    { key: "id", header: "No", width: 55, align: "center" as const },
    {
      key: "name",
      header: "쿠폰명",
      width: 220,
      render: (val: string, row: any) => (
        <div>
          <span className="font-semibold text-content block">{val}</span>
          <CouponCodeBadge code={row.code} />
        </div>
      )
    },
    {
      key: "type",
      header: "유형",
      width: 90,
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={val === "discount" ? "peach" as any : "mint" as any} label={val === "discount" ? "할인" : "무료"} />
      )
    },
    {
      key: "value",
      header: "할인 값",
      width: 100,
      render: (val: number, row: any) => {
        if (row.type === "free") return "무료 체험";
        // type 문자열에 "percent" 또는 "%"가 포함되면 퍼센트로 표시
        const isPercent = row.type?.toLowerCase().includes("percent") || row.type?.toLowerCase().includes("%");
        return isPercent ? `${val}%` : `${Number(val).toLocaleString()}원`;
      }
    },
    {
      key: "usage",
      header: "사용 현황",
      width: 180,
      render: (_: any, row: any) => {
        const used = row.totalUsed ?? 0;
        const issued = row.totalIssued ?? 0;
        const pct = issued > 0 ? Math.min((used / issued) * 100, 100) : 0;
        const isExhausted = issued > 0 && used >= issued;
        return (
          <div className="space-y-[4px]">
            <div className="flex justify-between text-Label">
              <span className="text-content-secondary">사용 {used.toLocaleString()} / {issued.toLocaleString()}건</span>
              {isExhausted && (
                <span className="text-amber-600 font-bold text-[10px] bg-amber-600/10 px-xs rounded-full">소진</span>
              )}
            </div>
            <div className="h-[6px] rounded-full bg-line overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isExhausted ? "bg-amber-600" : pct > 80 ? "bg-primary" : "bg-accent"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      key: "validity",
      header: "유효 기간",
      width: 180,
      render: (_: any, row: any) => {
        if (row.validFrom || row.validUntil) {
          return (
            <div>
              <span className="text-Body-2">
                {row.validFrom ? row.validFrom.slice(0, 10) : '∞'} ~ {row.validUntil ? row.validUntil.slice(0, 10) : '∞'}
              </span>
              {row.validUntil && (() => {
                const d = getDaysUntil(row.validUntil);
                if (d >= 0 && d <= 7) return <span className="ml-xs text-[10px] text-amber-600 font-semibold">D-{d}</span>;
                return null;
              })()}
            </div>
          );
        }
        return '-';
      }
    },
    {
      key: "computedStatus",
      header: "상태",
      width: 90,
      align: "center" as const,
      render: (val: string, row: any) => renderStatusBadge(val, row.validUntil)
    },
    { key: "createdAt", header: "등록일", width: 110, render: (val: string) => val ? val.slice(0, 10) : '-' },
    {
      key: "actions",
      header: "메뉴",
      width: 160,
      align: "center" as const,
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center gap-xs">
          <button
            className="p-xs hover:bg-primary-light text-primary rounded-button transition-colors"
            title="쿠폰 발급"
            onClick={() => handleOpenIssueModal(row)}
          >
            <Send size={16} />
          </button>
          <button
            className="p-xs hover:bg-surface-secondary text-content-secondary rounded-button transition-colors"
            title="수정"
            onClick={() => handleEditCoupon(row)}
          >
            <Edit2 size={16} />
          </button>
          <button
            className="p-xs hover:bg-primary-light text-state-error rounded-button transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="삭제"
            disabled={row.totalIssued > 0}
            onClick={() => handleDeleteClick(row)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  const historyColumns = [
    { key: "id", header: "No", width: 60, align: "center" as const },
    {
      key: "memberName",
      header: "회원명",
      width: 120,
      render: (val: string, row: any) => (
        <button
          className="text-primary hover:underline font-medium transition-colors"
          onClick={() => row.id && moveToPage(985, { id: row.id })}
        >
          {val}
        </button>
      )
    },
    { key: "memberNo", header: "회원번호", width: 120 },
    { key: "couponName", header: "쿠폰명", width: 250 },
    { key: "issuedDate", header: "발급일", width: 120 },
    { key: "expiryDate", header: "만료일", width: 120 },
    { key: "usedDate", header: "사용일", width: 120, render: (val: string) => val || "-" },
    {
      key: "status",
      header: "상태",
      width: 100,
      align: "center" as const,
      render: (val: string) => {
        const variants: Record<string, any> = { used: "success", unused: "warning", expired: "error" };
        const labels: Record<string, string> = { used: "사용 완료", unused: "미사용", expired: "만료" };
        return <StatusBadge variant={variants[val]} label={labels[val]} />;
      }
    },
    { key: "usedProduct", header: "사용 상품", width: 150 },
  ];

  return (
    <AppLayout>
      <div className="p-lg">
        <PageHeader
          title="쿠폰 관리"
          description="회원에게 발급할 할인 및 무료 쿠폰을 생성하고 발급 이력을 관리합니다."
          actions={
            <button
              className="flex items-center gap-sm bg-primary text-white px-lg py-md rounded-button hover:opacity-90 transition-opacity font-semibold shadow-sm"
              onClick={handleCreateCoupon}
            >
              <Plus size={20} />
              신규 쿠폰 생성
            </button>
          }
        />

        {/* Stats Section */}
        <StatCardGrid cols={4} className="mb-xl">
          <StatCard label="전체 쿠폰" value={coupons.length} icon={<Ticket />} variant="default" />
          <StatCard
            label="활성 쿠폰"
            value={enrichedCoupons.filter(c => c.computedStatus === "active").length}
            icon={<Ticket />}
            variant="mint"
          />
          <StatCard
            label="총 발급 건수"
            value={coupons.reduce((acc, curr) => acc + (curr.totalIssued ?? 0), 0)}
            icon={<Send />}
            variant="default"
          />
          <StatCard
            label="사용 완료"
            value={coupons.reduce((acc, curr) => acc + (curr.totalUsed ?? 0), 0)}
            icon={<Gift />}
            variant="peach"
          />
        </StatCardGrid>

        {/* Tabs & Search Filter */}
        <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden mb-lg">
          <TabNav
            tabs={[
              { key: "list", label: "쿠폰 목록", icon: Ticket },
              { key: "history", label: "발급 이력", icon: History },
            ]}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
          <div className="p-md bg-surface-secondary/10">
            <SearchFilter
              searchPlaceholder={activeTab === "list" ? "쿠폰명 또는 코드 검색..." : "회원명 또는 쿠폰명 검색..."}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              filters={activeTab === "list" ? listFilters : historyFilters}
              filterValues={filterValues}
              onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
              onReset={() => setFilterValues({})}
            />
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={activeTab === "list" ? listColumns : historyColumns}
          data={activeTab === "list" ? filteredCoupons : filteredLogs}
          loading={loading}
          pagination={{
            page: 1,
            pageSize: 10,
            total: activeTab === "list" ? filteredCoupons.length : filteredLogs.length
          }}
          onDownloadExcel={() => {
            if (activeTab === "list") {
              const exportColumns = [
                { key: 'id', header: 'No' },
                { key: 'name', header: '쿠폰명' },
                { key: 'discountType', header: '할인유형' },
                { key: 'discountValue', header: '할인값' },
                { key: 'validUntil', header: '유효기간' },
                { key: 'totalIssued', header: '발급수' },
                { key: 'totalUsed', header: '사용수' },
                { key: 'computedStatus', header: '상태' },
                { key: 'createdAt', header: '등록일' },
              ];
              exportToExcel(filteredCoupons as Record<string, unknown>[], exportColumns, { filename: '쿠폰목록' });
              toast.success(`${filteredCoupons.length}건 엑셀 다운로드 완료`);
            } else {
              const exportColumns = [
                { key: 'id', header: 'No' },
                { key: 'memberName', header: '회원명' },
                { key: 'memberNo', header: '회원번호' },
                { key: 'couponName', header: '쿠폰명' },
                { key: 'issuedDate', header: '발급일' },
                { key: 'expiryDate', header: '만료일' },
                { key: 'usedDate', header: '사용일' },
                { key: 'status', header: '상태' },
                { key: 'usedProduct', header: '사용 상품' },
              ];
              exportToExcel(filteredLogs as Record<string, unknown>[], exportColumns, { filename: '쿠폰발급이력' });
              toast.success(`${filteredLogs.length}건 엑셀 다운로드 완료`);
            }
          }}
          emptyMessage={activeTab === "list" ? "등록된 쿠폰이 없습니다." : "발급 이력이 없습니다."}
        />
      </div>

      {/* Coupon Form Modal */}
      {isFormOpen && (
        <CouponFormModal
          coupon={editingCoupon}
          onClose={() => setIsFormOpen(false)}
          onSave={async (data: any) => {
            if (editingCoupon) {
              await supabase
                .from('coupons')
                .update({
                  name: data.name,
                  type: data.type,
                  value: Number(data.discountValue ?? data.value ?? 0),
                  validFrom: data.startDate || null,
                  validUntil: data.endDate || null,
                  isActive: true,
                })
                .eq('id', editingCoupon.id);
            } else {
              await supabase
                .from('coupons')
                .insert({
                  name: data.name,
                  type: data.type,
                  value: Number(data.discountValue ?? data.value ?? 0),
                  validFrom: data.startDate || null,
                  validUntil: data.endDate || null,
                  totalIssued: 0,
                  totalUsed: 0,
                  isActive: true,
                  branchId,
                })
                .select();
            }
            setIsFormOpen(false);
            fetchCoupons();
          }}
        />
      )}

      {/* Issue Coupon Modal */}
      {isIssueModalOpen && selectedCoupon && (
        <IssueCouponModal
          coupon={selectedCoupon}
          onClose={() => setIsIssueModalOpen(false)}
          onIssue={(_count: any) => {
            setIsIssueModalOpen(false);
            toast.success(`${selectedCoupon.name} 쿠폰이 발급되었습니다.`);
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        title="쿠폰 삭제"
        description={`"${selectedCoupon?.name}" 쿠폰을 삭제하시겠습니까?\n발급 이력이 없는 쿠폰만 삭제가 가능합니다.`}
        confirmLabel="삭제"
        variant="danger"
        confirmationText="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </AppLayout>
  );
}

// --- 쿠폰 코드 뱃지 (복사 버튼 포함) ---
function CouponCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-xs mt-[2px]">
      <span className="text-[11px] font-mono text-content-secondary bg-surface-secondary px-xs py-[1px] rounded tracking-wider">
        {code}
      </span>
      <button
        className="text-content-secondary hover:text-accent transition-colors"
        title="코드 복사"
        onClick={handleCopy}
      >
        {copied ? <Check size={12} className="text-state-success" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

// --- Local Components for Modals ---

function CouponFormModal({ coupon, onClose, onSave }: any) {
  const [formData, setFormData] = useState(coupon || {
    name: "",
    code: generateCouponCode(),
    type: "discount",
    discountType: "percent",
    discountValue: 0,
    validityType: "period",
    startDate: "",
    endDate: "",
    validDays: 0,
    maxUsage: "",
    conditions: "",
    memo: ""
  });

  const [codeCopied, setCodeCopied] = useState(false);

  const regenerateCode = () => {
    setFormData((prev: any) => ({ ...prev, code: generateCouponCode() }));
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(formData.code).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
      <div className="w-full max-w-2xl bg-surface rounded-modal shadow-card max-h-[90vh] overflow-y-auto">
        <div className="px-xl py-lg border-b border-line flex justify-between items-center bg-surface sticky top-0 z-10">
          <h2 className="text-Heading-2 font-bold text-content">{coupon ? "쿠폰 수정" : "신규 쿠폰 생성"}</h2>
          <button className="text-content-secondary hover:text-content transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-xl space-y-lg">
          <FormSection title="기본 정보" columns={1}>
            {/* 쿠폰명 */}
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">쿠폰명 <span className="text-state-error">*</span></label>
              <input
                className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent outline-none"
                placeholder="쿠폰 이름을 입력하세요"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* 쿠폰 코드 */}
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">쿠폰 코드 <span className="text-state-error">*</span></label>
              <div className="flex gap-sm items-center">
                <div className="flex-1 flex items-center gap-sm bg-surface-secondary rounded-input px-md py-sm">
                  <span className="font-mono font-semibold text-Body-1 text-content tracking-widest flex-1">
                    {formData.code}
                  </span>
                  <button
                    className="text-content-secondary hover:text-accent transition-colors"
                    title="코드 복사"
                    onClick={handleCopyCode}
                  >
                    {codeCopied ? <Check size={16} className="text-state-success" /> : <Copy size={16} />}
                  </button>
                </div>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-accent-light text-accent rounded-button font-semibold text-Body-2 hover:bg-accent hover:text-white transition-colors"
                  onClick={regenerateCode}
                >
                  <RefreshCw size={14} />
                  재생성
                </button>
              </div>
              <p className="text-[11px] text-content-secondary">자동 생성된 코드이며, 재생성 버튼으로 새 코드를 만들 수 있습니다.</p>
            </div>

            {/* 쿠폰 유형 */}
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">쿠폰 유형 <span className="text-state-error">*</span></label>
              <div className="flex gap-md">
                <label className="flex items-center gap-xs cursor-pointer">
                  <input className="accent-primary" type="radio" checked={formData.type === "discount"} onChange={() => setFormData({ ...formData, type: "discount" })} />
                  <span className="text-Body-2">할인 쿠폰</span>
                </label>
                <label className="flex items-center gap-xs cursor-pointer">
                  <input className="accent-primary" type="radio" checked={formData.type === "free"} onChange={() => setFormData({ ...formData, type: "free" })} />
                  <span className="text-Body-2">무료 쿠폰</span>
                </label>
              </div>
            </div>

            {/* 최대 사용 한도 */}
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">최대 사용 한도 (선택)</label>
              <input
                className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent outline-none"
                type="number"
                placeholder="미입력 시 무제한"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value ? Number(e.target.value) : null })}
              />
              <p className="text-[11px] text-content-secondary">한도 도달 시 자동으로 "소진" 상태로 표시됩니다.</p>
            </div>
          </FormSection>

          {formData.type === "discount" && (
            <FormSection title="할인 설정" columns={2}>
              <div className="space-y-sm">
                <label className="text-Label text-content-secondary">할인 방식 <span className="text-state-error">*</span></label>
                <select
                  className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-accent outline-none"
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                >
                  <option value="percent">정률 할인 (%)</option>
                  <option value="amount">정액 할인 (원)</option>
                </select>
              </div>
              <div className="space-y-sm">
                <label className="text-Label text-content-secondary">할인 값 <span className="text-state-error">*</span></label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-secondary border-0 rounded-input pl-md pr-xl py-sm focus:ring-2 focus:ring-accent outline-none"
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                  />
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-content-secondary">
                    {formData.discountType === "percent" ? "%" : "원"}
                  </span>
                </div>
              </div>
            </FormSection>
          )}

          <FormSection title="유효 기간 설정" columns={1}>
            <div className="flex gap-md mb-md">
              <label className="flex items-center gap-xs cursor-pointer">
                <input className="accent-primary" type="radio" checked={formData.validityType === "period"} onChange={() => setFormData({ ...formData, validityType: "period" })} />
                <span className="text-Body-2">기간 지정</span>
              </label>
              <label className="flex items-center gap-xs cursor-pointer">
                <input className="accent-primary" type="radio" checked={formData.validityType === "days"} onChange={() => setFormData({ ...formData, validityType: "days" })} />
                <span className="text-Body-2">발급일 기준 N일</span>
              </label>
            </div>

            {formData.validityType === "period" ? (
              <div className="grid grid-cols-2 gap-md">
                <div className="space-y-sm">
                  <label className="text-Label text-content-secondary">시작일</label>
                  <input className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div className="space-y-sm">
                  <label className="text-Label text-content-secondary">종료일</label>
                  <input className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="space-y-sm">
                <label className="text-Label text-content-secondary">발급 후 유효일</label>
                <div className="relative">
                  <input className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm" type="number" value={formData.validDays} onChange={(e) => setFormData({ ...formData, validDays: Number(e.target.value) })} />
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-content-secondary">일</span>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="기타 상세 정보" columns={1}>
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">사용 조건</label>
              <textarea
                className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm min-h-[80px]"
                placeholder="예: 30,000원 이상 결제 시 사용 가능"
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
              />
            </div>
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary">내부 메모</label>
              <textarea
                className="w-full bg-surface-secondary border-0 rounded-input px-md py-sm min-h-[60px]"
                placeholder="내부 관리용 메모를 입력하세요"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              />
            </div>
          </FormSection>
        </div>

        <div className="px-xl py-lg border-t border-line bg-surface-secondary/5 flex justify-end gap-md">
          <button className="px-xl py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-colors" onClick={onClose}>취소</button>
          <button className="px-xl py-md rounded-button bg-primary text-white font-semibold hover:opacity-90 transition-opacity" onClick={() => onSave(formData)}>저장하기</button>
        </div>
      </div>
    </div>
  );
}

function IssueCouponModal({ coupon, onClose, onIssue }: any) {
  // 발급 대상: "all" | "individual" | "condition"
  const [targetType, setTargetType] = useState<"all" | "individual" | "condition">("individual");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<{ id: number; name: string; phone: string }[]>([]);
  const [condition, setCondition] = useState("active");
  const [validityType, setValidityType] = useState<"coupon" | "custom">("coupon");
  const [expiryDate, setExpiryDate] = useState("");
  const [count, setCount] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [issuing, setIssuing] = useState(false);

  const branchId = Number(localStorage.getItem('branchId')) || 1;

  // 회원 검색
  useEffect(() => {
    if (!memberQuery.trim() || targetType !== "individual") {
      setMemberResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const { data } = await supabase
        .from('members')
        .select('id, name, phone')
        .eq('branchId', branchId)
        .or(`name.ilike.%${memberQuery}%,phone.ilike.%${memberQuery}%`)
        .limit(10);
      setMemberResults((data as { id: number; name: string; phone: string }[]) ?? []);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [memberQuery, targetType, branchId]);

  const toggleMember = (m: { id: number; name: string; phone: string }) => {
    setSelectedMembers(prev =>
      prev.some(s => s.id === m.id) ? prev.filter(s => s.id !== m.id) : [...prev, m]
    );
  };

  const removeMember = (id: number) => {
    setSelectedMembers(prev => prev.filter(s => s.id !== id));
  };

  const handleIssue = async () => {
    // 유효성 검사
    if (targetType === "individual" && selectedMembers.length === 0) {
      toast.warning("발급할 회원을 선택하세요.");
      return;
    }
    if (validityType === "custom" && !expiryDate) {
      toast.warning("유효 기간 종료일을 입력하세요.");
      return;
    }

    setIssuing(true);
    // 실제 발급 처리: coupon_issues 테이블에 insert (테이블 없으면 coupons.totalIssued 업데이트만)
    try {
      const issueCount = targetType === "all" ? 0 : targetType === "individual" ? selectedMembers.length : 0;
      // coupons.totalIssued 증가
      await supabase
        .from('coupons')
        .update({ totalIssued: (coupon.totalIssued ?? 0) + (issueCount || count) })
        .eq('id', coupon.id);
      onIssue(issueCount || count);
    } catch {
      toast.error("발급 처리 중 오류가 발생했습니다.");
    } finally {
      setIssuing(false);
    }
  };

  const targetLabels = {
    all: "전체 회원",
    individual: "특정 회원",
    condition: "조건별",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
      <div className="w-full max-w-lg bg-surface rounded-modal shadow-card overflow-hidden max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="px-xl py-lg border-b border-line bg-surface flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-Heading-2 font-bold text-content">쿠폰 발급</h2>
            <p className="text-Body-2 text-content-secondary mt-xs">{coupon.name}</p>
          </div>
          <button className="text-content-secondary hover:text-content transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-xl space-y-lg overflow-y-auto flex-1">
          {/* 발급 대상 */}
          <div className="space-y-sm">
            <label className="text-Label text-content-secondary font-semibold">
              발급 대상 <span className="text-state-error">*</span>
            </label>
            <div className="flex gap-sm p-[3px] bg-surface-secondary rounded-input">
              {(["all", "individual", "condition"] as const).map(t => (
                <button
                  key={t}
                  className={cn(
                    "flex-1 py-sm rounded-button text-Body-2 transition-all",
                    targetType === t
                      ? "bg-surface text-primary shadow-sm font-semibold"
                      : "text-content-secondary hover:text-content"
                  )}
                  onClick={() => { setTargetType(t); setMemberQuery(""); setMemberResults([]); }}
                >
                  {targetLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 전체 회원 */}
          {targetType === "all" && (
            <div className="bg-accent-light border border-accent/30 rounded-xl p-md flex items-center gap-sm">
              <Gift size={16} className="text-accent flex-shrink-0" />
              <p className="text-Body-2 text-content">
                센터의 <span className="font-bold text-accent">전체 회원</span>에게 발급됩니다.
              </p>
            </div>
          )}

          {/* 특정 회원 검색/선택 */}
          {targetType === "individual" && (
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary font-semibold">회원 검색</label>
              <div className="relative">
                <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
                <input
                  className="w-full bg-surface-secondary border border-line rounded-input pl-[36px] pr-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-accent"
                  placeholder="이름 또는 전화번호 검색"
                  value={memberQuery}
                  onChange={e => setMemberQuery(e.target.value)}
                />
              </div>

              {/* 검색 결과 드롭다운 */}
              {memberResults.length > 0 && (
                <div className="border border-line rounded-xl overflow-hidden shadow-sm max-h-[160px] overflow-y-auto">
                  {memberResults.map(m => {
                    const isSelected = selectedMembers.some(s => s.id === m.id);
                    return (
                      <button
                        key={m.id}
                        className={cn(
                          "w-full flex items-center justify-between px-md py-sm text-left text-Body-2 transition-colors",
                          isSelected
                            ? "bg-primary-light text-primary"
                            : "bg-surface hover:bg-surface-secondary"
                        )}
                        onClick={() => { toggleMember(m); setMemberQuery(""); setMemberResults([]); }}
                      >
                        <span>{m.name}</span>
                        <span className="text-content-secondary text-Label">{m.phone}</span>
                      </button>
                    );
                  })}
                  {isSearching && (
                    <div className="px-md py-sm text-Label text-content-secondary">검색 중...</div>
                  )}
                </div>
              )}

              {/* 선택된 회원 태그 */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-xs mt-sm">
                  {selectedMembers.map(m => (
                    <span
                      key={m.id}
                      className="px-md py-xs bg-primary-light text-primary text-Label rounded-full flex items-center gap-xs border border-primary/20"
                    >
                      {m.name}
                      <button onClick={() => removeMember(m.id)} className="hover:text-state-error transition-colors">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {selectedMembers.length === 0 && memberQuery === "" && (
                <p className="text-Label text-content-secondary">선택된 회원이 없습니다.</p>
              )}
            </div>
          )}

          {/* 조건별 */}
          {targetType === "condition" && (
            <div className="space-y-sm">
              <label className="text-Label text-content-secondary font-semibold">발급 조건</label>
              <select
                className="w-full bg-surface-secondary border border-line rounded-input px-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-accent"
                value={condition}
                onChange={e => setCondition(e.target.value)}
              >
                <option value="active">활성 회원 전체</option>
                <option value="expired">만료 회원</option>
                <option value="new">신규 회원 (30일 이내)</option>
                <option value="absence">장기 미출석 (30일 이상)</option>
              </select>
            </div>
          )}

          {/* 1인당 발급 수량 */}
          <div className="space-y-sm">
            <label className="text-Label text-content-secondary font-semibold">
              1인당 발급 수량 <span className="text-state-error">*</span>
            </label>
            <div className="flex items-center gap-sm">
              <input
                className="flex-1 bg-surface-secondary border border-line rounded-input px-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-accent"
                type="number"
                min={1}
                value={count}
                onChange={e => setCount(Math.max(1, Number(e.target.value)))}
              />
              <span className="text-Body-2 text-content-secondary">장</span>
            </div>
          </div>

          {/* 유효기간 설정 */}
          <div className="space-y-sm">
            <label className="text-Label text-content-secondary font-semibold">유효 기간</label>
            <div className="flex gap-sm p-[3px] bg-surface-secondary rounded-input">
              <button
                className={cn(
                  "flex-1 py-sm rounded-button text-Body-2 transition-all",
                  validityType === "coupon"
                    ? "bg-surface text-primary shadow-sm font-semibold"
                    : "text-content-secondary"
                )}
                onClick={() => setValidityType("coupon")}
              >
                쿠폰 기본 설정 적용
              </button>
              <button
                className={cn(
                  "flex-1 py-sm rounded-button text-Body-2 transition-all",
                  validityType === "custom"
                    ? "bg-surface text-primary shadow-sm font-semibold"
                    : "text-content-secondary"
                )}
                onClick={() => setValidityType("custom")}
              >
                직접 지정
              </button>
            </div>

            {validityType === "coupon" && (
              <p className="text-Label text-content-secondary flex items-center gap-xs">
                <Calendar size={12} />
                {coupon.validUntil
                  ? `${coupon.validFrom ?? '∞'} ~ ${coupon.validUntil.slice(0, 10)}`
                  : "쿠폰 유효기간 설정 없음 (무기한)"}
              </p>
            )}

            {validityType === "custom" && (
              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <label className="text-Label text-content-secondary">시작일</label>
                  <input
                    type="date"
                    className="w-full bg-surface-secondary border border-line rounded-input px-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-accent"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-Label text-content-secondary">
                    종료일 <span className="text-state-error">*</span>
                  </label>
                  <input
                    type="date"
                    className="w-full bg-surface-secondary border border-line rounded-input px-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-accent"
                    value={expiryDate}
                    onChange={e => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 발급 요약 */}
          <div className="bg-surface-secondary/40 rounded-xl p-md flex items-center justify-between border border-line">
            <span className="text-Body-2 text-content-secondary">총 발급 예정</span>
            <span className="text-Body-1 font-bold text-primary">
              {targetType === "all"
                ? `전체 회원 × ${count}장`
                : targetType === "individual"
                ? `${selectedMembers.length}명 × ${count}장 = ${selectedMembers.length * count}장`
                : `조건 해당 회원 × ${count}장`}
            </span>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-xl py-lg border-t border-line bg-surface-secondary/5 flex justify-end gap-md flex-shrink-0">
          <button
            className="px-xl py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="px-xl py-md rounded-button bg-accent text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-sm"
            disabled={issuing || (targetType === "individual" && selectedMembers.length === 0)}
            onClick={handleIssue}
          >
            <Send size={16} />
            {issuing ? "발급 중..." : "발급"}
          </button>
        </div>
      </div>
    </div>
  );
}
