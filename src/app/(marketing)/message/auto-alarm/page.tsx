'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bell,
  Plus,
  X,
  Lock,
  Smartphone,
  MessageSquare,
  User,
  Ticket,
  CreditCard,
  Settings2,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import StatusBadge from "@/components/common/StatusBadge";
import { moveToPage } from "@/internal";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/stores/authStore";
import { isRoleAtLeast, normalizeRole } from "@/lib/permissions";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

/**
 * SCR-072 자동 알림 설정 + SCR-072A 자동알림 운영현황
 * - 본사 step / 지점 추가 step 구조 (본사 필수 ON 잠금)
 * - 만료 정책 3탭: 회원 이용권 만료 / 결제기한 만료 / 락커 만료
 * - 권한 분기: Owner(지점장)만 ON/OFF·step 추가·전체 ON/OFF, 매니저는 조회·상세 편집만
 */

type ExpiryPolicy = "membership" | "payment" | "locker";
type StepOrigin = "hq" | "branch";
type Channel = "talk" | "sms" | "lms" | "push";

interface AlarmStep {
  id: string;
  policy: ExpiryPolicy;      // 만료 정책 분류
  origin: StepOrigin;        // 본사 step | 지점 추가 step
  label: string;             // 표시명 (예: "만료 D-7")
  baseDay: number;           // 기준일 (만료 N일 전)
  channel: Channel;
  enabled: boolean;
  hqRequired?: boolean;      // 본사 필수 (ON 고정 잠금)
  template: { timing: string; target: string; content: string };
}

interface EventRule {
  id: string;
  name: string;
  description: string;
  channel: Channel;
  enabled: boolean;
  template: { timing: string; target: string; content: string };
}

const EXPIRY_TABS: { key: ExpiryPolicy; label: string; icon: React.ReactNode; allowBranchStep: boolean }[] = [
  { key: "membership", label: "회원 이용권 만료", icon: <Ticket size={14} />, allowBranchStep: true },
  { key: "payment", label: "결제기한 만료", icon: <CreditCard size={14} />, allowBranchStep: false },
  { key: "locker", label: "락커 만료", icon: <Lock size={14} />, allowBranchStep: true },
];

const INITIAL_STEPS: AlarmStep[] = [
  // 회원 이용권 만료 — 본사 step + 지점 추가 step
  { id: "ms-hq-7", policy: "membership", origin: "hq", label: "만료 D-7", baseDay: 7, channel: "talk", enabled: true, hqRequired: true, template: { timing: "만료 7일 전 09:00", target: "이용권 보유 회원", content: "{이름}님, 회원권이 7일 후 만료됩니다. 재등록 시 특별 혜택을 드립니다." } },
  { id: "ms-hq-3", policy: "membership", origin: "hq", label: "만료 D-3", baseDay: 3, channel: "talk", enabled: true, template: { timing: "만료 3일 전 09:00", target: "이용권 보유 회원", content: "{이름}님, 회원권이 3일 후 만료됩니다." } },
  { id: "ms-branch-1", policy: "membership", origin: "branch", label: "만료 D-1", baseDay: 1, channel: "sms", enabled: false, template: { timing: "만료 1일 전 18:00", target: "이용권 보유 회원", content: "내일 {이름}님의 회원권이 만료됩니다." } },
  // 결제기한 만료 — 본사 step만 (지점 추가 불가)
  { id: "pay-hq-3", policy: "payment", origin: "hq", label: "납입기한 D-3", baseDay: 3, channel: "talk", enabled: true, hqRequired: true, template: { timing: "납입기한 3일 전 10:00", target: "미수금/분할 회원", content: "{이름}님, 결제 납입기한이 3일 남았습니다." } },
  { id: "pay-hq-0", policy: "payment", origin: "hq", label: "납입기한 당일", baseDay: 0, channel: "sms", enabled: true, template: { timing: "납입기한 당일 10:00", target: "미수금/분할 회원", content: "{이름}님, 오늘이 결제 납입기한입니다." } },
  // 락커 만료 — 본사 step + 지점 추가 step
  { id: "lk-hq-3", policy: "locker", origin: "hq", label: "락커 만료 D-3", baseDay: 3, channel: "talk", enabled: true, hqRequired: true, template: { timing: "락커 만료 3일 전 09:00", target: "락커 이용 회원", content: "{이름}님, 락커 이용이 3일 후 종료됩니다." } },
  { id: "lk-branch-7", policy: "locker", origin: "branch", label: "락커 만료 D-7", baseDay: 7, channel: "talk", enabled: true, template: { timing: "락커 만료 7일 전 09:00", target: "락커 이용 회원", content: "{이름}님, 락커 이용이 7일 후 종료됩니다." } },
];

