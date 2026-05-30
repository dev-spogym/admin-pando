'use client';
export const dynamic = 'force-dynamic';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserPlus, Unlink, RefreshCw, Crown, Wallet, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import SearchFilter from '@/components/common/SearchFilter';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── SCR-M008 가족 회원 (MBR-EXT-02) ──────────────────────────────────────────
// docs4/V1/D02-회원관리/회원관리.md ## SCR-M008
// DB 연결: 가족 그룹 카드 목록 → 구성원 추가/제거 → 그룹 생성 → 가족 단위 요약
// 4축 상태: 로딩 / 정상(카드 목록) / 빈(그룹 0건) / 오류

const RELATIONSHIP_OPTIONS = [
  { value: '배우자', label: '배우자' },
  { value: '자녀', label: '자녀' },
  { value: '부모', label: '부모' },
  { value: '형제/자매', label: '형제/자매' },
  { value: '기타', label: '기타' },
];

const GROUP_MAX_MEMBERS = 10; // 예외처리: 그룹 정원 10명

interface FamilyMemberRow {
  id: number;
  memberName: string;
  relationship: string;
  isRepresentative: boolean;
}

interface FamilyGroup {
  id: number;
  main: string;
  members: FamilyMemberRow[];
  joined: string;
}

const getBranchId = () => {
  if (typeof window === 'undefined') return 1;
  return Number(localStorage.getItem('branchId') || '1');
};

