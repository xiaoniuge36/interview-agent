import { LocalRegistrationInputSchema, LocalSignInInputSchema } from './local-auth.input';

describe('Local account input validation', () => {
  it('规范化注册邮箱并保留安全密码', () => {
    const result = LocalRegistrationInputSchema.parse({
      name: 'Avery Lin',
      email: '  AVERY@EXAMPLE.COM ',
      password: 'secure-password1',
    });

    expect(result).toEqual({
      name: 'Avery Lin',
      email: 'avery@example.com',
      password: 'secure-password1',
    });
  });

  it.each([
    ['过短密码', 'short1', '密码至少需要 12 个字符。'],
    ['缺少数字', 'securepassword', '密码至少需要包含一个数字。'],
    ['缺少字母', '123456789012', '密码至少需要包含一个英文字母。'],
  ])('拒绝%s', (_label, password, message) => {
    const parsed = LocalRegistrationInputSchema.safeParse({
      name: 'Avery Lin',
      email: 'avery@example.com',
      password,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe(message);
  });

  it('拒绝无效登录邮箱', () => {
    const parsed = LocalSignInInputSchema.safeParse({
      email: 'not-an-email',
      password: 'secure-password1',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('请输入有效的邮箱地址。');
  });
});