const INITIAL_EVENTS: EventRule[] = [
  { id: "birthday", name: "생일 축하", description: "생일 당일 축하 메시지", channel: "talk", enabled: true, template: { timing: "생일 당일 09:00", target: "전체 회원", content: "🎉 {이름}님, 생일을 축하합니다!" } },
  { id: "absence", name: "장기 미방문", description: "30/60/90일 미방문 회원 안내", channel: "sms", enabled: false, template: { timing: "미방문 30일 경과", target: "전체 회원", content: "{이름}님, 오랫동안 뵙지 못했어요. 센터에서 기다리고 있습니다." } },
  { id: "register-thanks", name: "등록 감사", description: "회원 등록 즉시 감사 메시지", channel: "talk", enabled: true, template: { timing: "등록 즉시", target: "신규 등록 회원", content: "{이름}님, 등록해 주셔서 감사합니다!" } },
  { id: "first-visit", name: "첫 방문 환영", description: "첫 방문 시 환영 메시지", channel: "talk", enabled: true, template: { timing: "첫 방문 즉시", target: "첫 방문 회원", content: "환영합니다 {이름}님! {센터명}에 오신 것을 환영합니다." } },
];

const CHANNEL_LABEL: Record<Channel, string> = { talk: "알림톡", sms: "SMS", lms: "LMS", push: "앱 푸시" };
const CHANNEL_ICON: Record<Channel, React.ReactNode> = {
  talk: <MessageSquare size={11} />, sms: <Smartphone size={11} />, lms: <Smartphone size={11} />, push: <Bell size={11} />,
};

// --- 운영현황(SCR-072A) 목업 데이터 ---
const OPS_SUMMARY = [
  { policy: "회원 이용권 만료", sent: 1240, success: 1198, fail: 42 },
  { policy: "결제기한 만료", sent: 380, success: 366, fail: 14 },
  { policy: "락커 만료", sent: 210, success: 205, fail: 5 },
  { policy: "생일/이벤트", sent: 520, success: 511, fail: 9 },
];
const OPS_FAIL_REASONS = [
  { reason: "수신 거부", count: 34 },
  { reason: "발신 번호 미인증", count: 18 },
  { reason: "잔여 캐시 부족", count: 12 },
  { reason: "변수 데이터 누락", count: 6 },
];

// --- 토글 ---
const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
  <button
    type="button"
    disabled={disabled}
    className={cn(
      "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none",
      checked ? "bg-accent" : "bg-content-secondary/30",
      disabled && "opacity-60 cursor-not-allowed"
    )}
    onClick={() => { if (!disabled) onChange(); }}
  >
    <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
  </button>
);

function getBranchId() {
  if (typeof window === "undefined") return 1;
  return Number(localStorage.getItem("branchId") || "1");
}

interface AlarmSettingsData {
  steps: AlarmStep[];
  events: EventRule[];
  masterEnabled: boolean;
  senderNumber: string;
}

