'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { ConsoleIcon } from '@/components/ConsoleIcon';

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
    <main className="admin-access" aria-labelledby="admin-access-title">
      <AdminAccessIntro />
      <section className="admin-access-panel">
        <AdminAccessHeading />
        <AdminCredentialsForm {...access} error={error} />
        <p className="admin-access-note">普通训练账号不能访问后台数据或治理操作。</p>
      </section>
    </main>
  );
}

function useLocalAdminSignIn() {
  const auth = useAuth();
  const [credentials, setCredentials] = useState<Credentials>({ email: '', password: '' });
  const [isSubmitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
    <section className="admin-access-intro" aria-label="管理后台说明">
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
    </section>
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
    <form className="admin-access-form" aria-busy={props.isSubmitting} onSubmit={(event) => void props.submit(event)}>
      <AdminCredentialFields credentials={props.credentials} setCredentials={props.setCredentials} />
      {props.error ? <p className="admin-access-error" role="alert">{props.error}</p> : null}
      <button className="button admin-access-submit" type="submit" disabled={props.isSubmitting}>
        {props.isSubmitting ? '正在验证…' : '安全登录'}
      </button>
    </form>
  );
}

type AdminCredentialFieldsProps = {
  credentials: Credentials;
  setCredentials: (credentials: Credentials | ((current: Credentials) => Credentials)) => void;
};

function AdminCredentialFields({ credentials, setCredentials }: AdminCredentialFieldsProps) {
  return (
    <>
      <label htmlFor="admin-email">
        <span className="field-label-title">
          <ConsoleIcon name="mail" size={15} />
          邮箱
        </span>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          maxLength={320}
          required
          value={credentials.email}
          onChange={(event) => setCredentials((current) => ({ ...current, email: event.target.value }))}
          placeholder="admin@example.com"
        />
      </label>
      <label htmlFor="admin-password">
        <span className="field-label-title">
          <ConsoleIcon name="lock" size={15} />
          密码
        </span>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          maxLength={128}
          required
          value={credentials.password}
          onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
          placeholder="输入你的密码"
        />
      </label>
    </>
  );
}

function FederatedAdminAccess({ error }: { error: string | null }) {
  const auth = useAuth();
  return (
    <main className="auth-state" aria-live="polite">
      <section className="auth-card">
        <div className="eyebrow">Secure Access</div>
        <h1>登录 Interview Agent 治理后台</h1>
        <p>{error ?? '使用组织身份登录。系统会在登录后校验后台角色。'}</p>
        <button className="button" type="button" onClick={() => void auth.signIn()}>
          使用组织账号登录
        </button>
      </section>
    </main>
  );
}
