import { z } from 'zod';

// 메시지 발송 스키마
export const messageSendSchema = z
  .object({
    recipientIds: z
      .array(z.number().int('수신자 ID는 정수여야 합니다.'))
      .min(1, '수신자를 1명 이상 선택해주세요.'),
    type: z.enum(['sms', 'lms', 'kakao'] as const, {
      error: '메시지 유형을 선택해주세요.',
    }),
    content: z.string().min(1, '내용을 입력해주세요.'),
    // 예약 발송 시간 (미래 시간만 허용)
    scheduledAt: z
      .date()
      .refine((date) => date > new Date(), '예약 시간은 현재 시간 이후여야 합니다.')
      .optional(),
  })
  .refine(
    (data) => {
      const maxLengthMap: Record<string, number> = {
        sms: 90,
        lms: 2000,
        kakao: 1000,
      };
      return data.content.length <= maxLengthMap[data.type];
    },
    {
      message: '메시지 글자 수가 제한을 초과했습니다.',
      path: ['content'],
    }
  );

export type MessageSendInput = z.infer<typeof messageSendSchema>;

// 쿠폰 생성 스키마
export const couponCreateSchema = z
  .object({
    name: z
      .string()
      .min(2, '쿠폰명은 2자 이상이어야 합니다.')
      .max(30, '쿠폰명은 30자 이하여야 합니다.'),
    discountType: z.enum(['rate', 'amount'] as const, {
      error: '할인 유형을 선택해주세요.',
    }),
    discountValue: z.number({ error: '할인값을 입력해주세요.' }),
    validFrom: z.date({ error: '유효 시작일을 입력해주세요.' }),
    validTo: z.date({ error: '유효 종료일을 입력해주세요.' }),
    maxUsage: z
      .number({ error: '최대 사용 횟수를 입력해주세요.' })
      .int('최대 사용 횟수는 정수여야 합니다.')
      .min(1, '최대 사용 횟수는 1 이상이어야 합니다.'),
  })
  .refine(
    (data) => {
      if (data.discountType === 'rate') {
        return data.discountValue >= 1 && data.discountValue <= 100;
      }
      return data.discountValue >= 1;
    },
    {
      message: '할인값이 유효하지 않습니다.',
      path: ['discountValue'],
    }
  )
  .refine((data) => data.validTo > data.validFrom, {
    message: '유효 종료일은 유효 시작일 이후여야 합니다.',
    path: ['validTo'],
  });

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;
