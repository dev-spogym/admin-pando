/**
 * Zod 검증 스키마 - 공통 폼 검증
 * react-hook-form + @hookform/resolvers/zod 와 함께 사용
 */
import { z } from 'zod';

// ── 공통 검증 패턴 ──

/** 한글/영문/한자 2~20자 이름 */
export const nameSchema = z
  .string()
  .min(1, '이름을 입력하세요')
  .regex(/^[가-힣a-zA-Z\u4e00-\u9fff\s]{2,20}$/, '한글/영문/한자 2~20자로 입력하세요');

/** 010-xxxx-xxxx 전화번호 */
export const phoneSchema = z
  .string()
  .min(1, '연락처를 입력하세요')
  .regex(/^010-\d{4}-\d{4}$/, '올바른 연락처를 입력하세요 (010-xxxx-xxxx)');

/** 이메일 (선택) */
export const optionalEmailSchema = z
  .string()
  .email('올바른 이메일을 입력하세요')
  .or(z.literal(''))
  .optional()
  .default('');

/** 과거 날짜 (선택) */
export const optionalPastDateSchema = z
  .string()
  .refine(
    (v) => !v || (new Date(v) < new Date() && !isNaN(new Date(v).getTime())),
    '올바른 날짜를 입력하세요 (미래 날짜 불가)'
  )
  .optional()
  .default('');

/** 메모 (최대 500자) */
export const memoSchema = z
  .string()
  .max(500, '500자 이내로 입력하세요')
  .optional()
  .default('');

// ── 회원 폼 스키마 ──

export const memberFormSchema = z.object({
  // Step 1: 필수
  name: nameSchema,
  gender: z.enum(['male', 'female'], { error: '성별을 선택하세요' }),
  phone: phoneSchema,
  memberType: z.string().min(1, '회원구분을 선택하세요'),
  birthDate: optionalPastDateSchema,
  height: z
    .string()
    .refine((v) => !v || (Number(v) >= 100 && Number(v) <= 250), '100~250cm 사이로 입력하세요')
    .optional()
    .default(''),

  // Step 2: 선택
  email: optionalEmailSchema,
  address: z
    .string()
    .refine((v) => !v || v.length >= 5, '주소를 5자 이상 입력하세요')
    .optional()
    .default(''),
  addressDetail: z.string().optional().default(''),
  notes: memoSchema,
  fc: z.string().optional().default(''),
  trainer: z.string().optional().default(''),
  visitPath: z.string().optional().default(''),
  exerciseGoal: z.string().optional().default(''),
  nickname: z.string().optional().default(''),
  company: z.string().optional().default(''),
  marketingConsent: z.boolean().optional().default(false),
  attendanceNumber: z.string().optional().default(''),
  profileImage: z.string().nullable().optional().default(null),
});

export type MemberFormData = z.infer<typeof memberFormSchema>;

// Step1 필수 필드만 검증하는 부분 스키마
export const memberStep1Schema = memberFormSchema.pick({
  name: true,
  gender: true,
  phone: true,
  memberType: true,
  birthDate: true,
  height: true,
});

// ── 직원 폼 스키마 ──

export const staffFormSchema = z.object({
  name: z.string().min(1, '이름을 입력하세요').max(20, '20자 이내로 입력하세요'),
  role: z.string().min(1, '역할을 선택하세요'),
  contact: phoneSchema,
  joinDate: z.string().min(1, '입사일을 입력하세요'),
  email: optionalEmailSchema,
  memo: memoSchema,
});

export type StaffFormData = z.infer<typeof staffFormSchema>;

// ── 상품 폼 스키마 ──

export const productFormSchema = z.object({
  category: z.string().min(1, '카테고리를 선택해주세요'),
  name: z.string().min(1, '상품명을 입력해주세요').max(50, '50자 이내로 입력하세요'),
  priceCash: z.string().min(1, '현금가를 입력해주세요'),
  priceCard: z.string().min(1, '카드가를 입력해주세요'),
  period: z.string().min(1, '이용기간을 입력해주세요'),
  count: z.string().optional().default(''),
  description: z.string().max(500, '500자 이내로 입력하세요').optional().default(''),
  tags: z.string().optional().default(''),
  isKioskExposed: z.boolean().optional().default(true),
  isUsed: z.boolean().optional().default(true),
  isHoldingEnabled: z.boolean().optional().default(false),
  holdingMaxDays: z.string().optional().default(''),
  holdingMaxCount: z.string().optional().default(''),
});

export type ProductFormData = z.infer<typeof productFormSchema>;

// ── 유틸 ──

/** 전화번호 자동 포맷 (010-xxxx-xxxx) */
export const formatPhone = (v: string): string => {
  const digits = v.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

/** 천단위 콤마 포맷 */
export const formatPrice = (raw: string): string => {
  const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0;
  return num > 0 ? num.toLocaleString() : '';
};

/** 콤마 가격 → 숫자 */
export const parsePrice = (formatted: string): number =>
  parseInt(formatted.replace(/,/g, '')) || 0;
