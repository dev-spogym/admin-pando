'use client';
export const dynamic = 'force-dynamic';

﻿import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Plus,
  X,
  CheckCircle2,
  Smartphone,
  MessageSquare,
  ChevronRight,
  MoreHorizontal,
  User,
  Gift,
  UserPlus,
  RefreshCw,
  PauseCircle,
  Timer,
  Clock,
  ShieldCheck,
  Ticket
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import FormSection from "@/components/common/FormSection";
import { moveToPage } from "@/internal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

/**
 * SCR-071: 자동 알림 설정 (UI-101 ~ UI-102)
 * 13종 알림 규칙 카드 + 규칙 설정 모달
 */

interface AlarmRule {
  id: string;
  name: string;
  description: string;
  channel: "talk" | "sms" | "push";
  type: "customer" | "product";
  enabled: boolean;
  hasNumberInput?: boolean;
  numberValue?: number;
  numberLabel?: string;
  template?: {
    timing: string;
    target: string;
    content: string;
  };
}

const INITIAL_RULES: AlarmRule[] = [
  // 고객 관련 7종
  {
    id: "expire-d7",    name: "만료 D-7 알림",      description: "회원권 만료 7일 전 안내 발송",
    channel: "talk", type: "customer", enabled: true,
    hasNumberInput: true, numberValue: 7, numberLabel: "일 전",
    template: { timing: "만료 7일 전", target: "전체 회원", content: "안녕하세요 {이름}님! 회원권이 7일 후 만료됩니다. 재등록 시 특별 혜택을 드립니다." }
  },
  {
    id: "expire-d3",    name: "만료 D-3 알림",      description: "회원권 만료 3일 전 안내 발송",
    channel: "talk", type: "customer", enabled: true,
    hasNumberInput: true, numberValue: 3, numberLabel: "일 전",
    template: { timing: "만료 3일 전", target: "전체 회원", content: "안녕하세요 {이름}님! 회원권이 3일 후 만료됩니다." }
  },
  {
    id: "expire-d1",    name: "만료 D-1 알림",      description: "회원권 만료 1일 전 최종 안내",
    channel: "sms", type: "customer", enabled: false,
    hasNumberInput: true, numberValue: 1, numberLabel: "일 전",
    template: { timing: "만료 1일 전", target: "전체 회원", content: "내일 {이름}님의 회원권이 만료됩니다." }
  },
  {
    id: "birthday",     name: "생일 축하 알림",      description: "생일 당일 축하 메시지 발송",
    channel: "talk", type: "customer", enabled: true,
    template: { timing: "생일 당일 오전 9시", target: "전체 회원", content: "🎉 {이름}님, 생일을 축하합니다! 특별 혜택을 확인해보세요." }
  },
  {
    id: "absence",      name: "장기 미출석 알림",    description: "N일 이상 미출석 회원 안내",
    channel: "sms", type: "customer", enabled: false,
    hasNumberInput: true, numberValue: 30, numberLabel: "일 미출석",
    template: { timing: "미출석 30일 경과", target: "전체 회원", content: "{이름}님, 오랫동안 뵙지 못했어요. 센터에서 기다리고 있습니다." }
  },
  {
    id: "new-member",   name: "신규 회원 환영 알림", description: "첫 등록 시 환영 메시지 발송",
    channel: "talk", type: "customer", enabled: true,
    template: { timing: "등록 즉시", target: "신규 등록 회원", content: "환영합니다 {이름}님! {센터명}에 오신 것을 환영합니다." }
  },
  {
    id: "payment",      name: "결제 완료 알림",      description: "결제 완료 시 영수증 발송",
    channel: "talk", type: "customer", enabled: true,
    template: { timing: "결제 즉시", target: "결제 완료 회원", content: "{이름}님의 결제가 완료되었습니다. 금액: {금액}원" }
  },

  // 상품 관련 6종
  {
    id: "holding",      name: "상품 홀딩 알림",      description: "이용권 홀딩 처리 시 발송",
    channel: "talk", type: "product", enabled: false,
    template: { timing: "홀딩 처리 즉시", target: "홀딩 회원", content: "{이름}님의 이용권이 홀딩 처리되었습니다. 홀딩 기간: {기간}" }
  },
  {
    id: "course-expire", name: "수강권 만료 알림",   description: "수강권 만료 당일 발송",
    channel: "sms", type: "product", enabled: true,
    template: { timing: "만료 당일", target: "수강권 보유 회원", content: "{이름}님의 수강권이 오늘 만료됩니다." }
  },
  {
    id: "course-soon",  name: "수강권 만료 임박",    description: "수강권 만료 N일 전 발송",
    channel: "talk", type: "product", enabled: true,
    hasNumberInput: true, numberValue: 7, numberLabel: "일 전",
    template: { timing: "만료 7일 전", target: "수강권 보유 회원", content: "{이름}님의 수강권이 {만료일}에 만료됩니다." }
  },
  {
    id: "holding-soon", name: "홀딩 종료 임박 알림", description: "홀딩 해제 N일 전 발송",
    channel: "sms", type: "product", enabled: false,
    hasNumberInput: true, numberValue: 3, numberLabel: "일 전",
    template: { timing: "홀딩 종료 3일 전", target: "홀딩 회원", content: "{이름}님의 홀딩이 {만료일}에 종료됩니다." }
  },
  {
    id: "member-expire", name: "회원권 만료 알림",   description: "회원권 만료 당일 발송",
    channel: "talk", type: "product", enabled: true,
    template: { timing: "만료 당일", target: "전체 회원", content: "{이름}님의 회원권이 오늘 만료됩니다. 재등록을 통해 계속 이용하세요." }
  },
  {
    id: "member-soon",  name: "회원권 만료 임박",    description: "회원권 만료 N일 전 발송",
    channel: "talk", type: "product", enabled: true,
    hasNumberInput: true, numberValue: 14, numberLabel: "일 전",
    template: { timing: "만료 14일 전", target: "전체 회원", content: "{이름}님의 회원권이 {만료일}에 만료됩니다. 지금 재등록하세요!" }
  },
];

