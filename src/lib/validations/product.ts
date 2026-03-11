import { z } from 'zod';

// 상품 생성 스키마
export const productCreateSchema = z.object({
  category: z.enum(['membership', 'pt', 'gx', 'locker', 'etc'] as const, {
    error: '카테고리를 선택해주세요.',
  }),
  name: z
    .string()
    .min(2, '상품명은 2자 이상이어야 합니다.')
    .max(50, '상품명은 50자 이하여야 합니다.'),
  cashPrice: z
    .number({ error: '현금가를 입력해주세요.' })
    .int('현금가는 정수여야 합니다.')
    .min(0, '현금가는 0 이상이어야 합니다.'),
  cardPrice: z
    .number({ error: '카드가를 입력해주세요.' })
    .int('카드가는 정수여야 합니다.')
    .min(0, '카드가는 0 이상이어야 합니다.'),
  period: z
    .number({ error: '기간을 입력해주세요.' })
    .int('기간은 정수여야 합니다.')
    .min(1, '기간은 1일 이상이어야 합니다.'),
  kioskExposure: z.boolean({
    error: '키오스크 노출 여부를 선택해주세요.',
  }),
  status: z.enum(['active', 'inactive'] as const, {
    error: '상태를 선택해주세요.',
  }),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
