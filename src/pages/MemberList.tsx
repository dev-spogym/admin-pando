import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Settings, 
  Send, 
  CheckCircle, 
  Star, 
  Download, 
  Printer, 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle,
  Search,
  MoreVertical
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import TabNav from '@/components/TabNav';
import SearchFilter from '@/components/SearchFilter';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

// --- Mock Data ---

const MOCK_STATS = [
  { label: '전체 회원', value: '1,284', icon: <Users size={20}/>, change: { value: 12, label: '지난달 대비' }, variant: 'default' as const },
  { label: '활성 회원', value: '942', icon: <UserCheck size={20}/>, change: { value: 5, label: '지난달 대비' }, variant: 'mint' as const },
  { label: '임박 회원', value: '48', icon: <Clock size={20}/>, change: { value: -2, label: '지난달 대비' }, variant: 'peach' as const },
  { label: '미등록/만료', value: '294', icon: <AlertTriangle size={20}/>, change: { value: 8, label: '지난달 대비' }, variant: 'default' as const },
];

const MAIN_TABS = [
  { key: 'members', label: '회원 목록', count: 1284 },
  { key: 'pass', label: '회원권 목록' },
  { key: 'lesson', label: '수강권 목록' },
  { key: 'locker', label: '락커 목록' },
  { key: 'uniform', label: '운동복 목록' },
  { key: 'product', label: '상품별 회원조회' },
];

const STATUS_TABS = [
  { key: 'all', label: '전체', count: 1284 },
  { key: 'active', label: '활성', count: 942 },
  { key: 'expired', label: '만료', count: 250 },
  { key: 'pending', label: '예정', count: 42 },
  { key: 'imminent', label: '임박', count: 48 },
  { key: 'holding', label: '홀딩', count: 15 },
  { key: 'unregistered', label: '미등록', count: 12 },
];

const MOCK_MEMBERS = [
  {
    id: 1,
    name: '김철수',
    gender: '남',
    birthDate: '1990-05-15',
    age: 34,
    phone: '010-1234-5678',
    status: 'active',
    statusLabel: '활성',
    tickets: [{ name: 'PT 20회', status: '사용중', expiry: '2026-12-31' }],
    rental: '락커(102호)',
    subscription: '프리미엄 플랜',
    lockerNo: '102',
    finalExpiryDate: '2026-12-31',
    remainingDays: 315,
    lastVisit: '2026-02-18',
    lastContract: '2026-01-05',
    firstRegDate: '2025-01-10',
    manager: '이지원',
    attendanceNo: '5678',
    company: '블루프린트소프트',
  },
  {
    id: 2,
    name: '이영희',
    gender: '여',
    birthDate: '1988-11-20',
    age: 36,
    phone: '010-9876-5432',
    status: 'imminent',
    statusLabel: '임박',
    tickets: [{ name: '헬스 3개월', status: '임박', expiry: '2026-02-28' }],
    rental: '운동복',
    subscription: '-',
    lockerNo: '-',
    finalExpiryDate: '2026-02-28',
    remainingDays: 9,
    lastVisit: '2026-02-19',
    lastContract: '2025-11-28',
    firstRegDate: '2025-05-20',
    manager: '김민수',
    attendanceNo: '5432',
    company: '-',
  },
  {
    id: 3,
    name: '박지성',
    gender: '남',
    birthDate: '1992-03-10',
    age: 32,
    phone: '010-5555-4444',
    status: 'expired',
    statusLabel: '만료',
    tickets: [{ name: '요가 10회', status: '만료', expiry: '2026-01-15' }],
    rental: '-',
    subscription: '-',
    lockerNo: '45',
    finalExpiryDate: '2026-01-15',
    remainingDays: -35,
    lastVisit: '2026-01-10',
    lastContract: '2025-10-15',
    firstRegDate: '2024-10-15',
    manager: '최유리',
    attendanceNo: '4444',
    company: 'JS스포츠',
  },
  {
    id: 4,
    name: '정수연',
    gender: '여',
    birthDate: '1995-07-22',
    age: 29,
    phone: '010-1111-2222',
    status: 'holding',
    statusLabel: '홀딩',
    tickets: [{ name: '필라테스 30회', status: '정지', expiry: '2026-08-20' }],
    rental: '-',
    subscription: '-',
    lockerNo: '-',
    finalExpiryDate: '2026-08-20',
    remainingDays: 182,
    lastVisit: '2026-02-01',
    lastContract: '2026-01-20',
    firstRegDate: '2026-01-20',
    manager: '이지원',
    attendanceNo: '2222',
    company: '-',
  },
  {
    id: 5,
    name: '한상우',
    gender: '남',
    birthDate: '1985-02-14',
    age: 39,
    phone: '010-3333-7777',
    status: 'pending',
    statusLabel: '예정',
    tickets: [{ name: '헬스 12개월', status: '대기', expiry: '2027-03-01' }],
    rental: '락커(205호)',
    subscription: '베이직 플랜',
    lockerNo: '205',
    finalExpiryDate: '2027-03-01',
    remainingDays: 375,
    lastVisit: '-',
    lastContract: '2026-02-15',
    firstRegDate: '2026-02-15',
    manager: '김민수',
    attendanceNo: '7777',
    company: '테크윈',
  },
];

