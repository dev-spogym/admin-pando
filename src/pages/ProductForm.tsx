import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Clock,
  Lock,
  CheckCircle2,
  AlertCircle,
  Tag as TagIcon,
  ChevronRight,
  UserCheck,
  CreditCard,
  Banknote,
  CalendarDays,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { moveToPage } from '@/internal';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import FormSection from '@/components/FormSection';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { supabase } from '@/lib/supabase';
import {
  productFormSchema,
  formatPrice,
  parsePrice,
} from '@/lib/validations';
import type { z } from 'zod';

type ProductFormData = z.input<typeof productFormSchema>;

const getBranchId = (): number => {
  const stored = localStorage.getItem('branchId');
  return stored ? Number(stored) : 1;
};

// 카테고리별 동적 하위 필드 정의
const CATEGORY_CONFIG: Record<
  string,
  { periodLabel: string; showCount: boolean; countLabel: string; showDays: boolean }
> = {
  이용권: { periodLabel: '이용기간 (개월)', showCount: false, countLabel: '', showDays: false },
  PT: { periodLabel: '유효기간 (일)', showCount: true, countLabel: '총 횟수 (회)', showDays: false },
  GX: { periodLabel: '유효기간 (개월)', showCount: true, countLabel: '총 횟수 (회)', showDays: true },
  기타: { periodLabel: '이용기간', showCount: false, countLabel: '', showDays: false },
};

const CATEGORIES = ['이용권', 'PT', 'GX', '기타'];

const PRODUCT_TYPES = [
  { id: '이용권', label: '이용권', desc: '헬스 등 기간 이용권', icon: UserCheck, color: 'text-primary' },
  { id: 'PT', label: 'PT', desc: '1:1 개인 레슨 횟수권', icon: CalendarDays, color: 'text-accent' },
  { id: 'GX', label: 'GX', desc: '그룹 수업 횟수권', icon: CheckCircle2, color: 'text-state-info' },
  { id: '기타', label: '기타', desc: '락커, 운동복, 일반 상품', icon: Lock, color: 'text-content-secondary' },
];

