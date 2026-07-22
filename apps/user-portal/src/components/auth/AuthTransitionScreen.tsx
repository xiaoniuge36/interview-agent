type AuthTransitionStage = 'checking' | 'entering';

const TRANSITION_COPY = {
  checking: {
    eyebrow: '安全连接中',
    title: '正在确认登录状态',
    detail: '正在验证当前账号会话，请稍候。',
    status: '正在恢复安全会话',
  },
  entering: {
    eyebrow: '已确认身份',
    title: '正在进入训练空间',
    detail: '登录状态已准备就绪，即将带你返回刚才的位置。',
    status: '正在完成页面跳转',
  },
} as const;

export function AuthTransitionScreen({ stage }: { stage: AuthTransitionStage }) {
  const copy = TRANSITION_COPY[stage];

  return (
    <main className={`auth-bootstrap ${stage}`} role="status" aria-live="polite" aria-busy="true">
      <section className="auth-transition-card" aria-labelledby="auth-transition-title">
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
          <h1 id="auth-transition-title">{copy.title}</h1>
          <p>{copy.detail}</p>
        </div>

        <div className="auth-transition-status">
          <span aria-hidden="true" />
          <div>
            <strong>{copy.status}</strong>
            <small>无需重复操作，完成后自动进入</small>
          </div>
        </div>
      </section>
    </main>
  );
}
