import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Download, 
  UserPlus, 
  LogOut, 
  MoveRight, 
  Ban, 
  History, 
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreVertical,
  User,
  Calendar as CalendarIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import TabNav from '@/components/TabNav';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import { SearchFilter } from '@/components/SearchFilter';
import ConfirmDialog from '@/components/ConfirmDialog';
import FormSection from '@/components/FormSection';

// --- Types ---
type LockerStatus = 'available' | 'in_use' | 'overtime' | 'abnormal' | 'disabled';
type LockerType = 'daily' | 'personal' | 'golf';

interface Locker {
  id: number;
  number: string;
  type: LockerType;
  status: LockerStatus;
  gender?: 'M' | 'F';
  userName: string | null;
  expiryDate: string | null;
}

// --- Mock Data ---
const GENERATE_LOCKERS = (type: LockerType, count: number, startNum: number = 1): Locker[] => {
  return Array.from({ length: count }).map((_, i) => {
    const num = (startNum + i).toString().padStart(3, '0');
    let status: LockerStatus = 'available';
    let userName = null;
    let expiryDate = null;

    // Randomize status for demo
    const rand = Math.random();
    if (rand > 0.7) {
      status = 'in_use';
      userName = ['홍길동', '김철수', '이영희', '박지성', '손흥민'][Math.floor(Math.random() * 5)];
      expiryDate = '2026-03-15';
    } else if (rand > 0.65) {
      status = 'overtime';
      userName = '과거형';
      expiryDate = '2026-02-10';
    } else if (rand > 0.62) {
      status = 'abnormal';
    } else if (rand > 0.6) {
      status = 'disabled';
    }

    return {
      id: Math.random(),
      number: num,
      type,
      status,
      userName,
      expiryDate,
      gender: type === 'daily' ? (startNum + i <= 88 ? 'M' : 'F') : undefined
    };
  });
};

const INITIAL_DAILY_LOCKERS = [
  ...GENERATE_LOCKERS('daily', 88, 1), // 남 88
  ...GENERATE_LOCKERS('daily', 116, 101) // 여 116
];

const INITIAL_PERSONAL_LOCKERS = GENERATE_LOCKERS('personal', 100, 1);
const INITIAL_GOLF_LOCKERS = GENERATE_LOCKERS('golf', 233, 1);

