'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Layout } from 'antd';
import { useAuth } from '@interview-agent/auth-client';

const CONSOLE_ROLES = new Set(['admin', 'question_reviewer']);

type AdminAccessProps = {
  children: ReactNode;
};

export function AdminAccess({ children }: AdminAccessProps) {
  const auth = useAuth();
  const rejectedSubject = useRef<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const hasConsoleAccess = canAccessConsole(auth.identity?.role);

  useEffect(() => {
    if (auth.status !== 'authenticated') {
      rejectedSubject.current = null;
      return;
    }
    const subject = auth.identity?.subject;
    if (hasConsoleAccess || !subject || rejectedSubject.current === subject) return;
    rejectedSubject.current = subject;
    setAccessError('当前账号没有管理后台权限，请使用管理员或题库审核员账号登录。');
    void auth.signOut();
  }, [auth, hasConsoleAccess]);

  if (auth.status === 'authenticated' && hasConsoleAccess) return children;
  if (auth.mode === 'development') return children;
  // OIDC 异步校验：透明占位，避免整页闪登录卡
  if (auth.status === 'loading') {
    return <main className="admin-access-bootstrap" aria-busy="true" aria-label="加载中" />;
  }
  if (auth.mode === 'local') return <LocalAdminAccess error={accessError ?? auth.error} />;
  return <FederatedAdminAccess error={accessError ?? auth.error} />;
}

export function canAccessConsole(role: string | undefined): boolean {
  return role !== undefined && CONSOLE_ROLES.has(role);
}

type Credentials = {
  email: string;
  password: string;
};

function LocalAdminAccess({ error }: { error: string | null }) {
  const access = useLocalAdminSignIn();
  return (
    <Layout className="admin-access" role="main" aria-labelledby="admin-access-title">
      <AdminAccessIntro />
      <Layout.Content className="admin-access-login" style={centeredContentStyle}>
        <Card className="admin-access-panel" styles={cardBodyWithoutPadding} variant="borderless">
          <AdminAccessHeading />
          <AdminCredentialsForm {...access} error={error} />
          <p className="admin-access-note">普通训练账号不能访问后台数据或治理操作。</p>
        </Card>
      </Layout.Content>
    </Layout>
  );
}

function useLocalAdminSignIn() {
  const auth = useAuth();
  const [credentials, setCredentials] = useState<Credentials>({ email: '', password: '' });
  const [isSubmitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    try {
      await auth.signInWithPassword(credentials);
    } finally {
      setSubmitting(false);
    }
  };
  return { credentials, isSubmitting, setCredentials, submit };
}

function AdminAccessIntro() {
  return (
    <Layout.Content className="admin-access-intro" aria-label="管理后台说明">
      <p className="eyebrow">INTERVIEW AGENT · GOVERNANCE</p>
      <h1>面试资产与运行治理</h1>
      <p>审核训练内容、监测 Agent 运行，并保留可追溯的治理记录。此入口只向已授权的后台角色开放。</p>
      <dl className="admin-access-facts">
        <div>
          <dt>访问范围</dt>
          <dd>题库、模型、运行与审计</dd>
        </div>
        <div>
          <dt>会话策略</dt>
          <dd>仅保存在当前浏览器会话</dd>
        </div>
      </dl>
    </Layout.Content>
  );
}

function AdminAccessHeading() {
  return (
    <>
      <p className="eyebrow">受保护访问</p>
      <h2 id="admin-access-title">登录治理后台</h2>
      <p className="admin-access-description">使用由系统管理员初始化的本地后台账号继续。</p>
    </>
  );
}

type AdminCredentialsFormProps = ReturnType<typeof useLocalAdminSignIn> & {
  error: string | null;
};

function AdminCredentialsForm(props: AdminCredentialsFormProps) {
  return (
    <Form
      className="admin-access-form"
      layout="vertical"
      requiredMark={false}
      aria-busy={props.isSubmitting}
      onFinish={() => void props.submit()}
    >
      <AdminCredentialFields credentials={props.credentials} setCredentials={props.setCredentials} />
      {props.error ? <Alert className="admin-access-error" message={props.error} showIcon type="error" /> : null}
      <Button block className="admin-access-submit" disabled={props.isSubmitting} htmlType="submit" loading={props.isSubmitting} type="primary">
        {props.isSubmitting ? '正在验证…' : '安全登录'}
      </Button>
    </Form>
  );
}

type AdminCredentialFieldsProps = {
  credentials: Credentials;
  setCredentials: (credentials: Credentials | ((current: Credentials) => Credentials)) => void;
};

function AdminCredentialFields({ credentials, setCredentials }: AdminCredentialFieldsProps) {
  return (
    <>
      <Form.Item label="邮箱" required>
        <Input
          id="admin-email"
          autoComplete="username"
          maxLength={320}
          prefix={<MailOutlined />}
          placeholder="admin@example.com"
          required
          type="email"
          value={credentials.email}
          onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
        />
      </Form.Item>
      <Form.Item label="密码" required>
        <Input.Password
          id="admin-password"
          autoComplete="current-password"
          minLength={12}
          maxLength={128}
          prefix={<LockOutlined />}
          required
          value={credentials.password}
          onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
          placeholder="输入你的密码"
        />
      </Form.Item>
    </>
  );
}

function FederatedAdminAccess({ error }: { error: string | null }) {
  const auth = useAuth();
  return (
    <Layout className="auth-state" role="main" aria-live="polite">
      <Layout.Content style={centeredContentStyle}>
        <Card className="auth-card" styles={cardBodyWithoutPadding} variant="borderless">
          <div className="eyebrow">Secure Access</div>
          <h1>登录 Interview Agent 治理后台</h1>
          {error ? (
            <Alert message={error} showIcon type="error" />
          ) : (
            <p>使用组织身份登录。系统会在登录后校验后台角色。</p>
          )}
          <Button icon={<SafetyCertificateOutlined />} type="primary" onClick={() => void auth.signIn()}>
            使用组织账号登录
          </Button>
        </Card>
      </Layout.Content>
    </Layout>
  );
}

const centeredContentStyle = {
  display: 'grid',
  placeItems: 'center',
};

const cardBodyWithoutPadding = {
  body: { padding: 0 },
};
