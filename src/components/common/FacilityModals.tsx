'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, ClipboardCheck, Wrench, ShoppingCart, ArrowDownUp, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Textarea from '@/components/ui/Textarea';
import { cn } from '@/lib/utils';
import type {
  FacilityEquipment,
  EquipmentType,
  FacilityConsumable,
  ConsumableCategory,
  CleaningCycle,
  FacilityStaff,
} from '@/mocks/facility';

// ─── D06 시설관리 다이얼로그 모음 ─────────────────────────────────────────────
// 호스트: /equipment-check (DLG-056-001~003), /consumables (DLG-057-001~003), /cleaning-schedule (DLG-058-001)
// docs4/V2/D06-시설관리/시설관리.md ## DLG-056-001 ~ ## DLG-058-001
// 공통 색상/토스트 규칙은 _공통/디자인_시스템.md, _공통/토스트_메시지.md 를 따른다.

/** 오늘 날짜 yyyy-mm-dd */
const today = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** yyyy-mm-dd 에 days 더한 날짜 */
const addDays = (base: string, days: number): string => {
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return base;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ════════════════════════════════════════════════════════════════════════════
// DLG-056-001 장비 등록
// ════════════════════════════════════════════════════════════════════════════
const EQUIP_TYPES: { value: EquipmentType; label: EquipmentType }[] = [
  { value: '유산소기구', label: '유산소기구' },
  { value: '웨이트기구', label: '웨이트기구' },
  { value: 'GX장비', label: 'GX장비' },
  { value: '기타', label: '기타' },
];

const CYCLE_OPTIONS = [
  { value: '30', label: '30일' },
  { value: '90', label: '90일' },
  { value: '180', label: '180일' },
  { value: '365', label: '365일' },
];

export interface EquipmentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existing: FacilityEquipment[];
  onSubmit: (payload: { name: string; type: EquipmentType; location: string; cycleDays: number; nextCheck: string; memo: string }) => void;
}

