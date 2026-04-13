import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Minus, Eye, Hash, Users, CheckCircle, Pencil } from 'lucide-react';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import TabNav from "@/components/common/TabNav";
import Modal from "@/components/ui/Modal";
import type { BadgeVariant } from "@/components/common/StatusBadge";
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
  lessonName: string | null;
  note: string | null;
}

// 회원 목록 (필터용)
interface MemberOption {
  id: number;
  name: string;
}

export default function LessonCounts() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;

  const [counts, setCounts] = useState<LessonCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');

  // 세션 필터 상태
  const [filterMemberId, setFilterMemberId] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);

  // 이력 모달 상태
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<LessonCount | null>(null);
  const [historyLogs, setHistoryLogs] = useState<DeductionLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 세션 상세 뷰 모달
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionTarget, setSessionTarget] = useState<LessonCount | null>(null);

  // 횟수 조정 모달 상태
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<LessonCount | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustCount, setAdjustCount] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustConfirm, setAdjustConfirm] = useState(false);
  const [adjustLoading, setAdjustLoading] = useState(false);

  // 횟수권 목록 조회 (members 조인으로 branchId 필터)
  const fetchCounts = async () => {
    setLoading(true);
    let query = supabase
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
        members(name, branchId)
      `)
      .order('id', { ascending: false });

    if (filterMemberId) query = query.eq('memberId', Number(filterMemberId));
    if (filterProduct) query = query.ilike('productName', `%${filterProduct}%`);
    if (filterStartDate) query = query.gte('startDate', filterStartDate);
    if (filterEndDate) query = query.lte('endDate', filterEndDate);

    const { data, error } = await query;

    if (!error && data) {
      setCounts(
        (data as any[])
          .filter((r) => !r.members || r.members.branchId === branchId)
          .map((r: any) => ({
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

  // 회원 목록 조회 (필터 드롭다운용)
  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, name')
      .eq('branchId', branchId)
      .order('name');
    if (data) setMemberOptions(data as MemberOption[]);
  };

  useEffect(() => {
    fetchCounts();
    fetchMembers();
  }, []);

  // 통계
  const stats = useMemo(() => {
    const total = counts.length;
    const active = counts.filter((c) => c.status === 'ACTIVE').length;
    const totalRemain = counts
      .filter((c) => c.status === 'ACTIVE')
      .reduce((s, c) => s + (c.totalCount - c.usedCount), 0);
    return { total, active, totalRemain };
  }, [counts]);

  // 탭 + 검색 필터 (클라이언트 측)
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

  // 고유 상품명 목록 (필터 옵션)
  const productOptions = useMemo(() => {
    return Array.from(new Set(counts.map((c) => c.productName))).sort();
  }, [counts]);

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

  // 조정 모달 열기
  const handleOpenAdjust = (row: LessonCount) => {
    setAdjustTarget(row);
    setAdjustType('add');
    setAdjustCount(1);
    setAdjustReason('');
    setAdjustConfirm(false);
    setAdjustOpen(true);
  };

  // 조정 적용
  const handleAdjustApply = async () => {
    if (!adjustTarget || !adjustReason.trim()) return;
    if (!adjustConfirm) {
      setAdjustConfirm(true);
      return;
    }
    setAdjustLoading(true);
    const delta = adjustType === 'add' ? adjustCount : -adjustCount;
    const newUsed = adjustType === 'add'
      ? adjustTarget.usedCount - adjustCount  // 추가 = usedCount 감소 (잔여 증가)
      : adjustTarget.usedCount + adjustCount; // 차감 = usedCount 증가 (잔여 감소)

    if (newUsed < 0) {
      toast.error('사용 횟수가 0 미만이 될 수 없습니다.');
      setAdjustLoading(false);
      return;
    }
    if (newUsed > adjustTarget.totalCount) {
      toast.error('사용 횟수가 총 횟수를 초과할 수 없습니다.');
      setAdjustLoading(false);
      return;
    }

    const { error } = await supabase
      .from('lesson_counts')
      .update({ usedCount: newUsed })
      .eq('id', adjustTarget.id);

    if (error) {
      toast.error('횟수 조정에 실패했습니다.');
    } else {
      const remain = adjustTarget.totalCount - newUsed;
      toast.success(`${adjustTarget.memberName} - ${adjustType === 'add' ? `${adjustCount}회 추가` : `${adjustCount}회 차감`} 완료 (잔여: ${remain}회)`);
      setAdjustOpen(false);
      fetchCounts();
    }
    setAdjustLoading(false);
  };

  // 차감 이력 조회
  const handleViewHistory = async (row: LessonCount) => {
    setHistoryTarget(row);
    setHistoryOpen(true);
    setHistoryLoading(true);
    const { data } = await supabase
      .from('lesson_count_logs')
      .select('id, deductedAt, lessonName, note')
      .eq('lessonCountId', row.id)
      .order('deductedAt', { ascending: false });
    setHistoryLogs((data ?? []) as DeductionLog[]);
    setHistoryLoading(false);
  };

  // 세션 상세 보기
  const handleViewSession = (row: LessonCount) => {
    setSessionTarget(row);
    setSessionOpen(true);
  };

  // 필터 초기화
  const handleResetFilter = () => {
    setFilterMemberId('');
    setFilterProduct('');
    setFilterStartDate('');
    setFilterEndDate('');
    setTimeout(fetchCounts, 0);
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
        const pct = row.totalCount > 0 ? Math.round((remain / row.totalCount) * 100) : 0;
        const barColor = pct <= 20 ? 'bg-red-500' : pct <= 50 ? 'bg-amber-500' : 'bg-green-500';
        const textColor = remain <= 0 ? 'text-state-error' : remain <= 3 ? 'text-amber-600' : 'text-content';
        return (
          <div className="flex flex-col items-center gap-[3px] min-w-[70px]">
            <span className={`font-semibold text-[12px] ${textColor}`}>{remain}회</span>
            <div className="w-full h-[5px] bg-surface-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
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
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-amber-300 text-amber-600 text-[12px] hover:bg-amber-50 transition-colors"
            onClick={() => handleOpenAdjust(row)}
            title="횟수 조정"
          >
            <Pencil size={12} />
            조정
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 rounded-md border border-line text-content-secondary text-[12px] hover:bg-surface-tertiary transition-colors"
            onClick={() => handleViewSession(row)}
            title="세션 상세"
          >
            <Hash size={12} />
            세션
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
        description="수강권 횟수를 관리하고 세션별 차감 이력을 확인합니다."
      />

      {/* 통계 카드 */}
      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="전체 수강권" value={stats.total} icon={<Hash />} />
        <StatCard label="이용중" value={stats.active} icon={<CheckCircle />} variant="mint" />
        <StatCard label="잔여 세션 합계" value={`${stats.totalRemain}회`} icon={<Users />} variant="peach" />
      </StatCardGrid>

      {/* 필터 영역 */}
      <div className="bg-surface border border-line rounded-xl p-md mb-md flex flex-wrap gap-md items-end">
        {/* 회원 필터 */}
        <div className="flex flex-col gap-xs min-w-[140px]">
          <label className="text-[11px] font-medium text-content-secondary">회원</label>
          <select
            className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            value={filterMemberId}
            onChange={(e) => setFilterMemberId(e.target.value)}
          >
            <option value="">전체 회원</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={String(m.id)}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* 상품 필터 */}
        <div className="flex flex-col gap-xs min-w-[140px]">
          <label className="text-[11px] font-medium text-content-secondary">상품</label>
          <select
            className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          >
            <option value="">전체 상품</option>
            {productOptions.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* 시작일 필터 */}
        <div className="flex flex-col gap-xs min-w-[120px]">
          <label className="text-[11px] font-medium text-content-secondary">시작일 이후</label>
          <input
            type="date"
            className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </div>

        {/* 종료일 필터 */}
        <div className="flex flex-col gap-xs min-w-[120px]">
          <label className="text-[11px] font-medium text-content-secondary">종료일 이전</label>
          <input
            type="date"
            className="px-2 py-1.5 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </div>

        <div className="flex gap-sm">
          <button
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors"
            onClick={fetchCounts}
          >
            조회
          </button>
          <button
            className="px-3 py-1.5 border border-line text-content-secondary rounded-lg text-[12px] hover:bg-surface-tertiary transition-colors"
            onClick={handleResetFilter}
          >
            초기화
          </button>
        </div>
      </div>

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

      {/* 세션 상세 모달 */}
      <Modal
        isOpen={sessionOpen}
        onClose={() => setSessionOpen(false)}
        title={`세션 현황 — ${sessionTarget?.memberName ?? ''}`}
        size="md"
      >
        {sessionTarget && (
          <div className="flex flex-col gap-md">
            {/* 요약 */}
            <div className="grid grid-cols-3 gap-sm">
              <div className="flex flex-col items-center p-sm bg-surface-secondary rounded-lg">
                <span className="text-[20px] font-bold text-content">{sessionTarget.totalCount}</span>
                <span className="text-[11px] text-content-tertiary mt-0.5">총 횟수</span>
              </div>
              <div className="flex flex-col items-center p-sm bg-surface-secondary rounded-lg">
                <span className="text-[20px] font-bold text-primary">{sessionTarget.usedCount}</span>
                <span className="text-[11px] text-content-tertiary mt-0.5">사용 횟수</span>
              </div>
              <div className="flex flex-col items-center p-sm bg-surface-secondary rounded-lg">
                <span className={`text-[20px] font-bold ${sessionTarget.totalCount - sessionTarget.usedCount <= 0 ? 'text-state-error' : sessionTarget.totalCount - sessionTarget.usedCount <= 3 ? 'text-amber-600' : 'text-state-success'}`}>
                  {sessionTarget.totalCount - sessionTarget.usedCount}
                </span>
                <span className="text-[11px] text-content-tertiary mt-0.5">잔여 횟수</span>
              </div>
            </div>

            {/* 상품/기간 정보 */}
            <div className="bg-surface-secondary rounded-lg p-md flex flex-col gap-xs">
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">상품명</span>
                <span className="text-content font-medium">{sessionTarget.productName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">이용 기간</span>
                <span className="text-content">{sessionTarget.startDate ?? '-'} ~ {sessionTarget.endDate ?? '-'}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">상태</span>
                <StatusBadge variant={STATUS_VARIANT[sessionTarget.status] ?? 'default'} label={STATUS_LABEL[sessionTarget.status] ?? sessionTarget.status} dot />
              </div>
            </div>

            {/* 세션 진행률 바 */}
            <div>
              <div className="flex justify-between text-[11px] text-content-secondary mb-xs">
                <span>진행률</span>
                <span>{Math.round((sessionTarget.usedCount / Math.max(sessionTarget.totalCount, 1)) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min((sessionTarget.usedCount / Math.max(sessionTarget.totalCount, 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="flex mt-1.5 flex-wrap gap-1">
                {Array.from({ length: sessionTarget.totalCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded text-[9px] flex items-center justify-center font-medium ${
                      i < sessionTarget.usedCount
                        ? 'bg-primary text-white'
                        : 'bg-surface-secondary text-content-tertiary border border-line'
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

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
          <div className="flex flex-col gap-xs max-h-80 overflow-y-auto">
            {/* 이력 테이블 헤더 */}
            <div className="grid grid-cols-3 px-md py-xs text-[11px] font-medium text-content-secondary bg-surface-secondary rounded-lg">
              <span>No</span>
              <span>차감 일시</span>
              <span>수업명 / 메모</span>
            </div>
            {historyLogs.map((log, idx) => (
              <div key={log.id} className="grid grid-cols-3 items-center px-md py-sm bg-surface-secondary rounded-lg text-[12px]">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
                  {idx + 1}
                </span>
                <span className="text-content">{log.deductedAt ? log.deductedAt.slice(0, 16).replace('T', ' ') : '-'}</span>
                <span className="text-content-secondary truncate">{log.lessonName ?? log.note ?? '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 횟수 조정 모달 */}
      <Modal
        isOpen={adjustOpen}
        onClose={() => { setAdjustOpen(false); setAdjustConfirm(false); }}
        title="횟수 조정"
        size="sm"
      >
        {adjustTarget && (
          <div className="flex flex-col gap-md">
            {/* 기본 정보 */}
            <div className="bg-surface-secondary rounded-lg p-md flex flex-col gap-xs">
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">회원명</span>
                <span className="text-content font-medium">{adjustTarget.memberName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">상품명</span>
                <span className="text-content">{adjustTarget.productName}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-content-secondary">현재 잔여</span>
                <span className={`font-semibold ${adjustTarget.totalCount - adjustTarget.usedCount <= 0 ? 'text-state-error' : 'text-state-success'}`}>
                  {adjustTarget.totalCount - adjustTarget.usedCount}회
                </span>
              </div>
            </div>

            {/* 조정 유형 */}
            <div className="flex flex-col gap-xs">
              <label className="text-[12px] font-medium text-content-secondary">조정 유형</label>
              <div className="flex gap-lg">
                <label className="flex items-center gap-xs text-[13px] cursor-pointer">
                  <input
                    type="radio"
                    name="adjustType"
                    value="add"
                    checked={adjustType === 'add'}
                    onChange={() => setAdjustType('add')}
                    className="accent-primary"
                  />
                  <span className="text-state-success font-medium">추가</span>
                </label>
                <label className="flex items-center gap-xs text-[13px] cursor-pointer">
                  <input
                    type="radio"
                    name="adjustType"
                    value="deduct"
                    checked={adjustType === 'deduct'}
                    onChange={() => setAdjustType('deduct')}
                    className="accent-primary"
                  />
                  <span className="text-state-error font-medium">차감</span>
                </label>
              </div>
            </div>

            {/* 조정 횟수 */}
            <div className="flex flex-col gap-xs">
              <label className="text-[12px] font-medium text-content-secondary">조정 횟수</label>
              <input
                type="number"
                min={1}
                value={adjustCount}
                onChange={(e) => setAdjustCount(Math.max(1, Number(e.target.value)))}
                className="px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary w-full"
              />
            </div>

            {/* 사유 */}
            <div className="flex flex-col gap-xs">
              <label className="text-[12px] font-medium text-content-secondary">
                사유 <span className="text-state-error">*</span>
              </label>
              <input
                type="text"
                placeholder="조정 사유를 입력하세요"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary w-full"
              />
            </div>

            {/* 확인 메시지 */}
            {adjustConfirm && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-md py-sm text-[12px] text-amber-700">
                {adjustTarget.memberName}의 잔여 횟수를{' '}
                <strong>
                  {adjustType === 'add'
                    ? `${adjustTarget.totalCount - adjustTarget.usedCount} → ${adjustTarget.totalCount - adjustTarget.usedCount + adjustCount}회`
                    : `${adjustTarget.totalCount - adjustTarget.usedCount} → ${adjustTarget.totalCount - adjustTarget.usedCount - adjustCount}회`}
                </strong>
                로 조정합니다. 계속하시겠습니까?
              </div>
            )}

            {/* 버튼 */}
            <div className="flex justify-end gap-sm pt-xs">
              <button
                className="px-4 py-2 border border-line text-content-secondary rounded-lg text-[13px] hover:bg-surface-tertiary transition-colors"
                onClick={() => { setAdjustOpen(false); setAdjustConfirm(false); }}
                disabled={adjustLoading}
              >
                취소
              </button>
              <button
                className="px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleAdjustApply}
                disabled={!adjustReason.trim() || adjustLoading}
              >
                {adjustLoading ? '처리 중...' : adjustConfirm ? '확인' : '적용'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
