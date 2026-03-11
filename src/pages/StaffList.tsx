import React, { useState, useMemo } from "react";
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
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import ConfirmDialog from "@/components/ConfirmDialog";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

// --- 역할 설정 ---
type RoleKey = "primary" | "owner" | "manager" | "fc" | "trainer" | "staff";

const ROLE_CONFIG: Record<RoleKey, { label: string; badgeClass: string }> = {
  primary: { label: "최고관리자", badgeClass: "bg-[#FFEEEE] text-error border border-error/30" },
  owner:   { label: "센터장",     badgeClass: "bg-[#FFF3E5] text-[#E07820] border border-[#E07820]/30" },
  manager: { label: "매니저",     badgeClass: "bg-accent-light text-accent border border-accent/30" },
  fc:      { label: "FC",         badgeClass: "bg-[#EEF4FF] text-[#3B7CF4] border border-[#3B7CF4]/30" },
  trainer: { label: "트레이너",   badgeClass: "bg-[#F0FFF4] text-state-success border border-state-success/30" },
  staff:   { label: "스태프",     badgeClass: "bg-surface-secondary text-content-secondary border border-line" },
};

// --- Mock 직원 데이터 ---
const MOCK_STAFF = [
  { id: 1, name: "김철수",  role: "trainer" as RoleKey, contact: "010-1234-5678", joinDate: "2024-01-02", status: "active",   memo: "재활 전문 PT" },
  { id: 2, name: "이영희",  role: "fc"      as RoleKey, contact: "010-2345-6789", joinDate: "2024-02-15", status: "active",   memo: "CS 우수" },
  { id: 3, name: "박지민",  role: "owner"   as RoleKey, contact: "010-3456-7890", joinDate: "2023-10-10", status: "active",   memo: "" },
  { id: 4, name: "최성호",  role: "trainer" as RoleKey, contact: "010-4567-8901", joinDate: "2024-03-01", status: "resigned", memo: "요가/필라테스" },
  { id: 5, name: "정수진",  role: "trainer" as RoleKey, contact: "010-5678-9012", joinDate: "2024-05-20", status: "active",   memo: "여성 다이어트" },
  { id: 6, name: "한미래",  role: "manager" as RoleKey, contact: "010-6789-0123", joinDate: "2024-06-01", status: "leave",    memo: "육아휴직 중" },
  { id: 7, name: "오준혁",  role: "staff"   as RoleKey, contact: "010-7890-1234", joinDate: "2024-07-15", status: "active",   memo: "" },
];

type SortKey = "name" | "role" | "joinDate" | "status";
type SortDir = "asc" | "desc" | null;

export default function StaffList() {
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({ role: "", status: "" });
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({ role: "", status: "" });
    setSearchQuery("");
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
    let data = MOCK_STAFF.filter(s => {
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
  }, [searchQuery, filterValues, sortKey, sortDir]);

  // 통계
  const total    = MOCK_STAFF.length;
  const active   = MOCK_STAFF.filter(s => s.status === "active").length;
  const onLeave  = MOCK_STAFF.filter(s => s.status === "leave").length;
  const resigned = MOCK_STAFF.filter(s => s.status === "resigned").length;

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
      render: (val: string) => (
        <button
          className="text-primary font-semibold hover:underline"
          onClick={() => moveToPage(988)}
        >
          {val}
        </button>
      )
    },
    {
      key: "role",
      header: <SortHeader col="role" label="역할" />,
      width: 120,
      render: (val: RoleKey) => {
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
      width: 120
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
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-button text-Label font-semibold hover:opacity-90 transition-all"
              onClick={() => moveToPage(988)}
            >
              <Plus size={16} /> 직원 등록
            </button>
          }
        />

        {/* 통계 카드 4개 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-lg mb-lg">
          <StatCard label="전체 직원"  value={`${total}명`}   icon={<Users />}     description="등록된 총 인원"    variant="default" />
          <StatCard label="재직 중"    value={`${active}명`}  icon={<UserCheck />} description="현재 근무 인원"   variant="mint" />
          <StatCard label="휴직 중"    value={`${onLeave}명`} icon={<Clock />}     description="휴직자 현황"      variant="peach" />
          <StatCard label="퇴사"       value={`${resigned}명`} icon={<UserMinus />} description="퇴사 처리 인원"  variant="default" />
        </div>

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
            <button
              className="flex items-center gap-xs px-md py-sm bg-primary-light text-primary rounded-button text-Label font-semibold hover:bg-primary hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={selectedRows.size === 0}
              onClick={() => moveToPage(980)}
            >
              <MessageSquare size={16} /> 메시지 전송
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm bg-white border border-line text-content-secondary rounded-button text-Label font-semibold hover:border-primary hover:text-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={selectedRows.size === 0}
            >
              <Settings2 size={16} /> 상태 변경
            </button>
            <button
              className="flex items-center gap-xs px-md py-sm bg-white border border-line text-error rounded-button text-Label font-semibold hover:bg-error hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={selectedRows.size === 0}
              onClick={() => setIsRetireDialogOpen(true)}
            >
              <UserMinus size={16} /> 퇴사 처리
            </button>
            <button className="flex items-center gap-xs px-md py-sm bg-white border border-line text-content-secondary rounded-button text-Label font-semibold hover:bg-surface-secondary transition-all">
              <Download size={16} /> 명단 다운로드
            </button>
          </div>
        </div>

        {/* 직원 테이블 */}
        <div className="flex-1 overflow-auto pb-xxl">
          <DataTable
            columns={columns}
            data={filtered}
            selectable={true}
            selectedRows={selectedRows}
            onSelectRows={setSelectedRows}
            pagination={{ page: 1, pageSize: 10, total: filtered.length }}
            onDownloadExcel={() => alert("엑셀 다운로드")}
          />
        </div>

        <ConfirmDialog
          open={isRetireDialogOpen}
          title="직원 퇴사 처리"
          description={`선택한 ${selectedRows.size}명의 직원을 퇴사 처리하시겠습니까?\n퇴사 처리 시 해당 직원의 계정 접근이 제한됩니다.`}
          confirmLabel="퇴사 처리"
          variant="danger"
          confirmationText="퇴사처리"
          onConfirm={() => {
            alert("퇴사 처리가 완료되었습니다.");
            setIsRetireDialogOpen(false);
          }}
          onCancel={() => setIsRetireDialogOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
