import { z } from 'zod';

// 전화번호 정규식: 010-XXXX-XXXX 형식
const phoneRegex = /^010-\d{4}-\d{4}$/;

// 날짜 정규식: YYYY-MM-DD 형식
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 직원 생성 스키마
export const staffCreateSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다.')
    .max(20, '이름은 20자 이하여야 합니다.'),
  gender: z.enum(['M', 'F'] as const, {
    error: '성별을 선택해주세요.',
  }),
  phone: z
    .string()
    .regex(phoneRegex, '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'),
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.'),
  role: z.enum(['center_manager', 'manager', 'fc', 'staff'] as const, {
    error: '역할을 선택해주세요.',
  }),
  joinDate: z
    .string()
    .regex(dateRegex, '날짜 형식이 올바르지 않습니다. (예: 2024-01-01)'),
  workType: z.enum(['full', 'part'] as const, {
    error: '근무 형태를 선택해주세요.',
  }),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
