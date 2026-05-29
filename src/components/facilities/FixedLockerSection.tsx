'use client';

// SCR-I005 고정 물품 락커 관리 본문 (docs4 V1/V2 D11-통합운영)
// /clothing-locker 단독 화면과 /locker/management 의 "고정 물품 락커" 탭에서 공통 사용.
// AppLayout/PageHeader 없이 본문만 렌더링하는 재사용 섹션. 데이터 미연동 기능형 목업.

import React, { useMemo, useState } from 'react';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import DataTable from '@/components/common/DataTable';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import TabNav from '@/components/common/TabNav';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { toast } from 'sonner';
import { Package, AlertTriangle, RefreshCw, Plus, Search } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { isRoleAtLeast } from '@/lib/permissions';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type LockerCategory = 'personal' | 'golf' | 'premium';
type LockerStatus = '사용중' | '만료예정' | '만료' | '회수대기';

interface FixedLocker {
  id: string;
  category: LockerCategory;
  member: string;
  product: string;
  assignedDate: string;
  expireDate: string;
  status: LockerStatus;
}

const CATEGORY_TABS = [
  { key: 'personal', label: '개인 물품' },
  { key: 'golf', label: '골프' },
  { key: 'premium', label: '프리미엄' },
];

const STATUS_VARIANT: Record<LockerStatus, BadgeVariant> = {
  사용중: 'info',
  만료예정: 'warning',
  만료: 'error',
  회수대기: 'error',
};

const STATUS_OPTIONS = [
  { value: '전체', label: '전체 상태' },
  { value: '사용중', label: '사용 중' },
  { value: '만료예정', label: '만료 예정' },
  { value: '만료', label: '만료' },
  { value: '회수대기', label: '회수 대기' },
];

// ─── 인라인 mock ──────────────────────────────────────────────────────────

const MOCK_LOCKERS: FixedLocker[] = [
  { id: 'P-01', category: 'personal', member: '김민준', product: '개인 물품 락커(소)', assignedDate: '2026-01-05', expireDate: '2026-07-05', status: '사용중' },
  { id: 'P-02', category: 'personal', member: '이서연', product: '개인 물품 락커(소)', assignedDate: '2025-11-20', expireDate: '2026-06-03', status: '만료예정' },
  { id: 'P-03', category: 'personal', member: '박지훈', product: '개인 물품 락커(중)', assignedDate: '2025-10-10', expireDate: '2026-04-10', status: '만료' },
  { id: 'G-01', category: 'golf', member: '정현우', product: '골프백 보관 락커', assignedDate: '2026-02-01', expireDate: '2027-02-01', status: '사용중' },
  { id: 'G-02', category: 'golf', member: '최유리', product: '골프백 보관 락커', assignedDate: '2025-12-15', expireDate: '2026-03-15', status: '회수대기' },
  { id: 'V-01', category: 'premium', member: '한지민', product: '프리미엄 라운지 락커', assignedDate: '2026-03-01', expireDate: '2026-09-01', status: '사용중' },
  { id: 'V-02', category: 'premium', member: '오세훈', product: '프리미엄 라운지 락커', assignedDate: '2025-12-01', expireDate: '2026-06-05', status: '만료예정' },
];

// ─── 재사용 섹션 ────────────────────────────────────────────────────────────

/**
 * embedded=true 인 경우(탭 내부 렌더링) 섹션 상단에 자체 액션 버튼 줄을 노출한다.
 * embedded=false(단독 화면)인 경우 액션은 부모 PageHeader 가 제공하므로 숨긴다.
 */
