const METRICS = [
  ['3', '已接入阶段'],
  ['SSE', '流式面试反馈'],
  ['Trace', '审计与回放'],
] as const;

const PRINCIPLES = ['Product API 是事实源', 'Agent Runtime 管状态机', '前端不拼 prompt'] as const;

export function HeroSection() {
  return (
    <section className="hero">
      <div className="panel">
        <div className="eyebrow">Agent-native Interview Workspace</div>
        <h1 className="h1">从个人画像到模拟面试，再到记忆写回。</h1>
        <p className="muted-text">
          前台只承载训练体验；业务事实、权限和 Agent 状态统一进入 Product API 与 Agent Runtime。
        </p>
        <div className="grid-3 metric-grid">
          {METRICS.map(([value, label]) => (
            <div className="metric" key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel muted">
        <div className="eyebrow">Current Focus</div>
        <h2 className="h2">AI Agent 应用开发</h2>
        <p className="muted-text">优先训练状态机、RAG 权限过滤、工程边界、项目表达和可观测性。</p>
        <div className="stack focus-stack">
          {PRINCIPLES.map((item) => (
            <span className="chip" key={item}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
