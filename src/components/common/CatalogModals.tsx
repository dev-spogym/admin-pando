'use client';

import React, { useEffect, useState } from 'react';
import { Printer, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import { cn } from '@/lib/utils';

// ─── D05 카탈로그 다이얼로그 모음 (호스트: /products/catalog) ────────────────────
// DLG-P016 카탈로그 미리보기 / DLG-P017 표시 옵션 설정 / DLG-P018 내용 편집
// docs4/V2/D05-상품관리/상품관리.md ## DLG-P016 / ## DLG-P017 / ## DLG-P018
// 공통 색상/토스트 규칙은 _공통/디자인_시스템.md, _공통/토스트_메시지.md 를 따른다.

/** 카탈로그 모달이 공유하는 상품 항목 (catalog 페이지 seed products와 동일 형태) */
export interface CatalogProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  desc: string;
  active: boolean;
  popular: boolean;
}

const catColor: Record<string, string> = {
  PT: 'bg-purple-100 text-purple-700',
  이용권: 'bg-blue-100 text-blue-700',
  GX: 'bg-green-100 text-green-700',
};

// ─── DLG-P016 카탈로그 미리보기 ──────────────────────────────────────────────
// 고객에게 보여질 카탈로그 화면을 읽기 전용으로 미리 확인. 인쇄/닫기.
export interface CatalogPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 미리보기 대상: 활성 상품만 표시 */
  products: CatalogProduct[];
  /** 옵션 설정값 반영 (가격 표시 여부 등) */
  showPrice?: boolean;
}