export default function AutoAlarm() {
  const authUser = useAuthStore((s) => s.user);
  // Owner(지점장) 이상만 ON/OFF·step 추가·전체 ON/OFF 가능. 매니저는 조회·상세 편집만.
  const canControl = authUser?.isSuperAdmin || isRoleAtLeast(normalizeRole(authUser?.role ?? ""), "owner");

  const [mainTab, setMainTab] = useState<"settings" | "ops">("settings");
  const [expiryTab, setExpiryTab] = useState<ExpiryPolicy>("membership");
  const [steps, setSteps] = useState<AlarmStep[]>(INITIAL_STEPS);
  const [events, setEvents] = useState<EventRule[]>(INITIAL_EVENTS);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [senderNumber, setSenderNumber] = useState("02-1234-5678");
  const [loading, setLoading] = useState(true);

  // step 상세 편집 모달
  const [editStep, setEditStep] = useState<AlarmStep | null>(null);
  const [editEvent, setEditEvent] = useState<EventRule | null>(null);
  const [modalData, setModalData] = useState({ channel: "talk" as Channel, timing: "즉시", target: "전체 회원", content: "" });

  // 지점 step 추가 모달
  const [addStepOpen, setAddStepOpen] = useState(false);
  const [newStep, setNewStep] = useState({ baseDay: 5, channel: "talk" as Channel });

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from("auto_alarm_settings")
        .select("steps, events, masterEnabled, senderNumber")
        .eq("branchId", getBranchId())
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        toast.error(`자동 알림 설정을 불러오지 못했습니다: ${error.message}`);
        setLoading(false);
        return;
      }

      if (data) {
        setSteps(Array.isArray(data.steps) ? data.steps as AlarmStep[] : INITIAL_STEPS);
        setEvents(Array.isArray(data.events) ? data.events as EventRule[] : INITIAL_EVENTS);
        setMasterEnabled(Boolean(data.masterEnabled));
        if (data.senderNumber) setSenderNumber(data.senderNumber);
      }
      setLoading(false);
    };

    loadSettings();
    return () => { mounted = false; };
  }, []);

  const save = useCallback(async (next: Partial<AlarmSettingsData>) => {
    const data: AlarmSettingsData = {
      steps: next.steps ?? steps,
      events: next.events ?? events,
      masterEnabled: next.masterEnabled ?? masterEnabled,
      senderNumber: next.senderNumber ?? senderNumber,
    };
    const { error } = await supabase
      .from("auto_alarm_settings")
      .upsert({ branchId: getBranchId(), ...data, updatedAt: new Date().toISOString() }, { onConflict: "branchId" });
    if (error) {
      toast.error(`자동 알림 설정 저장 실패: ${error.message}`);
    }
  }, [steps, events, masterEnabled, senderNumber]);

  const currentSteps = useMemo(() => steps.filter((s) => s.policy === expiryTab), [steps, expiryTab]);
  const enabledCount = steps.filter((s) => s.enabled).length + events.filter((e) => e.enabled).length;
  const totalCount = steps.length + events.length;

  const toggleStep = (id: string) => {
    if (!canControl) { toast.error("Owner(지점장) 권한이 필요합니다."); return; }
    const target = steps.find((s) => s.id === id);
    if (target?.hqRequired) { toast.error("본사 필수 알림은 지점에서 끌 수 없습니다."); return; }
    const next = steps.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSteps(next);
    void save({ steps: next });
  };

  const toggleEvent = (id: string) => {
    if (!canControl) { toast.error("Owner(지점장) 권한이 필요합니다."); return; }
    const next = events.map((e) => (e.id === id ? { ...e, enabled: !e.enabled } : e));
    setEvents(next);
    void save({ events: next });
  };

  const toggleMaster = () => {
    if (!canControl) { toast.error("전체 ON/OFF는 Owner(지점장)만 변경할 수 있습니다."); return; }
    const next = !masterEnabled;
    setMasterEnabled(next);
    void save({ masterEnabled: next });
    toast.success(next ? "전체 자동 알림을 활성화했습니다." : "전체 자동 알림을 비활성화했습니다. (해당 지점만 중단)");
  };

  const openStepEdit = (s: AlarmStep) => {
    setEditStep(s);
    setEditEvent(null);
    setModalData({ channel: s.channel, timing: s.template.timing, target: s.template.target, content: s.template.content });
  };
  const openEventEdit = (e: EventRule) => {
    setEditEvent(e);
    setEditStep(null);
    setModalData({ channel: e.channel, timing: e.template.timing, target: e.template.target, content: e.template.content });
  };

  const saveModal = () => {
    if (editStep) {
      // 본사 step은 기준일 수정 불가 — 채널/메시지/발송 시각만 조정
      const next = steps.map((s) => (s.id === editStep.id ? { ...s, channel: modalData.channel, template: { ...modalData } } : s));
      setSteps(next);
      void save({ steps: next });
    } else if (editEvent) {
      const next = events.map((e) => (e.id === editEvent.id ? { ...e, channel: modalData.channel, template: { ...modalData } } : e));
      setEvents(next);
      void save({ events: next });
    }
    toast.success("알림 규칙이 저장되었습니다.");
    setEditStep(null);
    setEditEvent(null);
  };

  const handleAddBranchStep = () => {
    if (!canControl) { toast.error("Owner(지점장) 권한이 필요합니다."); return; }
    const tab = EXPIRY_TABS.find((t) => t.key === expiryTab);
    if (!tab?.allowBranchStep) { toast.error("결제기한 만료는 본사 정책 step만 사용할 수 있습니다."); return; }
    // 기준일 중복 차단
    if (currentSteps.some((s) => s.baseDay === newStep.baseDay)) {
      toast.error("동일 기준일 step이 이미 있습니다.");
      return;
    }
    const created: AlarmStep = {
      id: `${expiryTab}-branch-${Date.now()}`,
      policy: expiryTab,
      origin: "branch",
      label: newStep.baseDay === 0 ? "만료 당일" : `만료 D-${newStep.baseDay}`,
      baseDay: newStep.baseDay,
      channel: newStep.channel,
      enabled: false,
      template: { timing: `만료 ${newStep.baseDay}일 전`, target: tab.label + " 대상", content: "" },
    };
    const next = [...steps, created];
    setSteps(next);
    void save({ steps: next });
    setAddStepOpen(false);
    setNewStep({ baseDay: 5, channel: "talk" });
    toast.success("지점 추가 step이 등록되었습니다. (비활성 상태)");
  };

  const handleDeleteBranchStep = (id: string) => {
    if (!canControl) { toast.error("Owner(지점장) 권한이 필요합니다."); return; }
    const next = steps.filter((s) => s.id !== id);
    setSteps(next);
    void save({ steps: next });
    toast.success("지점 추가 step이 삭제되었습니다.");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-xl animate-pulse">
          <div className="h-20 bg-surface rounded-xl border border-line" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-surface rounded-xl border border-line" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  const activeExpiryTab = EXPIRY_TABS.find((t) => t.key === expiryTab);

  return (
    <AppLayout>
      <PageHeader
        title="자동 알림 설정"
        description="본사 정책 step과 지점 운영 이벤트 알림을 관리하고 운영현황을 확인합니다."
        actions={
          <button
            className="flex items-center gap-xs rounded-button border border-line bg-surface px-md py-sm text-Body-2 font-medium text-content hover:bg-primary-light hover:text-primary transition-colors"
            onClick={() => moveToPage(980)}
          >
            <MessageSquare size={16} />메시지 발송
          </button>
        }
      />

      {/* 상단 탭: 설정(SCR-072) / 운영현황(SCR-072A) */}
      <div className="flex items-center gap-xs border-b border-line mb-xl">
        {([
          { key: "settings" as const, label: "설정", icon: <Settings2 size={14} /> },
          { key: "ops" as const, label: "운영현황", icon: <BarChart3 size={14} /> },
        ]).map((t) => (
          <button
            key={t.key}
            className={cn(
              "flex items-center gap-xs px-md py-sm text-Body-2 font-semibold border-b-2 -mb-[1px] transition-colors",
              mainTab === t.key ? "border-primary text-primary" : "border-transparent text-content-secondary hover:text-content"
            )}
            onClick={() => setMainTab(t.key)}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {mainTab === "settings" && (
        <>
          {/* 상단 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mb-xl">
            <div className="bg-surface p-lg rounded-xl border border-line shadow-card">
              <Select
                label="발신 번호"
                value={senderNumber}
                onChange={(v) => { setSenderNumber(v); save({ senderNumber: v }); }}
                options={[
                  { value: "02-1234-5678", label: "02-1234-5678 (대표번호)" },
                  { value: "010-9876-5432", label: "010-9876-5432 (김매니저)" },
                ]}
              />
            </div>
            <StatCard label="보유 포인트" value="125,400 P" icon={<MessageSquare />} description="약 8,360건 발송 가능 (단문 기준)" variant="peach" />
            <div className={cn("p-lg rounded-xl border flex flex-col justify-between", masterEnabled ? "bg-accent-light border-accent/20" : "bg-surface-secondary/40 border-line")}>
              <div className="flex items-center justify-between">
                <span className="text-Label text-content-secondary">전체 자동 알림</span>
                <Toggle checked={masterEnabled} onChange={toggleMaster} disabled={!canControl} />
              </div>
              <div className="mt-sm flex items-baseline gap-xs">
                <span className={cn("text-Heading-1 font-bold", masterEnabled ? "text-accent" : "text-content-secondary")}>{enabledCount}</span>
                <span className="text-Body-1 text-content">/ {totalCount}종 활성</span>
              </div>
              {!masterEnabled && <p className="text-[11px] text-content-secondary mt-xs">전체 OFF — 해당 지점 발송 일시 중단</p>}
              {!canControl && <p className="text-[11px] text-content-secondary mt-xs">전체 ON/OFF는 Owner(지점장)만 변경 가능</p>}
            </div>
          </div>

          {/* 만료 정책 3탭 */}
          <div className="bg-surface rounded-xl border border-line shadow-card mb-xl overflow-hidden">
            <div className="flex items-center gap-xs border-b border-line px-md pt-md">
              {EXPIRY_TABS.map((t) => (
                <button
                  key={t.key}
                  className={cn(
                    "flex items-center gap-xs px-md py-sm text-Body-2 font-semibold border-b-2 -mb-[1px] transition-colors",
                    expiryTab === t.key ? "border-primary text-primary" : "border-transparent text-content-secondary hover:text-content"
                  )}
                  onClick={() => setExpiryTab(t.key)}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div className="p-lg space-y-md">
              <div className="flex items-center justify-between">
                <p className="text-Label text-content-secondary">
                  {activeExpiryTab?.label} — 본사 step과 지점 추가 step을 관리합니다.
                </p>
                {/* 지점 step 추가 — 회원 이용권 만료 / 락커 만료 탭에서만 노출 */}
                {activeExpiryTab?.allowBranchStep && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Plus size={14} />}
                    onClick={() => { if (!canControl) { toast.error("Owner(지점장) 권한이 필요합니다."); return; } setAddStepOpen(true); }}
                    disabled={!canControl}
                  >
                    지점 step 추가
                  </Button>
                )}
              </div>

              {currentSteps.length === 0 ? (
                <div className="py-xl text-center text-Body-2 text-content-secondary">등록된 step이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
                  {currentSteps.map((s) => (
                    <StepCard
                      key={s.id}
                      step={s}
                      canControl={!!canControl}
                      onToggle={() => toggleStep(s.id)}
                      onEdit={() => openStepEdit(s)}
                      onDelete={s.origin === "branch" ? () => handleDeleteBranchStep(s.id) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 운영 이벤트 알림 (생일/장기미방문/등록감사/첫방문환영) */}
          <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
            <h3 className="text-Body-1 font-bold text-content mb-xs">지점 운영 이벤트 알림</h3>
            <p className="text-Label text-content-secondary mb-md">생일·장기 미방문·등록 감사·첫 방문 환영 등 지점 운영용 알림입니다.</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  rule={e}
                  canControl={!!canControl}
                  onToggle={() => toggleEvent(e.id)}
                  onEdit={() => openEventEdit(e)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {mainTab === "ops" && <OpsTab />}

      {/* 상세 설정 모달 (step / event 공용) */}
      {(editStep || editEvent) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-lg">
          <div className="w-full max-w-[820px] bg-surface rounded-modal shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-xl py-lg">
              <div className="flex items-center gap-sm">
                <div className="rounded-full bg-primary-light p-sm"><Bell className="text-primary" size={20} /></div>
                <div>
                  <h2 className="text-Heading-2 text-content font-bold">{editStep?.label ?? editEvent?.name}</h2>
                  <p className="text-Body-2 text-content-secondary">
                    {editStep?.hqRequired ? "본사 필수 step — 채널/메시지/발송 시각만 조정 가능" : "자동 알림 템플릿 편집"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" icon={<X size={24} />} onClick={() => { setEditStep(null); setEditEvent(null); }} />
            </div>

            <div className="p-xl grid grid-cols-1 md:grid-cols-2 gap-xl">
              <div className="space-y-lg">
                {editStep && (
                  <div className="rounded-lg bg-surface-secondary/50 border border-line p-md text-Label text-content-secondary">
                    기준일: <span className="font-bold text-content">만료 {editStep.baseDay}일 전</span>
                    {editStep.origin === "hq" && <span className="ml-xs">(본사 기준일 — 수정 불가)</span>}
                  </div>
                )}
                <div>
                  <label className="block text-Label text-content-secondary mb-sm">발송 채널</label>
                  <div className="grid grid-cols-2 gap-sm">
                    {(["talk", "sms", "lms", "push"] as Channel[]).map((ch) => (
                      <button
                        key={ch}
                        className={cn(
                          "flex items-center justify-center gap-xs rounded-button border py-sm text-Body-2 transition-all",
                          modalData.channel === ch ? "border-accent bg-accent-light text-accent font-bold" : "border-line bg-surface text-content-secondary hover:bg-surface-secondary"
                        )}
                        onClick={() => setModalData((p) => ({ ...p, channel: ch }))}
                      >
                        {CHANNEL_LABEL[ch]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <Input label="발송 시각" value={modalData.timing} onChange={(e) => setModalData((p) => ({ ...p, timing: e.target.value }))} />
                  <Select
                    label="발송 대상"
                    value={modalData.target}
                    onChange={(v) => setModalData((p) => ({ ...p, target: v }))}
                    options={[
                      { value: modalData.target, label: modalData.target },
                      { value: "전체 회원", label: "전체 회원" },
                      { value: "신규 회원", label: "신규 회원" },
                    ]}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-sm">
                    <label className="block text-Label text-content-secondary">메시지 내용</label>
                    <div className="flex gap-xs">
                      {["{이름}", "{만료일}", "{상품명}"].map((v) => (
                        <button key={v} className="rounded-full bg-surface-secondary px-xs py-[2px] text-[10px] font-medium text-content-secondary hover:bg-primary-light hover:text-primary transition-colors" onClick={() => setModalData((p) => ({ ...p, content: p.content + v }))}>{v}</button>
                      ))}
                    </div>
                  </div>
                  <Textarea value={modalData.content} onChange={(e) => setModalData((p) => ({ ...p, content: e.target.value }))} placeholder="내용을 입력하세요" rows={5} className="h-[140px]" />
                </div>
              </div>

              <div className="bg-surface-secondary rounded-xl p-lg flex flex-col items-center border border-line">
                <p className="text-Label text-content-secondary mb-md">발송 미리보기</p>
                <div className="relative w-[220px] h-[440px] bg-content rounded-[32px] border-[7px] border-content shadow-xl overflow-hidden">
                  <div className="absolute top-0 w-full h-7 bg-content flex items-center justify-center"><div className="w-14 h-3 rounded-full bg-black/30" /></div>
                  <div className="mt-7 p-md">
                    <div className="bg-surface rounded-[14px] p-md shadow-sm">
                      <div className="flex items-center gap-xs mb-sm">
                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"><Smartphone className="text-white" size={10} /></div>
                        <span className="text-[9px] font-bold text-content">FitGenie CRM</span>
                        <span className="text-[9px] text-content-secondary ml-auto">방금 전</span>
                      </div>
                      <p className="text-[11px] text-content whitespace-pre-wrap leading-relaxed">{modalData.content || "(내용을 입력하세요)"}</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" icon={<Smartphone size={13} />} className="mt-md rounded-full">테스트 발송</Button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-sm border-t border-line bg-surface-secondary/30 px-xl py-lg">
              <button className="rounded-button border border-line bg-surface px-xl py-md text-Body-2 font-medium text-content-secondary hover:bg-surface-secondary transition-colors" onClick={() => { setEditStep(null); setEditEvent(null); }}>취소</button>
              <button className="rounded-button bg-accent px-xl py-md text-Body-2 font-bold text-white shadow-sm hover:opacity-90 transition-opacity" onClick={saveModal}>저장하기</button>
            </div>
          </div>
        </div>
      )}

      {/* 지점 step 추가 모달 */}
      {addStepOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-lg">
          <div className="w-full max-w-[420px] bg-surface rounded-modal shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-lg py-md">
              <h2 className="text-Heading-2 text-content font-bold">{activeExpiryTab?.label} 지점 step 추가</h2>
              <Button variant="ghost" size="sm" icon={<X size={20} />} onClick={() => setAddStepOpen(false)} />
            </div>
            <div className="p-lg space-y-md">
              <Input
                label="기준일 (만료 N일 전, 0=당일)"
                type="number"
                min={0}
                value={String(newStep.baseDay)}
                onChange={(e) => setNewStep((p) => ({ ...p, baseDay: Number(e.target.value) }))}
              />
              <Select
                label="발송 채널"
                value={newStep.channel}
                onChange={(v) => setNewStep((p) => ({ ...p, channel: v as Channel }))}
                options={(["talk", "sms", "lms", "push"] as Channel[]).map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))}
              />
            </div>
            <div className="flex justify-end gap-sm border-t border-line px-lg py-md">
              <Button variant="outline" onClick={() => setAddStepOpen(false)}>취소</Button>
              <Button variant="primary" onClick={handleAddBranchStep}>추가</Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// --- step 카드 ---
function StepCard({ step, canControl, onToggle, onEdit, onDelete }: { step: AlarmStep; canControl: boolean; onToggle: () => void; onEdit: () => void; onDelete?: () => void }) {
  return (
    <div className={cn("relative flex items-start gap-md p-lg rounded-xl border transition-all", step.enabled ? "bg-surface border-accent/40 shadow-sm" : "bg-surface-secondary/40 border-line opacity-80")}>
      <div className={cn("flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center", step.enabled ? "bg-accent-light text-accent" : "bg-surface text-content-secondary")}>
        {step.origin === "hq" ? <Lock size={18} /> : <User size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-sm mb-xs">
          <div className="flex items-center gap-xs flex-wrap">
            <h3 className="text-Body-2 font-bold text-content">{step.label}</h3>
            {step.origin === "hq" ? (
              <StatusBadge variant="info">본사 step</StatusBadge>
            ) : (
              <StatusBadge variant="default">지점 step</StatusBadge>
            )}
            {step.hqRequired && <StatusBadge variant="warning">본사 필수</StatusBadge>}
          </div>
          <div className="flex items-center gap-sm flex-shrink-0">
            <button className="p-xs text-content-secondary hover:text-primary transition-colors" onClick={onEdit} title="상세 설정"><Settings2 size={15} /></button>
            {onDelete && canControl && (
              <button className="p-xs text-content-secondary hover:text-state-error transition-colors" onClick={onDelete} title="삭제"><Trash2 size={15} /></button>
            )}
            <Toggle checked={step.enabled} onChange={onToggle} disabled={!canControl || step.hqRequired} />
          </div>
        </div>
        <p className="text-Label text-content-secondary mb-sm line-clamp-1">{step.template.timing} · {step.template.target}</p>
        <div className="flex items-center gap-sm flex-wrap">
          <span className={cn("inline-flex items-center gap-[3px] px-sm py-[2px] rounded-full text-[11px] font-semibold border", step.enabled ? "bg-primary-light text-primary border-primary/20" : "bg-surface text-content-secondary border-line")}>
            {CHANNEL_ICON[step.channel]}{CHANNEL_LABEL[step.channel]}
          </span>
          {step.hqRequired && <span className="text-[11px] text-amber-600">본사 필수 알림은 지점에서 끌 수 없습니다</span>}
        </div>
      </div>
    </div>
  );
}

// --- 운영 이벤트 카드 ---
function EventCard({ rule, canControl, onToggle, onEdit }: { rule: EventRule; canControl: boolean; onToggle: () => void; onEdit: () => void }) {
  return (
    <div className={cn("relative flex items-start gap-md p-lg rounded-xl border transition-all", rule.enabled ? "bg-surface border-accent/40 shadow-sm" : "bg-surface-secondary/40 border-line opacity-80")}>
      <div className={cn("flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center", rule.enabled ? "bg-accent-light text-accent" : "bg-surface text-content-secondary")}>
        <User size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-sm mb-xs">
          <h3 className="text-Body-2 font-bold text-content truncate">{rule.name}</h3>
          <div className="flex items-center gap-sm flex-shrink-0">
            <button className="p-xs text-content-secondary hover:text-primary transition-colors" onClick={onEdit} title="상세 설정"><Settings2 size={15} /></button>
            <Toggle checked={rule.enabled} onChange={onToggle} disabled={!canControl} />
          </div>
        </div>
        <p className="text-Label text-content-secondary mb-sm line-clamp-1">{rule.description}</p>
        <span className={cn("inline-flex items-center gap-[3px] px-sm py-[2px] rounded-full text-[11px] font-semibold border", rule.enabled ? "bg-primary-light text-primary border-primary/20" : "bg-surface text-content-secondary border-line")}>
          {CHANNEL_ICON[rule.channel]}{CHANNEL_LABEL[rule.channel]}
        </span>
      </div>
    </div>
  );
}

// --- 운영현황 탭 (SCR-072A) ---
function OpsTab() {
  const totalSent = OPS_SUMMARY.reduce((a, b) => a + b.sent, 0);
  const totalSuccess = OPS_SUMMARY.reduce((a, b) => a + b.success, 0);
  const totalFail = OPS_SUMMARY.reduce((a, b) => a + b.fail, 0);
  const successRate = totalSent > 0 ? Math.round((totalSuccess / totalSent) * 1000) / 10 : 0;

  return (
    <div className="space-y-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <StatCard label="총 발송 건수" value={`${totalSent.toLocaleString()}건`} icon={<MessageSquare />} description="최근 30일 기준" />
        <StatCard label="성공률" value={`${successRate}%`} icon={<CheckCircle2 />} variant="mint" description={`성공 ${totalSuccess.toLocaleString()}건`} />
        <StatCard label="실패 건수" value={`${totalFail.toLocaleString()}건`} icon={<AlertTriangle />} variant="peach" description="후속 액션 필요" />
      </div>

      {/* 정책별 발송 현황 */}
      <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
        <div className="px-lg py-md border-b border-line"><h3 className="text-Body-1 font-bold text-content">정책별 발송 현황</h3></div>
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary/50">
            <tr className="text-content-secondary text-Label">
              <th className="px-lg py-sm text-left font-medium">정책</th>
              <th className="px-lg py-sm text-right font-medium">발송</th>
              <th className="px-lg py-sm text-right font-medium">성공</th>
              <th className="px-lg py-sm text-right font-medium">실패</th>
              <th className="px-lg py-sm text-right font-medium">성공률</th>
            </tr>
          </thead>
          <tbody>
            {OPS_SUMMARY.map((row) => {
              const rate = row.sent > 0 ? Math.round((row.success / row.sent) * 1000) / 10 : 0;
              return (
                <tr key={row.policy} className="border-t border-line">
                  <td className="px-lg py-sm font-semibold text-content">{row.policy}</td>
                  <td className="px-lg py-sm text-right text-content">{row.sent.toLocaleString()}</td>
                  <td className="px-lg py-sm text-right text-content">{row.success.toLocaleString()}</td>
                  <td className="px-lg py-sm text-right text-state-error">{row.fail.toLocaleString()}</td>
                  <td className="px-lg py-sm text-right font-bold text-primary">{rate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 실패 사유 */}
      <div className="bg-surface rounded-xl border border-line shadow-card p-lg">
        <h3 className="text-Body-1 font-bold text-content mb-md">실패 사유</h3>
        <div className="space-y-sm">
          {OPS_FAIL_REASONS.map((r) => (
            <div key={r.reason} className="flex items-center justify-between text-Body-2">
              <span className="text-content">{r.reason}</span>
              <span className="font-bold text-state-error">{r.count}건</span>
            </div>
          ))}
        </div>
        <p className="mt-md text-Label text-content-secondary">실패·미응답·상담 필요 대상자는 FC 후속 액션으로 연결됩니다. (집계: 매시간 배치)</p>
      </div>
    </div>
  );
}
