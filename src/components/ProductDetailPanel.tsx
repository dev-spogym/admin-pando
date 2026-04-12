import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';

export interface PackageItem {
  productId: number;
  productName: string;
  price: number;
}

export interface UsageRestrictions {
  availableDays: number[];
  availableTimeStart: string;
  availableTimeEnd: string;
  weekdayPrice: number | null;
  weekendPrice: number | null;
}

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
  holdingEnabled: boolean | null;
  transferEnabled: boolean | null;
  pointAccrual: boolean | null;
  salesChannel: string | null;
  usage_restrictions?: UsageRestrictions | null;
  createdAt?: string;
}

interface Props {
  product: ProductRow | null;
  isNew: boolean;
  onSave: (savedId: number) => void;
  onDelete: () => void;
  onClose: () => void;
}

const PRODUCT_KIND_OPTIONS = ['레슨', '이용', '락커', '판매'] as const;
const USE_TYPE_OPTIONS = ['기간', '횟수', '포인트'] as const;
const LESSON_TIME_OPTIONS = ['선택', '10분', '20분', '30분', '40분', '50분', '60분', '70분', '80분', '90분'];
const LESSON_VALIDITY_OPTIONS = ['선택', '1개월', '3개월', '6개월', '12개월'];
const LIMIT_COUNT_OPTIONS = ['1회', '2회', '3회', '5회', '10회'];
const FACILITY_USE_TIME_OPTIONS = ['기본', '오전', '오후', '종일'];
const RESERVATION_DAY_OPTIONS = ['당일', '1일 전', '3일 전', '7일 전', '14일 전', '30일 전'];
const RESERVATION_INTERVAL_OPTIONS = ['10분', '20분', '30분', '40분', '50분', '60분'];
const PAUSE_COUNT_OPTIONS = ['선택', '1회', '2회', '3회'];
const PAUSE_PERIOD_OPTIONS = ['선택', '3일', '7일', '15일', '30일', '60일'];
const DAY_ROWS = ['월', '화', '수', '목', '금', '토', '일'];
const TIME_OPTIONS = Array.from({ length: 24 * 6 }, (_, index) => {
  const hour = String(Math.floor(index / 6)).padStart(2, '0');
  const minute = String((index % 6) * 10).padStart(2, '0');
  return `${hour}:${minute}`;
});

const CAT_KO_MAP: Record<string, string> = {
  MEMBERSHIP: '이용권',
  PT: 'PT',
  GX: 'GX',
  PRODUCT: '기타',
  SERVICE: '기타',
  ETC: '기타',
};

const CAT_DB_MAP: Record<string, string> = {
  이용권: 'MEMBERSHIP',
  PT: 'PT',
  GX: 'GX',
  기타: 'PRODUCT',
};

const TYPE_MAP: Record<string, string> = {
  이용권: 'MEMBERSHIP',
  PT: 'LESSON',
  GX: 'LESSON',
  기타: 'GENERAL',
};

const panelClass = 'border border-[#aeb6c3] bg-[#f1f1f1] text-[11px] text-[#222] shadow-[inset_1px_1px_0_#fff]';
const fieldClass =
  'h-6 w-full border border-[#a8adb7] bg-white px-1.5 text-[11px] text-[#222] outline-none focus:border-[#5a91d8]';
const selectClass = `${fieldClass} pr-6`;
const radioLabelClass = 'inline-flex items-center gap-1 text-[11px] text-[#222]';
const checkLabelClass = 'inline-flex min-h-5 items-center gap-1.5 leading-none text-[11px] text-[#444]';
const rowClass = 'flex min-w-0 items-center gap-2';

