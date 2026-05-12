'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BellRing, Camera, Clock, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getBranchScope } from '@/lib/branchScope';

const DUPLICATE_WINDOW_MS = 2 * 60 * 60 * 1000;
const DEFAULT_EXPIRATION_WARNING_DAYS = 7;

type CardSeverity = 'normal' | 'warning' | 'danger';
type AttendanceChannel = '키오스크 QR' | '앱 QR' | 'RFID/밴드' | '얼굴인식' | '수동 출석' | '기타';

interface AttendanceRow {
  id: number;
  memberId: number | null;
  memberName: string | null;
  checkInAt: string | null;
  type: string | null;
  checkInMethod: string | null;
  branchId: number | null;
}

interface MemberRow {
  id: number;
  name: string | null;
  gender: string | null;
  birthDate: string | null;
  profileImage: string | null;
  membershipType: string | null;
  membershipExpiry: string | null;
  status: string | null;
}

interface AttendanceVerificationCardData {
  eventId: string;
  attendanceId: number;
  memberId: number;
  name: string;
  checkInAt: string;
  channel: AttendanceChannel;
  attendanceType: string;
  profileImage: string | null;
  genderLabel: string;
  ageLabel: string;
  membershipType: string;
  membershipExpiry: string | null;
  dDay: number | null;
  status: string;
  hasUnpaid: boolean;
  severity: CardSeverity;
  tags: Array<{ label: string; tone: CardSeverity }>;
}

function getBranchId(): number {
  return getBranchScope().branchId;
}

function readExpirationWarningDays(branchId: number): number {
  if (typeof window === 'undefined') return DEFAULT_EXPIRATION_WARNING_DAYS;

  try {
    const raw = localStorage.getItem(`settings_${branchId}_kiosk_settings`);
    const parsed = raw ? JSON.parse(raw) : null;
    const value = Number(parsed?.expirationWarningDays);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_EXPIRATION_WARNING_DAYS;
  } catch {
    return DEFAULT_EXPIRATION_WARNING_DAYS;
  }
}

