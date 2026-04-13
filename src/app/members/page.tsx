'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatCardGrid from "@/components/common/StatCardGrid";
import TabNav from "@/components/common/TabNav";
import SearchFilter from "@/components/common/SearchFilter";
import DataTable from "@/components/common/DataTable";
import StatusBadge from "@/components/common/StatusBadge";
import type { BadgeVariant } from "@/components/common/StatusBadge";
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/format';
import { moveToPage } from '@/internal';
import { useMembers, useMemberStats } from '@/api/hooks/useMembers';
import type { Member } from '@/api/endpoints/members';
import { toggleFavorite } from '@/api/endpoints/members';
import { exportToExcel } from '@/lib/exportExcel';
import { supabase } from '@/lib/supabase';
import Select from '@/components/ui/Select';
import { useAuthStore } from '@/stores/authStore';
import { hasFeature, hasPermission } from '@/lib/permissions';

const MAIN_TABS = [
  { key: 'members', label: '회원 전체' },
  { key: 'product', label: '보유상품별' },
  { key: 'pass', label: '이용권 목록' },
];

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'ACTIVE', label: '활성' },
  { key: 'EXPIRED', label: '만료' },
  { key: 'INACTIVE', label: '미등록' },
  { key: 'HOLDING', label: '홀딩' },
  { key: 'SUSPENDED', label: '정지' },
];

const FILTER_CONFIG = [
  { key: 'product', label: '계약상품', type: 'select' as const, options: [{ value: 'all', label: '전체' }, { value: 'pt', label: 'PT' }, { value: 'health', label: '헬스' }, { value: 'yoga', label: '요가' }, { value: 'pilates', label: '필라테스' }] },
  { key: 'gender', label: '성별', type: 'select' as const, options: [{ value: 'all', label: '전체' }, { value: 'male', label: '남' }, { value: 'female', label: '여' }] },
  { key: 'expiryDate', label: '최종만료일', type: 'dateRange' as const },
  { key: 'visitDate', label: '최근방문일', type: 'dateRange' as const },
];

/** 회원 세그먼트 판정 (문서 섹션 28) */
function getMemberSegment(member: { registeredAt?: string; status?: string; membershipExpiry?: string; lastVisitAt?: string }): { label: string; color: string } {
  const now = Date.now();
  const dayMs = 86400000;

  const registeredAt = member.registeredAt ? new Date(member.registeredAt).getTime() : null;
  const membershipExpiry = member.membershipExpiry ? new Date(member.membershipExpiry).getTime() : null;
  const lastVisitAt = member.lastVisitAt ? new Date(member.lastVisitAt).getTime() : null;
  const status = member.status ?? '';

  const isActive = status === 'ACTIVE';
  const isExpired = status === 'EXPIRED';

  // 신규: 등록 30일 이내
  if (registeredAt && now - registeredAt <= 30 * dayMs) {
    return { label: '신규', color: 'bg-blue-100 text-blue-700' };
  }
  // 만료 후 미등록
  if (isExpired) {
    return { label: '만료 후 미등록', color: 'bg-red-100 text-red-700' };
  }
  if (isActive) {
    const daysSinceVisit = lastVisitAt ? (now - lastVisitAt) / dayMs : Infinity;
    const daysToExpiry = membershipExpiry ? (membershipExpiry - now) / dayMs : Infinity;

    // 이탈 위험: 30일+ 미방문
    if (daysSinceVisit >= 30) {
      return { label: '이탈 위험', color: 'bg-red-100 text-red-700' };
    }
    // 만료 임박: D-30 이내
    if (daysToExpiry <= 30) {
      return { label: '만료 임박', color: 'bg-yellow-100 text-yellow-700' };
    }
    // 관심 필요: 14일+ 미방문
    if (daysSinceVisit >= 14) {
      return { label: '관심 필요', color: 'bg-yellow-100 text-yellow-700' };
    }
    // 충성 회원: 6개월+ 유지 + 최근 7일 내 방문
    if (registeredAt && now - registeredAt >= 180 * dayMs && daysSinceVisit <= 7) {
      return { label: '충성 회원', color: 'bg-green-100 text-green-700' };
    }
    // 활발한 회원: 최근 14일 내 방문
    if (daysSinceVisit <= 14) {
      return { label: '활발한 회원', color: 'bg-green-100 text-green-700' };
    }
  }
  return { label: '-', color: 'bg-surface-secondary text-content-secondary' };
}