const CHANNEL_ICON: Record<string, React.ReactNode> = {
  talk: <MessageSquare size={12} />,
  sms:  <Smartphone    size={12} />,
  push: <Bell          size={12} />,
};

const CHANNEL_LABEL: Record<string, string> = {
  talk: "알림톡",
  sms:  "SMS",
  push: "앱 푸시",
};

// --- 토글 컴포넌트 ---
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    className={cn(
      "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none",
      checked ? "bg-accent" : "bg-content-secondary/30"
    )}
    onClick={onChange}
  >
    <span className={cn(
      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
      checked ? "translate-x-6" : "translate-x-1"
    )} />
  </button>
);

// --- 알림 규칙 카드 (UI-101) ---
function RuleCard({
  rule,
  onToggle,
  onEdit,
  onNumberChange,
}: {
  rule: AlarmRule;
  onToggle: () => void;
  onEdit: () => void;
  onNumberChange?: (val: number) => void;
}) {
  const [numVal, setNumVal] = useState(rule.numberValue ?? 0);

  return (
    <div className={cn(
      "relative group flex items-start gap-md p-lg rounded-xl border transition-all",
      rule.enabled
        ? "bg-surface border-accent/40 shadow-sm"
        : "bg-surface-secondary/40 border-line opacity-75"
    )}>
      {/* 아이콘 */}
      <div className={cn(
        "flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors",
        rule.enabled ? "bg-accent-light text-accent" : "bg-surface text-content-secondary"
      )}>
        {rule.type === "customer" ? <User size={20} /> : <Ticket size={20} />}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-sm mb-xs">
          <h3 className="text-Body-2 font-bold text-content truncate">{rule.name}</h3>
          <div className="flex items-center gap-sm flex-shrink-0">
            <button
              className="p-xs text-content-secondary hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
              onClick={onEdit}
              title="편집"
            >
              <MoreHorizontal size={16} />
            </button>
            <Toggle checked={rule.enabled} onChange={onToggle} />
          </div>
        </div>

        <p className="text-Label text-content-secondary mb-sm line-clamp-1">{rule.description}</p>

        {/* 발송 채널 + 숫자 입력 */}
        <div className="flex items-center gap-sm flex-wrap">
          <span className={cn(
            "inline-flex items-center gap-[3px] px-sm py-[2px] rounded-full text-[11px] font-semibold border",
            rule.enabled
              ? "bg-primary-light text-primary border-primary/20"
              : "bg-surface text-content-secondary border-line"
          )}>
            {CHANNEL_ICON[rule.channel]}
            {CHANNEL_LABEL[rule.channel]}
          </span>

          {rule.hasNumberInput && onNumberChange && (
            <div className="flex items-center bg-surface border border-line rounded-button px-sm gap-xs">
              <input
                type="number"
                min={1}
                className="w-10 bg-transparent border-none py-[2px] text-center text-Label font-bold text-content focus:ring-0 outline-none"
                value={numVal}
                onChange={e => {
                  const v = Number(e.target.value);
                  setNumVal(v);
                  onNumberChange(v);
                }}
              />
              <span className="text-[11px] text-content-secondary">{rule.numberLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* 활성 표시 dot */}
      {rule.enabled && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-accent" />
        </span>
      )}
    </div>
  );
}

// --- settings 저장/불러오기 헬퍼 ---
const ALARM_SETTINGS_KEY = "auto_alarm";
function getBranchId() { if (typeof window === "undefined") return "1"; return localStorage.getItem("branchId") || "1"; }
function getAlarmStorageKey() { return `settings_${getBranchId()}_${ALARM_SETTINGS_KEY}`; }

interface AlarmSettingsData {
  rules: AlarmRule[];
  senderNumber: string;
}

async function loadAlarmSettings(): Promise<AlarmSettingsData | null> {
  // settings 테이블에 key/value 컬럼 없음 → localStorage만 사용
  const saved = localStorage.getItem(getAlarmStorageKey());
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.rules) return parsed;
    } catch {}
  }
  return null;
}

