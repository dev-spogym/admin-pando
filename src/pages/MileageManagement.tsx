import React, { useState, useMemo } from 'react';
import { 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  Settings, 
  Search, 
  Filter, 
  Download,
  Plus,
  Minus,
  Calendar as CalendarIcon,
  User,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Save
} from 'lucide-react';
import { moveToPage } from '@/internal';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import TabNav from '@/components/TabNav';
import SearchFilter from '@/components/SearchFilter';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';

// --- Mock Data ---

const MOCK_SUMMARY = {
  totalIssued: 12584000,
  totalUsed: 8420000,
  currentBalance: 4164000,
  monthlyEarned: 1250000,
};

const MOCK_MEMBERS = [
  { id: 1, name: '김민준', contact: '010-1234-5678', earned: 500000, used: 450000, balance: 50000, lastEarnedAt: '2026-02-18' },
  { id: 2, name: '이서연', contact: '010-2345-6789', earned: 300000, used: 100000, balance: 200000, lastEarnedAt: '2026-02-15' },
  { id: 3, name: '박지훈', contact: '010-3456-7890', earned: 150000, used: 0, balance: 150000, lastEarnedAt: '2026-02-10' },
  { id: 4, name: '최지우', contact: '010-4567-8901', earned: 800000, used: 750000, balance: 50000, lastEarnedAt: '2026-02-19' },
  { id: 5, name: '정하늘', contact: '010-5678-9012', earned: 200000, used: 50000, balance: 150000, lastEarnedAt: '2026-02-12' },
];

const MOCK_HISTORY = [
  { id: 101, createdAt: '2026-02-19 14:30', name: '최지우', type: '적립', amount: 5000, balance: 50000, reason: '결제 적립', admin: '자동' },
  { id: 102, createdAt: '2026-02-19 11:20', name: '김철수', type: '사용', amount: -10000, balance: 12000, reason: '수업 결제', admin: '시스템' },
  { id: 103, createdAt: '2026-02-18 16:45', name: '김민준', type: '적립', amount: 2000, balance: 50000, reason: '이벤트 보상', admin: '관리자' },
  { id: 104, createdAt: '2026-02-18 09:15', name: '이영희', type: '차감', amount: -5000, balance: 15000, reason: '오류 수정', admin: '관리자' },
  { id: 105, createdAt: '2026-02-17 18:00', name: '박지훈', type: '적립', amount: 10000, balance: 150000, reason: '결제 적립', admin: '자동' },
];

// --- Sub Components ---

