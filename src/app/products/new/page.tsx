'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from "@/components/layout/AppLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { moveToPage } from '@/internal';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { formatPrice, parsePrice, productFormSchema } from '@/lib/validations';
import type { z } from 'zod';

type ProductFormData = z.input<typeof productFormSchema>;

type ProductKind = '레슨' | '이용' | '락커' | '판매';
type UseCategory = '기간' | '횟수' | '포인트';

const PRODUCT_KIND_OPTIONS: ProductKind[] = ['레슨', '이용', '락커', '판매'];
const USE_CATEGORY_OPTIONS: UseCategory[] = ['기간', '횟수', '포인트'];
const OCCUPANCY_OPTIONS = ['1명', '2명', '3명', '4명'];
const LESSON_DURATION_OPTIONS = [
  '선택',
  '10분',
  '20분',
  '30분',
  '40분',
  '50분',
  '60분',
  '70분',
  '80분',
  '90분',
  '100분',
  '110분',
  '120분',
];
const LESSON_VALIDITY_OPTIONS = ['선택', '1개월', '3개월', '6개월', '12개월'];
const LIMIT_OPTIONS = ['제한없음', '1회', '2회', '3회', '5회', '10회'];
const DEFAULT_OPTIONS = ['기본', '사용', '선택', '필수'];
const RESERVATION_DAY_OPTIONS = ['당일', '1일 전', '3일 전', '7일 전', '14일 전', '30일 전'];
const RESERVATION_INTERVAL_OPTIONS = ['10분', '20분', '30분', '40분', '50분', '60분'];
const PAUSE_PERIOD_OPTIONS = ['선택', '3일', '7일', '15일', '30일', '60일'];

const WEEKDAY_ROWS = ['월', '화', '수', '목', '금', '토', '일'];

const getBranchId = (): number => {
  if (typeof window === 'undefined') return 1;
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

const mapKindToCategory = (kind: ProductKind): string => {
  switch (kind) {
    case '레슨':
      return 'PT';
    case '이용':
      return '이용권';
    case '락커':
      return '기타';
    case '판매':
      return '기타';
    default:
      return '이용권';
  }
};

const mapCategoryToKind = (category: string): ProductKind => {
  switch (category) {
    case 'PT':
    case 'GX':
      return '레슨';
    case '이용권':
      return '이용';
    case '기타':
    default:
      return '판매';
  }
};

const emptyDayRows = () =>
  WEEKDAY_ROWS.map(day => ({
    day,
    enabled: false,
    from: '',
    to: '',
  }));

function ClassicRadio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-[11px] leading-none text-[#333] cursor-pointer">
      <span
        className={cn(
          'flex h-[12px] w-[12px] items-center justify-center rounded-full border border-[#666] bg-white',
          checked && 'border-[#2f6db5]'
        )}
      >
        {checked && <span className="h-[4px] w-[4px] rounded-full bg-[#2f6db5]" />}
      </span>
      <input type="radio" checked={checked} onChange={onChange} className="hidden" />
      <span>{label}</span>
    </label>
  );
}

function ClassicCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'inline-flex items-center gap-1 text-[11px] leading-none',
        disabled ? 'cursor-not-allowed text-[#9a9a9a]' : 'cursor-pointer text-[#4a4a4a]'
      )}
    >
      <span
        className={cn(
          'flex h-[12px] w-[12px] items-center justify-center border border-[#9e9e9e] bg-white',
          disabled && 'bg-[#f1f1f1]'
        )}
      >
        {checked && !disabled && <span className="h-[6px] w-[6px] bg-[#8b8b8b]" />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />
      <span>{label}</span>
    </label>
  );
}