const getBranchId = (): number => Number(localStorage.getItem('branchId')) || 1;
const formatNum = (v: number | null | undefined): string => (v != null ? Number(v).toLocaleString() : '');
const parseNum = (v: string): number | null => {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return Number.isNaN(n) ? null : n;
};
function ClassicCheckbox({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="mt-[1px] h-3.5 w-3.5 shrink-0 rounded-none border-[#8f96a3] accent-[#4f8fe6]"
    />
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return <div className="w-[62px] shrink-0 text-right font-semibold text-[#404040]">{children}</div>;
}

export default function ProductDetailPanel({ product, isNew, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [productKind, setProductKind] = useState<(typeof PRODUCT_KIND_OPTIONS)[number]>('이용');
  const [cashPrice, setCashPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [sessions, setSessions] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [kioskVisible, setKioskVisible] = useState(true);
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [pointAccrual, setPointAccrual] = useState(true);
  const [holdingEnabled, setHoldingEnabled] = useState(false);
  const [lessonTime, setLessonTime] = useState('선택');
  const [lessonValidity, setLessonValidity] = useState('선택');
  const [classMode, setClassMode] = useState<'개인' | '정규클래스'>('개인');
  const [useType, setUseType] = useState<(typeof USE_TYPE_OPTIONS)[number]>('기간');
  const [useAmount, setUseAmount] = useState('');
  const [limitEnabled, setLimitEnabled] = useState(false);
  const [limitCount, setLimitCount] = useState('1회');
  const [facilityAvailable, setFacilityAvailable] = useState(false);
  const [reservationAvailable, setReservationAvailable] = useState(false);
  const [memberPauseEnabled, setMemberPauseEnabled] = useState(false);
  const [facilityUseTime, setFacilityUseTime] = useState('기본');
  const [reservationOpenDate, setReservationOpenDate] = useState('당일');
  const [reservationInterval, setReservationInterval] = useState('10분');
  const [pauseCount, setPauseCount] = useState('선택');
  const [pausePeriod, setPausePeriod] = useState('선택');
  const [salesChannel, setSalesChannel] = useState('ALL');
  const [weekdayRows, setWeekdayRows] = useState(
    DAY_ROWS.map(day => ({ day, enabled: false, start: '09:00', end: '18:00' }))
  );
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [activeMembers, setActiveMembers] = useState<number | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [importProducts, setImportProducts] = useState<ProductRow[]>([]);
  const [copiedFromProductId, setCopiedFromProductId] = useState<number | null>(null);
  const [packageOpen, setPackageOpen] = useState(false);
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [packagePrice, setPackagePrice] = useState('');
  const [packageSelectId, setPackageSelectId] = useState<string>('');

  const resetForm = () => {
    setName('');
    setProductKind('이용');
    setCashPrice('');
    setDuration('');
    setSessions('');
    setDescription('');
    setTag('');
    setIsActive(true);
    setKioskVisible(true);
    setTransferEnabled(false);
    setPointAccrual(true);
    setHoldingEnabled(false);
    setLessonTime('선택');
    setLessonValidity('선택');
    setClassMode('개인');
    setUseType('기간');
    setUseAmount('');
    setLimitEnabled(false);
    setLimitCount('1회');
    setFacilityAvailable(false);
    setReservationAvailable(false);
    setMemberPauseEnabled(false);
    setFacilityUseTime('기본');
    setReservationOpenDate('당일');
    setReservationInterval('10분');
    setPauseCount('선택');
    setPausePeriod('선택');
    setSalesChannel('ALL');
    setWeekdayRows(DAY_ROWS.map(day => ({ day, enabled: false, start: '09:00', end: '18:00' })));
    setPackageOpen(false);
    setPackageItems([]);
    setPackagePrice('');
    setPackageSelectId('');
  };

  const applyProductToForm = (source: ProductRow, options?: { markAsCopy?: boolean }) => {
    const catKo = CAT_KO_MAP[source.category] ?? source.category;
    setName(source.name);
    setProductKind(catKo === 'PT' || catKo === 'GX' ? '레슨' : catKo === '이용권' ? '이용' : '판매');
    setCashPrice(formatNum(source.cashPrice ?? source.price));
    setDuration(source.duration?.toString() ?? '');
    setSessions(source.sessions?.toString() ?? '');
    setDescription(source.description ?? '');
    setTag(source.tag ?? '');
    setIsActive(source.isActive);
    setKioskVisible(source.kioskVisible ?? true);
    setTransferEnabled(source.transferEnabled ?? false);
    setPointAccrual(source.pointAccrual ?? true);
    setHoldingEnabled(source.holdingEnabled ?? false);
    setClassMode(source.classType === '정규클래스' ? '정규클래스' : '개인');
    setUseType(
      source.deductionType === '횟수' || source.deductionType === '포인트' || source.deductionType === '기간'
        ? source.deductionType
        : '기간'
    );
    setUseAmount(source.sessions?.toString() ?? '');
    setLimitEnabled(Boolean(source.dailyUseLimit));
    setLimitCount(source.dailyUseLimit ? `${source.dailyUseLimit}회` : '1회');
    setSalesChannel(source.salesChannel ?? 'ALL');

    const availableDays = source.usage_restrictions?.availableDays ?? [];
    const start = source.usage_restrictions?.availableTimeStart ?? '09:00';
    const end = source.usage_restrictions?.availableTimeEnd ?? '18:00';
    setWeekdayRows(
      DAY_ROWS.map((day, index) => {
        const mapped = index === 6 ? 0 : index + 1;
        return { day, enabled: availableDays.includes(mapped), start, end };
      })
    );

    if (options?.markAsCopy) {
      setCopiedFromProductId(source.id);
    }
  };

  const isCreateMode = isNew || copiedFromProductId !== null;

  useEffect(() => {
    if (isNew || !product) {
      resetForm();
      setCopiedFromProductId(null);
      return;
    }

    setCopiedFromProductId(null);
    applyProductToForm(product);
  }, [isNew, product]);

  useEffect(() => {
    if (!showImportModal && !packageOpen) return;

    const fetchImportProducts = async () => {
      setImportLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branchId', getBranchId())
        .order('name');

      if (error) {
        toast.error('상품 목록을 불러오지 못했습니다.');
        setImportProducts([]);
      } else {
        setImportProducts((data as ProductRow[]).filter(item => item.id !== product?.id));
      }
      setImportLoading(false);
    };

    fetchImportProducts();
  }, [showImportModal, packageOpen, product?.id]);

  const effectiveCategory = productKind === '레슨' ? 'PT' : productKind === '이용' ? '이용권' : '기타';

  const handlePriceChange = (value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10);
    setCashPrice(Number.isNaN(num) ? '' : num.toLocaleString());
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('상품명을 입력하세요.');
      return;
    }

    const cashVal = parseNum(cashPrice);
    if (cashVal === null || cashVal <= 0) {
      toast.error('금액을 입력하세요.');
      return;
    }

    // 동일 branchId 내 상품명 중복 체크
    const branchId = getBranchId();
    const productName = name.trim();
    let dupQuery = supabase
      .from('products')
      .select('id')
      .eq('branchId', branchId)
      .eq('name', productName);
    if (!isCreateMode && product) {
      dupQuery = dupQuery.neq('id', product.id);
    }
    const { data: dupData, error: dupError } = await dupQuery;
    if (dupError) {
      toast.error('중복 확인 중 오류가 발생했습니다.');
      return;
    }
    if (dupData && dupData.length > 0) {
      toast.error('같은 이름의 상품이 이미 있습니다');
      return;
    }

    setSaving(true);

    const firstEnabled = weekdayRows.find(row => row.enabled);
    const payload: Record<string, unknown> = {
      branchId: getBranchId(),
      name: name.trim(),
      category: CAT_DB_MAP[effectiveCategory] ?? 'PRODUCT',
      price: cashVal,
      cashPrice: cashVal,
      cardPrice: cashVal,
      productType: TYPE_MAP[effectiveCategory] ?? 'GENERAL',
      duration: parseNum(duration),
      sessions: parseNum(sessions || useAmount),
      totalCount: parseNum(sessions || useAmount),
      description: description.trim() || null,
      isActive,
      kioskVisible,
      tag: tag.trim() || null,
      classType: classMode,
      deductionType: useType,
      dailyUseLimit: limitEnabled ? parseNum(limitCount) : null,
      holdingEnabled,
      transferEnabled,
      pointAccrual,
      salesChannel,
      usage_restrictions: weekdayRows.some(row => row.enabled)
        ? {
            availableDays: weekdayRows
              .filter(row => row.enabled)
              .map(row => DAY_ROWS.indexOf(row.day))
              .map(index => (index === 6 ? 0 : index + 1)),
            availableTimeStart: firstEnabled?.start ?? '09:00',
            availableTimeEnd: firstEnabled?.end ?? '18:00',
            weekdayPrice: null,
            weekendPrice: null,
          }
        : null,
    };

    if (!isCreateMode && product) {
      const { error } = await supabase.from('products').update(payload).eq('id', product.id);
      setSaving(false);
      if (error) {
        toast.error('수정에 실패했습니다.');
        return;
      }
      toast.success('상품이 수정되었습니다.');
      onSave(product.id);
      return;
    }

    const { data, error } = await supabase.from('products').insert(payload).select('id').single();
    setSaving(false);
    if (error || !data) {
      toast.error('등록에 실패했습니다.');
      return;
    }
    toast.success('상품이 등록되었습니다.');
    onSave((data as { id: number }).id);
  };

  const handleDeleteClick = async () => {
    if (!product) return;

    const { count, error: countError } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('productName', product.name)
      .eq('status', 'COMPLETED');

    if (countError) {
      // 조회 실패 시 기존 삭제 흐름으로 진행
      setActiveMembers(0);
      setDeleteConfirm(true);
      return;
    }

    const memberCount = count ?? 0;
    setActiveMembers(memberCount);

    if (memberCount > 0) {
      setDeactivateConfirm(true);
    } else {
      setDeleteConfirm(true);
    }
  };

  const handleDeactivate = async () => {
    if (!product) return;
    const { error } = await supabase.from('products').update({ isActive: false }).eq('id', product.id);
    if (error) {
      toast.error('비활성화에 실패했습니다.');
      return;
    }
    toast.success('상품이 미사용으로 전환되었습니다.');
    setDeactivateConfirm(false);
    onDelete();
  };

  const handleDelete = async () => {
    if (!product) return;

    const { error } = await supabase.from('products').delete().eq('id', product.id);
    if (error) {
      const fallback = await supabase.from('products').update({ isActive: false }).eq('id', product.id);
      if (fallback.error) {
        toast.error('삭제에 실패했습니다.');
        return;
      }
    }
    toast.success('상품이 삭제되었습니다.');
    setDeleteConfirm(false);
    onDelete();
  };

  const filteredImportProducts = importProducts.filter(item => item.name.toLowerCase().includes(importSearch.toLowerCase()));

  return (
    <div className="flex h-full flex-col bg-[#e7ebf1] p-1.5 text-[11px]">
      <div className={cn(panelClass, 'mx-auto flex h-full w-full max-w-[980px] flex-col overflow-hidden')}>
        <div className="flex items-center justify-between border-b border-[#9ca7b6] bg-[linear-gradient(180deg,#fdfefe_0%,#dfe6ef_100%)] px-2.5 py-1">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-bold">{isCreateMode ? '상품등록' : '상품수정'}</div>
            {!isCreateMode && (
              <StatusBadge variant={isActive ? 'mint' : 'default'} dot={isActive}>
                {isActive ? '활성' : '비활성'}
              </StatusBadge>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-[#4b5563] hover:text-[#111]">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#f4f4f4] p-1.5">
          <div className="space-y-1">
            <div className={cn(rowClass, 'border-b border-[#d7dbe2] pb-1')}>
              <RowLabel>상품구분</RowLabel>
              <div className="flex flex-1 flex-wrap items-center gap-3">
                {PRODUCT_KIND_OPTIONS.map(option => (
                  <label key={option} className={radioLabelClass}>
                    <input
                      type="radio"
                      name="productKind"
                      checked={productKind === option}
                      onChange={() => setProductKind(option)}
                      className="h-3.5 w-3.5 accent-[#4f8fe6]"
                    />
                    {option}
                  </label>
                ))}
              </div>
              {productKind === '레슨' && (
                <div className="flex items-center gap-2">
                  <div className="text-right font-semibold text-[#404040]">사용인원</div>
                  <input value="1" readOnly className="h-6 w-[46px] border border-[#d0a400] bg-[#fff46b] px-1 text-center text-[11px]" />
                </div>
              )}
            </div>

            <div className={rowClass}>
              <RowLabel>상품명</RowLabel>
              <input value={name} onChange={e => setName(e.target.value)} className={fieldClass} />
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className={rowClass}>
                <RowLabel>금액</RowLabel>
                <div className="relative min-w-0 flex-1">
                  <input
                    value={cashPrice}
                    onChange={e => handlePriceChange(e.target.value)}
                    className={cn(fieldClass, 'pr-10 text-right tabular-nums')}
                    inputMode="numeric"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#666]">원</span>
                </div>
              </div>

              {productKind === '레슨' && (
                <div className={rowClass}>
                  <RowLabel>레슨시간</RowLabel>
                  <select value={lessonTime} onChange={e => setLessonTime(e.target.value)} className={selectClass}>
                    {LESSON_TIME_OPTIONS.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}

              {productKind === '레슨' && (
                <div className={rowClass}>
                  <RowLabel>레슨유효기간</RowLabel>
                  <select value={lessonValidity} onChange={e => setLessonValidity(e.target.value)} className={selectClass}>
                    {LESSON_VALIDITY_OPTIONS.map(option => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {productKind === '레슨' && (
              <div className="grid grid-cols-2 gap-1.5">
                <div className={cn(rowClass, 'min-w-0')}>
                  <RowLabel>수업구분</RowLabel>
                  <div className="flex flex-wrap gap-3">
                    {(['개인', '정규클래스'] as const).map(option => (
                      <label key={option} className={radioLabelClass}>
                        <input
                          type="radio"
                          name="classMode"
                          checked={classMode === option}
                          onChange={() => setClassMode(option)}
                          className="h-3.5 w-3.5 accent-[#4f8fe6]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={rowClass}>
                  <RowLabel>태그</RowLabel>
                  <input value={tag} onChange={e => setTag(e.target.value)} className={fieldClass} />
                </div>
              </div>
            )}

            {productKind !== '레슨' && (
              <div className={rowClass}>
                <RowLabel>태그</RowLabel>
                <input value={tag} onChange={e => setTag(e.target.value)} className={fieldClass} />
              </div>
            )}

            {(productKind === '이용' || productKind === '락커') && (
              <div className="grid grid-cols-2 gap-1.5">
                {productKind === '이용' && (
                  <div className={cn(rowClass, 'min-w-0')}>
                    <RowLabel>이용구분</RowLabel>
                    <div className="flex flex-wrap gap-3">
                      {USE_TYPE_OPTIONS.map(option => (
                        <label key={option} className={radioLabelClass}>
                          <input
                            type="radio"
                            name="useType"
                            checked={useType === option}
                            onChange={() => setUseType(option)}
                            className="h-3.5 w-3.5 accent-[#4f8fe6]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(productKind === '락커' || (productKind === '이용' && useType === '기간')) && (
                  <div className={rowClass}>
                    <RowLabel>기간</RowLabel>
                    <input
                      value={useAmount}
                      onChange={e => {
                        setUseAmount(e.target.value);
                        setSessions(e.target.value);
                      }}
                      className={fieldClass}
                    />
                  </div>
                )}

                {productKind === '이용' && useType === '횟수' && (
                  <div className={rowClass}>
                    <RowLabel>횟수</RowLabel>
                    <input
                      value={useAmount}
                      onChange={e => {
                        setUseAmount(e.target.value);
                        setSessions(e.target.value);
                      }}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1.5">
              {productKind === '이용' && useType === '횟수' && (
                <div className={cn(rowClass, 'min-w-0')}>
                  <RowLabel>횟수제한</RowLabel>
                  <div className="flex min-w-0 items-center gap-2">
                    <label className={checkLabelClass}>
                      <ClassicCheckbox checked={limitEnabled} onChange={() => setLimitEnabled(prev => !prev)} />
                    </label>
                    <select
                      value={limitCount}
                      onChange={e => setLimitCount(e.target.value)}
                      disabled={!limitEnabled}
                      className={cn(selectClass, !limitEnabled && 'bg-[#ebebeb] text-[#999]')}
                    >
                      {LIMIT_COUNT_OPTIONS.map(option => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className={rowClass}>
                <RowLabel>설명</RowLabel>
                <input value={description} onChange={e => setDescription(e.target.value)} className={fieldClass} />
              </div>
            </div>

            <div className="grid grid-cols-[1.3fr_0.7fr] gap-1.5">
              <div className="border border-[#5a91d8] bg-[#f9fbff] p-1">
                <div className="mb-0.5 flex items-center justify-between border-b border-[#d7e6fb] pb-0.5">
                  <div className="font-semibold text-[#305f9f]">요일 / 시간설정</div>
                  <div className="text-[10px] text-[#69758a]">10분 단위</div>
                </div>
                <div className="grid grid-cols-1 gap-y-1">
                  {weekdayRows.map((row, index) => (
                    <div key={row.day} className="grid min-w-0 grid-cols-[30px_92px_10px_92px] items-center gap-1.5">
                      <label className="flex min-w-[30px] items-center gap-1 text-[11px] leading-none">
                        <ClassicCheckbox
                          checked={row.enabled}
                          onChange={() =>
                            setWeekdayRows(prev => prev.map((item, i) => (i === index ? { ...item, enabled: !item.enabled } : item)))
                          }
                        />
                        {row.day}
                      </label>
                      <select
                        value={row.start}
                        disabled={!row.enabled}
                        onChange={e =>
                          setWeekdayRows(prev => prev.map((item, i) => (i === index ? { ...item, start: e.target.value } : item)))
                        }
                        className={cn(
                          selectClass,
                          'h-6 w-[92px] px-1 text-[10px] tabular-nums',
                          !row.enabled && 'bg-[#ebebeb] text-[#999]'
                        )}
                      >
                        {TIME_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <span className="text-center text-[10px] text-[#666]">~</span>
                      <select
                        value={row.end}
                        disabled={!row.enabled}
                        onChange={e =>
                          setWeekdayRows(prev => prev.map((item, i) => (i === index ? { ...item, end: e.target.value } : item)))
                        }
                        className={cn(
                          selectClass,
                          'h-6 w-[92px] px-1 text-[10px] tabular-nums',
                          !row.enabled && 'bg-[#ebebeb] text-[#999]'
                        )}
                      >
                        {TIME_OPTIONS.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#5a91d8] bg-[#f9fbff] p-1">
                <div className="mb-0.5 border-b border-[#d7e6fb] pb-0.5 font-semibold text-[#305f9f]">옵션</div>
                <div className="grid grid-cols-1 gap-y-0.5">
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={reservationAvailable} onChange={() => setReservationAvailable(prev => !prev)} />
                    예약 가능
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={facilityAvailable} onChange={() => setFacilityAvailable(prev => !prev)} />
                    시설 이용 가능
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={holdingEnabled} onChange={() => setHoldingEnabled(prev => !prev)} />
                    홀딩 가능
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={transferEnabled} onChange={() => setTransferEnabled(prev => !prev)} />
                    양도 가능
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={pointAccrual} onChange={() => setPointAccrual(prev => !prev)} />
                    포인트 적립
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={memberPauseEnabled} onChange={() => setMemberPauseEnabled(prev => !prev)} />
                    회원 직접 휴회
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={kioskVisible} onChange={() => setKioskVisible(prev => !prev)} />
                    키오스크 노출
                  </label>
                  <label className={cn(checkLabelClass, 'min-w-0')}>
                    <ClassicCheckbox checked={isActive} onChange={() => setIsActive(prev => !prev)} />
                    활성 상태
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className={cn(rowClass, 'rounded-sm border border-[#d8dde6] bg-[#f8f9fb] px-1.5 py-1')}>
                <label className={cn(checkLabelClass, 'min-w-[92px] shrink-0')}>
                  <ClassicCheckbox checked={facilityAvailable} onChange={() => setFacilityAvailable(prev => !prev)} />
                  시설이용가능
                </label>
                <select value={facilityUseTime} onChange={e => setFacilityUseTime(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  {FACILITY_USE_TIME_OPTIONS.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className={cn(rowClass, 'rounded-sm border border-[#d8dde6] bg-[#f8f9fb] px-1.5 py-1')}>
                <label className={cn(checkLabelClass, 'min-w-[92px] shrink-0')}>
                  <ClassicCheckbox checked={reservationAvailable} onChange={() => setReservationAvailable(prev => !prev)} />
                  시설예약가능
                </label>
                <select value={reservationOpenDate} onChange={e => setReservationOpenDate(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  {RESERVATION_DAY_OPTIONS.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className={cn(rowClass, 'rounded-sm border border-[#d8dde6] bg-[#f8f9fb] px-1.5 py-1')}>
                <label className={cn(checkLabelClass, 'min-w-[118px] shrink-0')}>
                  <ClassicCheckbox checked={memberPauseEnabled} onChange={() => setMemberPauseEnabled(prev => !prev)} />
                  회원직접휴회가능
                </label>
                <select value={pauseCount} onChange={e => setPauseCount(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  {PAUSE_COUNT_OPTIONS.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <div className={cn(rowClass, 'min-w-0')}>
                <RowLabel>예약시간간격</RowLabel>
                <select value={reservationInterval} onChange={e => setReservationInterval(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  {RESERVATION_INTERVAL_OPTIONS.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className={cn(rowClass, 'min-w-0')}>
                <RowLabel>휴회기간</RowLabel>
                <select value={pausePeriod} onChange={e => setPausePeriod(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  {PAUSE_PERIOD_OPTIONS.map(option => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className={cn(rowClass, 'min-w-0')}>
                <RowLabel>판매유형</RowLabel>
                <select value={salesChannel} onChange={e => setSalesChannel(e.target.value)} className={cn(selectClass, 'min-w-0 flex-1')}>
                  <option value="ALL">전체</option>
                  <option value="COUNTER">현장</option>
                  <option value="KIOSK">키오스크</option>
                  <option value="ONLINE">온라인</option>
                </select>
              </div>
            </div>

            {/* 패키지 구성 섹션 */}
            <div className="border border-[#5a91d8] bg-[#f9fbff]">
              <button
                type="button"
                onClick={() => setPackageOpen(prev => !prev)}
                className="flex w-full items-center gap-1 px-2 py-1 text-left font-semibold text-[#305f9f] hover:bg-[#eef3fb]"
              >
                {packageOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                패키지 구성
                {packageItems.length > 0 && (
                  <span className="ml-1 rounded bg-[#2563eb] px-1 py-0 text-[10px] text-white">
                    {packageItems.length}
                  </span>
                )}
              </button>

              {packageOpen && (
                <div className="border-t border-[#d7e6fb] px-2 pb-2 pt-1.5 space-y-1.5">
                  {/* 구성 상품 추가 행 */}
                  <div className="flex items-center gap-1.5">
                    <select
                      value={packageSelectId}
                      onChange={e => setPackageSelectId(e.target.value)}
                      className={cn(selectClass, 'flex-1')}
                    >
                      <option value="">상품 선택</option>
                      {importProducts
                        .filter(p => !packageItems.some(i => i.productId === p.id))
                        .map(p => (
                          <option key={p.id} value={String(p.id)}>
                            {p.name} ({formatNum(p.cashPrice ?? p.price)}원)
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!packageSelectId) return;
                        const found = importProducts.find(p => p.id === Number(packageSelectId));
                        if (!found) return;
                        setPackageItems(prev => [
                          ...prev,
                          { productId: found.id, productName: found.name, price: found.cashPrice ?? found.price },
                        ]);
                        setPackageSelectId('');
                      }}
                      className="inline-flex items-center gap-0.5 border border-[#5a91d8] bg-white px-2 py-0.5 text-[11px] text-[#305f9f] hover:bg-[#eef3fb]"
                    >
                      <Plus size={11} />
                      추가
                    </button>
                  </div>

                  {/* 구성 상품 목록 */}
                  {packageItems.length > 0 && (
                    <div className="rounded border border-[#d7e6fb] bg-white">
                      {packageItems.map(item => (
                        <div key={item.productId} className="flex items-center justify-between border-b border-[#eef3fb] px-2 py-0.5 last:border-b-0">
                          <span className="flex-1 truncate">{item.productName}</span>
                          <span className="ml-2 shrink-0 tabular-nums text-[#555]">{formatNum(item.price)}원</span>
                          <button
                            type="button"
                            onClick={() => setPackageItems(prev => prev.filter(i => i.productId !== item.productId))}
                            className="ml-2 shrink-0 text-[#c53131] hover:text-[#991b1b]"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between border-t border-[#d7e6fb] px-2 py-0.5 bg-[#f4f8ff]">
                        <span className="font-semibold text-[#305f9f]">합산 정가</span>
                        <span className="tabular-nums font-semibold text-[#305f9f]">
                          {formatNum(packageItems.reduce((sum, i) => sum + i.price, 0))}원
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 패키지 가격 입력 */}
                  <div className={rowClass}>
                    <RowLabel>패키지 가격</RowLabel>
                    <div className="relative min-w-0 flex-1">
                      <input
                        value={packagePrice}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          const num = parseInt(raw, 10);
                          setPackagePrice(Number.isNaN(num) ? '' : num.toLocaleString());
                        }}
                        placeholder="할인가 직접 입력"
                        className={cn(fieldClass, 'pr-10 text-right tabular-nums')}
                        inputMode="numeric"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[#666]">원</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#b7bdc7] bg-[#efefef] px-2 py-1.5">
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-1 border border-[#b7bdc7] bg-white px-2 py-0.5 text-[11px] hover:bg-[#f8f8f8]"
          >
            <Search size={13} />
            상품정보가져오기
          </button>

          <div className="flex items-center gap-1.5">
            {deactivateConfirm ? (
              <>
                <span className="mr-2 text-[11px] font-semibold text-[#c53131]">
                  이 상품을 이용 중인 회원이 {activeMembers}명 있습니다. &apos;미사용&apos;으로 전환하시겠습니까?
                </span>
                <button
                  type="button"
                  onClick={() => setDeactivateConfirm(false)}
                  className="border border-[#b7bdc7] bg-white px-3 py-0.5 text-[11px]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="border border-[#b94f4f] bg-[#df5c5c] px-3 py-0.5 text-[11px] font-bold text-white"
                >
                  미사용 전환
                </button>
              </>
            ) : deleteConfirm ? (
              <>
                <span className="mr-2 text-[11px] font-semibold text-[#c53131]">정말 삭제하시겠습니까?</span>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(false)}
                  className="border border-[#b7bdc7] bg-white px-3 py-0.5 text-[11px]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="border border-[#b94f4f] bg-[#df5c5c] px-3 py-0.5 text-[11px] font-bold text-white"
                >
                  삭제 확인
                </button>
              </>
            ) : (
              <>
                {!isCreateMode && product && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    className="inline-flex items-center gap-1 border border-[#d88d8d] bg-white px-3 py-0.5 text-[11px] text-[#c53131]"
                  >
                    <Trash2 size={13} />
                    삭제
                  </button>
                )}
                <button type="button" onClick={onClose} className="border border-[#b7bdc7] bg-white px-3 py-0.5 text-[11px]">
                  닫기
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 border border-[#1d4ed8] bg-[#2563eb] px-3 py-0.5 text-[11px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:border-[#1e40af] hover:bg-[#1d4ed8] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_1px_rgba(255,255,255,0.08)] disabled:opacity-60 disabled:hover:border-[#1d4ed8] disabled:hover:bg-[#2563eb] disabled:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]"
                >
                  {saving ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Save size={13} />
                  )}
                  {isCreateMode ? '등록' : '저장'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="상품정보 가져오기"
        size="lg"
      >
        <div className="space-y-3">
          <input
            value={importSearch}
            onChange={e => setImportSearch(e.target.value)}
            placeholder="상품명 검색"
            className="h-9 w-full rounded-md border border-line bg-white px-3 text-sm outline-none focus:border-primary"
          />
          <div className="max-h-[420px] overflow-y-auto rounded-md border border-line bg-white">
            {importLoading ? (
              <div className="p-4 text-sm text-content-secondary">불러오는 중...</div>
            ) : filteredImportProducts.length === 0 ? (
              <div className="p-4 text-sm text-content-secondary">가져올 상품이 없습니다.</div>
            ) : (
              <div className="divide-y divide-line">
                {filteredImportProducts.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      applyProductToForm(item, { markAsCopy: true });
                      setShowImportModal(false);
                      toast.success('상품 정보를 불러왔습니다. 등록 시 새 상품으로 저장됩니다.');
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-secondary"
                  >
                    <div>
                      <div className="text-sm font-medium text-content">{item.name}</div>
                      <div className="text-xs text-content-secondary">
                        {CAT_KO_MAP[item.category] ?? item.category} · {formatNum(item.cashPrice ?? item.price)}원
                      </div>
                    </div>
                    <div className="text-xs text-primary">선택</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
