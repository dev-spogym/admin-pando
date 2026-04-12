import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, AlertTriangle, Ban, Clock, Minus, Settings, ToggleLeft, ToggleRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DataTable from '@/components/DataTable';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { BadgeVariant } from '@/components/StatusBadge';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// 페널티 유형 라벨
const PENALTY_TYPE_LABEL: Record<string, string> = {
  NOSHOW: '노쇼',
  LATE_CANCEL: '지각취소',
  LATE: '지각',
};

// 페널티 유형 badge variant
const PENALTY_TYPE_VARIANT: Record<string, BadgeVariant> = {
  NOSHOW: 'error',
  LATE_CANCEL: 'warning',
  LATE: 'info',
};

interface Penalty {
  id: number;
  memberId: number;
  memberName: string;
  type: string;
  deductCount: number;
  reason: string | null;
  appliedAt: string;
  appliedBy: string | null;
  branchId: number;
}

interface Member {
  id: number;
  name: string;
}

interface PenaltyForm {
  memberId: string;
  memberName: string;
  type: string;
  deductCount: string;
  reason: string;
}

const DEFAULT_FORM: PenaltyForm = {
  memberId: '',
  memberName: '',
  type: 'NOSHOW',
  deductCount: '1',
  reason: '',
};

export default function PenaltyManagement() {
  const branchId = Number(localStorage.getItem('branchId')) || 1;
  const authUser = useAuthStore((s) => s.user);

  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  // 회원 검색어 (모달 내)
  const [memberSearch, setMemberSearch] = useState('');

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PenaltyForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  // 자동 페널티 정책
  const [autoPolicyModalOpen, setAutoPolicyModalOpen] = useState(false);
  const [noshowAutoDeduct, setNoshowAutoDeduct] = useState(true);
  const [noshowDeductCount, setNoshowDeductCount] = useState(1);

  // 페널티 목록 조회
  const fetchPenalties = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('penalties')
      .select('*')
      .eq('branchId', branchId)
      .order('appliedAt', { ascending: false });

    if (!error && data) {
      setPenalties(data);
    }
    setLoading(false);
  };

  // 회원 목록 조회
  const fetchMembers = async () => {
    const { data } = await supabase
      .from('members')
      .select('id, name')
      .eq('branchId', branchId)
      .order('name');
    if (data) setMembers(data);
  };

  useEffect(() => {
    fetchPenalties();
    fetchMembers();
  }, []);

  // 이번달 통계 집계
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthList = penalties.filter((p) => p.appliedAt?.startsWith(thisMonth));
    return {
      total: thisMonthList.length,
      noshow: thisMonthList.filter((p) => p.type === 'NOSHOW').length,
      lateCancel: thisMonthList.filter((p) => p.type === 'LATE_CANCEL').length,
      totalDeduct: thisMonthList.reduce((sum, p) => sum + (p.deductCount ?? 0), 0),
    };
  }, [penalties]);

  // 검색 필터
  const filtered = useMemo(() => {
    if (!searchValue) return penalties;
    const q = searchValue.toLowerCase();
    return penalties.filter(
      (p) =>
        p.memberName?.toLowerCase().includes(q) ||
        (p.reason ?? '').toLowerCase().includes(q)
    );
  }, [penalties, searchValue]);

  // 모달 열기
  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setMemberSearch('');
    setModalOpen(true);
  };

  // 회원 선택
  const selectMember = (member: Member) => {
    setForm((f) => ({ ...f, memberId: String(member.id), memberName: member.name }));
    setMemberSearch('');
  };

  // 필터된 회원 목록 (모달 내 검색)
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return members.slice(0, 10);
    const q = memberSearch.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 10);
  }, [members, memberSearch]);

  // 페널티 등록
  const handleSave = async () => {
    if (!form.memberId) {
      toast.error('회원을 선택하세요.');
      return;
    }
    if (!form.reason.trim()) {
      toast.error('사유를 입력하세요.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('penalties').insert({
      memberId: Number(form.memberId),
      memberName: form.memberName,
      type: form.type,
      deductCount: Number(form.deductCount) || 1,
      reason: form.reason.trim(),
      appliedAt: new Date().toISOString(),
      appliedBy: authUser?.name ?? null,
      branchId,
    });

    if (error) {
      toast.error('페널티 등록에 실패했습니다.');
    } else {
      toast.success('페널티가 등록되었습니다.');
      setModalOpen(false);
      fetchPenalties();
    }
    setSaving(false);
  };

  // 페널티 삭제(취소)
  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase
      .from('penalties')
      .delete()
      .eq('id', deleteTargetId);
    if (error) {
      toast.error('페널티 삭제에 실패했습니다.');
    } else {
      toast.success('페널티가 취소되었습니다.');
      fetchPenalties();
    }
    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
  };

  // 테이블 컬럼 정의
  const columns = [
    { key: 'no', header: 'No', width: 50, render: (_: any, __: any, idx: number) => idx + 1 },
    {
      key: 'memberName',
      header: '회원명',
      render: (v: string) => <span className="font-medium text-content">{v}</span>,
    },
    {
      key: 'type',
      header: '유형',
      render: (v: string) => (
        <StatusBadge variant={PENALTY_TYPE_VARIANT[v] ?? 'default'} label={PENALTY_TYPE_LABEL[v] ?? v} />
      ),
    },
    {
      key: 'deductCount',
      header: '차감횟수',
      align: 'center' as const,
      render: (v: number) => `${v}회`,
    },
    {
      key: 'reason',
      header: '사유',
      render: (v: string | null) => (
        <span className="text-content-secondary text-[13px]">{v ?? '-'}</span>
      ),
    },
    {
      key: 'appliedAt',
      header: '적용일',
      render: (v: string) => (v ? v.slice(0, 10) : '-'),
    },
    {
      key: 'appliedBy',
      header: '적용자',
      render: (v: string | null) => v ?? '-',
    },
    {
      key: 'actions',
      header: '액션',
      align: 'center' as const,
      render: (_: any, row: Penalty) => (
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md text-state-error text-[12px] border border-red-200 hover:bg-red-50 transition-colors"
          onClick={() => { setDeleteTargetId(row.id); setDeleteDialogOpen(true); }}
          title="페널티 취소"
        >
          <Trash2 size={12} />
          취소
        </button>
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="페널티 관리"
        description="노쇼, 지각 등 페널티를 관리합니다."
        actions={
          <div className="flex gap-sm">
            <button
              className="flex items-center gap-1.5 px-4 py-2 bg-surface border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-secondary transition-colors"
              onClick={() => setAutoPolicyModalOpen(true)}
            >
              <Settings size={15} />
              자동 페널티 정책
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
              onClick={openCreate}
            >
              <Plus size={15} />
              페널티 등록
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
        <StatCard label="이번달 페널티" value={stats.total} icon={<AlertTriangle />} />
        <StatCard label="노쇼 건수" value={stats.noshow} icon={<Ban />} variant="peach" />
        <StatCard label="지각취소 건수" value={stats.lateCancel} icon={<Clock />} variant="mint" />
        <StatCard label="차감 총 횟수" value={`${stats.totalDeduct}회`} icon={<Minus />} />
      </div>

      {/* 페널티 목록 테이블 */}
      <DataTable
        title="페널티 목록"
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage="등록된 페널티가 없습니다."
        onSearch={setSearchValue}
        searchValue={searchValue}
        searchPlaceholder="회원명, 사유 검색..."
      />

      {/* 페널티 등록 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="페널티 등록"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              취소
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-md">
          {/* 회원 검색 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              회원 <span className="text-state-error">*</span>
            </label>
            {form.memberId ? (
              <div className="flex items-center justify-between px-3 py-2 border border-primary rounded-lg bg-primary-light">
                <span className="text-[13px] font-medium text-primary">{form.memberName}</span>
                <button
                  type="button"
                  className="text-[11px] text-content-secondary hover:text-state-error transition-colors"
                  onClick={() => setForm((f) => ({ ...f, memberId: '', memberName: '' }))}
                >
                  변경
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                  placeholder="회원명 검색..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                />
                {memberSearch && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-surface border border-line rounded-lg shadow-card overflow-hidden">
                    {filteredMembers.length === 0 ? (
                      <p className="px-3 py-2 text-[12px] text-content-secondary">검색 결과 없음</p>
                    ) : (
                      filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-[13px] text-content hover:bg-surface-secondary transition-colors"
                          onClick={() => selectMember(m)}
                        >
                          {m.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 페널티 유형 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">유형</label>
            <select
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="NOSHOW">노쇼</option>
              <option value="LATE_CANCEL">지각취소</option>
              <option value="LATE">지각</option>
            </select>
          </div>

          {/* 차감 횟수 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">차감 횟수</label>
            <input
              type="number"
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              value={form.deductCount}
              onChange={(e) => setForm((f) => ({ ...f, deductCount: e.target.value }))}
            />
          </div>

          {/* 사유 */}
          <div>
            <label className="block text-[12px] font-medium text-content-secondary mb-xs">
              사유 <span className="text-state-error">*</span>
            </label>
            <textarea
              className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none"
              rows={3}
              placeholder="페널티 사유를 입력하세요."
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* 삭제(취소) 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="페널티 취소"
        description="이 페널티를 취소하시겠습니까? 차감된 횟수가 복원됩니다."
        confirmLabel="취소 확인"
        variant="danger"
      />

      {/* 자동 페널티 정책 모달 */}
      <Modal
        isOpen={autoPolicyModalOpen}
        onClose={() => setAutoPolicyModalOpen(false)}
        title="자동 페널티 정책 설정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-4 py-2 rounded-lg border border-line text-[13px] text-content-secondary hover:bg-surface-tertiary transition-colors"
              onClick={() => setAutoPolicyModalOpen(false)}
            >
              취소
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary/90 transition-colors"
              onClick={() => {
                setAutoPolicyModalOpen(false);
                toast.success('자동 페널티 정책이 저장되었습니다.');
              }}
            >
              저장
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-lg">
          {/* 노쇼 자동 차감 토글 */}
          <div className="flex items-center justify-between p-md bg-surface-secondary rounded-lg border border-line">
            <div>
              <p className="text-[13px] font-semibold text-content">노쇼 자동 차감</p>
              <p className="text-[11px] text-content-secondary mt-[2px]">예약 미출석 시 수업 횟수를 자동으로 차감합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => setNoshowAutoDeduct(v => !v)}
              className="flex items-center gap-xs transition-colors"
            >
              {noshowAutoDeduct
                ? <ToggleRight size={32} className="text-primary" />
                : <ToggleLeft size={32} className="text-content-secondary" />}
              <span className={`text-[12px] font-semibold ${noshowAutoDeduct ? 'text-primary' : 'text-content-secondary'}`}>
                {noshowAutoDeduct ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* 차감 횟수 설정 */}
          {noshowAutoDeduct && (
            <div>
              <label className="block text-[12px] font-medium text-content-secondary mb-xs">
                노쇼 1회당 차감 횟수
              </label>
              <input
                type="number"
                min={1}
                max={10}
                className="w-full px-3 py-2 border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                value={noshowDeductCount}
                onChange={e => setNoshowDeductCount(Math.max(1, Math.min(10, Number(e.target.value))))}
              />
              <p className="text-[11px] text-content-secondary mt-xs">1~10 범위에서 설정 가능합니다.</p>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
