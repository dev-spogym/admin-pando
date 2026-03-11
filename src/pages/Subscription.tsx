import React, { useState, useMemo } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpCircle, 
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
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import SearchFilter from '@/components/SearchFilter';
import TabNav from '@/components/TabNav';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';

/**
 * SCR-030: 구독 플랜 관리
 */
export default function Subscription() {
  // --- States ---
  const [activeTab, setActiveTab] = useState('current'); // current, plans, history
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false); // 실제 모달은 구현하지 않고 상태만 정의

  // --- Mock Data ---
  const currentPlan = {
    name: 'Pro',
    status: 'active', // active, expired, canceled
    billingCycle: 'annual', // monthly, annual
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
        members: '최대 300명',
        branches: '1개',
        staff: '5개',
        points: '월 1,000건',
        alarms: '기본 5종',
        kiosk: '미지원',
        iot: '미지원',
        contract: '미지원',
        mileage: '미지원',
        api: '미지원',
        support: '이메일'
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      isCurrent: true,
      price: { monthly: 110000, annual: 88000 },
      features: {
        members: '최대 1,000명',
        branches: '최대 3개',
        staff: '20개',
        points: '월 5,000건',
        alarms: '전체 13종',
        kiosk: '1대',
        iot: '지원',
        contract: '지원',
        mileage: '지원',
        api: '미지원',
        support: '이메일 + 채팅'
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: { monthly: 250000, annual: 200000 },
      features: {
        members: '무제한',
        branches: '무제한',
        staff: '무제한',
        points: '무제한',
        alarms: '전체 13종 + 커스텀',
        kiosk: '무제한',
        iot: '지원',
        contract: '지원',
        mileage: '지원',
        api: '지원',
        support: '전담 매니저'
      }
    }
  ];

  // --- Handlers ---
  const handleTabChange = (key: string) => setActiveTab(key);
  const handleCancelSubscription = () => {
    setIsCancelDialogOpen(false);
    alert('구독 취소 신청이 완료되었습니다.');
  };

  // --- Progress Bar Component ---
  const UsageProgress = ({ label, current, limit, icon: Icon, unit = '' }: { label: string; current: number; limit: number; icon: React.ElementType; unit?: string }) => {
    const percent = Math.min((current / limit) * 100, 100);
    const isWarning = percent >= 90;
    
    return (
      <div className="bg-3 p-lg rounded-card-normal border border-border-light shadow-card-soft" >
        <div className="flex justify-between items-center mb-sm" >
          <div className="flex items-center gap-sm" >
            <div className={cn("p-xs rounded-button", isWarning ? "bg-bg-soft-peach" : "bg-bg-soft-mint")} >
              <Icon className={isWarning ? "text-primary-coral" : "text-secondary-mint"} size={18}/>
            </div>
            <span className="text-Body 1 font-semibold text-text-dark-grey" >{label}</span>
          </div>
          <span className="text-Body 2 text-text-grey-blue" >
            <span className="font-bold text-text-dark-grey" >{current.toLocaleString()}</span> / {limit.toLocaleString()}{unit}
          </span>
        </div>
        <div className="h-2 w-full bg-input-bg-light rounded-full overflow-hidden" >
          <div 
            className={cn("h-full transition-all duration-500", isWarning ? "bg-primary-coral" : "bg-secondary-mint")} style={{ width: `${percent}%` }}/>
        </div>
        {isWarning && (
          <p className="mt-xs text-Label text-error flex items-center gap-1" >
            <AlertCircle size={12}/> 한도에 도달하고 있습니다. 플랜을 업그레이드하세요.
          </p>
        )}
      </div>
    );
  };

  return (
    <AppLayout >
      <div className="space-y-lg" >
        <PageHeader title="구독 플랜 관리" description="Fit SaaS 서비스 구독 현황을 관리하고 결제 내역을 확인합니다." actions={
            <div className="flex gap-sm">
              <button 
                onClick={() => setActiveTab('plans')}
                className="px-lg py-sm bg-primary-coral text-white rounded-button text-Body 2 font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Zap size={18} /> 플랜 업그레이드
              </button>
            </div>
          }/>

        <TabNav tabs={[
            { key: 'current', label: '구독 현황' },
            { key: 'plans', label: '요금제 비교' },
            { key: 'history', label: '결제 이력' },
          ]} activeTab={activeTab} onTabChange={handleTabChange}/>

        {/* --- 구독 현황 탭 --- */}
        {activeTab === 'current' && (
          <div className="space-y-lg" >
            {/* 현재 플랜 요약 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg" >
              <div className="lg:col-span-2 bg-3 rounded-card-strong border border-border-light shadow-card-soft p-xxl relative overflow-hidden" >
                <div className="absolute top-0 right-0 p-lg" >
                  <StatusBadge variant={currentPlan.status === 'active' ? 'success' : 'error'} label={currentPlan.status === 'active' ? '구독 중' : '만료'} dot={true}/>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-xl" >
                  <div >
                    <h3 className="text-Heading 2 text-text-dark-grey mb-xs" >Fit {currentPlan.name} Plan</h3>
                    <p className="text-Body 2 text-text-grey-blue mb-xl" >
                      {currentPlan.billingCycle === 'annual' ? '연간 결제' : '월간 결제'} • 다음 결제일: {currentPlan.nextBillingDate}
                    </p>
                    <div className="flex items-end gap-1" >
                      <span className="text-Heading 1 text-primary-coral font-bold" >₩{currentPlan.amount.toLocaleString()}</span>
                      <span className="text-Body 1 text-text-grey-blue mb-2" >/ {currentPlan.billingCycle === 'annual' ? '년' : '월'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-sm min-w-[200px]" >
                    <button className="w-full py-md bg-bg-soft-mint text-secondary-mint rounded-button font-bold flex items-center justify-center gap-2 hover:bg-[#E2F5F4] transition-colors" >
                      플랜 변경하기 <ChevronRight size={18}/>
                    </button>
                    <button
                      className="w-full py-md text-text-grey-blue hover:text-error transition-colors text-Body 2 font-medium" onClick={() => setIsCancelDialogOpen(true)}>
                      구독 취소 신청
                    </button>
                  </div>
                </div>
              </div>

              {/* 결제 수단 요약 */}
              <div className="bg-bg-soft-peach rounded-card-strong border border-primary-coral/10 p-xl flex flex-col" >
                <div className="flex justify-between items-center mb-lg" >
                  <h4 className="text-Body 1 font-bold text-text-dark-grey flex items-center gap-2" >
                    <CreditCard className="text-primary-coral" size={20}/> 결제 수단
                  </h4>
                  <button className="text-Label text-primary-coral hover:underline font-bold" >관리</button>
                </div>
                <div className="flex-1 flex flex-col justify-center" >
                  {paymentMethods.filter(m => m.isDefault).map(card => (
                    <div className="bg-3/80 backdrop-blur-sm p-lg rounded-card-normal border border-white shadow-sm" key={card.id}>
                      <div className="flex justify-between items-start mb-md" >
                        <span className="px-xs py-[2px] bg-primary-coral text-white text-[10px] rounded-sm font-bold uppercase" >{card.type}</span>
                        <span className="text-Label text-text-grey-blue" >기본 결제 수단</span>
                      </div>
                      <p className="text-Body 1 font-bold text-text-dark-grey tracking-widest mb-xs" >**** **** **** {card.last4}</p>
                      <div className="flex justify-between items-end" >
                        <p className="text-Body 2 text-text-grey-blue" >{card.bank}</p>
                        <p className="text-Label text-text-grey-blue" >{card.expiry}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-lg w-full py-sm border border-dashed border-primary-coral text-primary-coral rounded-button text-Label font-bold flex items-center justify-center gap-2 hover:bg-3/50 transition-colors" >
                  <Plus size={16}/> 새 카드 추가
                </button>
              </div>
            </div>

            {/* 사용량 현황 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg" >
              <UsageProgress label="회원 수" current={currentPlan.usage.members.current} limit={currentPlan.usage.members.limit} icon={Users} unit="명"/>
              <div className="cursor-pointer hover:opacity-80 transition-opacity" onClick={() => moveToPage(984)}>
                <UsageProgress label="지점 수" current={currentPlan.usage.branches.current} limit={currentPlan.usage.branches.limit} icon={Building2} unit="개"/>
              </div>
              <UsageProgress label="직원 계정" current={currentPlan.usage.staff.current} limit={currentPlan.usage.staff.limit} icon={ShieldCheck} unit="개"/>
              <UsageProgress label="메시지 포인트" current={currentPlan.usage.points.current} limit={currentPlan.usage.points.limit} icon={MessageSquare} unit="건"/>
            </div>
          </div>
        )}

        {/* --- 요금제 비교 탭 --- */}
        {activeTab === 'plans' && (
          <div className="space-y-xl" >
            <div className="text-center py-xl" >
              <h2 className="text-Heading 1 text-text-dark-grey mb-sm" >비즈니스 성장에 맞는 플랜을 선택하세요</h2>
              <p className="text-Body 1 text-text-grey-blue max-w-2xl mx-auto" >연간 결제 시 월 요금의 20%를 할인해 드립니다.</p>
              
              <div className="flex items-center justify-center mt-xl gap-lg" >
                <span className="text-Body 2 font-medium text-text-grey-blue" >월간 결제</span>
                <div className="w-12 h-6 bg-input-bg-light rounded-full p-1 cursor-pointer relative shadow-inner border border-border-light" >
                  <div className="w-4 h-4 bg-primary-coral rounded-full absolute right-1" />
                </div>
                <span className="text-Body 2 font-bold text-primary-coral flex items-center gap-2" >
                  연간 결제 <span className="text-[11px] bg-bg-soft-peach px-2 py-0.5 rounded-full border border-primary-coral/20" >20% 할인</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl" >
              {plans.map((plan) => (
                <div
                  className={cn(
                    "flex flex-col bg-3 rounded-card-strong border shadow-card-soft overflow-hidden transition-all duration-300 hover:shadow-xl",
                    plan.isCurrent ? "border-primary-coral ring-4 ring-primary-coral/5 scale-[1.02]" : "border-border-light"
                  )} key={plan.id}>
                  {plan.isCurrent && (
                    <div className="bg-primary-coral text-white py-2 text-center text-Label font-bold tracking-wider" >
                      현재 이용 중인 플랜
                    </div>
                  )}
                  <div className="p-xl border-b border-border-light" >
                    <h3 className="text-Heading 2 text-text-dark-grey mb-xl font-bold" >{plan.name}</h3>
                    <div className="flex items-end gap-1 mb-md" >
                      <span className="text-Heading 1 font-bold text-text-dark-grey" >₩{plan.price.annual.toLocaleString()}</span>
                      <span className="text-Body 2 text-text-grey-blue mb-2" >/ 월</span>
                    </div>
                    <p className="text-Label text-text-grey-blue" >연간 ₩{(plan.price.annual * 12).toLocaleString()} 결제</p>
                  </div>
                  
                  <div className="p-xl flex-1 space-y-md bg-bg-main-light-blue/30" >
                    <div className="flex items-center gap-sm text-Body 2" >
                      <CheckCircle2 className="text-secondary-mint" size={16}/>
                      <span className="font-semibold text-text-dark-grey" >회원 수:</span>
                      <span className="text-text-grey-blue" >{plan.features.members}</span>
                    </div>
                    <div className="flex items-center gap-sm text-Body 2" >
                      <CheckCircle2 className="text-secondary-mint" size={16}/>
                      <span className="font-semibold text-text-dark-grey" >지점 수:</span>
                      <span className="text-text-grey-blue" >{plan.features.branches}</span>
                    </div>
                    <div className="flex items-center gap-sm text-Body 2" >
                      <CheckCircle2 className="text-secondary-mint" size={16}/>
                      <span className="font-semibold text-text-dark-grey" >메시지:</span>
                      <span className="text-text-grey-blue" >{plan.features.points}</span>
                    </div>
                    <div className="flex items-center gap-sm text-Body 2" >
                      <CheckCircle2 className="text-secondary-mint" size={16}/>
                      <span className="font-semibold text-text-dark-grey" >자동 알림:</span>
                      <span className="text-text-grey-blue" >{plan.features.alarms}</span>
                    </div>
                    <div className="pt-sm space-y-md border-t border-border-light/50" >
                      {[
                        { label: '키오스크', value: plan.features.kiosk, icon: Smartphone },
                        { label: 'IoT 연동', value: plan.features.iot, icon: Wifi },
                        { label: '전자계약', value: plan.features.contract, icon: FileText },
                        { label: '마일리지', value: plan.features.mileage, icon: BadgeCent },
                        { label: 'API 연동', value: plan.features.api, icon: Zap },
                      ].map((item, idx) => (
                        <div className="flex items-center justify-between text-Body 2" key={idx}>
                          <div className="flex items-center gap-sm text-text-grey-blue" >
                            <item.icon size={16}/>
                            <span >{item.label}</span>
                          </div>
                          <span className={cn(
                            "font-medium",
                            item.value === '미지원' ? "text-text-grey-blue/50" : "text-text-dark-grey"
                          )} >{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-xl mt-auto" >
                    <button
                      className={cn(
                        "w-full py-md rounded-button font-bold transition-all",
                        plan.isCurrent 
                          ? "bg-bg-soft-mint text-secondary-mint cursor-default"
                          : "bg-primary-coral text-white hover:shadow-lg hover:translate-y-[-2px]"
                      )} disabled={plan.isCurrent}>
                      {plan.isCurrent ? '현재 플랜' : '선택하기'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- 결제 이력 탭 --- */}
        {activeTab === 'history' && (
          <div className="bg-3 rounded-card-strong border border-border-light shadow-card-soft overflow-hidden" >
            <DataTable title="최근 결제 내역" data={billingHistory} columns={[
                { key: 'date', header: '결제일', width: 150 },
                { key: 'plan', header: '플랜명', width: 200 },
                { 
                  key: 'amount', 
                  header: '결제금액', 
                  render: (val) => <span className="font-bold text-text-dark-grey">₩{val.toLocaleString()}</span>,
                  width: 150 
                },
                { key: 'method', header: '결제수단', width: 180 },
                { 
                  key: 'status', 
                  header: '상태', 
                  render: (val) => <StatusBadge variant="success" label="결제 완료" dot />,
                  width: 120 
                },
                { 
                  key: 'invoice', 
                  header: '증빙서류', 
                  render: () => (
                    <button className="flex items-center gap-1 text-primary-coral hover:underline text-Label font-bold">
                      <Download size={14} /> 세금계산서
                    </button>
                  ),
                  align: 'right'
                }
              ]} onDownloadExcel={() => alert('엑셀 다운로드를 시작합니다.')}/>
          </div>
        )}
      </div>

      <ConfirmDialog open={isCancelDialogOpen} title="구독 취소 신청" description="정말로 구독을 취소하시겠습니까? 취소 후에도 현재 구독 기간인 2026-05-15일까지는 서비스를 정상적으로 이용하실 수 있습니다." confirmLabel="구독 취소" variant="danger" confirmationText="구독취소" onConfirm={handleCancelSubscription} onCancel={() => setIsCancelDialogOpen(false)}/>
    </AppLayout>
  );
}
