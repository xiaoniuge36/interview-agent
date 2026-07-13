'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { INITIAL_ACCESS_FORM, type AccessForm, type AccessMode } from './access-types';

export function LocalAccessScreen() {
  const access = useLocalAccess();
  return (
    <main className="access-shell">
      <AccessStory />
      <section className="access-panel" aria-labelledby="access-title">
        <AccessHeading isRegistering={access.isRegistering} />
        <AccessTabs mode={access.mode} onChange={access.selectMode} />
        <LocalAccessForm {...access} />
        <p className="access-hint">
          {access.isRegistering
            ? '创建后会直接进入工作台。密码仅保存安全摘要。'
            : '使用已注册的邮箱继续你的训练。登录状态仅保存在当前浏览器会话中。'}
        </p>
      </section>
    </main>
  );
}

function useLocalAccess() {
  const auth = useAuth();
  const [mode, setMode] = useState<AccessMode>('sign-in');
  const [form, setForm] = useState<AccessForm>(INITIAL_ACCESS_FORM);
  const isRegistering = mode === 'register';

  function selectMode(nextMode: AccessMode) {
    setMode(nextMode);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRegistering) {
      await auth.register({ ...form, name: form.name.trim() });
      return;
    }
    await auth.signInWithPassword({ email: form.email, password: form.password });
  }

  return {
    mode,
    form,
    auth,
    isRegistering,
    isSubmitting: auth.status === 'loading',
    selectMode,
    setForm,
    submit,
  };
}

function AccessStory() {
  return (
    <section className="access-story" aria-label="产品介绍">
      <Link className="access-brand" href="/" aria-label="Interview Agent 首页">
        <span className="brand-mark">IA</span>
        <span>Interview Agent</span>
      </Link>
      <div className="access-story-copy">
        <span className="access-kicker">INTERVIEW PRACTICE SYSTEM</span>
        <h1>把每次练习，变成下一次面试的底气。</h1>
        <p>建立个人画像，匹配目标岗位，在可复盘的模拟面试中持续校准表达与能力证据。</p>
      </div>
      <ol className="access-steps">
        <li>
          <span>01</span>
          填写候选人画像
        </li>
        <li>
          <span>02</span>
          明确目标岗位
        </li>
        <li>
          <span>03</span>
          开始模拟与复盘
        </li>
      </ol>
    </section>
  );
}

function AccessHeading({ isRegistering }: { isRegistering: boolean }) {
  return (
    <div className="access-panel-header">
      <p className="eyebrow">账户访问</p>
      <h2 id="access-title">{isRegistering ? '创建你的训练空间' : '欢迎回来'}</h2>
      <p>
        {isRegistering
          ? '用一个邮箱保存你的画像、岗位和面试记录。'
          : '登录后继续上一次的训练进度。'}
      </p>
    </div>
  );
}

type AccessTabsProps = {
  mode: AccessMode;
  onChange: (mode: AccessMode) => void;
};

function AccessTabs({ mode, onChange }: AccessTabsProps) {
  return (
    <div className="access-tabs" role="tablist" aria-label="登录方式">
      <button
        className={mode === 'sign-in' ? 'access-tab active' : 'access-tab'}
        type="button"
        role="tab"
        aria-selected={mode === 'sign-in'}
        aria-controls="sign-in-panel"
        onClick={() => onChange('sign-in')}
      >
        登录
      </button>
      <button
        className={mode === 'register' ? 'access-tab active' : 'access-tab'}
        type="button"
        role="tab"
        aria-selected={mode === 'register'}
        aria-controls="register-panel"
        onClick={() => onChange('register')}
      >
        注册
      </button>
    </div>
  );
}

type LocalAccessFormProps = ReturnType<typeof useLocalAccess>;

function LocalAccessForm(props: LocalAccessFormProps) {
  const panelId = props.isRegistering ? 'register-panel' : 'sign-in-panel';
  return (
    <form
      id={panelId}
      className="access-form"
      role="tabpanel"
      aria-busy={props.isSubmitting}
      onSubmit={(event) => void props.submit(event)}
    >
      {props.isRegistering ? <NameField form={props.form} setForm={props.setForm} /> : null}
      <CredentialFields
        form={props.form}
        setForm={props.setForm}
        isRegistering={props.isRegistering}
      />
      {props.auth.status === 'error' && props.auth.error ? (
        <p className="access-error" role="alert">
          {props.auth.error}
        </p>
      ) : null}
      <button className="button access-submit" type="submit" disabled={props.isSubmitting}>
        {props.isSubmitting
          ? '正在验证…'
          : props.isRegistering
            ? '创建并进入工作台'
            : '登录并继续训练'}
      </button>
    </form>
  );
}

type FormFieldProps = {
  form: AccessForm;
  setForm: (form: AccessForm | ((current: AccessForm) => AccessForm)) => void;
};

function NameField({ form, setForm }: FormFieldProps) {
  return (
    <label className="label" htmlFor="access-name">
      姓名
      <input
        id="access-name"
        className="input"
        autoComplete="name"
        minLength={2}
        maxLength={80}
        required
        value={form.name}
        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        placeholder="例如：张晓明"
      />
    </label>
  );
}

function CredentialFields(props: FormFieldProps & { isRegistering: boolean }) {
  return (
    <>
      <label className="label" htmlFor="access-email">
        邮箱
        <input
          id="access-email"
          className="input"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
          value={props.form.email}
          onChange={(event) =>
            props.setForm((current) => ({ ...current, email: event.target.value }))
          }
          placeholder="name@example.com"
        />
      </label>
      <label className="label" htmlFor="access-password">
        密码
        <input
          id="access-password"
          className="input"
          type="password"
          autoComplete={props.isRegistering ? 'new-password' : 'current-password'}
          minLength={12}
          maxLength={128}
          required
          value={props.form.password}
          onChange={(event) =>
            props.setForm((current) => ({ ...current, password: event.target.value }))
          }
          placeholder={props.isRegistering ? '至少 12 个字符' : '输入你的密码'}
        />
      </label>
    </>
  );
}
