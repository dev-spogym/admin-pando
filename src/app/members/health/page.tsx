'use client';
export const dynamic = 'force-dynamic';

// SCR-I007 회원 건강 연동 요약 (docs4 V1/V2 D11-통합운영)
// 회원별 체성분·운동 이력·Health Connect(걸음/거리/활동kcal/운동세션) 연동 상태를 통합 요약.
// admin은 조회 전용(연결/해제/권한 변경 불가). 심박수/수면/의료 데이터는 v1 미수집.

import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge, { type BadgeVariant } from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import {
  Activity, Footprints, Flame, Dumbbell, CalendarCheck, Shirt, Package,
  Scale, Info, MessageSquare, Search, ChevronRight,
} from 'lucide-react';
import { getCurrentBranchId } from '@/lib/branchSettings';
import { supabase } from '@/lib/supabase';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type HcStatus = '연결됨' | '부분권한' | '동기화지연' | '미연결' | '미지원';

interface InbodyRecord {
  date: string;
  weight: number;   // kg
  muscle: number;   // 골격근량 kg
  fatRate: number;  // 체지방률 %
}

interface LessonRecord {
  date: string;
  name: string;
  trainer: string;
}

interface MemberHealth {
  id: string;
  memberId: number;
  name: string;
  age: number;
  lastCheckIn: string;        // 최근 출석
  clothingLocker: string | null; // 오늘 옷 락커
  fixedLocker: string | null;    // 고정 락커
  hcStatus: HcStatus;
  hcSource: string;           // 소스 앱
  hcLastSync: string;         // 최근 동기화
  weeklySteps: number;        // 최근 7일 걸음 합계
  weeklyKcal: number;         // 최근 7일 활동 kcal
  weeklyWorkoutDays: number;  // 운동 일수
  weeklyDistance: number;     // 최근 7일 이동거리 km
  inbody: InbodyRecord[];
  lessons: LessonRecord[];
  goalRate: number;           // 월간 목표 달성률 %
}

const HC_VARIANT: Record<HcStatus, BadgeVariant> = {
  연결됨: 'success',
  부분권한: 'warning',
  동기화지연: 'warning',
  미연결: 'default',
  미지원: 'secondary',
};

const HC_GUIDE: Record<HcStatus, string> = {
  연결됨: '회원앱(MA-159)에서 정상 연동되어 있습니다.',
  부분권한: '일부 권한만 허용되어 누락 지표가 있습니다. 회원앱(MA-159)에서 권한 수정을 안내하세요.',
  동기화지연: '72시간 이상 데이터 미수신 상태입니다. 회원앱 연동 상태를 확인하세요.',
  미연결: 'Health Connect 미연동 상태입니다. admin에서는 연결할 수 없으며 회원앱(MA-159) 연동을 안내합니다.',
  미지원: 'iOS 또는 미지원 단말로 Health Connect 연동이 불가합니다.',
};

type DbRow = Record<string, any>;

function displayMemberNo(id: number) {
  return `M-${String(id).padStart(5, '0')}`;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toISOString().slice(0, 10);
}

function calculateAge(value: string | null | undefined) {
  if (!value) return 0;
  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return Math.max(age, 0);
}

