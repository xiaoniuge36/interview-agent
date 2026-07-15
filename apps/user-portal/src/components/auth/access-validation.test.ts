import { describe, expect, it } from 'vitest';
import { validateAccessForm } from './access-validation';

describe('access form validation', () => {
  it('允许任意非空密码', () => {
    const errors = validateAccessForm(
      {
        name: '张三',
        email: 'zhangsan@example.com',
        password: '1',
      },
      'register',
    );

    expect(errors).toEqual({});
  });

  it('为缺失字段返回页面内错误信息', () => {
    const errors = validateAccessForm(
      {
        name: '',
        email: 'invalid-email',
        password: '',
      },
      'register',
    );

    expect(errors).toEqual({
      name: '请输入姓名。',
      email: '请输入有效的邮箱地址。',
      password: '请输入密码。',
    });
  });
});
