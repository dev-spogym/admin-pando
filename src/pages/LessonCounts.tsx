import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Minus, Eye, Hash } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import TabNav from '@/components/TabNav';
import Modal from '@/components/Modal';
import type { BadgeVariant } from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';

// 상태 탭
const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'ACTIVE', label: '이용중' },
  { key: 'EXPIRED', label: '만료' },
  { key: 'PAUSED', label: '일시정지' },
];

// 상태 라벨/variant
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '이용중',
  EXPIRED: '만료',
  PAUSED: '일시정지',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  EXPIRED: 'error',
  PAUSED: 'warning',
};

interface LessonCount {
  id: number;
  memberId: number;
  memberName: string;
  productName: string;
  totalCount: number;
  usedCount: number;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

interface DeductionLog {
  id: number;
  deductedAt: string;
  note: string | null;
}

export default function LessonCounts() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [counts, setCounts] = useState<LessonCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  // 이력 모달 상태
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<LessonCount | null>(null);
  const [historyLogs, setHistoryLogs] = useState<DeductionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 횟수권 목록 조회 (members 조인으로 branchId 필터)
  const fetchCounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lesson_counts')
      .select(`
        id,
        memberId,
        productName,
        totalCount,
        usedCount,
        startDate,
        endDate,
        status,
        members!inner(name, branchId)
      `)
      .eq('members.branchId', branchId)
      .order('id', { ascending: false });

    if (!error && data) {
      setCounts(
        data.map((r: any) => ({
          id: r.id,
          memberId: r.memberId,
          memberName: r.members?.name ?? '-',
          productName: r.productName ?? '-',
          totalCount: r.totalCount ?? 0,
          usedCount: r.usedCount ?? 0,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status ?? 'ACTIVE',
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // 탭 + 검색 필터
  const filtered = useMemo(() => {
    let list = counts;
    if (activeTab !== 'all') list = list.filter((c) => c.status === activeTab);
    if (searchValue) {
      const q = searchValue.toLowerCase();
      list = list.filter(
        (c) =>
          c.memberName.toLowerCase().includes(q) ||
          c.productName.toLowerCase().includes(q)
      );
    }
    return list;
  }, [counts, activeTab, searchValue]);

  // 1회 차감
  const handleDeduct = async (row: LessonCount) => {
    if (row.usedCount >= row.totalCount) {
      toast.error('잔여 횟수가 없습니다.');
      return;
    }
    const newUsed = row.usedCount + 1;
    const { error } = await supabase
      .from('lesson_counts')
      .update({ usedCount: newUsed })
      .eq('id', row.id);

    if (error) {
      toast.error('차감에 실패했습니다.');
    } else {
      toast.success(`${row.memberName} - 1회 차감되었습니다. (잔여: ${row.totalCount - newUsed}회)`);
      fetchCounts();
    }
  };

  // 차감 이력 조회
  const handleViewHistory = async (row: LessonCount) => {
    setHistoryTarget(row);
    setHistoryOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('lesson_count_logs')
      .select('id, deductedAt, note')
      .eq('lessonCountId', row.id)
      .order('deductedAt', { ascending: false });
    setHistoryLogs(data ?? []);
    setHistoryLoading(false);
  };

  // 테이블 컬럼 정의
  const columns = [
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    { key: 'memberName', header: '회원명', render: (v: string) => <span className="font-medium text-content">{v}</span> },
    { key: 'productName', header: '상품명' },
    { key: 'totalCount', header: '총횟수', align: 'center' as const, render: (v: number) => `${v}회` },
    { key: 'usedCount', header: '사용횟수', align: 'center' as const, render: (v: number) => `${v}회` },
    {
      key: 'remainCount',
      header: '잔여횟수',
      align: 'center' as const,
      render: (_: any, row: LessonCount) => {
        const remain = row.totalCount - row.usedCount;
        return (
          <span className={remain <= 0 ? 'text-state-error font-semibold' : remain <= 3 ? 'text-amber-600 font-semibold' : 'text-content'}>
            {remain}회
          </span>
        );
      },
    },
    { key: 'startDate', header: '시작일', render: (v: string | null) => v ?? '-' },
    { key: 'endDate', header: '종료일', render: (v: string | null) => v ?? '-' },
    {
      key: 'status',
      header: '상태',
      render: (v: string) => (
        <StatusBadge variant={STATUS_VARIANT[v] ?? 'default'} label={STATUS_LABEL[v] ?? v} dot />
      ),
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (_: any, row: LessonCount) => (
        <div className="flex items-center justify-center gap-1">
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary-light text-primary text-[12px] font-medium hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={() => handleDeduct(row)}
            disabled={row.usedCount >= row.totalCount || row.status !== 'ACTIVE'}
            title="1회 차감"
          >
            <Minus size={12} />
            차감
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-line text-content-secondary text-[12px] hover:bg-surface-tertiary transition-colors"
            onClick={() => handleViewHistory(row)}
            title="이력 보기"
          >
            <Eye size={12} />
            이력
          </button>
        </div>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="횟수 관리"
        description="수강권 횟수를 관리하고 차감 이력을 확인합니다."
      />

      {/* 상태 탭 */}
      <div className="mb-md">
        <TabNav
          tabs={STATUS_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* 횟수권 목록 테이블 */}
      <DataTable
        title="수강권 목록"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="수강권 데이터가 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="회원명, 상품명 검색..."
      />

      {/* 차감 이력 모달 */}
      <Modal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`차감 이력 — ${historyTarget?.memberName ?? ''}`}
        size="md"
      >
        {historyLoading ? (
          <div className="flex items-center justify-center py-xl">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : historyLogs.length === 0 ? (
          <p className="text-center text-content-secondary text-[13px] py-lg">차감 이력이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-sm max-h-80 overflow-y-auto">
            {historyLogs.map((log, idx) => (
              <div key={log.id} className="flex items-center justify-between px-md py-sm bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-sm">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="text-[13px] text-content">{log.deductedAt ? log.deductedAt.slice(0, 16).replace('T', ' ') : '-'}</span>
                </div>
                {log.note && <span className="text-[12px] text-content-secondary">{log.note}</span>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
