'use client';

import React, { useState, useEffect } from 'react';
import { Link2, Smartphone, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { formatKRW } from '@/lib/format';
import { cn } from '@/lib/utils';

// ─── DLG-S016 결제링크 발송 (PAY-06) ──────────────────────────────────────────
// docs4/V2/D03-매출관리/매출관리.md ## DLG-S016
// 결제 처리/미수금 화면에서 [결제링크 발송]을 눌렀을 때 뜨는 발송 전 확인/실행 팝업.
// 결제링크는 전액 결제 전용. 발송 채널: 회원앱 Push 기본 + KakaoTalk fallback. 만료: 발송 시점 +7일 고정.
// 저장 상태값 5종(발송됨/결제완료/만료/무효화/발송실패)은 재발송·무효화 버튼 노출 기준으로만 사용하고
// '발송됨'은 화면 문구로 노출하지 않는다(상태전이 규칙).

/** PAY-06 결제링크 내부 저장 상태값 (화면 문구로 직접 노출하지 않음) */
export type PaymentLinkStatus = '발송됨' | '결제완료' | '만료' | '무효화' | '발송실패';

export interface PaymentLinkTarget {
  /** 회원명 */
  memberName: string;
  /** 연락처 */
  phone?: string;
  /** 회원앱 연결 여부 */
  appLinked?: boolean;
  /** 상품명 */
  productName: string;
  /** 최종 결제 금액(전액) */
  amount: number;
  /** 회원 비활성/탈퇴 여부 → 발송 차단 */
  inactive?: boolean;
  /** 동일 결제 건에 활성('발송됨') 링크가 있는지 → 신규 발송 차단 */
  activeLinkStatus?: PaymentLinkStatus;
}

type Channel = 'app' | 'kakao';

interface PaymentLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PaymentLinkTarget | null;
  /** 발송 액션 권한 (Owner/manager/fc). false면 액션 차단 안내 */
  canSend?: boolean;
  /** 발송 완료 콜백 (호스트 화면 이력 갱신용) */
  onSent?: (channel: Channel) => void;
}

const CHANNELS: { key: Channel; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: 'app', label: '회원앱 Push', icon: <Smartphone size={15} />, hint: '기본 채널' },
  { key: 'kakao', label: 'KakaoTalk', icon: <MessageCircle size={15} />, hint: 'fallback' },
];

/** 발송 시점 +7일 만료 일시 계산 */
const computeExpiry = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day} 23:59`;
};

export default function PaymentLinkModal({
  isOpen,
  onClose,
  target,
  canSend = true,
  onSent,
}: PaymentLinkModalProps) {
  const [channel, setChannel] = useState<Channel>('app');
  const [memo, setMemo] = useState('');
  const [sending, setSending] = useState(false);

  // 열릴 때마다 입력값 초기화. 회원앱 미연결이면 카카오로 기본 선택
  useEffect(() => {
    if (isOpen) {
      setChannel(target?.appLinked === false ? 'kakao' : 'app');
      setMemo('');
      setSending(false);
    }
  }, [isOpen, target]);

  if (!target) return null;

  // 예외처리: 활성('발송됨') 링크가 있으면 신규 발송 차단
  const hasActiveLink = target.activeLinkStatus === '발송됨';
  // 예외처리: 0원 결제 / 회원 비활성·탈퇴 / 연락처 무효
  const zeroAmount = target.amount <= 0;
  const noPhone = !target.phone?.trim();
  const blocked = hasActiveLink || zeroAmount || target.inactive || noPhone || !canSend;

  const handleSend = async () => {
    if (!canSend) {
      toast.error('결제링크 발송 권한이 없습니다.');
      return;
    }
    if (hasActiveLink) {
      toast.error('이미 발송된 결제링크가 있습니다.');
      return;
    }
    if (zeroAmount) {
      toast.error('최종 결제 금액이 0원입니다.');
      return;
    }
    if (target.inactive) {
      toast.error('결제 가능한 회원이 아닙니다.');
      return;
    }
    if (noPhone) {
      toast.error('연락처를 확인해주세요.');
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 700)); // mock 발송
    setSending(false);
    onSent?.(channel);
    toast.success('처리되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="결제링크 발송"
      size="lg"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" icon={<Link2 size={14} />} loading={sending} disabled={blocked} onClick={handleSend}>
            발송
          </Button>
        </div>
      }
    >
      <div className="space-y-md">
        {/* 회원 정보 */}
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-content">{target.memberName}</span>
            <span className={cn('text-[11px] font-semibold', target.appLinked ? 'text-state-success' : 'text-content-tertiary')}>
              {target.appLinked ? '회원앱 연결됨' : '회원앱 미연결'}
            </span>
          </div>
          <p className="mt-[2px] text-[12px] text-content-secondary tabular-nums">{target.phone || '연락처 없음'}</p>
        </div>

        {/* 결제 요약 (전액 결제 전용) */}
        <div className="rounded-xl border border-line p-md">
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">결제 요약</p>
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-content">{target.productName}</span>
            <span className="text-[15px] font-bold text-primary tabular-nums">{formatKRW(target.amount)}</span>
          </div>
          <p className="mt-xs text-[11px] text-content-tertiary">결제링크는 전액 결제 전용입니다. 계약금/잔액 링크는 제공하지 않습니다.</p>
        </div>

        {/* 발송 채널 */}
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">발송 채널</p>
          <div className="grid grid-cols-2 gap-sm">
            {CHANNELS.map((ch) => (
              <button
                key={ch.key}
                type="button"
                onClick={() => setChannel(ch.key)}
                className={cn(
                  'flex items-center justify-between gap-sm rounded-xl border px-md py-sm text-left transition-colors',
                  channel === ch.key ? 'border-primary bg-primary/5' : 'border-line hover:bg-surface-secondary'
                )}
              >
                <span className="flex items-center gap-xs text-[13px] font-semibold text-content">
                  {ch.icon}
                  {ch.label}
                </span>
                <span className="text-[10px] font-semibold text-content-tertiary">{ch.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 만료일시 (발송 +7일 고정) */}
        <div className="flex items-center justify-between rounded-xl border border-line px-md py-sm">
          <span className="text-[12px] font-semibold text-content-secondary">링크 만료일시</span>
          <span className="text-[13px] font-semibold text-content tabular-nums">{computeExpiry()}</span>
        </div>

        {/* 내부 메모 */}
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">내부 메모</p>
          <Textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="상담 메모, 발송 사유, 특이사항"
            rows={3}
          />
        </div>

        {/* 예외 안내 */}
        {hasActiveLink && (
          <p className="text-[12px] text-state-error">이미 발송된 결제링크가 있습니다. 재발송 또는 결제링크 무효화 후 새 링크를 생성하세요.</p>
        )}
        {zeroAmount && <p className="text-[12px] text-state-error">최종 결제 금액이 0원입니다. 무료 등록 플로우를 이용하세요.</p>}
        {noPhone && !zeroAmount && <p className="text-[12px] text-state-error">연락처를 확인해주세요.</p>}
        {target.inactive && <p className="text-[12px] text-state-error">결제 가능한 회원이 아닙니다.</p>}
        {!canSend && <p className="text-[12px] text-state-error">결제링크 발송 권한이 없습니다. 매니저에게 요청하세요.</p>}
      </div>
    </Modal>
  );
}
