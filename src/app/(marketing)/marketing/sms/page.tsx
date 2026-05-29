'use client';
export const dynamic = 'force-dynamic';

// SCR-078 SMS/카카오 대량 발송 (docs4/V1/D08-마케팅/마케팅.md ## SCR-078)
// 호스트 다이얼로그: DLG-078-001 발송 대상 선택 / DLG-078-002 발송 확인
// 반영: 채널 현황 4카드(MKT-08-01) + 플랫폼 연동 정보, 발송 대상 선택(예상 수신자),
//       템플릿 선택/편집, 즉시·예약 발송, 발송 확인(예상 비용·잔여 캐시·제외), 발송 이력(성공/실패/제외)
//       예외처리: 잔여 캐시 부족, 수신자 0명, 미승인 템플릿, 글자수 LMS 자동 전환, 야간 광고 차단

import React, { useMemo, useState } from 'react';
import { Send, MessageSquare, Coins, Wallet, RefreshCw, Users, FileText, AlertTriangle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import FormModal from '@/components/common/FormModal';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BULK_SEND_SUMMARY,
  SEND_TARGET_GROUPS,
  CHANNEL_UNIT_COST,
  MOCK_SEND_HISTORY,
  MOCK_SMS_TEMPLATES,
  type BulkSendHistory,
  type SmsTemplate,
  type SendChannel,
  type SendHistoryStatus,
} from '@/mocks/marketing';

const HISTORY_BADGE: Record<SendHistoryStatus, { variant: 'success' | 'warning' | 'info' | 'error'; label: string }> = {
  완료: { variant: 'success', label: '완료' },
  예약: { variant: 'info', label: '예약' },
  발송중: { variant: 'warning', label: '발송 중' },
  부분실패: { variant: 'error', label: '부분 실패' },
};

type LoadState = 'loading' | 'error' | 'ready';
type Tab = '발송' | '이력' | '템플릿';
type Channel = 'SMS' | '카카오';

/** SMS 계열은 본문 길이로 SMS/LMS 분류 (90byte 기준, 한글 2byte 근사) */
function classifySms(text: string): SendChannel {
  const bytes = [...text].reduce((s, ch) => s + (ch.charCodeAt(0) > 127 ? 2 : 1), 0);
  return bytes > 90 ? 'LMS' : 'SMS';
}

