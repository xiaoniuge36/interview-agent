import { z } from 'zod';

const DISPLAY_NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 320;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 128;

const EmailSchema = z
  .string()
  .trim()
  .email('请输入有效的邮箱地址。')
  .max(EMAIL_MAX_LENGTH, '邮箱地址过长。')
  .transform((value) => value.toLowerCase());
const PasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `密码至少需要 ${PASSWORD_MIN_LENGTH} 个字符。`)
  .max(PASSWORD_MAX_LENGTH, '密码长度不能超过 128 个字符。')
  .regex(/[A-Za-z]/, '密码至少需要包含一个英文字母。')
  .regex(/\d/, '密码至少需要包含一个数字。');

export const LocalRegistrationInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, '姓名至少需要 2 个字符。')
    .max(DISPLAY_NAME_MAX_LENGTH, '姓名长度不能超过 80 个字符。'),
  email: EmailSchema,
  password: PasswordSchema,
});

export const LocalSignInInputSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});

export type LocalRegistrationInput = z.infer<typeof LocalRegistrationInputSchema>;
export type LocalSignInInput = z.infer<typeof LocalSignInInputSchema>;
