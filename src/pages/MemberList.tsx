import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserPlus,
  Settings,
  Send,
  CheckCircle,
  Star,
  Download,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
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

const MOCK_STATS = [
  { label: '전체 회원', value: '1,284', icon: <Users size={20} />, change: { value: 12, label: '지난달 대비' }, variant: 'default' as const },
  { label: '활성 회원', value: '942', icon: <UserCheck size={20} />, change: { value: 5, label: '지난달 대비' }, variant: 'mint' as const },
  { label: '임박 회원', value: '48', icon: <Clock size={20} />, change: { value: -2, label: '지난달 대비' }, variant: 'peach' as const },
  { label: '미등록/만료', value: '294', icon: <AlertTriangle size={20} />, change: { value: 8, label: '지난달 대비' }, variant: 'default' as const },
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
  { id: 1, name: '김철수', gender: '남', birthDate: '1990-05-15', age: 34, phone: '010-1234-5678', status: 'active', statusLabel: '활성', tickets: [{ name: 'PT 20회', status: '사용중', expiry: '2026-12-31' }], rental: '락커(102호)', subscription: '프리미엄 플랜', lockerNo: '102', finalExpiryDate: '2026-12-31', remainingDays: 315, lastVisit: '2026-02-18', lastContract: '2026-01-05', firstRegDate: '2025-01-10', manager: '이지원', attendanceNo: '5678', company: '블루프린트소프트' },
  { id: 2, name: '이영희', gender: '여', birthDate: '1988-11-20', age: 36, phone: '010-9876-5432', status: 'imminent', statusLabel: '임박', tickets: [{ name: '헬스 3개월', status: '임박', expiry: '2026-02-28' }], rental: '운동복', subscription: '-', lockerNo: '-', finalExpiryDate: '2026-02-28', remainingDays: 9, lastVisit: '2026-02-19', lastContract: '2025-11-28', firstRegDate: '2025-05-20', manager: '김민수', attendanceNo: '5432', company: '-' },
  { id: 3, name: '박지성', gender: '남', birthDate: '1992-03-10', age: 32, phone: '010-5555-4444', status: 'expired', statusLabel: '만료', tickets: [{ name: '요가 10회', status: '만료', expiry: '2026-01-15' }], rental: '-', subscription: '-', lockerNo: '45', finalExpiryDate: '2026-01-15', remainingDays: -35, lastVisit: '2026-01-10', lastContract: '2025-10-15', firstRegDate: '2024-10-15', manager: '최유리', attendanceNo: '4444', company: 'JS스포츠' },
  { id: 4, name: '정수연', gender: '여', birthDate: '1995-07-22', age: 29, phone: '010-1111-2222', status: 'holding', statusLabel: '홀딩', tickets: [{ name: '필라테스 30회', status: '정지', expiry: '2026-08-20' }], rental: '-', subscription: '-', lockerNo: '-', finalExpiryDate: '2026-08-20', remainingDays: 182, lastVisit: '2026-02-01', lastContract: '2026-01-20', firstRegDate: '2026-01-20', manager: '이지원', attendanceNo: '2222', company: '-' },
  { id: 5, name: '한상우', gender: '남', birthDate: '1985-02-14', age: 39, phone: '010-3333-7777', status: 'pending', statusLabel: '예정', tickets: [{ name: '헬스 12개월', status: '대기', expiry: '2027-03-01' }], rental: '락커(205호)', subscription: '베이직 플랜', lockerNo: '205', finalExpiryDate: '2027-03-01', remainingDays: 375, lastVisit: '-', lastContract: '2026-02-15', firstRegDate: '2026-02-15', manager: '김민수', attendanceNo: '7777', company: '테크윈' },
];

const FILTER_CONFIG = [
  { key: 'memberType', label: '회원구분', type: 'select' as const, options: [{ value: 'all', label: '전체' }, { value: 'active', label: '유효회원' }, { value: 'expired', label: '만료' }, { value: 'holding', label: '기간정지' }, { value: 'pending', label: '사용대기' }] },
  { key: 'product', label: '계약상품', type: 'select' as const, options: [{ value: 'all', label: '전체' }, { value: 'pt', label: 'PT' }, { value: 'health', label: '헬스' }, { value: 'yoga', label: '요가' }, { value: 'pilates', label: '필라테스' }] },
  { key: 'expiryDate', label: '최종만료일', type: 'dateRange' as const },
  { key: 'visitDate', label: '최근방문일', type: 'dateRange' as const },
  { key: 'gender', label: '성별', type: 'select' as const, options: [{ value: 'all', label: '전체' }, { value: 'male', label: '남' }, { value: 'female', label: '여' }] },
];

