type AuthTransitionStage = 'checking' | 'entering';

const TRANSITION_COPY = {
  checking: {
    eyebrow: '安全连接中',
    title: '正在确认登录状态',
    detail: '正在恢复你的账号与训练进度，请稍候。',
  },
  entering: {
    eyebrow: '登录成功',
    title: '正在加载你的训练空间',
    detail: 'Agent 正在同步画像、岗位和最近一次训练记录。',
  },
} as const;

export function AuthTransitionScreen({ stage }: { stage: AuthTransitionStage }) {
  const copy = TRANSITION_COPY[stage];
  return (
    <main className={`auth-bootstrap ${stage}`} role="status" aria-live="polite" aria-busy="true">
      <section className="auth-transition-card">
        <div className="auth-transition-brand" aria-label="OfferPilot">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark-core" />
          </span>
          <span>
            <strong>OfferPilot</strong>
            <small>你的面试 Agent</small>
          </span>
        </div>
        <div className="auth-transition-copy">
          <span>{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.detail}</p>
        </div>
        <div className="auth-transition-progress" aria-hidden="true">
          <span />
        </div>
        <small className="auth-transition-hint">无需重复操作，完成后会自动进入</small>
      </section>
    </main>
  );
}
