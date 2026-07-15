import { z } from 'zod';

const DISPLAY_NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 320;

const EmailSchema = z
  .string()
  .trim()
  .email('请输入有效的邮箱地址。')
  .max(EMAIL_MAX_LENGTH, '邮箱地址过长。')
  .transform((value) => value.toLowerCase());
const PasswordSchema = z.string().min(1, '请输入密码。');

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