/** DB status → 표시 레이블 */
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성', INACTIVE: '미등록', EXPIRED: '만료',
  HOLDING: '홀딩', SUSPENDED: '정지',
};
/** DB status → badge variant */
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  ACTIVE: 'success', EXPIRED: 'error', HOLDING: 'default',
  INACTIVE: 'default', SUSPENDED: 'warning',
};

export default function MemberList() {
  const authUser = useAuthStore((s) => s.user);
  const canExcel = hasFeature(authUser?.role ?? '', 'excelDownload', authUser?.isSuperAdmin);
  const canAddMember = hasPermission(authUser?.role ?? '', '/members/new', authUser?.isSuperAdmin);

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
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatusValue, setPendingStatusValue] = useState<string>('ACTIVE');
  // 만료 상품 숨기기 체크박스 상태
  const [hideExpired, setHideExpired] = useState(false);
  // 관심회원만 보기
  const [onlyFavorite, setOnlyFavorite] = useState(false);
  // 미방문 N일 필터 (0 = 전체)
  const [daysNoVisit, setDaysNoVisit] = useState<number>(0);
  // 회원구분 필터
  const [memberTypeFilter, setMemberTypeFilter] = useState<string>('all');
  // 유입경로 필터
  const [referralSourceFilter, setReferralSourceFilter] = useState<string>('all');
  // 상품별 탭에서 선택된 상품명
  const [selectedProductName, setSelectedProductName] = useState<string>('all');

  // API 훅 (필터/정렬 파라미터 모두 전달)
  const membersQuery = useMembers({
    page: currentPage,
    size: pageSize,
    search: debouncedSearch || undefined,
    status: activeStatusTab !== 'all' ? activeStatusTab : undefined,
    gender: filterValues.gender || undefined,
    product: filterValues.product || undefined,
    sortKey: sortKey || undefined,
    sortDirection: sortKey ? sortDirection : undefined,
    isFavorite: onlyFavorite ? true : undefined,
    daysNoVisit: daysNoVisit > 0 ? daysNoVisit : undefined,
    memberType: memberTypeFilter !== 'all' ? memberTypeFilter : undefined,
    referralSource: referralSourceFilter !== 'all' ? referralSourceFilter : undefined,
  });
  const statsQuery = useMemberStats();

  const rawMembers = membersQuery.data?.data?.data ?? [];
  // 만료 상품 숨기기 필터 적용
  const members = hideExpired ? rawMembers.filter((m) => m.status !== 'EXPIRED') : rawMembers;
  const pagination = membersQuery.data?.data?.pagination;
  const stats = statsQuery.data?.data;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { setDebouncedSearch(searchValue); setCurrentPage(1); }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [searchValue]);

  // 관심회원 토글 핸들러
  const handleFavoriteToggle = useCallback(async (row: Member) => {
    const next = !row.isFavorite;
    const res = await toggleFavorite(row.id, next);
    if (res.success) {
      toast.success(res.message ?? '관심회원 변경');
      membersQuery.refetch();
    } else {
      toast.error(res.message ?? '관심회원 변경 실패');
    }
  }, [membersQuery]);

  // 회원 전체 탭 컬럼
  const columns = useMemo(() => [
    {
      key: 'isFavorite', header: '★', width: 44, align: 'center' as const,
      render: (_: unknown, row: Member) => (
        <button
          className={cn(
            'transition-colors text-[16px]',
            row.isFavorite ? 'text-yellow-400 hover:text-yellow-500' : 'text-content-tertiary hover:text-yellow-400'
          )}
          onClick={(e) => { e.stopPropagation(); handleFavoriteToggle(row); }}
          title={row.isFavorite ? '관심회원 해제' : '관심회원 등록'}
        >
          {row.isFavorite ? '★' : '☆'}
        </button>
      ),
    },
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (_: unknown, row: Member) => (
        <StatusBadge label={STATUS_LABEL[row.status] ?? row.status} variant={STATUS_VARIANT[row.status] ?? 'default'} dot />
      ),
    },
    {
      key: 'segment', header: '세그먼트', width: 110, align: 'center' as const,
      render: (_: unknown, row: Member) => {
        const seg = getMemberSegment(row);
        if (seg.label === '-') return <span className="text-content-tertiary text-[12px]">-</span>;
        return <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${seg.color}`}>{seg.label}</span>;
      },
    },
    {
      key: 'name', header: '회원명', width: 110, sortable: true,
      render: (value: unknown, row: Member) => (
        <button className="text-primary font-medium hover:underline transition-all text-[13px]" onClick={() => moveToPage(985, { id: row.id })}>{String(value)}</button>
      ),
    },
    {
      key: 'gender', header: '성별', width: 60, align: 'center' as const,
      render: (v: unknown) => v === 'M' ? '남' : v === 'F' ? '여' : '-',
    },
    { key: 'birthDate', header: '생년월일', width: 110, render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span> },
    { key: 'phone', header: '연락처', width: 130, render: (v: unknown) => <span className="tabular-nums">{String(v)}</span> },
    { key: 'membershipType', header: '이용권', width: 120, render: (v: unknown) => {
      const map: Record<string, string> = { MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타', '이용권': '이용권', '기타': '기타' };
      return map[String(v)] ?? String(v);
    }},
    {
      key: 'membershipExpiry', header: '만료일', width: 110, sortable: true,
      render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span>,
    },
    {
      key: 'registeredAt', header: '등록일', width: 110, sortable: true,
      render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span>,
    },
  ], [handleFavoriteToggle]);

  // 이용권 탭 컬럼 (pass): 회원명, 이용권, 시작일, 만료일, D-Day, 상태
  const passColumns = useMemo(() => [
    {
      key: 'name', header: '회원명', width: 110,
      render: (value: unknown, row: Member) => (
        <button className="text-primary font-medium hover:underline transition-all text-[13px]" onClick={() => moveToPage(985, { id: row.id })}>{String(value)}</button>
      ),
    },
    { key: 'membershipType', header: '이용권', width: 120, render: (v: unknown) => {
      const map: Record<string, string> = { MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타', '이용권': '이용권', '기타': '기타' };
      return map[String(v)] ?? String(v);
    }},
    {
      key: 'registeredAt', header: '시작일', width: 110,
      render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span>,
    },
    {
      key: 'membershipExpiry', header: '만료일', width: 110, sortable: true,
      render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span>,
    },
    {
      key: 'membershipExpiry', header: 'D-Day', width: 80, align: 'center' as const,
      render: (v: unknown) => {
        if (!v) return <span className="text-content-secondary">-</span>;
        const diff = Math.ceil((new Date(String(v)).getTime() - Date.now()) / 86400000);
        if (diff < 0) return <span className="text-state-error text-[12px] font-semibold">만료</span>;
        if (diff === 0) return <span className="text-state-warning text-[12px] font-semibold">D-Day</span>;
        return <span className={cn('text-[12px] font-semibold tabular-nums', diff <= 7 ? 'text-state-warning' : 'text-content')}>{`D-${diff}`}</span>;
      },
    },
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (_: unknown, row: Member) => (
        <StatusBadge label={STATUS_LABEL[row.status] ?? row.status} variant={STATUS_VARIANT[row.status] ?? 'default'} dot />
      ),
    },
  ], []);

  // 상품별 탭: membershipType 기준으로 그룹핑하여 요약 카드 + 테이블
  const productGroups = useMemo(() => {
    const map: Record<string, Member[]> = {};
    members.forEach((m) => {
      const key = m.membershipType || 'ETC';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [members]);

  const MEMBERSHIP_TYPE_LABEL: Record<string, string> = {
    MEMBERSHIP: '이용권', PT: 'PT', GX: 'GX', ETC: '기타', '이용권': '이용권', '기타': '기타',
  };

  // 상품별 탭 테이블 컬럼 (membershipType 기준 정렬)
  const productColumns = useMemo(() => [
    {
      key: 'membershipType', header: '상품', width: 100,
      render: (v: unknown) => MEMBERSHIP_TYPE_LABEL[String(v)] ?? String(v),
    },
    {
      key: 'name', header: '회원명', width: 110,
      render: (value: unknown, row: Member) => (
        <button className="text-primary font-medium hover:underline transition-all text-[13px]" onClick={() => moveToPage(985, { id: row.id })}>{String(value)}</button>
      ),
    },
    {
      key: 'status', header: '상태', width: 90, align: 'center' as const,
      render: (_: unknown, row: Member) => (
        <StatusBadge label={STATUS_LABEL[row.status] ?? row.status} variant={STATUS_VARIANT[row.status] ?? 'default'} dot />
      ),
    },
    { key: 'phone', header: '연락처', width: 130, render: (v: unknown) => <span className="tabular-nums">{String(v)}</span> },
    {
      key: 'membershipExpiry', header: '만료일', width: 110, sortable: true,
      render: (v: unknown) => <span className="tabular-nums">{v ? String(v).slice(0, 10) : '-'}</span>,
    },
  ], []);

  const handleSort = (key: string, direction: 'asc' | 'desc') => { setSortKey(key); setSortDirection(direction); setCurrentPage(1); };

  const handleExcelDownload = async () => {
    const exportColumns = [
      { key: 'status', header: '상태' },
      { key: 'name', header: '회원명' },
      { key: 'gender', header: '성별' },
      { key: 'birthDate', header: '생년월일' },
      { key: 'phone', header: '연락처' },
      { key: 'membershipType', header: '이용권' },
      { key: 'membershipExpiry', header: '만료일' },
      { key: 'registeredAt', header: '등록일' },
    ];
    // 전체 회원 데이터를 가져와서 엑셀 다운로드
    try {
      const branchId = typeof window !== 'undefined' ? localStorage.getItem('branchId') || '1' : '1';
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('branchId', Number(branchId))
        .is('deletedAt', null)
        .order('createdAt', { ascending: false });
      if (error || !data) {
        exportToExcel(members as unknown as Record<string, unknown>[], exportColumns, { filename: '회원목록' });
        toast.success(`${members.length}건 엑셀 다운로드 완료`);
        return;
      }
      exportToExcel(data as unknown as Record<string, unknown>[], exportColumns, { filename: '회원목록_전체' });
      toast.success(`${data.length}건 엑셀 다운로드 완료 (전체)`);
    } catch {
      exportToExcel(members as unknown as Record<string, unknown>[], exportColumns, { filename: '회원목록' });
      toast.success(`${members.length}건 엑셀 다운로드 완료`);
    }
  };

  // 서버사이드 정렬 적용 — 클라이언트 정렬 불필요

  const getBranchId = () => typeof window !== 'undefined' ? localStorage.getItem('branchId') || '1' : '1';

  /** 일괄 액션: 상태 변경 — 모달 열기 */
  const handleStatusChange = () => {
    if (selectedRows.size === 0) { toast.warning('회원을 먼저 선택해주세요.'); return; }
    setPendingStatusValue('ACTIVE');
    setShowStatusModal(true);
  };

  /** 모달 확인: 실제 DB 업데이트 */
  const handleStatusConfirm = useCallback(async () => {
    const ids = Array.from(selectedRows).map(idx => members[idx]?.id).filter(Boolean);
    setShowStatusModal(false);
    const { error } = await supabase
      .from('members')
      .update({ status: pendingStatusValue })
      .in('id', ids);
    if (error) {
      toast.error('상태 변경에 실패했습니다.');
    } else {
      const labelMap: Record<string, string> = {
        ACTIVE: '활동', EXPIRED: '만료', HOLDING: '홀딩', INACTIVE: '비활동', WITHDRAWN: '탈퇴',
      };
      toast.success(`${ids.length}명의 상태를 '${labelMap[pendingStatusValue] ?? pendingStatusValue}'(으)로 변경했습니다.`);
      setSelectedRows(new Set());
      membersQuery.refetch();
      statsQuery.refetch();
    }
  }, [selectedRows, members, pendingStatusValue, membersQuery, statsQuery]);

  /** ESC 키로 모달 닫기 */
  useEffect(() => {
    if (!showStatusModal) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowStatusModal(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStatusModal]);

  /** 일괄 액션: 메시지 발송 페이지로 이동 (선택 회원 ID 전달) */
  const handleSendMessage = () => {
    if (selectedRows.size === 0) { toast.warning('회원을 먼저 선택해주세요.'); return; }
    const selectedMembers = Array.from(selectedRows).map(idx => members[idx]).filter(Boolean);
    const ids = selectedMembers.map(m => m.id).join(',');
    sessionStorage.setItem('messageRecipients', JSON.stringify({ ids, names: selectedMembers.map(m => m.name) }));
    moveToPage(980);
  };

  /** 일괄 액션: 출석 처리 */
  const handleBulkAttendance = async () => {
    if (selectedRows.size === 0) { toast.warning('회원을 먼저 선택해주세요.'); return; }
    const ids = Array.from(selectedRows).map(idx => members[idx]).filter(Boolean);
    const records = ids.map(m => ({
      memberId: m.id,
      memberName: m.name,
      checkInAt: new Date().toISOString(),
      type: 'MANUAL' as const,
      checkInMethod: 'MANUAL' as const,
      branchId: Number(getBranchId()),
    }));
    const { error } = await supabase.from('attendance').insert(records);
    if (error) {
      toast.error('출석 처리에 실패했습니다.');
    } else {
      toast.success(`${ids.length}명의 출석이 처리되었습니다.`);
      setSelectedRows(new Set());
    }
  };

  /** 일괄 액션: 관심회원 일괄 등록 */
  const handleToggleVip = useCallback(async () => {
    if (selectedRows.size === 0) { toast.warning('회원을 먼저 선택해주세요.'); return; }
    const ids = Array.from(selectedRows).map(idx => members[idx]?.id).filter(Boolean);
    await Promise.all(ids.map(id => toggleFavorite(id, true)));
    toast.success(`${ids.length}명을 관심회원으로 등록했습니다.`);
    setSelectedRows(new Set());
    membersQuery.refetch();
  }, [selectedRows, members, membersQuery]);

  /** 일괄 액션 분기 */
  const handleAction = (type: string) => {
    switch (type) {
      case '상태 변경': handleStatusChange(); break;
      case '전송하기': handleSendMessage(); break;
      case '출석 처리': handleBulkAttendance(); break;
      case '관심회원': handleToggleVip(); break;
      default: toast.info(`${type} 기능은 준비 중입니다.`);
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="회원 목록"
        description="센터의 전체 회원 정보를 조회하고 관리합니다."
        actions={
          <div className="flex gap-sm">
            {canExcel && (
              <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExcelDownload}>
                엑셀 다운로드
              </Button>
            )}
            {canAddMember && (
              <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => moveToPage(986)}>
                회원 추가
              </Button>
            )}
          </div>
        }
      />

      {/* 통계 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="전체 회원" value={formatNumber(stats?.total)} icon={<Users size={20} />} variant="default" />
        <StatCard label="활성 회원" value={formatNumber(stats?.active)} icon={<UserCheck size={20} />} variant="mint" />
        <StatCard label="만료 예정(D-30)" value={formatNumber(stats?.expiringCount)} icon={<Clock size={20} />} variant="peach" />
        <StatCard label="이번달 만료" value={formatNumber(stats?.expiredThisMonth)} icon={<AlertTriangle size={20} />} variant="default" />
      </StatCardGrid>

      {/* 메인 탭 */}
      <div className="mb-md">
        <TabNav tabs={MAIN_TABS} activeTab={activeMainTab} onTabChange={setActiveMainTab} />
      </div>

      {/* 상품별 탭: 요약 카드 + 상품 드롭다운 + 테이블 */}
      {activeMainTab === 'product' && (
        <div className="space-y-lg">
          {/* 상품별 회원 수 요약 카드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-md">
            {Object.entries(productGroups).map(([type, list]) => (
              <div
                key={type}
                className={cn(
                  'bg-surface border rounded-xl p-md flex flex-col gap-xs cursor-pointer transition-colors',
                  selectedProductName === type ? 'border-primary bg-primary/5' : 'border-line hover:bg-surface-secondary'
                )}
                onClick={() => setSelectedProductName(prev => prev === type ? 'all' : type)}
              >
                <span className="text-[12px] font-semibold text-content-secondary">{MEMBERSHIP_TYPE_LABEL[type] ?? type}</span>
                <span className="text-[22px] font-bold text-content tabular-nums">{formatNumber(list.length)}<span className="text-[13px] font-normal text-content-secondary ml-xs">명</span></span>
                <span className="text-[11px] text-content-secondary">
                  활성 {list.filter(m => m.status === 'ACTIVE').length}명
                </span>
              </div>
            ))}
          </div>

          {/* 상품 드롭다운 필터 */}
          <div className="flex items-center gap-sm">
            <span className="text-[13px] text-content-secondary font-medium">상품 선택:</span>
            <Select
              value={selectedProductName}
              onChange={v => { setSelectedProductName(v); setCurrentPage(1); }}
              options={[
                { value: "all", label: "전체 상품" },
                ...Object.keys(productGroups).map(type => ({ value: type, label: MEMBERSHIP_TYPE_LABEL[type] ?? type })),
              ]}
              className="w-44"
            />
          </div>

          {/* membershipType 기준 정렬 테이블 */}
          <div className="bg-surface rounded-xl border border-line overflow-hidden">
            <DataTable
              columns={productColumns}
              data={(() => {
                const sorted = [...members].sort((a, b) => (a.membershipType ?? '').localeCompare(b.membershipType ?? ''));
                return selectedProductName === 'all' ? sorted : sorted.filter(m => m.membershipType === selectedProductName);
              })()}
              selectable
              selectedRows={selectedRows}
              onSelectRows={setSelectedRows}
              onSort={handleSort}
              sortConfig={sortKey ? { key: sortKey, direction: sortDirection } : undefined}
              pagination={{ page: currentPage, pageSize, total: pagination?.total ?? 0, pageSizeOptions: [20, 50, 100] }}
              onPageChange={setCurrentPage}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
              emptyMessage={membersQuery.isLoading ? "불러오는 중..." : "등록된 회원이 없습니다."}
            />
          </div>
        </div>
      )}

      {/* 이용권 목록 탭 */}
      {activeMainTab === 'pass' && (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
          <DataTable
            columns={passColumns}
            data={members}
            selectable
            selectedRows={selectedRows}
            onSelectRows={setSelectedRows}
            onSort={handleSort}
            sortConfig={sortKey ? { key: sortKey, direction: sortDirection } : undefined}
            pagination={{ page: currentPage, pageSize, total: pagination?.total ?? 0, pageSizeOptions: [20, 50, 100] }}
            onPageChange={setCurrentPage}
            onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
            emptyMessage={membersQuery.isLoading ? "불러오는 중..." : "등록된 회원이 없습니다."}
          />
        </div>
      )}

      {/* 회원 전체 탭 */}
      {activeMainTab === 'members' && <div className="bg-surface rounded-xl border border-line overflow-hidden">
        {/* 상태 필터 탭 */}
        <div className="px-lg pt-md border-b border-line">
          <div className="relative">
          <div className="flex gap-lg overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                  {tab.key === 'all' ? (stats?.total ?? '') :
                   tab.key === 'ACTIVE' ? (stats?.active ?? '') :
                   tab.key === 'EXPIRED' ? (stats?.expired ?? '') :
                   tab.key === 'INACTIVE' ? (stats?.inactive ?? '') :
                   tab.key === 'HOLDING' ? (stats?.holding ?? '') :
                   tab.key === 'SUSPENDED' ? (stats?.suspended ?? '') : ''}
                </span>
                {activeStatusTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full" />}
              </button>
            ))}
          </div>
          {/* 오른쪽 끝에 더 탭이 있음을 시각적으로 알려주는 fade-out gradient */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface to-transparent" />
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
          {/* 추가 필터 행 */}
          <div className="mt-sm flex flex-wrap items-center gap-sm">
            {/* 관심회원만 체크박스 */}
            <label className="flex items-center gap-xs cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary cursor-pointer"
                checked={onlyFavorite}
                onChange={(e) => { setOnlyFavorite(e.target.checked); setCurrentPage(1); }}
              />
              <span className="text-[13px] text-content-secondary flex items-center gap-[3px]">
                <span className="text-yellow-400">★</span> 관심회원만
              </span>
            </label>

            <div className="h-4 w-px bg-line" />

            {/* 미방문 N일 드롭다운 */}
            <div className="flex items-center gap-xs">
              <span className="text-[13px] text-content-secondary">미방문</span>
              <Select
                value={String(daysNoVisit)}
                onChange={v => { setDaysNoVisit(Number(v)); setCurrentPage(1); }}
                options={[
                  { value: "0", label: "전체" },
                  { value: "7", label: "7일 초과" },
                  { value: "14", label: "14일 초과" },
                  { value: "30", label: "30일 초과" },
                ]}
                className="w-32"
              />
            </div>

            <div className="h-4 w-px bg-line" />

            {/* 회원구분 드롭다운 */}
            <div className="flex items-center gap-xs">
              <span className="text-[13px] text-content-secondary">회원구분</span>
              <Select
                value={memberTypeFilter}
                onChange={v => { setMemberTypeFilter(v); setCurrentPage(1); }}
                options={[
                  { value: "all", label: "전체" },
                  { value: "일반", label: "일반" },
                  { value: "기명법인", label: "기명법인" },
                  { value: "무기명법인", label: "무기명법인" },
                ]}
                className="w-32"
              />
            </div>

            <div className="h-4 w-px bg-line" />

            {/* 유입경로 드롭다운 */}
            <div className="flex items-center gap-xs">
              <span className="text-[13px] text-content-secondary">유입경로</span>
              <Select
                value={referralSourceFilter}
                onChange={v => { setReferralSourceFilter(v); setCurrentPage(1); }}
                options={[
                  { value: "all", label: "전체" },
                  { value: "홈페이지", label: "홈페이지" },
                  { value: "지인소개", label: "지인소개" },
                  { value: "네이버", label: "네이버" },
                  { value: "인스타", label: "인스타" },
                  { value: "기타", label: "기타" },
                ]}
                className="w-32"
              />
            </div>

            <div className="h-4 w-px bg-line" />

            {/* 만료 상품 숨기기 체크박스 */}
            <label className="flex items-center gap-xs cursor-pointer select-none">
              <input
                type="checkbox"
                className="w-4 h-4 rounded accent-primary cursor-pointer"
                checked={hideExpired}
                onChange={(e) => { setHideExpired(e.target.checked); setCurrentPage(1); }}
              />
              <span className="text-[13px] text-content-secondary">만료 숨기기</span>
            </label>
          </div>
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
          data={members}
          selectable
          selectedRows={selectedRows}
          onSelectRows={setSelectedRows}
          onSort={handleSort}
          sortConfig={sortKey ? { key: sortKey, direction: sortDirection } : undefined}
          pagination={{ page: currentPage, pageSize, total: pagination?.total ?? 0, pageSizeOptions: [20, 50, 100] }}
          onPageChange={setCurrentPage}
          onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }}
          emptyMessage={membersQuery.isLoading ? "불러오는 중..." : debouncedSearch ? "검색 결과가 없습니다." : "등록된 회원이 없습니다."}
        />
      </div>}
      {/* 상태 변경 모달 */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="상태 일괄 변경"
        size="sm"
        footer={
          <div className="flex gap-sm justify-end">
            <button
              className="px-md py-[7px] rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setShowStatusModal(false)}
            >
              취소
            </button>
            <button
              className="px-md py-[7px] rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-dark transition-colors"
              onClick={handleStatusConfirm}
            >
              변경 확인
            </button>
          </div>
        }
      >
        <p className="text-[12px] text-content-secondary mb-md">
          선택한 <span className="font-semibold text-content">{selectedRows.size}명</span>의 상태를 변경합니다.
        </p>
        <div className="flex flex-col gap-[8px]">
          {[
            { value: 'ACTIVE',    label: '활동',   desc: '정상 이용 중인 회원' },
            { value: 'EXPIRED',   label: '만료',   desc: '이용권이 만료된 회원' },
            { value: 'HOLDING',   label: '홀딩',   desc: '일시 정지 중인 회원' },
            { value: 'INACTIVE',  label: '비활동', desc: '미등록 또는 비활동 회원' },
            { value: 'WITHDRAWN', label: '탈퇴',   desc: '탈퇴 처리된 회원' },
          ].map((opt) => (
            <label
              key={opt.value}
              className={`flex items-center gap-[10px] p-[10px] rounded-lg border cursor-pointer transition-colors ${
                pendingStatusValue === opt.value
                  ? 'border-primary bg-primary/5'
                  : 'border-line hover:bg-surface-tertiary'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={opt.value}
                checked={pendingStatusValue === opt.value}
                onChange={() => setPendingStatusValue(opt.value)}
                className="accent-primary"
              />
              <div>
                <span className="text-[13px] font-medium text-content">{opt.label}</span>
                <span className="ml-[6px] text-[11px] text-content-secondary">{opt.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </Modal>
    </AppLayout>
  );
}
