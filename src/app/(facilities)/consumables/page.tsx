'use client';
export const dynamic = 'force-dynamic';

import React, { useMemo, useState } from 'react';
import { Plus, ShoppingCart, ArrowDownUp, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import StatCardGrid from '@/components/common/StatCardGrid';
import StatusBadge from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
  ConsumableRegisterModal,
  ConsumableStockModal,
  ConsumableOrderModal,
} from '@/components/common/FacilityModals';
import {
  MOCK_CONSUMABLES,
  type FacilityConsumable,
  type ConsumableStatus,
  type ConsumableCategory,
} from '@/mocks/facility';

// SCR-057 소모품 재고 관리 (docs4/V2/D06-시설관리/시설관리.md ## SCR-057)
// 호스트 다이얼로그: DLG-057-001 소모품 등록 / DLG-057-002 입출고 처리 / DLG-057-003 발주 생성

const STATUS_BADGE: Record<ConsumableStatus, { variant: 'success' | 'warning' | 'error'; label: string }> = {
  정상: { variant: 'success', label: '정상 재고' },
  부족: { variant: 'error', label: '재고 부족' },
  없음: { variant: 'error', label: '재고 없음' },
  발주대기: { variant: 'warning', label: '발주 대기' },
};

/** 현재 재고/안전 재고로 상태 재계산 */
function deriveStatus(stock: number, safetyStock: number, prev: ConsumableStatus): ConsumableStatus {
  if (prev === '발주대기') return '발주대기';
  if (stock <= 0) return '없음';
  if (stock <= safetyStock) return '부족';
  return '정상';
}

type LoadState = 'loading' | 'error' | 'ready';

