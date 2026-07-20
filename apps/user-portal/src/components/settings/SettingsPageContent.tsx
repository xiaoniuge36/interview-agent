'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { ModelConnectionsPanel } from './ModelConnectionsPanel';
import { AiUsageSummary } from './AiUsageSummary';

type SettingsTab = 'models' | 'account';

const SETTINGS_LABELS: Record<SettingsTab, string> = {
  models: 'AI 模型',
  account: '账号与会话',
};

export function SettingsPageContent() {
  const auth = useAuth();
  const [tab, setTab] = useState<SettingsTab>('models');
  const [createRequest, setCreateRequest] = useState(0);
  return (
    <div className="workspace page-workspace settings-workspace">
      <SettingsHeader
        showAdd={tab === 'models'}
        onAdd={() => setCreateRequest((value) => value + 1)}
      />
      <SettingsTabs active={tab} onChange={setTab} />
      <SettingsBody
        tab={tab}
        createRequest={createRequest}
        displayName={auth.identity?.displayName}
        showSignOut={auth.mode !== 'development'}
        onSignOut={() => void auth.signOut()}
      />
    </div>
  );
}

function SettingsHeader({ showAdd, onAdd }: { showAdd: boolean; onAdd: () => void }) {
  return (
    <header className="page-intro settings-page-intro">
      <div>
        <h1 className="h1">设置中心</h1>
        <p className="muted-text">
          管理你的 AI 模型连接与当前登录会话，所有状态都以服务端真实结果为准。
        </p>
      </div>
      {showAdd ? (
        <button className="button settings-add-button" type="button" onClick={onAdd}>
          <span aria-hidden="true">＋</span>添加模型连接
        </button>
      ) : null}
    </header>
  );
}

function SettingsTabs({
  active,
  onChange,
}: {
  active: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}) {
  return (
    <nav className="settings-tabs" aria-label="设置分区">
      {(Object.keys(SETTINGS_LABELS) as SettingsTab[]).map((id) => (
        <button
          type="button"
          key={id}
          className={active === id ? 'active' : ''}
          onClick={() => onChange(id)}
        >
          {SETTINGS_LABELS[id]}
        </button>
      ))}
    </nav>
  );
}

function SettingsBody({
  tab,
  createRequest,
  displayName,
  showSignOut,
  onSignOut,
}: {
  tab: SettingsTab;
  createRequest: number;
  displayName: string | undefined;
  showSignOut: boolean;
  onSignOut: () => void;
}) {
  if (tab === 'models')
    return (
      <>
        <ModelConnectionsPanel createRequest={createRequest} />
        <AiUsageSummary />
        <ModelUsageRules />
      </>
    );
  return (
    <AccountSecurityPanel
      displayName={displayName}
      showSignOut={showSignOut}
      onSignOut={onSignOut}
    />
  );
}

function ModelUsageRules() {
  return (
    <section
      className="settings-section behavior-preferences"
      aria-labelledby="model-usage-heading"
    >
      <header>
        <h2 id="model-usage-heading" className="h2">
          Agent 模型使用规则
        </h2>
        <p>只有设为默认且测试通过的连接，才会用于你的 AI 评价与模拟面试。</p>
      </header>
      <UsageRule
        title="按次调用"
        copy="密钥只在服务端为当前任务短暂解密，不会返回浏览器，也不会发送给其他用户。"
      />
      <UsageRule
        title="变更后重新验证"
        copy="修改模型名称、Base URL 或 API Key 后，连接会自动回到待测试状态。"
      />
      <UsageRule
        title="失败可追溯"
        copy="测试失败会保存脱敏错误码和测试时间，回答与训练记录不会因此丢失。"
      />
    </section>
  );
}

function UsageRule({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="behavior-row">
      <div>
        <strong>{title}</strong>
        <span>{copy}</span>
      </div>
      <span className="chip success">已生效</span>
    </div>
  );
}

function AccountSecurityPanel({
  displayName,
  showSignOut,
  onSignOut,
}: {
  displayName: string | undefined;
  showSignOut: boolean;
  onSignOut: () => void;
}) {
  return (
    <section
      className="settings-section settings-placeholder"
      aria-labelledby="account-settings-heading"
    >
      <header>
        <h2 id="account-settings-heading" className="h2">
          账户与安全
        </h2>
        <p className="muted-text">
          登录身份名称由账号系统提供；个人背景与求职目标独立维护在 Agent 档案中。
        </p>
      </header>
      <div className="account-settings-row">
        <div>
          <span>当前账户</span>
          <strong>{displayName ?? '训练用户'}</strong>
        </div>
        <Link className="button secondary" href="/profile">
          编辑 Agent 档案
        </Link>
      </div>
      <div className="account-settings-row">
        <div>
          <span>登录会话</span>
          <strong>当前设备已登录</strong>
        </div>
        {showSignOut ? (
          <button className="text-button danger" type="button" onClick={onSignOut}>
            退出登录
          </button>
        ) : (
          <span className="muted-text small-text">开发身份固定</span>
        )}
      </div>
    </section>
  );
}
