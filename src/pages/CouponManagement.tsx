
import React, { useState, useMemo } from "react";
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
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import SearchFilter, { FilterOption } from "@/components/SearchFilter";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import FormSection from "@/components/FormSection";

/**
 * CouponManagement - 쿠폰 관리 화면
 * 
 * 회원에게 발급할 쿠폰을 생성·관리하고 발급 이력을 조회하는 화면입니다.
 * 할인 쿠폰과 무료 쿠폰을 지원하며, 개인/그룹 발급 및 만료일 설정이 가능합니다.
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

  // --- Mock Data ---
  const [coupons, setCoupons] = useState([
    {
      id: 1,
      name: "신규 회원 가입 10% 할인",
      type: "discount",
      discountType: "percent",
      discountValue: 10,
      issuedCount: 150,
      usedCount: 85,
      remainingCount: 65,
      validityType: "period",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      status: "active",
      createdAt: "2025-12-20",
    },
    {
      id: 2,
      name: "여름맞이 PT 1회 체험권",
      type: "free",
      discountType: "fixed",
      discountValue: 0,
      issuedCount: 50,
      usedCount: 12,
      remainingCount: 38,
      validityType: "days",
      validDays: 30,
      status: "active",
      createdAt: "2026-02-10",
    },
    {
      id: 3,
      name: "VIP 재등록 5만원 할인",
      type: "discount",
      discountType: "amount",
      discountValue: 50000,
      issuedCount: 20,
      usedCount: 20,
      remainingCount: 0,
      validityType: "period",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      status: "expired",
      createdAt: "2025-12-28",
    },
    {
      id: 4,
      name: "지인 추천 1주일 이용권",
      type: "free",
      discountValue: 0,
      issuedCount: 100,
      usedCount: 45,
      remainingCount: 55,
      validityType: "days",
      validDays: 14,
      status: "inactive",
      createdAt: "2026-01-15",
    }
  ]);

  const [issuanceLogs, setIssuanceLogs] = useState([
    {
      id: 101,
      memberName: "김철수",
      memberNo: "M2024-0012",
      couponName: "신규 회원 가입 10% 할인",
      issuedDate: "2026-02-15",
      expiryDate: "2026-12-31",
      usedDate: "2026-02-18",
      status: "used",
      usedProduct: "헬스 12개월권",
    },
    {
      id: 102,
      memberName: "이영희",
      memberNo: "M2024-0045",
      couponName: "신규 회원 가입 10% 할인",
      issuedDate: "2026-02-17",
      expiryDate: "2026-12-31",
      usedDate: null,
      status: "unused",
      usedProduct: "-",
    },
    {
      id: 103,
      memberName: "박지민",
      memberNo: "M2025-0003",
      couponName: "VIP 재등록 5만원 할인",
      issuedDate: "2026-01-10",
      expiryDate: "2026-01-31",
      usedDate: null,
      status: "expired",
      usedProduct: "-",
    }
  ]);

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

  const confirmDelete = () => {
    if (selectedCoupon) {
      setCoupons(prev => prev.filter(c => c.id !== selectedCoupon.id));
      setIsConfirmDeleteOpen(false);
      setSelectedCoupon(null);
      alert("쿠폰이 삭제되었습니다.");
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
    {
      key: "issuedDate",
      label: "발급일",
      type: "dateRange",
    },
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

  // --- Filtered Data ---
  const filteredCoupons = useMemo(() => {
    return coupons.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = !filterValues.status || item.status === filterValues.status;
      const matchType = !filterValues.type || item.type === filterValues.type;
      return matchSearch && matchStatus && matchType;
    });
  }, [coupons, searchValue, filterValues]);

  const filteredLogs = useMemo(() => {
    return issuanceLogs.filter(item => {
      const matchSearch = item.memberName.toLowerCase().includes(searchValue.toLowerCase()) || 
                          item.couponName.toLowerCase().includes(searchValue.toLowerCase());
      const matchStatus = !filterValues.status || item.status === filterValues.status;
      const matchCoupon = !filterValues.coupon || coupons.find(c => c.id.toString() === filterValues.coupon)?.name === item.couponName;
      // Date range filtering would go here
      return matchSearch && matchStatus && matchCoupon;
    });
  }, [issuanceLogs, searchValue, filterValues, coupons]);

  // --- Table Columns ---
  const listColumns = [
    {
      key: "id",
      header: "No",
      width: 60,
      align: "center" as const,
    },
    {
      key: "name",
      header: "쿠폰명",
      width: 250,
      render: (val: string) => <span className="font-semibold text-text-dark-grey" >{val}</span>
    },
    {
      key: "type",
      header: "쿠폰 유형",
      width: 100,
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={val === "discount" ? "peach" as any : "mint" as any} label={val === "discount" ? "할인" : "무료"}/>
      )
    },
    {
      key: "discountValue",
      header: "할인 값",
      width: 120,
      render: (val: number, row: any) => {
        if (row.type === "free") return "무료 체험";
        return row.discountType === "percent" ? `${val}%` : `${val?.toLocaleString()}원`;
      }
    },
    {
      key: "issuedCount",
      header: "발급 수",
      width: 80,
      align: "right" as const,
    },
    {
      key: "usedCount",
      header: "사용 수",
      width: 80,
      align: "right" as const,
    },
    {
      key: "remainingCount",
      header: "잔여 수",
      width: 80,
      align: "right" as const,
    },
    {
      key: "validity",
      header: "유효 기간",
      width: 200,
      render: (_: any, row: any) => {
        if (row.validityType === "period") return `${row.startDate} ~ ${row.endDate}`;
        return `발급 후 ${row.validDays}일`;
      }
    },
    {
      key: "status",
      header: "상태",
      width: 100,
      align: "center" as const,
      render: (val: string) => {
        const variants: Record<string, any> = {
          active: "success",
          expired: "default",
          inactive: "default",
        };
        const labels: Record<string, string> = {
          active: "활성",
          expired: "만료",
          inactive: "비활성",
        };
        return <StatusBadge variant={variants[val]} label={labels[val]} dot="true"/>;
      }
    },
    {
      key: "createdAt",
      header: "등록일",
      width: 120,
    },
    {
      key: "actions",
      header: "메뉴",
      width: 180,
      align: "center" as const,
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center gap-xs" >
          <button 
            className="p-xs hover:bg-bg-soft-peach text-primary-coral rounded-button transition-colors" title="쿠폰 발급" onClick={() => handleOpenIssueModal(row)}>
            <Send size={16}/>
          </button>
          <button 
            className="p-xs hover:bg-bg-main-light-blue text-text-grey-blue rounded-button transition-colors" title="수정" onClick={() => handleEditCoupon(row)}>
            <Edit2 size={16}/>
          </button>
          <button 
            className="p-xs hover:bg-bg-soft-peach text-error rounded-button transition-colors" title="삭제" disabled={row.issuedCount > 0} onClick={() => handleDeleteClick(row)}>
            <Trash2 size={16}/>
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
      render: (val: string) => (
        <button
          className="text-primary-coral hover:underline font-medium transition-colors" onClick={() => moveToPage(985)}>
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
        const variants: Record<string, any> = {
          used: "success",
          unused: "warning",
          expired: "error",
        };
        const labels: Record<string, string> = {
          used: "사용 완료",
          unused: "미사용",
          expired: "만료",
        };
        return <StatusBadge variant={variants[val]} label={labels[val]}/>;
      }
    },
    { key: "usedProduct", header: "사용 상품", width: 150 },
  ];

  return (
    <AppLayout >
      <div className="p-lg" >
        {/* Page Header */}
        <PageHeader title="쿠폰 관리" description="회원에게 발급할 할인 및 무료 쿠폰을 생성하고 발급 이력을 관리합니다." actions={
            <button 
              className="flex items-center gap-sm bg-primary-coral text-white px-lg py-md rounded-button hover:opacity-90 transition-opacity font-semibold shadow-sm"
              onClick={handleCreateCoupon}
            >
              <Plus size={20} />
              신규 쿠폰 생성
            </button>
          }/>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-md mb-xl" >
          <StatCard label="전체 쿠폰" value={coupons.length} icon={<Ticket />} variant="default"/>
          <StatCard label="활성 쿠폰" value={coupons.filter(c => c.status === "active").length} icon={<Ticket />} variant="mint"/>
          <StatCard label="총 발급 건수" value={coupons.reduce((acc, curr) => acc + curr.issuedCount, 0)} icon={<Send />} variant="default"/>
          <StatCard label="사용 완료" value={coupons.reduce((acc, curr) => acc + curr.usedCount, 0)} icon={<Gift />} variant="peach"/>
        </div>

        {/* Tabs & Search Filter */}
        <div className="bg-white rounded-card-normal border border-border-light shadow-card-soft overflow-hidden mb-lg" >
          <TabNav tabs={[
              { key: "list", label: "쿠폰 목록", icon: Ticket },
              { key: "history", label: "발급 이력", icon: History },
            ]} activeTab={activeTab} onTabChange={handleTabChange}/>
          
          <div className="p-md bg-bg-main-light-blue/10" >
            <SearchFilter searchPlaceholder={activeTab === "list" ? "쿠폰명 검색..." : "회원명 또는 쿠폰명 검색..."} searchValue={searchValue} onSearchChange={setSearchValue} filters={activeTab === "list" ? listFilters : historyFilters} filterValues={filterValues} onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))} onReset={() => setFilterValues({})}/>
          </div>
        </div>

        {/* Data Table */}
        <DataTable columns={activeTab === "list" ? listColumns : historyColumns} data={activeTab === "list" ? filteredCoupons : filteredLogs} loading={loading} pagination={{
            page: 1,
            pageSize: 10,
            total: activeTab === "list" ? filteredCoupons.length : filteredLogs.length
          }} onDownloadExcel={() => alert("Excel 다운로드를 시작합니다.")} emptyMessage={activeTab === "list" ? "등록된 쿠폰이 없습니다." : "발급 이력이 없습니다."}/>
      </div>

      {/* Coupon Form Modal (Create/Edit) */}
      {isFormOpen && (
        <CouponFormModal coupon={editingCoupon} onClose={() => setIsFormOpen(false)} onSave={(data) => {
            if (editingCoupon) {
              setCoupons(prev => prev.map(c => c.id === editingCoupon.id ? { ...c, ...data } : c));
            } else {
              setCoupons(prev => [...prev, { ...data, id: prev.length + 1, issuedCount: 0, usedCount: 0, remainingCount: 0, status: "active", createdAt: "2026-02-19" }]);
            }
            setIsFormOpen(false);
          }}/>
      )}

      {/* Issue Coupon Modal */}
      {isIssueModalOpen && selectedCoupon && (
        <IssueCouponModal coupon={selectedCoupon} onClose={() => setIsIssueModalOpen(false)} onIssue={(count) => {
            setCoupons(prev => prev.map(c => c.id === selectedCoupon.id ? { ...c, issuedCount: c.issuedCount + count, remainingCount: c.remainingCount + count } : c));
            setIsIssueModalOpen(false);
            alert(`${selectedCoupon.name} 쿠폰이 발급되었습니다.`);
          }}/>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog open={isConfirmDeleteOpen} title="쿠폰 삭제" description={`"${selectedCoupon?.name}" 쿠폰을 삭제하시겠습니까?\n발급 이력이 없는 쿠폰만 삭제가 가능합니다.`} confirmLabel="삭제" variant="danger" confirmationText="삭제" onConfirm={confirmDelete} onCancel={() => setIsConfirmDeleteOpen(false)}/>
    </AppLayout>
  );
}

