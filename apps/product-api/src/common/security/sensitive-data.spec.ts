import { maskAdminPageAgentText } from '../../modules/admin/admin-page-agent-sanitization';
import { maskUserPageAgentText } from '../../modules/user-page-agent/user-page-agent-sanitization';

test('admin and user surfaces apply the same sensitive text policy', () => {
  const value = 'apiKey=sk-secret-value-123456 联系 13812345678 a.person@example.com';
  const admin = maskAdminPageAgentText(value);
  const user = maskUserPageAgentText(value);

  expect(user).toBe(admin);
  expect(user).toBe('apiKey=[已隐藏] 联系 138****5678 a***@example.com');
});
