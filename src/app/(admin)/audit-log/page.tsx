'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import { getAuditLogs, type AuditLogEntry, type AuditLogParams } from '@/api/endpoints/auditLog';
import { getBranches, type Branch } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import Select from '@/components/ui/Select';
import SimpleTable from '@/components/common/SimpleTable';
import Button from '@/components/ui/Button';
import { formatNumber } from '@/lib/format';

// 날짜 포맷: yyyy-MM-dd HH:mm:ss
const fmtDatetime = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};

// 오늘 날짜 yyyy-MM-dd
const todayStr = (): string => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// 30일 전 날짜 yyyy-MM-dd
const thirtyDaysAgoStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// 액션 배지 설정
const ACTION_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  LOGIN:         { label: '로그인',    className: 'bg-green-50 text-green-700 border border-green-200' },
  LOGOUT:        { label: '로그아웃',  className: 'bg-gray-100 text-gray-500 border border-gray-200' },
  LOGIN_FAILED:  { label: '로그인실패', className: 'bg-red-50 text-red-600 border border-red-200' },
  CREATE:        { label: '생성',      className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  UPDATE:        { label: '수정',      className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  DELETE:        { label: '삭제',      className: 'bg-red-50 text-red-600 border border-red-200' },
  BRANCH_SWITCH: { label: '지점전환',  className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  ROLE_CHANGE:   { label: '권한변경',  className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  EXPORT:        { label: '내보내기',  className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  SETTINGS_CHANGE: { label: '설정변경', className: 'bg-orange-50 text-orange-700 border border-orange-200' },
  REFUND:        { label: '환불',      className: 'bg-red-50 text-red-600 border border-red-200' },
  TRANSFER:      { label: '이관',      className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  MEMBER_TRANSFER: { label: '회원이관', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  MEMBER_WITHDRAW: { label: '회원탈퇴', className: 'bg-red-50 text-red-600 border border-red-200' },
  RESIGN:        { label: '퇴사',      className: 'bg-gray-100 text-gray-600 border border-gray-300' },
  BRANCH_CREATE: { label: '지점생성',  className: 'bg-green-50 text-green-700 border border-green-200' },
  BRANCH_CLOSE:  { label: '지점폐쇄',  className: 'bg-red-50 text-red-600 border border-red-200' },
  SUPER_ADMIN_GRANT:  { label: '슈퍼권한부여', className: 'bg-purple-50 text-purple-700 border border-purple-200' },
  SUPER_ADMIN_REVOKE: { label: '슈퍼권한회수', className: 'bg-red-50 text-red-600 border border-red-200' },
};

const getActionBadge = (action: string) =>
  ACTION_BADGE[action] ?? { label: action, className: 'bg-gray-100 text-gray-600 border border-gray-200' };

// 대상 유형 한글 레이블
const TARGET_TYPE_LABEL: Record<string, string> = {
  member:   '회원',
  staff:    '직원',
  sale:     '매출',
  settings: '설정',
  branch:   '지점',
};

const getTargetTypeLabel = (t?: string) =>
  t ? (TARGET_TYPE_LABEL[t] ?? t) : '-';

// JSON before/after 요약
const summarizeDetail = (entry: AuditLogEntry): string => {
  if (entry.beforeValue && entry.afterValue) {
    const changed = Object.keys(entry.afterValue).filter(
      (k) =>
        JSON.stringify(entry.beforeValue![k]) !==
        JSON.stringify(entry.afterValue![k])
    );
    if (changed.length > 0) {
      const key = changed[0];
      return `${key}: ${JSON.stringify(entry.beforeValue[key])} → ${JSON.stringify(entry.afterValue[key])}`;
    }
  }
  if (entry.detail) {
    const vals = Object.entries(entry.detail)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(', ');
    return vals || '-';
  }
  if (entry.fromBranchId && entry.toBranchId) {
    return `지점 ${entry.fromBranchId} → ${entry.toBranchId}`;
  }
  return '-';
};

// 액션 셀렉트 옵션
const ACTION_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'LOGIN', label: '로그인' },
  { value: 'UPDATE', label: '데이터변경' },
  { value: 'ROLE_CHANGE', label: '권한변경' },
  { value: 'BRANCH_SWITCH', label: '지점전환' },
  { value: 'EXPORT', label: '내보내기' },
  { value: 'CREATE', label: '생성' },
  { value: 'DELETE', label: '삭제' },
];

// 대상 유형 셀렉트 옵션
const TARGET_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'member', label: '회원' },
  { value: 'staff', label: '직원' },
  { value: 'sale', label: '매출' },
  { value: 'settings', label: '설정' },
  { value: 'branch', label: '지점' },
];

const PAGE_SIZE = 20;

export default function AuditLog() {
  const authUser = useAuthStore((s) => s.user);
  const isSuperAdmin = authUser?.isSuperAdmin ?? false;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // 필터 상태
  const [fromDate, setFromDate] = useState(thirtyDaysAgoStr());
  const [toDate, setToDate] = useState(todayStr());
  const [actionFilter, setActionFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);

  // 슈퍼관리자일 때 지점 목록 로드
  useEffect(() => {
    if (!isSuperAdmin) return;
    getBranches().then((res) => {
      if (res.success && res.data) setBranches(res.data);
    });
  }, [isSuperAdmin]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const fetchLogs = useCallback(
    async (page: number) => {
      setIsLoading(true);
      try {
        const params: AuditLogParams = {
          page,
          size: PAGE_SIZE,
          fromDate: fromDate || undefined,
          toDate: toDate ? `${toDate}T23:59:59` : undefined,
          action: actionFilter || undefined,
          targetType: targetTypeFilter || undefined,
          branchId: branchFilter ? Number(branchFilter) : undefined,
        };
        const res = await getAuditLogs(params);
        if (!res.success) {
          toast.error(res.message ?? '감사 로그 조회에 실패했습니다.');
          return;
        }
        let rows = res.data.data;
        // 사용자 이름 클라이언트 필터 (userName 필드)
        if (userSearch.trim()) {
          const q = userSearch.trim().toLowerCase();
          rows = rows.filter((r) =>
            (r.userName ?? '').toLowerCase().includes(q)
          );
        }
        setLogs(rows);
        setTotalCount(res.data.pagination.total);
      } catch {
        toast.error('감사 로그 조회 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [fromDate, toDate, actionFilter, targetTypeFilter, userSearch, branchFilter]
  );

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs(1);
  }, [fromDate, toDate, actionFilter, targetTypeFilter, branchFilter, userSearch]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLogs(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchLogs(page);
  };

  // 페이지 번호 범위 계산
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 p-6">
        {/* 헤더 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-content-primary">감사 로그</h1>
            <p className="text-sm text-content-secondary">시스템 내 모든 중요 활동 이력</p>
          </div>
        </div>

        {/* 필터 바 */}
        <div className="bg-white rounded-xl border border-line p-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* 기간 선택 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-content-secondary">기간</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-line rounded-lg bg-white text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
                <span className="text-content-secondary text-sm">~</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-line rounded-lg bg-white text-content-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                />
              </div>
            </div>

            {/* 액션 타입 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-content-secondary">액션 타입</label>
              <Select
                value={actionFilter}
                onChange={(v) => setActionFilter(v)}
                options={ACTION_OPTIONS}
              />
            </div>

            {/* 대상 유형 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-content-secondary">대상 유형</label>
              <Select
                value={targetTypeFilter}
                onChange={(v) => setTargetTypeFilter(v)}
                options={TARGET_OPTIONS}
              />
            </div>

            {/* 지점 필터 (슈퍼관리자 전용) */}
            {isSuperAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-content-secondary">지점</label>
                <Select
                  value={branchFilter}
                  onChange={(v) => setBranchFilter(v)}
                  options={[{ value: '', label: '전체' }, ...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                />
              </div>
            )}

            {/* 사용자 검색 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-content-secondary">사용자 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-tertiary" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="이름으로 검색"
                  className="h-9 pl-9 pr-3 text-sm border border-line rounded-lg bg-white text-content-primary placeholder:text-content-tertiary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent w-44"
                />
              </div>
            </div>

            {/* 검색 버튼 */}
            <Button variant="primary" size="sm" onClick={handleSearch}>검색</Button>
          </div>
        </div>

        {/* 테이블 영역 */}
        <div className="bg-white rounded-xl border border-line overflow-hidden">
          {/* 테이블 헤더 요약 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <span className="text-sm text-content-secondary">
              전체 <span className="font-semibold text-content-primary">{formatNumber(totalCount)}</span>건
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 border-b border-line pb-2 last:border-0">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="h-4 bg-gray-100 rounded animate-pulse flex-1" />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <SimpleTable
              columns={[
                { key: 'createdAt', header: '시간', width: 176, render: (v: string) => <span className="whitespace-nowrap font-mono text-xs text-content-secondary">{fmtDatetime(v)}</span> },
                { key: 'userName', header: '사용자', width: 96, render: (_: unknown, row: AuditLogEntry) => <span className="whitespace-nowrap">{row.userName ?? `ID ${row.userId}`}</span> },
                { key: 'action', header: '액션', width: 112, render: (v: string) => {
                  const badge = getActionBadge(v);
                  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', badge.className)}>{badge.label}</span>;
                }},
                { key: 'targetType', header: '대상', width: 80, render: (_: unknown, row: AuditLogEntry) => (
                  <span className="whitespace-nowrap text-content-secondary">
                    {getTargetTypeLabel(row.targetType)}
                    {row.targetId ? <span className="ml-1 text-xs text-content-tertiary">#{row.targetId}</span> : null}
                  </span>
                )},
                { key: 'detail', header: '상세', render: (_: unknown, row: AuditLogEntry) => <span className="truncate block max-w-xs text-content-secondary" title={summarizeDetail(row)}>{summarizeDetail(row)}</span> },
                { key: 'ipAddress', header: 'IP', width: 144, render: (v: string | null) => <span className="whitespace-nowrap font-mono text-xs text-content-tertiary">{v ?? '-'}</span> },
              ]}
              data={logs}
            />
          )}

          {/* 페이지네이션 */}
          {!isLoading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-line">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-content-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {getPageNumbers()[0] > 1 && (
                <>
                  <button
                    onClick={() => handlePageChange(1)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
                  >
                    1
                  </button>
                  {getPageNumbers()[0] > 2 && (
                    <span className="px-1 text-content-tertiary text-sm">…</span>
                  )}
                </>
              )}

              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg border text-sm transition-colors',
                    p === currentPage
                      ? 'bg-accent text-white border-accent font-medium'
                      : 'border-line text-content-secondary hover:bg-surface-secondary'
                  )}
                >
                  {p}
                </button>
              ))}

              {getPageNumbers()[getPageNumbers().length - 1] < totalPages && (
                <>
                  {getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                    <span className="px-1 text-content-tertiary text-sm">…</span>
                  )}
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-line text-content-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 총 건수 하단 표시 (페이지 없을 때) */}
          {!isLoading && totalPages <= 1 && logs.length > 0 && (
            <div className="px-4 py-3 border-t border-line text-center text-xs text-content-tertiary">
              총 {formatNumber(totalCount)}건
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