// --- Local Components for Modals ---

function CouponFormModal({ coupon, onClose, onSave }: any) {
  const [formData, setFormData] = useState(coupon || {
    name: "",
    type: "discount",
    discountType: "percent",
    discountValue: 0,
    validityType: "period",
    startDate: "",
    endDate: "",
    validDays: 0,
    conditions: "",
    memo: ""
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
      <div className="w-full max-w-2xl bg-white rounded-modal shadow-card-soft max-h-[90vh] overflow-y-auto" >
        <div className="px-xl py-lg border-b border-border-light flex justify-between items-center bg-white sticky top-0 z-10" >
          <h2 className="text-Heading 2 text-text-dark-grey" >{coupon ? "쿠폰 수정" : "신규 쿠폰 생성"}</h2>
          <button className="text-text-grey-blue hover:text-text-dark-grey transition-colors" onClick={onClose}><Trash2 size={20}/></button>
        </div>
        
        <div className="p-xl space-y-lg" >
          <FormSection title="기본 정보" columns={1}>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >쿠폰명 <span className="text-error" >*</span></label>
              <input 
                className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none" placeholder="쿠폰 이름을 입력하세요" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
            </div>
            
            <div className="grid grid-cols-2 gap-md" >
              <div className="space-y-sm" >
                <label className="text-Label text-text-grey-blue" >쿠폰 유형 <span className="text-error" >*</span></label>
                <div className="flex gap-md" >
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-primary-coral" type="radio" checked={formData.type === "discount"} onChange={() => setFormData({ ...formData, type: "discount" })}/>
                    <span className="text-Body 2" >할인 쿠폰</span>
                  </label>
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-primary-coral" type="radio" checked={formData.type === "free"} onChange={() => setFormData({ ...formData, type: "free" })}/>
                    <span className="text-Body 2" >무료 쿠폰</span>
                  </label>
                </div>
              </div>
            </div>
          </FormSection>

          {formData.type === "discount" && (
            <FormSection title="할인 설정" columns={2}>
              <div className="space-y-sm" >
                <label className="text-Label text-text-grey-blue" >할인 방식 <span className="text-error" >*</span></label>
                <select 
                  className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none" value={formData.discountType} onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}>
                  <option value="percent">정률 할인 (%)</option>
                  <option value="amount">정액 할인 (원)</option>
                </select>
              </div>
              <div className="space-y-sm" >
                <label className="text-Label text-text-grey-blue" >할인 값 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <input
                    className="w-full bg-input-bg-light border-0 rounded-input pl-md pr-xl py-sm focus:ring-2 focus:ring-secondary-mint outline-none" type="number" value={formData.discountValue} onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}/>
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" >
                    {formData.discountType === "percent" ? "%" : "원"}
                  </span>
                </div>
              </div>
            </FormSection>
          )}

          <FormSection title="유효 기간 설정" columns={1}>
            <div className="flex gap-md mb-md" >
              <label className="flex items-center gap-xs cursor-pointer" >
                <input className="accent-primary-coral" type="radio" checked={formData.validityType === "period"} onChange={() => setFormData({ ...formData, validityType: "period" })}/>
                <span className="text-Body 2" >기간 지정</span>
              </label>
              <label className="flex items-center gap-xs cursor-pointer" >
                <input className="accent-primary-coral" type="radio" checked={formData.validityType === "days"} onChange={() => setFormData({ ...formData, validityType: "days" })}/>
                <span className="text-Body 2" >발급일 기준 N일</span>
              </label>
            </div>

            {formData.validityType === "period" ? (
              <div className="grid grid-cols-2 gap-md" >
                <div className="space-y-sm" >
                  <label className="text-Label text-text-grey-blue" >시작일</label>
                  <input className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}/>
                </div>
                <div className="space-y-sm" >
                  <label className="text-Label text-text-grey-blue" >종료일</label>
                  <input className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}/>
                </div>
              </div>
            ) : (
              <div className="space-y-sm" >
                <label className="text-Label text-text-grey-blue" >발급 후 유효일</label>
                <div className="relative" >
                  <input className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm" type="number" value={formData.validDays} onChange={(e) => setFormData({ ...formData, validDays: Number(e.target.value) })}/>
                  <span className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" >일</span>
                </div>
              </div>
            )}
          </FormSection>

          <FormSection title="기타 상세 정보" columns={1}>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >사용 조건</label>
              <textarea 
                className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm min-h-[80px]" placeholder="예: 30,000원 이상 결제 시 사용 가능" value={formData.conditions} onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}/>
            </div>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >내부 메모</label>
              <textarea 
                className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm min-h-[60px]" placeholder="내부 관리용 메모를 입력하세요" value={formData.memo} onChange={(e) => setFormData({ ...formData, memo: e.target.value })}/>
            </div>
          </FormSection>
        </div>

        <div className="px-xl py-lg border-t border-border-light bg-bg-main-light-blue/5 flex justify-end gap-md" >
          <button className="px-xl py-md rounded-button border border-border-light text-text-grey-blue hover:bg-white transition-colors" onClick={onClose}>취소</button>
          <button className="px-xl py-md rounded-button bg-primary-coral text-white font-semibold hover:opacity-90 transition-opacity" onClick={() => onSave(formData)}>저장하기</button>
        </div>
      </div>
    </div>
  );
}