function startOfTodayIso(): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function parseLocalDate(dateValue: string): Date | null {
  const [year, month, day] = dateValue.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function getDDay(dateValue: string | null): number | null {
  if (!dateValue) return null;
  const expiry = parseLocalDate(dateValue);
  if (!expiry) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function getAgeLabel(birthDate: string | null): string {
  if (!birthDate) return '나이 미등록';
  const birth = parseLocalDate(birthDate);
  if (!birth) return '나이 미등록';
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const birthdayPassed =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!birthdayPassed) age -= 1;
  return `${age}세`;
}

function getGenderLabel(gender: string | null): string {
  if (gender === 'M') return '남';
  if (gender === 'F') return '여';
  return '성별 미등록';
}

function getChannel(method: string | null): AttendanceChannel {
  const value = (method ?? '').toUpperCase();
  if (value === 'KIOSK' || value === 'KIOSK_QR' || value === 'QR') return '키오스크 QR';
  if (value === 'APP' || value === 'APP_QR') return '앱 QR';
  if (value === 'RFID' || value === 'BAND') return 'RFID/밴드';
  if (value === 'FACE' || value === 'FACE_RECOGNITION') return '얼굴인식';
  if (value === 'MANUAL') return '수동 출석';
  return '기타';
}

function getAttendanceType(type: string | null): string {
  const value = (type ?? '').toUpperCase();
  if (value === 'PT') return 'PT';
  if (value === 'GX') return 'GX';
  if (value === 'MANUAL') return '수동';
  return '일반';
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return '-';
  return dateValue.slice(0, 10).replace(/-/g, '.');
}

function statusLabel(status: string): string {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE') return '활성';
  if (normalized === 'EXPIRED') return '만료';
  if (normalized === 'HOLDING') return '홀딩';
  if (normalized === 'SUSPENDED') return '정지';
  if (normalized === 'INACTIVE') return '비활성';
  return status || '-';
}

function buildCard(
  attendance: AttendanceRow,
  member: MemberRow | undefined,
  hasUnpaid: boolean,
  expirationWarningDays: number
): AttendanceVerificationCardData {
  const memberId = attendance.memberId ?? member?.id ?? 0;
  const checkInAt = attendance.checkInAt ?? new Date().toISOString();
  const name = member?.name ?? attendance.memberName ?? '회원';
  const dDay = getDDay(member?.membershipExpiry ?? null);
  const status = member?.status ?? 'ACTIVE';
  const tags: AttendanceVerificationCardData['tags'] = [];

  if (!member?.profileImage) tags.push({ label: '사진 필요', tone: 'warning' });
  if (hasUnpaid) tags.push({ label: '미수 확인', tone: 'warning' });

  if (status === 'EXPIRED' || (dDay !== null && dDay < 0)) {
    tags.push({ label: '이용권 만료', tone: 'danger' });
  } else if (status !== 'ACTIVE') {
    tags.push({ label: statusLabel(status), tone: 'warning' });
  } else if (dDay !== null && dDay <= expirationWarningDays) {
    tags.push({ label: dDay === 0 ? 'D-Day 만료' : `D-${dDay} 만료`, tone: dDay <= 3 ? 'danger' : 'warning' });
  }

  const severity: CardSeverity = tags.some((tag) => tag.tone === 'danger')
    ? 'danger'
    : tags.some((tag) => tag.tone === 'warning')
      ? 'warning'
      : 'normal';

  return {
    eventId: `${attendance.id}-${memberId}-${checkInAt}`,
    attendanceId: attendance.id,
    memberId,
    name,
    checkInAt,
    channel: getChannel(attendance.checkInMethod),
    attendanceType: getAttendanceType(attendance.type),
    profileImage: member?.profileImage ?? null,
    genderLabel: getGenderLabel(member?.gender ?? null),
    ageLabel: getAgeLabel(member?.birthDate ?? null),
    membershipType: member?.membershipType ?? '-',
    membershipExpiry: member?.membershipExpiry ?? null,
    dDay,
    status,
    hasUnpaid,
    severity,
    tags,
  };
}

function isDuplicateWithinWindow(cards: AttendanceVerificationCardData[], card: AttendanceVerificationCardData): boolean {
  if (!card.memberId) return false;
  const current = new Date(card.checkInAt).getTime();
  return cards.some((existing) => {
    if (existing.memberId !== card.memberId) return false;
    const previous = new Date(existing.checkInAt).getTime();
    return Math.abs(current - previous) < DUPLICATE_WINDOW_MS;
  });
}

function playCheckInSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.2);
    setTimeout(() => void context.close(), 300);
  } catch {
    // Browser autoplay policy can block sound; toast still carries the alert.
  }
}

