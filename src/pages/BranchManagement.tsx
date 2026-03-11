
import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  Plus, 
  ArrowLeftRight, 
  MapPin, 
  Phone, 
  Calendar as CalendarIcon, 
  MoreHorizontal, 
  Download,
  BarChart3,
  PieChart,
  LineChart,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import SearchFilter from '@/components/SearchFilter';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function BranchManagement() {
  const [activeTab, setActiveTab] = useState('list');
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isMoveMemberOpen, setIsMoveMemberOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);

  // --- Mock Data ---
  const branches = [
    { id: 1, name: '스포짐 종각점', code: 'SG-001', address: '서울 종로구 종로 33', phone: '02-123-4567', members: 1250, staffs: 15, status: 'active', regDate: '2024-01-10' },
    { id: 2, name: '스포짐 강남점', code: 'SG-002', address: '서울 강남구 테헤란로 123', phone: '02-987-6543', members: 1840, staffs: 22, status: 'active', regDate: '2024-02-15' },
    { id: 3, name: '스포짐 여의도점', code: 'SG-003', address: '서울 영등포구 국제금융로 10', phone: '02-555-7777', members: 920, staffs: 12, status: 'active', regDate: '2024-05-20' },
    { id: 4, name: '스포짐 잠실점 (준비중)', code: 'SG-004', address: '서울 송파구 올림픽로 300', phone: '02-111-2222', members: 0, staffs: 5, status: 'inactive', regDate: '2025-01-01' },
  ];

  const movementHistory = [
    { id: 1, memberName: '홍길동', from: '종각점', to: '강남점', date: '2026-02-10', processor: '김관리' },
    { id: 2, memberName: '이영희', from: '강남점', to: '여의도점', date: '2026-02-12', processor: '이팀장' },
    { id: 3, memberName: '박철수', from: '여의도점', to: '종각점', date: '2026-02-15', processor: '최점장' },
  ];

  const integratedStats = [
    { branch: '종각점', members: 1250, sales: '45,000,000', attendance: '78%' },
    { branch: '강남점', members: 1840, sales: '72,000,000', attendance: '82%' },
    { branch: '여의도점', members: 920, sales: '38,000,000', attendance: '75%' },
    { branch: '잠실점', members: 0, sales: '0', attendance: '0%' },
  ];

  // --- Handlers ---
  const handleAddBranch = () => setIsAddBranchOpen(true);
  const handleMoveMember = () => setIsMoveMemberOpen(true);

  // --- Table Columns ---
  const branchColumns = [
    { key: 'id', header: 'No', width: 60, align: 'center' as const },
    { key: 'name', header: '지점명', sortable: true },
    { key: 'code', header: '지점 코드', width: 120 },
    { key: 'address', header: '주소' },
    { key: 'phone', header: '연락처', width: 140 },
    { key: 'members', header: '회원 수', width: 100, align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'staffs', header: '직원 수', width: 100, align: 'right' as const },
    { 
      key: 'status', 
      header: '상태', 
      width: 120, 
      align: 'center' as const,
      render: (v: string) => (
        <StatusBadge variant={v === 'active' ? 'success' : v === 'inactive' ? 'warning' : 'default'} dot={true} label={v === 'active' ? '운영중' : v === 'inactive' ? '임시휴업' : '폐점'}/>
      )
    },
    { key: 'regDate', header: '등록일', width: 120 },
    {
      key: 'actions',
      header: '메뉴',
      width: 150,
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex items-center gap-xs" >
          <button 
            className="text-text-grey-blue hover:text-primary-coral p-xs" onClick={() => {
              // 지점 상세/관리 컨텍스트 전환 (Mock)
              alert(`${row.name} 관리 모드로 전환합니다.`);
              moveToPage(966);
            }}>
            관리
          </button>
          <div className="w-[1px] h-3 bg-border-light" />
          <button className="text-text-grey-blue hover:text-primary-coral p-xs" >수정</button>
          <div className="w-[1px] h-3 bg-border-light" />
          <button 
            className="text-text-grey-blue hover:text-error p-xs" onClick={() => {
              setSelectedBranch(row);
              setIsConfirmOpen(true);
            }}>
            비활성
          </button>
        </div>
      )
    }
  ];

  const historyColumns = [
    { 
      key: 'memberName', 
      header: '회원명', 
      sortable: true,
      render: (v: string, row: any) => (
        <button 
          className="text-primary-coral hover:underline font-medium" onClick={() => moveToPage(985)}>
          {v}
        </button>
      )
    },
    { key: 'from', header: '원 지점' },
    { key: 'to', header: '이동 지점' },
    { key: 'date', header: '이동일', sortable: true },
    { key: 'processor', header: '처리자' },
  ];

  const integratedColumns = [
    { key: 'branch', header: '지점명' },
    { key: 'members', header: '회원 수', align: 'right' as const, render: (v: number) => v.toLocaleString() },
    { key: 'sales', header: '매출액 (원)', align: 'right' as const },
    { key: 'attendance', header: '평균 출석률', align: 'right' as const },
  ];

  return (
    <AppLayout >
      <PageHeader title="지점 관리 (멀티지점)" description="전체 지점의 운영 현황을 통합 관리하고 지점 간 데이터 이동을 처리합니다." actions={
          <div className="flex gap-sm">
            <button 
              className="flex items-center gap-xs px-md py-sm bg-bg-soft-peach text-primary-coral hover:bg-primary-coral hover:text-white transition-all rounded-button text-Label font-semibold"
              onClick={handleMoveMember}
            >
              <ArrowLeftRight size={16} />
              지점 이동 신청
            </button>
            <button 
              className="flex items-center gap-xs px-md py-sm bg-primary-coral text-white hover:opacity-90 transition-all rounded-button text-Label font-semibold"
              onClick={handleAddBranch}
            >
              <Plus size={16} />
              신규 지점 등록
            </button>
          </div>
        }/>

      <TabNav
        className="mb-lg" tabs={[
          { key: 'list', label: '지점 목록', icon: Building2 },
          { key: 'integrated', label: '통합 현황', icon: BarChart3 },
          { key: 'history', label: '지점 간 이동', icon: ArrowLeftRight },
        ]} activeTab={activeTab} onTabChange={setActiveTab}/>

      {/* --- TAB: 지점 목록 --- */}
      {activeTab === 'list' && (
        <div className="space-y-lg animate-in fade-in duration-300" >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md" >
            <StatCard label="총 지점 수" value="4개" icon={<Building2 />} variant="default"/>
            <StatCard label="총 회원 수" value="4,010명" icon={<Users />} change={{ value: 5.2, label: '지난달 대비' }} variant="mint"/>
            <StatCard label="이번 달 매출" value="1.55억" icon={<TrendingUp />} change={{ value: 12, label: '지난달 대비' }} variant="peach"/>
            <StatCard label="활성 지점" value="3개" icon={<CheckCircle2 />} description="1개 지점 준비 중" variant="default"/>
          </div>

          <SearchFilter searchPlaceholder="지점명 또는 주소 검색" filters={[
              { 
                key: 'status', 
                label: '상태', 
                type: 'select', 
                options: [
                  { value: 'active', label: '운영중' },
                  { value: 'inactive', label: '임시휴업' },
                  { value: 'closed', label: '폐점' }
                ] 
              }
            ]}/>

          <DataTable title="지점 현황 목록" columns={branchColumns} data={branches} onDownloadExcel={() => alert('Excel 다운로드를 시작합니다.')}/>
        </div>
      )}

      {/* --- TAB: 통합 현황 --- */}
      {activeTab === 'integrated' && (
        <div className="space-y-lg animate-in fade-in duration-300" >
          <div className="flex justify-between items-center" >
            <div className="flex items-center gap-sm p-sm bg-3 rounded-card-normal border border-border-light shadow-card-soft" >
              <button className="px-md py-xs bg-bg-soft-peach text-primary-coral rounded-button text-Label font-semibold" >월간</button>
              <button className="px-md py-xs text-text-grey-blue hover:text-text-dark-grey rounded-button text-Label" >주간</button>
              <button className="px-md py-xs text-text-grey-blue hover:text-text-dark-grey rounded-button text-Label" >연간</button>
            </div>
            <p className="text-Body 2 text-text-grey-blue" >기준: 2026.02.01 ~ 2026.02.19</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md" >
            {/* 지점별 매출 비교 (Bar) */}
            <div className="lg:col-span-2 p-lg bg-3 rounded-card-normal border border-border-light shadow-card-soft" >
              <div className="flex items-center justify-between mb-lg" >
                <h3 className="text-Heading 2 text-text-dark-grey flex items-center gap-xs" >
                  <BarChart3 className="text-primary-coral" size={20}/>
                  지점별 매출 비교
                </h3>
              </div>
              <div className="space-y-lg" >
                {integratedStats.map((item, idx) => (
                  <div className="space-y-xs" key={idx}>
                    <div className="flex justify-between text-Body 2" >
                      <span className="font-medium text-text-dark-grey" >{item.branch}</span>
                      <span className="text-text-grey-blue" >{item.sales}원</span>
                    </div>
                    <div className="h-2 w-full bg-bg-main-light-blue rounded-full overflow-hidden" >
                      <div 
                        className="h-full bg-primary-coral rounded-full" style={{ width: `${(parseInt(item.sales.replace(/,/g, '')) / 80000000) * 100}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 지점별 회원 비율 (Pie/Donut Mock) */}
            <div className="p-lg bg-3 rounded-card-normal border border-border-light shadow-card-soft" >
              <h3 className="text-Heading 2 text-text-dark-grey flex items-center gap-xs mb-lg" >
                <PieChart className="text-secondary-mint" size={20}/>
                지점별 회원 현황
              </h3>
              <div className="flex flex-col items-center justify-center h-[240px]" >
                <div className="relative w-40 h-40 rounded-full border-[12px] border-bg-main-light-blue flex items-center justify-center" >
                  <div className="absolute inset-[-12px] rounded-full border-[12px] border-primary-coral border-r-transparent border-b-transparent border-l-transparent rotate-[45deg]" />
                  <div className="absolute inset-[-12px] rounded-full border-[12px] border-secondary-mint border-t-transparent border-b-transparent border-l-transparent rotate-[-30deg]" />
                  <div className="text-center" >
                    <p className="text-Label text-text-grey-blue" >전체 회원</p>
                    <p className="text-Heading 2 font-bold text-text-dark-grey" >4,010</p>
                  </div>
                </div>
                <div className="mt-lg grid grid-cols-2 gap-sm w-full" >
                  <div className="flex items-center gap-xs" >
                    <div className="w-2 h-2 rounded-full bg-primary-coral" />
                    <span className="text-Label text-text-grey-blue" >강남점 (46%)</span>
                  </div>
                  <div className="flex items-center gap-xs" >
                    <div className="w-2 h-2 rounded-full bg-secondary-mint" />
                    <span className="text-Label text-text-grey-blue" >종각점 (31%)</span>
                  </div>
                  <div className="flex items-center gap-xs" >
                    <div className="w-2 h-2 rounded-full bg-information" />
                    <span className="text-Label text-text-grey-blue" >여의도점 (23%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DataTable title="지점별 상세 통합 통계" columns={integratedColumns} data={integratedStats} onDownloadExcel={() => alert('Excel 다운로드')}/>
        </div>
      )}

      {/* --- TAB: 지점 간 이동 --- */}
      {activeTab === 'history' && (
        <div className="space-y-lg animate-in fade-in duration-300" >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md" >
            <StatCard label="이달의 지점 이동" value="12건" icon={<ArrowLeftRight />} variant="default"/>
            <StatCard label="주요 유입 지점" value="강남점" icon={<UserPlus />} description="최근 30일 기준" variant="mint"/>
            <StatCard label="주요 유출 지점" value="여의도점" icon={<X size={24} />} description="거주지 이전 사유 80%" variant="default"/>
          </div>

          <SearchFilter searchPlaceholder="회원명 검색" filters={[
              { 
                key: 'dateRange', 
                label: '조회 기간', 
                type: 'dateRange'
              },
              {
                key: 'fromBranch',
                label: '출발 지점',
                type: 'select',
                options: branches.map(b => ({ value: b.name, label: b.name }))
              }
            ]}/>

          <DataTable title="회원 지점 이동 이력" columns={historyColumns} data={movementHistory}/>
        </div>
      )}

      {/* --- MODAL: 신규 지점 등록 --- */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
          <div className="w-full max-w-2xl bg-3 rounded-modal shadow-card-strong max-h-[90vh] overflow-y-auto" >
            <div className="p-xl border-b border-border-light flex justify-between items-center sticky top-0 bg-3 z-10" >
              <h2 className="text-Heading 2 text-text-dark-grey" >신규 지점 등록</h2>
              <button className="text-text-grey-blue hover:text-text-dark-grey" onClick={() => setIsAddBranchOpen(false)}>
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-xl space-y-lg" >
              <FormSection title="기본 정보" columns={2}>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >지점명 <span className="text-error" >*</span></label>
                  <input className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="예: 스포짐 광화문점"/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >지점 코드 <span className="text-error" >*</span></label>
                  <div className="flex gap-xs" >
                    <input className="flex-1 p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="SG-005" disabled={true}/>
                    <button className="px-md py-sm bg-bg-soft-mint text-secondary-mint text-Label font-semibold rounded-button whitespace-nowrap" >자동생성</button>
                  </div>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >대표 연락처 <span className="text-error" >*</span></label>
                  <input className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="02-000-0000"/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >지점 관리자 <span className="text-error" >*</span></label>
                  <select className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" >
                    <option value="">계정 선택</option>
                    <option value="owner1">김오너 (owner)</option>
                    <option value="owner2">박대표 (owner)</option>
                  </select>
                </div>
              </FormSection>

              <FormSection title="위치 및 운영 정보" columns={1}>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >주소 <span className="text-error" >*</span></label>
                  <div className="flex gap-xs" >
                    <input className="flex-1 p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="주소를 검색하세요" readOnly={true}/>
                    <button className="px-md py-sm bg-bg-main-light-blue text-text-dark-grey text-Label font-semibold rounded-button whitespace-nowrap" >주소검색</button>
                  </div>
                  <input className="w-full mt-sm p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="상세 주소를 입력하세요"/>
                </div>
                <div className="space-y-xs mt-md" >
                  <label className="text-Label text-text-grey-blue" >운영 시간 <span className="text-error" >*</span></label>
                  <div className="flex items-center gap-sm" >
                    <input className="flex-1 p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" type="time" defaultValue="06:00"/>
                    <span className="text-text-grey-blue" >~</span>
                    <input className="flex-1 p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" type="time" defaultValue="23:30"/>
                  </div>
                </div>
              </FormSection>

              <FormSection title="추가 설정" columns={1}>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >지점 로고</label>
                  <div className="border-2 border-dashed border-border-light rounded-card-normal p-xl flex flex-col items-center justify-center text-text-grey-blue hover:border-secondary-mint transition-colors cursor-pointer" >
                    <Plus size={32}/>
                    <span className="mt-sm text-Body 2" >이미지 업로드 (PNG, JPG)</span>
                  </div>
                </div>
                <div className="space-y-xs mt-md" >
                  <label className="text-Label text-text-grey-blue" >메모</label>
                  <textarea className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none min-h-[80px]" placeholder="지점 관련 특이사항을 입력하세요."/>
                </div>
              </FormSection>
            </div>

            <div className="p-xl border-t border-border-light flex justify-end gap-sm sticky bottom-0 bg-3" >
              <button className="px-lg py-sm text-text-grey-blue hover:bg-input-bg-light rounded-button transition-colors" onClick={() => setIsAddBranchOpen(false)}>취소</button>
              <button className="px-lg py-sm bg-primary-coral text-white font-semibold rounded-button shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all" >등록 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: 지점 이동 신청 --- */}
      {isMoveMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md" >
          <div className="w-full max-w-lg bg-3 rounded-modal shadow-card-strong" >
            <div className="p-xl border-b border-border-light flex justify-between items-center" >
              <h2 className="text-Heading 2 text-text-dark-grey" >회원 지점 이동 신청</h2>
              <button className="text-text-grey-blue hover:text-text-dark-grey" onClick={() => setIsMoveMemberOpen(false)}>
                <X size={24}/>
              </button>
            </div>
            
            <div className="p-xl space-y-lg" >
              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >회원 검색 <span className="text-error" >*</span></label>
                <div className="relative" >
                  <Search className="absolute left-md top-1/2 -translate-y-1/2 text-text-grey-blue w-sm h-sm" />
                  <input className="w-full pl-xl pr-md py-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" placeholder="회원명 또는 연락처 입력"/>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-md" >
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >현재 지점</label>
                  <input className="w-full p-sm bg-bg-main-light-blue rounded-input border border-transparent text-text-grey-blue" value="스포짐 종각점" disabled={true}/>
                </div>
                <div className="space-y-xs" >
                  <label className="text-Label text-text-grey-blue" >이동할 지점 <span className="text-error" >*</span></label>
                  <select className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" >
                    <option value="">지점 선택</option>
                    <option value="2">스포짐 강남점</option>
                    <option value="3">스포짐 여의도점</option>
                  </select>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >이동일 <span className="text-error" >*</span></label>
                <input className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none" type="date" defaultValue="2026-02-19"/>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >이용권 처리 <span className="text-error" >*</span></label>
                <div className="flex gap-md mt-xs" >
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-primary-coral" type="radio" name="pass-action" defaultChecked={true}/>
                    <span className="text-Body 2" >기존 이용권 유지</span>
                  </label>
                  <label className="flex items-center gap-xs cursor-pointer" >
                    <input className="accent-primary-coral" type="radio" name="pass-action"/>
                    <span className="text-Body 2" >신규 이용권 등록</span>
                  </label>
                </div>
              </div>

              <div className="space-y-xs" >
                <label className="text-Label text-text-grey-blue" >이동 사유</label>
                <textarea className="w-full p-sm bg-input-bg-light rounded-input border border-transparent focus:border-secondary-mint focus:outline-none min-h-[80px]" placeholder="이동 사유를 메모하세요."/>
              </div>
            </div>

            <div className="p-xl border-t border-border-light flex justify-end gap-sm" >
              <button className="px-lg py-sm text-text-grey-blue hover:bg-input-bg-light rounded-button transition-colors" onClick={() => setIsMoveMemberOpen(false)}>취소</button>
              <button className="px-lg py-sm bg-secondary-mint text-white font-semibold rounded-button shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all" >신청 완료</button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM: 지점 비활성화 --- */}
      <ConfirmDialog open={isConfirmOpen} title="지점 비활성화" description={`"${selectedBranch?.name}"을(를) 비활성화하시겠습니까?\n비활성화 시 해당 지점의 키오스크 및 앱 접근이 제한됩니다.`} confirmLabel="비활성화" variant="danger" onConfirm={() => {
          alert('지점이 비활성화되었습니다.');
          setIsConfirmOpen(false);
        }} onCancel={() => setIsConfirmOpen(false)}/>
    </AppLayout>
  );
}
