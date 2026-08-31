import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  // 所有 e2e spec 共享同一个临时 Postgres，串行执行避免跨用例数据竞争；
  // 与 scripts/e2e/child-process.mjs 强制的 --workers=1 保持一致，防止绕过包装器直跑时并发踩库
  workers: 1,
  outputDir: 'test-results/e2e',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_USER_URL ?? 'http://localhost:7100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
