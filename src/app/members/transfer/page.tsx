'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';

import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/common/PageHeader";
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { formatNumber } from '@/lib/format';

import { getMember, type Member } from '@/api/endpoints/members';
import {
  checkTransferEligibility,
  transferMember,
  type TransferCheckResult,
  type MemberTransferRequest,
} from '@/api/endpoints/memberTransfer';
import { getBranches, type Branch } from '@/api/endpoints/auth';

// ────────────────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '이용중',
  INACTIVE: '미이용',
  EXPIRED: '만료',
  HOLDING: '홀딩',
  SUSPENDED: '정지',
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-600 bg-green-50',
  INACTIVE: 'text-gray-500 bg-gray-100',
  EXPIRED: 'text-red-500 bg-red-50',
  HOLDING: 'text-yellow-600 bg-yellow-50',
  SUSPENDED: 'text-red-600 bg-red-50',
};

const TRANSFER_TYPE_OPTIONS: { value: MemberTransferRequest['transferType']; label: string; description: string }[] = [
  { value: 'KEEP_TICKET', label: '잔여 이용권 유지 이관', description: '현재 이용권 그대로 새 지점에서 사용' },
  { value: 'REFUND_NEW', label: '환불 후 신규 계약', description: '현재 이용권 환불 처리 후 새 지점에서 신규 계약' },
  { value: 'EXHAUST_THEN', label: '소진 후 이관', description: '잔여 이용권 모두 소진 후 지점 이관' },
];

// ────────────────────────────────────────────────────────────
// 서브 컴포넌트: 체크리스트 항목
// ────────────────────────────────────────────────────────────

interface CheckItemProps {
  label: string;
  status: 'ok' | 'block' | 'warn' | 'info';
  detail?: string;
}

