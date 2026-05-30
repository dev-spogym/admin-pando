'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Plus,
  Download,
  Zap,
  Users,
  Building2,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Wifi,
  FileText,
  BadgeCent,
  X,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import Button from '@/components/ui/Button';
import { formatKRW, formatNumber } from '@/lib/format';
import { exportToExcel } from '@/lib/exportExcel';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import TabNav from "@/components/common/TabNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from 'sonner';
import { loadBranchSetting, saveBranchSetting } from '@/lib/branchSettings';

type BillingCycle = 'monthly' | 'annual';
type PlanStatus = 'active' | 'cancel_pending' | 'expired';

interface CurrentPlan {
  name: string;
  status: PlanStatus;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  amount: number;
  usage: {
    members: { current: number; limit: number };
    branches: { current: number; limit: number };
    staff: { current: number; limit: number };
    points: { current: number; limit: number };
  };
}

interface PaymentMethod {
  id: number;
  type: string;
  last4: string;
  isDefault: boolean;
  expiry: string;
  bank: string;
}

interface BillingHistory {
  id: number;
  date: string;
  plan: string;
  amount: number;
  method: string;
  status: string;
}

interface PlanOption {
  id: string;
  name: string;
  price: Record<BillingCycle, number>;
  features: {
    members: string;
    branches: string;
    staff: string;
    points: string;
    alarms: string;
    kiosk: string;
    iot: string;
    contract: string;
    mileage: string;
    api: string;
    support: string;
  };
}

interface SubscriptionSettings {
  currentPlan: CurrentPlan;
  paymentMethods: PaymentMethod[];
  billingHistory: BillingHistory[];
}

const DEFAULT_CURRENT_PLAN: CurrentPlan = {
  name: 'Pro',
  status: 'active',
  billingCycle: 'annual',
  nextBillingDate: '2026-05-15',
  amount: 120000,
  usage: {
    members: { current: 850, limit: 1000 },
    branches: { current: 2, limit: 3 },
    staff: { current: 15, limit: 20 },
    points: { current: 4200, limit: 5000 },
  }
};

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: 1, type: 'visa', last4: '4242', isDefault: true, expiry: '12/28', bank: '신한카드' },
  { id: 2, type: 'master', last4: '8888', isDefault: false, expiry: '05/27', bank: '국민카드' },
];

const DEFAULT_BILLING_HISTORY: BillingHistory[] = [
  { id: 1, date: '2025-05-15', plan: 'Pro (Annual)', amount: 1200000, method: 'Visa **** 4242', status: 'success' },
  { id: 2, date: '2024-05-15', plan: 'Pro (Annual)', amount: 1200000, method: 'Visa **** 4242', status: 'success' },
  { id: 3, date: '2024-04-15', plan: 'Starter (Monthly)', amount: 55000, method: 'Visa **** 4242', status: 'success' },
];

const DEFAULT_PLANS: PlanOption[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 55000, annual: 44000 },
    features: {
      members: '최대 300명', branches: '1개', staff: '5개', points: '월 1,000건',
      alarms: '기본 5종', kiosk: '미지원', iot: '미지원', contract: '미지원',
      mileage: '미지원', api: '미지원', support: '이메일'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 110000, annual: 88000 },
    features: {
      members: '최대 1,000명', branches: '최대 3개', staff: '20개', points: '월 5,000건',
      alarms: '전체 13종', kiosk: '1대', iot: '지원', contract: '지원',
      mileage: '지원', api: '미지원', support: '이메일 + 채팅'
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 250000, annual: 200000 },
    features: {
      members: '무제한', branches: '무제한', staff: '무제한', points: '무제한',
      alarms: '전체 13종 + 커스텀', kiosk: '무제한', iot: '지원', contract: '지원',
      mileage: '지원', api: '지원', support: '전담 매니저'
    }
  }
];

const SUBSCRIPTION_SETTING_KEY = 'subscription_settings';

async function loadSubscriptionSettings(): Promise<SubscriptionSettings> {
  const saved = await loadBranchSetting<Partial<SubscriptionSettings>>(SUBSCRIPTION_SETTING_KEY, {});
  return {
    currentPlan: { ...DEFAULT_CURRENT_PLAN, ...(saved.currentPlan ?? {}) },
    paymentMethods: saved.paymentMethods?.length ? saved.paymentMethods : DEFAULT_PAYMENT_METHODS,
    billingHistory: saved.billingHistory?.length ? saved.billingHistory : DEFAULT_BILLING_HISTORY,
  };
}

