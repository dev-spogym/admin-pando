import React, { useState, useMemo } from "react";
import { 
  FileText, 
  Download, 
  ChevronRight, 
  Search,
  Users,
  CheckCircle2,
  Clock,
  Printer,
  Mail,
  X,
  Plus,
  Minus,
  ArrowRight
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import SearchFilter from "@/components/SearchFilter";
import TabNav from "@/components/TabNav";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FormSection } from "@/components/FormSection";
import { cn } from "@/lib/utils";

// Mock Data
const MOCK_PAYROLL_DATA = [
  {
    id: 1,
    employeeName: "김민수",
    position: "시니어 트레이너",
    paymentDate: "2024-05-25",
    baseSalary: 3500000,
    allowance: 450000,
    deduction: 380000,
    netPay: 3570000,
    status: "지급완료",
    earnings: [
      { name: "기본급", amount: 3500000 },
      { name: "직책수당", amount: 200000 },
      { name: "식대", amount: 150000 },
      { name: "성과급", amount: 100000 },
    ],
    deductions: [
      { name: "국민연금", amount: 157500 },
      { name: "건강보험", amount: 124000 },
      { name: "고용보험", amount: 31500 },
      { name: "소득세", amount: 67000 },
    ]
  },
  {
    id: 2,
    employeeName: "이지아",
    position: "필라테스 강사",
    paymentDate: "2024-05-25",
    baseSalary: 2800000,
    allowance: 1200000,
    deduction: 420000,
    netPay: 3580000,
    status: "지급완료",
    earnings: [
      { name: "기본급", amount: 2800000 },
      { name: "수업수당", amount: 1100000 },
      { name: "식대", amount: 100000 },
    ],
    deductions: [
      { name: "국민연금", amount: 160000 },
      { name: "건강보험", amount: 130000 },
      { name: "장기요양", amount: 15000 },
      { name: "고용보험", amount: 32000 },
      { name: "소득세", amount: 83000 },
    ]
  },
  {
    id: 3,
    employeeName: "박철진",
    position: "운영팀장",
    paymentDate: "2024-05-25",
    baseSalary: 4200000,
    allowance: 300000,
    deduction: 520000,
    netPay: 3980000,
    status: "대기",
    earnings: [
      { name: "기본급", amount: 4200000 },
      { name: "차량유지비", amount: 200000 },
      { name: "식대", amount: 100000 },
    ],
    deductions: [
      { name: "국민연금", amount: 189000 },
      { name: "건강보험", amount: 148000 },
      { name: "고용보험", amount: 37800 },
      { name: "소득세", amount: 145200 },
    ]
  },
  {
    id: 4,
    employeeName: "최유리",
    position: "주니어 트레이너",
    paymentDate: "2024-05-25",
    baseSalary: 2500000,
    allowance: 150000,
    deduction: 280000,
    netPay: 2370000,
    status: "대기",
    earnings: [
      { name: "기본급", amount: 2500000 },
      { name: "식대", amount: 150000 },
    ],
    deductions: [
      { name: "국민연금", amount: 112500 },
      { name: "건강보험", amount: 88000 },
      { name: "고용보험", amount: 22500 },
      { name: "소득세", amount: 57000 },
    ]
  },
  {
    id: 5,
    employeeName: "정해인",
    position: "CS 매니저",
    paymentDate: "2024-05-25",
    baseSalary: 3000000,
    allowance: 200000,
    deduction: 340000,
    netPay: 2860000,
    status: "지급완료",
    earnings: [
      { name: "기본급", amount: 3000000 },
      { name: "식대", amount: 100000 },
      { name: "통신비", amount: 100000 },
    ],
    deductions: [
      { name: "국민연금", amount: 135000 },
      { name: "건강보험", amount: 106000 },
      { name: "고용보험", amount: 27000 },
      { name: "소득세", amount: 72000 },
    ]
  }
];

