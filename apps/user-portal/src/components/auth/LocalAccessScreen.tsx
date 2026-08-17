'use client';

import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@interview-agent/auth-client';
import { FieldIcon } from '@/components/FieldIcon';
import { AccessStory } from './AccessStory';
import { AccessThemeMenu } from './AccessThemeMenu';
import { createExclusiveAccessActionRunner } from './access-action-single-flight';
import { resolveAccessError } from './access-error';
import { INITIAL_ACCESS_FORM, type AccessForm, type AccessMode } from './access-types';
import {
  clearAccessFormError,
  focusFirstInvalidAccessField,
  hasAccessFormErrors,
  validateAccessForm,
  type AccessFormErrors,
} from './access-validation';

export function LocalAccessScreen() {
  const access = useLocalAccess();
  return (
    <main className="access-shell">
      <AccessThemeMenu />
      <AccessStory />
      <section
        className="access-panel"
        id="access-panel"
        aria-labelledby="access-title"
        tabIndex={-1}
      >
        <AccessHeading isRegistering={access.isRegistering} />
        <AccessTabs mode={access.mode} onChange={access.selectMode} />
        <LocalAccessForm {...access} />
        <p className="access-hint">
          {access.isRegistering
            ? '创建后立刻拥有个人记忆空间，画像与面试记录只属于你。'
            : '登录后接续上次进度。会话保存在当前浏览器，可随时退出。'}
        </p>
      </section>
    </main>
  );
}

function useLocalAccess() {
  const auth = useAuth();
  const [mode, setMode] = useState<AccessMode>('sign-in');
  const [form, setForm] = useState<AccessForm>(INITIAL_ACCESS_FORM);
  const [formErrors, setFormErrors] = useState<AccessFormErrors>({});
  const [submittedMode, setSubmittedMode] = useState<AccessMode | null>(null);
  const [runAccessAction] = useState(createExclusiveAccessActionRunner);
  const isRegistering = mode === 'register';
  function selectMode(nextMode: AccessMode) {
    setMode(nextMode);
    setFormErrors({});
    setSubmittedMode(null);
  }
  function updateField(field: keyof AccessForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => clearAccessFormError(current, field));
    setSubmittedMode(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAccessForm(form, mode);
    setFormErrors(errors);
    if (hasAccessFormErrors(errors)) {
      setSubmittedMode(null);
      focusFirstInvalidAccessField(errors, mode, focusAccessField);
      return;
    }
    setSubmittedMode(mode);
    await runAccessAction(() => authenticateLocalAccess(auth, form, isRegistering));
  }
  return {
    mode,
    form,
    formErrors,
    auth,
    authError: resolveAccessError({
      authStatus: auth.status,
      currentMode: mode,
      error: auth.error,
      submittedMode,
    }),
    isRegistering,
    isSubmitting: auth.status === 'loading',
    selectMode,
    updateField,
    submit,
  };
}

function authenticateLocalAccess(
  auth: ReturnType<typeof useAuth>,
  form: AccessForm,
  isRegistering: boolean,
): Promise<void> {
  if (isRegistering) return auth.register({ ...form, name: form.name.trim() });
  return auth.signInWithPassword({ email: form.email, password: form.password });
}

function focusAccessField(id: string): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.focus();
}

function AccessHeading({ isRegistering }: { isRegistering: boolean }) {
  return (
    <div className="access-panel-header">
      <p className="eyebrow">{isRegistering ? '30 秒开通' : '继续训练'}</p>
      <h2 id="access-title">{isRegistering ? '创建账号' : '欢迎回来'}</h2>
      <p>
        {isRegistering
          ? '用邮箱开启你的面试记忆，画像、弱项与复盘会持续沉淀。'
          : '接上你的画像、岗位与上一轮复盘，接着练。'}
      </p>
    </div>
  );
}

type AccessTabsProps = {
  mode: AccessMode;
  onChange: (mode: AccessMode) => void;
};

const ACCESS_TAB_IDS: Record<AccessMode, string> = {
  'sign-in': 'sign-in-tab',
  register: 'register-tab',
};

export function AccessTabs({ mode, onChange }: AccessTabsProps) {
  return (
    <div className="access-tabs" role="tablist" aria-label="登录方式">
      <button
        className={mode === 'sign-in' ? 'access-tab active' : 'access-tab'}
        type="button"
        role="tab"
        id={ACCESS_TAB_IDS['sign-in']}
        aria-selected={mode === 'sign-in'}
        aria-controls="sign-in-panel"
        tabIndex={mode === 'sign-in' ? 0 : -1}
        onKeyDown={(event) => handleAccessTabKeyDown(event, mode, onChange)}
        onClick={() => onChange('sign-in')}
      >
        登录
      </button>
      <button
        className={mode === 'register' ? 'access-tab active' : 'access-tab'}
        type="button"
        role="tab"
        id={ACCESS_TAB_IDS.register}
        aria-selected={mode === 'register'}
        aria-controls="register-panel"
        tabIndex={mode === 'register' ? 0 : -1}
        onKeyDown={(event) => handleAccessTabKeyDown(event, mode, onChange)}
        onClick={() => onChange('register')}
      >
        注册
      </button>
    </div>
  );
}