function SelectBox({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-5 w-full border border-[#bdbdbd] bg-[#f4f4f4] px-1 text-[11px] text-[#444] outline-none',
        disabled && 'bg-[#ececec] text-[#9a9a9a]'
      )}
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ProductForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get('id') ?? null;
  const isEditMode = !!editId;

  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [existingProducts, setExistingProducts] = useState<{ name: string; category: string }[]>([]);

  const [productKind, setProductKind] = useState<ProductKind>('이용');
  const [occupancy, setOccupancy] = useState('1명');
  const [lessonDuration, setLessonDuration] = useState('선택');
  const [lessonValidity, setLessonValidity] = useState('선택');
  const [classMode, setClassMode] = useState<'개인' | '정규클래스'>('개인');
  const [useCategory, setUseCategory] = useState<UseCategory>('기간');
  const [useAmount, setUseAmount] = useState('');
  const [countLimitEnabled, setCountLimitEnabled] = useState(false);
  const [useLimit, setUseLimit] = useState('제한없음');
  const [countLimitValue, setCountLimitValue] = useState('1회');
  const [dayRows, setDayRows] = useState(emptyDayRows);
  const [optionStates, setOptionStates] = useState({
    lockerAvailable: false,
    reservationAvailable: false,
    memberDirectTransfer: false,
    instructorReview: false,
    reservationRoomRequired: false,
    transferable: false,
    staffAddition: false,
    unusedPauseAvailable: false,
    autoExtendUseTime: false,
    kioskUsage: false,
    lessonReservationRequired: false,
  });
  const [footerSelects, setFooterSelects] = useState({
    facilityUseTime: '기본',
    reservationOpenDate: '당일',
    reservationTimeGap: '10분',
    pauseCount: '선택',
    pausePeriod: '선택',
  });
  const [classType, setClassType] = useState('');
  const [deductionType, setDeductionType] = useState('');
  const [suspendLimit, setSuspendLimit] = useState('');
  const [dailyUseLimit, setDailyUseLimit] = useState('');
  const [productGroupId, setProductGroupId] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      category: '이용권',
      name: '',
      priceCash: '',
      priceCard: '',
      period: '',
      count: '',
      description: '',
      tags: '',
      isKioskExposed: true,
      isUsed: true,
      isHoldingEnabled: false,
      holdingMaxDays: '',
      holdingMaxCount: '',
    },
    mode: 'onBlur',
  });

  const watchedCategory = watch('category');
  const watchedName = watch('name');
  const watchedPriceCash = watch('priceCash');
  const watchedPriceCard = watch('priceCard');

  useEffect(() => {
    const fetchExisting = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('name, category')
        .eq('branchId', getBranchId());
      if (!error && data) {
        setExistingProducts(data as { name: string; category: string }[]);
      }
    };
    fetchExisting();
  }, []);

  useEffect(() => {
    if (!editId) return;

    const fetchProduct = async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', editId).single();
      if (error || !data) {
        toast.error('상품 정보를 불러오지 못했습니다.');
        return;
      }

      const categoryMap: Record<string, string> = {
        MEMBERSHIP: '이용권',
        PT: 'PT',
        GX: 'GX',
        PRODUCT: '기타',
        SERVICE: '기타',
      };

      const category = categoryMap[data.category] ?? data.category ?? '이용권';
      setValue('category', category);
      setProductKind(mapCategoryToKind(category));
      setValue('name', data.name ?? '');
      setValue('priceCash', data.cashPrice ? formatPrice(String(Number(data.cashPrice))) : '');
      setValue('priceCard', data.cardPrice ? formatPrice(String(Number(data.cardPrice))) : '');
      setValue('period', data.duration?.toString() ?? '');
      setValue('count', data.sessions?.toString() ?? '');
      setValue('description', data.description ?? '');
      setValue('isUsed', data.isActive ?? true);
      setValue('isKioskExposed', data.kioskVisible ?? true);
      setValue('tags', data.tag ?? '');
      setClassType(data.classType ?? '');
      setDeductionType(data.deductionType ?? '');
      setSuspendLimit(data.suspendLimit?.toString() ?? '');
      setDailyUseLimit(data.dailyUseLimit?.toString() ?? '');
      setProductGroupId(data.productGroupId?.toString() ?? '');
    };

    fetchProduct();
  }, [editId, setValue]);

  const checkDuplicate = (name: string, category: string): boolean => {
    const originalName = isEditMode ? watchedName : null;
    return existingProducts.some(
      product => product.category === category && product.name === name && product.name !== originalName
    );
  };

  const handlePriceChange = (field: 'priceCash' | 'priceCard', value: string) => {
    const raw = value.replace(/[^0-9]/g, '');
    const formatted = formatPrice(raw);
    setValue(field, formatted, { shouldValidate: true });
    if (!formatted) {
      setError(field, { message: '가격은 1원 이상이어야 합니다.' });
      return;
    }
    clearErrors(field);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('name', value, { shouldValidate: false });

    if (!value) {
      setError('name', { message: '상품명을 입력해주세요.' });
      return;
    }

    if (checkDuplicate(value, watchedCategory)) {
      setError('name', { message: `'${value}' 상품명이 이미 존재합니다.` });
      return;
    }

    clearErrors('name');
  };

  const handleKindChange = (kind: ProductKind) => {
    setProductKind(kind);
    setValue('category', mapKindToCategory(kind), { shouldValidate: true });
    if (kind === '레슨') {
      setUseCategory('횟수');
    }
  };

  const handleDayRowChange = (index: number, key: 'enabled' | 'from' | 'to', value: boolean | string) => {
    setDayRows(prev =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row))
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    if (checkDuplicate(data.name, data.category)) {
      setError('name', { message: `'${data.name}' 상품명이 이미 존재합니다.` });
      return;
    }

    setIsSaving(true);

    const categoryMap: Record<string, string> = {
      이용권: 'MEMBERSHIP',
      PT: 'PT',
      GX: 'GX',
      기타: 'PRODUCT',
    };

    const typeMap: Record<string, string> = {
      이용권: 'MEMBERSHIP',
      PT: 'LESSON',
      GX: 'LESSON',
      기타: 'GENERAL',
    };

    const productData = {
      branchId: getBranchId(),
      name: data.name,
      category: categoryMap[data.category] ?? 'PRODUCT',
      price: parsePrice(data.priceCash),
      cashPrice: parsePrice(data.priceCash),
      cardPrice: parsePrice(data.priceCard),
      productType: typeMap[data.category] ?? 'GENERAL',
      totalCount: data.count ? Number(data.count) : null,
      duration: data.period ? Number(data.period) : null,
      sessions: data.count ? Number(data.count) : null,
      description: data.description || null,
      isActive: data.isUsed,
      kioskVisible: data.isKioskExposed ?? true,
      tag: data.tags || null,
      classType: classType || classMode,
      deductionType: deductionType || useCategory,
      suspendLimit: suspendLimit ? Number(suspendLimit) : null,
      dailyUseLimit: dailyUseLimit ? Number(dailyUseLimit) : null,
      productGroupId: productGroupId ? Number(productGroupId) : null,
    };

    const query = isEditMode
      ? supabase.from('products').update(productData).eq('id', editId)
      : supabase.from('products').insert(productData);

    const { error } = await query;
    setIsSaving(false);

    if (error) {
      toast.error(isEditMode ? '수정에 실패했습니다.' : '등록에 실패했습니다.');
      return;
    }

    toast.success(isEditMode ? '상품이 수정되었습니다.' : '상품이 등록되었습니다.');
    moveToPage(972);
  };

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-96px)] items-start justify-center bg-[#ececec] px-3 py-5 font-['Malgun_Gothic']">
        <div className="w-full max-w-[472px] overflow-hidden rounded-[3px] border border-[#9a9a9a] bg-[#d7d7d7] shadow-[0_10px_20px_rgba(0,0,0,0.18)]">
          <div className="h-[3px] bg-[#4aa7df]" />
          <div className="flex h-7 items-center justify-between border-b border-[#b8b8b8] bg-[linear-gradient(to_bottom,#f7f7f7,#dfdfdf)] px-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#2f2f2f]">
              <div className="h-[16px] w-[16px] rounded-full border border-[#909090] bg-white" />
              <span>{isEditMode ? '상품수정' : '상품등록'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowCancelConfirm(true)}
              className="text-[#555] transition-colors hover:text-[#111]"
              aria-label="닫기"
            >
              <X size={14} />
            </button>
          </div>

          <div className="bg-[#efefef] p-[8px] text-[11px] text-[#333]">
            <div className="space-y-[6px] border border-[#c7c7c7] bg-[#f5f5f5] p-[10px]">
              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[44px_1fr_52px_78px] md:items-center">
                <div className="font-bold text-[#555]">상품구분</div>
                <div className="flex flex-wrap items-center gap-3">
                  {PRODUCT_KIND_OPTIONS.map(kind => (
                    <ClassicRadio
                      key={kind}
                      checked={productKind === kind}
                      onChange={() => handleKindChange(kind)}
                      label={kind}
                    />
                  ))}
                </div>
                <div className="justify-self-end font-bold text-[#555]">사용인원</div>
                <SelectBox value={occupancy} onChange={setOccupancy} options={OCCUPANCY_OPTIONS} />
              </div>

              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[44px_1fr] md:items-center">
                <div className="font-bold text-[#555]">상품명</div>
                <div>
                  <input
                    type="text"
                    {...register('name')}
                    onChange={handleNameChange}
                    className={cn(
                      'h-5 w-full border bg-[#fff8c9] px-2 text-[11px] outline-none',
                      errors.name ? 'border-[#df6b6b]' : 'border-[#bdbdbd]'
                    )}
                  />
                  {errors.name && <p className="mt-1 text-[11px] text-[#cc3b3b]">{errors.name.message}</p>}
                </div>
              </div>

              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[44px_60px_54px_90px_78px_96px] md:items-center">
                <div className="font-bold text-[#555]">금액</div>
                <div className="flex items-center border border-[#bdbdbd] bg-[#efefef]">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={watchedPriceCash}
                    onChange={e => handlePriceChange('priceCash', e.target.value)}
                    className="h-5 w-full bg-transparent px-1 text-right text-[11px] outline-none"
                  />
                  <span className="pr-1 text-[11px]">원</span>
                </div>

                <div className="justify-self-end font-bold text-[#555]">레슨시간</div>
                <SelectBox value={lessonDuration} onChange={setLessonDuration} options={LESSON_DURATION_OPTIONS} />

                <div className="justify-self-end font-bold text-[#555]">레슨유효기간</div>
                <SelectBox value={lessonValidity} onChange={setLessonValidity} options={LESSON_VALIDITY_OPTIONS} />
              </div>

              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[44px_124px_54px_1fr] md:items-center">
                <div className="font-bold text-[#555]">수업구분</div>
                <div className="flex flex-wrap items-center gap-3">
                  <ClassicRadio
                    checked={classMode === '개인'}
                    onChange={() => setClassMode('개인')}
                    label="개인"
                  />
                  <ClassicRadio
                    checked={classMode === '정규클래스'}
                    onChange={() => setClassMode('정규클래스')}
                    label="정규클래스"
                  />
                </div>

                <div className="justify-self-end font-bold text-[#555]">이용구분</div>
                <div className="flex flex-wrap items-center gap-2">
                  {USE_CATEGORY_OPTIONS.map(option => (
                    <ClassicRadio
                      key={option}
                      checked={useCategory === option}
                      onChange={() => setUseCategory(option)}
                      label={option}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[66px_90px_1fr] md:items-center">
                <div className="font-bold text-[#555]">횟수/포인트</div>
                <input
                  type="text"
                  value={useAmount}
                  onChange={e => setUseAmount(e.target.value)}
                  placeholder={useCategory === '포인트' ? '포인트 입력' : '횟수 입력'}
                  className="h-5 border border-[#bdbdbd] bg-white px-2 text-[11px] outline-none"
                />
                <div className="text-[10px] text-[#666]">
                  현재 이용구분: {useCategory}
                </div>
              </div>

              <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[66px_1fr]">
                <div className="font-bold text-[#555] md:pt-[2px]">세부설정</div>
                <div className="space-y-[6px]">
                  <div className="grid gap-x-[6px] gap-y-[4px] md:grid-cols-[76px_100px_86px_1fr] md:items-center">
                    <ClassicCheckbox
                      checked={countLimitEnabled}
                      onChange={() => setCountLimitEnabled(prev => !prev)}
                      label="횟수 제한"
                    />
                    <SelectBox
                      value={useLimit}
                      onChange={setUseLimit}
                      options={LIMIT_OPTIONS}
                      disabled={!countLimitEnabled}
                    />
                    <SelectBox
                      value={countLimitValue}
                      onChange={setCountLimitValue}
                      options={['1회', '2회', '3회', '5회', '10회']}
                      disabled={!countLimitEnabled || useLimit === '제한없음'}
                    />
                    <div className="text-[10px] text-[#777]">
                      {countLimitEnabled ? '횟수 제한 사용' : '제한 없음'}
                    </div>
                  </div>

                  <div className="border border-[#4d95e6] bg-[#f8fbff] p-[8px]">
                    <div className="grid gap-3 lg:grid-cols-[1.08fr_0.92fr]">
                      <div>
                        <div className="mb-[4px] flex items-center gap-2 text-[11px]">
                          <ClassicCheckbox checked label="요일/시간설정" onChange={() => undefined} />
                        </div>
                        <div className="space-y-[2px]">
                          {dayRows.map((row, index) => (
                            <div key={row.day} className="grid grid-cols-[14px_12px_1fr_8px_1fr] items-center gap-1">
                              <ClassicCheckbox
                                checked={row.enabled}
                                onChange={() => handleDayRowChange(index, 'enabled', !row.enabled)}
                                label=""
                              />
                              <span className="text-[11px] text-[#555]">{row.day}</span>
                              <input
                                type="time"
                                value={row.from}
                                disabled={!row.enabled}
                                onChange={e => handleDayRowChange(index, 'from', e.target.value)}
                                className={cn(
                                  'h-5 border border-[#bdbdbd] px-1 text-[11px] outline-none',
                                  row.enabled ? 'bg-white text-[#333]' : 'bg-[#ececec] text-[#999]'
                                )}
                              />
                              <span className="text-center text-[11px] text-[#666]">~</span>
                              <input
                                type="time"
                                value={row.to}
                                disabled={!row.enabled}
                                onChange={e => handleDayRowChange(index, 'to', e.target.value)}
                                className={cn(
                                  'h-5 border border-[#bdbdbd] px-1 text-[11px] outline-none',
                                  row.enabled ? 'bg-white text-[#333]' : 'bg-[#ececec] text-[#999]'
                                )}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-y-[4px]">
                        <ClassicCheckbox
                          checked={optionStates.instructorReview}
                          onChange={() =>
                            setOptionStates(prev => ({ ...prev, instructorReview: !prev.instructorReview }))
                          }
                          label="강사변경가능"
                        />
                        <ClassicCheckbox
                          checked={optionStates.lessonReservationRequired}
                          onChange={() =>
                            setOptionStates(prev => ({
                              ...prev,
                              lessonReservationRequired: !prev.lessonReservationRequired,
                            }))
                          }
                          label="레슨예약시 시설선택 필수"
                        />
                        <ClassicCheckbox
                          checked={optionStates.transferable}
                          onChange={() => setOptionStates(prev => ({ ...prev, transferable: !prev.transferable }))}
                          label="양도가능"
                        />
                        <ClassicCheckbox
                          checked={optionStates.memberDirectTransfer}
                          onChange={() =>
                            setOptionStates(prev => ({ ...prev, memberDirectTransfer: !prev.memberDirectTransfer }))
                          }
                          label="매출기대가능"
                        />
                        <ClassicCheckbox
                          checked={optionStates.staffAddition}
                          onChange={() => setOptionStates(prev => ({ ...prev, staffAddition: !prev.staffAddition }))}
                          label="재추가점 이용가능"
                        />
                        <ClassicCheckbox
                          checked={optionStates.autoExtendUseTime}
                          onChange={() =>
                            setOptionStates(prev => ({ ...prev, autoExtendUseTime: !prev.autoExtendUseTime }))
                          }
                          label="이용시간 자동연장"
                        />
                        <ClassicCheckbox
                          checked={optionStates.kioskUsage}
                          onChange={() => setOptionStates(prev => ({ ...prev, kioskUsage: !prev.kioskUsage }))}
                          label="키오스크 예약판매 가능"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-x-[10px] gap-y-[4px] md:grid-cols-2">
                <div className="space-y-[4px]">
                  <div className="flex items-center gap-2">
                    <ClassicCheckbox
                      checked={optionStates.lockerAvailable}
                      onChange={() =>
                        setOptionStates(prev => ({ ...prev, lockerAvailable: !prev.lockerAvailable }))
                      }
                      label="시설이용가능"
                    />
                    <div className="grid flex-1 grid-cols-[66px_1fr] items-center gap-1">
                      <span className="font-bold text-[#555]">시설이용시간</span>
                      <SelectBox
                        value={footerSelects.facilityUseTime}
                        onChange={value => setFooterSelects(prev => ({ ...prev, facilityUseTime: value }))}
                        options={['기본', '오전', '오후', '종일']}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ClassicCheckbox
                      checked={optionStates.reservationAvailable}
                      onChange={() =>
                        setOptionStates(prev => ({ ...prev, reservationAvailable: !prev.reservationAvailable }))
                      }
                      label="시설예약가능"
                    />
                    <div className="grid flex-1 grid-cols-[78px_1fr] items-center gap-1">
                      <span className="font-bold text-[#555]">시설예약가능일</span>
                      <SelectBox
                        value={footerSelects.reservationOpenDate}
                        onChange={value => setFooterSelects(prev => ({ ...prev, reservationOpenDate: value }))}
                        options={RESERVATION_DAY_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ClassicCheckbox
                      checked={optionStates.memberDirectTransfer}
                      onChange={() =>
                        setOptionStates(prev => ({ ...prev, memberDirectTransfer: !prev.memberDirectTransfer }))
                      }
                      label="회원직접휴회가능"
                    />
                    <div className="grid flex-1 grid-cols-[52px_1fr] items-center gap-1">
                      <span className="font-bold text-[#555]">휴회횟수</span>
                      <SelectBox
                        value={footerSelects.pauseCount}
                        onChange={value => setFooterSelects(prev => ({ ...prev, pauseCount: value }))}
                        options={['선택', '1회', '2회', '3회']}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-[4px]">
                  <div className="grid grid-cols-[66px_1fr] items-center gap-1">
                    <span className="font-bold text-[#555]">예약시간간격</span>
                    <SelectBox
                      value={footerSelects.reservationTimeGap}
                      onChange={value => setFooterSelects(prev => ({ ...prev, reservationTimeGap: value }))}
                      options={RESERVATION_INTERVAL_OPTIONS}
                    />
                  </div>

                  <div className="grid grid-cols-[52px_1fr] items-center gap-1">
                    <span className="font-bold text-[#555]">휴회기간</span>
                    <SelectBox
                      value={footerSelects.pausePeriod}
                      onChange={value => setFooterSelects(prev => ({ ...prev, pausePeriod: value }))}
                      options={PAUSE_PERIOD_OPTIONS}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-x-[10px] gap-y-[4px] border-t border-[#d5d5d5] pt-[6px] md:grid-cols-2">
                <div className="grid gap-1 md:grid-cols-[52px_1fr] md:items-center">
                  <div className="font-bold text-[#555]">유효기간</div>
                  <input
                    type="text"
                    {...register('period')}
                    placeholder="예: 30"
                    className={cn(
                      'h-5 border bg-white px-2 text-[11px] outline-none',
                      errors.period ? 'border-[#df6b6b]' : 'border-[#bdbdbd]'
                    )}
                  />
                </div>

                <div className="grid gap-1 md:grid-cols-[52px_1fr] md:items-center">
                  <div className="font-bold text-[#555]">이용횟수</div>
                  <input
                    type="text"
                    {...register('count')}
                    placeholder="예: 10"
                    className="h-5 border border-[#bdbdbd] bg-white px-2 text-[11px] outline-none"
                  />
                </div>

                <div className="grid gap-1 md:grid-cols-[52px_1fr] md:items-center">
                  <div className="font-bold text-[#555]">설명</div>
                  <input
                    type="text"
                    {...register('description')}
                    className="h-5 border border-[#bdbdbd] bg-white px-2 text-[11px] outline-none"
                  />
                </div>

                <div className="grid gap-1 md:grid-cols-[52px_1fr] md:items-center">
                  <div className="font-bold text-[#555]">태그</div>
                  <input
                    type="text"
                    {...register('tags')}
                    className="h-5 border border-[#bdbdbd] bg-white px-2 text-[11px] outline-none"
                  />
                </div>
              </div>

              <div className="hidden">
                <input type="text" {...register('category')} readOnly />
                <input type="checkbox" {...register('isUsed')} readOnly checked />
                <input type="checkbox" {...register('isKioskExposed')} readOnly checked={optionStates.kioskUsage} />
                <input type="checkbox" {...register('isHoldingEnabled')} readOnly checked={false} />
                <input type="text" {...register('holdingMaxDays')} readOnly value={suspendLimit} />
                <input type="text" {...register('holdingMaxCount')} readOnly value={dailyUseLimit} />
              </div>
            </div>

            {(errors.priceCash || errors.priceCard || errors.period) && (
              <div className="mt-2 flex items-start gap-2 border border-[#efb0b0] bg-[#fff3f3] px-2 py-1.5 text-[10px] text-[#ba3a3a]">
                <AlertCircle size={14} className="mt-[1px] shrink-0" />
                <div className="space-y-0.5">
                  {errors.priceCash && <p>{errors.priceCash.message}</p>}
                  {errors.priceCard && <p>{errors.priceCard.message}</p>}
                  {errors.period && <p>{errors.period.message}</p>}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#bfbfbf] bg-[#ececec] px-2 py-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 border border-[#a8a8a8] bg-[linear-gradient(to_bottom,#ffffff,#dcdcdc)] px-2 py-[3px] text-[11px] text-[#444]"
            >
              <Search size={12} />
              상품정보가져오기
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="border border-[#d8a075] bg-[linear-gradient(to_bottom,#fff8f3,#ffd1ac)] px-3 py-[3px] text-[11px] font-bold text-[#d96e18]"
              >
                신규
              </button>
              <button
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving}
                className="border border-[#d26e2d] bg-[linear-gradient(to_bottom,#fff3ec,#ff9b5a)] px-3 py-[3px] text-[11px] font-bold text-[#c04d00] disabled:opacity-60"
              >
                {isSaving ? '저장중...' : '등록2'}
              </button>
              <button
                type="button"
                onClick={() => setShowCancelConfirm(true)}
                className="border border-[#b8b8b8] bg-[linear-gradient(to_bottom,#ffffff,#dddddd)] px-3 py-[3px] text-[11px] font-bold text-[#666]"
              >
                종료
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        title="작업 취소"
        description="입력 중인 정보가 저장되지 않고 사라집니다. 목록으로 돌아가시겠습니까?"
        confirmLabel="돌아가기"
        cancelLabel="계속 작성"
        variant="danger"
        onConfirm={() => moveToPage(972)}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </AppLayout>
  );
}

export default function ProductFormPage() {
  return (
    <React.Suspense>
      <ProductForm />
    </React.Suspense>
  );
}
