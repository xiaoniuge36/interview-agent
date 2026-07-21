import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { registerUser, verifyModelConnection } from './helpers/api';
import { signInAdmin } from './helpers/auth';

const ADMIN_URL = process.env.E2E_ADMIN_URL ?? 'http://127.0.0.1:3102';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'e2e-admin@interview-agent.test';
const ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD ?? '';
const MODEL_API_KEY = 'e2e-credential-secret-9876';
const MODEL_KEY_HINT = '••••9876';
const IMPORT_TITLE = `E2E 支付系统题库 ${randomUUID().slice(0, 8)}`;
const IMPORT_MARKDOWN = `# 支付链路异常恢复

请说明支付链路出现超时和重复回调时，如何通过幂等键、状态机、补偿任务与可观测性保障资金结果一致，并解释关键取舍。

## 发布后回滚策略

请说明发布一项高风险服务改动后，如何设计灰度范围、监控阈值、回滚开关与复盘记录，确保问题能够被快速定位并恢复。`;

test('rejects an ordinary user at the administrative console', async ({ page }) => {
  const user = await registerUser('admin-forbidden');

  await page.goto(ADMIN_URL);
  await page.locator('#admin-email').fill(user.email);
  await page.locator('#admin-password').fill(user.password);
  await page.locator('.admin-access-submit').click();

  await expect(page.getByText('该账号没有管理后台权限。')).toBeVisible();
  await expect(page.locator('#admin-email')).toBeVisible();
});

test('stores an administrator model credential without exposing its API key', async ({ page }) => {
  await signInAdmin(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, accessToken: '' });

  await page.getByRole('button', { name: '打开智能运营助手' }).click();
  await page.getByRole('button', { name: '连接模型' }).click();
  const manager = page.getByRole('dialog', { name: '模型连接管理' });
  await expect(manager).toBeVisible();
  await manager.getByRole('button', { name: '新增模型连接', exact: true }).click();

  const form = page.getByRole('dialog', { name: '新增模型连接' });
  await form.getByLabel('模型名称').fill('e2e-safe-credential-model');
  await form.getByLabel('兼容端点 Base URL').fill('https://model.e2e.test/v1');
  await form.getByLabel('API Key').fill(MODEL_API_KEY);
  await form.getByRole('button', { name: '新增并测试' }).click();
  await expect(form).toBeHidden();

  await expect(manager.getByText('e2e-safe-credential-model', { exact: true })).toBeVisible();
  await expect(manager.getByText(MODEL_KEY_HINT, { exact: false })).toBeVisible();
  await expect(page.locator('html')).not.toContainText(MODEL_API_KEY);
});

test('imports, batch-approves, publishes, and surfaces governed AI metrics', async ({ page }) => {
  const analyst = await registerUser('analytics-source');
  await verifyModelConnection(analyst, 'e2e-success');
  await signInAdmin(page, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, accessToken: '' });

  await page.goto(`${ADMIN_URL}/#imports`);
  const importsView = page.locator('#admin-view-imports');
  await expect(importsView).toBeVisible();
  await importsView.getByRole('button', { name: '导入资料' }).click();
  const importDrawer = page.locator('.ant-drawer-body');
  await expect(importDrawer).toBeVisible();
  await importDrawer.locator('input').fill(IMPORT_TITLE);
  await importDrawer.locator('textarea').fill(IMPORT_MARKDOWN);
  await importDrawer.getByRole('button', { name: '导入并生成候选题' }).click();
  await expect(importDrawer).toBeHidden();

  await importsView.getByRole('button', { name: '审核待办' }).click();
  const contentView = page.locator('#admin-view-content');
  await expect(contentView).toBeVisible();
  await expect(contentView.getByText(IMPORT_TITLE).first()).toBeVisible();

  const firstRowCheckbox = contentView.getByRole('checkbox', { name: 'Select row 1' });
  const secondRowCheckbox = contentView.getByRole('checkbox', { name: 'Select row 2' });
  await expect(firstRowCheckbox).toBeVisible();
  await expect(secondRowCheckbox).toBeVisible();
  await firstRowCheckbox.check();
  await secondRowCheckbox.check();
  await contentView.getByRole('button', { name: '批量通过' }).click();
  await expect(contentView.getByText('已通过', { exact: true })).toHaveCount(2);

  await contentView.getByRole('button', { name: '审核' }).first().click();
  const candidateDrawer = page.locator('.ant-drawer-body');
  await expect(candidateDrawer).toBeVisible();
  await expect(candidateDrawer.getByRole('button', { name: '保存并发布到题库' })).toBeEnabled();
  await candidateDrawer.getByRole('button', { name: '保存并发布到题库' }).click();
  await page.getByRole('button', { name: '确认发布' }).click();
  await expect(candidateDrawer.getByText('审核已保存并发布到题库：')).toBeVisible();

  await page.goto(`${ADMIN_URL}/#analytics`);
  await expect(page.getByRole('heading', { name: '数据看板', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'AI 调用洞察' })).toBeVisible();
  await expect(page.getByText('真实调用')).toBeVisible();
  await expect(page.getByText('我会说明背景、决策、结果和复盘。')).toHaveCount(0);
  await expect(page.getByText('e2e-success')).toHaveCount(0);
});
