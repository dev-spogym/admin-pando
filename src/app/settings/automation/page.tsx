'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import TabNav from '@/components/common/TabNav';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import Switch from '@/components/ui/Switch';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CheckCircle2,
  History,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  AUTOMATION_POLICY_LABELS,
  AUTOMATION_STEPS,
  ASSET_RECOVERY_POLICIES,
  type AutomationPolicyType,
  type AutomationStep,
} from '@/mocks/settings';
import { loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';

type LoadState = 'loading' | 'ready' | 'error';
// 권한 데모: owner만 변경 가능, manager는 조회 전용
type ViewerRole = 'owner' | 'manager';

const TABS = [
  { key: 'membership_expiry', label: '회원 이용권 만료' },
  { key: 'payment_due_expiry', label: '결제기한 만료' },
  { key: 'locker_expiry', label: '락커 만료' },
  { key: 'asset_recovery', label: '실물 자산 자동 회수' },
];

export default function SettingsAutomationPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [viewerRole, setViewerRole] = useState<ViewerRole>('owner');
  const [activeTab, setActiveTab] = useState<string>('membership_expiry');
  const [steps, setSteps] = useState<AutomationStep[]>(AUTOMATION_STEPS);
  const [assets, setAssets] = useState(ASSET_RECOVERY_POLICIES);
  const [dirty, setDirty] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadBranchSetting<{ steps: AutomationStep[]; assets: typeof ASSET_RECOVERY_POLICIES }>('automation_apply_settings', {
      steps: AUTOMATION_STEPS,
      assets: ASSET_RECOVERY_POLICIES,
    }).then((saved) => {
      if (!mounted) return;
      setSteps(saved.steps ?? AUTOMATION_STEPS);
      setAssets(saved.assets ?? ASSET_RECOVERY_POLICIES);
      setDirty(false);
    });
    return () => { mounted = false; };
  }, []);

  const canEdit = viewerRole === 'owner';
  const policyType = activeTab as AutomationPolicyType;
  const isPolicyTab = activeTab !== 'asset_recovery';
  const tabSteps = steps.filter((s) => s.policyType === policyType);

  const summary = {
    hqPolicies: 3,
    activeHqSteps: steps.filter((s) => s.scope === 'hq' && s.enabled).length,
    branchSteps: steps.filter((s) => s.scope === 'branch').length,
    recoveryOn: assets.filter((a) => a.enabled).length,
    recentFailures: 1,
  };

  const toggleStep = (id: string) => {
    if (!canEdit) {
      toast.error('이 작업을 수행할 권한이 없습니다');
      return;
    }
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setDirty(true);
  };

  const toggleAsset = (id: string) => {
    const target = assets.find((a) => a.id === id);
    if (!target) return;
    if (target.fixed) {
      toast.error('상태 갱신은 고정 ON입니다');
      return;
    }
    if (!canEdit) {
      toast.error('이 작업을 수행할 권한이 없습니다');
      return;
    }
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
    setDirty(true);
  };

  const handleAddBranchStep = () => {
    if (policyType === 'payment_due_expiry') {
      toast.error('결제기한 만료는 본사 정책 step만 사용할 수 있습니다');
      return;
    }
    toast.success('지점 추가 step 입력 폼을 준비 중입니다');
  };

  const handleTestSend = () => {
    toast.success(`${AUTOMATION_POLICY_LABELS[policyType] ?? '선택 정책'} 기준 테스트 발송을 예약했습니다`);
  };

  const handleRestoreDefaults = () => {
    setSteps(AUTOMATION_STEPS);
    setAssets(ASSET_RECOVERY_POLICIES);
    setDirty(false);
    toast.success('본사 기본값으로 복원했습니다');
  };

  const handleConfirmApply = async () => {
    const error = await saveBranchSetting('automation_apply_settings', { steps, assets });
    if (error) {
      toast.error(`지점 자동화 적용 설정 저장 실패: ${error}`);
      return;
    }
    setShowConfirm(false);
    setDirty(false);
    toast.success('지점 자동화 적용 설정을 저장했습니다');
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-lg">
        <PageHeader
          title="지점 자동화 적용"
          description="본사에서 배포한 자동화 정책 세트를 지점 운영 범위 안에서 선택·적용합니다."
          actions={
            <div className="flex items-center gap-sm">
              {/* 권한 데모 토글 (목업) */}
              <div className="flex items-center rounded-full border border-line/70 bg-white/70 p-[3px] text-[12px]">
                {(['owner', 'manager'] as ViewerRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setViewerRole(r)}
                    className={cn(
                      'rounded-full px-3 py-1 font-semibold transition-all',
                      viewerRole === r ? 'bg-primary text-white' : 'text-content-secondary'
                    )}
                  >
                    {r === 'owner' ? 'Owner(지점장)' : 'manager'}
                  </button>
                ))}
              </div>
              <button className="flex items-center gap-xs rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary">
                <History size={15} /> 변경 이력
              </button>
              <button
                onClick={handleTestSend}
                className="flex items-center gap-xs rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary"
              >
                <Send size={15} /> 테스트 발송
              </button>
              <button
                onClick={() => setShowConfirm(true)}
                disabled={!canEdit || !dirty}
                className="flex items-center gap-xs rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              >
                <Save size={15} /> 적용 저장
              </button>
            </div>
          }
        />

        <div className="rounded-2xl border border-line/70 bg-white/70 px-lg py-md text-[13px] text-content-secondary">
          퍼블리싱 완료 / 데이터 미연동 · 현재 지점: 강남점 · 마지막 저장 2026-05-25 11:30 · 변경자 김지점 ·{' '}
          <span className="font-semibold text-state-success">본사 정책 동기화됨</span>
        </div>

        {!canEdit && (
          <div className="flex items-center gap-sm rounded-2xl border border-amber-200 bg-amber-50 px-lg py-md text-[13px] text-amber-700">
            <ShieldAlert size={16} /> manager는 적용 상태 조회만 가능합니다. 정책/스텝 ON/OFF, 지점 추가 step 관리, 롤백은 Owner(지점장)만 변경할 수 있습니다.
          </div>
        )}

        {loadState === 'loading' ? (
          <div className="grid grid-cols-2 gap-md lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <StatCard key={i} label="" value="" loading />
            ))}
          </div>
        ) : loadState === 'error' ? (
          <EmptyState
            icon={AlertTriangle}
            title="정책 적용 현황을 불러오지 못했습니다"
            description="일시적으로 처리하지 못했습니다. 다시 시도해주세요."
            action={{ label: '다시 시도', onClick: () => setLoadState('ready') }}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-md lg:grid-cols-5">
              <StatCard label="적용 중 본사 정책" value={`${summary.hqPolicies}개`} icon={<Layers />} variant="peach" />
              <StatCard label="활성 본사 step" value={`${summary.activeHqSteps}개`} icon={<CheckCircle2 />} variant="mint" />
              <StatCard label="지점 추가 step" value={`${summary.branchSteps}개`} icon={<Plus />} />
              <StatCard label="자동 회수 ON" value={`${summary.recoveryOn}개`} icon={<RefreshCw />} />
              <StatCard label="최근 실패 알림" value={`${summary.recentFailures}건`} icon={<AlertTriangle />} />
            </div>

            <TabNav tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

            {isPolicyTab ? (
              <section className="relative overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card">
                <div className="flex items-center justify-between border-b border-line/70 px-lg py-md">
                  <div>
                    <h2 className="text-Section-Title font-bold text-content">{AUTOMATION_POLICY_LABELS[policyType]} 정책 step</h2>
                    <p className="mt-xs text-[12px] text-content-secondary">
                      본사 step 기준일은 읽기 전용입니다. Owner(지점장)만 허용 step을 켜거나 끌 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-sm">
                    {policyType !== 'payment_due_expiry' && (
                      <button
                        onClick={handleAddBranchStep}
                        disabled={!canEdit}
                        className="flex items-center gap-xs rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary disabled:opacity-50"
                      >
                        <Plus size={15} /> 지점 step 추가
                      </button>
                    )}
                    <button
                      onClick={handleRestoreDefaults}
                      disabled={!canEdit}
                      className="flex items-center gap-xs rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary disabled:opacity-50"
                    >
                      <RotateCcw size={15} /> 본사 기본값 복원
                    </button>
                  </div>
                </div>

                {policyType === 'payment_due_expiry' && (
                  <div className="border-b border-line/70 bg-surface-secondary px-lg py-sm text-[12px] text-content-secondary">
                    결제기한 만료는 본사 정책 step만 사용할 수 있습니다.
                  </div>
                )}

                {tabSteps.length === 0 ? (
                  <EmptyState icon={Layers} title="등록된 step이 없습니다" description="본사 관리자에게 정책 세트 배포를 요청하세요." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-line/70 text-left text-[12px] text-content-secondary">
                          <th className="px-lg py-sm font-medium">기준일</th>
                          <th className="px-md py-sm font-medium">구분</th>
                          <th className="px-md py-sm font-medium">발송 시각</th>
                          <th className="px-md py-sm font-medium">반복</th>
                          <th className="px-md py-sm font-medium">채널</th>
                          <th className="px-md py-sm font-medium">템플릿</th>
                          <th className="px-md py-sm font-medium">마지막 변경</th>
                          <th className="px-lg py-sm text-right font-medium">지점 ON/OFF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tabSteps.map((step) => (
                          <tr
                            key={step.id}
                            className={cn('border-b border-line/50 last:border-0', step.conflict && 'bg-red-50/60')}
                          >
                            <td className="px-lg py-md font-bold text-content">{step.baseDay}</td>
                            <td className="px-md py-md">
                              <StatusBadge variant={step.scope === 'hq' ? 'info' : 'peach'} label={step.scope === 'hq' ? '본사' : '지점 추가'} />
                              {step.conflict && <StatusBadge className="ml-xs" variant="error" label="충돌" />}
                            </td>
                            <td className="px-md py-md text-content-secondary">{step.sendTime}</td>
                            <td className="px-md py-md text-content-secondary">{step.repeat}</td>
                            <td className="px-md py-md text-content-secondary">{step.channel}</td>
                            <td className="px-md py-md text-content-secondary">{step.template}</td>
                            <td className="px-md py-md text-[12px] text-content-tertiary">
                              {step.updatedBy} · {step.updatedAt}
                            </td>
                            <td className="px-lg py-md">
                              <div className="flex items-center justify-end gap-xs">
                                {step.forcedOn ? (
                                  <span className="flex items-center gap-xs text-[12px] text-content-tertiary" title="본사 강제 ON 항목입니다">
                                    <Lock size={13} /> 강제 ON
                                  </span>
                                ) : (
                                  <Switch
                                    checked={step.enabled}
                                    onChange={() => toggleStep(step.id)}
                                    disabled={!canEdit}
                                    aria-label={`${step.template} ON/OFF`}
                                  />
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ) : (
              <section className="relative overflow-hidden rounded-[24px] border border-line/70 bg-white/82 shadow-card">
                <div className="border-b border-line/70 px-lg py-md">
                  <h2 className="text-Section-Title font-bold text-content">실물 자산 자동 회수 정책</h2>
                  <p className="mt-xs text-[12px] text-content-secondary">
                    락커 만료 알림과 실물 자동 회수 실행은 분리됩니다. 회수 실행 정책은 Owner(지점장)이 ON/OFF합니다. (적용 화면: D06)
                  </p>
                </div>
                <div className="divide-y divide-line/50">
                  {assets.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-md px-lg py-md">
                      <div>
                        <div className="flex items-center gap-xs">
                          <p className="font-semibold text-content">{a.name}</p>
                          <StatusBadge variant="default" label={`기본 ${a.defaultValue}`} />
                          {a.fixed && <StatusBadge variant="warning" label="고정" />}
                        </div>
                        <p className="mt-xs text-[12px] text-content-secondary">{a.basis}</p>
                        <p className="mt-[2px] text-[11px] text-content-tertiary">
                          제어: {a.control} · 적용 화면: {a.appliedScreen} · 변경자: {a.updatedBy}
                        </p>
                      </div>
                      {a.fixed ? (
                        <span className="flex items-center gap-xs text-[12px] text-content-tertiary" title="상태 갱신은 고정 ON입니다">
                          <Lock size={13} /> 고정 ON
                        </span>
                      ) : (
                        <Switch checked={a.enabled} onChange={() => toggleAsset(a.id)} disabled={!canEdit} aria-label={`${a.name} ON/OFF`} />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* DLG-080A-001 정책 적용 확인 */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="정책 적용 확인"
        size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-button border border-line px-md py-sm text-[13px] text-content-secondary hover:bg-surface-secondary"
            >
              취소
            </button>
            <button onClick={handleConfirmApply} className="rounded-button bg-primary px-lg py-sm text-[13px] font-bold text-white hover:opacity-90">
              저장
            </button>
          </div>
        }
      >
        <div className="space-y-md">
          <div>
            <p className="text-[12px] text-content-secondary">적용 대상 정책 유형</p>
            <p className="font-semibold text-content">{AUTOMATION_POLICY_LABELS[policyType] ?? '실물 자산 자동 회수'}</p>
          </div>
          <div className="rounded-2xl border border-line/70 bg-surface-secondary px-md py-sm text-[13px]">
            <p className="mb-xs font-semibold text-content">변경 요약</p>
            <ul className="list-disc space-y-xs pl-md text-content-secondary">
              <li>비활성화한 스텝 {steps.filter((s) => !s.enabled && !s.forcedOn).length}개</li>
              <li>지점 추가 step {steps.filter((s) => s.scope === 'branch').length}개</li>
              <li>자동 회수 ON {assets.filter((a) => a.enabled).length}개</li>
            </ul>
          </div>
          <p className="text-[12px] text-content-tertiary">
            저장 후 24시간 내 롤백할 수 있습니다. 플랫폼 예상 발송 비용은 적용 직후 산정됩니다.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}