export default function PayrollStatement() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState({
    year: "2024",
    month: "05"
  });
  const [selectedStatement, setSelectedStatement] = useState<typeof MOCK_PAYROLL_DATA[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 통계 데이터 계산
  const stats = useMemo(() => {
    const totalPay = MOCK_PAYROLL_DATA.reduce((acc, curr) => acc + curr.netPay, 0);
    const completedCount = MOCK_PAYROLL_DATA.filter(d => d.status === "지급완료").length;
    const pendingCount = MOCK_PAYROLL_DATA.filter(d => d.status === "대기").length;
    
    return [
      { label: "총 지급액", value: `₩${totalPay.toLocaleString()}`, icon: <FileText />, variant: "default" as const },
      { label: "지급 완료", value: `${completedCount}건`, icon: <CheckCircle2 />, variant: "mint" as const },
      { label: "대기/미지급", value: `${pendingCount}건`, icon: <Clock />, variant: "peach" as const },
    ];
  }, []);

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return MOCK_PAYROLL_DATA.filter(item => {
      const matchesSearch = item.employeeName.toLowerCase().includes(searchValue.toLowerCase());
      const matchesTab = activeTab === "all" || (activeTab === "completed" ? item.status === "지급완료" : item.status === "대기");
      return matchesSearch && matchesTab;
    });
  }, [searchValue, activeTab]);

  const columns = [
    { key: "employeeName", header: "직원명", sortable: true, render: (val: string, row: any) => (
      <div className="flex flex-col" >
        <span className="font-bold text-text-dark-grey" >{val}</span>
        <span className="text-[12px] text-text-grey-blue" >{row.position}</span>
      </div>
    )},
    { key: "paymentDate", header: "지급일", align: "center" as const },
    { key: "baseSalary", header: "기본급", align: "right" as const, render: (val: number) => `₩${val.toLocaleString()}` },
    { key: "allowance", header: "수당", align: "right" as const, render: (val: number) => `+ ₩${val.toLocaleString()}` },
    { key: "deduction", header: "공제", align: "right" as const, render: (val: number) => `- ₩${val.toLocaleString()}` },
    { key: "netPay", header: "실수령액", align: "right" as const, render: (val: number) => (
      <span className="font-bold text-primary-coral" >₩${val.toLocaleString()}</span>
    )},
    { key: "status", header: "상태", align: "center" as const, render: (val: string) => (
      <StatusBadge variant={val === "지급완료" ? "success" : "warning"} dot={true} label={val}/>
    )},
    { key: "actions", header: "액션", align: "center" as const, render: (_: any, row: any) => (
      <button 
        className="text-primary-coral hover:underline font-semibold text-Label" onClick={(e) => {
          e.stopPropagation();
          setSelectedStatement(row);
          setIsModalOpen(true);
        }}>
        상세보기
      </button>
    )}
  ];

  return (
    <AppLayout >
      <PageHeader title="급여 명세서" description="직원별 월간 급여 내역을 조회하고 명세서를 발급합니다." actions={
          <button className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white rounded-button text-Label font-bold hover:scale-[1.02] transition-all">
            <Printer size={16} />
            일괄 인쇄
          </button>
        }/>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl" >
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat}/>
        ))}
      </div>

      {/* 필터 및 목록 영역 */}
      <div className="space-y-md" >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-md" >
          <TabNav tabs={[
              { key: "all", label: "전체", count: MOCK_PAYROLL_DATA.length },
              { key: "completed", label: "지급완료", count: MOCK_PAYROLL_DATA.filter(d => d.status === "지급완료").length },
              { key: "pending", label: "대기", count: MOCK_PAYROLL_DATA.filter(d => d.status === "대기").length },
            ]} activeTab={activeTab} onTabChange={setActiveTab}/>
          
          <SearchFilter searchPlaceholder="직원명 검색..." searchValue={searchValue} onSearchChange={setSearchValue} filters={[
              {
                key: "year",
                label: "년도",
                type: "select",
                options: [
                  { value: "2024", label: "2024년" },
                  { value: "2023", label: "2023년" },
                ]
              },
              {
                key: "month",
                label: "월",
                type: "select",
                options: Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1).padStart(2, "0"),
                  label: `${i + 1}월`
                }))
              }
            ]} filterValues={filterValues} onFilterChange={(key, val) => setFilterValues(prev => ({ ...prev, [key]: val }))}/>
        </div>

        <DataTable columns={columns} data={filteredData} pagination={{
            page: 1,
            pageSize: 10,
            total: filteredData.length
          }} title={`${filterValues.year}년 ${filterValues.month}월 급여 지급 현황`} onDownloadExcel={() => alert("Excel 다운로드 준비 중")}/>
      </div>

      {/* 명세서 상세 모달 */}
      {isModalOpen && selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md" >
          <div className="w-full max-w-2xl bg-3 rounded-modal shadow-xl overflow-hidden animate-in zoom-in duration-200" >
            {/* 모달 헤더 */}
            <div className="p-xl border-b border-border-light flex justify-between items-center bg-bg-main-light-blue/20" >
              <div className="flex items-center gap-md" >
                <div className="w-xl h-xl bg-primary-coral rounded-full flex items-center justify-center text-white" >
                  <FileText size={24}/>
                </div>
                <div >
                  <h2 className="text-Heading 2 text-text-dark-grey" >급여 명세서 상세</h2>
                  <p className="text-Body 2 text-text-grey-blue" >{selectedStatement.paymentDate} 지급분</p>
                </div>
              </div>
              <button
                className="p-sm text-text-grey-blue hover:text-text-dark-grey transition-colors" onClick={() => setIsModalOpen(false)}>
                <X size={24}/>
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-xl space-y-lg max-h-[70vh] overflow-y-auto" >
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-lg p-lg bg-bg-soft-peach rounded-card-normal border border-primary-coral/10" >
                <div >
                  <label className="text-Label text-text-grey-blue" >직원명</label>
                  <p className="text-Heading 2 text-text-dark-grey font-bold" >{selectedStatement.employeeName}</p>
                  <p className="text-Body 2 text-primary-coral font-medium" >{selectedStatement.position}</p>
                </div>
                <div className="text-right" >
                  <label className="text-Label text-text-grey-blue" >지급상태</label>
                  <div className="mt-xs" >
                    <StatusBadge variant={selectedStatement.status === "지급완료" ? "success" : "warning"} label={selectedStatement.status}/>
                  </div>
                  <p className="mt-sm text-Body 2 text-text-grey-blue" >지급일: {selectedStatement.paymentDate}</p>
                </div>
              </div>

              {/* 지급/공제 상세 내역 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl" >
                {/* 지급 내역 */}
                <div className="space-y-md" >
                  <div className="flex items-center gap-xs text-secondary-mint" >
                    <Plus size={18}/>
                    <h4 className="text-Body 1 font-bold" >지급 내역</h4>
                  </div>
                  <div className="space-y-sm" >
                    {selectedStatement.earnings.map((item, idx) => (
                      <div className="flex justify-between items-center py-xs border-b border-border-light border-dashed" key={idx}>
                        <span className="text-Body 2 text-text-dark-grey" >{item.name}</span>
                        <span className="text-Body 2 font-medium" >₩{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-md" >
                      <span className="text-Body 1 font-bold text-text-dark-grey" >지급 총액</span>
                      <span className="text-Body 1 font-bold text-secondary-mint" >₩{(selectedStatement.baseSalary + selectedStatement.allowance).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 공제 내역 */}
                <div className="space-y-md" >
                  <div className="flex items-center gap-xs text-error" >
                    <Minus size={18}/>
                    <h4 className="text-Body 1 font-bold" >공제 내역</h4>
                  </div>
                  <div className="space-y-sm" >
                    {selectedStatement.deductions.map((item, idx) => (
                      <div className="flex justify-between items-center py-xs border-b border-border-light border-dashed" key={idx}>
                        <span className="text-Body 2 text-text-dark-grey" >{item.name}</span>
                        <span className="text-Body 2 font-medium text-error" >- ₩{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-md" >
                      <span className="text-Body 1 font-bold text-text-dark-grey" >공제 총액</span>
                      <span className="text-Body 1 font-bold text-error" >₩{selectedStatement.deduction.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 최종 실지급액 */}
              <div className="p-lg bg-bg-soft-mint rounded-card-normal border border-secondary-mint/10 flex justify-between items-center" >
                <div className="flex items-center gap-md" >
                  <div className="w-lg h-lg bg-secondary-mint rounded-full flex items-center justify-center text-white" >
                    <ArrowRight size={20}/>
                  </div>
                  <span className="text-Heading 2 text-text-dark-grey font-bold" >실지급액</span>
                </div>
                <div className="text-right" >
                  <p className="text-[28px] font-bold text-secondary-mint" >₩{selectedStatement.netPay.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="p-xl bg-bg-main-light-blue/10 border-t border-border-light flex justify-between items-center" >
              <div className="flex items-center gap-md" >
                <button className="flex items-center gap-xs px-md py-sm border border-border-light bg-3 rounded-button text-Label text-text-grey-blue hover:bg-bg-soft-peach hover:text-primary-coral transition-all" >
                  <Mail size={16}/>
                  이메일 발송
                </button>
                <button className="flex items-center gap-xs px-md py-sm border border-border-light bg-3 rounded-button text-Label text-text-grey-blue hover:bg-bg-soft-mint hover:text-secondary-mint transition-all" >
                  <Printer size={16}/>
                  명세서 출력
                </button>
              </div>
              <button
                className="px-xl py-sm bg-4 text-white rounded-button text-Label font-bold hover:bg-black transition-all" onClick={() => setIsModalOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