async function saveAlarmSettings(data: AlarmSettingsData): Promise<boolean> {
  const jsonValue = JSON.stringify(data);
  localStorage.setItem(getAlarmStorageKey(), jsonValue);
  return true;
}

export default function AutoAlarm() {
  const [rules, setRules] = useState<AlarmRule[]>(INITIAL_RULES);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editingRule, setEditingRule]     = useState<AlarmRule | null>(null);
  const [senderNumber, setSenderNumber]   = useState("02-1234-5678");
  const [loading, setLoading]             = useState(true);

  // 모달 편집 상태
  const [modalData, setModalData] = useState({
    channel: "talk",
    timing:  "즉시",
    target:  "전체 회원",
    content: "",
  });

  // 초기 로딩
  useEffect(() => {
    (async () => {
      setLoading(true);
      const saved = await loadAlarmSettings();
      if (saved) {
        setRules(saved.rules);
        if (saved.senderNumber) setSenderNumber(saved.senderNumber);
      }
      setLoading(false);
    })();
  }, []);

  // 저장 헬퍼
  const persistAlarm = useCallback(async (newRules: AlarmRule[], newSender?: string) => {
    const ok = await saveAlarmSettings({
      rules: newRules,
      senderNumber: newSender ?? senderNumber,
    });
    if (!ok) toast.error("저장에 실패했습니다. 로컬에 임시 저장되었습니다.");
  }, [senderNumber]);

  const handleToggle = (id: string) => {
    const newRules = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    setRules(newRules);
    persistAlarm(newRules);
  };

  const handleNumberChange = (id: string, val: number) => {
    const newRules = rules.map(r => r.id === id ? { ...r, numberValue: val } : r);
    setRules(newRules);
    persistAlarm(newRules);
  };

  const handleEdit = (rule: AlarmRule) => {
    setEditingRule(rule);
    setModalData({
      channel: rule.channel,
      timing:  rule.template?.timing  ?? "즉시",
      target:  rule.template?.target  ?? "전체 회원",
      content: rule.template?.content ?? `안녕하세요 {이름}님! ${rule.name} 안내 드립니다.`,
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingRule) return;
    const newRules = rules.map(r => r.id === editingRule.id ? {
      ...r,
      channel: modalData.channel as AlarmRule["channel"],
      template: { timing: modalData.timing, target: modalData.target, content: modalData.content },
    } : r);
    setRules(newRules);
    persistAlarm(newRules);
    toast.success("알림 규칙이 저장되었습니다.");
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const enabledCount   = rules.filter(r => r.enabled).length;
  const customerRules  = rules.filter(r => r.type === "customer");
  const productRules   = rules.filter(r => r.type === "product");

  // 로딩 중 스켈레톤
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-xl animate-pulse">
          <div className="h-20 bg-surface rounded-xl border border-line" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-surface rounded-xl border border-line" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-surface rounded-xl border border-line" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="자동 알림 설정"
        description="회원 이벤트 발생 시 자동으로 메시지를 발송하는 알림 규칙을 관리합니다."
        actions={
          <div className="flex gap-sm">
            <button
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Body-2 font-medium text-content hover:bg-primary-light hover:text-primary transition-colors"
              onClick={() => moveToPage(980)}
            >
              <MessageSquare size={16} />메시지 발송
            </button>
            <button
              className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Body-2 font-medium text-content hover:bg-primary-light hover:text-primary transition-colors"
              onClick={() => {
                const newRules = rules.map(r => ({ ...r, enabled: true }));
                setRules(newRules);
                persistAlarm(newRules);
                toast.success("모든 알림 규칙이 활성화되었습니다.");
              }}
            >
              <CheckCircle2 size={16} />모두 사용
            </button>
            <button
              className="flex items-center gap-xs rounded-button bg-primary px-md py-sm text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
              onClick={() => {
                const newRule: AlarmRule = {
                  id: `custom-${Date.now()}`,
                  name: "새 알림 규칙",
                  description: "새로운 알림 규칙을 설정하세요.",
                  channel: "talk",
                  type: "customer",
                  enabled: false,
                  template: { timing: "즉시", target: "전체 회원", content: "" },
                };
                const newRules = [...rules, newRule];
                setRules(newRules);
                persistAlarm(newRules);
                // 바로 편집 모달 열기
                handleEdit(newRule);
                toast.success("새 알림 규칙이 추가되었습니다.");
              }}
            >
              <Plus size={16} />설정 추가
            </button>
          </div>
        }
      />

      {/* 상단 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
        {/* 발신 번호 */}
        <div className="bg-surface p-lg rounded-xl border border-line shadow-card">
          <Select
            label="발신 번호"
            value={senderNumber}
            onChange={v => setSenderNumber(v)}
            options={[
              { value: "02-1234-5678", label: "02-1234-5678 (대표번호)" },
              { value: "010-9876-5432", label: "010-9876-5432 (김매니저)" },
            ]}
          />
        </div>

        <StatCard
          label="보유 포인트"
          value="125,400 P"
          icon={<MessageSquare />}
          description="약 8,360건 발송 가능 (단문 기준)"
          variant="peach"
        />

        {/* 활성 트리거 현황 */}
        <div className="bg-accent-light p-lg rounded-xl border border-accent/20 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-Label text-content-secondary">활성화된 알림 규칙</span>
            <StatusBadge variant="success" dot={true}>정상 작동 중</StatusBadge>
          </div>
          <div className="mt-sm">
            <span className="text-Heading-1 text-accent font-bold">{enabledCount}</span>
            <span className="text-Body-1 text-content ml-xs">/ {rules.length}종</span>
          </div>
        </div>
      </div>

      {/* UI-101 알림 규칙 리스트 */}
      <div className="space-y-xl">
        {/* 고객 관련 7종 */}
        <FormSection
          title="고객 관련 자동 알림 (7종)"
          description="회원 계약, 생일, 출석 등 고객 이벤트 기반 알림"
          columns={1}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {customerRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggle(rule.id)}
                onEdit={() => handleEdit(rule)}
                onNumberChange={rule.hasNumberInput ? (val) => handleNumberChange(rule.id, val) : undefined}
              />
            ))}
          </div>
        </FormSection>

        {/* 상품 관련 6종 */}
        <FormSection
          title="상품 관련 자동 알림 (6종)"
          description="이용권 만료, 홀딩 해제 등 상품 상태 기반 알림"
          columns={1}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {productRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggle(rule.id)}
                onEdit={() => handleEdit(rule)}
                onNumberChange={rule.hasNumberInput ? (val) => handleNumberChange(rule.id, val) : undefined}
              />
            ))}
          </div>
        </FormSection>
      </div>

      {/* UI-102 규칙 설정 모달 */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-lg">
          <div className="w-full max-w-[820px] bg-surface rounded-modal shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-line px-xl py-lg">
              <div className="flex items-center gap-sm">
                <div className="rounded-full bg-primary-light p-sm">
                  <Bell className="text-primary" size={20} />
                </div>
                <div>
                  <h2 className="text-Heading-2 text-content font-bold">{editingRule.name}</h2>
                  <p className="text-Body-2 text-content-secondary">자동 알림 템플릿 편집</p>
                </div>
              </div>
              <button className="text-content-secondary hover:text-content transition-colors" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {/* 모달 본문 */}
            <div className="p-xl grid grid-cols-1 md:grid-cols-2 gap-xl">
              {/* 편집 폼 */}
              <div className="space-y-lg">
                {/* 발송 채널 */}
                <div>
                  <label className="block text-Label text-content-secondary mb-sm">발송 채널</label>
                  <div className="grid grid-cols-2 gap-sm">
                    {["talk", "sms", "lms", "push"].map(ch => (
                      <button
                        key={ch}
                        className={cn(
                          "flex items-center justify-center gap-xs rounded-button border py-sm text-Body-2 transition-all",
                          modalData.channel === ch
                            ? "border-accent bg-accent-light text-accent font-bold"
                            : "border-line bg-surface text-content-secondary hover:bg-surface-secondary"
                        )}
                        onClick={() => setModalData(prev => ({ ...prev, channel: ch }))}
                      >
                        {ch === "talk" && "알림톡"}
                        {ch === "sms"  && "SMS"}
                        {ch === "lms"  && "LMS"}
                        {ch === "push" && "앱 푸시"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 발송 시점 / 대상 */}
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <Select
                      label="발송 시점"
                      value={modalData.timing}
                      onChange={v => setModalData(prev => ({ ...prev, timing: v }))}
                      options={[
                        { value: "즉시", label: "즉시" },
                        { value: "1일 전", label: "1일 전" },
                        { value: "3일 전", label: "3일 전" },
                        { value: "7일 전", label: "7일 전" },
                        { value: "14일 전", label: "14일 전" },
                      ]}
                    />
                  </div>
                  <div>
                    <Select
                      label="발송 대상"
                      value={modalData.target}
                      onChange={v => setModalData(prev => ({ ...prev, target: v }))}
                      options={[
                        { value: "전체 회원", label: "전체 회원" },
                        { value: "신규 회원", label: "신규 회원" },
                        { value: "장기 회원", label: "장기 회원" },
                        { value: "VIP 회원", label: "VIP 회원" },
                      ]}
                    />
                  </div>
                </div>

                {/* 메시지 내용 */}
                <div>
                  <div className="flex items-center justify-between mb-sm">
                    <label className="block text-Label text-content-secondary">메시지 내용</label>
                    <div className="flex gap-xs">
                      {["{이름}", "{만료일}", "{상품명}"].map(v => (
                        <button
                          key={v}
                          className="rounded-full bg-surface-secondary px-xs py-[2px] text-[10px] font-medium text-content-secondary hover:bg-primary-light hover:text-primary transition-colors"
                          onClick={() => setModalData(prev => ({ ...prev, content: prev.content + v }))}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Textarea
                    value={modalData.content}
                    onChange={e => setModalData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="내용을 입력하세요"
                    rows={5}
                    className="h-[140px]"
                  />
                  <p className="mt-xs text-right text-Label text-content-secondary">
                    {modalData.content.length} / 1,000자
                  </p>
                </div>
              </div>

              {/* 미리보기 */}
              <div className="bg-surface-secondary rounded-xl p-lg flex flex-col items-center border border-line">
                <p className="text-Label text-content-secondary mb-md">발송 미리보기</p>
                <div className="relative w-[220px] h-[440px] bg-content rounded-[32px] border-[7px] border-content shadow-xl overflow-hidden">
                  <div className="absolute top-0 w-full h-7 bg-content flex items-center justify-center">
                    <div className="w-14 h-3 rounded-full bg-black/30" />
                  </div>
                  <div className="mt-7 p-md">
                    <div className="bg-surface rounded-[14px] p-md shadow-sm">
                      <div className="flex items-center gap-xs mb-sm">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Smartphone className="text-white" size={10} />
                        </div>
                        <span className="text-[9px] font-bold text-content">FitGenie CRM</span>
                        <span className="text-[9px] text-content-secondary ml-auto">방금 전</span>
                      </div>
                      <p className="text-[11px] text-content whitespace-pre-wrap leading-relaxed">
                        {modalData.content || "(내용을 입력하세요)"}
                      </p>
                    </div>
                  </div>
                </div>
                <button className="mt-md flex items-center gap-xs rounded-full bg-surface px-md py-sm border border-line text-[12px] text-content-secondary hover:text-primary transition-colors">
                  <Smartphone size={13} />테스트 발송
                </button>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end gap-sm border-t border-line bg-surface-secondary/30 px-xl py-lg">
              <button
                className="rounded-button border border-line bg-surface px-xl py-md text-Body-2 font-medium text-content-secondary hover:bg-surface-secondary transition-colors"
                onClick={() => setIsModalOpen(false)}
              >
                취소
              </button>
              <button
                className="rounded-button bg-accent px-xl py-md text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                onClick={handleSave}
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}