// 사용량 진행 바
function UsageBar({ label, current, limit, icon: Icon, unit = '' }: {
  label: string; current: number; limit: number; icon: React.ElementType; unit?: string;
}) {
  const percent = Math.min((current / limit) * 100, 100);
  const isWarning = percent >= 80;

  return (
    <div className="bg-surface p-lg rounded-xl border border-line shadow-card">
      <div className="flex justify-between items-center mb-sm">
        <div className="flex items-center gap-sm">
          <div className={cn("p-xs rounded-button", isWarning ? "bg-state-error/10" : "bg-accent-light")}>
            <Icon className={isWarning ? "text-state-error" : "text-accent"} size={18} />
          </div>
          <span className="text-Body-1 font-semibold text-content">{label}</span>
        </div>
        <span className="text-Body-2 text-content-secondary">
          <span className="font-bold text-content">{formatNumber(current)}</span> / {formatNumber(limit)}{unit}
        </span>
      </div>
      <div className="h-2 w-full bg-surface-secondary rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", isWarning ? "bg-state-error" : "bg-accent")}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isWarning && (
        <p className="mt-xs text-Label text-state-error flex items-center gap-xs">
          <AlertCircle size={12} /> 한도의 {Math.round(percent)}%에 도달했습니다. 플랜 업그레이드를 권장합니다.
        </p>
      )}
    </div>
  );
}

