import { z } from 'zod';

// 전화번호 정규식: 010-XXXX-XXXX 형식
const phoneRegex = /^010-\d{4}-\d{4}$/;

// 날짜 정규식: YYYY-MM-DD 형식
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 회원 생성 스키마
export const memberCreateSchema = z.object({
  name: z
    .string()
    .min(2, '이름은 2자 이상이어야 합니다.')
    .max(20, '이름은 20자 이하여야 합니다.')
    .regex(/^[가-힣a-zA-Z]+$/, '이름은 한글 또는 영문만 입력 가능합니다.'),
  gender: z.enum(['M', 'F'], {
    errorMap: () => ({ message: '성별을 선택해주세요.' }),
  }),
  phone: z
    .string()
    .regex(phoneRegex, '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)'),
  email: z
    .string()
    .email('올바른 이메일 형식을 입력해주세요.')
    .optional()
    .or(z.literal('')),
  birthDate: z
    .string()
    .regex(dateRegex, '날짜 형식이 올바르지 않습니다. (예: 1990-01-01)')
    .refine((val) => {
      const date = new Date(val);
      return date <= new Date();
    }, '생년월일은 미래 날짜일 수 없습니다.')
    .optional()
    .or(z.literal('')),
  address: z.string().optional(),
  memo: z
    .string()
    .max(500, '메모는 500자 이내로 입력해주세요.')
    .optional(),
  managerId: z
    .number()
    .int('담당자 ID는 정수여야 합니다.')
    .optional(),
});

export type MemberCreateInput = z.infer<typeof memberCreateSchema>;

// 회원 수정 스키마: 모든 필드 선택 + id 필수
export const memberUpdateSchema = memberCreateSchema.partial().extend({
  id: z
    .number({ required_error: '회원 ID는 필수입니다.' })
    .int('회원 ID는 정수여야 합니다.'),
});

export type MemberUpdateInput = z.infer<typeof memberUpdateSchema>;
