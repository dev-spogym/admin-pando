'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';

// ─── D05 재고 다이얼로그 모음 (호스트: /products/inventory) ──────────────────────
// DLG-P019 입고 등록 / DLG-P020 출고 등록 / DLG-P021 재고 수동 조정 / DLG-P022 입출고 이력
// docs4/V2/D05-상품관리/상품관리.md ## DLG-P019 ~ ## DLG-P022
// 공통 색상/토스트 규칙은 _공통/디자인_시스템.md, _공통/토스트_메시지.md 를 따른다.

/** 재고 행 (inventory 페이지 seed item과 동일 형태) */
export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  stock: number;
  sold: number;
  remaining: number;
  alert: boolean;
}

/** 입출고 이력 행 */
export interface InventoryHistoryRow {
  date: string;
  product: string;
  type: '입고' | '출고' | '조정' | '판매';
  qty: number;
  balance: number;
  reason?: string;
  handler?: string;
}

/** 오늘 날짜 yyyy-mm-dd */
const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ─── DLG-P019 입고 등록 ──────────────────────────────────────────────────────
export interface StockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: InventoryItem | null;
  /** 입고 처리 완료 콜백 (호스트 재고 갱신) */
  onSubmit: (payload: { qty: number; date: string; supplier: string; memo: string }) => void;
}