export default function ConsumablesPage() {
  // 명세 4번 핵심 상태: 로딩/정상/오류 — mock 환경에서 새로고침으로 시연
  const [loadState, setLoadState] = useState<LoadState>('ready');
  const [items, setItems] = useState<FacilityConsumable[]>(MOCK_CONSUMABLES);
  const [filter, setFilter] = useState<'전체' | ConsumableStatus>('전체');

  const [registerOpen, setRegisterOpen] = useState(false);
  const [stockTarget, setStockTarget] = useState<FacilityConsumable | null>(null);
  const [orderTarget, setOrderTarget] = useState<FacilityConsumable | null>(null);

  const stats = useMemo(() => ({
    total: items.length,
    low: items.filter((i) => i.status === '부족' || i.status === '없음').length,
    pending: items.filter((i) => i.status === '발주대기').length,
  }), [items]);

  const lowItems = useMemo(() => items.filter((i) => i.status === '부족' || i.status === '없음'), [items]);
  const filtered = filter === '전체' ? items : items.filter((i) => i.status === filter);

  // ─── 핸들러 (mock 상태 갱신) ──────────────────────────────────────────────
  const handleRegister = (p: { name: string; category: ConsumableCategory; unit: string; safetyStock: number; stock: number; supplier: string }) => {
    setItems((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((i) => i.id)) + 1,
        name: p.name, category: p.category, unit: p.unit, stock: p.stock, safetyStock: p.safetyStock,
        lastIn: p.stock > 0 ? new Date().toISOString().slice(0, 10) : null, lastOut: null,
        supplier: p.supplier || undefined,
        status: deriveStatus(p.stock, p.safetyStock, '정상'),
      },
    ]);
  };

  const handleStock = (target: FacilityConsumable, p: { kind: '입고' | '출고'; qty: number; date: string; supplierOrReason: string }) => {
    setItems((prev) => prev.map((i) => {
      if (i.id !== target.id) return i;
      const nextStock = p.kind === '입고' ? i.stock + p.qty : Math.max(i.stock - p.qty, 0);
      return {
        ...i,
        stock: nextStock,
        lastIn: p.kind === '입고' ? p.date : i.lastIn,
        lastOut: p.kind === '출고' ? p.date : i.lastOut,
        supplier: p.kind === '입고' && p.supplierOrReason ? p.supplierOrReason : i.supplier,
        // 전체 입고 시 발주 대기 자동 해제
        status: deriveStatus(nextStock, i.safetyStock, i.status === '발주대기' && p.kind === '입고' ? '정상' : i.status),
      };
    }));
  };

  const handleOrder = (target: FacilityConsumable) => {
    setItems((prev) => prev.map((i) => (i.id === target.id ? { ...i, status: '발주대기' } : i)));
  };

  return (
    <AppLayout>
      <PageHeader
        title="소모품 재고 관리"
        description="센터 운영 소모품의 재고를 추적하고 입출고·발주를 관리합니다."
        actions={
          <div className="flex items-center gap-sm">
            <Button type="button" variant="outline" size="md" icon={<RefreshCw size={14} className={loadState === 'loading' ? 'animate-spin' : ''} />}
              onClick={() => { setLoadState('loading'); setTimeout(() => { setItems(MOCK_CONSUMABLES); setLoadState('ready'); }, 500); }}>
              새로고침
            </Button>
            <Button type="button" variant="primary" size="md" icon={<Plus size={14} />} onClick={() => setRegisterOpen(true)}>
              소모품 등록
            </Button>
          </div>
        }
      />

      {/* 오류 상태 */}
      {loadState === 'error' && (
        <div className="mb-lg flex items-center justify-between rounded-2xl border border-state-error/40 bg-red-50 px-lg py-md text-[13px] text-state-error">
          <span>재고 정보를 불러오지 못했습니다. 다시 시도해주세요.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setLoadState('ready')}>재시도</Button>
        </div>
      )}

      {/* 현황 요약 카드 */}
      <StatCardGrid cols={3} className="mb-lg">
        <StatCard label="전체 품목" value={`${stats.total}종`} icon={<Package />} />
        <StatCard label="재고 부족" value={`${stats.low}종`} icon={<AlertTriangle />} variant={stats.low > 0 ? 'peach' : undefined} />
        <StatCard label="발주 대기" value={`${stats.pending}건`} icon={<ShoppingCart />} variant={stats.pending > 0 ? 'mint' : undefined} />
      </StatCardGrid>

      {/* 로딩 스켈레톤 */}
      {loadState === 'loading' ? (
        <div className="space-y-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-line bg-surface-secondary/60" />
          ))}
        </div>
      ) : items.length === 0 ? (
        // 빈 상태: 원인 + 다음 액션
        <div className="rounded-3xl border border-line bg-white">
          <EmptyState icon={Package} title="등록된 소모품이 없습니다"
            description="아직 등록된 소모품이 없습니다. 소모품을 등록하면 재고를 추적하고 발주할 수 있습니다."
            action={{ label: '소모품 등록', onClick: () => setRegisterOpen(true) }} />
        </div>
      ) : (
        <>
          {/* 재고 부족 알림 영역 */}
          {lowItems.length > 0 && (
            <div className="mb-lg rounded-2xl border border-state-error/30 bg-red-50/70 p-lg">
              <div className="mb-sm flex items-center gap-xs text-[13px] font-bold text-state-error">
                <AlertTriangle size={15} /> 재고 부족 — 발주가 필요한 품목 {lowItems.length}종
              </div>
              <div className="flex flex-wrap gap-sm">
                {lowItems.map((i) => (
                  <button key={i.id} type="button" onClick={() => setOrderTarget(i)}
                    className="flex items-center gap-xs rounded-full border border-state-error/40 bg-white px-3 py-1 text-[12px] font-semibold text-state-error hover:bg-red-50">
                    {i.name} <span className="tabular-nums">{i.stock}{i.unit}</span> · 발주
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 상태 필터 */}
          <div className="mb-md flex flex-wrap gap-sm">
            {(['전체', '정상', '부족', '없음', '발주대기'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                  filter === f ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
                {f === '전체' ? '전체' : STATUS_BADGE[f].label}
              </button>
            ))}
          </div>

          {/* 소모품 목록 테이블 */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-secondary/60 text-content-secondary">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">품목명</th>
                  <th className="px-4 py-3 text-left font-semibold">카테고리</th>
                  <th className="px-4 py-3 text-right font-semibold">현재 재고</th>
                  <th className="px-4 py-3 text-right font-semibold">안전 재고</th>
                  <th className="px-4 py-3 text-left font-semibold">최근 입고/출고</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-right font-semibold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {filtered.map((i) => {
                  const badge = STATUS_BADGE[i.status];
                  const isLow = i.status === '부족' || i.status === '없음';
                  return (
                    <tr key={i.id} className="text-content hover:bg-surface-secondary/40">
                      <td className="px-4 py-3 font-semibold">{i.name}</td>
                      <td className="px-4 py-3 text-content-secondary">{i.category}</td>
                      <td className={cn('px-4 py-3 text-right font-bold tabular-nums', isLow && 'text-state-error')}>{i.stock}{i.unit}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-content-secondary">{i.safetyStock}{i.unit}</td>
                      <td className="px-4 py-3 text-[12px] text-content-secondary">입 {i.lastIn ?? '-'} / 출 {i.lastOut ?? '-'}</td>
                      <td className="px-4 py-3"><StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-xs">
                          <Button type="button" variant="outline" size="sm" icon={<ArrowDownUp size={13} />} onClick={() => setStockTarget(i)}>입출고</Button>
                          <Button type="button" variant="ghost" size="sm" icon={<ShoppingCart size={13} />} onClick={() => setOrderTarget(i)}>발주</Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px] text-content-tertiary">조건에 맞는 품목이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── 다이얼로그 (DLG-057-001/002/003) ── */}
      <ConsumableRegisterModal isOpen={registerOpen} onClose={() => setRegisterOpen(false)} existing={items} onSubmit={handleRegister} />
      <ConsumableStockModal isOpen={stockTarget !== null} onClose={() => setStockTarget(null)} target={stockTarget}
        onSubmit={(p) => { if (stockTarget) handleStock(stockTarget, p); }} />
      <ConsumableOrderModal isOpen={orderTarget !== null} onClose={() => setOrderTarget(null)} target={orderTarget}
        onSubmit={() => { if (orderTarget) handleOrder(orderTarget); }} />
    </AppLayout>
  );
}