export default function Subscription() {
  const [activeTab, setActiveTab] = useState('current');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPlanChangeDialogOpen, setIsPlanChangeDialogOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<PlanOption | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan>(DEFAULT_CURRENT_PLAN);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(DEFAULT_PAYMENT_METHODS);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>(DEFAULT_BILLING_HISTORY);
  const [isLoading, setIsLoading] = useState(true);

  const plans = useMemo(() => DEFAULT_PLANS.map(plan => ({
    ...plan,
    isCurrent: plan.name.toLowerCase() === currentPlan.name.toLowerCase(),
  })), [currentPlan.name]);

  const persistSubscription = async (next?: Partial<SubscriptionSettings>) => {
    const error = await saveBranchSetting(SUBSCRIPTION_SETTING_KEY, {
      currentPlan: next?.currentPlan ?? currentPlan,
      paymentMethods: next?.paymentMethods ?? paymentMethods,
      billingHistory: next?.billingHistory ?? billingHistory,
    });
    return error;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadSubscriptionSettings();
      if (!mounted) return;
      setCurrentPlan(saved.currentPlan);
      setPaymentMethods(saved.paymentMethods);
      setBillingHistory(saved.billingHistory);
      setBillingCycle(saved.currentPlan.billingCycle);
      setIsLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const handleCancelSubscription = async () => {
    const nextPlan: CurrentPlan = { ...currentPlan, status: 'cancel_pending' };
    setCurrentPlan(nextPlan);
    setIsCancelDialogOpen(false);
    const error = await persistSubscription({ currentPlan: nextPlan });
    if (error) {
      toast.error(`구독 취소 저장 실패: ${error}`);
      return;
    }
    toast.success('구독 취소 신청이 완료되었습니다. 현재 구독 기간 종료 시까지 서비스를 이용하실 수 있습니다.');
  };

  const handlePlanSelect = (plan: PlanOption & { isCurrent: boolean }) => {
    if (plan.isCurrent) return;
    setPendingPlan(plan);
    setIsPlanChangeDialogOpen(true);
  };

  const confirmPlanChange = async () => {
    if (!pendingPlan) return;
    const today = new Date().toISOString().slice(0, 10);
    const nextPlan: CurrentPlan = {
      ...currentPlan,
      name: pendingPlan.name,
      status: 'active',
      billingCycle,
      amount: pendingPlan.price[billingCycle],
    };
    const defaultMethod = paymentMethods.find(method => method.isDefault);
    const nextHistory: BillingHistory[] = [{
      id: Date.now(),
      date: today,
      plan: `${pendingPlan.name} (${billingCycle === 'annual' ? 'Annual' : 'Monthly'})`,
      amount: billingCycle === 'annual' ? pendingPlan.price.annual * 12 : pendingPlan.price.monthly,
      method: defaultMethod ? `${defaultMethod.type.toUpperCase()} **** ${defaultMethod.last4}` : '결제수단 미등록',
      status: defaultMethod ? 'success' : 'pending_method',
    }, ...billingHistory];
    setCurrentPlan(nextPlan);
    setBillingHistory(nextHistory);
    setIsPlanChangeDialogOpen(false);
    setPendingPlan(null);
    const error = await persistSubscription({ currentPlan: nextPlan, billingHistory: nextHistory });
    if (error) {
      toast.error(`플랜 변경 저장 실패: ${error}`);
      return;
    }
    toast.success('플랜 변경이 반영되었습니다. 청구 이력에 변경 내역을 추가했습니다.');
  };

  const handleAddPaymentMethod = async () => {
    const nextMethod: PaymentMethod = {
      id: Date.now(),
      type: 'visa',
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      isDefault: paymentMethods.length === 0,
      expiry: '12/30',
      bank: '신규 카드',
    };
    const nextMethods = [...paymentMethods, nextMethod];
    setPaymentMethods(nextMethods);
    const error = await persistSubscription({ paymentMethods: nextMethods });
    if (error) {
      toast.error(`결제 수단 저장 실패: ${error}`);
      return;
    }
    toast.success('결제 수단 등록 흐름을 완료 처리했습니다. 실제 PG 연동 전까지 테스트 카드로 저장됩니다.');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-lg animate-pulse">
          <div className="h-20 rounded-xl border border-line bg-surface" />
          <div className="h-12 rounded-xl border border-line bg-surface" />
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-3">
            <div className="h-72 rounded-xl border border-line bg-surface lg:col-span-2" />
            <div className="h-72 rounded-xl border border-line bg-surface" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // ── 구독 현황 탭 ──
  const renderCurrent = () => (
    <div className="space-y-lg">
      {/* 플랜 + 결제 수단 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* 현재 플랜 카드 */}
        <div className="lg:col-span-2 bg-surface rounded-xl border border-line shadow-card p-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
          <div className="absolute top-lg right-lg">
            <StatusBadge
              variant={currentPlan.status === 'active' ? 'success' : currentPlan.status === 'cancel_pending' ? 'warning' : 'error'}
              label={currentPlan.status === 'active' ? '구독 중' : currentPlan.status === 'cancel_pending' ? '해지 예정' : '만료'}
              dot
            />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-xl pt-sm">
            <div>
              <p className="text-Label text-content-secondary mb-xs">현재 플랜</p>
              <h3 className="text-Heading-1 text-content font-bold mb-sm">Fit {currentPlan.name} Plan</h3>
              <div className="flex items-center gap-sm text-Body-2 text-content-secondary mb-lg">
                <Calendar size={14} />
                <span>{currentPlan.billingCycle === 'annual' ? '연간 결제' : '월간 결제'}</span>
                <span>•</span>
                <span>다음 결제일: {currentPlan.nextBillingDate}</span>
              </div>
              <div className="flex items-end gap-xs">
                <span className="text-Heading-1 text-primary font-bold">{formatKRW(currentPlan.amount)}</span>
                <span className="text-Body-1 text-content-secondary mb-1">/ {currentPlan.billingCycle === 'annual' ? '년' : '월'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-sm min-w-[200px]">
              <Button
                variant="primary"
                fullWidth
                icon={<ChevronRight size={18} />}
                onClick={() => setActiveTab('plans')}
              >
                플랜 변경하기
              </Button>
              <Button
                variant="ghost"
                fullWidth
                className="text-content-secondary hover:text-state-error"
                onClick={() => setIsCancelDialogOpen(true)}
              >
                구독 취소 신청
              </Button>
            </div>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="bg-primary-light rounded-xl border border-primary/10 p-xl flex flex-col">
          <div className="flex justify-between items-center mb-lg">
            <h4 className="text-Body-1 font-bold text-content flex items-center gap-sm">
              <CreditCard className="text-primary" size={18} /> 결제 수단
            </h4>
            <Button variant="ghost" size="sm">관리</Button>
          </div>
          <div className="flex-1 flex flex-col gap-sm">
            {paymentMethods.filter(m => m.isDefault).map(card => (
              <div key={card.id} className="bg-surface p-lg rounded-xl border border-line shadow-sm">
                <div className="flex justify-between items-center mb-md">
                  <span className="px-xs py-[2px] bg-primary text-white text-[10px] rounded font-bold uppercase">{card.type}</span>
                  <span className="text-Label text-content-secondary">기본 결제 수단</span>
                </div>
                <p className="text-Body-1 font-bold text-content tracking-widest mb-xs">**** **** **** {card.last4}</p>
                <div className="flex justify-between items-center">
                  <p className="text-Body-2 text-content-secondary">{card.bank}</p>
                  <p className="text-Label text-content-secondary">{card.expiry}</p>
                </div>
              </div>
            ))}
            {paymentMethods.length === 0 && (
              <div className="rounded-xl border border-dashed border-line bg-surface p-lg text-center text-Label text-content-secondary">
                등록된 결제 수단이 없습니다.
              </div>
            )}
          </div>
          <Button
            variant="outline"
            fullWidth
            className="mt-lg border-dashed border-primary text-primary"
            icon={<Plus size={14} />}
            onClick={handleAddPaymentMethod}
          >
            새 카드 추가
          </Button>
        </div>
      </div>

      {/* 사용량 현황 */}
      <div>
        <h3 className="text-Heading-2 text-content mb-md">플랜 사용량 현황</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
          <UsageBar label="회원 수" current={currentPlan.usage.members.current} limit={currentPlan.usage.members.limit} icon={Users} unit="명" />
          <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => moveToPage(984)}>
            <UsageBar label="지점 수" current={currentPlan.usage.branches.current} limit={currentPlan.usage.branches.limit} icon={Building2} unit="개" />
          </div>
          <UsageBar label="직원 계정" current={currentPlan.usage.staff.current} limit={currentPlan.usage.staff.limit} icon={ShieldCheck} unit="개" />
          <UsageBar label="메시지 포인트" current={currentPlan.usage.points.current} limit={currentPlan.usage.points.limit} icon={MessageSquare} unit="건" />
        </div>
      </div>
    </div>
  );

  // ── 요금제 비교 탭 ──
  const renderPlans = () => (
    <div className="space-y-xl">
      <div className="text-center py-lg">
        <h2 className="text-Heading-1 text-content mb-sm">비즈니스 성장에 맞는 플랜을 선택하세요</h2>
        <p className="text-Body-1 text-content-secondary">연간 결제 시 월 요금의 20%를 할인해 드립니다.</p>
        {/* 결제 주기 토글 */}
        <div className="flex items-center justify-center mt-lg gap-md">
          <Button
            variant="ghost"
            onClick={() => setBillingCycle('monthly')}
            className={cn(billingCycle === 'monthly' ? "text-primary font-bold" : "text-content-secondary")}
          >
            월간 결제
          </Button>
          <button
            type="button"
            onClick={() => setBillingCycle(prev => prev === 'annual' ? 'monthly' : 'annual')}
            className={cn("relative w-12 h-6 rounded-full transition-colors duration-200", billingCycle === 'annual' ? "bg-primary" : "bg-line")}
          >
            <div className={cn("absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200", billingCycle === 'annual' ? "translate-x-6" : "translate-x-0")} />
          </button>
          <Button
            variant="ghost"
            onClick={() => setBillingCycle('annual')}
            className={cn("flex items-center gap-xs", billingCycle === 'annual' ? "text-primary font-bold" : "text-content-secondary")}
          >
            연간 결제
            <span className="text-[11px] bg-accent-light text-accent px-xs py-[1px] rounded-full border border-accent/20">20% 할인</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl">
        {plans.map(plan => (
          <div
            key={plan.id}
            className={cn(
              "flex flex-col bg-surface rounded-xl border shadow-card overflow-hidden transition-all hover:shadow-xl",
              plan.isCurrent ? "border-primary ring-2 ring-primary/10 scale-[1.02]" : "border-line"
            )}
          >
            {plan.isCurrent && (
              <div className="bg-primary text-white py-sm text-center text-Label font-bold tracking-wider">
                현재 이용 중인 플랜
              </div>
            )}
            <div className="p-xl border-b border-line">
              <h3 className="text-Heading-2 text-content font-bold mb-md">{plan.name}</h3>
              <div className="flex items-end gap-xs mb-xs">
                <span className="text-Heading-1 font-bold text-content">
                  {formatKRW(billingCycle === 'annual' ? plan.price.annual : plan.price.monthly)}
                </span>
                <span className="text-Body-2 text-content-secondary mb-1">/ 월</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-Label text-content-secondary">연간 {formatKRW(plan.price.annual * 12)} 결제</p>
              )}
            </div>

            <div className="p-xl flex-1 space-y-md bg-surface-secondary/20">
              {[
                { label: '회원 수', value: plan.features.members },
                { label: '지점 수', value: plan.features.branches },
                { label: '메시지', value: plan.features.points },
                { label: '자동 알림', value: plan.features.alarms },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-sm text-Body-2">
                  <CheckCircle2 className="text-accent flex-shrink-0" size={16} />
                  <span className="font-semibold text-content">{item.label}:</span>
                  <span className="text-content-secondary">{item.value}</span>
                </div>
              ))}
              <div className="pt-sm space-y-sm border-t border-line/50">
                {[
                  { label: '키오스크', value: plan.features.kiosk, icon: Smartphone },
                  { label: 'IoT 연동', value: plan.features.iot, icon: Wifi },
                  { label: '전자계약', value: plan.features.contract, icon: FileText },
                  { label: '마일리지', value: plan.features.mileage, icon: BadgeCent },
                  { label: 'API 연동', value: plan.features.api, icon: Zap },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-Body-2">
                    <div className="flex items-center gap-sm text-content-secondary">
                      <item.icon size={14} />
                      <span>{item.label}</span>
                    </div>
                    <span className={cn("font-medium", item.value === '미지원' ? "text-content-secondary/50" : "text-content")}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-xl">
              <Button
                variant={plan.isCurrent ? "secondary" : "primary"}
                fullWidth
                disabled={plan.isCurrent}
                onClick={() => handlePlanSelect(plan)}
              >
                {plan.isCurrent ? '현재 플랜' : '선택하기'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── 결제 이력 탭 ──
  const renderHistory = () => (
    <div className="space-y-lg">
      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <StatCard
          label="활성 구독 수"
          value="1개"
          icon={<CheckCircle2 className="text-accent" />}
          variant="mint"
          description="Pro 연간 플랜"
        />
        <StatCard
          label="월 결제 총액"
          value={formatKRW(currentPlan.amount)}
          icon={<CreditCard className="text-primary" />}
          variant="default"
          description="다음 결제일: 2026-05-15"
        />
      </div>

      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <DataTable
          title="결제 이력"
          data={billingHistory}
          columns={[
            { key: 'date', header: '결제일', width: 140 },
            { key: 'plan', header: '플랜명', width: 200 },
            {
              key: 'amount', header: '결제금액', width: 150,
              render: (val: number) => <span className="font-bold text-content">{formatKRW(val)}</span>
            },
            { key: 'method', header: '결제수단', width: 180 },
            {
              key: 'status', header: '상태', width: 120,
              render: (value: string) => (
                <StatusBadge
                  variant={value === 'success' ? 'success' : 'warning'}
                  label={value === 'success' ? '결제 완료' : '결제수단 필요'}
                  dot
                />
              )
            },
            {
              key: 'invoice', header: '증빙서류',
              render: () => (
                <Button variant="ghost" size="sm" icon={<Download size={14} />}>세금계산서</Button>
              ),
              align: 'right' as const
            }
          ]}
          onDownloadExcel={() => {
            const exportColumns = [
              { key: 'date', header: '결제일' },
              { key: 'plan', header: '플랜명' },
              { key: 'amount', header: '결제금액' },
              { key: 'method', header: '결제수단' },
              { key: 'status', header: '상태' },
            ];
            exportToExcel(billingHistory.map(row => ({ ...row })), exportColumns, { filename: '구독결제내역' });
            toast.success(`${billingHistory.length}건 엑셀 다운로드 완료`);
          }}
        />
      </div>
    </div>
  );

  return (
    <AppLayout>
      <div className="space-y-lg">
        <PageHeader
          title="구독 플랜 관리"
          description="Fit SaaS 서비스 구독 현황을 관리하고 결제 내역을 확인합니다."
          actions={
            <Button
              variant="primary"
              icon={<Zap size={18} />}
              onClick={() => setActiveTab('plans')}
            >
              플랜 업그레이드
            </Button>
          }
        />

        <TabNav
          tabs={[
            { key: 'current', label: '구독 현황' },
            { key: 'plans', label: '요금제 비교' },
            { key: 'history', label: '결제 이력' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === 'current' && renderCurrent()}
        {activeTab === 'plans' && renderPlans()}
        {activeTab === 'history' && renderHistory()}
      </div>

      <ConfirmDialog
        open={isCancelDialogOpen}
        title="구독 취소 신청"
        description={`정말로 구독을 취소하시겠습니까?\n취소 후에도 현재 구독 기간인 ${currentPlan.nextBillingDate}까지 서비스를 이용하실 수 있습니다.`}
        confirmLabel="구독 취소"
        variant="danger"
        confirmationText="구독취소"
        onConfirm={handleCancelSubscription}
        onCancel={() => setIsCancelDialogOpen(false)}
      />

      <ConfirmDialog
        open={isPlanChangeDialogOpen}
        title="플랜 변경 확인"
        description={
          pendingPlan
            ? `${pendingPlan.name} 플랜으로 변경합니다.\n${billingCycle === 'annual' ? '연간' : '월간'} 결제 기준 청구 예정 금액은 ${formatKRW(billingCycle === 'annual' ? pendingPlan.price.annual * 12 : pendingPlan.price.monthly)}입니다.`
            : '선택한 플랜으로 변경합니다.'
        }
        confirmLabel="플랜 변경"
        onConfirm={confirmPlanChange}
        onCancel={() => {
          setIsPlanChangeDialogOpen(false);
          setPendingPlan(null);
        }}
      />
    </AppLayout>
  );
}
