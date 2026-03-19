import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Settings2, Timer, Users, ArrowRightLeft, Power,
  Play, Square, UserCheck, Clock, AlertTriangle, RefreshCw,
  ChevronDown, X, Monitor,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─── 타입 정의 ─────────────────────────────────────────────────
type BayStatus = 'available' | 'in_use' | 'reserved' | 'maintenance';

interface GolfBay {
  id: number;
  name: string;
  status: BayStatus;
  memberId: number | null;
  memberName: string | null;
  proId: number | null;
  proName: string | null;
  startedAt: string | null;
  durationMin: number;       // 이용 시간 (분)
  remainingMin: number;      // 남은 시간 (분)
  hasProjector: boolean;
  projectorOn: boolean;
}

interface WaitlistEntry {
  id: number;
  memberName: string;
  requestedAt: string;
  estimatedWait: number; // 분
}

interface Staff {
  id: number;
  name: string;
}

// ─── 상수 ───────────────────────────────────────────────────────
const BAY_STATUS_CONFIG: Record<BayStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  available:   { label: '대기',   color: 'text-green-700',  bgColor: 'bg-green-50',   borderColor: 'border-green-200' },
  in_use:      { label: '사용중', color: 'text-blue-700',   bgColor: 'bg-blue-50',    borderColor: 'border-blue-200' },
  reserved:    { label: '예약',   color: 'text-yellow-700', bgColor: 'bg-yellow-50',  borderColor: 'border-yellow-200' },
  maintenance: { label: '점검',   color: 'text-gray-500',   bgColor: 'bg-gray-50',    borderColor: 'border-gray-200' },
};

const getBranchId = () => Number(localStorage.getItem('branchId')) || 1;

// ─── 초기 Mock 데이터 (DB 연동 전) ────────────────────────────
const INITIAL_BAYS: GolfBay[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `${i + 1}번 타석`,
  status: i < 7 ? 'in_use' : i < 9 ? 'reserved' : i === 11 ? 'maintenance' : 'available' as BayStatus,
  memberId: i < 7 ? 100 + i : null,
  memberName: i < 7 ? ['김민수', '이영희', '박준호', '최수정', '정대현', '한지민', '오승환'][i] : null,
  proId: i < 3 ? 10 + i : null,
  proName: i < 3 ? ['이프로', '김프로', '박프로'][i] : null,
  startedAt: i < 7 ? new Date(Date.now() - (Math.random() * 50 + 10) * 60000).toISOString() : null,
  durationMin: 60,
  remainingMin: i < 7 ? Math.floor(Math.random() * 45) + 5 : 0,
  hasProjector: true,
  projectorOn: i < 7,
}));

const INITIAL_WAITLIST: WaitlistEntry[] = [
  { id: 1, memberName: '송형근', requestedAt: new Date(Date.now() - 15 * 60000).toISOString(), estimatedWait: 12 },
  { id: 2, memberName: '유재석', requestedAt: new Date(Date.now() - 8 * 60000).toISOString(), estimatedWait: 25 },
  { id: 3, memberName: '강호동', requestedAt: new Date(Date.now() - 3 * 60000).toISOString(), estimatedWait: 38 },
];

// ─── 유틸 ───────────────────────────────────────────────────────
const fmtTime = (min: number) => {
  if (min <= 0) return '0:00';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
};

