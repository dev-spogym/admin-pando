import { z } from 'zod';

// 급여 스키마
export const payrollSchema = z.object({
  staffId: z
    .number({ error: '직원을 선택해주세요.' })
    .int('직원 ID는 정수여야 합니다.'),
  yearMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/, '년월 형식이 올바르지 않습니다. (예: 2024-01)'),
  baseSalary: z
    .number({ error: '기본급을 입력해주세요.' })
    .min(0, '기본급은 0 이상이어야 합니다.'),
  incentive: z
    .number({ error: '인센티브를 입력해주세요.' })
    .min(0, '인센티브는 0 이상이어야 합니다.'),
  deduction: z
    .number({ error: '공제액을 입력해주세요.' })
    .min(0, '공제액은 0 이상이어야 합니다.'),
});

export type PayrollInput = z.infer<typeof payrollSchema>;
