'use client';
export const dynamic = 'force-dynamic';

// SCR-I007 회원 건강 연동 요약 (docs4 V1/V2 D11-통합운영)
// 회원별 체성분·운동 이력·Health Connect(걸음/거리/활동kcal/운동세션) 연동 상태를 통합 요약.
// admin은 조회 전용(연결/해제/권한 변경 불가). 심박수/수면/의료 데이터는 v1 미수집.
// 데이터 미연동: 인라인 mock 기준 기능형 목업.

import React, { useMemo, useState } from 'react';
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

// ─── 인라인 mock ──────────────────────────────────────────────────────────

const MOCK_MEMBERS: MemberHealth[] = [
  {
    id: 'M-001', name: '김민준', age: 34, lastCheckIn: '오늘 08:12',
    clothingLocker: 'A-03', fixedLocker: 'P-01',
    hcStatus: '연결됨', hcSource: 'Samsung Health', hcLastSync: '오늘 09:00',
    weeklySteps: 58940, weeklyKcal: 2380, weeklyWorkoutDays: 5, weeklyDistance: 42.3,
    inbody: [
      { date: '2026-05-20', weight: 72.4, muscle: 34.2, fatRate: 16.8 },
      { date: '2026-04-22', weight: 73.1, muscle: 33.8, fatRate: 17.5 },
      { date: '2026-03-24', weight: 74.0, muscle: 33.2, fatRate: 18.4 },
    ],
    lessons: [
      { date: '2026-05-27', name: '1:1 PT', trainer: '박코치' },
      { date: '2026-05-25', name: '그룹 스피닝', trainer: '이코치' },
    ],
    goalRate: 82,
  },
  {
    id: 'M-002', name: '이서연', age: 28, lastCheckIn: '오늘 07:35',
    clothingLocker: null, fixedLocker: null,
    hcStatus: '부분권한', hcSource: 'Google Fit', hcLastSync: '오늘 08:40',
    weeklySteps: 71200, weeklyKcal: 2910, weeklyWorkoutDays: 6, weeklyDistance: 51.0,
    inbody: [
      { date: '2026-05-18', weight: 54.2, muscle: 23.1, fatRate: 22.4 },
      { date: '2026-04-20', weight: 55.0, muscle: 22.7, fatRate: 23.1 },
    ],
    lessons: [{ date: '2026-05-26', name: '필라테스', trainer: '최코치' }],
    goalRate: 95,
  },
  {
    id: 'M-003', name: '박지훈', age: 45, lastCheckIn: '어제 21:10',
    clothingLocker: null, fixedLocker: 'G-02',
    hcStatus: '동기화지연', hcSource: 'Samsung Health', hcLastSync: '3일 전',
    weeklySteps: 18200, weeklyKcal: 760, weeklyWorkoutDays: 2, weeklyDistance: 13.4,
    inbody: [{ date: '2026-04-10', weight: 81.2, muscle: 35.0, fatRate: 24.8 }],
    lessons: [],
    goalRate: 38,
  },
  {
    id: 'M-004', name: '최유리', age: 31, lastCheckIn: '오늘 09:02',
    clothingLocker: 'A-06', fixedLocker: null,
    hcStatus: '미연결', hcSource: '-', hcLastSync: '-',
    weeklySteps: 0, weeklyKcal: 0, weeklyWorkoutDays: 0, weeklyDistance: 0,
    inbody: [{ date: '2026-05-12', weight: 58.7, muscle: 24.6, fatRate: 25.2 }],
    lessons: [{ date: '2026-05-24', name: '요가', trainer: '한코치' }],
    goalRate: 60,
  },
  {
    id: 'M-005', name: '정현우', age: 52, lastCheckIn: '오늘 06:20',
    clothingLocker: null, fixedLocker: null,
    hcStatus: '미지원', hcSource: '-', hcLastSync: '-',
    weeklySteps: 0, weeklyKcal: 0, weeklyWorkoutDays: 0, weeklyDistance: 0,
    inbody: [],
    lessons: [],
    goalRate: 0,
  },
];

const HC_GUIDE: Record<HcStatus, string> = {
  연결됨: '회원앱(MA-159)에서 정상 연동되어 있습니다.',
  부분권한: '일부 권한만 허용되어 누락 지표가 있습니다. 회원앱(MA-159)에서 권한 수정을 안내하세요.',
  동기화지연: '72시간 이상 데이터 미수신 상태입니다. 회원앱 연동 상태를 확인하세요.',
  미연결: 'Health Connect 미연동 상태입니다. admin에서는 연결할 수 없으며 회원앱(MA-159) 연동을 안내합니다.',
  미지원: 'iOS 또는 미지원 단말로 Health Connect 연동이 불가합니다.',
};

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function HealthSummaryPage() {
  const [members] = useState<MemberHealth[]>(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string>(MOCK_MEMBERS[0]?.id ?? '');

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
          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="검색 결과가 없습니다" />
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
                      <p className="text-[11px] text-content-tertiary">{m.age}세 · {m.id}</p>
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
