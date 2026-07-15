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

  it.each(['a', '123456789', '任意字符'])('允许非空密码 %s', (password) => {
    const parsed = LocalRegistrationInputSchema.safeParse({
      name: 'Avery Lin',
      email: 'avery@example.com',
      password,
    });

    expect(parsed.success).toBe(true);
  });

  it('拒绝空密码', () => {
    const parsed = LocalRegistrationInputSchema.safeParse({
      name: 'Avery Lin',
      email: 'avery@example.com',
      password: '',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.error.issues[0]?.message).toBe('请输入密码。');
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