const FILTER_CONFIG = [
  {
    key: 'memberType',
    label: '회원구분',
    type: 'select' as const,
    options: [
      { value: 'all', label: '전체' },
      { value: 'active', label: '유효회원' },
      { value: 'expired', label: '만료' },
      { value: 'holding', label: '기간정지' },
      { value: 'pending', label: '사용대기' },
    ],
  },
  {
    key: 'product',
    label: '계약상품',
    type: 'select' as const,
    options: [
      { value: 'all', label: '전체' },
      { value: 'pt', label: 'PT' },
      { value: 'health', label: '헬스' },
      { value: 'yoga', label: '요가' },
      { value: 'pilates', label: '필라테스' },
    ],
  },
  { key: 'expiryDate', label: '최종만료일', type: 'dateRange' as const },
  { key: 'visitDate', label: '최근방문일', type: 'dateRange' as const },
  {
    key: 'gender',
    label: '성별',
    type: 'select' as const,
    options: [
      { value: 'all', label: '전체' },
      { value: 'male', label: '남' },
      { value: 'female', label: '여' },
    ],
  },
];

// --- Main Component ---

export default function MemberList() {
  const [activeMainTab, setActiveMainTab] = useState('members');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState(new Set<number>());

  // Columns definition
  const columns = useMemo(() => [
    {
      key: 'status',
      header: '상태',
      width: 100,
      align: 'center' as const,
      render: (value: any, row: any) => {
        let variant: import('@/components/StatusBadge').BadgeVariant = 'default';
        if (row.status === 'active') variant = 'success';
        if (row.status === 'expired') variant = 'error';
        if (row.status === 'imminent') variant = 'warning';
        if (row.status === 'pending') variant = 'info';
        if (row.status === 'holding') variant = 'default';

        return <StatusBadge label={row.statusLabel} variant={variant} dot={true}/>;
      },
    },
    {
      key: 'name',
      header: '회원명',
      width: 120,
      render: (value: any, row: any) => (
        <button
          className="text-0 font-semibold hover:underline transition-all" onClick={() => moveToPage(985)}>
          {value}
        </button>
      ),
    },
    { key: 'gender', header: '성별', width: 80, align: 'center' as const },
    {
      key: 'age',
      header: '나이',
      width: 80,
      align: 'center' as const,
      sortable: true,
      render: (value: any) => <span className="text-Data-Monospace-Tabular" >{value}</span>
    },
    {
      key: 'phone',
      header: '연락처',
      width: 140,
      render: (value: any) => <span className="text-Data-Monospace-Tabular" >{value}</span>
    },
    {
      key: 'tickets',
      header: '보유 이용권',
      width: 200,
      render: (value: any) => (
        <div className="space-y-1" >
          {value.map((t: any, idx: any) => (
            <div className="text-[12px]" key={idx}>
              <span className="font-medium text-4" >{t.name}</span>
              <span className="text-5 ml-1" >({t.status})</span>
            </div>
          ))}
        </div>
      ),
    },
    { key: 'lockerNo', header: '락커', width: 80, align: 'center' as const, render: (v: any) => <span className="text-Data-Monospace-Tabular" >{v}</span> },
    {
      key: 'finalExpiryDate',
      header: '최종만료일',
      width: 120,
      sortable: true,
      render: (value: any) => <span className="text-Data-Monospace-Tabular" >{value}</span>
    },
    {
      key: 'remainingDays',
      header: '남은 일수',
      width: 100,
      align: 'right' as const,
      render: (value: any) => (
        <span className={cn("text-Data-Monospace-Tabular font-bold", value < 10 ? 'text-error' : 'text-5')} >
          {value > 0 ? `D-${value}` : value === 0 ? 'D-Day' : `만료 ${Math.abs(value)}일`}
        </span>
      ),
      sortable: true
    },
    {
      key: 'lastVisit',
      header: '최근방문일',
      width: 120,
      sortable: true,
      render: (value: any) => <span className="text-Data-Monospace-Tabular" >{value}</span>
    },
    { key: 'manager', header: '실적담당자', width: 100 },
    { key: 'company', header: '회사명', width: 150 },
  ], []);

  // Filter and Search Logic
  const filteredData = useMemo(() => {
    return MOCK_MEMBERS.filter(item => {
      // 1. Status Tab Filter (UI-010)
      if (activeStatusTab !== 'all' && item.status !== activeStatusTab) return false;
      
      // 2. Search Text Filter (UI-011) - 이름, 연락처
      if (searchValue) {
        const lowerSearch = searchValue.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(lowerSearch);
        const matchesPhone = item.phone.replace(/-/g, '').includes(lowerSearch.replace(/-/g, ''));
        if (!matchesName && !matchesPhone) return false;
      }
      
      // 3. Member Type Filter (UI-012)
      if (filterValues.memberType && filterValues.memberType !== 'all') {
        if (item.status !== filterValues.memberType) return false;
      }

      // 4. Product Filter (UI-013)
      if (filterValues.product && filterValues.product !== 'all') {
        const hasProduct = item.tickets.some(t => 
          t.name.toLowerCase().includes(filterValues.product.toLowerCase())
        );
        if (!hasProduct) return false;
      }

      // 5. Expiry Date Range Filter (UI-014)
      if (filterValues.expiryDateStart) {
        if (new Date(item.finalExpiryDate) < new Date(filterValues.expiryDateStart)) return false;
      }
      if (filterValues.expiryDateEnd) {
        if (new Date(item.finalExpiryDate) > new Date(filterValues.expiryDateEnd)) return false;
      }

      // 6. Visit Date Range Filter (UI-016)
      if (item.lastVisit !== '-') {
        if (filterValues.visitDateStart) {
          if (new Date(item.lastVisit) < new Date(filterValues.visitDateStart)) return false;
        }
        if (filterValues.visitDateEnd) {
          if (new Date(item.lastVisit) > new Date(filterValues.visitDateEnd)) return false;
        }
      } else if (filterValues.visitDateStart || filterValues.visitDateEnd) {
        return false;
      }

      // 7. Gender Filter (UI-019)
      if (filterValues.gender && filterValues.gender !== 'all') {
        const genderMap: Record<string, string> = { male: '남', female: '여' };
        if (item.gender !== genderMap[filterValues.gender]) return false;
      }

      return true;
    });
  }, [activeStatusTab, searchValue, filterValues]);

  const handleSelectRows = (selected: Set<number>) => {
    setSelectedRows(selected);
  };

  const handleAction = (type: string) => {
    const selectedCount = Array.from(selectedRows).length;
    
    if (type === '엑셀 다운로드') {
      alert(`현재 조회된 ${filteredData.length}건의 데이터를 엑셀로 다운로드합니다.`);
      return;
    }

    if (selectedCount === 0) {
      alert('회원을 먼저 선택해주세요.');
      return;
    }

    const selectedNames = Array.from(selectedRows).map(idx => filteredData[idx]?.name).filter(Boolean).join(', ');

    switch (type) {
      case '상태 변경':
        alert(`${selectedNames}님 외 ${selectedCount}명의 상태를 일괄 변경합니다.`);
        break;
      case '전송하기':
        alert(`${selectedNames}님에게 메시지 발송 팝업을 엽니다.`);
        break;
      case '출석 처리':
        alert(`${selectedNames}님의 오늘 날짜 출석 처리가 완료되었습니다.`);
        break;
      case '관심회원 변경':
        alert(`${selectedNames}님의 관심회원 설정이 변경되었습니다.`);
        break;
      default:
        alert(`${type} 처리를 진행합니다.`);
    }
  };

  return (
    <AppLayout >
      <div className="p-lg space-y-lg bg-2 min-h-screen transition-all duration-220 ease-spring" >
        {/* Page Header */}
        <PageHeader title="회원 목록" description="센터의 전체 회원 정보를 조회하고 관리합니다." actions={
            <div className="flex gap-sm">
              <button 
                className="bg-white text-5 border border-border-light px-md py-sm rounded-2 flex items-center gap-xs text-[14px] font-medium hover:bg-bg-main-light-blue hover:text-4 transition-all duration-220 ease-spring shadow-0"
                onClick={() => handleAction('엑셀 다운로드')}
              >
                <Download size={16} strokeWidth={2} /> 엑셀 다운로드
              </button>
              <button 
                className="bg-0 text-white px-md py-sm rounded-2 flex items-center gap-xs text-[14px] font-medium hover:translate-y-[-1px] hover:shadow-2 active:translate-y-0 transition-all duration-220 ease-spring"
                onClick={() => moveToPage(986)}
              >
                <UserPlus size={16} strokeWidth={2} /> 회원 추가
              </button>
            </div>
          }/>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md" >
          {MOCK_STATS.map((stat, idx) => (
            <StatCard key={idx} {...stat}/>
          ))}
        </div>

        {/* Main Tabs Area */}
        <div className="bg-white rounded-3 shadow-sm p-1 border border-border-light inline-flex" >
          <TabNav tabs={MAIN_TABS} activeTab={activeMainTab} onTabChange={setActiveMainTab}/>
        </div>

        {/* Search & Filter & Table Area */}
        <div className="bg-white rounded-3 shadow-card-soft overflow-hidden border border-border-light" >
          {/* Status Filter Tabs (UI-010) */}
          <div className="px-lg pt-lg border-b border-border-light bg-bg-main-light-blue/30" >
            <div className="flex gap-lg overflow-x-auto no-scrollbar" >
              {STATUS_TABS.map((tab) => (
                <button
                  className={`flex items-center gap-2 px-1 py-3 transition-all relative whitespace-nowrap text-[14px] font-bold ${
                    activeStatusTab === tab.key 
                    ? 'text-0' 
                    : 'text-5 hover:text-4'
                  }`} key={tab.key} onClick={() => setActiveStatusTab(tab.key)}>
                  {tab.label}
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-extrabold tabular-nums transition-colors ${
                    activeStatusTab === tab.key ? 'bg-0 text-white' : 'bg-7 text-5'
                  }`} >
                    {tab.count}
                  </span>
                  {activeStatusTab === tab.key && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-0 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Search Filter Bar */}
          <div className="p-lg border-b border-border-light bg-white" >
            <SearchFilter searchPlaceholder="회원명, 연락처 검색..." searchValue={searchValue} onSearchChange={setSearchValue} filters={FILTER_CONFIG} filterValues={filterValues} onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))} onReset={() => {
                setSearchValue('');
                setFilterValues({});
              }}/>
          </div>

          {/* Bulk Action Bar */}
          {selectedRows.size > 0 && (
            <div className="bg-0 text-white px-lg py-sm flex items-center justify-between animate-in slide-in-from-top duration-280 ease-spring" >
              <div className="flex items-center gap-md" >
                <span className="font-bold text-[14px]" >
                  {selectedRows.size}명 선택됨
                </span>
                <div className="h-4 w-[1px] bg-white/20" />
                <div className="flex gap-sm" >
                  <button className="text-white hover:bg-white/10 px-md py-1.5 rounded-md text-[13px] font-medium flex items-center gap-2 transition-colors" onClick={() => handleAction('상태 변경')}>
                    <Settings size={14} strokeWidth={2}/> 상태 변경
                  </button>
                  <button className="text-white hover:bg-white/10 px-md py-1.5 rounded-md text-[13px] font-medium flex items-center gap-2 transition-colors" onClick={() => handleAction('전송하기')}>
                    <Send size={14} strokeWidth={2}/> 전송하기
                  </button>
                  <button className="text-white hover:bg-white/10 px-md py-1.5 rounded-md text-[13px] font-medium flex items-center gap-2 transition-colors" onClick={() => handleAction('출석 처리')}>
                    <CheckCircle size={14} strokeWidth={2}/> 출석 처리
                  </button>
                  <button className="text-white hover:bg-white/10 px-md py-1.5 rounded-md text-[13px] font-medium flex items-center gap-2 transition-colors" onClick={() => handleAction('관심회원 변경')}>
                    <Star size={14} strokeWidth={2}/> 관심회원
                  </button>
                </div>
              </div>
              <button className="text-white/80 hover:text-white text-[13px] font-medium" onClick={() => setSelectedRows(new Set())}>
                선택 취소
              </button>
            </div>
          )}

          {/* Data Table */}
          <DataTable columns={columns} data={filteredData} selectable={true} selectedRows={selectedRows} onSelectRows={handleSelectRows} pagination={{
              page: 1,
              pageSize: 20,
              total: filteredData.length,
            }} emptyMessage={searchValue ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}/>
        </div>
      </div>
    </AppLayout>
  );
}
