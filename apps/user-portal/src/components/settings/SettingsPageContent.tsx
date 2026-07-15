'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { ModelConnectionsPanel } from './ModelConnectionsPanel';

type SettingsTab = 'models' | 'account' | 'notifications';

const ANSWER_STYLE_DEFAULT = 50;
const SETTINGS_LABELS: Record<SettingsTab, string> = {
  models: 'AI 模型',
  account: '账户与安全',
  notifications: '通知',
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
          在这里管理你的 AI 模型连接、账号安全与通知偏好，保障你的使用体验与数据安全。
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
  onSignOut,
}: {
  tab: SettingsTab;
  createRequest: number;
  displayName: string | undefined;
  onSignOut: () => void;
}) {
  if (tab === 'models')
    return (
      <>
        <ModelConnectionsPanel createRequest={createRequest} />
        <ModelBehaviorPreferences />
      </>
    );
  if (tab === 'account')
    return <AccountSecurityPanel displayName={displayName} onSignOut={onSignOut} />;
  return <NotificationPanel />;
}

function ModelBehaviorPreferences() {
  const [style, setStyle] = useState(ANSWER_STYLE_DEFAULT);
  const [allowLearning, setAllowLearning] = useState(false);
  return (
    <section
      className="settings-section behavior-preferences"
      aria-labelledby="behavior-preferences-heading"
    >
      <BehaviorHeader />
      <DefaultModelRow />
      <AnswerStyleRow style={style} onChange={setStyle} />
      <DataUsageRow checked={allowLearning} onChange={setAllowLearning} />
    </section>
  );
}

function BehaviorHeader() {
  return (
    <header>
      <h2 id="behavior-preferences-heading" className="h2">
        模型行为偏好
      </h2>
      <p>偏好仅在当前浏览器会话中生效，不会覆盖你的模型连接配置。</p>
    </header>
  );
}

function DefaultModelRow() {
  return (
    <div className="behavior-row">
      <div>
        <strong>默认使用模型</strong>
        <span>Agent 会优先使用你标记为默认的已验证连接。</span>
      </div>
      <span className="behavior-select">
        默认模型 <span aria-hidden="true">⌄</span>
      </span>
    </div>
  );
}

function AnswerStyleRow({ style, onChange }: { style: number; onChange: (style: number) => void }) {
  return (
    <label className="behavior-row behavior-range">
      <span>
        <strong>回答风格</strong>
        <span>根据练习需要调整回答的简洁程度。</span>
      </span>
      <span className="range-control">
        <span>更精简</span>
        <input
          type="range"
          min="0"
          max="100"
          value={style}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label="回答风格"
        />
        <span>更详细</span>
      </span>
    </label>
  );
}

function DataUsageRow({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="behavior-row behavior-toggle">
      <span>
        <strong>数据使用许可</strong>
        <span>允许模型利用本次对话上下文，生成更连贯的训练反馈。</span>
      </span>
      <span>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <i aria-hidden="true" />
        <b>{checked ? '已开启' : '未开启'}</b>
      </span>
    </label>
  );
}

function AccountSecurityPanel({
  displayName,
  onSignOut,
}: {
  displayName: string | undefined;
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
          个人背景与求职目标统一维护在 Agent 档案中；模型密钥始终只以加密形式保存于服务端。
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
        <button className="text-button danger" type="button" onClick={onSignOut}>
          退出登录
        </button>
      </div>
    </section>
  );
}

function NotificationPanel() {
  const [practiceReminder, setPracticeReminder] = useState(true);
  const [reportReminder, setReportReminder] = useState(false);
  return (
    <section
      className="settings-section settings-placeholder"
      aria-labelledby="notification-settings-heading"
    >
      <header>
        <h2 id="notification-settings-heading" className="h2">
          通知偏好
        </h2>
        <p className="muted-text">
          以下开关仅影响当前浏览器会话中的提醒展示，不会替你发送外部消息。
        </p>
      </header>
      <SettingsToggle
        label="练习提醒"
        description="在下一次打开工作台时提示未完成的练习。"
        checked={practiceReminder}
        onChange={setPracticeReminder}
      />
      <SettingsToggle
        label="复盘提醒"
        description="在报告生成后，在工作台中展示复盘入口。"
        checked={reportReminder}
        onChange={setReportReminder}
      />
    </section>
  );
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="account-settings-row settings-toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