export function CatalogPreviewModal({ isOpen, onClose, products, showPrice = true }: CatalogPreviewModalProps) {
  // 카탈로그는 활성 상품만 노출 (비활성 제외)
  const visible = products.filter((p) => p.active);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="카탈로그 미리보기"
      size="xl"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
          <Button variant="primary" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            인쇄
          </Button>
        </div>
      }
    >
      <p className="mb-md text-[12px] text-content-tertiary">고객에게 보여질 화면입니다. 인쇄 또는 공유 전에 레이아웃을 점검하세요.</p>
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-content-tertiary">
          표시할 상품이 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {visible.map((p) => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', catColor[p.category] ?? 'bg-gray-100 text-gray-600')}>
                  {p.category}
                </span>
                {p.popular && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">인기</span>}
              </div>
              <h3 className="mb-1 text-sm font-bold text-gray-900">{p.name}</h3>
              <p className="mb-3 text-xs text-gray-500">{p.desc}</p>
              {showPrice && <p className="text-base font-bold text-blue-600">{p.price.toLocaleString()}원</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── DLG-P017 카탈로그 표시 옵션 설정 ────────────────────────────────────────
// 노출 항목/레이아웃/테마/로고 옵션 폼. 저장 시 카탈로그에 반영.
export interface CatalogDisplayOptions {
  showPrice: boolean;
  showDuration: boolean;
  groupByType: boolean;
  layout: 'card' | 'list';
  brandColor: boolean;
  showLogo: boolean;
}

/** CatalogDisplayOptions 중 boolean 값 키 (토글 항목) */
type BooleanOptionKey = 'showPrice' | 'showDuration' | 'groupByType' | 'brandColor' | 'showLogo';

export const DEFAULT_CATALOG_OPTIONS: CatalogDisplayOptions = {
  showPrice: true,
  showDuration: true,
  groupByType: true,
  layout: 'card',
  brandColor: false,
  showLogo: true,
};

export interface CatalogDisplayOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: CatalogDisplayOptions;
  onSave: (next: CatalogDisplayOptions) => void;
}

export function CatalogDisplayOptionsModal({ isOpen, onClose, value, onSave }: CatalogDisplayOptionsModalProps) {
  const [draft, setDraft] = useState<CatalogDisplayOptions>(value);
  const [saving, setSaving] = useState(false);

  // 열릴 때마다 현재 설정값으로 초기화
  useEffect(() => {
    if (isOpen) {
      setDraft(value);
      setSaving(false);
    }
  }, [isOpen, value]);

  /** boolean 토글 항목 전용 setter */
  const setBool = (key: BooleanOptionKey, v: boolean) => setDraft((d) => ({ ...d, [key]: v }));

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500)); // mock 저장
    setSaving(false);
    onSave(draft);
    toast.success('저장되었습니다.');
    onClose();
  };

  const toggleRows: { key: BooleanOptionKey; label: string }[] = [
    { key: 'showPrice', label: '가격 표시' },
    { key: 'showDuration', label: '기간/횟수 표시' },
    { key: 'groupByType', label: '상품 유형별 구분' },
    { key: 'brandColor', label: '센터 브랜드 색상 적용' },
    { key: 'showLogo', label: '센터 로고 표시' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="카탈로그 표시 옵션 설정"
      size="md"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" loading={saving} onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      <div className="space-y-sm">
        {toggleRows.map((row) => (
          <div key={row.key} className="flex items-center justify-between rounded-xl border border-line px-md py-sm">
            <span className="text-[13px] font-medium text-content">{row.label}</span>
            <Switch checked={draft[row.key]} onChange={(c) => setBool(row.key, c)} aria-label={row.label} />
          </div>
        ))}
        <div className="rounded-xl border border-line px-md py-sm">
          <p className="mb-xs text-[12px] font-semibold text-content-secondary">레이아웃</p>
          <div className="grid grid-cols-2 gap-sm">
            {(['card', 'list'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, layout: opt }))}
                className={cn(
                  'rounded-xl border px-md py-sm text-[13px] font-semibold transition-colors',
                  draft.layout === opt ? 'border-primary bg-primary/5 text-primary' : 'border-line text-content hover:bg-surface-secondary'
                )}
              >
                {opt === 'card' ? '카드형' : '리스트형'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── DLG-P018 카탈로그 내용 편집 ─────────────────────────────────────────────
// 상품별 노출 여부 토글 + 홍보 문구(50자) + 강조 태그 편집. 순서 변경(상/하 이동).
export interface CatalogContentItem {
  id: number;
  name: string;
  visible: boolean;
  comment: string;
  tag: string;
}

export interface CatalogEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: CatalogProduct[];
  onSave: (items: CatalogContentItem[]) => void;
}

const COMMENT_MAX = 50;

export function CatalogEditModal({ isOpen, onClose, products, onSave }: CatalogEditModalProps) {
  const [items, setItems] = useState<CatalogContentItem[]>([]);
  const [saving, setSaving] = useState(false);

  // 열릴 때마다 현재 상품 구성으로 편집 목록 초기화
  useEffect(() => {
    if (isOpen) {
      setItems(products.map((p) => ({ id: p.id, name: p.name, visible: p.active, comment: '', tag: p.popular ? '인기' : '' })));
      setSaving(false);
    }
  }, [isOpen, products]);

  const update = (id: number, patch: Partial<CatalogContentItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const move = (index: number, dir: -1 | 1) => {
    setItems((list) => {
      const next = [...list];
      const target = index + dir;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // 홍보 문구 50자 초과 시 저장 차단 (인라인 차단)
  const hasOverflow = items.some((it) => it.comment.length > COMMENT_MAX);

  const handleSave = async () => {
    if (hasOverflow) {
      toast.error('홍보 문구는 50자 이내로 입력하세요.');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500)); // mock 저장
    setSaving(false);
    onSave(items);
    toast.success('저장되었습니다.');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="카탈로그 내용 편집"
      size="xl"
      footer={
        <div className="flex justify-end gap-sm">
          <Button variant="outline" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="sm" loading={saving} disabled={hasOverflow} onClick={handleSave}>
            저장
          </Button>
        </div>
      }
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-content-tertiary">
          표시할 상품이 없습니다.
        </div>
      ) : (
        <div className="space-y-sm">
          {items.map((it, idx) => (
            <div key={it.id} className="rounded-xl border border-line p-md">
              <div className="mb-sm flex items-center justify-between gap-sm">
                <div className="flex items-center gap-xs">
                  <GripVertical size={14} className="text-content-tertiary" aria-hidden />
                  <span className="text-[13px] font-bold text-content">{it.name}</span>
                </div>
                <div className="flex items-center gap-sm">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="rounded border border-line px-2 py-0.5 text-[11px] text-content-secondary disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="rounded border border-line px-2 py-0.5 text-[11px] text-content-secondary disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <Switch checked={it.visible} onChange={(c) => update(it.id, { visible: c })} label="노출" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <Input
                  size="sm"
                  label="강조 태그"
                  value={it.tag}
                  onChange={(e) => update(it.id, { tag: e.target.value })}
                  placeholder="예: 인기, 추천, 신규"
                />
                <Input
                  size="sm"
                  label="홍보 문구"
                  value={it.comment}
                  onChange={(e) => update(it.id, { comment: e.target.value })}
                  placeholder="카탈로그 전용 문구 (선택)"
                  error={it.comment.length > COMMENT_MAX ? `${COMMENT_MAX}자 이내로 입력하세요` : undefined}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
