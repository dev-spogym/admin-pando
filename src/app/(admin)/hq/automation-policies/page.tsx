'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { toast } from 'sonner';
import {
  BellRing,
  Building2,
  CheckCircle2,
  Clock,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

type PolicyStatus = '사용 중' | '검수 중' | '일시 중지';

interface PolicySet {
  name: string;
  scope: string;
  steps: number;
  branches: number;
  status: PolicyStatus;
  updatedAt: string;
  editableRange: string;
}

const INITIAL_POLICY_SETS: PolicySet[] = [
  { name: '표준 만료 알림 정책', scope: '전 지점', steps: 5, branches: 12, status: '사용 중', updatedAt: '2026-04-29', editableRange: '허용 스텝만 조정' },
  { name: 'VIP 재등록 집중 관리', scope: '프리미엄 지점', steps: 4, branches: 4, status: '검수 중', updatedAt: '2026-04-26', editableRange: '템플릿만 교체' },
  { name: '휴면 회원 복귀 캠페인', scope: '선택 지점', steps: 3, branches: 8, status: '일시 중지', updatedAt: '2026-04-22', editableRange: '본사 승인 후 조정' },
];

const steps = [
  { day: 'D-30', channel: '카카오 알림톡', required: '필수', template: '만료 예정 1차 안내' },
  { day: 'D-14', channel: 'SMS', required: '권장', template: '재등록 혜택 안내' },
  { day: 'D-7', channel: 'FC 액션 큐', required: '필수', template: '전화 상담 요청' },
  { day: 'D+1', channel: '앱 푸시', required: '선택', template: '만료 후 복귀 안내' },
];

const statusTone: Record<PolicyStatus, string> = {
  '사용 중': 'bg-emerald-100 text-emerald-700',
  '검수 중': 'bg-amber-100 text-amber-700',
  '일시 중지': 'bg-slate-100 text-slate-600',
};

const todayString = () => new Date().toISOString().slice(0, 10);

export default function AutomationPoliciesPage() {
  const [policySets, setPolicySets] = useState<PolicySet[]>(INITIAL_POLICY_SETS);
  const [selectedName, setSelectedName] = useState(INITIAL_POLICY_SETS[0]?.name ?? '');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    scope: '전 지점',
    steps: 4,
    status: '검수 중' as PolicyStatus,
  });
  const [scopeForm, setScopeForm] = useState({
    scope: INITIAL_POLICY_SETS[0]?.scope ?? '전 지점',
    editableRange: INITIAL_POLICY_SETS[0]?.editableRange ?? '허용 스텝만 조정',
    status: INITIAL_POLICY_SETS[0]?.status ?? '사용 중',
  });

  const selected = useMemo(
    () => policySets.find((policy) => policy.name === selectedName) ?? policySets[0],
    [policySets, selectedName]
  );

  const openScopeModal = () => {
    if (!selected) return;
    setScopeForm({
      scope: selected.scope,
      editableRange: selected.editableRange,
      status: selected.status,
    });
    setIsScopeModalOpen(true);
  };

  const handleCreatePolicySet = () => {
    if (!createForm.name.trim()) {
      toast.error('정책 세트 이름을 입력하세요.');
      return;
    }

    const nextPolicy: PolicySet = {
      name: createForm.name.trim(),
      scope: createForm.scope,
      steps: createForm.steps,
      branches: createForm.scope === '전 지점' ? 12 : createForm.scope === '프리미엄 지점' ? 4 : 6,
      status: createForm.status,
      updatedAt: todayString(),
      editableRange: '허용 스텝만 조정',
    };

    setPolicySets((prev) => [nextPolicy, ...prev]);
    setSelectedName(nextPolicy.name);
    setIsCreateModalOpen(false);
    setCreateForm({ name: '', scope: '전 지점', steps: 4, status: '검수 중' });
    toast.success(`"${nextPolicy.name}" 정책 세트를 생성했습니다.`);
  };

  const handleSaveScope = () => {
    if (!selected) return;

    setPolicySets((prev) =>
      prev.map((policy) =>
        policy.name === selected.name
          ? {
              ...policy,
              scope: scopeForm.scope,
              editableRange: scopeForm.editableRange,
              status: scopeForm.status,
              updatedAt: todayString(),
            }
          : policy
      )
    );
    setIsScopeModalOpen(false);
    toast.success('허용 범위 설정을 반영했습니다.');
  };

  const appliedBranchCount = policySets.reduce((sum, policy) => sum + policy.branches, 0);

  return (
    <AppLayout>
      <PageHeader
        title="자동화 정책 라이브러리"
        description="본사가 전 지점에 적용할 만료 알림과 운영 자동화 정책 세트를 관리합니다"
        actions={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            정책 세트 생성
          </Button>
        }
      />

      <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        퍼블리싱 완료 / 데이터 미연동: 화면 구조 검수용 목업이며 Supabase·외부 템플릿 연동은 후속 단계입니다.
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: '운영 정책 세트', value: `${policySets.length}개`, icon: ShieldCheck, tone: 'text-blue-600 bg-blue-50' },
          { label: '적용 지점', value: `${appliedBranchCount}곳`, icon: Building2, tone: 'text-emerald-600 bg-emerald-50' },
          { label: '필수 스텝', value: `${steps.length}개`, icon: BellRing, tone: 'text-amber-600 bg-amber-50' },
          { label: '최근 수정', value: selected?.updatedAt.slice(5).replace('-', '/') ?? '-', icon: Clock, tone: 'text-slate-600 bg-slate-50' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className={`mb-3 inline-flex rounded-lg p-2 ${card.tone}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[360px_1fr] gap-6">
        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">정책 세트</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {policySets.map((policy) => (
              <button
                key={policy.name}
                type="button"
                onClick={() => setSelectedName(policy.name)}
                className={`w-full px-5 py-4 text-left transition-colors ${
                  selected?.name === policy.name ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-semibold text-gray-900">{policy.name}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusTone[policy.status]}`}>
                    {policy.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{policy.scope} · {policy.steps}개 스텝 · {policy.branches}개 지점 적용</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">{selected?.name}</h2>
              <p className="mt-1 text-xs text-gray-500">마지막 수정일 {selected?.updatedAt}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              onClick={openScopeModal}
            >
              허용 범위 설정
            </Button>
          </div>

          <div className="p-5">
            <div className="mb-5 grid grid-cols-3 gap-3">
              {[
                { label: '적용 범위', value: selected?.scope ?? '-' },
                { label: '지점 수정 권한', value: selected?.editableRange ?? '-' },
                { label: '신규 적용 상태', value: selected?.status ?? '-' },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">기준일</th>
                    <th className="px-4 py-3 text-left font-medium">채널</th>
                    <th className="px-4 py-3 text-left font-medium">필수 여부</th>
                    <th className="px-4 py-3 text-left font-medium">템플릿</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {steps.map((step) => (
                    <tr key={`${step.day}-${step.channel}`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{step.day}</td>
                      <td className="px-4 py-3 text-gray-700">{step.channel}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{step.required}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{step.template}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> 사용 중지된 정책은 신규 적용만 차단하고 기존 지점에는 영향 범위를 고지합니다.
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="정책 세트 생성"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>취소</Button>
            <Button onClick={handleCreatePolicySet}>생성 완료</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="space-y-xs">
            <label className="text-sm font-semibold text-gray-900">정책 세트 이름</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="예: 장기 미방문 회원 복귀 케어"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-blue-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-sm font-semibold text-gray-900">적용 범위</label>
              <select
                value={createForm.scope}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, scope: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-blue-400"
              >
                <option value="전 지점">전 지점</option>
                <option value="프리미엄 지점">프리미엄 지점</option>
                <option value="선택 지점">선택 지점</option>
              </select>
            </div>
            <div className="space-y-xs">
              <label className="text-sm font-semibold text-gray-900">초기 스텝 수</label>
              <input
                type="number"
                min={1}
                max={12}
                value={createForm.steps}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, steps: Number(event.target.value) || 1 }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-blue-400"
              />
            </div>
          </div>
          <div className="space-y-xs">
            <label className="text-sm font-semibold text-gray-900">초기 상태</label>
            <div className="grid grid-cols-3 gap-sm">
              {(['사용 중', '검수 중', '일시 중지'] as PolicyStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setCreateForm((prev) => ({ ...prev, status }))}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    createForm.status === status
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        title="허용 범위 설정"
        size="lg"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="outline" onClick={() => setIsScopeModalOpen(false)}>취소</Button>
            <Button onClick={handleSaveScope}>변경 적용</Button>
          </div>
        }
      >
        <div className="space-y-md">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            선택한 정책 세트의 적용 지점 범위와 지점별 수정 허용 수준을 함께 조정합니다.
          </div>
          <div className="grid grid-cols-2 gap-md">
            <div className="space-y-xs">
              <label className="text-sm font-semibold text-gray-900">적용 범위</label>
              <select
                value={scopeForm.scope}
                onChange={(event) => setScopeForm((prev) => ({ ...prev, scope: event.target.value }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-blue-400"
              >
                <option value="전 지점">전 지점</option>
                <option value="프리미엄 지점">프리미엄 지점</option>
                <option value="선택 지점">선택 지점</option>
              </select>
            </div>
            <div className="space-y-xs">
              <label className="text-sm font-semibold text-gray-900">신규 적용 상태</label>
              <select
                value={scopeForm.status}
                onChange={(event) => setScopeForm((prev) => ({ ...prev, status: event.target.value as PolicyStatus }))}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition-all focus:border-blue-400"
              >
                <option value="사용 중">사용 중</option>
                <option value="검수 중">검수 중</option>
                <option value="일시 중지">일시 중지</option>
              </select>
            </div>
          </div>
          <div className="space-y-xs">
            <label className="text-sm font-semibold text-gray-900">지점 수정 허용 범위</label>
            <div className="space-y-sm">
              {['허용 스텝만 조정', '템플릿만 교체', '본사 승인 후 조정'].map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setScopeForm((prev) => ({ ...prev, editableRange: range }))}
                  className={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    scopeForm.editableRange === range
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{range}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {range === '허용 스텝만 조정'
                        ? '지점은 본사 정책 구조를 유지한 채 허용된 스텝만 조정합니다.'
                        : range === '템플릿만 교체'
                          ? '스텝 구조는 유지하고 지점별 템플릿만 바꿀 수 있습니다.'
                          : '예외 조정은 본사 승인 기록을 남긴 뒤 적용합니다.'}
                    </p>
                  </div>
                  {scopeForm.editableRange === range && <CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
