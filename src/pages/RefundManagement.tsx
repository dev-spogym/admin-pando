import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Download,
  RefreshCw,
  DollarSign,
  Hash,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import AppLayout from '@/components/AppLayout';
import { supabase } from '@/lib/supabase';
import { exportToExcel } from '@/lib/exportExcel';

// 환불 항목 타입
type RefundItem = {
  id: number;
  no: number;
  refundDate: string;
  memberName: string;
  memberId: number;
  productName: string;
  amount: number;
  method: string;
  reason: string;
  staffName: string;
  status: string;
};

// 로컬 날짜 포맷
const fmtLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// 상태별 배지 variant
const statusVariant = (status: string) => {
  if (status === '완료') return 'success' as const;
  if (status === '거절') return 'error' as const;
  if (status === '처리중') return 'warning' as const;
  return 'default' as const;
};

// 결제수단 한글 매핑
const METHOD_KO: Record<string, string> = {
  CARD: '카드',
  CASH: '현금',
  TRANSFER: '계좌이체',
  MILEAGE: '마일리지',
};

export default function RefundManagement() {
  const [refundData, setRefundData] = useState<RefundItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 날짜 필터 (이번달 기본)
  const today = new Date();
  const defaultStart = fmtLocal(new Date(today.getFullYear(), today.getMonth(), 1));
  const defaultEnd = fmtLocal(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [dateStart, setDateStart] = useState(defaultStart);
  const [dateEnd, setDateEnd] = useState(defaultEnd);

  // 환불 데이터 조회
  const fetchRefunds = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('refunds')
      .select('id, memberId, memberName, productName, amount, refundDate, method, reason, staffName, status, branchId')
      .eq('branchId', getBranchId())
      .order('refundDate', { ascending: false });

    if (dateStart) query = query.gte('refundDate', dateStart);
    if (dateEnd) query = query.lte('refundDate', dateEnd);

    const { data, error } = await query;
    setIsLoading(false);

    if (error) {
      console.error('환불 데이터 로드 실패:', error);
      toast.error('환불 데이터를 불러오지 못했습니다.');
      return;
    }
    if (data) {
      setRefundData(
        data.map((row: Record<string, unknown>, idx: number) => ({
          id: row.id as number,
          no: data.length - idx,
          refundDate: (row.refundDate as string)?.slice(0, 10) ?? '',
          memberName: (row.memberName as string) ?? '',
          memberId: (row.memberId as number) ?? 0,
          productName: (row.productName as string) ?? '',
          amount: Number(row.amount) || 0,
          method: METHOD_KO[(row.method as string) ?? ''] ?? (row.method as string) ?? '',
          reason: (row.reason as string) ?? '',
          staffName: (row.staffName as string) ?? '',
          status: (row.status as string) ?? '완료',
        }))
      );
    }
  }, [dateStart, dateEnd]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // 통계 집계
  const stats = useMemo(() => {
    const totalAmount = refundData.reduce((s, i) => s + i.amount, 0);
    const totalCount = refundData.length;
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;
    return { totalAmount, totalCount, avgAmount };
  }, [refundData]);

  // 엑셀 다운로드
  const handleDownloadExcel = () => {
    const exportColumns = [
      { key: 'refundDate', header: '환불일' },
      { key: 'memberName', header: '회원명' },
      { key: 'productName', header: '상품명' },
      { key: 'amount', header: '환불금액' },
      { key: 'method', header: '환불방법' },
      { key: 'reason', header: '사유' },
      { key: 'staffName', header: '처리자' },
      { key: 'status', header: '상태' },
    ];
    exportToExcel(refundData as Record<string, unknown>[], exportColumns, { filename: '환불관리' });
    toast.success(`${refundData.length}건 엑셀 다운로드 완료`);
  };

  // 날짜 프리셋 버튼
  const PRESETS = [
    { label: '이번달', start: defaultStart, end: defaultEnd },
    {
      label: '지난달',
      start: fmtLocal(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      end: fmtLocal(new Date(today.getFullYear(), today.getMonth(), 0)),
    },
    {
      label: '최근 3개월',
      start: fmtLocal(new Date(today.getFullYear(), today.getMonth() - 2, 1)),
      end: defaultEnd,
    },
  ];

  const [activePreset, setActivePreset] = useState('이번달');

  const handlePreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.label);
    setDateStart(preset.start);
    setDateEnd(preset.end);
  };

  // 테이블 컬럼
  const columns = [
    { key: 'no', header: 'No', width: 60, align: 'center' as const },
    { key: 'refundDate', header: '환불일', width: 130 },
    { key: 'memberName', header: '회원명', width: 120 },
    { key: 'productName', header: '상품명', width: 200 },
    {
      key: 'amount', header: '환불금액', width: 130, align: 'right' as const,
      render: (v: number) => (
        <span className="font-semibold tabular-nums text-state-error">₩{v.toLocaleString()}</span>
      ),
    },
    { key: 'method', header: '환불방법', width: 100, align: 'center' as const },
    {
      key: 'reason', header: '사유', width: 200,
      render: (val: string) => <span className="text-content-tertiary text-[12px]">{val}</span>,
    },
    { key: 'staffName', header: '처리자', width: 100 },
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (val: string) => (
        <StatusBadge variant={statusVariant(val)} dot>{val}</StatusBadge>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="환불 관리"
        description="환불 내역을 조회하고 관리합니다."
        actions={
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-xs px-md py-sm bg-surface border border-line text-content-secondary rounded-button text-[13px] font-semibold hover:bg-surface-tertiary transition-colors"
          >
            <Download size={15} />
            엑셀 다운로드
          </button>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-xl">
        <StatCard
          label="이번달 환불 총액"
          value={`₩${stats.totalAmount.toLocaleString()}`}
          variant="peach"
          icon={<DollarSign />}
        />
        <StatCard
          label="환불 건수"
          value={`${stats.totalCount}건`}
          icon={<Hash />}
        />
        <StatCard
          label="평균 환불액"
          value={`₩${stats.avgAmount.toLocaleString()}`}
          icon={<BarChart2 />}
        />
      </div>

      {/* 날짜 필터 */}
      <div className="bg-surface rounded-xl border border-line p-lg mb-lg flex flex-wrap items-center gap-md">
        {/* 프리셋 버튼 */}
        <div className="flex items-center gap-xs">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className={cn(
                'px-md py-xs rounded-button text-[13px] font-semibold border transition-all',
                activePreset === preset.label
                  ? 'bg-primary text-surface border-primary shadow-sm'
                  : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {/* 직접 입력 */}
        <div className="flex items-center gap-sm ml-auto">
          <input
            type="date"
            value={dateStart}
            onChange={e => { setDateStart(e.target.value); setActivePreset(''); }}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <span className="text-content-tertiary text-[13px]">~</span>
          <input
            type="date"
            value={dateEnd}
            onChange={e => { setDateEnd(e.target.value); setActivePreset(''); }}
            className="px-sm py-[5px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-all"
          />
          <button
            onClick={fetchRefunds}
            className="flex items-center gap-xs px-md py-[5px] bg-primary text-surface rounded-button text-[13px] font-semibold hover:bg-primary-dark transition-colors"
          >
            <RefreshCw size={13} />
            조회
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          columns={columns}
          data={refundData}
          loading={isLoading}
          pagination={{ page: 1, pageSize: 20, total: refundData.length }}
          emptyMessage="환불 내역이 없습니다."
        />
      </div>
    </AppLayout>
  );
}
