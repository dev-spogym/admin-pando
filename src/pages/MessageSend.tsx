import React, { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/exportExcel";
import {
  Send,
  History,
  MessageSquare,
  Bell,
  Smartphone,
  Search,
  X,
  Users,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  Gift,
  Clock,
  PauseCircle,
  Timer,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { moveToPage } from "@/internal";
import { supabase } from "@/lib/supabase";

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import TabNav from "@/components/TabNav";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import FormSection from "@/components/FormSection";
import Toggle from "@/components/Toggle";

// --- 채널 설정 ---
const CHANNEL_CONFIG = {
  kakao: { label: "알림톡",  maxLen: 1000, costPerMsg: 8 },
  sms:   { label: "SMS/LMS", maxLen: 2000, costPerMsg: 30, smsMax: 90 },
  push:  { label: "앱 푸시", maxLen: 500,  costPerMsg: 0 },
};


type Recipient = { id: number; name: string; phone: string; group: string };

// --- 수신자 검색 모달 ---
function RecipientModal({
  selected,
  onClose,
  onConfirm,
}: {
  selected: Recipient[];
  onClose: () => void;
  onConfirm: (list: Recipient[]) => void;
}) {
  const [query, setQuery]   = useState("");
  const [temp, setTemp]     = useState<Recipient[]>(selected);
  const [members, setMembers] = useState<Recipient[]>([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, phone, membershipType')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setMembers(data.map((m: Record<string, unknown>) => ({
          id: m.id as number,
          name: m.name as string,
          phone: m.phone as string,
          group: (m.membershipType as string) ?? '',
        })));
      }
    };
    fetchMembers();
  }, []);

  const filtered = useMemo(() => {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter(m => m.name.includes(q) || m.phone.includes(q));
  }, [query, members]);

  const isAllSelected = filtered.length > 0 && filtered.every(m => temp.some(s => s.id === m.id));

  const toggle = (m: Recipient) => {
    setTemp(prev =>
      prev.some(s => s.id === m.id) ? prev.filter(s => s.id !== m.id) : [...prev, m]
    );
  };

  const toggleAll = () => {
    if (isAllSelected) {
      setTemp(prev => prev.filter(s => !filtered.some(f => f.id === s.id)));
    } else {
      const toAdd = filtered.filter(f => !temp.some(s => s.id === f.id));
      setTemp(prev => [...prev, ...toAdd]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-md">
      <div className="w-full max-w-lg bg-surface rounded-modal shadow-card overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-xl py-lg border-b border-line flex justify-between items-center">
          <div>
            <h2 className="text-Heading-2 font-bold text-content">수신자 검색</h2>
            <p className="text-Body-2 text-content-secondary mt-xs">{temp.length}명 선택됨</p>
          </div>
          <button className="text-content-secondary hover:text-content transition-colors" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="p-md border-b border-line">
          <div className="relative">
            <Search className="absolute left-md top-1/2 -translate-y-1/2 text-content-secondary" size={16} />
            <input
              className="w-full bg-surface-secondary border border-line rounded-button pl-[36px] pr-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-primary"
              placeholder="이름 또는 전화번호 검색"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="px-lg py-sm border-b border-line flex items-center justify-between bg-surface-secondary/20">
          <label className="flex items-center gap-sm cursor-pointer text-Body-2 text-content">
            <input type="checkbox" className="w-4 h-4 accent-primary" checked={isAllSelected} onChange={toggleAll} />
            <span className="font-semibold">전체 선택</span>
          </label>
          <span className="text-Label text-content-secondary">{filtered.length}명 표시 중</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-line">
          {filtered.map(m => {
            const checked = temp.some(s => s.id === m.id);
            return (
              <label key={m.id} className="flex items-center gap-md px-lg py-md cursor-pointer hover:bg-surface-secondary/20 transition-colors">
                <input type="checkbox" className="w-4 h-4 accent-primary" checked={checked} onChange={() => toggle(m)} />
                <div className="flex-1">
                  <p className="text-Body-2 font-medium text-content">{m.name}</p>
                  <p className="text-Label text-content-secondary">{m.phone} · {m.group}</p>
                </div>
                {checked && <Check size={16} className="text-primary" />}
              </label>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-xl text-center text-content-secondary text-Body-2">검색 결과가 없습니다.</div>
          )}
        </div>

        <div className="px-xl py-lg border-t border-line bg-surface-secondary/5 flex justify-end gap-md">
          <button
            className="px-xl py-md rounded-button border border-line text-content-secondary hover:bg-surface transition-colors"
            onClick={onClose}
          >
            취소
          </button>
          <button
            className="px-xl py-md rounded-button bg-primary text-white font-semibold hover:opacity-90 transition-opacity"
            onClick={() => onConfirm(temp)}
          >
            선택 완료 ({temp.length}명)
          </button>
        </div>
      </div>
    </div>
  );
}


// --- 미리보기 모달 ---
function PreviewModal({
  content,
  recipientCount,
  channel,
  onClose,
  onConfirm,
}: {
  content: string;
  recipientCount: number;
  channel: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-md">
      <div className="w-full max-w-md bg-surface rounded-modal shadow-xl overflow-hidden animate-in zoom-in duration-200">
        <div className="p-xl border-b border-line">
          <h2 className="text-Heading-2 font-bold text-content">발송 미리보기</h2>
          <p className="text-Body-2 text-content-secondary mt-xs">수신자 {recipientCount.toLocaleString()}명에게 발송됩니다.</p>
        </div>
        <div className="p-xl space-y-md">
          <div className="flex items-center gap-sm">
            <StatusBadge variant="info">{channel}</StatusBadge>
            <span className="text-Label text-content-secondary">수신자 {recipientCount.toLocaleString()}명</span>
          </div>
          <div className="bg-surface-secondary border border-line rounded-xl p-lg min-h-[120px]">
            <p className="text-Body-2 text-content whitespace-pre-wrap">{content || "(내용 없음)"}</p>
          </div>
        </div>
        <div className="p-xl border-t border-line flex justify-end gap-sm">
          <button className="px-lg py-sm border border-line rounded-button text-Label text-content-secondary hover:bg-surface-secondary transition-all" onClick={onClose}>
            취소
          </button>
          <button
            className="px-lg py-sm bg-primary text-white rounded-button text-Label font-semibold hover:opacity-90 transition-all flex items-center gap-xs"
            onClick={onConfirm}
          >
            <Send size={14} />발송하기
          </button>
        </div>
      </div>
    </div>
  );
}

type MessageHistory = {
  id: number;
  sentAt: string | null;
  type: string;
  recipients: unknown[];
  status: string;
  scheduledAt: string | null;
};

// 발송 이력 fetch 함수 (컴포넌트 외부에서 재사용)
const fetchMessageHistory = async (branchId: number): Promise<MessageHistory[]> => {
  const { data } = await supabase
    .from('messages')
    .select('id, sentAt, type, recipients, status, scheduledAt')
    .eq('branchId', branchId)
    .order('createdAt', { ascending: false });
  return (data as MessageHistory[]) ?? [];
};

export default function MessageSend() {
  const [activeTab, setActiveTab] = useState("send");
  const [history, setHistory] = useState<MessageHistory[]>([]);

  useEffect(() => {
    fetchMessageHistory(getBranchId()).then(setHistory);
  }, []);

  // --- 발송 폼 상태 ---
  const [sendForm, setSendForm] = useState({
    channel: "kakao",
    recipients: [] as Recipient[],
    useAllMembers: false,
    content: "",
    isReserved: false,
    reserveDate: "",
  });

  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [isPreviewModalOpen,   setIsPreviewModalOpen]   = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [totalMemberCount, setTotalMemberCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("members")
      .select("id", { count: "exact", head: true })
      .eq("branchId", getBranchId())
      .then(({ count }) => { if (count !== null) setTotalMemberCount(count); });
  }, []);

  // --- 자동 알림 상태 ---
  const [autoAlarms, setAutoAlarms] = useState({
    contractComplete: true,
    birthday: false,
    newMember: true,
    longTermAbsence: false,
    couponExpiry: true,
    courseExpiry: true,
    courseExpirySoon: true,
    membershipExpiry: true,
    membershipExpirySoon: true,
  });

  const channelCfg  = CHANNEL_CONFIG[sendForm.channel as keyof typeof CHANNEL_CONFIG];
  const contentLen  = sendForm.content.length;
  const maxLen      = channelCfg.maxLen;
  const isOverLimit = contentLen > maxLen;

  const effectiveCost   = sendForm.channel === "sms"
    ? (contentLen > 90 ? 30 : 70)
    : channelCfg.costPerMsg;
  const smsTypeLabel    = sendForm.channel === "sms" ? (contentLen > 90 ? "LMS" : "SMS") : null;
  const recipientCount  = sendForm.useAllMembers ? (totalMemberCount ?? 0) : sendForm.recipients.length;
  const totalCost       = recipientCount * effectiveCost;

  const removeRecipient = (id: number) => {
    setSendForm(prev => ({ ...prev, recipients: prev.recipients.filter(r => r.id !== id) }));
  };

  const handleSend = () => {
    if (!sendForm.content.trim()) { toast.warning("메시지 내용을 입력하세요."); return; }
    setIsPreviewModalOpen(true);
  };

  const confirmSend = async () => {
    // 중복 발송 방지
    if (isSending) return;
    setIsSending(true);

    setIsPreviewModalOpen(false);

    try {
    // 채널 → MessageType enum 매핑
    const typeMap: Record<string, string> = {
      kakao: 'KAKAO',
      sms: 'SMS',
      push: 'PUSH',
    };

    // 수신자 목록 구성 (전체 선택 시 빈 배열로 표시)
    const recipientList = sendForm.useAllMembers
      ? []
      : sendForm.recipients.map(r => ({ id: r.id, name: r.name, phone: r.phone }));

    const record = {
      branchId: getBranchId(),
      type: typeMap[sendForm.channel] ?? 'SMS',
      title: null,
      content: sendForm.content,
      recipients: recipientList,
      status: sendForm.isReserved ? 'SCHEDULED' : 'SENT',
      sentAt: sendForm.isReserved ? null : new Date().toISOString(),
      scheduledAt: sendForm.isReserved && sendForm.reserveDate
        ? new Date(sendForm.reserveDate).toISOString()
        : null,
    };

    const { error } = await supabase.from('messages').insert(record);
    if (error) {
      toast.error(`발송 이력 저장 실패: ${error.message}`);
      return;
    }

    toast.success(sendForm.isReserved ? "메시지 예약이 완료되었습니다." : "메시지가 발송되었습니다.");
    setSendForm(prev => ({ ...prev, content: "", recipients: [], useAllMembers: false, isReserved: false, reserveDate: "" }));

    // 발송 이력 갱신
    fetchMessageHistory(getBranchId()).then(setHistory);
    } finally {
      setIsSending(false);
    }
  };

  // 발송 이력 컬럼 (실제 messages 테이블 스키마 기준)
  const historyColumns = [
    {
      key: "sentAt",
      header: "발송일시",
      width: 160,
      render: (val: string | null) => val ? val.slice(0, 16).replace('T', ' ') : "-",
    },
    {
      key: "type",
      header: "유형",
      width: 100,
      align: "center" as const,
      render: (val: string) => <StatusBadge variant="info">{val}</StatusBadge>,
    },
    {
      key: "recipients",
      header: "수신자 수",
      width: 100,
      align: "right" as const,
      render: (val: unknown[]) => `${Array.isArray(val) ? val.length : 0}명`,
    },
    {
      key: "scheduledAt",
      header: "예약일시",
      width: 140,
      render: (val: string | null) => val ? val.slice(0, 16).replace('T', ' ') : "-",
    },
    {
      key: "status",
      header: "상태",
      width: 100,
      align: "center" as const,
      render: (val: string) => (
        <div className="flex items-center justify-center gap-xs">
          {val === "SENT"
            ? <><CheckCircle2 size={14} className="text-state-success" /><span className="text-state-success text-Label">완료</span></>
            : val === "SCHEDULED"
            ? <><AlertCircle size={14} className="text-accent" /><span className="text-accent text-Label">예약</span></>
            : <><XCircle size={14} className="text-error" /><span className="text-error text-Label">실패</span></>
          }
        </div>
      ),
    },
  ];

  const mainTabs = [
    { key: "send",    label: "메시지 전송", icon: Send    },
    { key: "history", label: "발송 이력",   icon: History },
  ];

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto">
        <PageHeader
          title="메시지 발송"
          description="회원들에게 알림톡, SMS, 앱 푸시를 발송하고 자동 알림을 관리합니다."
        />

        {/* UI-063 메시지 유형 탭 */}
        <TabNav
          className="mb-lg"
          tabs={mainTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="pb-xxl">
          {/* ===== 발송 탭 ===== */}
          {activeTab === "send" && (
            <div className="space-y-lg animate-in fade-in duration-300">
              {/* 포인트 현황 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <StatCard
                  label="보유 포인트"
                  value="52,480 P"
                  icon={<RefreshCw />}
                  description="약 SMS 2,624건 발송 가능"
                  variant="mint"
                />
                <div className="md:col-span-2 bg-surface rounded-xl border border-line p-lg shadow-card flex items-center justify-between">
                  <div>
                    <p className="text-Label text-content-secondary mb-xs">발신 설정</p>
                    <select
                      className="bg-surface-secondary border-none rounded-button px-md py-sm text-Body-2 outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>02-1234-5678 (대표번호)</option>
                      <option>010-9876-5432</option>
                    </select>
                  </div>
                  <div className="flex gap-xs">
                    <StatusBadge variant="success" dot={true}>알림톡 활성</StatusBadge>
                    <StatusBadge variant="default">SMS 가능</StatusBadge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-lg">
                {/* 수동 발송 폼 */}
                <FormSection title="수동 메시지 발송" description="회원들에게 직접 메시지를 발송합니다." columns={1}>
                  <div className="space-y-md">
                    {/* UI-062 수신자 선택 */}
                    <div>
                      <div className="flex justify-between items-center mb-xs">
                        <label className="text-Label font-semibold text-content">
                          수신자 선택 <span className="text-error">*</span>
                        </label>
                        <span className="text-Label text-content-secondary">
                          {sendForm.useAllMembers ? `전체 ${totalMemberCount !== null ? totalMemberCount.toLocaleString() : "..."}명` : `${sendForm.recipients.length}명 선택됨`}
                        </span>
                      </div>

                      {/* 그룹 빠른 선택 */}
                      <div className="flex flex-wrap gap-xs mb-sm">
                        {["전체", "활성 회원", "만료임박 (7일)", "PT 회원", "장기 미출석"].map(g => (
                          <button
                            key={g}
                            className={cn(
                              "px-sm py-[3px] rounded-full text-Label border transition-all",
                              g === "전체" && sendForm.useAllMembers
                                ? "bg-primary text-white border-primary"
                                : "bg-surface border-line text-content-secondary hover:border-primary hover:text-primary"
                            )}
                            onClick={() => {
                              if (g === "전체") {
                                setSendForm(prev => ({ ...prev, useAllMembers: !prev.useAllMembers, recipients: [] }));
                              } else {
                                toast.info(`"${g}" 그룹 선택`);
                              }
                            }}
                          >
                            {g}
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-sm">
                        <div className="flex-1 bg-surface-secondary border border-line rounded-button p-sm min-h-[44px] flex flex-wrap gap-xs items-center">
                          {sendForm.useAllMembers ? (
                            <span className="bg-primary-light text-primary px-sm py-[2px] rounded-full text-Label flex items-center gap-xs border border-primary/20">
                              <Users size={12} />전체 회원 (1,240명)
                              <button onClick={() => setSendForm(prev => ({ ...prev, useAllMembers: false }))} className="hover:text-error ml-xs">
                                <X size={12} />
                              </button>
                            </span>
                          ) : sendForm.recipients.length === 0 ? (
                            <span className="text-content-secondary text-Body-2">수신자를 선택하세요</span>
                          ) : (
                            sendForm.recipients.map(r => (
                              <span key={r.id} className="bg-primary-light text-primary px-sm py-[2px] rounded-full text-Label flex items-center gap-xs border border-primary/20">
                                {r.name}
                                <button onClick={() => removeRecipient(r.id)} className="hover:text-error"><X size={12} /></button>
                              </span>
                            ))
                          )}
                        </div>
                        <button
                          className="bg-accent-light text-accent px-md py-sm rounded-button font-bold text-Body-2 hover:bg-accent hover:text-white transition-colors self-start"
                          onClick={() => setIsRecipientModalOpen(true)}
                        >
                          대상 검색
                        </button>
                      </div>
                    </div>

                    {/* UI-063 메시지 유형 탭 (SMS/카카오) */}
                    <div>
                      <label className="block text-Label font-semibold text-content mb-xs">
                        발송 채널 <span className="text-error">*</span>
                      </label>
                      <div className="flex gap-sm">
                        {[
                          { id: "kakao", label: "알림톡",  icon: <MessageSquare size={18} />, cost: "8원/건" },
                          { id: "sms",   label: "SMS/LMS", icon: <Smartphone    size={18} />, cost: "70~30원/건" },
                          { id: "push",  label: "앱 푸시", icon: <Bell          size={18} />, cost: "무료" },
                        ].map(item => (
                          <label
                            key={item.id}
                            className={cn(
                              "flex-1 flex flex-col items-center justify-center p-md border rounded-xl cursor-pointer transition-all gap-xs",
                              sendForm.channel === item.id
                                ? "border-primary bg-primary-light text-primary shadow-sm"
                                : "border-line bg-surface text-content-secondary hover:border-content-secondary"
                            )}
                          >
                            <input
                              type="radio"
                              className="hidden"
                              name="channel"
                              checked={sendForm.channel === item.id}
                              onChange={() => setSendForm(prev => ({ ...prev, channel: item.id }))}
                            />
                            {item.icon}
                            <span className="text-Label font-semibold">{item.label}</span>
                            <span className="text-[11px] opacity-70">{item.cost}</span>
                          </label>
                        ))}
                      </div>
                      {/* 글자 제한 안내 */}
                      <p className="mt-xs text-Label text-content-secondary flex items-center gap-xs">
                        <AlertCircle size={12} className="text-accent" />
                        {sendForm.channel === "sms"
                          ? "SMS: 90자 이하 / LMS: 90자 초과 ~ 2,000자"
                          : sendForm.channel === "kakao"
                          ? "알림톡: 최대 1,000자"
                          : "앱 푸시: 최대 500자"
                        }
                      </p>
                    </div>

                    {/* 예상 비용 */}
                    <div className="bg-surface-secondary/30 rounded-xl p-md flex items-center justify-between border border-line">
                      <span className="text-Body-2 text-content-secondary">
                        {smsTypeLabel ? `${smsTypeLabel} ${effectiveCost}원/건` : sendForm.channel === "push" ? "앱 푸시 무료" : `알림톡 ${effectiveCost}원/건`}
                        {" · "}수신자 {recipientCount.toLocaleString()}명
                      </span>
                      <div className="text-right">
                        <p className="text-Label text-content-secondary">예상 발송 비용</p>
                        <p className="text-Body-1 font-bold text-primary">{totalCost.toLocaleString()}원</p>
                      </div>
                    </div>

                    {/* UI-064 본문 에디터 */}
                    <div>
                      <div className="flex justify-between items-center mb-xs">
                        <label className="text-Label font-semibold text-content">
                          메시지 내용 <span className="text-error">*</span>
                        </label>
                        <span className={cn(
                          "text-Label font-medium",
                          isOverLimit ? "text-error" : contentLen > maxLen * 0.9 ? "text-amber-600" : "text-content-secondary"
                        )}>
                          {contentLen} / {maxLen}자
                          {smsTypeLabel && <span className="ml-xs text-[11px]">({smsTypeLabel})</span>}
                          {isOverLimit && <span className="ml-xs">초과</span>}
                        </span>
                      </div>
                      <textarea
                        className={cn(
                          "w-full bg-surface-secondary border rounded-button px-md py-sm text-Body-2 outline-none resize-none focus:ring-2",
                          isOverLimit ? "border-error focus:ring-error/30" : "border-line focus:ring-primary"
                        )}
                        rows={6}
                        placeholder="내용을 입력하세요."
                        value={sendForm.content}
                        onChange={e => setSendForm(prev => ({ ...prev, content: e.target.value }))}
                      />
                      {/* 글자수 게이지 */}
                      <div className="mt-xs h-1 rounded-full bg-line overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isOverLimit ? "bg-error" : contentLen > maxLen * 0.9 ? "bg-amber-500" : "bg-accent"
                          )}
                          style={{ width: `${Math.min((contentLen / maxLen) * 100, 100)}%` }}
                        />
                      </div>
                      {/* 변수 삽입 버튼 */}
                      <div className="mt-sm flex flex-wrap gap-xs">
                        {["#{이름}", "#{만료일}", "#{상품명}", "#{잔여횟수}", "#{센터명}"].map(tag => (
                          <button
                            key={tag}
                            className="text-Label bg-surface border border-line px-sm py-[2px] rounded-full text-content-secondary hover:border-primary hover:text-primary transition-colors"
                            onClick={() => setSendForm(prev => ({ ...prev, content: prev.content + tag }))}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 예약 발송 + UI-065 발송 버튼 */}
                    <div className="pt-md border-t border-line flex items-center justify-between">
                      <div className="flex items-center gap-sm">
                        <input
                          type="checkbox"
                          id="reserve"
                          className="w-4 h-4 accent-primary"
                          checked={sendForm.isReserved}
                          onChange={e => setSendForm(prev => ({ ...prev, isReserved: e.target.checked }))}
                        />
                        <label htmlFor="reserve" className="text-Body-2 text-content cursor-pointer">예약 발송</label>
                        {sendForm.isReserved && (
                          <input
                            type="datetime-local"
                            className="bg-surface-secondary border border-line rounded-button px-sm py-xs text-Body-2 outline-none"
                            value={sendForm.reserveDate}
                            onChange={e => setSendForm(prev => ({ ...prev, reserveDate: e.target.value }))}
                          />
                        )}
                      </div>
                      <button
                        className="bg-primary text-white px-xl py-md rounded-button font-bold text-Body-1 shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        disabled={isSending || isOverLimit || (!sendForm.useAllMembers && sendForm.recipients.length === 0)}
                        onClick={handleSend}
                      >
                        <Send size={16} />{isSending ? "발송 중..." : "메시지 발송"}
                      </button>
                    </div>
                  </div>
                </FormSection>

                {/* 자동 알림 설정 미리보기 */}
                <div className="space-y-lg">
                  <FormSection
                    title="자동 알림 설정"
                    description="이벤트 발생 시 자동으로 메시지를 발송합니다."
                    columns={1}
                    actions={
                      <button
                        className="text-accent text-Label font-bold flex items-center gap-xs hover:underline"
                        onClick={() => moveToPage(992)}
                      >
                        상세 설정 <ChevronRight size={14} />
                      </button>
                    }
                  >
                    <div className="space-y-xl">
                      <div>
                        <h4 className="text-Label text-content-secondary font-bold mb-md uppercase tracking-wider">고객 관련</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                          {[
                            { key: "contractComplete",   label: "계약 완료 시",   icon: <ShieldCheck size={15} /> },
                            { key: "birthday",           label: "생일자 고객",    icon: <Gift        size={15} /> },
                            { key: "newMember",          label: "신규 등록 시",   icon: <UserPlus    size={15} /> },
                            { key: "longTermAbsence",    label: "장기 미출석 시", icon: <PauseCircle size={15} /> },
                            { key: "couponExpiry",       label: "쿠폰 만료 시",   icon: <Timer       size={15} /> },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-md bg-surface-secondary/30 rounded-xl border border-transparent hover:border-line transition-all">
                              <div className="flex items-center gap-sm">
                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-content-secondary shadow-sm">
                                  {item.icon}
                                </div>
                                <span className="text-Body-2 font-medium text-content">{item.label}</span>
                              </div>
                              <Toggle
                                checked={autoAlarms[item.key as keyof typeof autoAlarms]}
                                onChange={(val) => setAutoAlarms(prev => ({ ...prev, [item.key]: val }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-Label text-content-secondary font-bold mb-md uppercase tracking-wider">상품 관련</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                          {[
                            { key: "courseExpiry",        label: "수강권 만료 시",  icon: <Clock size={15} /> },
                            { key: "courseExpirySoon",    label: "수강권 만료 전",  icon: <Bell  size={15} /> },
                            { key: "membershipExpiry",    label: "회원권 만료 시",  icon: <Clock size={15} /> },
                            { key: "membershipExpirySoon",label: "회원권 만료 전",  icon: <Bell  size={15} /> },
                          ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-md bg-surface-secondary/30 rounded-xl border border-transparent hover:border-line transition-all">
                              <div className="flex items-center gap-sm">
                                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-content-secondary shadow-sm">
                                  {item.icon}
                                </div>
                                <span className="text-Body-2 font-medium text-content">{item.label}</span>
                              </div>
                              <Toggle
                                checked={autoAlarms[item.key as keyof typeof autoAlarms]}
                                onChange={(val) => setAutoAlarms(prev => ({ ...prev, [item.key]: val }))}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </FormSection>
                </div>
              </div>

              {/* UI-066 발송 이력 */}
              <DataTable
                title="최근 발송 이력"
                columns={historyColumns}
                data={history}
                pagination={{ page: 1, pageSize: 5, total: history.length }}
              />
            </div>
          )}

          {/* ===== 발송 이력 탭 ===== */}
          {activeTab === "history" && (
            <div className="space-y-lg animate-in fade-in duration-300">
              <DataTable
                title="전체 발송 이력"
                columns={historyColumns}
                data={history}
                selectable={true}
                pagination={{ page: 1, pageSize: 10, total: history.length }}
                onDownloadExcel={() => {
                  const exportColumns = [
                    { key: 'sentAt',         header: '발송일시' },
                    { key: 'type',           header: '유형' },
                    { key: 'status',         header: '상태' },
                    { key: 'scheduledAt',    header: '예약일시' },
                  ];
                  exportToExcel(history as unknown as Record<string, unknown>[], exportColumns, { filename: '발송이력' });
                  toast.success(`${history.length}건 엑셀 다운로드 완료`);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 수신자 검색 모달 */}
      {isRecipientModalOpen && (
        <RecipientModal
          selected={sendForm.recipients}
          onClose={() => setIsRecipientModalOpen(false)}
          onConfirm={list => {
            setSendForm(prev => ({ ...prev, recipients: list, useAllMembers: false }));
            setIsRecipientModalOpen(false);
          }}
        />
      )}

      {/* 미리보기 모달 */}
      {isPreviewModalOpen && (
        <PreviewModal
          content={sendForm.content}
          recipientCount={recipientCount}
          channel={CHANNEL_CONFIG[sendForm.channel as keyof typeof CHANNEL_CONFIG].label}
          onClose={() => setIsPreviewModalOpen(false)}
          onConfirm={confirmSend}
        />
      )}
    </AppLayout>
  );
}
