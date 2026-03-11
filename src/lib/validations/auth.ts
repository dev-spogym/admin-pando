import { z } from 'zod';

// 로그인 스키마
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.'),
  branchId: z
    .number({ error: '지점을 선택해주세요.' })
    .int('지점 ID는 정수여야 합니다.'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// 비밀번호 변경 스키마
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, '현재 비밀번호를 입력해주세요.'),
    newPassword: z
      .string()
      .min(8, '새 비밀번호는 8자 이상이어야 합니다.')
      .regex(/[a-zA-Z]/, '새 비밀번호에 영문자를 포함해야 합니다.')
      .regex(/[0-9]/, '새 비밀번호에 숫자를 포함해야 합니다.')
      .regex(/[^a-zA-Z0-9]/, '새 비밀번호에 특수문자를 포함해야 합니다.'),
    confirmPassword: z
      .string()
      .min(1, '비밀번호 확인을 입력해주세요.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
