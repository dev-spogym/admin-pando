import React, { useState } from 'react';
import {
  Bell,
  ChevronRight,
  Settings,
  Plus,
  MoreHorizontal,
  Smartphone,
  MessageSquare,
  Mail,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  PlusCircle,
  Calendar,
  Clock,
  User,
  Ticket
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import FormSection from '@/components/FormSection';
import ConfirmDialog from '@/components/ConfirmDialog';
import { moveToPage } from '@/internal';

/**
 * SCR-024: 자동 알림 설정 (13종)
 */

interface Trigger {
  id: string;
  name: string;
  description: string;
  type: 'customer' | 'product';
  status: 'ON' | 'OFF';
  hasNumberInput?: boolean;
  numberValue?: number;
  numberLabel?: string;
  template?: {
    channel: 'talk' | 'sms' | 'lms' | 'push';
    timing: string;
    target: string[];
    title?: string;
    content: string;
  };
}

export default function AutoAlarm() {
  // Mock Data
  const [triggers, setTriggers] = useState<Trigger[]>([
    { id: 'UI-010', name: '계약 완료 시', description: '이용권 계약 완료 시 발송', type: 'customer', status: 'OFF' },
    { id: 'UI-011', name: '대여권 구매 시', description: '락커 등 대여권 구매 시 발송', type: 'customer', status: 'OFF' },
    { id: 'UI-012', name: '생일자 고객', description: '생일 당일 축하 메시지 발송', type: 'customer', status: 'ON' },
    { id: 'UI-013', name: '이용권 신규 등록 시', description: '신규 회원 환영 메시지 발송', type: 'customer', status: 'ON' },
    { id: 'UI-014', name: '이용권 재등록 시', description: '재등록 감사 메시지 발송', type: 'customer', status: 'OFF' },
    { id: 'UI-015', name: '장기 미출석 시', description: 'N일 이상 미출석 시 발송', type: 'customer', status: 'OFF', hasNumberInput: true, numberValue: 30, numberLabel: '일 미출석' },
    { id: 'UI-016', name: '쿠폰 만료', description: '쿠폰 만료 N일 전 발송', type: 'customer', status: 'OFF', hasNumberInput: true, numberValue: 7, numberLabel: '일 전' },
    { id: 'UI-020', name: '상품 홀딩', description: '이용권 홀딩 처리 시 발송', type: 'product', status: 'OFF' },
    { id: 'UI-021', name: '수강권 만료 시', description: '수강권 만료 당일 발송', type: 'product', status: 'ON' },
    { id: 'UI-022', name: '수강권 만료 전', description: '수강권 만료 N일 전 발송', type: 'product', status: 'OFF', hasNumberInput: true, numberValue: 7, numberLabel: '일 전' },
    { id: 'UI-023', name: '홀딩 종료 임박', description: '홀딩 해제 N일 전 발송', type: 'product', status: 'OFF', hasNumberInput: true, numberValue: 3, numberLabel: '일 전' },
    { id: 'UI-024', name: '회원권 만료 시', description: '회원권 만료 당일 발송', type: 'product', status: 'ON' },
    { id: 'UI-025', name: '회원권 만료 전', description: '회원권 만료 N일 전 발송', type: 'product', status: 'OFF', hasNumberInput: true, numberValue: 14, numberLabel: '일 전' },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
  const [senderNumber, setSenderNumber] = useState('02-1234-5678');

  // Modal states
  const [modalData, setModalData] = useState({
    channel: 'talk',
    timing: '즉시',
    targets: ['전체 회원'],
    title: '',
    content: '안녕하세요 {이름}님! 이용권이 만료될 예정입니다. 만료일: {만료일}',
  });

  const handleToggle = (id: string) => {
    setTriggers(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'ON' ? 'OFF' : 'ON' } : t));
  };

  const handleEditClick = (trigger: Trigger) => {
    setEditingTrigger(trigger);
    setModalData({
      channel: 'talk',
      timing: '즉시',
      targets: ['전체 회원'],
      title: '',
      content: trigger.template?.content || `안녕하세요 {이름}님! ${trigger.name} 안내 드립니다.`,
    });
    setIsModalOpen(true);
  };

  const handleUseAll = () => {
    setTriggers(prev => prev.map(t => ({ ...t, status: 'ON' })));
  };

  const handleSaveModal = () => {
    if (editingTrigger) {
      setTriggers(prev => prev.map(t => t.id === editingTrigger.id ? {
        ...t,
        template: {
          channel: modalData.channel as any,
          timing: modalData.timing,
          target: modalData.targets,
          title: modalData.title,
          content: modalData.content
        }
      } : t));
    }
    setIsModalOpen(false);
    setEditingTrigger(null);
  };

  const insertVariable = (variable: string) => {
    setModalData(prev => ({ ...prev, content: prev.content + variable }));
  };

  return (
    <AppLayout >
      <PageHeader title="자동 알림 설정 (13종)" description="회원 이벤트 발생 시 자동으로 메시지를 발송하기 위한 트리거를 설정합니다." actions={
          <div className="flex gap-sm">
            <button
              onClick={() => moveToPage(980)}
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Body-2 font-medium text-content hover:bg-primary-light hover:text-primary transition-colors"
            >
              <MessageSquare size={16} />
              메시지 발송
            </button>
            <button
              onClick={handleUseAll}
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Body-2 font-medium text-content hover:bg-primary-light hover:text-primary transition-colors"
            >
              <CheckCircle2 size={16} />
              모두 사용
            </button>
            <button
              className="flex items-center gap-xs rounded-button bg-primary px-md py-sm text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              설정 추가
            </button>
          </div>
        }/>

      {/* Global Settings & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl" >
        <div className="bg-surface p-lg rounded-xl border border-line shadow-card" >
          <label className="block text-Label text-content-secondary mb-sm" >발신 번호</label>
          <div className="relative" >
            <select
              className="w-full appearance-none rounded-input bg-surface-secondary border-none px-md py-[10px] text-Body-1 text-content focus:ring-2 focus:ring-accent outline-none" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)}>
              <option value="02-1234-5678">02-1234-5678 (대표번호)</option>
              <option value="010-9876-5432">010-9876-5432 (김매니저)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-md text-content-secondary" >
              <ChevronRight className="rotate-90" size={16}/>
            </div>
          </div>
        </div>

        <StatCard label="보유 포인트" value="125,400 P" icon={<MessageSquare className="text-primary" size={20} />} description="약 8,360건 발송 가능 (단문 기준)" variant="peach"/>

        <div className="bg-accent-light p-lg rounded-xl border border-accent/20 flex flex-col justify-between" >
          <div className="flex items-center justify-between" >
            <span className="text-Label text-content-secondary" >현재 활성화된 트리거</span>
            <StatusBadge label="정상 작동 중" variant="success" dot={true}/>
          </div>
          <div className="mt-sm" >
            <span className="text-Heading-1 text-accent font-bold" >
              {triggers.filter(t => t.status === 'ON').length}
            </span>
            <span className="text-Body-1 text-content ml-xs" >/ {triggers.length}종</span>
          </div>
        </div>
      </div>

      {/* Trigger Lists */}
      <div className="space-y-xl" >
        <FormSection title="고객 관련 자동 알림 (7종)" description="회원 계약, 생일, 출석 등 고객 이벤트 기반 알림" columns={1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md" >
            {triggers.filter(t => t.type === 'customer').map(trigger => (
              <TriggerItem key={trigger.id} trigger={trigger} onToggle={() => handleToggle(trigger.id)} onEdit={() => handleEditClick(trigger)}/>
            ))}
          </div>
        </FormSection>

        <FormSection title="상품 관련 자동 알림 (6종)" description="이용권 만료, 홀딩 해제 등 상품 상태 기반 알림" columns={1}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md" >
            {triggers.filter(t => t.type === 'product').map(trigger => (
              <TriggerItem key={trigger.id} trigger={trigger} onToggle={() => handleToggle(trigger.id)} onEdit={() => handleEditClick(trigger)}/>
            ))}
          </div>
        </FormSection>
      </div>

      {/* Template Edit Modal */}
      {isModalOpen && editingTrigger && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-lg" >
          <div className="w-full max-w-[800px] bg-surface rounded-modal shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200" >
            <div className="flex items-center justify-between border-b border-line px-xl py-lg" >
              <div className="flex items-center gap-sm" >
                <div className="rounded-full bg-primary-light p-sm" >
                  <Bell className="text-primary" size={20}/>
                </div>
                <div >
                  <h2 className="text-Heading-2 text-content" >{editingTrigger.name}</h2>
                  <p className="text-Body-2 text-content-secondary" >자동 알림 템플릿 편집</p>
                </div>
              </div>
              <button className="text-content-secondary hover:text-content" onClick={() => setIsModalOpen(false)}>
                <X size={24}/>
              </button>
            </div>

            <div className="p-xl grid grid-cols-1 md:grid-cols-2 gap-xl" >
              {/* Form Side */}
              <div className="space-y-lg" >
                <div >
                  <label className="block text-Label text-content-secondary mb-sm" >발송 채널</label>
                  <div className="grid grid-cols-2 gap-sm" >
                    {['talk', 'sms', 'lms', 'push'].map((ch) => (
                      <button
                        className={cn(
                          "flex items-center justify-center gap-xs rounded-button border py-sm text-Body-2 transition-all",
                          modalData.channel === ch
                            ? "border-accent bg-accent-light text-accent font-bold"
                            : "border-line bg-surface text-content-secondary hover:bg-surface-secondary"
                        )} key={ch} onClick={() => setModalData(prev => ({ ...prev, channel: ch as any }))}>
                        {ch === 'talk' && '알림톡'}
                        {ch === 'sms' && 'SMS'}
                        {ch === 'lms' && 'LMS'}
                        {ch === 'push' && '앱 푸시'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-lg" >
                  <div >
                    <label className="block text-Label text-content-secondary mb-sm" >발송 시점</label>
                    <select
                      className="w-full rounded-input bg-surface-secondary border-none px-md py-[10px] text-Body-2 text-content outline-none" value={modalData.timing} onChange={(e) => setModalData(prev => ({ ...prev, timing: e.target.value }))}>
                      <option >즉시</option>
                      <option >1일 전</option>
                      <option >3일 전</option>
                      <option >7일 전</option>
                    </select>
                  </div>
                  <div >
                    <label className="block text-Label text-content-secondary mb-sm" >발송 대상</label>
                    <select className="w-full rounded-input bg-surface-secondary border-none px-md py-[10px] text-Body-2 text-content outline-none" >
                      <option >전체 회원</option>
                      <option >신규 회원</option>
                      <option >장기 회원</option>
                    </select>
                  </div>
                </div>

                {modalData.channel === 'lms' && (
                  <div >
                    <label className="block text-Label text-content-secondary mb-sm" >메시지 제목</label>
                    <input
                      className="w-full rounded-input bg-surface-secondary border-none px-md py-[10px] text-Body-2 text-content outline-none" type="text" value={modalData.title} onChange={(e) => setModalData(prev => ({ ...prev, title: e.target.value }))} placeholder="제목을 입력하세요"/>
                  </div>
                )}

                <div >
                  <div className="flex items-center justify-between mb-sm" >
                    <label className="block text-Label text-content-secondary" >메시지 내용</label>
                    <div className="flex gap-xs" >
                      {['{이름}', '{만료일}', '{상품명}'].map(v => (
                        <button
                          className="rounded-full bg-surface-secondary px-xs py-[2px] text-[10px] font-medium text-content-secondary hover:bg-primary-light hover:text-primary transition-colors" key={v} onClick={() => insertVariable(v)}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className="w-full h-[150px] rounded-input bg-surface-secondary border-none p-md text-Body-2 text-content outline-none resize-none" value={modalData.content} onChange={(e) => setModalData(prev => ({ ...prev, content: e.target.value }))} placeholder="내용을 입력하세요"/>
                  <p className="mt-xs text-right text-[12px] text-content-secondary" >
                    {modalData.content.length} / 1000 자
                  </p>
                </div>
              </div>

              {/* Preview Side */}
              <div className="bg-surface-secondary rounded-xl p-lg flex flex-col items-center justify-center space-y-md border border-line" >
                <div className="text-Label text-content-secondary mb-sm" >발송 미리보기</div>
                <div className="relative w-[240px] h-[480px] bg-content rounded-[36px] border-[8px] border-content shadow-xl overflow-hidden" >
                  <div className="absolute top-0 w-full h-8 bg-content flex items-center justify-center" >
                    <div className="w-16 h-4 rounded-full bg-black/30" ></div>
                  </div>
                  <div className="mt-8 p-md space-y-md" >
                    <div className="bg-surface rounded-[16px] p-md shadow-sm" >
                      <div className="flex items-center gap-xs mb-sm" >
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center" >
                          <Smartphone className="text-white" size={12}/>
                        </div>
                        <span className="text-[10px] font-bold text-content" >FitGenie CRM</span>
                        <span className="text-[10px] text-content-secondary ml-auto" >방금 전</span>
                      </div>
                      <div className="text-[12px] text-content whitespace-pre-wrap leading-tight" >
                        {modalData.content}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-sm mt-md" >
                  <button className="flex items-center gap-xs rounded-full bg-surface px-md py-sm border border-line text-[12px] text-content-secondary hover:text-primary transition-colors" >
                    <Smartphone size={14}/>
                    테스트 발송
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-sm border-t border-line bg-surface-secondary px-xl py-lg" >
              <button
                className="rounded-button border border-line bg-surface px-xl py-md text-Body-2 font-medium text-content-secondary hover:bg-surface-secondary transition-colors" onClick={() => setIsModalOpen(false)}>
                취소
              </button>
              <button
                className="rounded-button bg-accent px-xl py-md text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-opacity" onClick={handleSaveModal}>
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function TriggerItem({ trigger, onToggle, onEdit }: { trigger: Trigger; onToggle: () => void; onEdit: () => void }) {
  const [val, setVal] = useState(trigger.numberValue || 0);

  return (
    <div className={cn(
      "relative group flex items-start gap-md p-lg rounded-xl border transition-all",
      trigger.status === 'ON'
        ? "bg-surface border-accent shadow-sm"
        : "bg-surface-secondary border-line grayscale opacity-70"
    )} >
      <div className={cn(
        "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors",
        trigger.status === 'ON' ? "bg-accent-light text-accent" : "bg-surface text-content-secondary"
      )} >
        {trigger.id.includes('01') ? <User size={22}/> : <Ticket size={22}/>}
      </div>

      <div className="flex-1 min-w-0" >
        <div className="flex items-center justify-between mb-xs" >
          <h3 className="text-Body-1 font-bold text-content truncate" >{trigger.name}</h3>
          <div className="flex items-center gap-sm" >
            <button
              className="p-xs text-content-secondary hover:text-primary transition-colors" onClick={onEdit} title="편집">
              <MoreHorizontal size={18}/>
            </button>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors outline-none",
                trigger.status === 'ON' ? "bg-accent" : "bg-content-secondary/30"
              )} onClick={onToggle}>
              <span className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-surface transition-transform",
                trigger.status === 'ON' ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
        </div>
        <p className="text-Body-2 text-content-secondary mb-md line-clamp-1" >{trigger.description}</p>

        {trigger.hasNumberInput && (
          <div className="flex items-center gap-sm" >
            <div className="flex items-center bg-surface-secondary rounded-button border border-line px-sm" >
              <input
                className="w-12 bg-transparent border-none py-xs text-center text-Body-2 font-bold text-content focus:ring-0 outline-none" type="number" value={val} onChange={(e) => setVal(Number(e.target.value))}/>
              <span className="text-[12px] text-content-secondary" >{trigger.numberLabel}</span>
            </div>
            <span className="text-[12px] text-content-secondary" >기준 발송</span>
          </div>
        )}
      </div>

      {trigger.status === 'ON' && (
        <div className="absolute -top-1 -right-1" >
          <div className="flex h-3 w-3" >
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" ></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" ></span>
          </div>
        </div>
      )}
    </div>
  );
}