export function resolveAccessTabKey(mode: AccessMode, key: string): AccessMode | null {
  if (key === 'Home') return 'sign-in';
  if (key === 'End') return 'register';
  if (key === 'ArrowLeft' || key === 'ArrowRight')
    return mode === 'sign-in' ? 'register' : 'sign-in';
  return null;
}

function handleAccessTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  mode: AccessMode,
  onChange: (mode: AccessMode) => void,
) {
  const nextMode = resolveAccessTabKey(mode, event.key);
  if (!nextMode) return;
  event.preventDefault();
  onChange(nextMode);
  event.currentTarget.ownerDocument.getElementById(ACCESS_TAB_IDS[nextMode])?.focus();
}

type LocalAccessFormProps = ReturnType<typeof useLocalAccess>;

function LocalAccessForm(props: LocalAccessFormProps) {
  const panelId = props.isRegistering ? 'register-panel' : 'sign-in-panel';
  return (
    <form
      id={panelId}
      className="access-form"
      role="tabpanel"
      aria-labelledby={ACCESS_TAB_IDS[props.mode]}
      aria-busy={props.isSubmitting}
      noValidate
      onSubmit={(event) => void props.submit(event)}
    >
      {props.isRegistering ? (
        <NameField form={props.form} errors={props.formErrors} onChange={props.updateField} />
      ) : null}
      <CredentialFields
        form={props.form}
        errors={props.formErrors}
        isRegistering={props.isRegistering}
        onChange={props.updateField}
      />
      {props.authError ? (
        <p className="access-error" role="alert">
          {props.authError}
        </p>
      ) : null}
      <button className="button access-submit" type="submit" disabled={props.isSubmitting}>
        {props.isSubmitting ? '请稍候…' : props.isRegistering ? '创建并开始' : '登录'}
      </button>
    </form>
  );
}

type FormFieldProps = {
  form: AccessForm;
  errors: AccessFormErrors;
  onChange: (field: keyof AccessForm, value: string) => void;
};

function NameField({ form, errors, onChange }: FormFieldProps) {
  const error = errors.name;
  return (
    <label className="label" htmlFor="access-name">
      <span className="field-label-title">
        <FieldIcon name="person" />
        怎么称呼你
      </span>
      <input
        id="access-name"
        className="input"
        autoComplete="name"
        aria-describedby={error ? 'access-name-error' : undefined}
        aria-invalid={Boolean(error)}
        value={form.name}
        onChange={(event) => onChange('name', event.target.value)}
        placeholder="例如：晓明"
      />
      <FieldError id="access-name-error" message={error} />
    </label>
  );
}

function CredentialFields(props: FormFieldProps & { isRegistering: boolean }) {
  const emailError = props.errors.email;
  const passwordError = props.errors.password;
  return (
    <>
      <label className="label" htmlFor="access-email">
        <span className="field-label-title">
          <FieldIcon name="mail" />
          邮箱
        </span>
        <input
          id="access-email"
          className="input"
          type="email"
          autoComplete="email"
          aria-describedby={emailError ? 'access-email-error' : undefined}
          aria-invalid={Boolean(emailError)}
          value={props.form.email}
          onChange={(event) => props.onChange('email', event.target.value)}
          placeholder="name@example.com"
        />
        <FieldError id="access-email-error" message={emailError} />
      </label>
      <label className="label" htmlFor="access-password">
        <span className="field-label-title">
          <FieldIcon name="lock" />
          密码
        </span>
        <input
          id="access-password"
          className="input"
          type="password"
          autoComplete={props.isRegistering ? 'new-password' : 'current-password'}
          aria-describedby={passwordError ? 'access-password-error' : undefined}
          aria-invalid={Boolean(passwordError)}
          value={props.form.password}
          onChange={(event) => props.onChange('password', event.target.value)}
          placeholder={props.isRegistering ? '至少 8 位' : '输入密码'}
        />
        <FieldError id="access-password-error" message={passwordError} />
      </label>
    </>
  );
}

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <span id={id} className="access-field-error" aria-live="polite">
      {message}
    </span>
  ) : null;
}