export default function FixedLockerSection({ embedded = false }: { embedded?: boolean }) {
  const [lockers, setLockers] = useState<FixedLocker[]>(MOCK_LOCKERS);
  const [tab, setTab] = useState<LockerCategory>('personal');
  const [statusFilter, setStatusFilter] = useState('전체');
  const [search, setSearch] = useState('');

  // 배정 모달
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ member: '', product: '개인 물품 락커(소)', expireDate: '' });

  // 연장 모달
  const [extendTarget, setExtendTarget] = useState<FixedLocker | null>(null);
  const [extendDate, setExtendDate] = useState('');

  // 회수 확인 모달
  const [recoverTarget, setRecoverTarget] = useState<FixedLocker | null>(null);

  // 권한: 트레이너(readonly) 조회만, 스태프 회수 제한
  const authUser = useAuthStore((s) => s.user);
  const role = authUser?.role ?? '';
  const canManage = isRoleAtLeast(role, 'staff'); // 스태프 이상 배정/연장 가능
  const canRecover = isRoleAtLeast(role, 'manager'); // 회수는 매니저 이상 (스태프는 승인 필요)

  // ─── 통계 ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: lockers.length,
    inUse: lockers.filter((l) => l.status === '사용중').length,
    expiring: lockers.filter((l) => l.status === '만료예정').length,
    recovering: lockers.filter((l) => l.status === '회수대기').length,
  }), [lockers]);

  // ─── 필터링 ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => lockers.filter((l) => {
    if (l.category !== tab) return false;
    if (statusFilter !== '전체' && l.status !== statusFilter) return false;
    if (search) {
      const q = search.trim();
      if (!l.member.includes(q) && !l.id.includes(q) && !l.product.includes(q)) return false;
    }
    return true;
  }), [lockers, tab, statusFilter, search]);

  // ─── 액션 ─────────────────────────────────────────────────────────────────

  const handleAssign = () => {
    if (!assignForm.member.trim()) {
      toast.error('회원을 선택해 주세요.');
      return;
    }
    if (!assignForm.expireDate) {
      toast.error('계약 기간을 선택해 주세요.');
      return;
    }
    if (assignForm.expireDate < new Date().toISOString().slice(0, 10)) {
      toast.error('만료일은 과거 일자로 지정할 수 없습니다.');
      return;
    }
    const nextNo = `${tab === 'personal' ? 'P' : tab === 'golf' ? 'G' : 'V'}-${String(lockers.length + 1).padStart(2, '0')}`;
    setLockers((prev) => [
      ...prev,
      {
        id: nextNo,
        category: tab,
        member: assignForm.member.trim(),
        product: assignForm.product,
        assignedDate: new Date().toISOString().slice(0, 10),
        expireDate: assignForm.expireDate,
        status: '사용중',
      },
    ]);
    toast.success('고정 락커를 배정했습니다.');
    setShowAssign(false);
    setAssignForm({ member: '', product: '개인 물품 락커(소)', expireDate: '' });
  };

  const handleExtend = () => {
    if (!extendTarget) return;
    if (!extendDate) {
      toast.error('연장할 만료일을 선택해 주세요.');
      return;
    }
    if (extendDate < new Date().toISOString().slice(0, 10)) {
      toast.error('만료일은 과거 일자로 지정할 수 없습니다.');
      return;
    }
    setLockers((prev) => prev.map((l) => (l.id === extendTarget.id ? { ...l, expireDate: extendDate, status: '사용중' } : l)));
    toast.success('계약 만료일을 연장했습니다.');
    setExtendTarget(null);
    setExtendDate('');
  };

  const handleRecover = () => {
    if (!recoverTarget) return;
    // 회수 = 회원 연결 제거, 이력 보존 (mock에서는 목록에서 제거)
    setLockers((prev) => prev.filter((l) => l.id !== recoverTarget.id));
    toast.success('고정 락커를 회수했습니다.');
    setRecoverTarget(null);
  };

  const handleSync = () => {
    // 만료일 기준 상태 재계산
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    setLockers((prev) => prev.map((l) => {
      if (l.status === '회수대기') return l;
      if (l.expireDate < today) return { ...l, status: '만료' };
      if (l.expireDate <= soon) return { ...l, status: '만료예정' };
      return { ...l, status: '사용중' };
    }));
    toast.success('고정 락커 상태를 동기화했습니다.');
  };

  // ─── 테이블 컬럼 ──────────────────────────────────────────────────────────

  const columns = [
    { key: 'id', header: '락커 번호', width: 100 },
    { key: 'member', header: '회원명', width: 120 },
    { key: 'product', header: '상품명' },
    { key: 'assignedDate', header: '배정일', width: 120 },
    { key: 'expireDate', header: '만료일', width: 120 },
    {
      key: 'status', header: '상태', width: 110,
      render: (v: LockerStatus) => <StatusBadge variant={STATUS_VARIANT[v]} label={v} />,
    },
    {
      key: 'actions', header: '관리', width: 160, align: 'right' as const,
      render: (_: unknown, row: FixedLocker) => (
        <div className="flex justify-end gap-xs">
          {canManage && (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
              onClick={() => { setExtendTarget(row); setExtendDate(row.expireDate); }}
            >
              연장
            </button>
          )}
          {canRecover ? (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-red-50 text-red-600 hover:bg-red-100"
              onClick={() => setRecoverTarget(row)}
            >
              회수
            </button>
          ) : canManage ? (
            <button
              className="text-[11px] px-sm py-[3px] rounded bg-surface-tertiary text-content-tertiary cursor-not-allowed"
              onClick={() => toast.error('회수는 관리자 승인이 필요합니다.')}
            >
              회수
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* 탭 내부 렌더링 시 자체 액션 줄 (단독 화면은 PageHeader 가 제공) */}
      {embedded && (
        <div className="mb-md flex justify-end gap-sm">
          <Button variant="outline" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={handleSync}>
            상태 동기화
          </Button>
          {canManage && (
            <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setShowAssign(true)}>
              배정하기
            </Button>
          )}
        </div>
      )}

      {/* 상단 현황 카드 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="전체 고정 락커" value={`${stats.total}개`} icon={<Package />} />
        <StatCard label="사용 중" value={`${stats.inUse}개`} icon={<Package />} variant="mint" />
        <StatCard
          label="만료 예정"
          value={`${stats.expiring}개`}
          icon={<AlertTriangle />}
          variant="peach"
          onClick={() => setStatusFilter('만료예정')}
        />
        <StatCard
          label="회수 대기"
          value={`${stats.recovering}개`}
          icon={<AlertTriangle />}
          onClick={() => setStatusFilter('회수대기')}
        />
      </StatCardGrid>

      {/* 락커 유형 탭 */}
      <TabNav
        tabs={CATEGORY_TABS.map((t) => ({
          ...t,
          label: `${t.label} ${lockers.filter((l) => l.category === t.key).length}`,
        }))}
        activeTab={tab}
        onTabChange={(k) => setTab(k as LockerCategory)}
      />

      {/* 검색·필터 */}
      <div className="my-md flex items-center gap-sm">
        <div className="relative max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
          <input
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-line bg-surface-secondary text-[13px] focus:border-primary outline-none"
            placeholder="회원명, 락커 번호, 상품명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
        </div>
      </div>

      {/* 배정 현황 테이블 */}
      {lockers.length === 0 ? (
        <EmptyState
          icon={Package}
          title="등록된 고정 물품 락커가 없습니다"
          description="고정 락커를 등록한 후 회원에게 배정할 수 있습니다."
          action={canManage ? { label: '배정하기', onClick: () => setShowAssign(true) } : undefined}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="배정된 락커가 없습니다"
          description="선택한 유형/상태에 해당하는 배정 내역이 없습니다."
        />
      ) : (
        <>
          {filtered.some((l) => l.status === '회수대기') && (
            <div className="mb-sm flex items-center gap-xs rounded-lg border border-red-200 bg-red-50 px-md py-sm text-[12px] text-red-600">
              <AlertTriangle className="h-4 w-4" />
              회수 대기 락커가 있습니다. 회수 처리를 진행해 주세요.
            </div>
          )}
          <DataTable columns={columns} data={filtered} />
        </>
      )}

      {/* 배정 모달 */}
      <Modal isOpen={showAssign} onClose={() => setShowAssign(false)} title="고정 락커 배정">
        <div className="space-y-md">
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">회원 검색 *</label>
            <input
              className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
              placeholder="회원명 입력"
              value={assignForm.member}
              onChange={(e) => setAssignForm({ ...assignForm, member: e.target.value })}
            />
            <p className="mt-[4px] text-[11px] text-content-tertiary">락커 상품 미보유 회원은 배정할 수 없습니다.</p>
          </div>
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">락커 상품</label>
            <Select
              value={assignForm.product}
              onChange={(v) => setAssignForm({ ...assignForm, product: v })}
              options={[
                { value: '개인 물품 락커(소)', label: '개인 물품 락커(소)' },
                { value: '개인 물품 락커(중)', label: '개인 물품 락커(중)' },
                { value: '골프백 보관 락커', label: '골프백 보관 락커' },
                { value: '프리미엄 라운지 락커', label: '프리미엄 라운지 락커' },
              ]}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">계약 만료일 *</label>
            <input
              type="date"
              className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
              value={assignForm.expireDate}
              onChange={(e) => setAssignForm({ ...assignForm, expireDate: e.target.value })}
            />
          </div>
          <div className="flex gap-sm pt-sm">
            <Button variant="outline" className="flex-1" onClick={() => setShowAssign(false)}>취소</Button>
            <Button className="flex-1" onClick={handleAssign}>배정</Button>
          </div>
        </div>
      </Modal>

      {/* 연장 모달 */}
      <Modal isOpen={extendTarget !== null} onClose={() => setExtendTarget(null)} title="계약 만료일 연장">
        <div className="space-y-md">
          <p className="text-[13px] text-content-secondary">
            {extendTarget ? `${extendTarget.id} (${extendTarget.member}) 락커의 계약 만료일을 연장합니다.` : ''}
          </p>
          <div>
            <label className="text-[12px] font-medium text-content-secondary mb-[4px] block">새 만료일 *</label>
            <input
              type="date"
              className="w-full h-[40px] px-md bg-surface-secondary rounded-lg text-[13px] border border-line focus:border-primary outline-none"
              value={extendDate}
              onChange={(e) => setExtendDate(e.target.value)}
            />
          </div>
          <div className="flex gap-sm pt-sm">
            <Button variant="outline" className="flex-1" onClick={() => setExtendTarget(null)}>취소</Button>
            <Button className="flex-1" onClick={handleExtend}>연장</Button>
          </div>
        </div>
      </Modal>

      {/* 회수 확인 모달 */}
      <Modal
        isOpen={recoverTarget !== null}
        onClose={() => setRecoverTarget(null)}
        title="고정 락커 회수"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setRecoverTarget(null)}>취소</Button>
            <Button onClick={handleRecover}>회수 실행</Button>
          </div>
        }
      >
        <p className="text-[13px] text-content-secondary">
          {recoverTarget
            ? `${recoverTarget.id} (${recoverTarget.member}) 락커의 회원 연결을 제거합니다. 배정 이력은 보존됩니다.`
            : ''}
        </p>
      </Modal>
    </div>
  );
}
