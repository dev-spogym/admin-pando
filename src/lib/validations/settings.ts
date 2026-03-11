import { z } from 'zod';

// 전화번호 정규식: 일반 전화번호 형식 (지역번호 포함)
const phoneRegex = /^0\d{1,2}-\d{3,4}-\d{4}$/;

// 운영 시간 항목 스키마 (HH:MM 형식)
const timeSchema = z.object({
  start: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다. (예: 09:00)'),
  end: z
    .string()
    .regex(/^\d{2}:\d{2}$/, '시간 형식이 올바르지 않습니다. (예: 22:00)'),
});

// 센터 설정 스키마
export const centerSettingsSchema = z.object({
  centerName: z
    .string()
    .min(2, '센터명은 2자 이상이어야 합니다.')
    .max(50, '센터명은 50자 이하여야 합니다.'),
  phone: z
    .string()
    .regex(phoneRegex, '전화번호 형식이 올바르지 않습니다. (예: 02-1234-5678)'),
  address: z
    .string()
    .min(1, '주소를 입력해주세요.'),
  operatingHours: z.object({
    weekday: timeSchema,
    weekend: timeSchema,
  }),
});

export type CenterSettingsInput = z.infer<typeof centerSettingsSchema>;

// 지점 생성 스키마
export const branchCreateSchema = z.object({
  name: z
    .string()
    .min(2, '지점명은 2자 이상이어야 합니다.')
    .max(30, '지점명은 30자 이하여야 합니다.'),
  code: z
    .string()
    .min(2, '지점 코드는 2자 이상이어야 합니다.')
    .max(5, '지점 코드는 5자 이하여야 합니다.')
    .regex(/^[A-Z]+$/, '지점 코드는 영문 대문자만 입력 가능합니다.'),
  address: z
    .string()
    .min(1, '주소를 입력해주세요.'),
  phone: z
    .string()
    .regex(phoneRegex, '전화번호 형식이 올바르지 않습니다. (예: 02-1234-5678)'),
});

export type BranchCreateInput = z.infer<typeof branchCreateSchema>;
