import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, Trash2, X, ChevronDown, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { getProductGroups, type ProductGroup } from '@/api/endpoints/productGroups';
import StatusBadge from '@/components/StatusBadge';

// ─── 이용 제한 설정 타입 ──────────────────────────────────────
export interface UsageRestrictions {
  availableDays: number[];        // 0=일,1=월,...,6=토
  availableTimeStart: string;     // HH:MM
  availableTimeEnd: string;       // HH:MM
  weekdayPrice: number | null;    // 주중 가격
  weekendPrice: number | null;    // 주말 가격
}

// 30분 단위 시간 옵션 생성 (06:00 ~ 23:30)
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// 요일 라벨
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// ─── 타입 정의 ───────────────────────────────────────────────
export interface ProductRow {
  id: number;
  name: string;
  category: string;
  price: number;
  cashPrice: number | null;
  cardPrice: number | null;
  productType: string | null;
  totalCount: number | null;
  kioskVisible: boolean | null;
  sportType: string | null;
  tag: string | null;
  duration: number | null;
  sessions: number | null;
  description: string | null;
  isActive: boolean;
  branchId: number;
  classType: string | null;
  deductionType: string | null;
  suspendLimit: number | null;
  dailyUseLimit: number | null;
  productGroupId: number | null;
  holdingEnabled: boolean | null;      // 홀딩 가능 여부
  transferEnabled: boolean | null;     // 양도 가능 여부
  pointAccrual: boolean | null;        // 포인트 적립 여부
  salesChannel: string | null;         // 판매유형: KIOSK, COUNTER, ONLINE, ALL
  usage_restrictions?: UsageRestrictions | null;
  createdAt?: string;
}

interface Props {
  /** 선택된 상품 (null이면 빈 신규 폼) */
  product: ProductRow | null;
  /** 신규 등록 모드 여부 */
  isNew: boolean;
  /** 저장 성공 후 콜백 (저장된 상품 id 전달) */
  onSave: (savedId: number) => void;
  /** 삭제 성공 후 콜백 */
  onDelete: () => void;
  /** 패널 닫기 콜백 */
  onClose: () => void;
}

// DB category enum → 폼 카테고리 한글 매핑
const CAT_KO_MAP: Record<string, string> = {
  MEMBERSHIP: '이용권',
  PT: 'PT',
  GX: 'GX',
  PRODUCT: '기타',
  SERVICE: '기타',
  ETC: '기타',
};
// 폼 카테고리 한글 → DB enum 매핑
const CAT_DB_MAP: Record<string, string> = {
  '이용권': 'MEMBERSHIP',
  'PT': 'PT',
  'GX': 'GX',
  '기타': 'PRODUCT',
};
// 카테고리 → productType 매핑
const TYPE_MAP: Record<string, string> = {
  '이용권': 'MEMBERSHIP',
  'PT': 'LESSON',
  'GX': 'LESSON',
  '기타': 'GENERAL',
};

// 기본 카테고리 (동적으로 product_groups에서 추가됨)
const DEFAULT_CATEGORIES = ['이용권', 'PT', 'GX', '골프', '식품', '기타'];

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// 천단위 콤마 포맷
const formatNum = (v: number | null | undefined): string =>
  v != null ? Number(v).toLocaleString() : '';

const parseNum = (v: string): number | null => {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? null : n;
};

