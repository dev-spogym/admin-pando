import { z } from 'zod';

// 날짜 정규식: YYYY-MM-DD 형식
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 계약 생성 스키마
export const contractCreateSchema = z.object({
  memberId: z
    .number({ error: '회원을 선택해주세요.' })
    .int('회원 ID는 정수여야 합니다.'),
  productIds: z
    .array(z.number().int('상품 ID는 정수여야 합니다.'))
    .min(1, '상품을 1개 이상 선택해주세요.'),
  startDate: z
    .string()
    .regex(dateRegex, '날짜 형식이 올바르지 않습니다. (예: 2024-01-01)'),
  discountRate: z
    .number({ error: '할인율을 입력해주세요.' })
    .min(0, '할인율은 0% 이상이어야 합니다.')
    .max(50, '할인율은 최대 50%까지 가능합니다.'),
  paymentMethod: z.enum(['cash', 'card', 'mileage', 'mixed'] as const, {
    error: '결제 방법을 선택해주세요.',
  }),
  cashAmount: z
    .number()
    .min(0, '현금 금액은 0 이상이어야 합니다.')
    .optional(),
  cardAmount: z
    .number()
    .min(0, '카드 금액은 0 이상이어야 합니다.')
    .optional(),
  mileageAmount: z
    .number()
    .min(0, '마일리지 금액은 0 이상이어야 합니다.')
    .optional(),
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;