function formatRelativeCheckIn(value: string | null | undefined) {
  if (!value) return '출석 이력 없음';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '출석 이력 없음';
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const target = date.toISOString().slice(0, 10);
  const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (target === today) return `오늘 ${hhmm}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (target === yesterday.toISOString().slice(0, 10)) return `어제 ${hhmm}`;
  return target;
}

function mapInbody(rows: DbRow[]): InbodyRecord[] {
  return rows.slice(0, 5).map((row) => ({
    date: formatDate(row.date ?? row.createdAt),
    weight: toNumber(row.weight),
    muscle: toNumber(row.muscle),
    fatRate: toNumber(row.fatRate ?? row.fat),
  }));
}

function mapLessonRows(bookings: DbRow[], classMap: Map<number, DbRow>): LessonRecord[] {
  return bookings.slice(0, 5).map((booking) => {
    const klass = classMap.get(Number(booking.scheduleId));
    return {
      date: formatDate(booking.completedAt ?? booking.attendedAt ?? klass?.startTime ?? booking.createdAt),
      name: klass?.title ?? '수업 이력',
      trainer: klass?.staffName ?? booking.processedBy ?? '-',
    };
  });
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function HealthSummaryPage() {
  const [members, setMembers] = useState<MemberHealth[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      setIsLoading(true);
      const branchId = getCurrentBranchId();
      try {
        const { data: memberRows, error: memberError } = await supabase
          .from('members')
          .select('id, name, birthDate, registeredAt, membershipType, membershipExpiry, status, branchId')
          .eq('branchId', branchId)
          .is('deletedAt', null)
          .order('name', { ascending: true });

        if (memberError) throw memberError;

        const ids = (memberRows ?? []).map((member) => Number(member.id)).filter(Number.isFinite);
        if (ids.length === 0) {
          if (!cancelled) {
            setMembers([]);
            setSelectedId('');
          }
          return;
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
          attendanceResult,
          lockerResult,
          bodyResult,
          bookingResult,
        ] = await Promise.all([
          supabase
            .from('attendance')
            .select('memberId, checkInAt')
            .eq('branchId', branchId)
            .in('memberId', ids)
            .order('checkInAt', { ascending: false }),
          supabase
            .from('lockers')
            .select('memberId, number, zone, status')
            .eq('branchId', branchId)
            .in('memberId', ids),
          supabase
            .from('body_compositions')
            .select('memberId, date, weight, muscle, fat, fatRate, createdAt')
            .in('memberId', ids)
            .order('date', { ascending: false }),
          supabase
            .from('lesson_bookings')
            .select('memberId, scheduleId, status, attendedAt, completedAt, createdAt, processedBy')
            .eq('branchId', branchId)
            .in('memberId', ids)
            .order('createdAt', { ascending: false }),
        ]);

        if (attendanceResult.error) throw attendanceResult.error;
        if (lockerResult.error) throw lockerResult.error;
        if (bodyResult.error) throw bodyResult.error;
        if (bookingResult.error) throw bookingResult.error;

        const scheduleIds = Array.from(new Set((bookingResult.data ?? []).map((row) => Number(row.scheduleId)).filter(Number.isFinite)));
        const classMap = new Map<number, DbRow>();
        if (scheduleIds.length > 0) {
          const { data: classRows, error: classError } = await supabase
            .from('classes')
            .select('id, title, staffName, startTime')
            .eq('branchId', branchId)
            .in('id', scheduleIds);
          if (classError) throw classError;
          (classRows ?? []).forEach((row) => classMap.set(Number(row.id), row));
        }

        const attendanceByMember = new Map<number, DbRow[]>();
        (attendanceResult.data ?? []).forEach((row) => {
          const memberId = Number(row.memberId);
          const list = attendanceByMember.get(memberId) ?? [];
          list.push(row);
          attendanceByMember.set(memberId, list);
        });

        const lockerByMember = new Map<number, DbRow>();
        (lockerResult.data ?? []).forEach((row) => {
          if (row.memberId != null && row.status !== 'AVAILABLE') lockerByMember.set(Number(row.memberId), row);
        });

        const bodiesByMember = new Map<number, DbRow[]>();
        (bodyResult.data ?? []).forEach((row) => {
          const memberId = Number(row.memberId);
          const list = bodiesByMember.get(memberId) ?? [];
          list.push(row);
          bodiesByMember.set(memberId, list);
        });

        const bookingsByMember = new Map<number, DbRow[]>();
        (bookingResult.data ?? []).forEach((row) => {
          const memberId = Number(row.memberId);
          const list = bookingsByMember.get(memberId) ?? [];
          list.push(row);
          bookingsByMember.set(memberId, list);
        });

        const mapped: MemberHealth[] = (memberRows ?? []).map((member) => {
          const memberId = Number(member.id);
          const attendances = attendanceByMember.get(memberId) ?? [];
          const locker = lockerByMember.get(memberId);
          const monthlyVisits = attendances.filter((row) => {
            const checkIn = new Date(row.checkInAt);
            return !Number.isNaN(checkIn.getTime()) && checkIn >= thirtyDaysAgo;
          }).length;
          const lockerLabel = locker ? `${locker.zone ? `${locker.zone}-` : ''}${locker.number}` : null;

          return {
            id: displayMemberNo(memberId),
            memberId,
            name: member.name ?? `회원 ${memberId}`,
            age: calculateAge(member.birthDate),
            lastCheckIn: formatRelativeCheckIn(attendances[0]?.checkInAt),
            clothingLocker: null,
            fixedLocker: lockerLabel,
            hcStatus: '미연결',
            hcSource: '-',
            hcLastSync: '-',
            weeklySteps: 0,
            weeklyKcal: 0,
            weeklyWorkoutDays: 0,
            weeklyDistance: 0,
            inbody: mapInbody(bodiesByMember.get(memberId) ?? []),
            lessons: mapLessonRows(bookingsByMember.get(memberId) ?? [], classMap),
            goalRate: Math.min(100, Math.round((monthlyVisits / 12) * 100)),
          };
        });

        if (!cancelled) {
          setMembers(mapped);
          setSelectedId((prev) => (mapped.some((member) => member.id === prev) ? prev : mapped[0]?.id ?? ''));
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setMembers([]);
          setSelectedId('');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => members.filter((m) => !search.trim() || m.name.includes(search.trim()) || m.id.includes(search.trim())),
    [members, search],
  );

  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <AppLayout>
      <PageHeader
        title="회원 건강 연동 요약"
        description="회원별 체성분·운동 이력과 Health Connect 연동 상태를 통합 조회합니다."
      />

      {/* admin 조회 전용 안내 */}
      <div className="mb-lg flex items-start gap-xs rounded-xl border border-blue-200 bg-blue-50 px-md py-sm text-[12px] text-blue-700">
        <Info className="mt-[1px] h-4 w-4 shrink-0" />
        <span>
          Health Connect는 회원앱(MA-159)에서 회원이 직접 연결·해제·권한 변경하는 Android 선택 연동이며,
          admin에서는 조회만 가능합니다. v1 수집 범위는 걸음수·이동 거리·활동 kcal·운동 세션이며 심박수·수면·의료 데이터는 수집하지 않습니다.
        </span>
      </div>

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[280px_1fr]">
        {/* 회원 목록 */}
        <aside className="rounded-xl border border-line bg-white">
          <div className="border-b border-line p-md">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-tertiary" />
              <input
                className="w-full h-9 pl-9 pr-4 rounded-lg border border-line bg-surface-secondary text-[13px] focus:border-primary outline-none"
                placeholder="회원명/회원번호 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="p-md text-[13px] text-content-secondary">회원 건강 요약을 불러오는 중입니다.</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Search} title={members.length === 0 ? '조회 가능한 회원이 없습니다' : '검색 결과가 없습니다'} />
          ) : (
            <ul className="max-h-[640px] divide-y divide-line overflow-auto">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    className={`flex w-full items-center justify-between px-md py-sm text-left hover:bg-surface-secondary ${
                      selectedId === m.id ? 'bg-primary-light/60' : ''
                    }`}
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-content">{m.name}</p>
                      <p className="text-[11px] text-content-tertiary">{m.age > 0 ? `${m.age}세` : '나이 미등록'} · {m.id}</p>
                    </div>
                    <div className="flex items-center gap-xs">
                      <StatusBadge variant={HC_VARIANT[m.hcStatus]} label={m.hcStatus} />
                      <ChevronRight className="h-4 w-4 text-content-tertiary" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* 상세 요약 */}
        {selected ? (
          <section className="space-y-lg">
            {/* 요약 카드 */}
            <StatCardGrid cols={5}>
              <StatCard label="최근 출석" value={selected.lastCheckIn} icon={<CalendarCheck />} />
              <StatCard label="오늘 옷 락커" value={selected.clothingLocker ?? '미배정'} icon={<Shirt />} />
              <StatCard label="고정 락커" value={selected.fixedLocker ?? '없음'} icon={<Package />} />
              <StatCard
                label="최근 InBody"
                value={selected.inbody[0] ? `${selected.inbody[0].weight}kg` : '없음'}
                description={selected.inbody[0] ? `골격근 ${selected.inbody[0].muscle}kg · 체지방 ${selected.inbody[0].fatRate}%` : undefined}
                icon={<Scale />}
                variant="mint"
              />
              <StatCard
                label="최근 7일 활동량"
                value={selected.hcStatus === '미연결' || selected.hcStatus === '미지원' ? '미연동' : `${selected.weeklySteps.toLocaleString()}보`}
                description={
                  selected.hcStatus === '미연결' || selected.hcStatus === '미지원'
                    ? undefined
                    : `${selected.weeklyKcal.toLocaleString()}kcal · 운동 ${selected.weeklyWorkoutDays}일`
                }
                icon={<Activity />}
                variant="peach"
              />
            </StatCardGrid>

            {/* Health Connect 연동 상태 위젯 */}
            <div className="rounded-xl border border-line bg-white p-lg">
              <div className="mb-md flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-content">Health Connect 연동 상태</h2>
                <StatusBadge variant={HC_VARIANT[selected.hcStatus]} label={selected.hcStatus} dot />
              </div>
              <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
                <div>
                  <p className="text-[11px] text-content-tertiary">최근 동기화</p>
                  <p className="text-[13px] font-medium text-content">{selected.hcLastSync}</p>
                </div>
                <div>
                  <p className="text-[11px] text-content-tertiary">소스 앱</p>
                  <p className="text-[13px] font-medium text-content">{selected.hcSource}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-content-tertiary">수집 범위</p>
                  <p className="text-[13px] font-medium text-content">걸음수 · 이동 거리 · 활동 kcal · 운동 세션</p>
                </div>
              </div>
              <p className="mt-md rounded-lg bg-surface-secondary px-md py-sm text-[12px] text-content-secondary">
                {HC_GUIDE[selected.hcStatus]}
              </p>
            </div>

            {/* 활동 데이터 상세 */}
            <div className="rounded-xl border border-line bg-white p-lg">
              <h2 className="mb-md text-[14px] font-semibold text-content">활동 데이터 상세</h2>
              {selected.hcStatus === '미연결' || selected.hcStatus === '미지원' ? (
                <EmptyState
                  icon={Activity}
                  title="활동 데이터가 없습니다"
                  description="Health Connect 미연동 상태로 활동량을 표시할 수 없습니다."
                />
              ) : (
                <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
                  {[
                    { label: '주간 걸음수', value: `${selected.weeklySteps.toLocaleString()}보`, icon: Footprints },
                    { label: '이동 거리', value: `${selected.weeklyDistance}km`, icon: Activity },
                    { label: '활동 칼로리', value: `${selected.weeklyKcal.toLocaleString()}kcal`, icon: Flame },
                    { label: '운동 세션', value: `${selected.weeklyWorkoutDays}일`, icon: Dumbbell },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-surface-secondary p-md">
                      <div className="mb-xs inline-flex rounded-lg bg-white p-1.5 text-primary">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <p className="text-[11px] text-content-tertiary">{item.label}</p>
                      <p className="text-[15px] font-bold text-content">{item.value}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-md text-[11px] text-content-tertiary">
                * 심박수 / 수면 / 의료 데이터는 v1에서 수집하지 않습니다.
              </p>
            </div>

            {/* 체성분 이력 + 운동 이력 */}
            <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-white p-lg">
                <h2 className="mb-md text-[14px] font-semibold text-content">체성분 이력</h2>
                {selected.inbody.length === 0 ? (
                  <EmptyState icon={Scale} title="측정 데이터가 없습니다" />
                ) : (
                  <ul className="space-y-sm">
                    {selected.inbody.map((rec, idx) => {
                      const prev = selected.inbody[idx + 1];
                      const diff = prev ? +(rec.weight - prev.weight).toFixed(1) : null;
                      return (
                        <li key={rec.date} className="flex items-center justify-between rounded-lg bg-surface-secondary px-md py-sm">
                          <div>
                            <p className="text-[12px] font-medium text-content">{rec.date}</p>
                            <p className="text-[11px] text-content-tertiary">골격근 {rec.muscle}kg · 체지방률 {rec.fatRate}%</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[13px] font-bold text-content">{rec.weight}kg</p>
                            {diff !== null && (
                              <p className={`text-[11px] font-semibold ${diff < 0 ? 'text-state-success' : diff > 0 ? 'text-state-error' : 'text-content-tertiary'}`}>
                                {diff > 0 ? `+${diff}` : diff}kg
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="rounded-xl border border-line bg-white p-lg">
                <h2 className="mb-md text-[14px] font-semibold text-content">운동 이력</h2>
                <div className="mb-md">
                  <div className="mb-xs flex items-center justify-between text-[12px]">
                    <span className="text-content-secondary">월간 목표 달성률</span>
                    <span className="font-semibold text-content">{selected.goalRate}%</span>
                  </div>
                  <ProgressBar value={selected.goalRate} color={selected.goalRate >= 80 ? 'success' : selected.goalRate >= 50 ? 'primary' : 'warning'} />
                </div>
                {selected.lessons.length === 0 ? (
                  <EmptyState icon={Dumbbell} title="운동 이력이 없습니다" />
                ) : (
                  <ul className="space-y-sm">
                    {selected.lessons.map((l) => (
                      <li key={`${l.date}-${l.name}`} className="flex items-center justify-between rounded-lg bg-surface-secondary px-md py-sm">
                        <div>
                          <p className="text-[12px] font-medium text-content">{l.name}</p>
                          <p className="text-[11px] text-content-tertiary">{l.trainer}</p>
                        </div>
                        <span className="text-[11px] text-content-tertiary">{l.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 상담 메모 바로가기 */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `/members/detail?id=${selected.memberId}&tab=consultation`;
              }}
              className="flex w-full items-center justify-between rounded-xl border border-line bg-white px-lg py-md text-left hover:bg-surface-secondary"
            >
              <div className="flex items-center gap-sm">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-medium text-content">{selected.name}님 건강·운동 상담 메모 바로가기</span>
              </div>
              <ChevronRight className="h-4 w-4 text-content-tertiary" />
            </button>
          </section>
        ) : (
          <EmptyState icon={Activity} title="회원을 선택해 주세요" description="좌측 목록에서 회원을 선택하면 건강 요약이 표시됩니다." />
        )}
      </div>
    </AppLayout>
  );
}
