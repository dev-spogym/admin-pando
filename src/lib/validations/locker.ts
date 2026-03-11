import { z } from 'zod';

// 날짜 정규식: YYYY-MM-DD 형식
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 락커 배정 스키마
export const lockerAssignSchema = z.object({
  lockerId: z
    .number({ error: '락커를 선택해주세요.' })
    .int('락커 ID는 정수여야 합니다.'),
  memberId: z
    .number({ error: '회원을 선택해주세요.' })
    .int('회원 ID는 정수여야 합니다.'),
  expiryDate: z
    .string()
    .regex(dateRegex, '날짜 형식이 올바르지 않습니다. (예: 2024-12-31)')
    .refine((val) => {
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date > today;
    }, '만료일은 오늘 이후 날짜여야 합니다.'),
});

export type LockerAssignInput = z.infer<typeof lockerAssignSchema>;
