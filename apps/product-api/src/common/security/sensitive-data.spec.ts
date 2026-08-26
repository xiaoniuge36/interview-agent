import { maskPageAgentText } from '../../modules/page-agent-core/page-agent-sanitization';

test('admin and user page agent surfaces share one sensitive text policy', () => {
  const value = 'apiKey=sk-secret-value-123456 联系 13812345678 a.person@example.com';

  expect(maskPageAgentText(value)).toBe('apiKey=[已隐藏] 联系 138****5678 a***@example.com');
});
