'use client';

// SCR-054 골프 타석 관리 — 예약 운영 뷰 (일간 타임테이블 / 월간 캘린더 / 예약 상세 모달)
// 실시간 타석 보드와 별개로 예약 운영 흐름을 담당. 데이터 미연동 기능형 목업.

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, X } from 'lucide-react';
import { toast } from 'sonner';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/common/StatusBadge';
import { cn } from '@/lib/utils';

// ─── 타입 ──────────────────────────────────────────────────────────────────

type ReservationType = '시설예약' | '개인레슨' | '정규' | '점검';
type ViewMode = 'daily' | 'monthly';

interface Reservation {
  id: string;
  date: string;        // YYYY-MM-DD
  bayNumber: number;   // 타석 번호
  startMin: number;    // 0~1440 (분 단위, 자정 기준)
  durationMin: number;
  type: ReservationType;
  memberName: string;
  contact: string;
  proName: string | null;
  product: string;
  remainingLessons: number | null;
  mobileNotify: boolean;
}

const TYPE_FILTERS: Array<{ key: 'all' | ReservationType; label: string }> = [
  { key: 'all', label: '전체' },
  { key: '개인레슨', label: '개인레슨' },
  { key: '정규', label: '정규' },
  { key: '시설예약', label: '시설예약' },
];