export default function ProductForm() {
  // URL 쿼리 파라미터로 수정 모드 감지
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditMode = !!editId;

  const [showTypeSelection, setShowTypeSelection] = useState(!isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [existingProducts, setExistingProducts] = useState<{ name: string; category: string }[]>([]);

  // useTimeRanges: react-hook-form 외부 별도 state (복잡한 배열 필드)
  const [useTimeRanges, setUseTimeRanges] = useState([
    { day: '월~금', startTime: '06:00', endTime: '23:00' },
    { day: '토~일', startTime: '10:00', endTime: '20:00' },
  ]);

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
      category: '',
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
  const watchedIsUsed = watch('isUsed');
  const watchedIsKioskExposed = watch('isKioskExposed');
  const watchedIsHoldingEnabled = watch('isHoldingEnabled');

  // 기존 상품 목록 로드 (중복 체크용)
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

  // 수정 모드: URL의 id로 기존 상품 데이터 로드
  useEffect(() => {
    if (!editId) return;
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', editId)
        .single();
      if (error || !data) {
        toast.error('상품 정보를 불러오지 못했습니다.');
        return;
      }
      // DB category enum → 폼 카테고리 문자열 매핑
      const CAT_MAP: Record<string, string> = {
        MEMBERSHIP: '이용권',
        PT: 'PT',
        GX: 'GX',
        PRODUCT: '기타',
        SERVICE: '기타',
      };
      const cat = CAT_MAP[data.category] ?? data.category;
      setShowTypeSelection(false);
      setValue('category', cat);
      setValue('name', data.name ?? '');
      setValue('priceCash', data.price ? Number(data.price).toLocaleString() : '');
      setValue('priceCard', data.price ? Number(data.price).toLocaleString() : '');
      setValue('period', data.duration?.toString() ?? '');
      setValue('count', data.sessions?.toString() ?? '');
      setValue('description', data.description ?? '');
      setValue('isUsed', data.isActive ?? true);
    };
    fetchProduct();
  }, [editId, setValue]);

  // 현재 카테고리 설정
  const categoryConfig = CATEGORY_CONFIG[watchedCategory] ?? null;

  // 중복 체크
  const checkDuplicate = (name: string, category: string): boolean => {
    const originalName = isEditMode ? watchedName : null;
    return existingProducts.some(
      p => p.category === category && p.name === name && p.name !== originalName
    );
  };

  // 가격 입력 (천단위 콤마 자동 포맷)
  const handlePriceChange = (field: 'priceCash' | 'priceCard', value: string) => {
    const MAX = 99999999;
    const raw = value.replace(/[^0-9]/g, '');
    const num = Math.min(parseInt(raw) || 0, MAX);
    const formatted = formatPrice(num.toString());
    setValue(field, formatted, { shouldValidate: true });
    if (num === 0) {
      setError(field, { message: '가격은 1원 이상이어야 합니다.' });
    } else {
      clearErrors(field);
    }
  };

  // 상품명 변경 + 즉시 중복 체크
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('name', value, { shouldValidate: false });
    if (!value) {
      setError('name', { message: '상품명을 입력해주세요.' });
    } else if (checkDuplicate(value, watchedCategory)) {
      setError('name', { message: `'${value}' 상품명이 이미 존재합니다.` });
    } else {
      clearErrors('name');
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    // 상품명 중복 체크 (submit 시점)
    if (checkDuplicate(data.name, data.category)) {
      setError('name', { message: `'${data.name}' 상품명이 이미 존재합니다.` });
      return;
    }

    setIsSaving(true);

    // 폼 카테고리 문자열 → DB enum 매핑
    const CAT_DB_MAP: Record<string, string> = {
      '이용권': 'MEMBERSHIP',
      'PT': 'PT',
      'GX': 'GX',
      '기타': 'PRODUCT',
    };

    const productData = {
      branchId: getBranchId(),
      name: data.name,
      category: CAT_DB_MAP[data.category] ?? 'PRODUCT',
      price: parsePrice(data.priceCash),
      duration: data.period ? Number(data.period) : null,
      sessions: data.count ? Number(data.count) : null,
      description: data.description || null,
      isActive: data.isUsed,
    };

    if (isEditMode) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editId);
      setIsSaving(false);
      if (error) { toast.error('수정에 실패했습니다.'); return; }
      toast.success('상품이 수정되었습니다.');
    } else {
      const { error } = await supabase
        .from('products')
        .insert(productData);
      setIsSaving(false);
      if (error) { toast.error('등록에 실패했습니다.'); return; }
      toast.success('상품이 등록되었습니다.');
    }
    moveToPage(972);
  };

  // 이용 시간 구간 삭제
  const removeTimeRange = (idx: number) => {
    setUseTimeRanges(prev => prev.filter((_, i) => i !== idx));
  };

  // 이용 시간 구간 추가
  const addTimeRange = () => {
    setUseTimeRanges(prev => [
      ...prev,
      { day: '추가요일', startTime: '09:00', endTime: '18:00' },
    ]);
  };

  // --- 유형 선택 화면 ---
  if (showTypeSelection && !isEditMode) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-xxl animate-in fade-in slide-in-from-bottom-4 duration-400">
          <div className="text-center mb-xl">
            <h1 className="text-[22px] font-bold text-content">새 상품 등록</h1>
            <p className="mt-sm text-[14px] text-content-secondary">등록할 상품의 유형을 선택해주세요.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md w-full max-w-[800px]">
            {PRODUCT_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => {
                  setValue('category', type.id);
                  setShowTypeSelection(false);
                }}
                className="group flex flex-col items-start p-lg bg-surface rounded-xl border border-line shadow-card hover:border-primary hover:shadow-md transition-all text-left"
              >
                <div className={cn('p-sm rounded-xl mb-md bg-surface-tertiary group-hover:bg-primary-light transition-colors')}>
                  <type.icon className={cn('w-6 h-6', type.color)} />
                </div>
                <h3 className="text-[15px] font-bold text-content group-hover:text-primary transition-colors">
                  {type.label}
                </h3>
                <p className="mt-xs text-[12px] text-content-tertiary">{type.desc}</p>
                <div className="mt-md flex items-center text-[12px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  선택하기 <ChevronRight className="ml-xs" size={14} />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => moveToPage(972)}
            className="mt-xxl text-[13px] text-content-tertiary hover:text-content flex items-center gap-xs transition-colors"
          >
            <ArrowLeft size={14} /> 취소하고 목록으로
          </button>
        </div>
      </AppLayout>
    );
  }

  // --- 메인 폼 화면 ---
  return (
    <AppLayout>
      <PageHeader
        title={isEditMode ? '상품 정보 수정' : `${watchedCategory} 등록`}
        description={
          isEditMode
            ? '상품의 상세 정보를 수정하고 저장합니다.'
            : '새로운 상품 정보를 입력하여 등록을 완료하세요.'
        }
        actions={
          <div className="flex items-center gap-sm">
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="flex items-center gap-xs px-lg py-sm rounded-button border border-line bg-surface text-content-secondary hover:bg-surface-tertiary transition-colors text-[13px]"
            >
              취소
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="flex items-center gap-xs px-lg py-sm rounded-button bg-primary text-surface hover:bg-primary-dark shadow-sm transition-colors text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isEditMode ? '수정 저장' : '등록 완료'}
            </button>
          </div>
        }
      />

      <div className="space-y-xl pb-[100px]">
        {/* 섹션 01: 기본 정보 */}
        <FormSection
          title="기본 정보"
          description="상품의 카테고리, 이름, 가격 등 기본 정보를 입력합니다."
          columns={2}
        >
          {/* UI-085 카테고리 선택 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">
              카테고리 <span className="text-state-error">*</span>
            </label>
            <select
              {...register('category')}
              className={cn(
                'w-full px-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors',
                errors.category && 'border-state-error'
              )}
            >
              <option value="">선택해주세요</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-[12px] text-state-error flex items-center gap-xs">
                <AlertCircle size={12} />{errors.category.message}
              </p>
            )}
          </div>

          {/* UI-086 상품명 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">
              상품명 <span className="text-state-error">*</span>
            </label>
            <input
              type="text"
              {...register('name')}
              onChange={handleNameChange}
              placeholder="예: 헬스 12개월권"
              className={cn(
                'w-full px-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors',
                errors.name && 'border-state-error'
              )}
            />
            {errors.name ? (
              <p className="text-[12px] text-state-error flex items-center gap-xs">
                <AlertCircle size={12} />{errors.name.message}
              </p>
            ) : watchedName && !checkDuplicate(watchedName, watchedCategory) && watchedCategory ? (
              <p className="text-[12px] text-state-success flex items-center gap-xs">
                <CheckCircle2 size={12} />사용 가능한 상품명입니다.
              </p>
            ) : null}
          </div>

          {/* UI-087 현금가 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">
              현금가 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <Banknote className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
              <input
                type="text"
                inputMode="numeric"
                value={watchedPriceCash}
                onChange={e => handlePriceChange('priceCash', e.target.value)}
                placeholder="0"
                className={cn(
                  'w-full pl-10 pr-10 py-sm rounded-input border border-line bg-surface-secondary text-[14px] tabular-nums focus:border-primary focus:outline-none transition-colors',
                  errors.priceCash && 'border-state-error'
                )}
              />
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-[13px] text-content-tertiary">원</span>
            </div>
            {errors.priceCash && (
              <p className="text-[12px] text-state-error flex items-center gap-xs">
                <AlertCircle size={12} />{errors.priceCash.message}
              </p>
            )}
          </div>

          {/* UI-087 카드가 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">
              카드가 <span className="text-state-error">*</span>
            </label>
            <div className="relative">
              <CreditCard className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={16} />
              <input
                type="text"
                inputMode="numeric"
                value={watchedPriceCard}
                onChange={e => handlePriceChange('priceCard', e.target.value)}
                placeholder="0"
                className={cn(
                  'w-full pl-10 pr-10 py-sm rounded-input border border-line bg-surface-secondary text-[14px] tabular-nums focus:border-primary focus:outline-none transition-colors',
                  errors.priceCard && 'border-state-error'
                )}
              />
              <span className="absolute right-md top-1/2 -translate-y-1/2 text-[13px] text-content-tertiary">원</span>
            </div>
            {errors.priceCard && (
              <p className="text-[12px] text-state-error flex items-center gap-xs">
                <AlertCircle size={12} />{errors.priceCard.message}
              </p>
            )}
          </div>

          {/* 상품 설명 */}
          <div className="flex flex-col gap-sm md:col-span-2">
            <label className="text-[13px] font-semibold text-content">상품 설명</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="회원에게 노출될 상품 설명을 입력하세요."
              className="w-full px-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors resize-none"
            />
          </div>

          {/* 태그 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">태그</label>
            <div className="relative">
              <TagIcon className="absolute left-md top-1/2 -translate-y-1/2 text-content-tertiary" size={15} />
              <input
                type="text"
                {...register('tags')}
                placeholder="#인기 #이벤트"
                className="w-full pl-10 pr-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors"
              />
            </div>
          </div>
        </FormSection>

        {/* 섹션 02: 이용기간 / 횟수 (카테고리에 따라 동적 변경) */}
        <FormSection
          title="이용기간 / 횟수 설정"
          description="카테고리에 따라 기간 또는 횟수 항목이 표시됩니다."
          columns={2}
        >
          {/* 이용기간 */}
          <div className="flex flex-col gap-sm">
            <label className="text-[13px] font-semibold text-content">
              {categoryConfig?.periodLabel ?? '이용기간'} <span className="text-state-error">*</span>
            </label>
            <div className="flex gap-sm">
              <input
                type="number"
                min={1}
                {...register('period')}
                placeholder="예: 12"
                className={cn(
                  'flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors',
                  errors.period && 'border-state-error'
                )}
              />
              <span className="flex items-center text-[13px] text-content-secondary px-sm">
                {watchedCategory === 'PT' ? '일' : '개월'}
              </span>
            </div>
            {errors.period && (
              <p className="text-[12px] text-state-error flex items-center gap-xs">
                <AlertCircle size={12} />{errors.period.message}
              </p>
            )}
          </div>

          {/* 횟수 (PT / GX일 때만 표시) */}
          {categoryConfig?.showCount && (
            <div className="flex flex-col gap-sm">
              <label className="text-[13px] font-semibold text-content">
                {categoryConfig.countLabel}
              </label>
              <div className="flex gap-sm">
                <input
                  type="number"
                  min={1}
                  {...register('count')}
                  placeholder="예: 20"
                  className="flex-1 px-md py-sm rounded-input border border-line bg-surface-secondary text-[14px] focus:border-primary focus:outline-none transition-colors"
                />
                <span className="flex items-center text-[13px] text-content-secondary px-sm">회</span>
              </div>
            </div>
          )}

          {/* 요일 안내 (GX일 때만 표시) */}
          {categoryConfig?.showDays && (
            <div className="md:col-span-2 p-md bg-surface-secondary rounded-xl border border-line">
              <p className="text-[13px] text-content-secondary">
                GX 수업은 수강 가능 요일을 이용 시간 구간에서 설정하세요.
              </p>
            </div>
          )}
        </FormSection>

        {/* 섹션 03: 추가 설정 */}
        <FormSection
          title="추가 설정"
          description="홀딩, 이용 시간, 판매 노출 등 세부 정책을 설정합니다."
          columns={1}
          collapsible
          defaultOpen={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

            {/* 홀딩 설정 */}
            <div className="p-md bg-surface-secondary rounded-xl border border-line">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-sm">
                  <CalendarDays className="text-primary" size={18} />
                  <h4 className="text-[14px] font-bold text-content">홀딩 설정</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setValue('isHoldingEnabled', !watchedIsHoldingEnabled)}
                  className={cn(
                    'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                    watchedIsHoldingEnabled ? 'bg-accent' : 'bg-line'
                  )}
                >
                  <span className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                    watchedIsHoldingEnabled ? 'translate-x-4' : 'translate-x-0.5'
                  )} />
                </button>
              </div>
              <div className={cn('space-y-md transition-opacity', !watchedIsHoldingEnabled && 'opacity-40 pointer-events-none')}>
                <div className="flex items-center justify-between gap-md">
                  <label className="text-[13px] text-content-secondary">최대 홀딩 일수</label>
                  <div className="flex items-center gap-xs">
                    <input
                      type="number"
                      {...register('holdingMaxDays')}
                      className="w-[72px] px-sm py-xs border border-line rounded-button text-right text-[13px] bg-surface focus:border-primary focus:outline-none"
                    />
                    <span className="text-[12px] text-content-tertiary">일</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-md">
                  <label className="text-[13px] text-content-secondary">최대 홀딩 횟수</label>
                  <div className="flex items-center gap-xs">
                    <input
                      type="number"
                      {...register('holdingMaxCount')}
                      className="w-[72px] px-sm py-xs border border-line rounded-button text-right text-[13px] bg-surface focus:border-primary focus:outline-none"
                    />
                    <span className="text-[12px] text-content-tertiary">회</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 이용 가능 시간 */}
            <div className="p-md bg-surface-secondary rounded-xl border border-line">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-sm">
                  <Clock className="text-state-info" size={18} />
                  <h4 className="text-[14px] font-bold text-content">이용 가능 시간</h4>
                </div>
                <button
                  type="button"
                  onClick={addTimeRange}
                  className="text-[12px] font-bold text-primary flex items-center gap-xs hover:text-primary-dark transition-colors"
                >
                  <Plus size={13} /> 구간 추가
                </button>
              </div>
              <div className="space-y-sm">
                {useTimeRanges.map((range, idx) => (
                  <div key={idx} className="flex items-center gap-sm bg-surface p-sm rounded-button border border-line">
                    <span className="text-[11px] bg-surface-tertiary px-sm py-[2px] rounded-full w-[52px] text-center text-content-secondary shrink-0">
                      {range.day}
                    </span>
                    <div className="flex items-center gap-xs text-[13px] flex-1">
                      <input
                        type="time"
                        defaultValue={range.startTime}
                        className="border-none p-0 w-[60px] outline-none text-[13px] bg-transparent"
                      />
                      <span className="text-content-tertiary">~</span>
                      <input
                        type="time"
                        defaultValue={range.endTime}
                        className="border-none p-0 w-[60px] outline-none text-[13px] bg-transparent"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTimeRange(idx)}
                      className="text-content-tertiary hover:text-state-error transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 판매 노출 설정 */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-md">
              {[
                {
                  label: '키오스크 판매 노출',
                  desc: '키오스크 상품 목록에 카드가로 노출됩니다.',
                  key: 'isKioskExposed' as const,
                  value: watchedIsKioskExposed,
                },
                {
                  label: '상품 사용 여부',
                  desc: '미사용 시 상품 목록에서 숨겨집니다.',
                  key: 'isUsed' as const,
                  value: watchedIsUsed,
                },
              ].map(item => (
                <div key={item.key} className="p-md bg-surface border border-line rounded-xl shadow-card">
                  <div className="flex items-center justify-between mb-xs">
                    <span className="text-[13px] font-semibold text-content">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => setValue(item.key, !item.value)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                        item.value ? 'bg-accent' : 'bg-line'
                      )}
                    >
                      <span className={cn(
                        'inline-block h-4 w-4 transform rounded-full bg-surface shadow transition-transform',
                        item.value ? 'translate-x-4' : 'translate-x-0.5'
                      )} />
                    </button>
                  </div>
                  <p className="text-[11px] text-content-tertiary">{item.desc}</p>
                </div>
              ))}
              <div className="p-md bg-surface border border-line rounded-xl shadow-card flex items-center gap-sm">
                <Settings2 className="text-content-tertiary shrink-0" size={18} />
                <div>
                  <p className="text-[13px] font-semibold text-content">현재 상태</p>
                  <div className="flex gap-xs mt-xs">
                    <StatusBadge variant={watchedIsUsed ? 'mint' : 'default'} dot={watchedIsUsed}>
                      {watchedIsUsed ? '판매중' : '판매중지'}
                    </StatusBadge>
                    {watchedIsKioskExposed && (
                      <StatusBadge variant="info">키오스크</StatusBadge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FormSection>
      </div>

      {/* 하단 고정 액션 바 */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[260px] bg-surface/90 backdrop-blur-sm border-t border-line p-md px-lg flex items-center justify-between z-10 shadow-lg">
        <div className="hidden md:flex items-center gap-md">
          <StatusBadge variant={watchedIsUsed ? 'mint' : 'default'} dot={watchedIsUsed}>
            {watchedIsUsed ? '판매중' : '판매중지'}
          </StatusBadge>
          <span className="text-[13px] text-content-tertiary">
            {watchedCategory || '카테고리 미선택'}
          </span>
        </div>
        <div className="flex items-center gap-sm w-full md:w-auto">
          <button
            type="button"
            className="flex-1 md:flex-none px-xl py-sm rounded-button border border-line text-content-secondary font-semibold hover:bg-surface-secondary transition-colors text-[13px]"
            onClick={() => setShowCancelConfirm(true)}
          >
            취소
          </button>
          <button
            type="button"
            className="flex-1 md:flex-none flex items-center justify-center gap-sm px-xxl py-sm rounded-button bg-primary text-surface font-bold hover:bg-primary-dark shadow-md transition-colors text-[13px] disabled:opacity-50"
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
          >
            {isSaving && (
              <div className="h-4 w-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" />
            )}
            {isEditMode ? '상품 수정하기' : '상품 등록하기'}
          </button>
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
