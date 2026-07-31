import { expect, it, vi } from 'vitest';
import { focusFirstInvalidAccessField, type AccessFormErrors } from './access-validation';

it('按登录表单顺序聚焦第一个邮箱错误', () => {
  const focus = vi.fn();

  expect(
    focusFirstInvalidAccessField(
      { password: '请输入密码。', email: '请输入有效的邮箱地址。' },
      'sign-in',
      focus,
    ),
  ).toBe('access-email');
  expect(focus).toHaveBeenCalledWith('access-email');
});

it('邮箱有效时聚焦登录表单的密码错误', () => {
  const focus = vi.fn();

  expect(focusFirstInvalidAccessField({ password: '请输入密码。' }, 'sign-in', focus)).toBe(
    'access-password',
  );
});

it('按注册表单顺序优先聚焦姓名错误', () => {
  const focus = vi.fn();

  expect(
    focusFirstInvalidAccessField(
      { email: '请输入有效的邮箱地址。', name: '请输入姓名。' },
      'register',
      focus,
    ),
  ).toBe('access-name');
});

it('跳过不存在或当前模式未渲染的错误字段', () => {
  const focus = vi.fn();

  expect(
    focusFirstInvalidAccessField(
      { name: '不应在登录模式显示', unknown: '未知字段' } as AccessFormErrors,
      'sign-in',
      focus,
    ),
  ).toBeUndefined();
  expect(focus).not.toHaveBeenCalled();
});
