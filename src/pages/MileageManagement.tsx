import React, { useState, useMemo, useEffect } from 'react';
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
  Save,
  AlertTriangle
} from 'lucide-react';
import { moveToPage } from '@/internal';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/exportExcel';
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
import { supabase } from '@/lib/supabase';

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// --- 날짜 유틸 ---
const TODAY = new Date().toISOString().slice(0, 10);

function getDaysUntil(dateStr: string): number {
  const today = new Date(TODAY);
  const target = new Date(dateStr);
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

// --- 요약 초기값 ---
const INITIAL_SUMMARY = {
  totalIssued: 0,
  totalUsed: 0,
  currentBalance: 0,
  monthlyEarned: 0,
};

// --- 기본 정책 초기값 ---
const DEFAULT_POLICY = {
  earnRate: 5,
  expiryMonths: 12,
  minUsage: 1000,
  maxUsagePerTx: 50000,
};

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
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-modal bg-surface p-lg shadow-card">
        <h2 className="text-Heading-2 font-bold mb-md">마일리지 {type} 처리</h2>
        <p className="text-Body-2 text-content-secondary mb-lg">
          회원: <span className="font-semibold text-content">{member?.name} ({member?.contact})</span>
        </p>

        <div className="space-y-md">
          {/* 처리 유형 */}
          <div>
            <label className="text-Label mb-xs block">처리 유형</label>
            <div className="flex gap-sm">
              <button
                className={cn(
                  "flex-1 py-sm px-md rounded-button border-[1px] flex items-center justify-center gap-xs transition-colors",
                  type === '적립' ? "bg-primary-light border-primary text-primary" : "bg-surface border-line text-content-secondary"
                )}
                onClick={() => setType('적립')}
              >
                <Plus size={16} /> 적립
              </button>
              <button
                className={cn(
                  "flex-1 py-sm px-md rounded-button border-[1px] flex items-center justify-center gap-xs transition-colors",
                  type === '차감' ? "bg-accent-light border-accent text-accent" : "bg-surface border-line text-content-secondary"
                )}
                onClick={() => setType('차감')}
              >
                <Minus size={16} /> 차감
              </button>
            </div>
          </div>

          {/* 마일리지 금액 */}
          <div>
            <label className="text-Label mb-xs block">마일리지 금액</label>
            <div className="relative">
              <input
                className="w-full rounded-input bg-surface-secondary border-none p-md pr-xl focus:ring-2 focus:ring-accent transition-all"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="금액을 입력하세요"
              />
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-content-secondary">P</span>
            </div>
          </div>

          {/* 사유 */}
          <div>
            <label className="text-Label mb-xs block">사유</label>
            <select
              className="w-full rounded-input bg-surface-secondary border-none p-md focus:ring-2 focus:ring-accent transition-all"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <option value="이벤트 보상">이벤트 보상</option>
              <option value="불만 보상">불만 보상</option>
              <option value="오류 수정">오류 수정</option>
              <option value="기타">기타</option>
            </select>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-Label mb-xs block">메모 (선택)</label>
            <textarea
              className="w-full rounded-input bg-surface-secondary border-none p-md h-[80px] focus:ring-2 focus:ring-accent transition-all resize-none"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="상세 내용을 입력하세요"
            />
          </div>
        </div>

        <div className="mt-xl flex gap-sm">
          <button
            className="flex-1 py-md rounded-button bg-surface-secondary text-content-secondary hover:bg-line transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="flex-1 py-md rounded-button bg-primary text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => {
              if (isProcessing) return;
              setIsProcessing(true);
              try {
                onConfirm({ type, amount: Number(amount), reason, memo });
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={!amount || isProcessing}
          >
            {isProcessing ? "처리 중..." : "처리 확인"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 만료 임박 뱃지 ---
function ExpiryBadge({ expiryDate }: { expiryDate: string }) {
  const days = getDaysUntil(expiryDate);
  if (days < 0) {
    return <span className="text-[11px] text-content-secondary line-through">{expiryDate} (만료)</span>;
  }
  if (days <= 30) {
    return (
      <div className="flex flex-col gap-[2px]">
        <span className="text-[11px] text-content">{expiryDate}</span>
        <span className={cn(
          "text-[10px] font-semibold flex items-center gap-[2px]",
          days <= 7 ? "text-state-error" : "text-amber-600"
        )}>
          <AlertTriangle size={10} />
          D-{days} 만료 임박
        </span>
      </div>
    );
  }
  return <span className="text-[11px] text-content">{expiryDate}</span>;
}

// --- Main View ---

export default function MileageManagement() {
  const [activeTab, setActiveTab] = useState('status');
  const [statusSearch, setStatusSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilters, setHistoryFilters] = useState({ type: '전체', dateRange: null });

  // Supabase 데이터 상태
  const [members, setMembers] = useState<any[]>([]);
  const [summary, setSummary] = useState(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, mileage')
        .eq('branchId', getBranchId());
      if (!error && data) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          contact: m.phone,
          earned: m.mileage ?? 0,
          used: 0,
          balance: m.mileage ?? 0,
          lastEarnedAt: '-',
          expiryDate: '-',
        }));
        setMembers(mapped);
        const totalBalance = mapped.reduce((sum: number, m: any) => sum + m.balance, 0);
        setSummary(prev => ({ ...prev, currentBalance: totalBalance }));
      }
      setIsLoading(false);
    };
    fetchMembers();
  }, []);

  // Modal states
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isPolicySaveDialogOpen, setIsPolicySaveDialogOpen] = useState(false);

  // 정책 설정 상태 (변경 감지용)
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [savedPolicy, setSavedPolicy] = useState(DEFAULT_POLICY);
  const isPolicyDirty = JSON.stringify(policy) !== JSON.stringify(savedPolicy);

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
          className="flex items-center gap-xs cursor-pointer group"
          onClick={() => moveToPage(985, { id: row.id })}
        >
          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <User size={14} />
          </div>
          <span className="font-medium group-hover:text-primary transition-colors">{val}</span>
        </div>
      )
    },
    {
      key: 'contact',
      header: '연락처',
      render: (val: string) => (
        <div className="flex items-center gap-xs text-content-secondary">
          <Smartphone size={14} />
          <span>{val}</span>
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
        <span className="font-bold text-primary">{val.toLocaleString()} P</span>
      )
    },
    { key: 'lastEarnedAt', header: '최근 적립일', align: 'center' as const },
    {
      key: 'expiryDate',
      header: '만료 예정일',
      align: 'center' as const,
      render: (val: string) => <ExpiryBadge expiryDate={val} />
    },
    {
      key: 'actions',
      header: '메뉴',
      align: 'center' as const,
      render: (_: any, row: any) => (
        <div className="flex items-center justify-center gap-sm">
          <button
            className="px-sm py-xs text-Label bg-primary-light text-primary rounded-button hover:bg-primary hover:text-white transition-all"
            onClick={() => {
              setSelectedMember(row);
              setIsManualModalOpen(true);
            }}
          >
            수동 처리
          </button>
          <button
            className="p-xs text-content-secondary hover:text-content transition-colors"
            onClick={() => setActiveTab('history')}
          >
            <History size={16} />
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
        <StatusBadge variant={val === '적립' ? 'peach' : val === '사용' ? 'mint' : 'default'} dot={true} label={val} />
      )
    },
    {
      key: 'amount',
      header: '마일리지',
      align: 'right' as const,
      render: (val: number) => (
        <span className={cn("font-medium", val > 0 ? "text-state-success" : "text-state-error")}>
          {val > 0 ? `+${val.toLocaleString()}` : val.toLocaleString()} P
        </span>
      )
    },
    { key: 'balance', header: '잔액', align: 'right' as const, render: (val: number) => `${val.toLocaleString()} P` },
    { key: 'reason', header: '사유' },
    { key: 'admin', header: '처리자', align: 'center' as const },
    {
      key: 'expiryDate',
      header: '만료 예정일',
      align: 'center' as const,
      render: (val: string) => <ExpiryBadge expiryDate={val} />
    },
  ], []);

  const handleManualAdjustment = (data: any) => {
    setIsManualModalOpen(false);
    setSelectedMember(null);
    toast.success(`${data.type} 처리가 완료되었습니다.`);
  };

  const handlePolicySave = () => {
    setSavedPolicy(policy);
    setIsPolicySaveDialogOpen(false);
    toast.success('정책이 성공적으로 저장되었습니다.');
  };

  return (
    <AppLayout>
      <div className="space-y-lg">
        {/* Page Header */}
        <PageHeader
          title="마일리지 관리"
          description="회원의 마일리지 적립 및 사용 이력을 관리하고 정책을 설정합니다."
          actions={
            <div className="flex gap-sm">
              <button
                className="flex items-center gap-xs px-md py-sm bg-surface border-[1px] border-line text-content-secondary rounded-button hover:bg-surface-secondary transition-colors"
                onClick={() => {
                  if (activeTab === 'status') {
                    const exportColumns = [
                      { key: 'name', header: '회원명' },
                      { key: 'contact', header: '연락처' },
                      { key: 'earned', header: '적립 마일리지' },
                      { key: 'used', header: '사용 마일리지' },
                      { key: 'balance', header: '잔액' },
                      { key: 'lastEarnedAt', header: '최근 적립일' },
                      { key: 'expiryDate', header: '만료일' },
                    ];
                    exportToExcel(members as Record<string, unknown>[], exportColumns, { filename: '마일리지현황' });
                    toast.success(`${members.length}건 엑셀 다운로드 완료`);
                  } else if (activeTab === 'history') {
                    const historyExportColumns = [
                      { key: 'createdAt', header: '처리일시' },
                      { key: 'name', header: '회원명' },
                      { key: 'type', header: '처리유형' },
                      { key: 'amount', header: '마일리지' },
                      { key: 'balance', header: '잔액' },
                      { key: 'reason', header: '사유' },
                      { key: 'admin', header: '처리자' },
                      { key: 'expiryDate', header: '만료 예정일' },
                    ];
                    exportToExcel([] as Record<string, unknown>[], historyExportColumns, { filename: '마일리지이력' });
                    toast.success('마일리지 이력 엑셀 다운로드 완료');
                  }
                }}
              >
                <Download size={18} />
                <span>엑셀 다운로드</span>
              </button>
            </div>
          }
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          <StatCard label="전체 발행 마일리지" value={summary.totalIssued.toLocaleString()} icon={<Coins className="text-primary" />} variant="peach" description="현재까지 누적 발행된 총액" />
          <StatCard label="전체 사용 마일리지" value={summary.totalUsed.toLocaleString()} icon={<ArrowDownRight className="text-accent" />} variant="mint" description="현재까지 사용 완료된 총액" />
          <StatCard label="잔여 마일리지" value={summary.currentBalance.toLocaleString()} icon={<ArrowUpRight className="text-information" />} description="현재 회원들이 보유 중인 총액" />
          <StatCard label="이번 달 적립" value={summary.monthlyEarned.toLocaleString()} icon={<CheckCircle2 className="text-state-success" />} description="당월 신규 적립된 마일리지" />
        </div>

        {/* Tab Navigation */}
        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          <TabNav
            className="border-b-[1px] border-line px-md pt-sm"
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="p-md">
            {activeTab === 'status' && (
              <div className="space-y-md">
                <SearchFilter
                  searchPlaceholder="회원명, 연락처, 회원번호 검색"
                  searchValue={statusSearch}
                  onSearchChange={setStatusSearch}
                  filters={[
                    {
                      key: 'sort',
                      label: '잔액 정렬',
                      type: 'select',
                      options: [
                        { value: 'high', label: '높은 순' },
                        { value: 'low', label: '낮은 순' },
                      ]
                    },
                    {
                      key: 'expiry',
                      label: '만료 임박',
                      type: 'select',
                      options: [
                        { value: '7', label: 'D-7 이내' },
                        { value: '30', label: 'D-30 이내' },
                      ]
                    }
                  ]}
                />
                <DataTable
                  columns={statusColumns}
                  data={members}
                  pagination={{ page: 1, pageSize: 20, total: members.length }}
                  title="회원별 마일리지 현황"
                />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-md">
                <SearchFilter
                  searchPlaceholder="회원명, 연락처 검색"
                  searchValue={historySearch}
                  onSearchChange={setHistorySearch}
                  filters={[
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
                  ]}
                  filterValues={historyFilters}
                  onFilterChange={(key, val) => setHistoryFilters(prev => ({ ...prev, [key]: val }))}
                />
                <DataTable
                  columns={historyColumns}
                  data={[]}
                  pagination={{ page: 1, pageSize: 20, total: 0 }}
                  title="전체 마일리지 이력"
                  emptyMessage="이력 데이터 없음"
                />
              </div>
            )}

            {activeTab === 'policy' && (
              <div className="max-w-4xl space-y-lg">
                {/* 변경 감지 배너 */}
                {isPolicyDirty && (
                  <div className="flex items-center justify-between p-md rounded-xl bg-amber-600/10 border border-amber-600/30 animate-in fade-in duration-300">
                    <div className="flex items-center gap-sm text-amber-600">
                      <AlertCircle size={16} />
                      <span className="text-Body-2 font-semibold">저장되지 않은 변경사항이 있습니다.</span>
                    </div>
                    <div className="flex gap-sm">
                      <button
                        className="px-md py-xs rounded-button border border-line text-content-secondary text-Body-2 hover:bg-surface transition-colors"
                        onClick={() => setPolicy(savedPolicy)}
                      >
                        되돌리기
                      </button>
                      <button
                        className="px-md py-xs rounded-button bg-amber-600 text-white text-Body-2 font-semibold hover:opacity-90 transition-opacity"
                        onClick={() => setIsPolicySaveDialogOpen(true)}
                      >
                        지금 저장
                      </button>
                    </div>
                  </div>
                )}

                <FormSection title="기본 적립 정책" description="결제 및 서비스 이용에 따른 자동 적립 규칙을 설정합니다.">
                  <div className="space-y-sm">
                    <label className="text-Label">기본 적립률 (%)</label>
                    <input
                      className="w-full rounded-input bg-surface-secondary border-none p-md focus:ring-2 focus:ring-accent outline-none transition-all"
                      type="number"
                      value={policy.earnRate}
                      onChange={e => setPolicy(prev => ({ ...prev, earnRate: Number(e.target.value) }))}
                    />
                    <p className="text-[12px] text-content-secondary">결제 금액의 일정 비율을 마일리지로 적립합니다.</p>
                  </div>
                  <div className="space-y-sm">
                    <label className="text-Label">마일리지 유효기간 (개월)</label>
                    <input
                      className="w-full rounded-input bg-surface-secondary border-none p-md focus:ring-2 focus:ring-accent outline-none transition-all"
                      type="number"
                      value={policy.expiryMonths}
                      onChange={e => setPolicy(prev => ({ ...prev, expiryMonths: Number(e.target.value) }))}
                    />
                    <p className="text-[12px] text-content-secondary">적립일로부터 해당 기간이 지나면 자동 소멸됩니다.</p>
                  </div>
                </FormSection>

                <FormSection title="사용 제한 설정" description="마일리지 사용 시 적용되는 최소/최대 기준을 설정합니다.">
                  <div className="space-y-sm">
                    <label className="text-Label">최소 사용 금액 (P)</label>
                    <input
                      className="w-full rounded-input bg-surface-secondary border-none p-md focus:ring-2 focus:ring-accent outline-none transition-all"
                      type="number"
                      value={policy.minUsage}
                      onChange={e => setPolicy(prev => ({ ...prev, minUsage: Number(e.target.value) }))}
                    />
                    <p className="text-[12px] text-content-secondary">마일리지를 사용하기 위한 최소 보유 및 사용 포인트입니다.</p>
                  </div>
                  <div className="space-y-sm">
                    <label className="text-Label">1회 최대 사용 제한 (P)</label>
                    <input
                      className="w-full rounded-input bg-surface-secondary border-none p-md focus:ring-2 focus:ring-accent outline-none transition-all"
                      type="number"
                      value={policy.maxUsagePerTx}
                      onChange={e => setPolicy(prev => ({ ...prev, maxUsagePerTx: Number(e.target.value) }))}
                    />
                    <p className="text-[12px] text-content-secondary">1회 결제 시 사용할 수 있는 최대 마일리지입니다.</p>
                  </div>
                </FormSection>

                <FormSection title="대상 상품 설정" description="적립 및 사용 대상에서 제외하거나 포함할 상품 범위를 지정합니다." columns={1}>
                  <div className="space-y-sm">
                    <label className="text-Label">사용 가능 상품</label>
                    <div className="p-md rounded-input bg-surface-secondary border-dashed border-2 border-line text-center text-content-secondary cursor-pointer hover:bg-surface transition-all">
                      + 상품 범위 추가 (수강권, PT, 락커 등)
                    </div>
                  </div>
                  <div className="space-y-sm">
                    <label className="text-Label">적립 제외 상품</label>
                    <div className="p-md rounded-input bg-surface-secondary border-dashed border-2 border-line text-center text-content-secondary cursor-pointer hover:bg-surface transition-all">
                      + 제외 상품 추가 (일일권, 특가 상품 등)
                    </div>
                  </div>
                </FormSection>

                <div className="flex justify-end pt-md">
                  <button
                    className={cn(
                      "flex items-center gap-xs px-xl py-md rounded-button shadow-md transition-all font-semibold",
                      isPolicyDirty
                        ? "bg-accent text-white hover:opacity-90 shadow-accent/20"
                        : "bg-line text-content-secondary cursor-not-allowed opacity-60"
                    )}
                    disabled={!isPolicyDirty}
                    onClick={() => isPolicyDirty && setIsPolicySaveDialogOpen(true)}
                  >
                    <Save size={18} />
                    <span>{isPolicyDirty ? '정책 저장하기' : '저장 완료'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <ManualAdjustmentModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        onConfirm={handleManualAdjustment}
      />

      <ConfirmDialog
        open={isPolicySaveDialogOpen}
        title="정책 변경 확인"
        description="마일리지 정책을 변경하시겠습니까? 변경된 정책은 이후 발생하는 적립/사용 건부터 즉시 적용됩니다."
        confirmLabel="저장"
        cancelLabel="취소"
        onConfirm={handlePolicySave}
        onCancel={() => setIsPolicySaveDialogOpen(false)}
      />
    </AppLayout>
  );
}
