import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Save,
  AlertCircle,
  UserX,
  Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";

import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import SearchFilter, { FilterOption } from "@/components/SearchFilter";
import DataTable from "@/components/DataTable";
import TabNav from "@/components/TabNav";
import StatusBadge from "@/components/StatusBadge";
import AppLayout from "@/components/AppLayout";

/**
 * SCR-016: 급여 관리 페이지
 */

// 월별 Mock 데이터 변형 시드
function getMonthSeed(month: string): number {
  const parts = month.split("-");
  return parseInt(parts[0]) * 100 + parseInt(parts[1]);
}

export default function Payroll() {
  // --- 상태 관리 ---
  const [selectedMonth, setSelectedMonth] = useState("2024-03");
  const [activeTab, setActiveTab] = useState("basic"); // "basic" | "detail"
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({
    jobGroup: "",
    position: "",
    employmentStatus: "",
    payrollSetup: "",
    settlementStatus: ""
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 97
  });

  // --- Mock 데이터 (월별 필터링 지원) ---
  const mockStaffData = useMemo(() => {
    const seed = getMonthSeed(selectedMonth);
    const jobGroups = ["트레이너", "필라테스 강사", "매니저", "FC", "안내데스크", "청소", "기타"];
    const positions = ["팀장", "시니어", "주임", "사원", "파트타임"];
    const teams = ["운영팀", "교육팀", "영업팀", "관리팀"];
    const settlementStatuses = ["미정산", "임시저장", "확정대기", "확정완료", "이의제기"];

    // 월별로 데이터 수 약간 변동 (seed 활용)
    const count = 80 + (seed % 20);

    return Array.from({ length: count }).map((_, i) => {
      const baseSalary = 2500000 + (seed % 5) * 50000;
      const incentive = 300000 + (i * 10000) + (seed % 10) * 5000;
      const deductions = 250000 + (i % 5) * 10000;
      const netPay = baseSalary + incentive - deductions;
      const status = settlementStatuses[(i + seed) % settlementStatuses.length];

      return {
        id: i + 1,
        name: `직원 ${i + 1}`,
        jobGroup: jobGroups[i % jobGroups.length],
        position: positions[i % positions.length],
        team: teams[i % teams.length],
        employmentStatus: i % 15 === 0 ? "퇴사" : "재직",
        payrollSetup: i % 10 === 0 ? "미설정" : "설정완료",
        settlementStatus: status,
        settlementPeriod: `${selectedMonth}.01 ~ ${selectedMonth}.${new Date(parseInt(selectedMonth.split("-")[0]), parseInt(selectedMonth.split("-")[1]), 0).getDate()}`,
        confirmedAt: status === "확정완료" ? `${selectedMonth.split("-")[0]}.${String(parseInt(selectedMonth.split("-")[1]) + 1).padStart(2, "0")}.05` : "-",

        // 상세 내역
        baseSalary,
        incentive,   // 인센티브
        deductions,  // 공제액
        netPay,      // 실지급액 = 기본급 + 인센티브 - 공제
        personalCommission: Math.floor(incentive * 0.5),
        teamCommission: 100000,
        centerCommission: 50000,
        personalClassAllowance: 200000,
        groupClassAllowance: 100000,
        adjustmentAllowance: i % 8 === 0 ? 50000 : 0,
      };
    });
  }, [selectedMonth]);

  // --- 필터링 로직 ---
  const filteredData = useMemo(() => {
    return mockStaffData.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(searchValue.toLowerCase());
      const matchJobGroup = !filterValues.jobGroup || item.jobGroup === filterValues.jobGroup;
      const matchPosition = !filterValues.position || item.position === filterValues.position;
      const matchEmployment = !filterValues.employmentStatus || item.employmentStatus === filterValues.employmentStatus;
      const matchSetup = !filterValues.payrollSetup || item.payrollSetup === filterValues.payrollSetup;
      const matchStatus = !filterValues.settlementStatus || item.settlementStatus === filterValues.settlementStatus;

      return matchSearch && matchJobGroup && matchPosition && matchEmployment && matchSetup && matchStatus;
    });
  }, [mockStaffData, searchValue, filterValues]);

  const pagedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return filteredData.slice(start, start + pagination.pageSize);
  }, [filteredData, pagination.page, pagination.pageSize]);

  // --- 합계 계산 ---
  const totals = useMemo(() => {
    return filteredData.reduce((acc, item) => ({
      baseSalary: acc.baseSalary + item.baseSalary,
      incentive: acc.incentive + item.incentive,
      deductions: acc.deductions + item.deductions,
      netPay: acc.netPay + item.netPay,
      personalCommission: acc.personalCommission + item.personalCommission,
      teamCommission: acc.teamCommission + item.teamCommission,
      centerCommission: acc.centerCommission + item.centerCommission,
      personalClassAllowance: acc.personalClassAllowance + item.personalClassAllowance,
      groupClassAllowance: acc.groupClassAllowance + item.groupClassAllowance,
      adjustmentAllowance: acc.adjustmentAllowance + item.adjustmentAllowance,
    }), {
      baseSalary: 0, incentive: 0, deductions: 0, netPay: 0,
      personalCommission: 0, teamCommission: 0, centerCommission: 0,
      personalClassAllowance: 0, groupClassAllowance: 0, adjustmentAllowance: 0,
    });
  }, [filteredData]);

  // --- 컬럼 정의 ---
  const basicColumns = [
    {
      key: "name",
      header: "이름",
      render: (val: string, row: any) => (
        <button
          className="text-primary-coral font-semibold hover:underline" onClick={() => moveToPage(989)}>
          {val}
        </button>
      )
    },
    { key: "jobGroup", header: "직군" },
    { key: "position", header: "직급" },
    { key: "team", header: "팀" },
    {
      key: "employmentStatus",
      header: "재직 여부",
      render: (val: string) => (
        <StatusBadge variant={val === "재직" ? "success" : "default"} dot={true}>
          {val}
        </StatusBadge>
      )
    },
    {
      key: "payrollSetup",
      header: "급여 설정",
      render: (val: string) => (
        <span className={cn(val === "설정완료" ? "text-success" : "text-error", "text-Body 2")} >
          {val}
        </span>
      )
    },
    {
      key: "settlementStatus",
      header: "급여 확정 상태",
      render: (val: string) => {
        const variants: any = {
          "확정완료": "success",
          "확정대기": "warning",
          "임시저장": "info",
          "이의제기": "error",
          "미정산": "default"
        };
        return <StatusBadge variant={variants[val] || "default"}>{val}</StatusBadge>;
      }
    },
    { key: "settlementPeriod", header: "정산 기간", width: 180 },
    { key: "confirmedAt", header: "급여 확정일" },
    {
      key: "actions",
      header: "관리",
      width: 80,
      align: "center" as const,
      render: (_: any, row: any) => {
        const isPaid = row.settlementStatus === "확정완료";
        return isPaid ? (
          <StatusBadge variant="success">지급 완료</StatusBadge>
        ) : (
          <button
            className="flex items-center gap-xs px-sm py-xs text-Label text-primary-coral border border-primary-coral rounded-button hover:bg-bg-soft-peach transition-colors"
            onClick={() => alert(`${row.name} 급여 수정`)}
          >
            <Edit2 size={12}/>
            수정
          </button>
        );
      }
    }
  ];

  const detailColumns = [
    { key: "name", header: "이름", width: 100 },
    {
      key: "netPay",
      header: "실지급액",
      align: "right" as const,
      render: (val: number) => (
        <span className="text-primary-coral font-bold" >
          {val.toLocaleString()}원
        </span>
      )
    },
    { key: "baseSalary", header: "기본급", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "incentive", header: "인센티브", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "deductions", header: "공제액", align: "right" as const, render: (val: number) => <span className="text-error">{val.toLocaleString()}원</span> },
    { key: "personalCommission", header: "개인매출커미션", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "teamCommission", header: "팀매출커미션", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "centerCommission", header: "센터매출커미션", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "personalClassAllowance", header: "개인수업수당", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "groupClassAllowance", header: "그룹수업수당", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
    { key: "adjustmentAllowance", header: "조정수당", align: "right" as const, render: (val: number) => `${val.toLocaleString()}원` },
  ];

  // --- 필터 옵션 ---
  const filterOptions: FilterOption[] = [
    {
      key: "jobGroup",
      label: "직군",
      type: "select",
      options: [
        { value: "트레이너", label: "트레이너" },
        { value: "필라테스 강사", label: "필라테스 강사" },
        { value: "매니저", label: "매니저" },
        { value: "FC", label: "FC" },
        { value: "안내데스크", label: "안내데스크" },
        { value: "청소", label: "청소" },
        { value: "기타", label: "기타" }
      ]
    },
    {
      key: "position",
      label: "직급",
      type: "select",
      options: [
        { value: "팀장", label: "팀장" },
        { value: "시니어", label: "시니어" },
        { value: "주임", label: "주임" },
        { value: "사원", label: "사원" },
        { value: "파트타임", label: "파트타임" }
      ]
    },
    {
      key: "employmentStatus",
      label: "재직 여부",
      type: "select",
      options: [
        { value: "재직", label: "재직" },
        { value: "퇴사", label: "퇴사" }
      ]
    },
    {
      key: "payrollSetup",
      label: "급여 설정",
      type: "select",
      options: [
        { value: "설정완료", label: "설정완료" },
        { value: "미설정", label: "미설정" }
      ]
    },
    {
      key: "settlementStatus",
      label: "급여 확정 상태",
      type: "select",
      options: [
        { value: "미정산", label: "미정산" },
        { value: "임시저장", label: "임시저장" },
        { value: "확정대기", label: "확정대기" },
        { value: "확정완료", label: "확정완료" },
        { value: "이의제기", label: "이의제기" }
      ]
    }
  ];

  return (
    <AppLayout >
      <div className="space-y-xl" >
        {/* 1. 페이지 헤더 & 월 선택기 */}
        <PageHeader title="급여 관리" description="직원별 기본급, 인센티브 및 공제액을 자동 계산하고 급여를 확정합니다." actions={
            <div className="flex items-center gap-sm">
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  className="pl-xl pr-md py-sm bg-white border border-border-light rounded-button text-Body 2 focus:outline-none focus:border-primary-coral transition-colors cursor-pointer"
                />
                <CalendarIcon size={16} className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue pointer-events-none" />
              </div>
              <button
                className="flex items-center gap-xs px-lg py-sm bg-secondary-mint text-white rounded-button text-Label font-semibold hover:opacity-90 transition-opacity"
                onClick={() => alert("현재 상태를 임시저장했습니다.")}
              >
                <Save size={16} />
                임시저장
              </button>
            </div>
          }/>

        {/* 2. 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-md" data-csid="30">
          <StatCard label="확정 완료" value="1억 2,450만원" description="총 42명 확정 완료" icon={<CheckCircle2 />} variant="mint"/>
          <StatCard label="확정 대기" value="4,280만원" description="총 15명 승인 대기 중" icon={<Clock />}/>
          <StatCard label="임시 저장" value="2,150만원" description="총 8명 작성 중" icon={<FileText />} variant="peach"/>
          <StatCard label="이의 제기" value="850만원" description="총 3명 내용 확인 필요" icon={<AlertCircle />}/>
          <StatCard label="미정산" value={`${mockStaffData.filter(d => d.settlementStatus === "미정산").length}명`} description={`정산 대상 직원 ${mockStaffData.length}명`} icon={<UserX />}/>
        </div>

        {/* 3. 탭 & 목록 영역 */}
        <div className="space-y-md" >
          <TabNav tabs={[
              { key: "basic", label: "기본 정보" },
              { key: "detail", label: "내역 정보" }
            ]} activeTab={activeTab} onTabChange={(key) => setActiveTab(key as "basic" | "detail")}/>

          <SearchFilter searchPlaceholder="직원명으로 검색..." searchValue={searchValue} onSearchChange={setSearchValue} filters={filterOptions} filterValues={filterValues} onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))} onReset={() => {
              setSearchValue("");
              setFilterValues({
                jobGroup: "",
                position: "",
                employmentStatus: "",
                payrollSetup: "",
                settlementStatus: ""
              });
            }} onRemoveFilter={(key) => setFilterValues(prev => ({ ...prev, [key]: "" }))}/>

          <DataTable
            columns={activeTab === "basic" ? basicColumns : detailColumns}
            data={pagedData}
            selectable={true}
            pagination={{
              page: pagination.page,
              pageSize: pagination.pageSize,
              total: filteredData.length
            }}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
            onPageSizeChange={(pageSize) => setPagination(prev => ({ ...prev, pageSize, page: 1 }))}
            onDownloadExcel={() => alert("급여 데이터를 엑셀로 다운로드합니다.")}
            emptyMessage="해당 조건의 정산 대상 직원이 없습니다."
          />

          {/* 합계 행 */}
          {filteredData.length > 0 && (
            <div className="bg-3 border border-border-light rounded-card-normal p-md">
              <div className="flex items-center justify-between flex-wrap gap-md">
                <span className="text-Label font-bold text-text-dark-grey">
                  전체 합계 ({filteredData.length}명)
                </span>
                {activeTab === "detail" ? (
                  <div className="flex items-center gap-xl flex-wrap">
                    <div className="text-right">
                      <p className="text-[11px] text-text-grey-blue">기본급 합계</p>
                      <p className="text-Body 2 font-semibold">{totals.baseSalary.toLocaleString()}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-text-grey-blue">인센티브 합계</p>
                      <p className="text-Body 2 font-semibold">{totals.incentive.toLocaleString()}원</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-text-grey-blue">공제액 합계</p>
                      <p className="text-Body 2 font-semibold text-error">{totals.deductions.toLocaleString()}원</p>
                    </div>
                    <div className="text-right border-l border-border-light pl-xl">
                      <p className="text-[11px] text-text-grey-blue">실지급액 합계</p>
                      <p className="text-Heading 2 font-bold text-primary-coral">{totals.netPay.toLocaleString()}원</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-[11px] text-text-grey-blue">총 실지급액</p>
                    <p className="text-Heading 2 font-bold text-primary-coral">{totals.netPay.toLocaleString()}원</p>
                  </div>
                )}
              </div>
              {activeTab === "detail" && (
                <div className="mt-sm pt-sm border-t border-border-light">
                  <p className="text-[11px] text-text-grey-blue">
                    <span className="font-semibold text-secondary-mint">계산식</span>: 실지급액 = 기본급 + 인센티브 - 공제액
                    &nbsp;|&nbsp;
                    {totals.baseSalary.toLocaleString()} + {totals.incentive.toLocaleString()} - {totals.deductions.toLocaleString()} = <span className="font-bold text-primary-coral">{totals.netPay.toLocaleString()}원</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