// ─── 컴포넌트 ────────────────────────────────────────────────
export default function ProductDetailPanel({ product, isNew, onSave, onDelete, onClose }: Props) {
  // 폼 상태
  const [name, setName] = useState('');
  const [category, setCategory] = useState('이용권'); // 한글 카테고리
  const [customCategory, setCustomCategory] = useState('');  // ComboBox 직접 입력용
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [cashPrice, setCashPrice] = useState('');
  const [cardPrice, setCardPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [sessions, setSessions] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [kioskVisible, setKioskVisible] = useState(true);
  const [tag, setTag] = useState('');

  // 옵션 체크박스
  const [suspendEnabled, setSuspendEnabled] = useState(false);
  const [suspendLimit, setSuspendLimit] = useState('');
  const [dailyLimitEnabled, setDailyLimitEnabled] = useState(false);
  const [dailyUseLimit, setDailyUseLimit] = useState('');

  // 수업 설정 (PT/GX 전용)
  const [classType, setClassType] = useState('');
  const [deductionType, setDeductionType] = useState('');

  // 레슨북 추가 컬럼
  const [holdingEnabled, setHoldingEnabled] = useState(false);
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [pointAccrual, setPointAccrual] = useState(true);
  const [salesChannel, setSalesChannel] = useState('ALL');

  // 상품 분류 (product_groups)
  const [productGroupId, setProductGroupId] = useState<string>('');
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);

  // 이용 제한 설정
  const [dayRestrictionEnabled, setDayRestrictionEnabled] = useState(false);
  const [availableDays, setAvailableDays] = useState<number[]>([1, 2, 3, 4, 5]); // 기본: 월~금
  const [timeRestrictionEnabled, setTimeRestrictionEnabled] = useState(false);
  const [availableTimeStart, setAvailableTimeStart] = useState('06:00');
  const [availableTimeEnd, setAvailableTimeEnd] = useState('22:00');
  const [splitPriceEnabled, setSplitPriceEnabled] = useState(false);
  const [weekdayPrice, setWeekdayPrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');

  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // 상품 분류 목록 로드
  useEffect(() => {
    getProductGroups().then(({ data }) => {
      if (data) setProductGroups(data.filter(g => g.isActive));
    });
  }, []);

  // product prop 변경 시 폼 초기화
  useEffect(() => {
    if (isNew || !product) {
      // 신규 폼 초기화
      setName('');
      setCategory('이용권');
      setCustomCategory('');
      setCashPrice('');
      setCardPrice('');
      setDuration('');
      setSessions('');
      setDescription('');
      setIsActive(true);
      setKioskVisible(true);
      setTag('');
      setSuspendEnabled(false);
      setSuspendLimit('');
      setDailyLimitEnabled(false);
      setDailyUseLimit('');
      setClassType('');
      setDeductionType('');
      setProductGroupId('');
      setHoldingEnabled(false);
      setTransferEnabled(false);
      setPointAccrual(true);
      setSalesChannel('ALL');
      setDayRestrictionEnabled(false);
      setAvailableDays([1, 2, 3, 4, 5]);
      setTimeRestrictionEnabled(false);
      setAvailableTimeStart('06:00');
      setAvailableTimeEnd('22:00');
      setSplitPriceEnabled(false);
      setWeekdayPrice('');
      setWeekendPrice('');
      return;
    }

    // 수정 모드: 기존 값 채우기
    setName(product.name);
    const catKo = CAT_KO_MAP[product.category] ?? product.category;
    setCategory(catKo);
    setCustomCategory('');
    setCashPrice(formatNum(product.cashPrice ?? product.price));
    setCardPrice(formatNum(product.cardPrice ?? product.price));
    setDuration(product.duration?.toString() ?? '');
    setSessions(product.sessions?.toString() ?? '');
    setDescription(product.description ?? '');
    setIsActive(product.isActive);
    setKioskVisible(product.kioskVisible ?? true);
    setTag(product.tag ?? '');
    setSuspendEnabled(product.suspendLimit != null && product.suspendLimit > 0);
    setSuspendLimit(product.suspendLimit?.toString() ?? '');
    setDailyLimitEnabled(product.dailyUseLimit != null && product.dailyUseLimit > 0);
    setDailyUseLimit(product.dailyUseLimit?.toString() ?? '');
    setClassType(product.classType ?? '');
    setDeductionType(product.deductionType ?? '');
    setProductGroupId(product.productGroupId?.toString() ?? '');
    setHoldingEnabled(product.holdingEnabled ?? false);
    setTransferEnabled(product.transferEnabled ?? false);
    setPointAccrual(product.pointAccrual ?? true);
    setSalesChannel(product.salesChannel ?? 'ALL');

    // 이용 제한 설정 복원
    const ur = product.usage_restrictions;
    if (ur) {
      setDayRestrictionEnabled((ur.availableDays?.length ?? 0) > 0);
      setAvailableDays(ur.availableDays ?? [1, 2, 3, 4, 5]);
      setTimeRestrictionEnabled(!!(ur.availableTimeStart && ur.availableTimeEnd));
      setAvailableTimeStart(ur.availableTimeStart ?? '06:00');
      setAvailableTimeEnd(ur.availableTimeEnd ?? '22:00');
      setSplitPriceEnabled(ur.weekdayPrice != null || ur.weekendPrice != null);
      setWeekdayPrice(ur.weekdayPrice != null ? Number(ur.weekdayPrice).toLocaleString() : '');
      setWeekendPrice(ur.weekendPrice != null ? Number(ur.weekendPrice).toLocaleString() : '');
    } else {
      setDayRestrictionEnabled(false);
      setAvailableDays([1, 2, 3, 4, 5]);
      setTimeRestrictionEnabled(false);
      setAvailableTimeStart('06:00');
      setAvailableTimeEnd('22:00');
      setSplitPriceEnabled(false);
      setWeekdayPrice('');
      setWeekendPrice('');
    }
  }, [product, isNew]);

  // 현재 카테고리 결정 (직접 입력 OR 선택값)
  const effectiveCategory = customCategory.trim() || category;

  // PT/GX일 때 수업 설정 표시
  const showLessonFields = category === 'PT' || category === 'GX';

  // 가격 입력 핸들러 (천단위 자동 콤마)
  const handlePriceChange = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    val: string
  ) => {
    const raw = val.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10);
    setter(isNaN(num) ? '' : num.toLocaleString());
  };

  // ComboBox: 드롭다운 항목 클릭
  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    setCustomCategory('');
    setShowCategoryDropdown(false);
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!name.trim()) { toast.error('상품명을 입력하세요.'); return; }
    const cashVal = parseNum(cashPrice);
    if (cashVal === null || cashVal <= 0) { toast.error('현금가를 입력하세요.'); return; }

    setSaving(true);

    const finalCat = customCategory.trim() || category;
    const dbCategory = CAT_DB_MAP[finalCat] ?? 'PRODUCT';
    const productType = TYPE_MAP[finalCat] ?? 'GENERAL';

    const payload: Record<string, unknown> = {
      branchId: getBranchId(),
      name: name.trim(),
      category: dbCategory,
      price: cashVal,
      cashPrice: cashVal,
      cardPrice: parseNum(cardPrice) ?? cashVal,
      productType,
      duration: parseNum(duration),
      sessions: parseNum(sessions),
      totalCount: parseNum(sessions),
      description: description.trim() || null,
      isActive,
      kioskVisible,
      tag: tag.trim() || null,
      classType: classType || null,
      deductionType: deductionType || null,
      suspendLimit: suspendEnabled ? (parseNum(suspendLimit) ?? null) : null,
      dailyUseLimit: dailyLimitEnabled ? (parseNum(dailyUseLimit) ?? null) : null,
      productGroupId: productGroupId ? Number(productGroupId) : null,
      holdingEnabled,
      transferEnabled,
      pointAccrual,
      salesChannel: salesChannel || 'ALL',
      // 이용 제한 설정 저장
      usage_restrictions: (dayRestrictionEnabled || timeRestrictionEnabled || splitPriceEnabled) ? {
        availableDays: dayRestrictionEnabled ? availableDays : [],
        availableTimeStart: timeRestrictionEnabled ? availableTimeStart : null,
        availableTimeEnd: timeRestrictionEnabled ? availableTimeEnd : null,
        weekdayPrice: splitPriceEnabled ? (parseNum(weekdayPrice) ?? null) : null,
        weekendPrice: splitPriceEnabled ? (parseNum(weekendPrice) ?? null) : null,
      } : null,
    };

    if (!isNew && product) {
      // 수정
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', product.id);
      setSaving(false);
      if (error) { toast.error('수정에 실패했습니다.'); return; }
      toast.success('상품이 수정되었습니다.');
      onSave(product.id);
    } else {
      // 신규 등록
      const { data, error } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (error || !data) { toast.error('등록에 실패했습니다.'); return; }
      toast.success('상품이 등록되었습니다.');
      onSave((data as { id: number }).id);
    }
  };

  // 삭제 핸들러 (소프트 삭제: isActive = false)
  const handleDelete = async () => {
    if (!product) return;
    const { error } = await supabase
      .from('products')
      .update({ isActive: false })
      .eq('id', product.id);
    if (error) { toast.error('삭제에 실패했습니다.'); return; }
    toast.success('상품이 삭제되었습니다.');
    setDeleteConfirm(false);
    onDelete();
  };

  // 카테고리 ComboBox의 드롭다운 항목 목록 (기본 + product_groups에서 동적 추가)
  const categoryOptions = [
    ...DEFAULT_CATEGORIES,
    ...productGroups.map(g => g.name).filter(n => !DEFAULT_CATEGORIES.includes(n)),
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 패널 헤더 */}
      <div className="flex items-center justify-between px-lg py-md border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-sm min-w-0">
          <h3 className="text-[15px] font-bold text-content truncate">
            {isNew ? '새 상품 등록' : (name || '상품 상세')}
          </h3>
          {!isNew && (
            <StatusBadge variant={isActive ? 'mint' : 'default'} dot={isActive}>
              {isActive ? '활성' : '비활성'}
            </StatusBadge>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-xs text-content-tertiary hover:text-content transition-colors rounded-md hover:bg-surface-secondary"
        >
          <X size={16} />
        </button>
      </div>

      {/* 폼 본문 (스크롤 가능) — 컴팩트 레이아웃 */}
      <div className="flex-1 overflow-y-auto px-md py-sm space-y-sm">

        {/* 상품명 + 분류 (한 줄) */}
        <div className="grid grid-cols-2 gap-sm">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">
              상품명 <span className="text-state-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 헬스 3개월권"
              className="px-sm py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
            />
          </div>

        {/* 분류 (ComboBox) */}
        <div className="flex flex-col gap-[3px]">
          <label className="text-[11px] font-semibold text-content-secondary">분류</label>
          <div className="relative">
            <div className="flex gap-xs">
              {/* 직접 입력 또는 선택값 표시 */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={customCategory || category}
                  onChange={e => {
                    setCustomCategory(e.target.value);
                    setShowCategoryDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowCategoryDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                  placeholder="분류 선택"
                  className="w-full px-sm py-[5px] pr-8 border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setShowCategoryDropdown(v => !v); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-content-tertiary"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
            </div>
            {/* 드롭다운 */}
            {showCategoryDropdown && (
              <div className="absolute z-30 mt-xs w-full bg-surface border border-line rounded-lg shadow-lg overflow-hidden">
                {categoryOptions
                  .filter(c =>
                    !customCategory ||
                    c.toLowerCase().includes(customCategory.toLowerCase())
                  )
                  .map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onMouseDown={() => handleCategorySelect(cat)}
                      className={cn(
                        'w-full text-left px-sm py-[7px] text-[13px] hover:bg-surface-secondary transition-colors',
                        (customCategory ? customCategory === cat : category === cat)
                          ? 'text-primary font-semibold bg-primary/5'
                          : 'text-content'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                {/* 직접 입력 옵션 */}
                {customCategory && !categoryOptions.includes(customCategory) && (
                  <button
                    type="button"
                    onMouseDown={() => {
                      setCategory(customCategory);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-sm py-[7px] text-[13px] text-primary font-semibold hover:bg-primary/5 border-t border-line"
                  >
                    "{customCategory}" 직접 입력
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        </div>{/* grid-cols-2 닫기 */}

        {/* 가격 + 기간/세션 (4칸 그리드) */}
        <div className="grid grid-cols-4 gap-sm">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">현금가 *</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={cashPrice}
                onChange={e => handlePriceChange(setCashPrice, e.target.value)}
                placeholder="0"
                className="w-full px-sm py-[5px] pr-6 border border-line rounded-lg text-[12px] tabular-nums bg-surface focus:outline-none focus:border-primary"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">원</span>
            </div>
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">카드가</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={cardPrice}
                onChange={e => handlePriceChange(setCardPrice, e.target.value)}
                placeholder="동일"
                className="w-full px-sm py-[5px] pr-6 border border-line rounded-lg text-[12px] tabular-nums bg-surface focus:outline-none focus:border-primary"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">원</span>
            </div>
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">기간</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="90"
                className="w-full px-sm py-[5px] pr-5 border border-line rounded-lg text-[12px] bg-surface focus:outline-none focus:border-primary"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">일</span>
            </div>
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">횟수</label>
            <div className="relative">
              <input
                type="number"
                min={1}
                value={sessions}
                onChange={e => setSessions(e.target.value)}
                placeholder="10"
                className="w-full px-sm py-[5px] pr-5 border border-line rounded-lg text-[12px] bg-surface focus:outline-none focus:border-primary"
              />
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">회</span>
            </div>
          </div>
        </div>

        {/* 설명 + 태그 + 분류 (한 줄씩 컴팩트) */}
        <div className="flex flex-col gap-[3px]">
          <label className="text-[11px] font-semibold text-content-secondary">설명</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            placeholder="상품 설명"
            className="px-sm py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-sm">
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">태그</label>
            <input
              type="text"
              value={tag}
              onChange={e => setTag(e.target.value)}
              placeholder="#인기 #이벤트"
              className="px-sm py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-[3px]">
            <label className="text-[11px] font-semibold text-content-secondary">상품 분류</label>
            <select
              value={productGroupId}
              onChange={e => setProductGroupId(e.target.value)}
              className="px-sm py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary"
            >
              <option value="">분류 없음</option>
              {productGroups.map(g => (
                <option key={g.id} value={String(g.id)}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 옵션 섹션 — 컴팩트 */}
        <div className="space-y-[6px] pt-[4px] border-t border-line">
          <p className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider">옵션</p>

          {/* 기간정지 허용 */}
          <div className="flex items-center gap-sm">
            <input
              id="suspendEnabled"
              type="checkbox"
              checked={suspendEnabled}
              onChange={e => setSuspendEnabled(e.target.checked)}
              className="w-[14px] h-[14px] rounded accent-primary cursor-pointer"
            />
            <label htmlFor="suspendEnabled" className="text-[13px] text-content cursor-pointer select-none flex-1">
              기간정지 허용
            </label>
            {suspendEnabled && (
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  min={1}
                  value={suspendLimit}
                  onChange={e => setSuspendLimit(e.target.value)}
                  placeholder="최대 일수"
                  className="w-[80px] px-xs py-[4px] border border-line rounded text-[12px] text-center bg-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-content-tertiary">일</span>
              </div>
            )}
          </div>

          {/* 일사용횟수 제한 */}
          <div className="flex items-center gap-sm">
            <input
              id="dailyLimitEnabled"
              type="checkbox"
              checked={dailyLimitEnabled}
              onChange={e => setDailyLimitEnabled(e.target.checked)}
              className="w-[14px] h-[14px] rounded accent-primary cursor-pointer"
            />
            <label htmlFor="dailyLimitEnabled" className="text-[13px] text-content cursor-pointer select-none flex-1">
              일사용횟수 제한
            </label>
            {dailyLimitEnabled && (
              <div className="flex items-center gap-xs">
                <input
                  type="number"
                  min={1}
                  value={dailyUseLimit}
                  onChange={e => setDailyUseLimit(e.target.value)}
                  placeholder="횟수"
                  className="w-[80px] px-xs py-[4px] border border-line rounded text-[12px] text-center bg-surface focus:outline-none focus:border-primary"
                />
                <span className="text-[11px] text-content-tertiary">회</span>
              </div>
            )}
          </div>

          {/* 홀딩 가능 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">홀딩 가능</label>
            <button
              type="button"
              onClick={() => setHoldingEnabled(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                holdingEnabled ? 'bg-accent' : 'bg-line'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                holdingEnabled ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* 양도 가능 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">양도 가능</label>
            <button
              type="button"
              onClick={() => setTransferEnabled(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                transferEnabled ? 'bg-accent' : 'bg-line'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                transferEnabled ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* 포인트 적립 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">포인트 적립</label>
            <button
              type="button"
              onClick={() => setPointAccrual(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                pointAccrual ? 'bg-accent' : 'bg-line'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                pointAccrual ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* 판매유형 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">판매유형</label>
            <select
              value={salesChannel}
              onChange={e => setSalesChannel(e.target.value)}
              className="px-sm py-[4px] border border-line rounded text-[12px] bg-surface focus:outline-none focus:border-primary"
            >
              <option value="ALL">전체</option>
              <option value="KIOSK">키오스크</option>
              <option value="COUNTER">현장</option>
              <option value="ONLINE">온라인</option>
            </select>
          </div>

          {/* 활성 상태 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">활성 상태</label>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                isActive ? 'bg-accent' : 'bg-line'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          {/* 키오스크 노출 */}
          <div className="flex items-center justify-between gap-sm">
            <label className="text-[13px] text-content select-none">키오스크 노출</label>
            <button
              type="button"
              onClick={() => setKioskVisible(v => !v)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                kioskVisible ? 'bg-accent' : 'bg-line'
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                kioskVisible ? 'translate-x-4' : 'translate-x-0.5'
              )} />
            </button>
          </div>
        </div>

        {/* 수업 설정 (PT/GX 전용) */}
        {showLessonFields && (
          <>
            <div className="space-y-[6px] pt-[4px] border-t border-line">
              <p className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider">수업 설정</p>

              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-content-secondary">수업방식</label>
                <select
                  value={classType}
                  onChange={e => setClassType(e.target.value)}
                  className="px-sm py-[7px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">선택</option>
                  <option value="1:1">1:1</option>
                  <option value="그룹">그룹</option>
                  <option value="혼합">혼합</option>
                </select>
              </div>

              <div className="flex flex-col gap-xs">
                <label className="text-[12px] font-semibold text-content-secondary">차감방식</label>
                <select
                  value={deductionType}
                  onChange={e => setDeductionType(e.target.value)}
                  className="px-sm py-[7px] border border-line rounded-lg text-[13px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
                >
                  <option value="">선택</option>
                  <option value="횟수차감">횟수차감</option>
                  <option value="기간차감">기간차감</option>
                  <option value="무제한">무제한</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* 이용 제한 설정 */}
        <div className="space-y-[6px] pt-[4px] border-t border-line">
          <div className="flex items-center gap-xs">
            <Calendar size={12} className="text-content-tertiary" />
            <p className="text-[10px] font-bold text-content-tertiary uppercase tracking-wider">이용 제한</p>
          </div>

          {/* 요일 제한 */}
          <div className="space-y-xs">
            <div className="flex items-center gap-sm">
              <input
                id="dayRestrictionEnabled"
                type="checkbox"
                checked={dayRestrictionEnabled}
                onChange={e => setDayRestrictionEnabled(e.target.checked)}
                className="w-[14px] h-[14px] rounded accent-primary cursor-pointer"
              />
              <label htmlFor="dayRestrictionEnabled" className="text-[13px] text-content cursor-pointer select-none">
                요일 제한
              </label>
            </div>
            {dayRestrictionEnabled && (
              <div className="flex gap-[3px] flex-wrap pl-[22px]">
                {DAY_LABELS.map((label, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvailableDays(prev =>
                        prev.includes(idx)
                          ? prev.filter(d => d !== idx)
                          : [...prev, idx].sort()
                      );
                    }}
                    className={cn(
                      'w-7 h-7 rounded-full text-[11px] font-semibold border transition-colors',
                      availableDays.includes(idx)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-surface text-content-secondary border-line hover:border-primary hover:text-primary'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 시간 제한 */}
          <div className="space-y-xs">
            <div className="flex items-center gap-sm">
              <input
                id="timeRestrictionEnabled"
                type="checkbox"
                checked={timeRestrictionEnabled}
                onChange={e => setTimeRestrictionEnabled(e.target.checked)}
                className="w-[14px] h-[14px] rounded accent-primary cursor-pointer"
              />
              <label htmlFor="timeRestrictionEnabled" className="text-[13px] text-content cursor-pointer select-none">
                시간 제한
              </label>
            </div>
            {timeRestrictionEnabled && (
              <div className="flex items-center gap-xs pl-[22px]">
                <Clock size={12} className="text-content-tertiary shrink-0" />
                <select
                  value={availableTimeStart}
                  onChange={e => setAvailableTimeStart(e.target.value)}
                  className="px-xs py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className="text-[12px] text-content-tertiary">~</span>
                <select
                  value={availableTimeEnd}
                  onChange={e => setAvailableTimeEnd(e.target.value)}
                  className="px-xs py-[5px] border border-line rounded-lg text-[12px] text-content bg-surface focus:outline-none focus:border-primary transition-colors"
                >
                  {TIME_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 주중/주말 가격 분리 */}
          <div className="space-y-xs">
            <div className="flex items-center gap-sm">
              <input
                id="splitPriceEnabled"
                type="checkbox"
                checked={splitPriceEnabled}
                onChange={e => setSplitPriceEnabled(e.target.checked)}
                className="w-[14px] h-[14px] rounded accent-primary cursor-pointer"
              />
              <label htmlFor="splitPriceEnabled" className="text-[13px] text-content cursor-pointer select-none">
                주중/주말 가격 분리
              </label>
            </div>
            {splitPriceEnabled && (
              <div className="grid grid-cols-2 gap-sm pl-[22px]">
                <div className="flex flex-col gap-xs">
                  <label className="text-[11px] font-semibold text-content-secondary">주중가</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={weekdayPrice}
                      onChange={e => handlePriceChange(setWeekdayPrice, e.target.value)}
                      placeholder="0"
                      className="w-full px-xs py-[5px] pr-6 border border-line rounded-lg text-[12px] tabular-nums bg-surface focus:outline-none focus:border-primary transition-colors"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">원</span>
                  </div>
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-[11px] font-semibold text-content-secondary">주말가</label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={weekendPrice}
                      onChange={e => handlePriceChange(setWeekendPrice, e.target.value)}
                      placeholder="0"
                      className="w-full px-xs py-[5px] pr-6 border border-line rounded-lg text-[12px] tabular-nums bg-surface focus:outline-none focus:border-primary transition-colors"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-content-tertiary">원</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="shrink-0 border-t border-line px-lg py-md bg-surface">
        {/* 삭제 확인 상태 */}
        {deleteConfirm ? (
          <div className="flex items-center justify-between gap-sm">
            <span className="text-[12px] text-state-error font-semibold">정말 삭제하시겠습니까?</span>
            <div className="flex gap-sm">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-sm py-[6px] text-[12px] border border-line rounded-lg text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="px-sm py-[6px] text-[12px] bg-state-error text-surface rounded-lg font-bold hover:opacity-90 transition-opacity"
              >
                삭제 확인
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-sm">
            {/* 삭제 버튼 (수정 모드에서만) */}
            {!isNew && product ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-xs px-sm py-[6px] text-[12px] text-state-error border border-state-error/30 rounded-lg hover:bg-state-error/5 transition-colors"
              >
                <Trash2 size={13} />
                삭제
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-sm">
              <button
                onClick={onClose}
                className="px-sm py-[6px] text-[12px] border border-line rounded-lg text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-xs px-md py-[6px] text-[12px] bg-primary text-surface rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-3 h-3 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                {isNew ? '등록' : '저장'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
