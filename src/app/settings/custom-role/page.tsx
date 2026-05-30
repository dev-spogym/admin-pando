'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Shield, Plus, Copy, Edit2, Trash2, Users, Check, Info } from 'lucide-react';
import {
  CUSTOM_ROLES,
  SYSTEM_ROLE_NAMES,
  ROLE_PERMISSION_MENUS,
  type CustomRole,
} from '@/mocks/settings';
import { loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';

type PermKey = 'access' | 'read' | 'create' | 'update' | 'delete';
const PERM_LABELS: Record<PermKey, string> = {
  access: '접근',
  read: '조회',
  create: '생성',
  update: '수정',
  delete: '삭제',
};

interface FormState {
  id: string | null; // null=생성, 값=수정
  name: string;
  description: string;
  baseRole: string;
  matrix: Record<string, Partial<Record<PermKey, boolean>>>;
}

const EMPTY_FORM: FormState = { id: null, name: '', description: '', baseRole: '', matrix: {} };

const BASE_ROLE_OPTIONS = [
  { value: '', label: '복사 안 함 (빈 권한에서 시작)' },
  { value: 'manager', label: 'manager' },
  { value: 'fc', label: 'fc' },
  { value: 'trainer', label: 'trainer' },
  { value: 'staff', label: 'staff' },
];

export default function CustomRolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>(CUSTOM_ROLES);
  const [selected, setSelected] = useState<string | null>(roles[0]?.id ?? null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);
  const [reassignTarget, setReassignTarget] = useState<CustomRole | null>(null);
  const [reassignTo, setReassignTo] = useState('');

  useEffect(() => {
    let mounted = true;
    loadBranchSetting<CustomRole[]>('custom_roles', CUSTOM_ROLES).then((saved) => {
      if (!mounted) return;
      setRoles(saved);
      setSelected(saved[0]?.id ?? null);
    });
    return () => { mounted = false; };
  }, []);

  const persistRoles = async (nextRoles: CustomRole[]) => {
    const error = await saveBranchSetting('custom_roles', nextRoles);
    if (error) toast.error(`역할 저장 실패: ${error}`);
    return !error;
  };

  const selectedRole = roles.find((r) => r.id === selected) ?? null;

  // ── 폼 검증 ──
  const formError = useMemo(() => {
    const name = form.name.trim();
    if (!name) return '역할 이름은 필수입니다';
    if (name.length > 30) return '30자 이내로 입력해주세요';
    if (SYSTEM_ROLE_NAMES.some((n) => n.toLowerCase() === name.toLowerCase())) return '기본 역할명과 중복됩니다';
    if (roles.some((r) => r.id !== form.id && r.name.toLowerCase() === name.toLowerCase())) return '이미 사용 중인 이름입니다';
    return null;
  }, [form, roles]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (role: CustomRole) => {
    setForm({ id: role.id, name: role.name, description: role.description, baseRole: role.baseRole, matrix: {} });
    setShowForm(true);
  };

  const openCopy = (role: CustomRole) => {
    setForm({ id: null, name: `${role.name} 복사본`, description: role.description, baseRole: role.baseRole, matrix: {} });
    setShowForm(true);
    toast.success(`${role.name}의 권한을 불러왔습니다`);
  };

  const toggleMatrix = (menu: string, key: PermKey) => {
    setForm((p) => ({
      ...p,
      matrix: { ...p.matrix, [menu]: { ...p.matrix[menu], [key]: !p.matrix[menu]?.[key] } },
    }));
  };

  const handleSubmit = () => {
    if (formError) {
      toast.error(formError);
      return;
    }
    const name = form.name.trim();
    if (form.id) {
      const nextRoles = roles.map((r) => (r.id === form.id ? { ...r, name, description: form.description, baseRole: form.baseRole } : r));
      setRoles(nextRoles);
      persistRoles(nextRoles);
      toast.success('역할을 수정했습니다');
    } else {
      const newRole: CustomRole = {
        id: `r${Date.now()}`,
        name,
        description: form.description,
        baseRole: form.baseRole || '없음',
        members: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        isSystem: false,
        permissions: [],
      };
      const nextRoles = [...roles, newRole];
      setRoles(nextRoles);
      persistRoles(nextRoles);
      setSelected(newRole.id);
      toast.success('역할을 생성했습니다. 권한 설정에 즉시 노출되지 않으면 새로고침해주세요.');
    }
    setShowForm(false);
  };

  const handleDeleteClick = (role: CustomRole) => {
    if (role.members > 0) {
      // 배정 직원 ≥ 1 → 재배정 다이얼로그 (DLG-087-001)
      setReassignTarget(role);
      setReassignTo('');
    } else {
      // 배정 0명 → 즉시 확인 모달
      setDeleteTarget(role);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const nextRoles = roles.filter((r) => r.id !== deleteTarget.id);
    setRoles(nextRoles);
    persistRoles(nextRoles);
    if (selected === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    toast.success('역할을 삭제했습니다');
  };

  const confirmReassign = () => {
    if (!reassignTarget) return;
    if (!reassignTo) {
      toast.error('재배정할 역할을 선택해주세요');
      return;
    }
    const nextRoles = roles.filter((r) => r.id !== reassignTarget.id);
    setRoles(nextRoles);
    persistRoles(nextRoles);
    if (selected === reassignTarget.id) setSelected(null);
    toast.success(`직원 ${reassignTarget.members}명을 재배정하고 역할을 삭제했습니다`);
    setReassignTarget(null);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="커스텀 역할 생성"
          description="기본 제공 8종 역할 외에 센터 운영 특성에 맞춘 맞춤 역할을 생성·관리합니다."
          actions={
            <button
              onClick={openCreate}
              className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white transition-all hover:opacity-90"
            >
              <Plus size={15} /> 역할 생성
            </button>
          }
        />

        <div className="grid grid-cols-3 gap-md">
          <StatCard label="커스텀 역할" value={`${roles.length}개`} icon={<Shield />} variant="peach" />
          <StatCard label="기본 제공 역할" value={`${SYSTEM_ROLE_NAMES.length}종`} icon={<Shield />} />
          <StatCard label="역할 배정 직원" value={`${roles.reduce((a, r) => a + r.members, 0)}명`} icon={<Users />} variant="mint" />
        </div>

        {roles.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="생성된 커스텀 역할이 없습니다"
            description="센터 운영에 맞는 맞춤 역할을 만들어 직원에게 배정하세요."
            action={{ label: '역할 생성', onClick: openCreate }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_360px]">
            {/* 역할 목록 */}
            <section className="relative overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card">
              <div className="border-b border-line/70 px-lg py-md">
                <h2 className="text-Section-Title font-bold text-content">커스텀 역할 목록</h2>
              </div>
              <div className="divide-y divide-line/50">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelected(role.id)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-md px-lg py-md transition-colors',
                      selected === role.id ? 'bg-primary/5' : 'hover:bg-surface-secondary'
                    )}
                  >
                    <div className="flex items-center gap-md">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-light text-primary">
                        <Shield size={16} />
                      </div>
                      <div>
                        <p className="font-semibold text-content">{role.name}</p>
                        <p className="text-[12px] text-content-secondary">
                          기반: {role.baseRole} · {role.members}명 배정 · {role.createdAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-xs">
                      <button
                        onClick={(e) => { e.stopPropagation(); openCopy(role); }}
                        className="rounded-button p-xs text-content-secondary hover:bg-surface-secondary hover:text-primary"
                        aria-label="복사"
                      >
                        <Copy size={15} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(role); }}
                        className="rounded-button p-xs text-content-secondary hover:bg-surface-secondary hover:text-primary"
                        aria-label="수정"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(role); }}
                        className="rounded-button p-xs text-content-secondary hover:bg-red-50 hover:text-state-error"
                        aria-label="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 역할 상세 / 배정 현황 */}
            <aside className="relative overflow-hidden rounded-[24px] border border-line/70 bg-white/82 p-lg shadow-card">
              {selectedRole ? (
                <div className="space-y-md">
                  <div>
                    <div className="flex items-center gap-xs">
                      <h3 className="text-Section-Title font-bold text-content">{selectedRole.name}</h3>
                      <StatusBadge variant="peach" label="커스텀" />
                    </div>
                    <p className="mt-xs text-[13px] text-content-secondary">{selectedRole.description}</p>
                  </div>
                  <div>
                    <p className="mb-xs text-[12px] font-medium text-content-secondary">허용 권한</p>
                    <div className="flex flex-wrap gap-xs">
                      {selectedRole.permissions.length === 0 ? (
                        <span className="text-[12px] text-content-tertiary">설정된 권한 없음</span>
                      ) : (
                        selectedRole.permissions.map((p) => <StatusBadge key={p} variant="info" label={p} />)
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="mb-xs text-[12px] font-medium text-content-secondary">역할 배정 현황 ({selectedRole.members}명)</p>
                    {selectedRole.members === 0 ? (
                      <p className="text-[12px] text-content-tertiary">배정된 직원이 없습니다.</p>
                    ) : (
                      <div className="space-y-xs">
                        {Array.from({ length: Math.min(selectedRole.members, 3) }).map((_, i) => (
                          <div key={i} className="flex items-center gap-sm rounded-xl bg-surface-secondary px-md py-xs text-[12px]">
                            <Users size={13} className="text-content-tertiary" /> 직원 {i + 1} · {selectedRole.name}
                          </div>
                        ))}
                        {selectedRole.members > 3 && (
                          <p className="text-[11px] text-content-tertiary">외 {selectedRole.members - 3}명</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-xs rounded-2xl border border-blue-200 bg-blue-50 px-md py-sm text-[12px] text-state-info">
                    <Info size={14} className="mt-[2px] shrink-0" />
                    역할 권한을 변경하면 배정 직원의 활성 세션은 다음 페이지 로드부터 새 권한이 적용됩니다.
                  </div>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-[13px] text-content-tertiary">역할을 선택하세요.</div>
              )}
            </aside>
          </div>
        )}
      </div>

      {/* 역할 생성/수정 폼 (Modal) */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={form.id ? '역할 수정' : '새 역할 생성'}
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <button onClick={() => setShowForm(false)} className="rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary">
              취소
            </button>
            <button onClick={handleSubmit} className="rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white hover:opacity-90">
              저장
            </button>
          </div>
        }
      >
        <div className="space-y-md">
          <Input
            label="역할 이름 (필수)"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="예: 시니어 트레이너"
            error={form.name.length > 0 ? formError ?? undefined : undefined}
          />
          <Input
            label="역할 설명"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="역할의 책임 범위를 입력하세요"
          />
          <Select
            label="기존 역할에서 권한 복사"
            options={BASE_ROLE_OPTIONS}
            value={form.baseRole}
            onChange={(v) => setForm((p) => ({ ...p, baseRole: v }))}
            hint="선택 시 해당 역할 권한을 출발점으로 불러옵니다"
          />

          {/* 권한 매트릭스 (SCR-081 동일 구조) */}
          <div>
            <p className="mb-sm text-[12px] font-medium text-content-secondary">권한 매트릭스</p>
            <div className="overflow-x-auto rounded-2xl border border-line/70">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line/70 bg-surface-secondary text-content-secondary">
                    <th className="px-md py-sm text-left font-medium">메뉴</th>
                    {(Object.keys(PERM_LABELS) as PermKey[]).map((k) => (
                      <th key={k} className="px-sm py-sm text-center font-medium">{PERM_LABELS[k]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_PERMISSION_MENUS.flatMap((g) =>
                    g.menus.map((menu) => (
                      <tr key={`${g.group}-${menu}`} className="border-b border-line/50 last:border-0">
                        <td className="px-md py-sm">
                          <span className="text-content">{menu}</span>
                          <span className="ml-xs text-[11px] text-content-tertiary">{g.group}</span>
                        </td>
                        {(Object.keys(PERM_LABELS) as PermKey[]).map((k) => {
                          const checked = !!form.matrix[menu]?.[k];
                          return (
                            <td key={k} className="px-sm py-sm text-center">
                              <button
                                onClick={() => toggleMatrix(menu, k)}
                                className={cn(
                                  'mx-auto flex h-5 w-5 items-center justify-center rounded-md border transition-all',
                                  checked ? 'border-primary bg-primary text-white' : 'border-line bg-white'
                                )}
                                aria-label={`${menu} ${PERM_LABELS[k]}`}
                              >
                                {checked && <Check size={12} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* 배정 0명 즉시 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="역할을 삭제하시겠습니까?"
        description={deleteTarget ? `"${deleteTarget.name}" 역할을 삭제합니다. 배정된 직원이 없어 즉시 삭제됩니다.` : ''}
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* DLG-087-001 역할 삭제 재배정 */}
      <Modal
        isOpen={!!reassignTarget}
        onClose={() => setReassignTarget(null)}
        title="역할 삭제 — 직원 재배정"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button onClick={() => setReassignTarget(null)} className="rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary">
              취소
            </button>
            <button
              onClick={confirmReassign}
              disabled={!reassignTo}
              className="rounded-button bg-state-error px-lg py-sm text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50"
            >
              재배정 후 역할 삭제
            </button>
          </div>
        }
      >
        {reassignTarget && (
          <div className="space-y-md">
            <p className="text-[13px] text-content-secondary">
              <span className="font-semibold text-content">{reassignTarget.name}</span> 역할에 직원 {reassignTarget.members}명이 배정되어 있습니다. 삭제하려면 다른 역할로 일괄 재배정해야 합니다.
            </p>
            <div className="space-y-xs">
              {Array.from({ length: Math.min(reassignTarget.members, 3) }).map((_, i) => (
                <div key={i} className="flex items-center gap-sm rounded-xl bg-surface-secondary px-md py-xs text-[12px]">
                  <Users size={13} className="text-content-tertiary" /> 직원 {i + 1} · 현재 {reassignTarget.name}
                </div>
              ))}
            </div>
            <Select
              label="재배정할 역할"
              options={roles.filter((r) => r.id !== reassignTarget.id).map((r) => ({ value: r.id, label: r.name }))}
              value={reassignTo}
              onChange={setReassignTo}
              placeholder="역할 선택"
            />
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}