function CheckItem({ label, status, detail }: CheckItemProps) {
  const iconMap = {
    ok: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
    block: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
    warn: <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />,
    info: <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />,
  };
  const textMap = {
    ok: 'text-green-700',
    block: 'text-red-700',
    warn: 'text-yellow-700',
    info: 'text-blue-700',
  };

  return (
    <div className="flex items-start gap-2 py-2.5 border-b border-border last:border-0">
      {iconMap[status]}
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-content">{label}</span>
        {detail && (
          <p className={cn('text-xs mt-0.5', textMap[status])}>{detail}</p>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// 메인 페이지
// ────────────────────────────────────────────────────────────

function MemberTransfer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = Number(searchParams?.get('memberId'));

  // 데이터 상태
  const [member, setMember] = useState<Member | null>(null);
  const [checkResult, setCheckResult] = useState<TransferCheckResult | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);

  // 로딩/에러
  const [loadingMember, setLoadingMember] = useState(true);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 폼 상태
  const [toBranchId, setToBranchId] = useState<number | ''>('');
  const [transferType, setTransferType] = useState<MemberTransferRequest['transferType']>('KEEP_TICKET');
  const [reason, setReason] = useState('');

  // 확인 모달
  const [showConfirm, setShowConfirm] = useState(false);

  // ── 회원 정보 + 지점 목록 로드
  useEffect(() => {
    if (!memberId || isNaN(memberId)) {
      toast.error('잘못된 접근입니다. 회원 ID가 없습니다.');
      moveToPage(967);
      return;
    }

    const load = async () => {
      setLoadingMember(true);
      try {
        const [memberRes, branchRes] = await Promise.all([
          getMember(memberId),
          getBranches(),
        ]);

        if (!memberRes.success || !memberRes.data) {
          toast.error(memberRes.message ?? '회원 정보를 불러오지 못했습니다.');
          moveToPage(967);
          return;
        }

        setMember(memberRes.data);
        // 현재 지점 제외
        setBranches((branchRes.data ?? []).filter((b) => b.id !== memberRes.data.branchId));
      } catch {
        toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingMember(false);
      }
    };

    load();
  }, [memberId]);

  // ── 체크리스트 로드 (회원 로드 후)
  useEffect(() => {
    if (!member) return;

    const runCheck = async () => {
      setLoadingCheck(true);
      try {
        const res = await checkTransferEligibility(member.id);
        if (res.success) {
          setCheckResult(res.data);
        } else {
          toast.error(res.message ?? '이관 체크에 실패했습니다.');
        }
      } catch {
        toast.error('이관 체크 중 오류가 발생했습니다.');
      } finally {
        setLoadingCheck(false);
      }
    };

    runCheck();
  }, [member]);

  // ── 이관 실행
  const handleTransfer = async () => {
    if (!member || !toBranchId) return;
    setShowConfirm(false);
    setSubmitting(true);

    try {
      const req: MemberTransferRequest = {
        memberId: member.id,
        toBranchId: Number(toBranchId),
        transferType,
        reason: reason.trim() || undefined,
      };

      const res = await transferMember(req);
      if (res.success) {
        toast.success(`${member.name} 회원이 ${selectedBranchName}으로 이관되었습니다.`);
        moveToPage(967);
      } else {
        toast.error(res.message ?? '이관에 실패했습니다.');
      }
    } catch {
      toast.error('이관 처리 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBranchName = branches.find((b) => b.id === Number(toBranchId))?.name ?? '';
  const canSubmit =
    !!toBranchId &&
    !!checkResult?.canTransfer &&
    !submitting;

  // ── 로딩
  if (loadingMember) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-content-tertiary" />
          <span className="ml-2 text-content-secondary">회원 정보를 불러오는 중...</span>
        </div>
      </AppLayout>
    );
  }

  if (!member) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto pb-16">
        <PageHeader
          breadcrumb={
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-content-tertiary hover:text-content transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              뒤로가기
            </button>
          }
          title="회원 지점 이관"
          description="회원을 다른 지점으로 이관합니다."
          actions={
            <div className="flex items-center gap-1.5 text-sm text-content-secondary">
              <ArrowRightLeft className="w-4 h-4" />
              지점 이관
            </div>
          }
        />

        <div className="space-y-5">
          {/* ── 섹션 1: 대상 회원 정보 */}
          <section className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-content mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-content-secondary" />
              대상 회원 정보
            </h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <InfoRow icon={<User className="w-3.5 h-3.5" />} label="이름" value={member.name} />
              <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="연락처" value={member.phone ?? '-'} />
              <InfoRow
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="현재 지점"
                value={member.branchName ?? `지점 #${member.branchId}`}
              />
              <InfoRow
                icon={<User className="w-3.5 h-3.5" />}
                label="상태"
                value={
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      STATUS_COLOR[member.status] ?? 'text-gray-500 bg-gray-100'
                    )}
                  >
                    {STATUS_LABEL[member.status] ?? member.status}
                  </span>
                }
              />
              <InfoRow
                icon={<CreditCard className="w-3.5 h-3.5" />}
                label="이용권 종류"
                value={member.membershipType || '-'}
              />
              <InfoRow
                icon={<Calendar className="w-3.5 h-3.5" />}
                label="만료일"
                value={
                  member.membershipExpiry
                    ? new Date(member.membershipExpiry).toLocaleDateString('ko-KR')
                    : '-'
                }
              />
            </div>
          </section>

          {/* ── 섹션 2: 이관 전 체크리스트 */}
          <section className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-content mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-content-secondary" />
              이관 전 체크리스트
            </h2>

            {loadingCheck ? (
              <div className="flex items-center gap-2 py-4 text-content-secondary text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                체크리스트를 확인하는 중...
              </div>
            ) : checkResult ? (
              <>
                <div className="divide-y divide-border rounded-lg border border-border px-3 mb-4">
                  {/* 미납금 */}
                  <CheckItem
                    label="미납금"
                    status={checkResult.hasUnpaidAmount ? 'block' : 'ok'}
                    detail={
                      checkResult.hasUnpaidAmount
                        ? `${formatNumber(checkResult.unpaidAmount)}원 정산 필요`
                        : '0원'
                    }
                  />
                  {/* 락커 */}
                  <CheckItem
                    label="락커"
                    status={checkResult.hasLocker ? 'block' : 'ok'}
                    detail={checkResult.hasLocker ? '락커 반납 필요' : '없음'}
                  />
                  {/* 홀딩 */}
                  <CheckItem
                    label="홀딩 상태"
                    status={checkResult.hasActiveHolding ? 'warn' : 'ok'}
                    detail={
                      checkResult.hasActiveHolding
                        ? '홀딩 중 — 종료 후 이관 권장'
                        : '없음'
                    }
                  />
                  {/* PT 잔여 */}
                  <CheckItem
                    label="PT 잔여"
                    status={checkResult.hasActivePt ? 'warn' : 'ok'}
                    detail={
                      checkResult.hasActivePt
                        ? `잔여 ${checkResult.ptRemainingSessions}회 — 이관 유형 확인 필요`
                        : '없음'
                    }
                  />
                  {/* 쿠폰 */}
                  <CheckItem
                    label="보유 쿠폰"
                    status="info"
                    detail={
                      checkResult.activeCoupons > 0
                        ? `${checkResult.activeCoupons}장 보유 — 지점 한정 쿠폰은 이관 시 소멸될 수 있습니다.`
                        : '없음'
                    }
                  />
                  {/* 마일리지 */}
                  <CheckItem
                    label="마일리지"
                    status="ok"
                    detail={`${formatNumber(checkResult.mileageBalance)}P — 테넌트 통합이므로 유지됩니다.`}
                  />
                </div>

                {/* 상태 배너 */}
                {checkResult.blockers.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">이관 불가</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        {checkResult.blockers.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {checkResult.blockers.length === 0 && checkResult.warnings.length > 0 && (
                  <div className="flex items-start gap-2 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">주의사항 확인 후 진행 가능</p>
                      <ul className="mt-1 list-disc list-inside space-y-0.5">
                        {checkResult.warnings.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {checkResult.canTransfer && checkResult.warnings.length === 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>모든 항목 통과 — 이관 가능합니다.</span>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-content-secondary py-2">체크리스트를 불러올 수 없습니다.</p>
            )}
          </section>

          {/* ── 섹션 3: 이관 설정 */}
          <section className="bg-surface rounded-xl border border-border p-5">
            <h2 className="text-sm font-semibold text-content mb-4 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-content-secondary" />
              이관 설정
            </h2>

            <div className="space-y-5">
              {/* 이관할 지점 선택 */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  이관할 지점 <span className="text-red-500">*</span>
                </label>
                <Select
                  options={[...branches.map((b) => ({ value: String(b.id), label: b.name }))]}
                  value={toBranchId === '' ? '' : String(toBranchId)}
                  onChange={(v) => setToBranchId(v === '' ? '' : Number(v))}
                  placeholder="지점을 선택하세요"
                  disabled={!checkResult?.canTransfer}
                />
                {branches.length === 0 && (
                  <p className="text-xs text-content-tertiary mt-1">이관 가능한 다른 지점이 없습니다.</p>
                )}
              </div>

              {/* 이관 유형 */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-2">
                  이관 유형 <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {TRANSFER_TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                        transferType === opt.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-surface-secondary hover:border-primary/40',
                        !checkResult?.canTransfer && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <input
                        type="radio"
                        name="transferType"
                        value={opt.value}
                        checked={transferType === opt.value}
                        onChange={() => setTransferType(opt.value)}
                        disabled={!checkResult?.canTransfer}
                        className="mt-0.5 accent-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-content">{opt.label}</p>
                        <p className="text-xs text-content-secondary mt-0.5">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* 이관 사유 */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1.5">
                  이관 사유 <span className="text-content-tertiary">(선택)</span>
                </label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="이관 사유를 입력하세요..."
                  rows={3}
                  disabled={!checkResult?.canTransfer}
                />
              </div>
            </div>
          </section>

          {/* ── 섹션 4: 실행 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => router.back()}
              className={cn(
                'h-10 px-5 rounded-lg border border-border text-sm font-medium text-content',
                'hover:bg-surface-secondary transition-colors'
              )}
            >
              취소
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              className={cn(
                'h-10 px-6 rounded-lg text-sm font-medium text-white transition-colors',
                'flex items-center gap-2',
                canSubmit
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-gray-300 cursor-not-allowed'
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  이관 처리 중...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  이관 실행
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── 확인 모달 */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm bg-surface rounded-2xl border border-border shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-content">이관 확인</h3>
                <p className="text-xs text-content-secondary">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>

            <p className="text-sm text-content mb-5 leading-relaxed">
              <span className="font-semibold">{member.name}</span> 회원을(를){' '}
              <span className="font-semibold text-primary">{selectedBranchName}</span>
              으로 이관하시겠습니까?
            </p>

            <div className="bg-surface-secondary rounded-lg px-4 py-3 mb-5 text-xs space-y-1 text-content-secondary">
              <div className="flex justify-between">
                <span>이관 유형</span>
                <span className="font-medium text-content">
                  {TRANSFER_TYPE_OPTIONS.find((o) => o.value === transferType)?.label}
                </span>
              </div>
              {reason && (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0">사유</span>
                  <span className="text-content text-right truncate">{reason}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className={cn(
                  'flex-1 h-10 rounded-lg border border-border text-sm font-medium text-content',
                  'hover:bg-surface-secondary transition-colors'
                )}
              >
                취소
              </button>
              <button
                onClick={handleTransfer}
                className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                이관 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ────────────────────────────────────────────────────────────
// 내부 서브 컴포넌트: 정보 행
// ────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-content-tertiary shrink-0">{icon}</span>
      <span className="text-xs text-content-secondary shrink-0 w-20">{label}</span>
      <span className="text-sm text-content truncate">{value}</span>
    </div>
  );
}

export default function MemberTransferPage() {
  return (
    <React.Suspense>
      <MemberTransfer />
    </React.Suspense>
  );
}