export default function MemberList() {
  const [activeMainTab, setActiveMainTab] = useState('members');
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState(new Set<number>());
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(searchValue); setCurrentPage(1); }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchValue]);

  const columns = useMemo(() => [
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (_: any, row: any) => {
        const v: Record<string, any> = { active: 'success', expired: 'error', imminent: 'warning', pending: 'info', holding: 'default' };
        return <StatusBadge label={row.statusLabel} variant={v[row.status] || 'default'} dot />;
      },
    },
    {
      key: 'name', header: '회원명', width: 110,
      render: (value: any) => (
        <button className="text-primary font-medium hover:underline transition-all text-[13px]" onClick={() => moveToPage(985)}>{value}</button>
      ),
    },
    { key: 'gender', header: '성별', width: 60, align: 'center' as const },
    { key: 'age', header: '나이', width: 60, align: 'center' as const, sortable: true, render: (v: any) => <span className="tabular-nums">{v}</span> },
    { key: 'phone', header: '연락처', width: 130, render: (v: any) => <span className="tabular-nums">{v}</span> },
    {
      key: 'tickets', header: '보유 이용권', width: 180,
      render: (value: any) => (
        <div className="space-y-[2px]">
          {value.map((t: any, idx: number) => (
            <div className="text-[12px]" key={idx}>
              <span className="font-medium text-content">{t.name}</span>
              <span className="text-content-secondary ml-1">({t.status})</span>
            </div>
          ))}
        </div>
      ),
    },
    { key: 'lockerNo', header: '락커', width: 60, align: 'center' as const, render: (v: any) => <span className="tabular-nums">{v}</span> },
    { key: 'finalExpiryDate', header: '최종만료일', width: 110, sortable: true, render: (v: any) => <span className="tabular-nums">{v}</span> },
    {
      key: 'remainingDays', header: '남은 일수', width: 90, align: 'right' as const, sortable: true,
      render: (value: any) => (
        <span className={cn("tabular-nums font-semibold text-[12px]", value < 10 ? 'text-state-error' : 'text-content-secondary')}>
          {value > 0 ? `D-${value}` : value === 0 ? 'D-Day' : `만료 ${Math.abs(value)}일`}
        </span>
      ),
    },
    { key: 'lastVisit', header: '최근방문일', width: 110, sortable: true, render: (v: any) => <span className="tabular-nums">{v}</span> },
    { key: 'manager', header: '담당자', width: 80 },
    { key: 'company', header: '회사명', width: 120 },
  ], []);

  const handleSort = (key: string, direction: 'asc' | 'desc') => { setSortKey(key); setSortDirection(direction); setCurrentPage(1); };

  const handleExcelDownload = () => {
    alert(`현재 조회된 ${filteredData.length}건의 데이터를 엑셀로 다운로드합니다.`);
  };

  const filteredData = useMemo(() => {
    let result = MOCK_MEMBERS.filter(item => {
      if (activeStatusTab !== 'all' && item.status !== activeStatusTab) return false;
      if (debouncedSearch) {
        const s = debouncedSearch.toLowerCase();
        if (!item.name.toLowerCase().includes(s) && !item.phone.replace(/-/g, '').includes(s.replace(/-/g, ''))) return false;
      }
      if (filterValues.memberType && filterValues.memberType !== 'all' && item.status !== filterValues.memberType) return false;
      if (filterValues.product && filterValues.product !== 'all' && !item.tickets.some(t => t.name.toLowerCase().includes(filterValues.product.toLowerCase()))) return false;
      if (filterValues.gender && filterValues.gender !== 'all') {
        const m: Record<string, string> = { male: '남', female: '여' };
        if (item.gender !== m[filterValues.gender]) return false;
      }
      return true;
    });
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortKey as keyof typeof a]; const bVal = b[sortKey as keyof typeof b];
        if (aVal == null) return 1; if (bVal == null) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [activeStatusTab, debouncedSearch, filterValues, sortKey, sortDirection]);

  const pagedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleAction = (type: string) => {
    if (selectedRows.size === 0) { alert('회원을 먼저 선택해주세요.'); return; }
    const names = Array.from(selectedRows).map(idx => filteredData[idx]?.name).filter(Boolean).join(', ');
    alert(`${names} - ${type} 처리를 진행합니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="회원 목록"
        description="센터의 전체 회원 정보를 조회하고 관리합니다."
        actions={
          <div className="flex gap-sm">
            <button className="bg-surface text-content-secondary border border-line px-md py-[6px] rounded-lg flex items-center gap-xs text-[13px] font-medium hover:bg-surface-tertiary transition-colors" onClick={handleExcelDownload}>
              <Download size={14} /> 엑셀 다운로드
            </button>
            <button className="bg-primary text-white px-md py-[6px] rounded-lg flex items-center gap-xs text-[13px] font-medium hover:bg-primary-dark transition-colors" onClick={() => moveToPage(986)}>
              <UserPlus size={14} /> 회원 추가
            </button>
          </div>
        }
      />

      {/* 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        {MOCK_STATS.map((stat, idx) => <StatCard key={idx} {...stat} />)}
      </div>

      {/* 메인 탭 */}
      <div className="mb-md">
        <TabNav tabs={MAIN_TABS} activeTab={activeMainTab} onTabChange={setActiveMainTab} />
      </div>

      {/* 테이블 영역 */}
      <div className="bg-surface rounded-xl border border-line overflow-hidden">
        {/* 상태 필터 탭 */}
        <div className="px-lg pt-md border-b border-line">
          <div className="flex gap-lg overflow-x-auto scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "flex items-center gap-[6px] pb-[10px] text-[13px] font-medium relative whitespace-nowrap transition-colors",
                  activeStatusTab === tab.key ? 'text-primary' : 'text-content-secondary hover:text-content'
                )}
                onClick={() => setActiveStatusTab(tab.key)}
              >
                {tab.label}
                <span className={cn(
                  "text-[10px] px-[6px] py-px rounded-full font-semibold tabular-nums",
                  activeStatusTab === tab.key ? 'bg-primary text-white' : 'bg-surface-tertiary text-content-secondary'
                )}>
                  {tab.count}
                </span>
                {activeStatusTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* 검색/필터 */}
        <div className="p-lg border-b border-line">
          <SearchFilter
            searchPlaceholder="회원명, 연락처 검색..."
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filters={FILTER_CONFIG}
            filterValues={filterValues}
            onFilterChange={(key, value) => { setFilterValues(prev => ({ ...prev, [key]: value })); setCurrentPage(1); }}
            onReset={() => { setSearchValue(''); setDebouncedSearch(''); setFilterValues({}); setCurrentPage(1); }}
          />
        </div>

        {/* 벌크 액션 바 */}
        {selectedRows.size > 0 && (
          <div className="bg-primary text-white px-lg py-sm flex items-center justify-between">
            <div className="flex items-center gap-md">
              <span className="text-[13px] font-semibold">{selectedRows.size}명 선택됨</span>
              <div className="h-3 w-px bg-white/20" />
              <div className="flex gap-sm">
                {[
                  { icon: Settings, label: '상태 변경' },
                  { icon: Send, label: '전송하기' },
                  { icon: CheckCircle, label: '출석 처리' },
                  { icon: Star, label: '관심회원' },
                ].map((action) => (
                  <button key={action.label} className="text-white/90 hover:text-white hover:bg-white/10 px-sm py-1 rounded-md text-[12px] font-medium flex items-center gap-[4px] transition-colors" onClick={() => handleAction(action.label)}>
                    <action.icon size={13} /> {action.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="text-white/70 hover:text-white text-[12px] font-medium" onClick={() => setSelectedRows(new Set())}>
              선택 취소
            </button>
          </div>
        )}

        {/* 테이블 */}
        <DataTable
          columns={columns}
          data={pagedData}
          selectable
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onSort={handleSort}
          sortConfig={sortKey ? { key: sortKey, direction: sortDirection } : undefined}
          pagination={{ page: currentPage, pageSize, total: filteredData.length, pageSizeOptions: [20, 50, 100] }}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          emptyMessage={debouncedSearch ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
        />
      </div>
    </AppLayout>
  );
}
