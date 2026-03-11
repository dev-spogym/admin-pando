import React, { useState, useMemo } from "react";
import {
  Plus,
  MessageSquare,
  UserMinus,
  UserPlus,
  Settings2,
  Users,
  UserCheck,
  Clock,
  CreditCard,
  Search,
  MoreVertical,
  Calendar,
  FileText,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import SearchFilter from "@/components/SearchFilter";
import ConfirmDialog from "@/components/ConfirmDialog";
import { moveToPage } from "@/internal";
import { cn } from "@/lib/utils";

// --- 역할 권한 레벨 설정 ---
type RoleKey = "primary" | "owner" | "manager" | "fc" | "trainer" | "staff";

const ROLE_CONFIG: Record<RoleKey, { label: string; badgeClass: string }> = {
  primary: { label: "최고관리자", badgeClass: "bg-[#FFEEEE] text-error border border-error/30" },
  owner:   { label: "센터장",     badgeClass: "bg-[#FFF3E5] text-[#E07820] border border-[#E07820]/30" },
  manager: { label: "매니저",     badgeClass: "bg-bg-soft-mint text-secondary-mint border border-secondary-mint/30" },
  fc:      { label: "FC",         badgeClass: "bg-[#EEF4FF] text-[#3B7CF4] border border-[#3B7CF4]/30" },
  trainer: { label: "트레이너",   badgeClass: "bg-[#F0FFF4] text-success border border-success/30" },
  staff:   { label: "스태프",     badgeClass: "bg-input-bg-light text-text-grey-blue border border-border-light" },
};

// Mock Data: Staff
const MOCK_STAFF = [
  {
    id: 1,
    status: "active",
    name: "김철수",
    gender: "남",
    contact: "010-1234-5678",
    role: "trainer" as RoleKey,
    jobGroup: "PT강사",
    position: "팀장",
    team: "PT 1팀",
    joinDate: "2024-01-02",
    adminId: "chulsoo_k",
    memo: "경력 5년, 재활 전문",
    workType: "정규직",
    attendanceStatus: "on_time",
  },
  {
    id: 2,
    status: "active",
    name: "이영희",
    gender: "여",
    contact: "010-2345-6789",
    role: "fc" as RoleKey,
    jobGroup: "FC",
    position: "사원",
    team: "운영팀",
    joinDate: "2024-02-15",
    adminId: "younghee_l",
    memo: "CS 우수 사원",
    workType: "정규직",
    attendanceStatus: "on_time",
  },
  {
    id: 3,
    status: "active",
    name: "박지민",
    gender: "남",
    contact: "010-3456-7890",
    role: "owner" as RoleKey,
    jobGroup: "매니저",
    position: "센터장",
    team: "총괄",
    joinDate: "2023-10-10",
    adminId: "jimin_p",
    memo: "-",
    workType: "정규직",
    attendanceStatus: "on_time",
  },
  {
    id: 4,
    status: "resigned",
    name: "최성호",
    gender: "남",
    contact: "010-4567-8901",
    role: "trainer" as RoleKey,
    jobGroup: "GX강사",
    position: "외부강사",
    team: "GX팀",
    joinDate: "2024-03-01",
    adminId: "sungho_c",
    memo: "요가/필라테스",
    workType: "파트타임",
    attendanceStatus: "not_attended",
  },
  {
    id: 5,
    status: "active",
    name: "정수진",
    gender: "여",
    contact: "010-5678-9012",
    role: "trainer" as RoleKey,
    jobGroup: "PT강사",
    position: "사원",
    team: "PT 2팀",
    joinDate: "2024-05-20",
    adminId: "sujin_j",
    memo: "여성 다이어트 전문",
    workType: "정규직",
    attendanceStatus: "late",
  }
];

// Mock Data: Attendance
const MOCK_ATTENDANCE = [
  { id: 1, name: "김철수", date: "2024-06-20", checkIn: "08:55", checkOut: "18:05", status: "정상", workTime: "8h 10m" },
  { id: 2, name: "이영희", date: "2024-06-20", checkIn: "09:02", checkOut: "18:00", status: "지각", workTime: "7h 58m" },
  { id: 3, name: "정수진", date: "2024-06-20", checkIn: "13:50", checkOut: "22:05", status: "정상", workTime: "8h 15m" },
  { id: 4, name: "박지민", date: "2024-06-20", checkIn: "08:40", checkOut: "19:30", status: "연장", workTime: "10h 50m" },
];

// 정렬 가능한 컬럼 키
type SortKey = "name" | "role" | "joinDate" | "status";
type SortDir = "asc" | "desc" | null;

export default function StaffList() {
  const [activeTab, setActiveTab] = useState("list");
  const [selectedStaffRows, setSelectedStaffRows] = useState(new Set<number>());
  const [isRetireDialogOpen, setIsRetireDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({
    status: "",
    jobGroup: "",
    position: "",
    role: ""
  });

  // 정렬 상태
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const tabs = [
    { key: "list", label: "직원 목록", icon: Users },
    { key: "attendance", label: "근태 관리", icon: Clock },
    { key: "payroll", label: "급여 관리", icon: CreditCard },
  ];

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({ status: "", jobGroup: "", position: "", role: "" });
    setSearchQuery("");
  };

  // 정렬 핸들러
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

  // 정렬 아이콘
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={13} className="text-text-grey-blue opacity-50"/>;
    if (sortDir === "asc") return <ChevronUp size={13} className="text-primary-coral"/>;
    return <ChevronDown size={13} className="text-primary-coral"/>;
  };

  // 정렬 헤더 버튼
  const SortHeader = ({ col, label }: { col: SortKey; label: string }) => (
    <button
      className="flex items-center gap-[3px] hover:text-primary-coral transition-colors group"
      onClick={() => handleSort(col)}
    >
      {label}
      <SortIcon col={col}/>
    </button>
  );

  // 필터링 + 정렬된 데이터
  const sortedFilteredStaff = useMemo(() => {
    let data = MOCK_STAFF.filter(s => {
      const matchSearch = searchQuery
        ? s.name.includes(searchQuery) || s.contact.includes(searchQuery) || s.adminId.includes(searchQuery)
        : true;
      const matchStatus = !filterValues.status || s.status === filterValues.status;
      const matchJobGroup = !filterValues.jobGroup || s.jobGroup.toLowerCase().includes(filterValues.jobGroup.toLowerCase());
      const matchPosition = !filterValues.position || s.position === filterValues.position;
      const matchRole = !filterValues.role || s.role === filterValues.role;
      return matchSearch && matchStatus && matchJobGroup && matchPosition && matchRole;
    });

    if (sortKey && sortDir) {
      data = [...data].sort((a, b) => {
        let aVal: string = "";
        let bVal: string = "";
        if (sortKey === "name") { aVal = a.name; bVal = b.name; }
        else if (sortKey === "role") { aVal = a.role; bVal = b.role; }
        else if (sortKey === "joinDate") { aVal = a.joinDate; bVal = b.joinDate; }
        else if (sortKey === "status") { aVal = a.status; bVal = b.status; }

        const cmp = aVal.localeCompare(bVal, "ko");
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return data;
  }, [searchQuery, filterValues, sortKey, sortDir]);

  const staffColumns = [
    { key: "id", header: "No", width: 60, align: "center" as const },
    {
      key: "status",
      header: <SortHeader col="status" label="상태"/>,
      width: 100,
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={val === "active" ? "success" : "default"} dot={true}>
          {val === "active" ? "재직" : "퇴사"}
        </StatusBadge>
      )
    },
    {
      key: "name",
      header: <SortHeader col="name" label="직원명"/>,
      render: (val: string, row: any) => (
        <button
          className="text-primary-coral font-semibold hover:underline" onClick={() => moveToPage(988)}>
          {val}
        </button>
      )
    },
    { key: "gender", header: "성별", width: 60, align: "center" as const },
    { key: "contact", header: "연락처", width: 140 },
    {
      key: "role",
      header: <SortHeader col="role" label="역할(권한)"/>,
      width: 140,
      render: (val: RoleKey) => {
        const cfg = ROLE_CONFIG[val] || ROLE_CONFIG.staff;
        return (
          <span className={cn("inline-flex items-center px-sm py-[2px] rounded-full text-[11px] font-semibold", cfg.badgeClass)}>
            {cfg.label}
          </span>
        );
      }
    },
    { key: "jobGroup", header: "직군", width: 100 },
    { key: "position", header: "직급", width: 100 },
    { key: "team", header: "팀", width: 100 },
    {
      key: "joinDate",
      header: <SortHeader col="joinDate" label="입사일"/>,
      width: 120
    },
    { key: "adminId", header: "ID", width: 120 },
    { key: "memo", header: "특이사항", width: 150 },
    { key: "workType", header: "근무 유형", width: 100 },
    {
      key: "attendanceStatus",
      header: "출/퇴근",
      width: 100,
      align: "center" as const,
      render: (val: string) => {
        const variants: Record<string, "success" | "error" | "warning" | "default"> = {
          on_time: "success",
          late: "warning",
          not_attended: "default",
          leave: "error"
        };
        const labels: Record<string, string> = {
          on_time: "정상",
          late: "지각",
          not_attended: "미출근",
          leave: "퇴근"
        };
        return <StatusBadge variant={variants[val] || "default"}>{labels[val] || val}</StatusBadge>;
      }
    },
    {
      key: "menu",
      header: "메뉴",
      width: 80,
      align: "center" as const,
      render: () => (
        <button className="p-sm text-text-grey-blue hover:text-primary-coral transition-colors" >
          <MoreVertical size={18}/>
        </button>
      )
    }
  ];

  const attendanceColumns = [
    { key: "date", header: "날짜", width: 120 },
    { key: "name", header: "성함" },
    { key: "checkIn", header: "출근시간", align: "center" as const },
    { key: "checkOut", header: "퇴근시간", align: "center" as const },
    { key: "workTime", header: "근무시간", align: "center" as const },
    {
      key: "status",
      header: "상태",
      align: "center" as const,
      render: (val: string) => (
        <StatusBadge variant={val === "정상" ? "success" : val === "연장" ? "info" : "warning"}>
          {val}
        </StatusBadge>
      )
    },
    {
      key: "action",
      header: "관리",
      width: 100,
      render: () => (
        <button className="text-Label text-primary-coral hover:underline" >수정</button>
      )
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "list":
        return (
          <div className="space-y-lg" >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg" >
              <StatCard label="전체 직원" value="97명" icon={<Users />} description="현재 등록된 총 인원" variant="default"/>
              <StatCard label="재직 중" value="82명" icon={<UserCheck />} change={{ value: 2.5, label: "지난달 대비" }} variant="mint"/>
              <StatCard label="오늘 출근" value="75명" icon={<Clock />} description="미출근 7명" variant="peach"/>
              <StatCard label="급여 정산 대기" value="12건" icon={<CreditCard />} description="이번 달 정산 예정" variant="default"/>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-col gap-md" >
              <SearchFilter searchPlaceholder="직원명, 연락처, ID 검색" searchValue={searchQuery} onSearchChange={setSearchQuery} filters={[
                  {
                    key: "status",
                    label: "재직 여부",
                    type: "select",
                    options: [
                      { value: "active", label: "재직" },
                      { value: "resigned", label: "퇴사" }
                    ]
                  },
                  {
                    key: "jobGroup",
                    label: "직군",
                    type: "select",
                    options: [
                      { value: "pt", label: "PT강사" },
                      { value: "gx", label: "GX강사" },
                      { value: "fc", label: "FC" },
                      { value: "manager", label: "매니저" }
                    ]
                  },
                  {
                    key: "position",
                    label: "직급",
                    type: "select",
                    options: [
                      { value: "head", label: "센터장" },
                      { value: "team", label: "팀장" },
                      { value: "staff", label: "사원" }
                    ]
                  },
                  {
                    key: "role",
                    label: "역할",
                    type: "select",
                    options: [
                      { value: "primary", label: "최고관리자" },
                      { value: "owner", label: "센터장" },
                      { value: "manager", label: "매니저" },
                      { value: "fc", label: "FC" },
                      { value: "trainer", label: "트레이너" },
                      { value: "staff", label: "스태프" },
                    ]
                  },
                ]} filterValues={filterValues} onFilterChange={handleFilterChange} onReset={handleResetFilters}/>

              <div className="flex flex-wrap items-center gap-sm" >
                <button
                  className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button text-Label font-semibold hover:opacity-90 transition-all" onClick={() => moveToPage(988)}>
                  <Plus size={16}/> 직원 추가
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-bg-soft-peach text-primary-coral rounded-button text-Label font-semibold hover:bg-primary-coral hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed" disabled={selectedStaffRows.size === 0} onClick={() => moveToPage(980)}>
                  <MessageSquare size={16}/> 메시지 전송
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-white border border-border-light text-text-grey-blue rounded-button text-Label font-semibold hover:border-primary-coral hover:text-primary-coral transition-all disabled:opacity-50" disabled={selectedStaffRows.size === 0}>
                  <Settings2 size={16}/> 상태 변경
                </button>
                <button
                  className="flex items-center gap-xs px-md py-sm bg-white border border-border-light text-error rounded-button text-Label font-semibold hover:bg-error hover:text-white transition-all disabled:opacity-50" disabled={selectedStaffRows.size === 0} onClick={() => setIsRetireDialogOpen(true)}>
                  <UserMinus size={16}/> 퇴사 처리
                </button>
                <button className="flex items-center gap-xs px-md py-sm bg-white border border-border-light text-text-grey-blue rounded-button text-Label font-semibold hover:bg-bg-main-light-blue transition-all" >
                  <Download size={16}/> 명단 다운로드
                </button>
              </div>
            </div>

            {/* Data Table */}
            <DataTable columns={staffColumns} data={sortedFilteredStaff} selectable={true} selectedRows={selectedStaffRows} onSelectRows={setSelectedStaffRows} pagination={{
                page: 1,
                pageSize: 10,
                total: sortedFilteredStaff.length
              }} onDownloadExcel={() => console.log("Excel Download")}/>
          </div>
        );
      case "attendance":
        return (
          <div className="space-y-lg" >
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-md" >
              <div className="flex items-center gap-md" >
                <div className="flex items-center gap-sm bg-white border border-border-light rounded-button px-md py-sm" >
                  <Calendar className="text-text-grey-blue" size={18}/>
                  <input className="bg-transparent outline-none text-Body-2" type="date" defaultValue="2024-06-01"/>
                  <span className="text-text-grey-blue" >~</span>
                  <input className="bg-transparent outline-none text-Body-2" type="date" defaultValue="2024-06-30"/>
                </div>
                <select className="bg-white border border-border-light rounded-button px-md py-sm text-Body-2 outline-none" >
                  <option value="">전체 직군</option>
                  <option value="pt">PT강사</option>
                  <option value="fc">FC</option>
                </select>
              </div>
              <button className="flex items-center gap-xs px-md py-sm bg-secondary-mint text-white rounded-button text-Label font-semibold hover:opacity-90" >
                <Settings2 size={16}/> 근무패턴 관리
              </button>
            </div>

            <DataTable title="근태 기록" columns={attendanceColumns} data={MOCK_ATTENDANCE} pagination={{
                page: 1,
                pageSize: 10,
                total: MOCK_ATTENDANCE.length
              }}/>
          </div>
        );
      case "payroll":
        return (
          <div className="space-y-lg" >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-lg" >
              <StatCard label="총 지급액 (6월)" value="₩24,500,000" icon={<CreditCard />} variant="default"/>
              <StatCard label="정산 완료" value="15명" icon={<UserCheck />} variant="mint"/>
              <StatCard label="정산 대기" value="5명" icon={<Clock />} variant="peach"/>
            </div>

            <div className="bg-white rounded-card-normal border border-border-light p-xl flex flex-col items-center justify-center min-h-[400px] text-center" >
              <div className="w-[80px] h-[80px] bg-bg-soft-peach rounded-full flex items-center justify-center text-primary-coral mb-lg" >
                <FileText size={40}/>
              </div>
              <h3 className="text-Heading-2 text-text-dark-grey font-bold mb-sm" >급여 관리 상세</h3>
              <p className="text-Body-1 text-text-grey-blue mb-xl max-w-[400px]" >
                각 직원의 급여 내역 확인 및 명세서 발행은<br />급여 관리 시스템에서 더욱 자세하게 확인하실 수 있습니다.
              </p>
              <button
                className="px-xxl py-md bg-primary-coral text-white rounded-button text-Body-1 font-bold hover:scale-[1.02] transition-all active:scale-[0.98]" onClick={() => moveToPage(976)}>
                급여 관리 바로가기
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AppLayout >
      <div className="flex flex-col h-full" >
        <PageHeader title="직원 관리" description="센터의 직원 정보를 관리하고 근태 및 급여 현황을 확인합니다." actions={
            <div className="flex items-center gap-sm">
              <button className="flex items-center gap-xs px-md py-sm border border-border-light text-text-grey-blue rounded-button text-Label font-semibold hover:bg-white transition-all">
                <Download size={16} /> 엑셀 업로드
              </button>
            </div>
          }/>

        <TabNav
          className="mb-lg" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>

        <div className="flex-1 overflow-auto pb-xxl" >
          {renderTabContent()}
        </div>

        {/* Retiring Dialog */}
        <ConfirmDialog open={isRetireDialogOpen} title="직원 퇴사 처리" description={`선택한 ${selectedStaffRows.size}명의 직원을 퇴사 처리하시겠습니까?\n퇴사 처리 시 해당 직원의 계정 접근이 제한되며, 재입사 전까지 목록에서 퇴사 상태로 표시됩니다.`} confirmLabel="퇴사 처리" variant="danger" confirmationText="퇴사처리" onConfirm={() => {
            alert("퇴사 처리가 완료되었습니다.");
            setIsRetireDialogOpen(false);
          }} onCancel={() => setIsRetireDialogOpen(false)}/>
      </div>
    </AppLayout>
  );
}