export default function SmsKakaoPage() {
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [history, setHistory] = useState<BulkSendHistory[]>(MOCK_SEND_HISTORY);
  const [templates, setTemplates] = useState<SmsTemplate[]>(MOCK_SMS_TEMPLATES);
  const [tab, setTab] = useState<Tab>('발송');

  // 발송 작성 상태
  const [channel, setChannel] = useState<Channel>('SMS');
  const [target, setTarget] = useState(SEND_TARGET_GROUPS[0].value);
  const [message, setMessage] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [scheduleType, setScheduleType] = useState<'즉시' | '예약'>('즉시');
  const [scheduleAt, setScheduleAt] = useState('');

  // 다이얼로그
  const [targetOpen, setTargetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<SmsTemplate | null>(null);
  const [draftTemplate, setDraftTemplate] = useState('');

  const targetSize = SEND_TARGET_GROUPS.find((g) => g.value === target)?.size ?? 0;
  // 제외(수신거부/휴면/비친구) 근사 5% — docs4 예외처리 시연
  const excluded = Math.round(targetSize * 0.05);
  const sendable = targetSize - excluded;
  const effectiveChannel: SendChannel = channel === '카카오' ? '카카오' : classifySms(message);
  const estimatedCost = sendable * CHANNEL_UNIT_COST[effectiveChannel];
  const remainingAfter = BULK_SEND_SUMMARY.remainingCash - estimatedCost;
  const cashShortage = remainingAfter < 0;
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;
  // 카카오 미승인 템플릿 발송 차단
  const kakaoUnapproved = channel === '카카오' && selectedTemplate !== null && !selectedTemplate.approved;

  const stats = BULK_SEND_SUMMARY;

  // ─── 발송 흐름 ─────────────────────────────────────────────────────────────
  const openConfirm = () => {
    if (!message.trim()) { toast.error('메시지 내용을 입력하세요.'); return; }
    if (sendable <= 0) { toast.error('수신자가 없습니다. 발송 대상을 변경하세요.'); return; }
    if (kakaoUnapproved) { toast.error('카카오 알림톡은 사전 승인 템플릿만 발송할 수 있습니다.'); return; }
    if (cashShortage) { toast.error('플랫폼 잔여 캐시가 부족합니다. 충전 후 다시 시도하세요.'); return; }
    if (scheduleType === '예약' && !scheduleAt) { toast.error('예약 발송 일시를 선택하세요.'); return; }
    // 야간 광고 차단 (21~08시) — 예약 시각 기준 시연
    if (scheduleType === '예약') {
      const hour = new Date(scheduleAt).getHours();
      if (hour >= 21 || hour < 8) { toast.error('야간(21~08시) 광고 발송은 차단됩니다.'); return; }
    }
    setConfirmOpen(true);
  };

  const handleSend = () => {
    const newRow: BulkSendHistory = {
      id: Math.max(0, ...history.map((h) => h.id)) + 1,
      channel: effectiveChannel,
      title: message.slice(0, 14),
      target,
      sentAt: scheduleType === '예약' ? scheduleAt.replace('T', ' ') : '2026-05-29 16:10',
      recipients: targetSize,
      success: scheduleType === '즉시' ? sendable : 0,
      failed: 0,
      excluded,
      cost: scheduleType === '즉시' ? estimatedCost : 0,
      status: scheduleType === '즉시' ? '완료' : '예약',
    };
    setHistory((prev) => [newRow, ...prev]);
    setConfirmOpen(false);
    setMessage('');
    setSelectedTemplateId(null);
    setTab('이력');
    toast.success(scheduleType === '즉시' ? '발송이 완료되었습니다.' : '예약 발송이 등록되었습니다.');
  };

  const applyTemplate = (t: SmsTemplate) => {
    setChannel(t.channel);
    setMessage(t.content);
    setSelectedTemplateId(t.id);
    setTab('발송');
    toast.success('템플릿을 불러왔습니다.');
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTemplate || !draftTemplate.trim()) { toast.error('템플릿 내용을 입력하세요.'); return; }
    setTemplates((prev) => prev.map((t) => (t.id === editTemplate.id ? { ...t, content: draftTemplate.trim() } : t)));
    setEditTemplate(null);
    setDraftTemplate('');
    toast.success('저장되었습니다.');
  };

  const smsBytes = useMemo(() => [...message].reduce((s, ch) => s + (ch.charCodeAt(0) > 127 ? 2 : 1), 0), [message]);

  return (
    <AppLayout>
      <PageHeader
        title="SMS / 카카오 대량 발송"
        description="대규모 회원에게 SMS·카카오 알림톡을 통합 발송하고 채널 현황과 비용을 추적합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
              onClick={() => { setLoadState('loading'); setTimeout(() => { setHistory(MOCK_SEND_HISTORY); setLoadState('ready'); }, 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Send size={14} />} onClick={() => setTab('발송')}>
              새 발송
            </Button>
          </div>
        }
      />

      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>발송 정보를 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      {/* MKT-08-01 채널 현황 카드 4종 */}
      <StatCardGrid cols={4} className="mb-lg">
        <StatCard label="이번 달 SMS 발송" value={`${stats.smsCount.toLocaleString()}건`} icon={<MessageSquare />} />
        <StatCard label="카카오 알림톡" value={`${stats.kakaoCount.toLocaleString()}건`} icon={<Send />} variant="mint" />
        <StatCard label="이번 달 총 비용" value={`₩${stats.monthlyCost.toLocaleString()}`} icon={<Coins />} />
        <StatCard label="플랫폼 잔여 캐시" value={`₩${stats.remainingCash.toLocaleString()}`} icon={<Wallet />}
          variant={stats.remainingCash < 50000 ? 'peach' : undefined} />
      </StatCardGrid>

      {/* 플랫폼 연동 정보 패널 */}
      <div className="mb-lg rounded-2xl border border-line bg-surface-secondary/40 px-lg py-md text-[12px] text-content-secondary">
        발신 프로필: <span className="font-semibold text-content">{stats.senderProfile}</span> · 승인 템플릿{' '}
        <span className="font-semibold text-content">{stats.approvedTemplates}개</span> · 최근 동기화 {stats.lastSync}
      </div>

      {/* 탭 */}
      <div className="mb-md flex gap-sm">
        {(['발송', '이력', '템플릿'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn('rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors',
              tab === t ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
            {t === '발송' ? '새 발송' : t === '이력' ? '발송 이력' : '템플릿'}
          </button>
        ))}
      </div>

      {/* ── 새 발송 ── */}
      {tab === '발송' && (
        <div className="max-w-2xl space-y-md rounded-2xl border border-line bg-white p-lg">
          {/* 발송 채널 */}
          <div>
            <p className="mb-xs text-[12px] font-medium text-content-secondary">발송 채널</p>
            <div className="flex gap-sm">
              {(['SMS', '카카오'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setChannel(c)}
                  className={cn('flex-1 rounded-xl border py-2 text-[13px] font-semibold transition-colors',
                    channel === c ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
                  {c === 'SMS' ? 'SMS 계열 (SMS/LMS/MMS)' : '카카오 알림톡'}
                </button>
              ))}
            </div>
          </div>

          {/* 발송 대상 선택 (DLG-078-001) */}
          <div>
            <p className="mb-xs text-[12px] font-medium text-content-secondary">발송 대상</p>
            <div className="flex items-center gap-sm">
              <div className="flex-1 rounded-xl border border-line bg-surface-secondary/40 px-md py-2.5 text-[13px]">
                <span className="font-semibold text-content">{target}</span>
                <span className="ml-sm text-content-secondary">예상 수신 {sendable.toLocaleString()}명 (제외 {excluded.toLocaleString()}명)</span>
              </div>
              <Button type="button" variant="outline" size="md" icon={<Users size={14} />} onClick={() => setTargetOpen(true)}>대상 선택</Button>
            </div>
          </div>

          {/* 메시지 내용 */}
          <div>
            <p className="mb-xs text-[12px] font-medium text-content-secondary">메시지 내용</p>
            <Textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder={channel === '카카오' ? '승인 템플릿 또는 변수 메시지를 입력하세요' : '메시지를 입력하세요 (SMS 90byte 초과 시 LMS 자동 전환)'} />
            <div className="mt-1 flex items-center justify-between text-[11px] text-content-tertiary">
              <span>
                {channel === 'SMS' && (
                  <>분류: <span className={cn('font-semibold', effectiveChannel === 'LMS' && 'text-amber-600')}>{effectiveChannel}</span>
                    {effectiveChannel === 'LMS' && ' (90byte 초과 — LMS 자동 전환)'}</>
                )}
                {channel === '카카오' && selectedTemplate && !selectedTemplate.approved && (
                  <span className="text-state-error">미승인 템플릿 — 발송 차단</span>
                )}
              </span>
              <span className="tabular-nums">{smsBytes} byte</span>
            </div>
          </div>

          {/* 발송 시간 */}
          <div>
            <p className="mb-xs text-[12px] font-medium text-content-secondary">발송 시간</p>
            <div className="flex items-center gap-sm">
              {(['즉시', '예약'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setScheduleType(s)}
                  className={cn('rounded-xl border px-4 py-2 text-[13px] font-semibold transition-colors',
                    scheduleType === s ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
                  {s === '즉시' ? '즉시 발송' : '예약 발송'}
                </button>
              ))}
              {scheduleType === '예약' && (
                <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)}
                  className="app-control flex-1 rounded-xl border border-line/80 px-3 py-2 text-[13px] text-content focus:border-primary outline-none" />
              )}
            </div>
          </div>

          {/* 잔여 캐시 경고 */}
          {cashShortage && (
            <div className="flex items-center gap-xs rounded-xl border border-state-error/40 bg-red-50 px-md py-2 text-[12px] text-state-error">
              <AlertTriangle size={14} /> 플랫폼 잔여 캐시가 부족합니다. 충전 후 발송할 수 있습니다.
            </div>
          )}

          <Button type="button" variant="primary" fullWidth icon={<Send size={14} />} onClick={openConfirm} disabled={cashShortage || kakaoUnapproved}>
            발송 확인
          </Button>
        </div>
      )}

      {/* ── 발송 이력 ── */}
      {tab === '이력' && (
        loadState === 'loading' ? (
          <div className="space-y-sm">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-3xl border border-line bg-white">
            <EmptyState icon={Send} title="발송 이력이 없습니다"
              description="아직 발송 이력이 없습니다. '새 발송'에서 대상과 메시지를 설정해 첫 대량 발송을 시작하세요."
              action={{ label: '새 발송', onClick: () => setTab('발송') }} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/60 text-content-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">발송 일시</th>
                  <th className="px-4 py-3 text-left font-semibold">채널</th>
                  <th className="px-4 py-3 text-left font-semibold">제목 / 대상</th>
                  <th className="px-4 py-3 text-right font-semibold">수신자</th>
                  <th className="px-4 py-3 text-right font-semibold">처리(성공/실패/제외)</th>
                  <th className="px-4 py-3 text-right font-semibold">비용</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {history.map((h) => {
                  const badge = HISTORY_BADGE[h.status];
                  return (
                    <tr key={h.id} className="text-content hover:bg-surface-secondary/40">
                      <td className="px-4 py-3 tabular-nums text-content-secondary">{h.sentAt}</td>
                      <td className="px-4 py-3"><StatusBadge variant="info">{h.channel}</StatusBadge></td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{h.title}</p>
                        <p className="text-[11px] text-content-tertiary">{h.target}{h.failReason ? ` · ${h.failReason}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{h.recipients.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[12px] tabular-nums">
                        <span className="text-state-success">{h.success}</span> / <span className="text-state-error">{h.failed}</span> / <span className="text-content-tertiary">{h.excluded}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">₩{h.cost.toLocaleString()}</td>
                      <td className="px-4 py-3"><StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── 템플릿 ── */}
      {tab === '템플릿' && (
        <div className="space-y-md">
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-line bg-white p-lg">
              <div className="mb-sm flex items-center gap-sm">
                <StatusBadge variant="info">{t.channel}</StatusBadge>
                <span className="text-[14px] font-bold text-content">{t.name}</span>
                <StatusBadge variant={t.approved ? 'success' : 'warning'}>{t.approved ? '승인됨' : '승인 대기'}</StatusBadge>
              </div>
              <p className="rounded-xl bg-surface-secondary/60 p-3 text-[13px] text-content-secondary">{t.content}</p>
              <div className="mt-sm flex gap-sm">
                <Button type="button" variant="outline" size="sm" icon={<FileText size={13} />}
                  onClick={() => { setEditTemplate(t); setDraftTemplate(t.content); }}>편집</Button>
                <Button type="button" variant="ghost" size="sm" icon={<Send size={13} />} onClick={() => applyTemplate(t)}>이 템플릿으로 발송</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DLG-078-001 발송 대상 선택 */}
      <Modal isOpen={targetOpen} onClose={() => setTargetOpen(false)} title="발송 대상 선택" size="md"
        footer={
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="outline" onClick={() => setTargetOpen(false)}>취소</Button>
            <Button type="button" variant="primary" onClick={() => { setTargetOpen(false); toast.success('발송 대상을 적용했습니다.'); }} disabled={targetSize === 0}>적용</Button>
          </div>
        }>
        <div className="space-y-md">
          <Select label="대상 그룹" value={target} onChange={setTarget}
            options={SEND_TARGET_GROUPS.map((g) => ({ value: g.value, label: g.label }))} />
          <div className="rounded-xl border border-line bg-surface-secondary/40 px-md py-sm text-[13px]">
            <p className="text-content-secondary">예상 수신자 수</p>
            {targetSize === 0 ? (
              <p className="mt-xs font-bold text-state-error">조건에 맞는 회원이 없습니다.</p>
            ) : (
              <p className="mt-xs font-bold text-content tabular-nums">
                {sendable.toLocaleString()}명 <span className="text-[12px] font-normal text-content-tertiary">(수신거부·휴면 {excluded.toLocaleString()}명 자동 제외)</span>
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* DLG-078-002 발송 확인 */}
      <FormModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="발송 확인"
        size="md"
        submitLabel={scheduleType === '즉시' ? '발송 확인' : '예약 등록'}
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
      >
        <div className="space-y-sm text-[13px]">
          <Row label="선택 채널" value={effectiveChannel} />
          <Row label="발송 가능 수" value={`${sendable.toLocaleString()}명`} />
          <Row label="제외 예정" value={`${excluded.toLocaleString()}명 (수신거부·휴면)`} />
          <Row label="예상 비용" value={`₩${estimatedCost.toLocaleString()}`} accent />
          <Row label="발송 후 잔여 캐시" value={`₩${remainingAfter.toLocaleString()}`} />
          <Row label="발신 프로필" value={stats.senderProfile} />
          <Row label="발송 일시" value={scheduleType === '즉시' ? '즉시 발송' : scheduleAt.replace('T', ' ')} />
          <div className="rounded-xl border border-line bg-surface-secondary/40 p-3">
            <p className="mb-1 text-[11px] font-semibold text-content-tertiary">메시지 미리보기</p>
            <p className="text-content-secondary">{message || '-'}</p>
          </div>
        </div>
      </FormModal>

      {/* 템플릿 편집 모달 */}
      <FormModal
        isOpen={editTemplate !== null}
        onClose={() => { setEditTemplate(null); setDraftTemplate(''); }}
        title={editTemplate ? `${editTemplate.name} 템플릿 편집` : '템플릿 편집'}
        size="lg"
        submitLabel="저장"
        onSubmit={handleSaveTemplate}
      >
        <Textarea rows={6} value={draftTemplate} onChange={(e) => setDraftTemplate(e.target.value)} placeholder="템플릿 내용" />
      </FormModal>
    </AppLayout>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-md">
      <span className="text-content-secondary">{label}</span>
      <span className={cn('font-semibold tabular-nums', accent ? 'text-primary' : 'text-content')}>{value}</span>
    </div>
  );
}
