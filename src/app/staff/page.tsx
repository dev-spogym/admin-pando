'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  UserMinus,
  UserCheck,
  Users,
  Clock,
  CreditCard,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MoreVertical,
  Settings2
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import SearchFilter from "@/components/common/SearchFilter";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// --- 역할 설정 ---
// DB role 컬럼은 한글("트레이너", "프론트", "센터장" 등) 또는 영문 키 모두 지원
type RoleKey = "primary" | "owner" | "manager" | "fc" | "trainer" | "staff";

const ROLE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  // 영문 키
  primary: { label: "최고관리자", badgeClass: "bg-[#FFEEEE] text-error border border-error/30" },
  owner:   { label: "센터장",     badgeClass: "bg-[#FFF3E5] text-[#E07820] border border-[#E07820]/30" },
  manager: { label: "매니저",     badgeClass: "bg-accent-light text-accent border border-accent/30" },
  fc:      { label: "FC",         badgeClass: "bg-[#EEF4FF] text-[#3B7CF4] border border-[#3B7CF4]/30" },
  trainer: { label: "트레이너",   badgeClass: "bg-[#F0FFF4] text-state-success border border-state-success/30" },
  staff:   { label: "스태프",     badgeClass: "bg-surface-secondary text-content-secondary border border-line" },
  // 한글 키 (DB에서 직접 한글로 저장된 경우)
  최고관리자: { label: "최고관리자", badgeClass: "bg-[#FFEEEE] text-error border border-error/30" },
  센터장:     { label: "센터장",     badgeClass: "bg-[#FFF3E5] text-[#E07820] border border-[#E07820]/30" },
  매니저:     { label: "매니저",     badgeClass: "bg-accent-light text-accent border border-accent/30" },
  FC:         { label: "FC",         badgeClass: "bg-[#EEF4FF] text-[#3B7CF4] border border-[#3B7CF4]/30" },
  트레이너:   { label: "트레이너",   badgeClass: "bg-[#F0FFF4] text-state-success border border-state-success/30" },
  스태프:     { label: "스태프",     badgeClass: "bg-surface-secondary text-content-secondary border border-line" },
  프론트:     { label: "프론트",     badgeClass: "bg-[#EEF4FF] text-[#3B7CF4] border border-[#3B7CF4]/30" },
};

interface StaffRow {
  id: number;
  name: string;
  role: RoleKey;
  contact: string;
  joinDate: string;
  status: string;
  memo: string;
}

type SortKey = "name" | "role" | "joinDate" | "status";
type SortDir = "asc" | "desc" | null;