export function StockInModal({ isOpen, onClose, target, onSubmit }: StockInModalProps) {
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQty('');
      setDate(today());
      setSupplier('');
      setMemo('');
      setSaving(false);
    }
  }, [isOpen]);

  if (!target) return null;

  const qtyNum = Number(qty);
  // 입고 수량 1 이상 필수
  const invalidQty = !qty || Number.isNaN(qtyNum) || qtyNum <= 0;

  const handleSubmit = async () => {
    if (invalidQty) {
      toast.error('입고 수량을 1 이상 입력하세요.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500)); // mock 처리
    setSaving(false);
    onSubmit({ qty: qtyNum, date, supplier: supplier.trim(), memo: memo.trim() });
    toast.success('처리되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="입고 등록"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" icon={<ArrowDown size={14} />} loading={saving} disabled={invalidQty} onClick={handleSubmit}>
            입고 등록
          </Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <span className="text-[13px] font-bold text-content">{target.name}</span>
          <p className="mt-[2px] text-[12px] text-content-secondary">현재 재고 {target.remaining}개 · {target.category}</p>
        </div>
        <Input
          size="md"
          type="number"
          label="입고 수량 *"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="입고할 개수 (1 이상)"
          error={qty && invalidQty ? '1 이상의 수량을 입력하세요' : undefined}
        />
        <Input size="md" type="date" label="입고일 *" value={date} onChange={(e) => setDate(e.target.value)} />
        <Input size="md" label="공급처" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="납품 업체명 (선택)" />
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">메모</p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="특이사항 기록 (선택)" rows={2} />
        </div>
      </div>
    </Modal>
  );
}

// ─── DLG-P020 출고 등록 ──────────────────────────────────────────────────────
const OUT_REASONS = [
  { value: '판매', label: '판매' },
  { value: '사용', label: '사용' },
  { value: '폐기', label: '폐기' },
  { value: '기타', label: '기타' },
];

export interface StockOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: InventoryItem | null;
  onSubmit: (payload: { qty: number; reason: string; date: string; memo: string }) => void;
}

export function StockOutModal({ isOpen, onClose, target, onSubmit }: StockOutModalProps) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQty('');
      setReason('');
      setDate(today());
      setMemo('');
      setSaving(false);
    }
  }, [isOpen]);

  if (!target) return null;

  const qtyNum = Number(qty);
  const invalidQty = !qty || Number.isNaN(qtyNum) || qtyNum <= 0;
  // 출고 수량 > 현재 재고 차단
  const overStock = qtyNum > target.remaining;
  // 폐기 사유는 비고(메모) 필수
  const memoRequired = reason === '폐기' && !memo.trim();
  const blocked = invalidQty || overStock || !reason || memoRequired;

  const handleSubmit = async () => {
    if (invalidQty) {
      toast.error('출고 수량을 1 이상 입력하세요.');
      return;
    }
    if (overStock) {
      toast.error('재고 수량이 부족합니다.');
      return;
    }
    if (!reason) {
      toast.error('출고 사유를 선택하세요.');
      return;
    }
    if (memoRequired) {
      toast.error('폐기 사유는 메모를 입력하세요.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500)); // mock 처리
    setSaving(false);
    onSubmit({ qty: qtyNum, reason, date, memo: memo.trim() });
    toast.success('처리되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="출고 등록"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" icon={<ArrowUp size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>
            출고 처리
          </Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <span className="text-[13px] font-bold text-content">{target.name}</span>
          <p className="mt-[2px] text-[12px] text-content-secondary">현재 재고 {target.remaining}개 · {target.category}</p>
        </div>
        <Input
          size="md"
          type="number"
          label="출고 수량 *"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          placeholder="현재 재고 이하"
          error={overStock ? '현재 재고 초과 불가' : qty && invalidQty ? '1 이상의 수량을 입력하세요' : undefined}
        />
        <Select label="출고 사유 *" options={OUT_REASONS} value={reason} onChange={setReason} placeholder="사유 선택" />
        <Input size="md" type="date" label="출고일 *" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">
            메모{reason === '폐기' && <span className="text-state-error"> *</span>}
          </p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder={reason === '폐기' ? '폐기 사유 필수' : '특이사항 기록 (선택)'} rows={2} />
          {memoRequired && <p className="mt-xs text-[12px] text-state-error">폐기 사유는 메모를 입력하세요.</p>}
        </div>
      </div>
    </Modal>
  );
}

// ─── DLG-P021 재고 수동 조정 ─────────────────────────────────────────────────
const ADJUST_REASONS = [
  { value: '분실', label: '분실' },
  { value: '파손', label: '파손' },
  { value: '오류 수정', label: '오류 수정' },
  { value: '기타', label: '기타' },
];

export interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: InventoryItem | null;
  onSubmit: (payload: { actual: number; reason: string; date: string; memo: string }) => void;
}

export function StockAdjustModal({ isOpen, onClose, target, onSubmit }: StockAdjustModalProps) {
  const [actual, setActual] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(today());
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActual('');
      setReason('');
      setDate(today());
      setMemo('');
      setSaving(false);
    }
  }, [isOpen]);

  const current = target?.remaining ?? 0;
  const actualNum = Number(actual);
  const diff = useMemo(() => (actual === '' || Number.isNaN(actualNum) ? null : actualNum - current), [actual, actualNum, current]);

  if (!target) return null;

  const invalidActual = actual === '' || Number.isNaN(actualNum) || actualNum < 0; // 0 미만 차단
  const noChange = diff === 0; // 차이 0 → 저장 차단
  const noReason = !reason;
  const blocked = invalidActual || noChange || noReason;

  const handleSubmit = async () => {
    if (invalidActual) {
      toast.error('실제 재고 수량을 0 이상 입력하세요.');
      return;
    }
    if (noChange) {
      toast.error('변경 사항이 없습니다.');
      return;
    }
    if (noReason) {
      toast.error('조정 사유를 선택하세요.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500)); // mock 처리
    setSaving(false);
    onSubmit({ actual: actualNum, reason, date, memo: memo.trim() });
    toast.success('처리되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="재고 수동 조정"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" icon={<Settings2 size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>
            조정 적용
          </Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <span className="text-[13px] font-bold text-content">{target.name}</span>
          <p className="mt-[2px] text-[12px] text-content-secondary">현재 시스템 재고 {current}개 · {target.category}</p>
        </div>
        <Input
          size="md"
          type="number"
          label="실제 재고 수량 *"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="실사 후 확인된 수량"
          error={actual !== '' && invalidActual ? '0 이상의 수량을 입력하세요' : undefined}
        />
        {diff !== null && !invalidActual && (
          <div
            className={cn(
              'rounded-xl border px-md py-sm text-[12px] font-semibold',
              diff === 0 ? 'border-line text-content-tertiary' : diff > 0 ? 'border-state-success/40 text-state-success' : 'border-state-error/40 text-state-error'
            )}
          >
            조정 차이: {diff > 0 ? `+${diff}` : diff}개 {diff === 0 && '(변경 사항 없음)'}
          </div>
        )}
        <Select label="조정 사유 *" options={ADJUST_REASONS} value={reason} onChange={setReason} placeholder="사유 선택" />
        <Input size="md" type="date" label="조정일 *" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">메모</p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="상세 경위 기록 (선택)" rows={2} />
        </div>
      </div>
    </Modal>
  );
}

// ─── DLG-P022 입출고 이력 조회 ───────────────────────────────────────────────
const HISTORY_TYPES = [
  { value: '전체', label: '전체' },
  { value: '입고', label: '입고' },
  { value: '출고', label: '출고' },
  { value: '조정', label: '조정' },
];

const typeStyle: Record<string, string> = {
  입고: 'bg-green-100 text-green-700',
  출고: 'bg-blue-100 text-blue-700',
  판매: 'bg-blue-100 text-blue-700',
  조정: 'bg-amber-100 text-amber-700',
};

export interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 대상 상품명 (없으면 전체 이력) */
  productName?: string;
  rows: InventoryHistoryRow[];
}

export function StockHistoryModal({ isOpen, onClose, productName, rows }: StockHistoryModalProps) {
  const [typeFilter, setTypeFilter] = useState('전체');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypeFilter('전체');
      setFrom('');
      setTo('');
    }
  }, [isOpen]);

  const filtered = rows.filter((r) => {
    if (productName && r.product !== productName) return false;
    if (typeFilter !== '전체') {
      // '판매'는 출고 계열로 묶어서 출고 필터에 포함
      const norm = r.type === '판매' ? '출고' : r.type;
      if (norm !== typeFilter) return false;
    }
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productName ? `입출고 이력 · ${productName}` : '입출고 이력 조회'}
      size="xl"
      footer={
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      }
    >
      <div className="mb-md grid grid-cols-3 gap-sm">
        <Input size="sm" type="date" label="시작일" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input size="sm" type="date" label="종료일" value={to} onChange={(e) => setTo(e.target.value)} />
        <Select label="구분" options={HISTORY_TYPES} value={typeFilter} onChange={setTypeFilter} />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-content-tertiary">
          조회된 이력이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-[12px]">
            <thead className="bg-surface-secondary/60 text-content-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">날짜</th>
                <th className="px-3 py-2 text-left font-semibold">구분</th>
                {!productName && <th className="px-3 py-2 text-left font-semibold">상품</th>}
                <th className="px-3 py-2 text-right font-semibold">수량</th>
                <th className="px-3 py-2 text-right font-semibold">잔여 재고</th>
                <th className="px-3 py-2 text-left font-semibold">사유</th>
                <th className="px-3 py-2 text-left font-semibold">처리자</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/70">
              {filtered.map((r, i) => {
                const isIn = r.type === '입고';
                return (
                  <tr key={i} className="text-content">
                    <td className="px-3 py-2 tabular-nums">{r.date}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', typeStyle[r.type] ?? 'bg-gray-100 text-gray-600')}>
                        {r.type}
                      </span>
                    </td>
                    {!productName && <td className="px-3 py-2">{r.product}</td>}
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', isIn ? 'text-green-600' : 'text-blue-600')}>
                      {isIn ? '+' : '-'}
                      {r.qty}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.balance}</td>
                    <td className="px-3 py-2 text-content-secondary">{r.reason ?? '-'}</td>
                    <td className="px-3 py-2 text-content-secondary">{r.handler ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