const fmtRelative = (iso: string) => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return '방금 전';
  return `${diff}분 전`;
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────
export default function GolfBayManagement() {
  const [bays, setBays] = useState<GolfBay[]>(INITIAL_BAYS);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>(INITIAL_WAITLIST);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedBay, setSelectedBay] = useState<GolfBay | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<number | null>(null);

  // 프로 목록 로드
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('id, name')
        .eq('branchId', getBranchId())
        .in('role', ['fc', 'staff', 'manager', 'owner', 'primary']);
      if (data) setStaffList(data);
    })();
  }, []);

  // 실시간 타이머 (1분마다 남은 시간 감소)
  useEffect(() => {
    const timer = setInterval(() => {
      setBays(prev => prev.map(bay => {
        if (bay.status !== 'in_use' || bay.remainingMin <= 0) return bay;
        const next = bay.remainingMin - 1;
        if (next <= 0) {
          toast.warning(`⏰ ${bay.name} 시간 종료! (${bay.memberName})`);
          return { ...bay, remainingMin: 0 };
        }
        return { ...bay, remainingMin: next };
      }));
    }, 60000); // 1분 간격
    return () => clearInterval(timer);
  }, []);

  // ─── 통계 ─────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: bays.length,
    inUse: bays.filter(b => b.status === 'in_use').length,
    available: bays.filter(b => b.status === 'available').length,
    reserved: bays.filter(b => b.status === 'reserved').length,
    waitCount: waitlist.length,
  }), [bays, waitlist]);

  // ─── 타석 시작 ────────────────────────────────────────────────
  const handleStart = (bayId: number) => {
    setBays(prev => prev.map(b =>
      b.id === bayId ? {
        ...b,
        status: 'in_use' as BayStatus,
        startedAt: new Date().toISOString(),
        remainingMin: b.durationMin,
        projectorOn: b.hasProjector,
      } : b
    ));
    toast.success('타석 이용이 시작되었습니다.');
    setDetailOpen(false);
  };

  // ─── 타석 종료 ────────────────────────────────────────────────
  const handleEnd = (bayId: number) => {
    const bay = bays.find(b => b.id === bayId);
    setBays(prev => prev.map(b =>
      b.id === bayId ? {
        ...b,
        status: 'available' as BayStatus,
        memberId: null,
        memberName: null,
        proId: null,
        proName: null,
        startedAt: null,
        remainingMin: 0,
        projectorOn: false,
      } : b
    ));

    // 대기열에서 자동 배정 (꼬리물기)
    if (waitlist.length > 0) {
      const next = waitlist[0];
      setWaitlist(prev => prev.slice(1));
      setBays(prev => prev.map(b =>
        b.id === bayId ? {
          ...b,
          status: 'reserved' as BayStatus,
          memberName: next.memberName,
        } : b
      ));
      toast.info(`🔄 ${next.memberName}님이 ${bay?.name}에 자동 배정되었습니다.`);
    } else {
      toast.success('타석 이용이 종료되었습니다.');
    }
    setDetailOpen(false);
  };

  // ─── 타석 이동 ────────────────────────────────────────────────
  const handleMove = () => {
    if (!selectedBay || !moveTargetId) return;
    const targetBay = bays.find(b => b.id === moveTargetId);
    if (!targetBay || targetBay.status !== 'available') {
      toast.error('이동할 수 없는 타석입니다.');
      return;
    }

    setBays(prev => prev.map(b => {
      if (b.id === selectedBay.id) {
        return { ...b, status: 'available' as BayStatus, memberId: null, memberName: null, proId: null, proName: null, startedAt: null, remainingMin: 0, projectorOn: false };
      }
      if (b.id === moveTargetId) {
        return { ...b, status: selectedBay.status, memberId: selectedBay.memberId, memberName: selectedBay.memberName, proId: selectedBay.proId, proName: selectedBay.proName, startedAt: selectedBay.startedAt, remainingMin: selectedBay.remainingMin, projectorOn: selectedBay.projectorOn };
      }
      return b;
    }));
    toast.success(`${selectedBay.memberName}님이 ${targetBay.name}으로 이동했습니다.`);
    setMoveModalOpen(false);
    setDetailOpen(false);
  };

  // ─── 프로젝터 토글 ───────────────────────────────────────────
  const toggleProjector = (bayId: number) => {
    setBays(prev => prev.map(b =>
      b.id === bayId ? { ...b, projectorOn: !b.projectorOn } : b
    ));
  };

  // ─── 대기열 등록 ──────────────────────────────────────────────
  const handleAddWaitlist = () => {
    const name = prompt('대기 등록할 회원 이름:');
    if (!name?.trim()) return;
    const lastWait = waitlist.length > 0 ? waitlist[waitlist.length - 1].estimatedWait : 0;
    setWaitlist(prev => [...prev, {
      id: Date.now(),
      memberName: name.trim(),
      requestedAt: new Date().toISOString(),
      estimatedWait: lastWait + 15,
    }]);
    toast.success(`${name.trim()}님이 대기열에 등록되었습니다.`);
  };

  return (
    <AppLayout>
      <PageHeader
        title="골프 타석 관리"
        description="타석 현황, 대기열, 프로 배정을 실시간으로 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <button
              onClick={handleAddWaitlist}
              className="flex items-center gap-xs px-md py-sm border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-tertiary transition-colors"
            >
              <Users size={14} /> 대기 등록
            </button>
            <button
              onClick={() => {
                setBays(prev => prev.map(b => b.status === 'in_use' && b.remainingMin <= 0
                  ? { ...b, status: 'available' as BayStatus, memberId: null, memberName: null, proId: null, proName: null, startedAt: null, projectorOn: false }
                  : b
                ));
                toast.success('시간 종료 타석이 정리되었습니다.');
              }}
              className="flex items-center gap-xs px-md py-sm border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-tertiary transition-colors"
            >
              <RefreshCw size={14} /> 일괄 정리
            </button>
          </div>
        }
      />

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-md mb-lg">
        <StatCard label="전체 타석" value={`${stats.total}석`} icon={<Monitor />} />
        <StatCard label="사용중" value={`${stats.inUse}석`} icon={<Play />} variant="peach" />
        <StatCard label="대기중" value={`${stats.available}석`} icon={<Clock />} variant="mint" />
        <StatCard label="예약" value={`${stats.reserved}석`} icon={<UserCheck />} variant="mint" />
        <StatCard label="대기열" value={`${stats.waitCount}명`} icon={<Users />} variant={stats.waitCount > 0 ? 'peach' : undefined} />
      </div>

      <div className="flex gap-lg">
        {/* ── 좌측: 타석 현황 보드 ── */}
        <div className="flex-1">
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden">
            <div className="px-lg py-sm border-b border-line bg-surface-secondary flex items-center justify-between">
              <span className="text-[13px] font-bold text-content">타석 현황</span>
              <div className="flex items-center gap-md text-[11px]">
                {Object.entries(BAY_STATUS_CONFIG).map(([key, cfg]) => (
                  <span key={key} className="flex items-center gap-xs">
                    <span className={cn('w-2.5 h-2.5 rounded-sm', cfg.bgColor, 'border', cfg.borderColor)} />
                    <span className="text-content-secondary">{cfg.label}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 타석 그리드 */}
            <div className="p-lg grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-sm">
              {bays.map(bay => {
                const cfg = BAY_STATUS_CONFIG[bay.status];
                const isUrgent = bay.status === 'in_use' && bay.remainingMin <= 5 && bay.remainingMin > 0;
                const isExpired = bay.status === 'in_use' && bay.remainingMin <= 0;
                return (
                  <button
                    key={bay.id}
                    onClick={() => { setSelectedBay(bay); setDetailOpen(true); }}
                    className={cn(
                      'relative flex flex-col items-center p-md rounded-xl border-2 transition-all hover:shadow-md cursor-pointer text-center',
                      isExpired ? 'border-red-400 bg-red-50 animate-pulse' :
                      isUrgent ? 'border-yellow-400 bg-yellow-50' :
                      `${cfg.borderColor} ${cfg.bgColor}`
                    )}
                  >
                    {/* 타석 번호 */}
                    <span className={cn('text-[18px] font-bold', isExpired ? 'text-red-600' : cfg.color)}>
                      {bay.id}
                    </span>
                    <span className="text-[10px] font-semibold text-content-tertiary mt-[2px]">
                      {bay.name}
                    </span>

                    {/* 사용중: 회원명 + 남은 시간 */}
                    {bay.status === 'in_use' && (
                      <>
                        <span className="text-[11px] font-medium text-content mt-sm truncate w-full">
                          {bay.memberName}
                        </span>
                        <span className={cn(
                          'text-[13px] font-bold tabular-nums mt-[2px]',
                          isExpired ? 'text-red-600' : isUrgent ? 'text-yellow-600' : 'text-blue-600'
                        )}>
                          {isExpired ? '종료!' : fmtTime(bay.remainingMin)}
                        </span>
                        {bay.proName && (
                          <span className="text-[9px] text-content-tertiary mt-[2px]">
                            🏌️ {bay.proName}
                          </span>
                        )}
                      </>
                    )}

                    {/* 예약 */}
                    {bay.status === 'reserved' && bay.memberName && (
                      <span className="text-[11px] font-medium text-yellow-700 mt-sm">
                        {bay.memberName}
                      </span>
                    )}

                    {/* 대기 */}
                    {bay.status === 'available' && (
                      <span className="text-[11px] text-green-600 mt-sm font-medium">이용 가능</span>
                    )}

                    {/* 점검 */}
                    {bay.status === 'maintenance' && (
                      <span className="text-[11px] text-gray-500 mt-sm">점검중</span>
                    )}

                    {/* 프로젝터 상태 아이콘 */}
                    {bay.hasProjector && (
                      <span className={cn(
                        'absolute top-1 right-1.5 w-2 h-2 rounded-full',
                        bay.projectorOn ? 'bg-green-400' : 'bg-gray-300'
                      )} title={bay.projectorOn ? '프로젝터 ON' : '프로젝터 OFF'} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── 우측: 대기열 패널 ── */}
        <div className="w-[280px] shrink-0">
          <div className="bg-surface rounded-xl border border-line shadow-card overflow-hidden sticky top-[72px]">
            <div className="px-md py-sm border-b border-line bg-surface-secondary flex items-center justify-between">
              <span className="text-[13px] font-bold text-content">대기열</span>
              <StatusBadge variant={waitlist.length > 0 ? 'peach' : 'default'}>
                {waitlist.length}명
              </StatusBadge>
            </div>

            {waitlist.length === 0 ? (
              <div className="p-lg text-center text-[13px] text-content-tertiary">대기 없음</div>
            ) : (
              <div className="divide-y divide-line-light">
                {waitlist.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center gap-sm px-md py-sm">
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                      idx === 0 ? 'bg-primary text-white' : 'bg-surface-secondary text-content-secondary'
                    )}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-content truncate">{entry.memberName}</p>
                      <p className="text-[10px] text-content-tertiary">{fmtRelative(entry.requestedAt)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-medium text-primary tabular-nums">~{entry.estimatedWait}분</p>
                    </div>
                    <button
                      onClick={() => setWaitlist(prev => prev.filter(w => w.id !== entry.id))}
                      className="p-[2px] text-content-tertiary hover:text-state-error transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-line px-md py-sm">
              <button
                onClick={handleAddWaitlist}
                className="w-full flex items-center justify-center gap-xs text-[12px] text-primary font-medium hover:text-primary-dark transition-colors"
              >
                <Plus size={13} /> 대기 추가
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 타석 상세 모달 ─────────────────────────────────────── */}
      <Modal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={selectedBay ? `${selectedBay.name} 상세` : '타석 상세'}
        size="md"
        footer={
          <button
            className="px-md py-[6px] border border-line rounded-lg text-[13px] text-content-secondary hover:bg-surface-tertiary"
            onClick={() => setDetailOpen(false)}
          >
            닫기
          </button>
        }
      >
        {selectedBay && (
          <div className="space-y-md">
            {/* 상태 정보 */}
            <div className="flex items-center justify-between p-md bg-surface-secondary rounded-xl">
              <div>
                <p className="text-[15px] font-bold text-content">{selectedBay.name}</p>
                <StatusBadge variant={
                  selectedBay.status === 'in_use' ? 'info' :
                  selectedBay.status === 'available' ? 'mint' :
                  selectedBay.status === 'reserved' ? 'peach' : 'default'
                }>
                  {BAY_STATUS_CONFIG[selectedBay.status].label}
                </StatusBadge>
              </div>
              {selectedBay.status === 'in_use' && (
                <div className="text-right">
                  <p className="text-[24px] font-bold tabular-nums text-primary">{fmtTime(selectedBay.remainingMin)}</p>
                  <p className="text-[11px] text-content-tertiary">남은 시간</p>
                </div>
              )}
            </div>

            {/* 이용자 정보 */}
            {selectedBay.memberName && (
              <div className="grid grid-cols-2 gap-sm text-[12px]">
                <div className="p-sm bg-surface-secondary rounded-lg">
                  <p className="text-content-tertiary">회원</p>
                  <p className="font-semibold text-content">{selectedBay.memberName}</p>
                </div>
                <div className="p-sm bg-surface-secondary rounded-lg">
                  <p className="text-content-tertiary">프로</p>
                  <p className="font-semibold text-content">{selectedBay.proName ?? '배정 없음'}</p>
                </div>
              </div>
            )}

            {/* 프로 배정 */}
            {selectedBay.status === 'in_use' && (
              <div className="flex flex-col gap-xs">
                <label className="text-[11px] font-semibold text-content-secondary">프로 배정 변경</label>
                <select
                  value={selectedBay.proId?.toString() ?? ''}
                  onChange={e => {
                    const proId = e.target.value ? Number(e.target.value) : null;
                    const proName = staffList.find(s => s.id === proId)?.name ?? null;
                    setBays(prev => prev.map(b => b.id === selectedBay.id ? { ...b, proId, proName } : b));
                    setSelectedBay(prev => prev ? { ...prev, proId, proName } : prev);
                    toast.success(proName ? `${proName} 프로가 배정되었습니다.` : '프로 배정이 해제되었습니다.');
                  }}
                  className="px-sm py-[5px] border border-line rounded-lg text-[12px] bg-surface focus:outline-none focus:border-primary"
                >
                  <option value="">프로 없음</option>
                  {staffList.map(s => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex flex-wrap gap-sm">
              {selectedBay.status === 'available' && (
                <button
                  onClick={() => handleStart(selectedBay.id)}
                  className="flex items-center gap-xs px-md py-sm bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary-dark"
                >
                  <Play size={14} /> 이용 시작
                </button>
              )}
              {selectedBay.status === 'in_use' && (
                <>
                  <button
                    onClick={() => handleEnd(selectedBay.id)}
                    className="flex items-center gap-xs px-md py-sm bg-state-error text-white rounded-lg text-[13px] font-medium hover:opacity-90"
                  >
                    <Square size={14} /> 이용 종료
                  </button>
                  <button
                    onClick={() => { setMoveTargetId(null); setMoveModalOpen(true); }}
                    className="flex items-center gap-xs px-md py-sm border border-line text-content-secondary rounded-lg text-[13px] font-medium hover:bg-surface-tertiary"
                  >
                    <ArrowRightLeft size={14} /> 타석 이동
                  </button>
                </>
              )}
              {selectedBay.hasProjector && (
                <button
                  onClick={() => {
                    toggleProjector(selectedBay.id);
                    setSelectedBay(prev => prev ? { ...prev, projectorOn: !prev.projectorOn } : prev);
                  }}
                  className={cn(
                    'flex items-center gap-xs px-md py-sm rounded-lg text-[13px] font-medium border transition-colors',
                    selectedBay.projectorOn
                      ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'
                      : 'border-line text-content-secondary hover:bg-surface-tertiary'
                  )}
                >
                  <Power size={14} /> 프로젝터 {selectedBay.projectorOn ? 'ON' : 'OFF'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ── 타석 이동 모달 ─────────────────────────────────────── */}
      <Modal
        isOpen={moveModalOpen}
        onClose={() => setMoveModalOpen(false)}
        title="타석 이동"
        size="sm"
        footer={
          <div className="flex justify-end gap-sm">
            <button
              className="px-md py-[6px] border border-line rounded-lg text-[13px] text-content-secondary hover:bg-surface-tertiary"
              onClick={() => setMoveModalOpen(false)}
            >
              취소
            </button>
            <button
              className="px-md py-[6px] bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary-dark disabled:opacity-50"
              onClick={handleMove}
              disabled={!moveTargetId}
            >
              이동 확인
            </button>
          </div>
        }
      >
        <div className="space-y-sm">
          <p className="text-[13px] text-content">
            <strong>{selectedBay?.memberName}</strong>님을 이동할 타석을 선택하세요.
          </p>
          <div className="grid grid-cols-4 gap-sm">
            {bays.filter(b => b.status === 'available').map(bay => (
              <button
                key={bay.id}
                onClick={() => setMoveTargetId(bay.id)}
                className={cn(
                  'p-sm rounded-lg border-2 text-center transition-colors',
                  moveTargetId === bay.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-line bg-surface hover:border-primary/40'
                )}
              >
                <span className="text-[16px] font-bold">{bay.id}</span>
                <p className="text-[10px] text-content-tertiary">대기</p>
              </button>
            ))}
          </div>
          {bays.filter(b => b.status === 'available').length === 0 && (
            <p className="text-[13px] text-content-tertiary text-center py-md">이동 가능한 타석이 없습니다.</p>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