const ManualAdjustmentModal = ({ 
  isOpen, 
  onClose, 
  member, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  member: any; 
  onConfirm: (data: any) => void 
}) => {
  const [type, setType] = useState<'적립' | '차감'>('적립');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('이벤트 보상');
  const [memo, setMemo] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" >
      <div className="w-full max-w-md rounded-modal bg-3 p-lg shadow-card-soft" >
        <h2 className="text-Heading 2 mb-md" >마일리지 {type} 처리</h2>
        <p className="text-Body 2 text-text-grey-blue mb-lg" >
          회원: <span className="font-semibold text-text-dark-grey" >{member?.name} ({member?.contact})</span>
        </p>

        <div className="space-y-md" >
          {/* 처리 유형 */}
          <div >
            <label className="text-Label mb-xs block" >처리 유형</label>
            <div className="flex gap-sm" >
              <button
                className={cn(
                  "flex-1 py-sm px-md rounded-button border-[1px] flex items-center justify-center gap-xs transition-colors",
                  type === '적립' ? "bg-bg-soft-peach border-primary-coral text-primary-coral" : "bg-3 border-border-light text-text-grey-blue"
                )} onClick={() => setType('적립')}>
                <Plus size={16}/> 적립
              </button>
              <button
                className={cn(
                  "flex-1 py-sm px-md rounded-button border-[1px] flex items-center justify-center gap-xs transition-colors",
                  type === '차감' ? "bg-bg-soft-mint border-secondary-mint text-secondary-mint" : "bg-3 border-border-light text-text-grey-blue"
                )} onClick={() => setType('차감')}>
                <Minus size={16}/> 차감
              </button>
            </div>
          </div>

          {/* 마일리지 금액 */}
          <div >
            <label className="text-Label mb-xs block" >마일리지 금액</label>
            <div className="relative" >
              <input
                className="w-full rounded-input bg-input-bg-light border-none p-md pr-xl focus:ring-2 focus:ring-secondary-mint transition-all" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="금액을 입력하세요"/>
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-text-grey-blue" >P</span>
            </div>
          </div>

          {/* 사유 */}
          <div >
            <label className="text-Label mb-xs block" >사유</label>
            <select
              className="w-full rounded-input bg-input-bg-light border-none p-md focus:ring-2 focus:ring-secondary-mint transition-all" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="이벤트 보상">이벤트 보상</option>
              <option value="불만 보상">불만 보상</option>
              <option value="오류 수정">오류 수정</option>
              <option value="기타">기타</option>
            </select>
          </div>

          {/* 메모 */}
          <div >
            <label className="text-Label mb-xs block" >메모 (선택)</label>
            <textarea
              className="w-full rounded-input bg-input-bg-light border-none p-md h-[80px] focus:ring-2 focus:ring-secondary-mint transition-all resize-none" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="상세 내용을 입력하세요"/>
          </div>
        </div>

        <div className="mt-xl flex gap-sm" >
          <button
            className="flex-1 py-md rounded-button bg-bg-main-light-blue text-text-grey-blue hover:bg-border-light transition-colors" onClick={onClose}>
            취소
          </button>
          <button
            className="flex-1 py-md rounded-button bg-primary-coral text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => onConfirm({ type, amount: Number(amount), reason, memo })} disabled={!amount}>
            처리 확인
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main View ---

export default function MileageManagement() {
  const [activeTab, setActiveTab] = useState('status');
  const [statusSearch, setStatusSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ type: '전체', dateRange: null });
  
  // Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isPolicySaveDialogOpen, setIsPolicySaveDialogOpen] = useState(false);

  const tabs = [
    { key: 'status', label: '마일리지 현황', icon: Coins },
    { key: 'history', label: '마일리지 이력', icon: History },
    { key: 'policy', label: '마일리지 정책', icon: Settings },
  ];

  const statusColumns = useMemo(() => [
    { key: 'no', header: 'No', width: 60, align: 'center' as const, render: (_: any, __: any, index: number) => index + 1 },
    { 
      key: 'name', 
      header: '회원명', 
      render: (val: string, row: any) => (
        <div 
          className="flex items-center gap-xs cursor-pointer group" onClick={() => moveToPage(985)}>
          <div className="w-8 h-8 rounded-full bg-bg-soft-peach flex items-center justify-center text-primary-coral group-hover:bg-primary-coral group-hover:text-white transition-colors" >
            <User size={14}/>
          </div>
          <span className="font-medium group-hover:text-primary-coral transition-colors" >{val}</span>
        </div>
      )
    },
    { 
      key: 'contact', 
      header: '연락처',
      render: (val: string) => (
        <div className="flex items-center gap-xs text-text-grey-blue" >
          <Smartphone size={14}/>
          <span >{val}</span>
        </div>
      )
    },
    { key: 'earned', header: '적립 마일리지', align: 'right' as const, render: (val: number) => `${val.toLocaleString()} P` },
    { key: 'used', header: '사용 마일리지', align: 'right' as const, render: (val: number) => `${val.toLocaleString()} P` },
    { 
      key: 'balance', 
      header: '잔여 마일리지', 
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-bold text-primary-coral" >{val.toLocaleString()} P</span>
      )
    },
    { key: 'lastEarnedAt', header: '최근 적립일', align: 'center' as const },
    { 
      key: 'actions', 
      header: '메뉴', 
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center gap-sm" >
          <button
            className="px-sm py-xs text-Label bg-bg-soft-peach text-primary-coral rounded-button hover:bg-primary-coral hover:text-white transition-all" onClick={() => {
              setSelectedMember(row);
              setIsManualModalOpen(true);
            }}>
            수동 처리
          </button>
          <button
            className="p-xs text-text-grey-blue hover:text-text-dark-grey transition-colors" onClick={() => setActiveTab('history')}>
            <History size={16}/>
          </button>
        </div>
      )
    },
  ], []);

  const historyColumns = useMemo(() => [
    { key: 'no', header: 'No', width: 60, align: 'center' as const, render: (_: any, __: any, index: number) => index + 1 },
    { key: 'createdAt', header: '처리일시', align: 'center' as const },
    { key: 'name', header: '회원명' },
    { 
      key: 'type', 
      header: '처리유형',
      align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={val === '적립' ? 'peach' : val === '사용' ? 'mint' : 'default'} dot={true} label={val}/>
      )
    },
    { 
      key: 'amount', 
      header: '마일리지', 
      align: 'right' as const,
      render: (val: number) => (
        <span className={cn("font-medium", val > 0 ? "text-success" : "text-error")} >
          {val > 0 ? `+${val.toLocaleString()}` : val.toLocaleString()} P
        </span>
      )
    },
    { key: 'balance', header: '잔액', align: 'right' as const, render: (val: number) => `${val.toLocaleString()} P` },
    { key: 'reason', header: '사유' },
    { key: 'admin', header: '처리자', align: 'center' as const },
  ], []);

  const handleManualAdjustment = (data: any) => {
    console.log('Adjustment processing:', data, 'for member:', selectedMember);
    setIsManualModalOpen(false);
    setSelectedMember(null);
    alert(`${data.type} 처리가 완료되었습니다.`);
  };

  const handlePolicySave = () => {
    setIsPolicySaveDialogOpen(false);
    alert('정책이 성공적으로 저장되었습니다.');
  };

  return (
    <AppLayout >
      <div className="space-y-lg" >
        {/* Page Header */}
        <PageHeader title="마일리지 관리" description="회원의 마일리지 적립 및 사용 이력을 관리하고 정책을 설정합니다." actions={
            <div className="flex gap-sm">
              <button 
                className="flex items-center gap-xs px-md py-sm bg-3 border-[1px] border-border-light text-text-grey-blue rounded-button hover:bg-bg-main-light-blue transition-colors"
                onClick={() => alert('엑셀 다운로드가 시작됩니다.')}
              >
                <Download size={18} />
                <span>엑셀 다운로드</span>
              </button>
            </div>
          }/>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md" >
          <StatCard label="전체 발행 마일리지" value={MOCK_SUMMARY.totalIssued.toLocaleString()} icon={<Coins className="text-primary-coral" />} variant="peach" description="현재까지 누적 발행된 총액"/>
          <StatCard label="전체 사용 마일리지" value={MOCK_SUMMARY.totalUsed.toLocaleString()} icon={<ArrowDownRight className="text-secondary-mint" />} variant="mint" description="현재까지 사용 완료된 총액"/>
          <StatCard label="잔여 마일리지" value={MOCK_SUMMARY.currentBalance.toLocaleString()} icon={<ArrowUpRight className="text-information" />} description="현재 회원들이 보유 중인 총액"/>
          <StatCard label="이번 달 적립" value={MOCK_SUMMARY.monthlyEarned.toLocaleString()} icon={<CheckCircle2 className="text-success" />} change={{ value: 12.5, label: "전월 대비" }} description="당월 신규 적립된 마일리지"/>
        </div>

        {/* Tab Navigation */}
        <div className="bg-3 rounded-card-normal shadow-card-soft overflow-hidden" >
          <TabNav 
            className="border-b-[1px] border-border-light px-md pt-sm" tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}/>

          <div className="p-md" >
            {activeTab === 'status' && (
              <div className="space-y-md" >
                <SearchFilter searchPlaceholder="회원명, 연락처, 회원번호 검색" searchValue={statusSearch} onSearchChange={setStatusSearch} filters={[
                    {
                      key: 'sort',
                      label: '잔액 정렬',
                      type: 'select',
                      options: [
                        { value: 'high', label: '높은 순' },
                        { value: 'low', label: '낮은 순' },
                      ]
                    }
                  ]}/>
                <DataTable columns={statusColumns} data={MOCK_MEMBERS} pagination={{ page: 1, pageSize: 20, total: 50 }} title="회원별 마일리지 현황"/>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-md" >
                <SearchFilter searchPlaceholder="회원명, 연락처 검색" searchValue={historySearch} onSearchChange={setHistorySearch} filters={[
                    {
                      key: 'dateRange',
                      label: '조회 기간',
                      type: 'dateRange',
                    },
                    {
                      key: 'type',
                      label: '처리 유형',
                      type: 'select',
                      options: [
                        { value: '전체', label: '전체' },
                        { value: '적립', label: '적립' },
                        { value: '차감', label: '차감' },
                        { value: '사용', label: '사용' },
                      ]
                    }
                  ]} filterValues={historyFilters} onFilterChange={(key, val) => setHistoryFilters(prev => ({ ...prev, [key]: val }))}/>
                <DataTable columns={historyColumns} data={MOCK_HISTORY} pagination={{ page: 1, pageSize: 20, total: 100 }} title="전체 마일리지 이력"/>
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="max-w-4xl space-y-lg" >
                <FormSection title="기본 적립 정책" description="결제 및 서비스 이용에 따른 자동 적립 규칙을 설정합니다.">
                  <div className="space-y-sm" >
                    <label className="text-Label" >기본 적립률 (%)</label>
                    <input 
                      className="w-full rounded-input bg-input-bg-light border-none p-md" type="number" defaultValue={5}/>
                    <p className="text-[12px] text-text-grey-blue" >결제 금액의 일정 비율을 마일리지로 적립합니다.</p>
                  </div>
                  <div className="space-y-sm" >
                    <label className="text-Label" >마일리지 유효기간 (개월)</label>
                    <input 
                      className="w-full rounded-input bg-input-bg-light border-none p-md" type="number" defaultValue={12}/>
                    <p className="text-[12px] text-text-grey-blue" >적립일로부터 해당 기간이 지나면 자동 소멸됩니다.</p>
                  </div>
                </FormSection>

                <FormSection title="사용 제한 설정" description="마일리지 사용 시 적용되는 최소/최대 기준을 설정합니다.">
                  <div className="space-y-sm" >
                    <label className="text-Label" >최소 사용 금액 (P)</label>
                    <input 
                      className="w-full rounded-input bg-input-bg-light border-none p-md" type="number" defaultValue={1000}/>
                    <p className="text-[12px] text-text-grey-blue" >마일리지를 사용하기 위한 최소 보유 및 사용 포인트입니다.</p>
                  </div>
                  <div className="space-y-sm" >
                    <label className="text-Label" >1회 최대 사용 제한 (P)</label>
                    <input 
                      className="w-full rounded-input bg-input-bg-light border-none p-md" type="number" defaultValue={50000}/>
                    <p className="text-[12px] text-text-grey-blue" >1회 결제 시 사용할 수 있는 최대 마일리지입니다.</p>
                  </div>
                </FormSection>

                <FormSection title="대상 상품 설정" description="적립 및 사용 대상에서 제외하거나 포함할 상품 범위를 지정합니다." columns={1}>
                  <div className="space-y-sm" >
                    <label className="text-Label" >사용 가능 상품</label>
                    <div className="p-md rounded-input bg-input-bg-light border-dashed border-2 border-border-light text-center text-text-grey-blue cursor-pointer hover:bg-3 transition-all" >
                      + 상품 범위 추가 (수강권, PT, 락커 등)
                    </div>
                  </div>
                  <div className="space-y-sm" >
                    <label className="text-Label" >적립 제외 상품</label>
                    <div className="p-md rounded-input bg-input-bg-light border-dashed border-2 border-border-light text-center text-text-grey-blue cursor-pointer hover:bg-3 transition-all" >
                      + 제외 상품 추가 (일일권, 특가 상품 등)
                    </div>
                  </div>
                </FormSection>

                <div className="flex justify-end pt-md" >
                  <button
                    className="flex items-center gap-xs px-xl py-md bg-secondary-mint text-white rounded-button shadow-md hover:opacity-90 transition-opacity" onClick={() => setIsPolicySaveDialogOpen(true)}>
                    <Save size={18}/>
                    <span className="font-semibold" >정책 저장하기</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ManualAdjustmentModal isOpen={isManualModalOpen} onClose={() => {
          setIsManualModalOpen(false);
          setSelectedMember(null);
        }} member={selectedMember} onConfirm={handleManualAdjustment}/>

      <ConfirmDialog open={isPolicySaveDialogOpen} title="정책 변경 확인" description="마일리지 정책을 변경하시겠습니까? 변경된 정책은 이후 발생하는 적립/사용 건부터 즉시 적용됩니다." confirmLabel="저장" cancelLabel="취소" onConfirm={handlePolicySave} onCancel={() => setIsPolicySaveDialogOpen(false)}/>
    </AppLayout>
  );
}
