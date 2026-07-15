import type { AccessForm, AccessMode } from './access-types';

const DISPLAY_NAME_MAX_LENGTH = 80;
const EMAIL_MAX_LENGTH = 320;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccessFormErrors = Partial<Record<keyof AccessForm, string>>;

export function validateAccessForm(form: AccessForm, mode: AccessMode): AccessFormErrors {
  const nameError = mode === 'register' ? validateName(form.name) : undefined;
  const emailError = validateEmail(form.email);
  const passwordError = validatePassword(form.password);

  return {
    ...(nameError ? { name: nameError } : {}),
    ...(emailError ? { email: emailError } : {}),
    ...(passwordError ? { password: passwordError } : {}),
  };
}

export function hasAccessFormErrors(errors: AccessFormErrors) {
  return Object.values(errors).some(Boolean);
}

export function clearAccessFormError(errors: AccessFormErrors, field: keyof AccessForm) {
  const nextErrors = { ...errors };
  delete nextErrors[field];
  return nextErrors;
}

function validateName(value: string) {
  const name = value.trim();
  if (!name) return '请输入姓名。';
  if (name.length < 2) return '姓名至少需要 2 个字符。';
  if (name.length > DISPLAY_NAME_MAX_LENGTH) return '姓名长度不能超过 80 个字符。';
  return undefined;
}

function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return '请输入邮箱地址。';
  if (email.length > EMAIL_MAX_LENGTH) return '邮箱地址过长。';
  if (!EMAIL_PATTERN.test(email)) return '请输入有效的邮箱地址。';
  return undefined;
}

function validatePassword(value: string) {
  return value.length > 0 ? undefined : '请输入密码。';
}