// --- Component ---
export default function LockerManagement() {
  const [activeTab, setActiveTab] = useState('daily');
  const [dailyLockers, setDailyLockers] = useState<Locker[]>(INITIAL_DAILY_LOCKERS);
  const [personalLockers, setPersonalLockers] = useState<Locker[]>(INITIAL_PERSONAL_LOCKERS);
  const [golfLockers, setGolfLockers] = useState<Locker[]>(INITIAL_GOLF_LOCKERS);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false);

  // Stats calculation
  const currentLockers = useMemo(() => {
    switch(activeTab) {
      case 'daily': return dailyLockers;
      case 'personal': return personalLockers;
      case 'golf': return golfLockers;
      default: return [];
    }
  }, [activeTab, dailyLockers, personalLockers, golfLockers]);

  const filteredLockers = useMemo(() => {
    if (!searchQuery) return currentLockers;
    return currentLockers.filter(l => 
      l.number.includes(searchQuery) || (l.userName?.includes(searchQuery))
    );
  }, [currentLockers, searchQuery]);

  const stats = useMemo(() => {
    const total = currentLockers.length;
    const inUse = currentLockers.filter(l => l.status === 'in_use').length;
    const available = currentLockers.filter(l => l.status === 'available').length;
    const overtime = currentLockers.filter(l => l.status === 'overtime').length;
    const abnormal = currentLockers.filter(l => l.status === 'abnormal').length;

    return { total, inUse, available, overtime, abnormal };
  }, [currentLockers]);

  const tabs = [
    { key: 'daily', label: '일일 사물함', count: 204 },
    { key: 'personal', label: '개인 사물함', count: 100 },
    { key: 'golf', label: '골프 사물함', count: 233 },
  ];

  const handleLockerClick = (locker: Locker) => {
    setSelectedLocker(locker);
    if (locker.status === 'available') {
      setIsAssignModalOpen(true);
    } else if (locker.status === 'in_use' || locker.status === 'overtime') {
      setIsReturnConfirmOpen(true);
    }
  };

  const handleAssign = () => {
    // Mock assign logic
    alert(`${selectedLocker?.number}번 사물함 배정 완료`);
    setIsAssignModalOpen(false);
    setSelectedLocker(null);
  };

  const handleReturn = () => {
    // Mock return logic
    alert(`${selectedLocker?.number}번 사물함 반납 처리 완료`);
    setIsReturnConfirmOpen(false);
    setSelectedLocker(null);
  };

  const renderLockerGrid = (lockers: Locker[], title?: string) => (
    <div className="mb-xl" >
      {title && <h3 className="text-Heading 2 text-text-dark-grey mb-md" >{title}</h3>}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-md" >
        {lockers.map((locker) => (
          <div
            className={cn(
              "relative aspect-square rounded-card-normal border-[1px] p-sm flex flex-col items-center justify-center cursor-pointer transition-all hover:shadow-md active:scale-95 select-none",
              locker.status === 'available' ? "bg-3 border-border-light text-text-dark-grey" :
              locker.status === 'in_use' ? "bg-bg-soft-mint border-secondary-mint text-secondary-mint" :
              locker.status === 'overtime' ? "bg-bg-soft-peach border-primary-coral text-primary-coral" :
              locker.status === 'abnormal' ? "bg-error/5 border-error text-error" :
              "bg-input-bg-light border-border-light text-text-grey-blue grayscale opacity-60"
            )} key={locker.id} onClick={() => handleLockerClick(locker)}>
            <span className="text-Label font-bold mb-[2px]" >{locker.number}</span>
            {locker.userName ? (
              <span 
                className="text-[10px] font-medium truncate w-full text-center hover:underline hover:text-secondary-mint transition-colors" onClick={(e) => {
                  e.stopPropagation();
                  moveToPage(985);
                }}>
                {locker.userName}
              </span>
            ) : (
              <span className="text-[10px] opacity-40" >빈 사물함</span>
            )}
            
            {locker.status === 'overtime' && (
              <div className="absolute top-1 right-1" >
                <Clock className="text-primary-coral animate-pulse" size={12}/>
              </div>
            )}
            {locker.status === 'abnormal' && (
              <div className="absolute top-1 right-1" >
                <AlertTriangle className="text-error" size={12}/>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout >
      <PageHeader title="사물함 관리" description="시설 내 일일, 개인, 골프 사물함의 이용 현황을 실시간으로 관리합니다." actions={
          <div className="flex gap-sm">
            <button 
              onClick={() => moveToPage(979)}
              className="flex items-center gap-xs px-md py-sm rounded-button border border-border-light bg-3 text-text-grey-blue hover:text-primary-coral transition-colors"
            >
              <MoveRight size={16} />
              <span className="text-Label">밴드/카드 관리</span>
            </button>
            <button className="flex items-center gap-xs px-md py-sm rounded-button border border-border-light bg-3 text-text-grey-blue hover:text-primary-coral transition-colors">
              <RefreshCw size={16} />
              <span className="text-Label">상태 동기화</span>
            </button>
            <button className="flex items-center gap-xs px-md py-sm rounded-button bg-secondary-mint text-white hover:opacity-90 transition-opacity">
              <Download size={16} />
              <span className="text-Label">엑셀 다운로드</span>
            </button>
          </div>
        }>
        <div className="flex items-center justify-between border-b border-border-light" >
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>
          <div className="text-Label text-text-grey-blue pr-md" >
            최종 갱신: 2026-02-19 14:30:05
          </div>
        </div>
      </PageHeader>

      <div className="space-y-xl" >
        {/* Stat Cards Area */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md" >
          <StatCard label="총 사물함" value={stats.total} icon={<MoreVertical />}/>
          <StatCard label="사용 가능" value={stats.available} variant="mint" icon={<CheckCircle2 />}/>
          <StatCard label="사용 중" value={stats.inUse} icon={<User />}/>
          <StatCard label="시간 초과" value={stats.overtime} variant="peach" icon={<Clock />}/>
          <StatCard className="border-error/20" label="상태 비정상" value={stats.abnormal} icon={<AlertTriangle />}/>
        </div>

        {/* Filters */}
        <SearchFilter searchPlaceholder="사물함 번호 또는 회원명 검색" searchValue={searchQuery} onSearchChange={setSearchQuery} filters={[
            {
              key: 'status',
              label: '상태',
              type: 'select',
              options: [
                { value: 'available', label: '사용 가능' },
                { value: 'in_use', label: '사용 중' },
                { value: 'overtime', label: '시간 초과' },
                { value: 'abnormal', label: '비정상' },
                { value: 'disabled', label: '사용 불가' },
              ]
            }
          ]}/>

        {/* Locker Grid Area */}
        <div className="bg-3 rounded-card-normal border border-border-light p-xl shadow-card-soft min-h-[500px]" >
          {activeTab === 'daily' ? (
            <>
              {renderLockerGrid(filteredLockers.filter(l => l.gender === 'M'), "남자 구역 (88개)")}
              <div className="border-t border-border-light my-xl" />
              {renderLockerGrid(filteredLockers.filter(l => l.gender === 'F'), "여자 구역 (116개)")}
            </>
          ) : (
            renderLockerGrid(filteredLockers)
          )}

          {filteredLockers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-xxl" >
              <Search className="text-text-grey-blue/20 mb-md" size={48}/>
              <p className="text-Body 1 text-text-grey-blue" >검색 결과가 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Bar (Floating at bottom if needed, but here simple footer style inside layout) */}
      <div className="fixed bottom-lg right-[80px] flex flex-col gap-sm" >
        <button className="w-[48px] h-[48px] rounded-full bg-primary-coral text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform" title="발급대기 목록">
          <History size={24}/>
        </button>
      </div>

      {/* Assign Modal (using ConfirmDialog for simplicity as requested, but customization needed) */}
      <ConfirmDialog open={isAssignModalOpen} title={`${selectedLocker?.number}번 사물함 배정`} description={`회원에게 사물함을 배정합니다. 아래 정보를 확인해주세요.`} confirmLabel="배정하기" onConfirm={handleAssign} onCancel={() => setIsAssignModalOpen(false)}>
        <div className="mt-md space-y-md" >
          <FormSection title="배정 정보" columns={1}>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >회원명</label>
              <input className="w-full rounded-input border border-border-light px-md py-sm text-Body 2" type="text" placeholder="이름을 입력하세요"/>
            </div>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >이용 기간</label>
              <div className="flex items-center gap-xs" >
                <input className="flex-1 rounded-input border border-border-light px-md py-sm text-Body 2" type="date" defaultValue="2026-02-19"/>
                <span >~</span>
                <input className="flex-1 rounded-input border border-border-light px-md py-sm text-Body 2" type="date" defaultValue="2026-03-19"/>
              </div>
            </div>
            <div className="space-y-sm" >
              <label className="text-Label text-text-grey-blue" >메모</label>
              <textarea className="w-full rounded-input border border-border-light px-md py-sm text-Body 2 h-[80px]" placeholder="특이사항 입력"/>
            </div>
          </FormSection>
        </div>
      </ConfirmDialog>

      {/* Return Confirm */}
      <ConfirmDialog open={isReturnConfirmOpen} title="사물함 반납 처리" description={`${selectedLocker?.userName} 회원의 ${selectedLocker?.number}번 사물함을 반납 처리하시겠습니까?\n반납 시 모든 배정 정보가 초기화됩니다.`} confirmLabel="반납 처리" variant="danger" onConfirm={handleReturn} onCancel={() => setIsReturnConfirmOpen(false)}/>
    </AppLayout>
  );
}