function IssueCouponModal({ coupon, onClose, onIssue }: any) {
  const [issueData, setIssueData] = useState({
    method: "individual",
    recipients: [],
    count: 1,
    message: ""
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
      <div className="w-full max-w-lg bg-white rounded-modal shadow-card-soft overflow-hidden" >
        <div className="px-xl py-lg border-b border-border-light bg-white flex justify-between items-center" >
          <div >
            <h2 className="text-Heading 2 text-text-dark-grey" >쿠폰 발급</h2>
            <p className="text-Body 2 text-text-grey-blue mt-xs" >{coupon.name}</p>
          </div>
          <button className="text-text-grey-blue hover:text-text-dark-grey transition-colors" onClick={onClose}><Trash2 size={20}/></button>
        </div>

        <div className="p-xl space-y-lg" >
          <div className="space-y-sm" >
            <label className="text-Label text-text-grey-blue font-semibold" >발급 방식 <span className="text-error" >*</span></label>
            <div className="flex gap-md p-sm bg-input-bg-light rounded-input" >
              <button 
                className={cn("flex-1 py-sm rounded-button text-Body 2 transition-all", issueData.method === "individual" ? "bg-white text-primary-coral shadow-sm font-semibold" : "text-text-grey-blue")} onClick={() => setIssueData({ ...issueData, method: "individual" })}>
                개인 발급
              </button>
              <button 
                className={cn("flex-1 py-sm rounded-button text-Body 2 transition-all", issueData.method === "group" ? "bg-white text-primary-coral shadow-sm font-semibold" : "text-text-grey-blue")} onClick={() => setIssueData({ ...issueData, method: "group" })}>
                그룹 발급
              </button>
            </div>
          </div>

          <div className="space-y-sm" >
            <label className="text-Label text-text-grey-blue font-semibold" >수신자 선택 <span className="text-error" >*</span></label>
            <div className="relative" >
              <input 
                className="w-full bg-input-bg-light border-0 rounded-input pl-xl pr-md py-sm focus:ring-2 focus:ring-secondary-mint outline-none" placeholder={issueData.method === "individual" ? "회원명을 검색하세요" : "그룹을 선택하세요"}/>
              <Search className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue" size={16}/>
            </div>
            <div className="flex flex-wrap gap-xs mt-sm" >
              <span className="px-md py-xs bg-bg-soft-peach text-primary-coral text-Label rounded-full flex items-center gap-xs" >
                김철수 <Trash2 className="cursor-pointer" size={12}/>
              </span>
              <span className="px-md py-xs bg-bg-soft-peach text-primary-coral text-Label rounded-full flex items-center gap-xs" >
                이영희 <Trash2 className="cursor-pointer" size={12}/>
              </span>
            </div>
          </div>

          <div className="space-y-sm" >
            <label className="text-Label text-text-grey-blue font-semibold" >1인당 발급 수량 <span className="text-error" >*</span></label>
            <input
              className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm" type="number" value={issueData.count} min={1} onChange={(e) => setIssueData({ ...issueData, count: Number(e.target.value) })}/>
          </div>

          <div className="space-y-sm" >
            <label className="text-Label text-text-grey-blue font-semibold" >발급 알림 메시지</label>
            <textarea 
              className="w-full bg-input-bg-light border-0 rounded-input px-md py-sm min-h-[100px]" placeholder="쿠폰 발급 시 전송할 메시지를 입력하세요 (미입력 시 기본 메시지 발송)" value={issueData.message} onChange={(e) => setIssueData({ ...issueData, message: e.target.value })}/>
          </div>
        </div>

        <div className="px-xl py-lg border-t border-border-light bg-bg-main-light-blue/5 flex justify-end gap-md" >
          <button className="px-xl py-md rounded-button border border-border-light text-text-grey-blue hover:bg-white transition-colors" onClick={onClose}>취소</button>
          <button className="px-xl py-md rounded-button bg-secondary-mint text-white font-semibold hover:opacity-90 transition-opacity" onClick={() => onIssue(issueData.count)}>발급 처리하기</button>
        </div>
      </div>
    </div>
  );
}