export default function StaffList() {
  const [staffData, setStaffData] = useState<StaffRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({ role: "", status: "" });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 직원 목록 fetch (퇴사 처리 후 재호출 가능)
  const fetchStaff = async () => {
    setIsLoadingData(true);
    const { data, error } = await supabase
      .from("staff")
      .select("id, name, phone, email, role, position, hireDate, salary, color, isActive, branchId")
      .eq("branchId", getBranchId());

    if (error) {
      console.error("직원 데이터 로드 실패:", error);
      toast.error("직원 데이터를 불러오지 못했습니다.");
    } else if (data) {
      const mapped: StaffRow[] = data.map((s: any) => ({
        id: s.id,
        name: s.name,
        role: s.role as RoleKey,
        contact: s.phone ?? "",
        joinDate: s.hireDate ?? "",
        status: s.isActive === false ? "resigned" : "active",
        memo: "",
      }));
      setStaffData(mapped);
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterValues({ role: "", status: "" });
    setSearchQuery("");
    setCurrentPage(1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortDir(null); setSortKey(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-content-secondary opacity-50" />;
    if (sortDir === "asc") return <ChevronUp size={13} className="text-primary" />;
    return <ChevronDown size={13} className="text-primary" />;
  };

  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      className="flex items-center gap-[3px] hover:text-primary transition-colors"
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col} />
    </button>
  );

  const filtered = useMemo(() => {
    let data = staffData.filter(s => {
      const matchSearch = !searchQuery || s.name.includes(searchQuery) || s.contact.includes(searchQuery);
      const matchRole   = !filterValues.role   || s.role   === filterValues.role;
      const matchStatus = !filterValues.status || s.status === filterValues.status;
      return matchSearch && matchRole && matchStatus;
    });

    if (sortKey && sortDir) {
      data = [...data].sort((a, b) => {
        const aVal = a[sortKey] as string;
        const bVal = b[sortKey] as string;
        const cmp = aVal.localeCompare(bVal, "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return data;
  }, [staffData, searchQuery, filterValues, sortKey, sortDir]);

  // 통계
  const total    = staffData.length;
  const active   = staffData.filter(s => s.status === "active").length;
  const onLeave  = staffData.filter(s => s.status === "leave").length;
  const resigned = staffData.filter(s => s.status === "resigned").length;

  const statusLabel: Record<string, string> = {
    active: "재직", leave: "휴직", resigned: "퇴사"
  };
  const statusVariant: Record<string, "success" | "warning" | "default"> = {
    active: "success", leave: "warning", resigned: "default"
  };

  const columns = [
    { key: "id", header: "No", width: 60, align: "center" as const },
    {
      key: "name",
      header: <SortHeader col="name" label="직원명" />,
      render: (val: string, row: any) => (
        <button
          className="text-primary font-semibold hover:underline"
          onClick={() => moveToPage(998, { id: row.id })}
        >
          {val}
        </button>
      )
    },
    {
      key: "role",
      header: <SortHeader col="role" label="역할" />,
      width: 120,
      render: (val: string) => {
        const cfg = ROLE_CONFIG[val] || ROLE_CONFIG.staff;
        return (
          <span className={cn("inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold", cfg.badgeClass)}>
            {cfg.label}
          </span>
        );
      }
    },
    { key: "contact", header: "연락처", width: 140 },
    {
      key: "joinDate",
      header: <SortHeader col="joinDate" label="입사일" />,
      width: 120,
      render: (val: string) => val ? val.slice(0, 10) : '-',
    },
    {
      key: "status",
      header: <SortHeader col="status" label="상태" />,
      width: 100,
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={statusVariant[val] ?? "default"} dot={true}>
          {statusLabel[val] ?? val}
        </StatusBadge>
      )
    },
    { key: "memo", header: "메모", render: (val: string) => <span className="text-content-secondary text-Body-2">{val || "-"}</span> },
    {
      key: "menu",
      header: "",
      width: 60,
      align: "center" as const,
      render: () => (
        <button className="p-xs text-content-secondary hover:text-content transition-colors">
          <MoreVertical size={16} />
        </button>
      )
    }
  ];

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title="직원 관리"
          description="센터의 직원 정보를 관리합니다."
          actions={
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => moveToPage(998)}>
              직원 등록
            </Button>
          }
        />

        {/* 통계 카드 4개 */}
        <StatCardGrid cols={4} className="mb-lg">
          <StatCard label="전체 직원"  value={`${total}명`}   icon={<Users />}     description="등록된 총 인원"    variant="default" />
          <StatCard label="재직 중"    value={`${active}명`}  icon={<UserCheck />} description="현재 근무 인원"   variant="mint" />
          <StatCard label="휴직 중"    value={`${onLeave}명`} icon={<Clock />}     description="휴직자 현황"      variant="peach" />
          <StatCard label="퇴사"       value={`${resigned}명`} icon={<UserMinus />} description="퇴사 처리 인원"  variant="default" />
        </StatCardGrid>

        {/* 검색 & 필터 */}
        <div className="flex flex-col gap-md mb-lg">
          <SearchFilter
            searchPlaceholder="직원 이름, 연락처 검색"
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            filters={[
              {
                key: "role",
                label: "역할",
                type: "select",
                options: [
                  { value: "owner",   label: "센터장" },
                  { value: "manager", label: "매니저" },
                  { value: "fc",      label: "FC" },
                  { value: "trainer", label: "트레이너" },
                  { value: "staff",   label: "스태프" },
                ]
              },
              {
                key: "status",
                label: "재직 상태",
                type: "select",
                options: [
                  { value: "active",   label: "재직" },
                  { value: "leave",    label: "휴직" },
                  { value: "resigned", label: "퇴사" },
                ]
              }
            ]}
            filterValues={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
          />

          {/* 액션 버튼 */}
          <div className="flex flex-wrap items-center gap-sm">
            <Button
              variant="outline"
              icon={<MessageSquare size={16} />}
              disabled={selectedRows.size === 0}
              onClick={() => moveToPage(980)}
            >
              메시지 전송
            </Button>
            <Button
              variant="outline"
              icon={<Settings2 size={16} />}
              disabled={selectedRows.size === 0}
            >
              상태 변경
            </Button>
            <Button
              variant="danger"
              icon={<UserMinus size={16} />}
              disabled={selectedRows.size === 0}
              onClick={() => setIsRetireDialogOpen(true)}
            >
              퇴사 처리
            </Button>
            <Button variant="outline" icon={<Download size={16} />}>
              명단 다운로드
            </Button>
          </div>
        </div>

        {/* 직원 테이블 */}
        <div className="flex-1 overflow-auto pb-xxl">
          <DataTable
            columns={columns}
            data={filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)}
            selectable={true}
            selectedRows={selectedRows}
            onSelectRows={setSelectedRows}
            pagination={{ page: currentPage, pageSize: PAGE_SIZE, total: filtered.length }}
            onPageChange={(p) => setCurrentPage(p)}
            onDownloadExcel={() => {
              const exportColumns = [
                { key: 'id', header: 'No' },
                { key: 'name', header: '직원명' },
                { key: 'role', header: '역할' },
                { key: 'contact', header: '연락처' },
                { key: 'joinDate', header: '입사일' },
                { key: 'status', header: '상태' },
                { key: 'memo', header: '메모' },
              ];
              exportToExcel(filtered as unknown as Record<string, unknown>[], exportColumns, { filename: '직원목록' });
              toast.success(`${filtered.length}건 엑셀 다운로드 완료`);
            }}
            emptyMessage={isLoadingData ? "데이터를 불러오는 중..." : "직원 데이터가 없습니다."}
          />
        </div>

        <ConfirmDialog
          open={isRetireDialogOpen}
          title="직원 퇴사 처리"
          description={`선택한 ${selectedRows.size}명의 직원을 퇴사 처리하시겠습니까?\n퇴사 처리 시 해당 직원의 계정 접근이 제한됩니다.`}
          confirmLabel="퇴사 처리"
          variant="danger"
          confirmationText="퇴사처리"
          onConfirm={async () => {
            // 선택된 직원 ID 목록으로 isActive: false 업데이트
            const ids = Array.from(selectedRows);
            const { error } = await supabase
              .from("staff")
              .update({ isActive: false })
              .in("id", ids);
            if (error) {
              toast.error("퇴사 처리에 실패했습니다.");
              return;
            }
            toast.success(`${ids.length}명의 퇴사 처리가 완료되었습니다.`);
            setIsRetireDialogOpen(false);
            setSelectedRows(new Set());
            // 목록 새로고침
            fetchStaff();
          }}
          onCancel={() => setIsRetireDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