export function EquipmentRegisterModal({ isOpen, onClose, existing, onSubmit }: EquipmentRegisterModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EquipmentType>('유산소기구');
  const [location, setLocation] = useState('');
  const [cycle, setCycle] = useState('');
  const [nextCheck, setNextCheck] = useState(today());
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(''); setType('유산소기구'); setLocation(''); setCycle('');
      setNextCheck(today()); setMemo(''); setSaving(false);
    }
  }, [isOpen]);

  // 장비명+위치 중복 검사
  const duplicated = existing.some(
    (e) => e.name.trim() === name.trim() && e.location.trim() === location.trim() && name.trim() !== '',
  );
  const pastDate = nextCheck < today(); // 점검 예정일 과거 차단
  const noCycle = !cycle;
  const blocked = !name.trim() || !location.trim() || noCycle || pastDate || duplicated;

  const handleSubmit = async () => {
    if (!name.trim() || !location.trim()) { toast.error('장비명과 설치 위치를 입력하세요.'); return; }
    if (duplicated) { toast.error('동일 장비명과 위치가 이미 존재합니다.'); return; }
    if (noCycle) { toast.error('점검 주기를 선택하세요.'); return; }
    if (pastDate) { toast.error('점검 예정일은 과거 일자를 선택할 수 없습니다.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ name: name.trim(), type, location: location.trim(), cycleDays: Number(cycle), nextCheck, memo: memo.trim() });
    toast.success('저장되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="장비 등록"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <Input size="md" label="장비명 *" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 트레드밀 1번"
          error={duplicated ? '동일 장비명 + 위치가 존재합니다' : undefined} />
        <Select label="장비 유형 *" options={EQUIP_TYPES} value={type} onChange={(v) => setType(v as EquipmentType)} />
        <Input size="md" label="설치 위치 *" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: A존" />
        <Select label="점검 주기 *" options={CYCLE_OPTIONS} value={cycle} onChange={setCycle} placeholder="점검 주기 선택" />
        <Input size="md" type="date" label="첫 점검 예정일 *" value={nextCheck} onChange={(e) => setNextCheck(e.target.value)}
          error={pastDate ? '과거 일자 불가' : undefined} />
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">메모</p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="추가 설명 (선택)" rows={2} />
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-056-002 점검 등록
// ════════════════════════════════════════════════════════════════════════════
const CHECK_RESULTS = [
  { value: '정상', label: '정상' },
  { value: '이상', label: '이상 발견' },
];

export interface EquipmentCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: FacilityEquipment | null;
  staff: FacilityStaff[];
  onSubmit: (payload: { date: string; checker: string; result: '정상' | '이상'; issue: string; nextCheck: string }) => void;
}

export function EquipmentCheckModal({ isOpen, onClose, target, staff, onSubmit }: EquipmentCheckModalProps) {
  const [date, setDate] = useState(today());
  const [checker, setChecker] = useState('');
  const [result, setResult] = useState<'정상' | '이상'>('정상');
  const [issue, setIssue] = useState('');
  const [nextCheck, setNextCheck] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setDate(today());
      setChecker('');
      setResult('정상');
      setIssue('');
      // 점검 완료일 + 점검 주기 → 다음 예정일 자동 계산
      setNextCheck(addDays(today(), target.cycleDays));
      setSaving(false);
    }
  }, [isOpen, target]);

  // 점검 완료일이 바뀌면 다음 예정일 재산정
  useEffect(() => {
    if (isOpen && target) setNextCheck(addDays(date, target.cycleDays));
  }, [date, isOpen, target]);

  if (!target) return null;

  const noStaff = staff.length === 0; // 담당자 검색 0건
  const abnormalNoIssue = result === '이상' && !issue.trim(); // 이상 발견 시 내용 필수
  const blocked = !checker.trim() || abnormalNoIssue || noStaff;

  const handleSubmit = async () => {
    if (noStaff) { toast.error('직원을 등록한 후 다시 시도하세요.'); return; }
    if (!checker.trim()) { toast.error('점검자를 선택하세요.'); return; }
    if (abnormalNoIssue) { toast.error('이상 내용을 입력하세요.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ date, checker, result, issue: issue.trim(), nextCheck });
    toast.success('저장되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`점검 등록 — ${target.name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<ClipboardCheck size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <span className="text-[13px] font-bold text-content">{target.name}</span>
          <p className="mt-[2px] text-[12px] text-content-secondary">{target.location} · 점검 주기 {target.cycleDays}일</p>
        </div>
        <Input size="md" type="date" label="점검 완료일 *" value={date} onChange={(e) => setDate(e.target.value)} />
        {noStaff ? (
          <div className="rounded-xl border border-state-error/40 bg-red-50 px-md py-sm text-[12px] text-state-error">직원을 등록 후 다시 시도하세요.</div>
        ) : (
          <Select label="점검자 *" options={staff.map((s) => ({ value: s.name, label: s.name }))} value={checker} onChange={setChecker} placeholder="점검 담당자 선택" />
        )}
        <Select label="점검 결과 *" options={CHECK_RESULTS} value={result} onChange={(v) => setResult(v as '정상' | '이상')} />
        {result === '이상' && (
          <div>
            <p className="mb-xs text-[12px] font-semibold text-content-secondary">이상 내용 <span className="text-state-error">*</span></p>
            <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="발견된 이상 내용을 입력하세요" rows={2} />
            <p className="mt-xs text-[12px] text-amber-600">이상이 발견된 경우 수리 접수를 권장합니다.</p>
          </div>
        )}
        <Input size="md" type="date" label="다음 점검 예정일 (자동 계산)" value={nextCheck} onChange={(e) => setNextCheck(e.target.value)} />
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-056-003 수리 등록 (접수 / 완료)
// ════════════════════════════════════════════════════════════════════════════
export interface EquipmentRepairModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: FacilityEquipment | null;
  /** 이미 수리중인 장비면 완료 처리 모드 */
  mode: 'open' | 'complete';
  onSubmit: (payload: { mode: 'open' | 'complete'; issue: string; date: string; vendor: string; expectedDate: string; result: string; cost: string }) => void;
}

export function EquipmentRepairModal({ isOpen, onClose, target, mode, onSubmit }: EquipmentRepairModalProps) {
  const [issue, setIssue] = useState('');
  const [date, setDate] = useState(today());
  const [vendor, setVendor] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [result, setResult] = useState('');
  const [cost, setCost] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      setIssue(target.issue ?? '');
      setDate(today());
      setVendor(target.repairVendor ?? '');
      setExpectedDate('');
      setResult('');
      setCost('');
      setSaving(false);
    }
  }, [isOpen, target]);

  if (!target) return null;

  // 접수: 고장 내용·담당자 필수 / 완료: 수리 결과 필수
  const blocked = mode === 'open' ? (!issue.trim() || !vendor.trim()) : !result.trim();

  const handleSubmit = async () => {
    if (mode === 'open') {
      if (!issue.trim()) { toast.error('고장 내용을 입력하세요.'); return; }
      if (!vendor.trim()) { toast.error('수리 담당 업체/담당자를 입력하세요.'); return; }
    } else if (!result.trim()) {
      toast.error('수리 결과를 입력하세요.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ mode, issue: issue.trim(), date, vendor: vendor.trim(), expectedDate, result: result.trim(), cost: cost.trim() });
    toast.success('저장되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'open' ? '수리 접수' : '수리 완료 기록'}
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<Wrench size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md">
          <span className="text-[13px] font-bold text-content">{target.name}</span>
          <p className="mt-[2px] text-[12px] text-content-secondary">{target.location}{target.repairOpenedAt ? ` · 접수일 ${target.repairOpenedAt}` : ''}</p>
        </div>
        {mode === 'open' ? (
          <>
            <div>
              <p className="mb-xs text-[12px] font-semibold text-content-secondary">고장 내용 <span className="text-state-error">*</span></p>
              <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="발견된 고장·이상 내용" rows={2} />
            </div>
            <Input size="md" type="date" label="수리 접수일 *" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input size="md" label="수리 업체/담당자 *" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="수리를 맡길 업체 또는 담당자" />
            <Input size="md" type="date" label="예상 완료일" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </>
        ) : (
          <>
            <Input size="md" type="date" label="수리 완료일 *" value={date} onChange={(e) => setDate(e.target.value)} />
            <div>
              <p className="mb-xs text-[12px] font-semibold text-content-secondary">수리 결과 <span className="text-state-error">*</span></p>
              <Textarea value={result} onChange={(e) => setResult(e.target.value)} placeholder="수리 완료 내용을 기록하세요" rows={2} />
            </div>
            <Input size="md" type="number" label="비용" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="수리 비용 (선택)" />
          </>
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-057-001 소모품 등록
// ════════════════════════════════════════════════════════════════════════════
const CONSUMABLE_CATEGORIES: { value: ConsumableCategory; label: ConsumableCategory }[] = [
  { value: '욕실용품', label: '욕실용품' },
  { value: '청소용품', label: '청소용품' },
  { value: '비품', label: '비품' },
  { value: '기타', label: '기타' },
];

export interface ConsumableRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  existing: FacilityConsumable[];
  onSubmit: (payload: { name: string; category: ConsumableCategory; unit: string; safetyStock: number; stock: number; supplier: string }) => void;
}

export function ConsumableRegisterModal({ isOpen, onClose, existing, onSubmit }: ConsumableRegisterModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ConsumableCategory>('욕실용품');
  const [unit, setUnit] = useState('');
  const [safety, setSafety] = useState('');
  const [stock, setStock] = useState('');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(''); setCategory('욕실용품'); setUnit(''); setSafety(''); setStock(''); setSupplier(''); setSaving(false);
    }
  }, [isOpen]);

  const duplicated = existing.some((c) => c.name.trim() === name.trim() && name.trim() !== ''); // 품목명 중복
  const safetyNum = Number(safety);
  const invalidSafety = safety === '' || Number.isNaN(safetyNum) || safetyNum < 1; // 안전 재고 1 이상
  const stockNum = Number(stock);
  const invalidStock = stock !== '' && (Number.isNaN(stockNum) || stockNum < 0);
  const blocked = !name.trim() || !unit.trim() || invalidSafety || invalidStock || duplicated;

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('품목명을 입력하세요.'); return; }
    if (duplicated) { toast.error('동일 품목명이 이미 존재합니다.'); return; }
    if (!unit.trim()) { toast.error('단위를 입력하세요.'); return; }
    if (invalidSafety) { toast.error('안전 재고 기준을 1 이상 입력하세요.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ name: name.trim(), category, unit: unit.trim(), safetyStock: safetyNum, stock: stock === '' ? 0 : stockNum, supplier: supplier.trim() });
    toast.success('저장되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="소모품 등록"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <Input size="md" label="품목명 *" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 샴푸 500ml"
          error={duplicated ? '동일 품목명 존재' : undefined} />
        <Select label="카테고리 *" options={CONSUMABLE_CATEGORIES} value={category} onChange={(v) => setCategory(v as ConsumableCategory)} />
        <Input size="md" label="단위 *" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="예: 개, 박스, L" />
        <Input size="md" type="number" label="안전 재고 기준 *" value={safety} onChange={(e) => setSafety(e.target.value)} placeholder="1 이상"
          error={safety !== '' && invalidSafety ? '1 이상의 수량을 입력하세요' : undefined} />
        <Input size="md" type="number" label="초기 재고 수량" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0 이상 (선택)"
          error={invalidStock ? '0 이상의 수량을 입력하세요' : undefined} />
        <Input size="md" label="공급업체" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="주요 공급업체 (선택)" />
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-057-002 입출고 처리
// ════════════════════════════════════════════════════════════════════════════
const OUT_REASONS = [
  { value: '사용', label: '사용' },
  { value: '청소연계', label: '청소 연계' },
  { value: '폐기', label: '폐기' },
  { value: '기타', label: '기타' },
];

export interface ConsumableStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: FacilityConsumable | null;
  onSubmit: (payload: { kind: '입고' | '출고'; qty: number; date: string; supplierOrReason: string }) => void;
}

export function ConsumableStockModal({ isOpen, onClose, target, onSubmit }: ConsumableStockModalProps) {
  const [kind, setKind] = useState<'입고' | '출고'>('입고');
  const [qty, setQty] = useState('');
  const [date, setDate] = useState(today());
  const [supplier, setSupplier] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setKind('입고'); setQty(''); setDate(today()); setSupplier(''); setReason(''); setSaving(false); }
  }, [isOpen]);

  const current = target?.stock ?? 0;
  const qtyNum = Number(qty);
  const invalidQty = !qty || Number.isNaN(qtyNum) || qtyNum <= 0; // 입고/출고 1 이상
  const overStock = kind === '출고' && qtyNum > current; // 출고 > 재고 차단
  const noReason = kind === '출고' && !reason; // 출고 사유 필수
  const blocked = invalidQty || overStock || noReason;
  const projected = useMemo(() => {
    if (invalidQty) return current;
    return kind === '입고' ? current + qtyNum : Math.max(current - qtyNum, 0);
  }, [current, kind, qtyNum, invalidQty]);

  if (!target) return null;

  const handleSubmit = async () => {
    if (invalidQty) { toast.error('처리 수량을 1 이상 입력하세요.'); return; }
    if (overStock) { toast.error(`현재 재고(${current}${target.unit})보다 많은 수량을 출고할 수 없습니다.`); return; }
    if (noReason) { toast.error('출고 사유를 선택하세요.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ kind, qty: qtyNum, date, supplierOrReason: kind === '입고' ? supplier.trim() : reason });
    toast.success('처리되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`입출고 처리 — ${target.name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<ArrowDownUp size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        {/* 입고/출고 탭 */}
        <div className="grid grid-cols-2 gap-sm">
          {(['입고', '출고'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={cn('rounded-xl border px-md py-sm text-[13px] font-semibold transition-colors',
                kind === k ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content-secondary hover:border-primary/40')}>
              {k}
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md text-[12px] text-content-secondary">
          현재 재고 <span className="font-bold text-content">{current}{target.unit}</span>
          {!invalidQty && (
            <span className="ml-2">→ 처리 후 예상 <span className={cn('font-bold', kind === '입고' ? 'text-state-success' : 'text-blue-600')}>{projected}{target.unit}</span></span>
          )}
        </div>
        <Input size="md" type="number" label="처리 수량 *" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={kind === '출고' ? '현재 재고 이하' : '1 이상'}
          error={overStock ? `재고 초과 (현재: ${current})` : qty && invalidQty ? '1 이상의 수량을 입력하세요' : undefined} />
        <Input size="md" type="date" label="처리 일자 *" value={date} onChange={(e) => setDate(e.target.value)} />
        {kind === '입고' ? (
          <Input size="md" label="공급업체" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="납품 업체명 (선택)" />
        ) : (
          <Select label="출고 사유 *" options={OUT_REASONS} value={reason} onChange={setReason} placeholder="사유 선택" />
        )}
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-057-003 발주 생성
// ════════════════════════════════════════════════════════════════════════════
export interface ConsumableOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: FacilityConsumable | null;
  onSubmit: (payload: { qty: number; supplier: string; dueDate: string; memo: string }) => void;
}

export function ConsumableOrderModal({ isOpen, onClose, target, onSubmit }: ConsumableOrderModalProps) {
  const [qty, setQty] = useState('');
  const [supplier, setSupplier] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [memo, setMemo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && target) {
      // 안전 재고 이상 권장 수량 기본값 (안전 재고의 2배 - 현재 재고)
      const recommended = Math.max(target.safetyStock * 2 - target.stock, target.safetyStock);
      setQty(String(recommended));
      setSupplier(target.supplier ?? '');
      setDueDate('');
      setMemo('');
      setSaving(false);
    }
  }, [isOpen, target]);

  if (!target) return null;

  const qtyNum = Number(qty);
  const invalidQty = !qty || Number.isNaN(qtyNum) || qtyNum <= 0;
  const noSupplier = !supplier.trim(); // 공급업체 필수
  const reorderWarn = target.status === '발주대기'; // 발주 대기 중 재발주 경고
  const blocked = invalidQty || noSupplier;

  const handleSubmit = async () => {
    if (invalidQty) { toast.error('발주 수량을 1 이상 입력하세요.'); return; }
    if (noSupplier) { toast.error('공급업체를 입력하세요.'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ qty: qtyNum, supplier: supplier.trim(), dueDate, memo: memo.trim() });
    toast.success('발주가 생성되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`발주 생성 — ${target.name}`}
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<ShoppingCart size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>발주서 생성</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <div className="rounded-xl border border-line bg-surface-secondary/50 p-md text-[12px] text-content-secondary">
          현재 재고 <span className="font-bold text-content">{target.stock}{target.unit}</span>
          <span className="ml-2">안전 재고 기준 <span className="font-bold text-content">{target.safetyStock}{target.unit}</span></span>
        </div>
        {reorderWarn && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-md py-sm text-[12px] text-amber-700">
            이미 발주 대기 중인 품목입니다. 추가 발주를 진행하시겠습니까?
          </div>
        )}
        <Input size="md" type="number" label="발주 수량 *" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="권장 수량 자동 입력됨"
          error={qty && invalidQty ? '1 이상의 수량을 입력하세요' : undefined} />
        <Input size="md" label="공급업체 *" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="발주할 공급업체"
          error={noSupplier ? '공급업체 입력' : undefined} />
        <Input size="md" type="date" label="희망 납기일" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div>
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">비고</p>
          <Textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="발주 특이사항 (선택)" rows={2} />
        </div>
      </div>
    </Modal>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DLG-058-001 청소 스케줄 등록
// ════════════════════════════════════════════════════════════════════════════
const CLEANING_CYCLES: { value: CleaningCycle; label: string }[] = [
  { value: '일일', label: '일일 청소' },
  { value: '주간', label: '주간 청소' },
  { value: '월간', label: '월간 청소' },
];

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export interface CleaningScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingAreas: string[];
  staff: FacilityStaff[];
  onSubmit: (payload: { area: string; cycle: CleaningCycle; assignee: string | null; scheduledTime: string; detail: string; startDate: string }) => void;
}

export function CleaningScheduleModal({ isOpen, onClose, existingAreas, staff, onSubmit }: CleaningScheduleModalProps) {
  const [area, setArea] = useState('');
  const [cycle, setCycle] = useState<CleaningCycle | ''>('');
  const [assignee, setAssignee] = useState('');
  const [time, setTime] = useState('');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [monthDay, setMonthDay] = useState('');
  const [startDate, setStartDate] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setArea(''); setCycle(''); setAssignee(''); setTime('');
      setWeekdays([]); setMonthDay(''); setStartDate(today()); setSaving(false);
    }
  }, [isOpen]);

  const duplicated = existingAreas.some((a) => a.trim() === area.trim() && area.trim() !== ''); // 구역명 중복
  const noCycle = !cycle; // 주기 미선택
  const noTime = !time; // 예정 시간 필수
  const noAssignee = !assignee; // 담당자 미지정 → 경고 (저장은 가능)
  const blocked = !area.trim() || noCycle || noTime || duplicated;

  const detailText = (): string => {
    if (cycle === '주간') return weekdays.length ? `매주 ${weekdays.join('·')}` : '매주';
    if (cycle === '월간') return monthDay ? `매월 ${monthDay}일` : '매월';
    return '매일';
  };

  const handleSubmit = async () => {
    if (!area.trim()) { toast.error('구역명을 입력하세요.'); return; }
    if (duplicated) { toast.error('동일 구역명이 이미 존재합니다.'); return; }
    if (noCycle) { toast.error('청소 주기를 선택하세요.'); return; }
    if (noTime) { toast.error('예정 시간을 입력하세요.'); return; }
    if (noAssignee && !window.confirm('담당자가 지정되지 않았습니다. 이대로 저장하시겠습니까?')) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    onSubmit({ area: area.trim(), cycle: cycle as CleaningCycle, assignee: assignee || null, scheduledTime: time, detail: detailText(), startDate });
    toast.success('청소 스케줄이 등록되었습니다.');
    onClose();
  };

  const toggleWeekday = (d: string) =>
    setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="청소 스케줄 등록"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>취소</Button>
          <Button variant="primary" size="sm" icon={<CalendarPlus size={14} />} loading={saving} disabled={blocked} onClick={handleSubmit}>저장</Button>
        </div>
      }
    >
      <div className="space-y-md">
        <Input size="md" label="구역명 *" value={area} onChange={(e) => setArea(e.target.value)} placeholder="예: 남자 탈의실, GX룸, 로비"
          error={duplicated ? '동일 구역명 존재' : undefined} />
        <Select label="청소 유형 *" options={CLEANING_CYCLES} value={cycle} onChange={(v) => setCycle(v as CleaningCycle)} placeholder="주기 선택" />
        <Select label="담당자" options={[{ value: '', label: '미지정' }, ...staff.map((s) => ({ value: s.name, label: s.name }))]} value={assignee} onChange={setAssignee} placeholder="담당 직원 선택" />
        <Input size="md" type="time" label="예정 시간 *" value={time} onChange={(e) => setTime(e.target.value)} />
        {cycle === '주간' && (
          <div>
            <p className="mb-xs text-[12px] font-semibold text-content-secondary">요일 선택</p>
            <div className="flex flex-wrap gap-xs">
              {WEEKDAYS.map((d) => (
                <button key={d} type="button" onClick={() => toggleWeekday(d)}
                  className={cn('h-8 w-8 rounded-full border text-[12px] font-semibold transition-colors',
                    weekdays.includes(d) ? 'border-primary bg-primary text-white' : 'border-line text-content-secondary hover:border-primary/40')}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        {cycle === '월간' && (
          <Input size="md" type="number" label="매월 일자" value={monthDay} onChange={(e) => setMonthDay(e.target.value)} placeholder="1 ~ 31" />
        )}
        <Input size="md" type="date" label="시작일 *" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        {noAssignee && <p className="text-[12px] text-amber-600">담당자를 지정하지 않으면 미지정 상태로 등록됩니다.</p>}
      </div>
    </Modal>
  );
}
