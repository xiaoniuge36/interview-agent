import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

it('认证 Provider 包裹主题 Provider，允许按当前用户同步偏好', () => {
  const source = readFileSync(resolve('src/components/WebProviders.tsx'), 'utf8');
  const authStart = source.indexOf('<AuthProvider');
  const themeStart = source.indexOf('<ThemePreferencesProvider>');

  expect(authStart).toBeGreaterThan(-1);
  expect(themeStart).toBeGreaterThan(-1);
  expect(authStart).toBeLessThan(themeStart);
});