function FamilyMember() {
  const [families, setFamilies] = useState<FamilyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchId, setBranchId] = useState(1);

  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [addMemberGroupId, setAddMemberGroupId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ groupId: number; member: FamilyMemberRow } | null>(null);

  // 그룹 생성 폼
  const [groupName, setGroupName] = useState('');
  const [firstMember, setFirstMember] = useState('');
  // 구성원 추가 폼
  const [newMemberName, setNewMemberName] = useState('');
  const [newRelation, setNewRelation] = useState('배우자');

  const fetchFamilies = useCallback(async () => {
    const currentBranchId = getBranchId();
    setBranchId(currentBranchId);
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('member_family_groups')
      .select('id, representativeName, createdAt, member_family_members(id, memberName, relationship, isRepresentative)')
      .eq('branchId', currentBranchId)
      .order('createdAt', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setFamilies([]);
      setLoading(false);
      return;
    }

    const mapped = (data ?? []).map((group: Record<string, unknown>) => {
      const rawMembers = Array.isArray(group.member_family_members)
        ? group.member_family_members as Record<string, unknown>[]
        : [];
      return {
        id: Number(group.id),
        main: String(group.representativeName ?? ''),
        members: rawMembers
          .map((member) => ({
            id: Number(member.id),
            memberName: String(member.memberName ?? ''),
            relationship: String(member.relationship ?? '기타'),
            isRepresentative: Boolean(member.isRepresentative),
          }))
          .filter((member) => !member.isRepresentative),
        joined: String(group.createdAt ?? '').slice(0, 10).replace(/-/g, '.'),
      };
    });

    setFamilies(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchFamilies();
  }, [fetchFamilies]);

  const filtered = useMemo(() => {
    const keyword = query.trim();
    if (!keyword) return families;
    return families.filter(
      (f) => f.main.includes(keyword) || f.members.some((m) => m.memberName.includes(keyword)),
    );
  }, [families, query]);

  // 가족 단위 요약 (MBR-EXT-02-06)
  const totalGroups = families.length;
  const totalMembers = families.reduce((acc, f) => acc + f.members.length + 1, 0);
  const avgMembers = totalGroups > 0 ? (totalMembers / totalGroups).toFixed(1) : '0';

  const handleCreateGroup = async () => {
    const name = groupName.trim();
    if (!name) {
      toast.error('대표 회원 이름을 입력하세요.');
      return;
    }
    if (name.length > 30) {
      toast.error('그룹 대표명은 30자 이내로 입력해주세요.');
      return;
    }
    const { data: group, error: groupError } = await supabase
      .from('member_family_groups')
      .insert({
        branchId,
        name: `${name} 가족`,
        representativeName: name,
      })
      .select('id')
      .single();

    if (groupError || !group) {
      toast.error('가족 그룹 생성에 실패했습니다.');
      return;
    }

    const groupId = Number(group.id);
    const membersToInsert = [
      { groupId, memberName: name, relationship: '대표', isRepresentative: true },
      ...(firstMember.trim()
        ? [{ groupId, memberName: firstMember.trim(), relationship: newRelation, isRepresentative: false }]
        : []),
    ];
    const { error: memberError } = await supabase
      .from('member_family_members')
      .insert(membersToInsert);

    if (memberError) {
      toast.error('가족 구성원 저장에 실패했습니다.');
      return;
    }

    await fetchFamilies();
    setShowCreate(false);
    setGroupName('');
    setFirstMember('');
    setNewRelation('배우자');
    toast.success('저장되었습니다.');
  };

  const handleAddMember = async () => {
    if (addMemberGroupId === null) return;
    const name = newMemberName.trim();
    if (!name) {
      toast.error('추가할 회원 이름을 입력하세요.');
      return;
    }
    const group = families.find((f) => f.id === addMemberGroupId);
    // 예외처리: 그룹 정원 초과(10명, 대표 포함)
    if (group && group.members.length + 1 >= GROUP_MAX_MEMBERS) {
      toast.error('그룹 정원이 초과되었어요. (최대 10명)');
      return;
    }
    const { error: insertError } = await supabase
      .from('member_family_members')
      .insert({
        groupId: addMemberGroupId,
        memberName: name,
        relationship: newRelation,
        isRepresentative: false,
      });

    if (insertError) {
      toast.error('가족 구성원 추가에 실패했습니다.');
      return;
    }

    await fetchFamilies();
    setAddMemberGroupId(null);
    setNewMemberName('');
    setNewRelation('배우자');
    toast.success('저장되었습니다.');
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    const { error: deleteError } = await supabase
      .from('member_family_members')
      .delete()
      .eq('id', removeTarget.member.id);

    if (deleteError) {
      toast.error('구성원 분리에 실패했습니다.');
      return;
    }

    await fetchFamilies();
    setRemoveTarget(null);
    toast.success('구성원을 분리했습니다.');
  };

  return (
    <AppLayout>
      <PageHeader
        title="가족 회원"
        description="동일 가족 구성원을 그룹으로 연결해 패밀리 혜택과 가족 단위 관리를 지원합니다."
        actions={
          <div className="flex flex-wrap gap-sm">
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />}
              onClick={() => void fetchFamilies()}
            >
              새로고침
            </Button>
            <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => setShowCreate(true)}>
              새 그룹 만들기
            </Button>
          </div>
        }
      />

      {/* 가족 단위 요약 (MBR-EXT-02-06) */}
      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="가족 그룹" value={totalGroups} icon={<Users size={20} />} />
        <StatCard label="전체 구성원" value={totalMembers} icon={<UserCheck size={20} />} variant="mint" />
        <StatCard label="그룹당 평균" value={`${avgMembers}명`} icon={<Wallet size={20} />} variant="peach" />
      </StatCardGrid>

      {/* DB 출처 안내 + 오류 상태 */}
      <div className="mb-lg rounded-xl border border-line bg-surface-secondary/50 px-md py-sm text-[12px] text-content-secondary">
        Supabase DB · 지점 {branchId}
        {error && <span className="ml-2 font-semibold text-state-error">로드 실패: {error}</span>}
      </div>

      <div className="mb-lg">
        <SearchFilter
          searchPlaceholder="대표·구성원 이름으로 검색..."
          searchValue={query}
          onSearchChange={setQuery}
          onReset={() => setQuery('')}
        />
      </div>

      {/* 4축 상태: 로딩 / 빈 / 정상 */}
      {loading ? (
        <div className="grid gap-md md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? '검색 결과가 없어요' : '가족 그룹이 없습니다'}
          description={query ? '다른 이름으로 검색해 보세요.' : '가족 구성원을 연결하면 패밀리 혜택과 가족 단위 결제 현황을 관리할 수 있습니다.'}
          action={query ? { label: '검색 초기화', onClick: () => setQuery('') } : { label: '그룹 만들기', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="grid gap-md md:grid-cols-2">
          {filtered.map((family) => (
            <div key={family.id} className="rounded-2xl border border-line bg-surface p-lg shadow-card">
              <div className="mb-md flex items-center justify-between">
                <div className="flex items-center gap-sm">
                  <span className="flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold text-primary">
                    <Crown size={12} /> 대표 {family.main}
                  </span>
                  <StatusBadge variant="info">{family.members.length + 1}명</StatusBadge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<UserPlus size={13} />}
                  onClick={() => setAddMemberGroupId(family.id)}
                >
                  구성원 추가
                </Button>
              </div>

              <div className="space-y-xs">
                {family.members.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line px-md py-sm text-[12px] text-content-tertiary">
                    대표 회원만 있습니다. 구성원을 추가해 보세요.
                  </p>
                ) : (
                  family.members.map((m, idx) => (
                    <div
                      key={`${m.id}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-line bg-surface-secondary/40 px-md py-sm"
                    >
                      <span className="text-[13px] text-content">{m.memberName} ({m.relationship})</span>
                      <button
                        type="button"
                        onClick={() => setRemoveTarget({ groupId: family.id, member: m })}
                        className="flex items-center gap-1 rounded-md border border-state-error/30 px-2 py-1 text-[11px] font-semibold text-state-error transition-colors hover:bg-red-50"
                      >
                        <Unlink size={12} /> 분리
                      </button>
                    </div>
                  ))
                )}
              </div>

              <p className="mt-md text-[11px] text-content-tertiary">연결일 {family.joined}</p>
            </div>
          ))}
        </div>
      )}

      {/* 그룹 생성 모달 (MBR-EXT-02-03) */}
      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="새 가족 그룹 만들기"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleCreateGroup}>그룹 생성</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <Input
            label="대표 회원"
            placeholder="대표 회원 이름"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            error={groupName.length > 30 ? '30자 이내로 입력해주세요.' : undefined}
          />
          <div className="grid grid-cols-[1fr_140px] gap-sm">
            <Input
              label="최초 구성원 (선택)"
              placeholder="구성원 이름"
              value={firstMember}
              onChange={(e) => setFirstMember(e.target.value)}
            />
            <Select
              label="관계"
              value={newRelation}
              onChange={setNewRelation}
              options={RELATIONSHIP_OPTIONS}
            />
          </div>
        </div>
      </Modal>

      {/* 구성원 추가 모달 */}
      <Modal
        isOpen={addMemberGroupId !== null}
        onClose={() => { setAddMemberGroupId(null); setNewMemberName(''); }}
        title="가족 구성원 추가"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" size="sm" onClick={() => { setAddMemberGroupId(null); setNewMemberName(''); }}>취소</Button>
            <Button variant="primary" size="sm" onClick={handleAddMember}>추가</Button>
          </div>
        }
      >
        <div className="grid grid-cols-[1fr_140px] gap-sm">
          <Input
            label="회원 검색"
            placeholder="추가할 회원 이름"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <Select
            label="관계"
            value={newRelation}
            onChange={setNewRelation}
            options={RELATIONSHIP_OPTIONS}
          />
        </div>
        <p className="mt-sm text-[12px] text-content-tertiary">
          무기명 법인 회원은 가족 그룹에 가입할 수 없으며, 그룹 정원은 최대 10명입니다.
        </p>
      </Modal>

      {/* 구성원 분리 확인 */}
      <ConfirmDialog
        open={removeTarget !== null}
        title="구성원 분리"
        description={`${removeTarget?.member.memberName ?? ''} 구성원을 가족 그룹에서 분리하시겠습니까? 회원 데이터는 그대로 유지됩니다.`}
        confirmLabel="분리"
        variant="danger"
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />
    </AppLayout>
  );
}

export default function FamilyMemberPage() {
  return (
    <React.Suspense>
      <FamilyMember />
    </React.Suspense>
  );
}
