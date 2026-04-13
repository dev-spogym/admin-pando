'use client';
export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
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
import { exportToExcel } from '@/lib/exportExcel';
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import DataTable from "@/components/common/DataTable";
import TabNav from "@/components/common/TabNav";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from 'sonner';

const currentPlan = {
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

const paymentMethods = [
  { id: 1, type: 'visa', last4: '4242', isDefault: true, expiry: '12/28', bank: '신한카드' },
  { id: 2, type: 'master', last4: '8888', isDefault: false, expiry: '05/27', bank: '국민카드' },
];

const billingHistory = [
  { id: 1, date: '2025-05-15', plan: 'Pro (Annual)', amount: 1200000, method: 'Visa **** 4242', status: 'success' },
  { id: 2, date: '2024-05-15', plan: 'Pro (Annual)', amount: 1200000, method: 'Visa **** 4242', status: 'success' },
  { id: 3, date: '2024-04-15', plan: 'Starter (Monthly)', amount: 55000, method: 'Visa **** 4242', status: 'success' },
];

const plans = [
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
    isCurrent: true,
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
          <span className="font-bold text-content">{current.toLocaleString()}</span> / {limit.toLocaleString()}{unit}
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const handleCancelSubscription = () => {
    setIsCancelDialogOpen(false);
    toast.success('구독 취소 신청이 완료되었습니다. 현재 구독 기간 종료 시까지 서비스를 이용하실 수 있습니다.');
  };

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
              variant={currentPlan.status === 'active' ? 'success' : 'error'}
              label={currentPlan.status === 'active' ? '구독 중' : '만료'}
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
                <span className="text-Heading-1 text-primary font-bold">₩{currentPlan.amount.toLocaleString()}</span>
                <span className="text-Body-1 text-content-secondary mb-1">/ {currentPlan.billingCycle === 'annual' ? '년' : '월'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-sm min-w-[200px]">
              <button
                className="w-full py-md bg-primary text-white rounded-button font-bold flex items-center justify-center gap-sm hover:opacity-90 transition-opacity shadow-sm"
                onClick={() => setActiveTab('plans')}
              >
                플랜 변경하기 <ChevronRight size={18} />
              </button>
              <button
                className="w-full py-md text-content-secondary hover:text-state-error transition-colors text-Body-2 font-medium"
                onClick={() => setIsCancelDialogOpen(true)}
              >
                구독 취소 신청
              </button>
            </div>
          </div>
        </div>

        {/* 결제 수단 */}
        <div className="bg-primary-light rounded-xl border border-primary/10 p-xl flex flex-col">
          <div className="flex justify-between items-center mb-lg">
            <h4 className="text-Body-1 font-bold text-content flex items-center gap-sm">
              <CreditCard className="text-primary" size={18} /> 결제 수단
            </h4>
            <button className="text-Label text-primary hover:underline font-bold">관리</button>
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
          </div>
          <button className="mt-lg w-full py-sm border border-dashed border-primary text-primary rounded-button text-Label font-bold flex items-center justify-center gap-sm hover:bg-surface/50 transition-colors">
            <Plus size={14} /> 새 카드 추가
          </button>
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
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn("px-lg py-sm rounded-button text-Body-2 font-medium transition-all", billingCycle === 'monthly' ? "text-primary font-bold" : "text-content-secondary")}
          >
            월간 결제
          </button>
          <button
            onClick={() => setBillingCycle(prev => prev === 'annual' ? 'monthly' : 'annual')}
            className={cn("relative w-12 h-6 rounded-full transition-colors duration-200", billingCycle === 'annual' ? "bg-primary" : "bg-line")}
          >
            <div className={cn("absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200", billingCycle === 'annual' ? "translate-x-6" : "translate-x-0")} />
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn("px-lg py-sm rounded-button text-Body-2 font-medium transition-all flex items-center gap-xs", billingCycle === 'annual' ? "text-primary font-bold" : "text-content-secondary")}
          >
            연간 결제
            <span className="text-[11px] bg-accent-light text-accent px-xs py-[1px] rounded-full border border-accent/20">20% 할인</span>
          </button>
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
                  ₩{(billingCycle === 'annual' ? plan.price.annual : plan.price.monthly).toLocaleString()}
                </span>
                <span className="text-Body-2 text-content-secondary mb-1">/ 월</span>
              </div>
              {billingCycle === 'annual' && (
                <p className="text-Label text-content-secondary">연간 ₩{(plan.price.annual * 12).toLocaleString()} 결제</p>
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
              <button
                disabled={plan.isCurrent}
                className={cn(
                  "w-full py-md rounded-button font-bold transition-all",
                  plan.isCurrent
                    ? "bg-accent-light text-accent cursor-default"
                    : "bg-primary text-white hover:shadow-lg hover:translate-y-[-2px]"
                )}
              >
                {plan.isCurrent ? '현재 플랜' : '선택하기'}
              </button>
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
          value={`₩${currentPlan.amount.toLocaleString()}`}
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
              render: val => <span className="font-bold text-content">₩{val.toLocaleString()}</span>
            },
            { key: 'method', header: '결제수단', width: 180 },
            {
              key: 'status', header: '상태', width: 120,
              render: () => <StatusBadge variant="success" label="결제 완료" dot />
            },
            {
              key: 'invoice', header: '증빙서류',
              render: () => (
                <button className="flex items-center gap-xs text-primary hover:underline text-Label font-bold">
                  <Download size={14} /> 세금계산서
                </button>
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
            exportToExcel(billingHistory as Record<string, unknown>[], exportColumns, { filename: '구독결제내역' });
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
            <button
              onClick={() => setActiveTab('plans')}
              className="flex items-center gap-sm px-lg py-md bg-primary text-white rounded-button text-Body-2 font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Zap size={18} /> 플랜 업그레이드
            </button>
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
    </AppLayout>
  );
}