const TYPE_STYLE: Record<ReservationType, { badge: 'info' | 'warning' | 'success' | 'default'; block: string }> = {
  시설예약: { badge: 'info', block: 'bg-blue-100 border-blue-300 text-blue-800' },
  개인레슨: { badge: 'warning', block: 'bg-amber-100 border-amber-300 text-amber-800' },
  정규: { badge: 'success', block: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
  점검: { badge: 'default', block: 'bg-surface-secondary border-line text-content-secondary' },
};

const BAY_COUNT = 8;
const SLOT_START_HOUR = 9;
const SLOT_END_HOUR = 22;
const SLOT_STEP = 5; // 5분 단위

// ─── mock 예약 생성 (선택 날짜 기준) ────────────────────────────────────────

const minToLabel = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

const buildMockReservations = (baseDate: Date): Reservation[] => {
  const out: Reservation[] = [];
  const seed = (n: number) => {
    const x = Math.sin(n * 99.13 + baseDate.getDate() * 7.7) * 10000;
    return x - Math.floor(x);
  };
  const members = ['김민수', '이영희', '박준호', '최수정', '정대현', '한지민', '오승환', '송형근'];
  const pros = ['이프로', '김프로', '박프로'];
  const types: ReservationType[] = ['시설예약', '개인레슨', '정규'];
  let idx = 0;
  for (let bay = 1; bay <= BAY_COUNT; bay++) {
    const count = Math.floor(seed(bay * 3) * 3); // 타석당 0~2건
    for (let k = 0; k < count; k++) {
      const startHour = SLOT_START_HOUR + Math.floor(seed(bay * 13 + k * 5) * (SLOT_END_HOUR - SLOT_START_HOUR - 1));
      const type = types[Math.floor(seed(bay + k * 2) * types.length)];
      const member = members[(bay + k) % members.length];
      out.push({
        id: `R-${baseDate.getDate()}-${bay}-${k}`,
        date: baseDate.toISOString().slice(0, 10),
        bayNumber: bay,
        startMin: startHour * 60,
        durationMin: 60,
        type,
        memberName: member,
        contact: `010-${1000 + (idx % 9000)}-${(idx * 7) % 10000}`.padEnd(13, '0').slice(0, 13),
        proName: type === '개인레슨' ? pros[(bay + k) % pros.length] : null,
        product: type === '개인레슨' ? '1:1 레슨 10회권' : type === '정규' ? '정규반 3개월' : '타석 1시간 이용권',
        remainingLessons: type === '개인레슨' ? 5 + (k % 4) : null,
        mobileNotify: seed(bay * k + 1) > 0.4,
      });
      idx++;
    }
  }
  return out;
};

const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export default function GolfReservationViews() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [cursor, setCursor] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<'all' | ReservationType>('all');
  const [detail, setDetail] = useState<Reservation[] | null>(null);
  const [detailLabel, setDetailLabel] = useState('');

  // 일간 예약 (현재 cursor 날짜 기준)
  const dailyReservations = useMemo(() => {
    const list = buildMockReservations(cursor);
    return typeFilter === 'all' ? list : list.filter(r => r.type === typeFilter);
  }, [cursor, typeFilter]);

  // 월간 예약 건수 집계 (해당 월 1~말일)
  const monthlyCounts = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const map: Record<number, number> = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const list = buildMockReservations(d);
      const filtered = typeFilter === 'all' ? list : list.filter(r => r.type === typeFilter);
      map[day] = filtered.length;
    }
    return map;
  }, [cursor, typeFilter]);

  const periodHeader = viewMode === 'daily'
    ? `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 ${cursor.getDate()}일`
    : `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;

  const goPrev = () => setCursor(c => viewMode === 'daily' ? addDays(c, -1) : addMonths(c, -1));
  const goNext = () => setCursor(c => viewMode === 'daily' ? addDays(c, 1) : addMonths(c, 1));
  const goToday = () => setCursor(new Date());

  const openBlockDetail = (r: Reservation) => {
    // 동일 시간대 복수 예약 일괄 표시
    const same = dailyReservations.filter(x => x.bayNumber === r.bayNumber && x.startMin === r.startMin);
    setDetail(same);
    setDetailLabel(`${r.date} · ${minToLabel(r.startMin)} · ${r.bayNumber}번 타석`);
  };

  const drillToDay = (day: number) => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth(), day);
    setCursor(d);
    setViewMode('daily');
  };

  // 타임테이블 시간 슬롯 (시간 단위 라벨)
  const hourSlots = Array.from({ length: SLOT_END_HOUR - SLOT_START_HOUR }, (_, i) => SLOT_START_HOUR + i);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  const isToday = cursor.toDateString() === new Date().toDateString();

  return (
    <Card
      padding="none"
      className="mb-lg overflow-hidden"
      header={
        <div className="flex flex-col gap-sm lg:flex-row lg:items-center lg:justify-between">
          {/* 기간 헤더 + 이동 */}
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="sm" icon={<ChevronLeft size={14} />} onClick={goPrev} aria-label="이전" />
            <span className="min-w-[160px] text-center text-[14px] font-bold text-content tabular-nums">{periodHeader}</span>
            <Button type="button" variant="outline" size="sm" icon={<ChevronRight size={14} />} onClick={goNext} aria-label="다음" />
            <Button type="button" variant="secondary" size="sm" onClick={goToday}>오늘</Button>
          </div>
          {/* 보기 전환 + 예약 구분 필터 */}
          <div className="flex flex-wrap items-center gap-sm">
            <div className="flex items-center gap-[2px] bg-surface-tertiary rounded-lg p-[3px]">
              <button
                className={cn('flex items-center gap-xs px-md py-xs rounded-md text-[12px] font-semibold transition-colors',
                  viewMode === 'daily' ? 'bg-surface text-primary shadow-sm' : 'text-content-secondary')}
                onClick={() => setViewMode('daily')}
              >
                <LayoutGrid size={13} /> 일간
              </button>
              <button
                className={cn('flex items-center gap-xs px-md py-xs rounded-md text-[12px] font-semibold transition-colors',
                  viewMode === 'monthly' ? 'bg-surface text-primary shadow-sm' : 'text-content-secondary')}
                onClick={() => setViewMode('monthly')}
              >
                <CalendarDays size={13} /> 월간
              </button>
            </div>
            <div className="flex items-center gap-[2px] bg-surface-tertiary rounded-lg p-[3px]">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.key}
                  className={cn('px-md py-xs rounded-md text-[12px] font-semibold transition-colors',
                    typeFilter === f.key ? 'bg-surface text-primary shadow-sm' : 'text-content-secondary')}
                  onClick={() => setTypeFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      }
    >
      {viewMode === 'daily' ? (
        // ── 일간 타임테이블 ──
        <div className="overflow-x-auto p-lg">
          <div className="min-w-[640px]">
            {/* 타석 헤더 */}
            <div className="grid" style={{ gridTemplateColumns: `60px repeat(${BAY_COUNT}, minmax(70px, 1fr))` }}>
              <div className="text-[11px] font-semibold text-content-tertiary" />
              {Array.from({ length: BAY_COUNT }, (_, i) => {
                const bay = i + 1;
                const cnt = dailyReservations.filter(r => r.bayNumber === bay).length;
                return (
                  <div key={bay} className="px-xs py-sm text-center text-[12px] font-bold text-content border-b border-line">
                    {bay}번
                    <span className="ml-1 rounded-full bg-surface-tertiary px-1.5 text-[10px] font-semibold text-content-secondary">{cnt}</span>
                  </div>
                );
              })}
            </div>
            {/* 시간 슬롯 그리드 */}
            <div className="relative grid" style={{ gridTemplateColumns: `60px repeat(${BAY_COUNT}, minmax(70px, 1fr))` }}>
              {/* 현재 시각선 */}
              {isToday && nowMin >= SLOT_START_HOUR * 60 && nowMin <= SLOT_END_HOUR * 60 && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-500"
                  style={{ top: `${((nowMin - SLOT_START_HOUR * 60) / SLOT_STEP) * 8}px` }}
                >
                  <span className="absolute -top-2 left-0 rounded bg-red-500 px-1 text-[9px] font-bold text-white">{minToLabel(nowMin)}</span>
                </div>
              )}
              {hourSlots.map(hour => (
                <React.Fragment key={hour}>
                  <div className="h-[96px] border-b border-line/60 pr-xs text-right text-[11px] text-content-tertiary tabular-nums">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  {Array.from({ length: BAY_COUNT }, (_, i) => {
                    const bay = i + 1;
                    const slotStart = hour * 60;
                    const r = dailyReservations.find(x => x.bayNumber === bay && x.startMin >= slotStart && x.startMin < slotStart + 60);
                    return (
                      <div key={bay} className="relative h-[96px] border-b border-l border-line/40">
                        {r && (
                          <button
                            type="button"
                            onClick={() => openBlockDetail(r)}
                            className={cn('absolute inset-x-0.5 rounded border px-1 py-0.5 text-left text-[10px] font-semibold shadow-sm transition-transform hover:scale-[1.02]', TYPE_STYLE[r.type].block)}
                            style={{ top: `${((r.startMin - slotStart) / SLOT_STEP) * 8}px`, height: `${(r.durationMin / SLOT_STEP) * 8}px` }}
                          >
                            <span className="block tabular-nums">{minToLabel(r.startMin)}</span>
                            <span className="block truncate">{r.memberName}</span>
                            <span className="block truncate opacity-70">{r.proName ?? r.type}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // ── 월간 캘린더 ──
        <div className="p-lg">
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-line bg-line">
            {['일', '월', '화', '수', '목', '금', '토'].map(d => (
              <div key={d} className="bg-surface-secondary py-sm text-center text-[11px] font-bold text-content-secondary">{d}</div>
            ))}
            {(() => {
              const year = cursor.getFullYear();
              const month = cursor.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: React.ReactNode[] = [];
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="min-h-[88px] bg-surface" />);
              for (let day = 1; day <= daysInMonth; day++) {
                const cnt = monthlyCounts[day] ?? 0;
                const todayCell = isToday && new Date().getDate() === day;
                cells.push(
                  <button
                    key={day}
                    type="button"
                    onClick={() => drillToDay(day)}
                    className={cn('min-h-[88px] bg-surface p-xs text-left transition-colors hover:bg-surface-secondary', todayCell && 'ring-1 ring-inset ring-primary')}
                  >
                    <div className="flex items-center justify-between">
                      <span className={cn('text-[12px] font-semibold', todayCell ? 'text-primary' : 'text-content')}>{day}</span>
                      {cnt > 0 && <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{cnt}</span>}
                    </div>
                    {cnt > 0 && (
                      <div className="mt-1 space-y-px">
                        <p className="truncate text-[10px] text-content-secondary">예약 {Math.min(cnt, 3)}건</p>
                        {cnt > 3 && <p className="text-[10px] text-content-tertiary">+{cnt - 3}</p>}
                      </div>
                    )}
                  </button>
                );
              }
              return cells;
            })()}
          </div>
          <p className="mt-sm text-[11px] text-content-tertiary">날짜를 클릭하면 해당 일자의 일간 타임테이블로 이동합니다.</p>
        </div>
      )}

      {/* ── 예약 상세 모달 ── */}
      <Modal
        isOpen={detail !== null}
        onClose={() => setDetail(null)}
        title={`예약 상세 — ${detailLabel}`}
        size="lg"
        footer={<Button type="button" variant="secondary" size="sm" onClick={() => setDetail(null)}>닫기</Button>}
      >
        <div className="space-y-md">
          {detail?.map(r => (
            <div key={r.id} className="rounded-[16px] border border-line bg-white p-lg">
              <div className="mb-sm flex items-center justify-between">
                <StatusBadge variant={TYPE_STYLE[r.type].badge} dot>{r.type}</StatusBadge>
                <span className="text-[12px] text-content-tertiary tabular-nums">{minToLabel(r.startMin)} ~ {minToLabel(r.startMin + r.durationMin)}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-xs text-[13px]">
                <span className="text-content-secondary">회원명</span><span className="font-semibold text-content">{r.memberName}</span>
                <span className="text-content-secondary">연락처</span><span className="text-content">{r.contact}</span>
                <span className="text-content-secondary">예약 유형</span><span className="text-content">{r.type}{r.proName ? ` · ${r.proName}` : ''}</span>
                <span className="text-content-secondary">사용 상품</span><span className="text-content">{r.product}</span>
                {r.remainingLessons != null && (<><span className="text-content-secondary">남은 레슨</span><span className="text-content">{r.remainingLessons}회</span></>)}
                <span className="text-content-secondary">모바일 알림</span><span className="text-content">{r.mobileNotify ? '발송' : '미발송'}</span>
              </div>
              <div className="mt-md flex gap-xs">
                {(['완료', '결석', '취소', '삭제'] as const).map(act => (
                  <Button
                    key={act}
                    type="button"
                    variant={act === '삭제' ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => { toast.success(`${r.memberName} 예약을 ${act} 처리했습니다.`); setDetail(d => (d && d.length > 1 ? d.filter(x => x.id !== r.id) : null)); }}
                  >
                    {act}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {detail && detail.length === 0 && (
            <div className="flex flex-col items-center gap-sm py-xl text-content-tertiary">
              <X size={28} />
              <p className="text-[13px]">처리할 예약이 없습니다.</p>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