async function fetchMembers(memberIds: number[]): Promise<Map<number, MemberRow>> {
  if (memberIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('members')
    .select('id, name, gender, birthDate, profileImage, membershipType, membershipExpiry, status')
    .in('id', memberIds);
  if (error) throw error;
  return new Map((data ?? []).map((member) => [Number(member.id), member as MemberRow]));
}

async function fetchUnpaidMemberIds(memberIds: number[], branchId: number): Promise<Set<number>> {
  if (memberIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('sales')
    .select('memberId')
    .eq('branchId', branchId)
    .gt('unpaid', 0)
    .in('memberId', memberIds);

  if (error) return new Set();
  return new Set((data ?? []).map((sale) => Number(sale.memberId)).filter(Boolean));
}

export default function AttendanceVerificationBoard({
  className,
  maxCards = 10,
  compact = false,
}: {
  className?: string;
  maxCards?: number;
  compact?: boolean;
}) {
  const branchId = useMemo(() => getBranchId(), []);
  const expirationWarningDays = useMemo(() => readExpirationWarningDays(branchId), [branchId]);
  const [cards, setCards] = useState<AttendanceVerificationCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const cardsRef = useRef<AttendanceVerificationCardData[]>([]);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  const highlight = useCallback((eventId: string) => {
    setHighlightedIds((prev) => [...prev.filter((id) => id !== eventId), eventId]);
    window.setTimeout(() => {
      setHighlightedIds((prev) => prev.filter((id) => id !== eventId));
    }, 4500);
  }, []);

  const showRealtimeAlert = useCallback((card: AttendanceVerificationCardData) => {
    playCheckInSound();
    if (!card.profileImage) {
      toast.warning(`${card.name}님 사진 미등록: 현장에서 회원 사진을 촬영해 주세요.`, { duration: 7000 });
      return;
    }
    if (card.severity === 'danger') {
      toast.error(`${card.name}님 출석 확인 필요: ${card.tags.map((tag) => tag.label).join(', ')}`, { duration: 7000 });
      return;
    }
    if (card.severity === 'warning') {
      toast.warning(`${card.name}님 출석 확인: ${card.tags.map((tag) => tag.label).join(', ')}`, { duration: 6000 });
      return;
    }
    toast.info(`${card.name}님이 ${card.channel}로 출석했습니다.`, { duration: 5000 });
  }, []);

  const loadInitialCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, memberId, memberName, checkInAt, type, checkInMethod, branchId')
        .eq('branchId', branchId)
        .gte('checkInAt', startOfTodayIso())
        .order('checkInAt', { ascending: false })
        .limit(80);

      if (error) throw error;

      const rows = (data ?? []) as AttendanceRow[];
      const memberIds = Array.from(new Set(rows.map((row) => Number(row.memberId)).filter(Boolean)));
      const [memberMap, unpaidIds] = await Promise.all([
        fetchMembers(memberIds),
        fetchUnpaidMemberIds(memberIds, branchId),
      ]);

      const deduped = rows
        .slice()
        .sort((a, b) => new Date(a.checkInAt ?? 0).getTime() - new Date(b.checkInAt ?? 0).getTime())
        .reduce<AttendanceVerificationCardData[]>((acc, row) => {
          const memberId = Number(row.memberId);
          const card = buildCard(row, memberMap.get(memberId), unpaidIds.has(memberId), expirationWarningDays);
          if (isDuplicateWithinWindow(acc, card)) return acc;
          return [...acc, card].slice(-maxCards);
        }, [])
        .reverse();

      setCards(deduped);
    } catch (error) {
      console.error('[AttendanceVerificationBoard] 출석 확인 카드 로드 실패:', error);
      toast.error('출석 확인 카드 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [branchId, expirationWarningDays, maxCards]);

  useEffect(() => {
    void loadInitialCards();
  }, [loadInitialCards]);

  useEffect(() => {
    const channel = supabase
      .channel(`attendance-verification-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `branchId=eq.${branchId}`,
        },
        (payload) => {
          const row = payload.new as AttendanceRow;
          void (async () => {
            const memberId = Number(row.memberId);
            const [memberMap, unpaidIds] = await Promise.all([
              fetchMembers(memberId ? [memberId] : []),
              fetchUnpaidMemberIds(memberId ? [memberId] : [], branchId),
            ]);
            const card = buildCard(row, memberMap.get(memberId), unpaidIds.has(memberId), expirationWarningDays);
            if (isDuplicateWithinWindow(cardsRef.current, card)) return;

            setCards((prev) => [card, ...prev].slice(0, maxCards));
            highlight(card.eventId);
            showRealtimeAlert(card);
          })();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId, expirationWarningDays, highlight, maxCards, showRealtimeAlert]);

  return (
    <section className={cn('rounded-xl border border-line bg-surface p-lg shadow-sm', className)}>
      <div className="mb-md flex flex-wrap items-start justify-between gap-md">
        <div>
          <div className="flex items-center gap-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-state-success/10 text-state-success">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold text-content">실시간 출석 확인</h2>
              <p className="mt-[2px] text-[12px] text-content-secondary">
                FC가 회원 사진과 기본 정보를 보고 동일인 여부를 즉시 확인합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sm rounded-lg border border-line bg-surface-secondary px-sm py-xs text-[11px] text-content-secondary">
          <BellRing size={13} className="text-primary" />
          <span>최대 {maxCards}명 · {expirationWarningDays}일 이내 만료 표시 · 2시간 중복 숨김</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {Array.from({ length: compact ? 5 : maxCards }).map((_, index) => (
            <div key={index} className="h-[172px] animate-pulse rounded-xl border border-line bg-surface-secondary" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-dashed border-line bg-surface-secondary text-[13px] text-content-secondary">
          오늘 출석한 회원이 아직 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {cards.map((card) => {
            const isHighlighted = highlightedIds.includes(card.eventId);
            return (
              <button
                key={card.eventId}
                type="button"
                onClick={() => {
                  if (card.memberId) window.location.assign(`/members/detail?id=${card.memberId}&tab=info`);
                }}
                className={cn(
                  'min-h-[172px] rounded-xl border bg-white p-sm text-left transition-all hover:-translate-y-[1px] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30',
                  card.severity === 'danger' && 'border-state-error/40 bg-state-error/5',
                  card.severity === 'warning' && 'border-amber-300 bg-amber-50/60',
                  card.severity === 'normal' && 'border-line',
                  isHighlighted && 'ring-2 ring-primary/40 shadow-md'
                )}
              >
                <div className="flex items-start gap-sm">
                  <Avatar src={card.profileImage ?? undefined} name={card.name} size="xl" className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-xs">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-content">{card.name}</p>
                        <p className="mt-[2px] text-[11px] text-content-tertiary">회원 #{card.memberId || '-'}</p>
                      </div>
                      {card.severity === 'danger' ? (
                        <AlertTriangle size={16} className="shrink-0 text-state-error" />
                      ) : card.severity === 'warning' ? (
                        <AlertTriangle size={16} className="shrink-0 text-amber-500" />
                      ) : (
                        <UserCheck size={16} className="shrink-0 text-state-success" />
                      )}
                    </div>
                    <div className="mt-xs flex flex-wrap gap-[4px]">
                      {card.tags.length > 0 ? (
                        card.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag.label}
                            className={cn(
                              'inline-flex rounded-full px-[7px] py-[2px] text-[10px] font-semibold',
                              tag.tone === 'danger' && 'bg-state-error/10 text-state-error',
                              tag.tone === 'warning' && 'bg-amber-100 text-amber-700',
                              tag.tone === 'normal' && 'bg-state-success/10 text-state-success'
                            )}
                          >
                            {tag.label}
                          </span>
                        ))
                      ) : (
                        <span className="inline-flex rounded-full bg-state-success/10 px-[7px] py-[2px] text-[10px] font-semibold text-state-success">
                          정상 출석
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-sm grid grid-cols-2 gap-xs text-[11px]">
                  <div className="rounded-lg bg-surface-secondary px-sm py-xs">
                    <p className="text-content-tertiary">기본정보</p>
                    <p className="mt-[1px] truncate font-semibold text-content">{card.genderLabel} · {card.ageLabel}</p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary px-sm py-xs">
                    <p className="text-content-tertiary">출석</p>
                    <p className="mt-[1px] flex items-center gap-[3px] font-semibold text-content">
                      <Clock size={11} /> {formatTime(card.checkInAt)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary px-sm py-xs">
                    <p className="text-content-tertiary">채널</p>
                    <p className="mt-[1px] truncate font-semibold text-content">{card.channel}</p>
                  </div>
                  <div className="rounded-lg bg-surface-secondary px-sm py-xs">
                    <p className="text-content-tertiary">이용권</p>
                    <p className="mt-[1px] truncate font-semibold text-content">{card.membershipType}</p>
                  </div>
                </div>

                <div className="mt-xs flex items-center justify-between gap-sm rounded-lg border border-line/70 px-sm py-xs">
                  <span className="truncate text-[11px] text-content-secondary">만료 {formatDate(card.membershipExpiry)}</span>
                  <span className={cn(
                    'shrink-0 text-[11px] font-bold tabular-nums',
                    card.dDay !== null && card.dDay < 0 && 'text-state-error',
                    card.dDay !== null && card.dDay >= 0 && card.dDay <= expirationWarningDays && 'text-amber-600',
                    (card.dDay === null || card.dDay > expirationWarningDays) && 'text-content-secondary'
                  )}>
                    {card.dDay === null ? '-' : card.dDay < 0 ? `D+${Math.abs(card.dDay)}` : card.dDay === 0 ? 'D-Day' : `D-${card.dDay}`}
                  </span>
                </div>

                {!card.profileImage && (
                  <div className="mt-xs flex items-center gap-xs text-[11px] font-semibold text-amber-700">
                    <Camera size={12} />
                    <span>첫 출석 확인 시 사진 촬영 필요</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
