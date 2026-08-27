const FLOW_STEPS = [
  {
    title: '开场与逐题追问',
    detail: 'AI 面试官按岗位考察维度出题，并根据你的回答持续追问。',
  },
  {
    title: '像真实面试一样作答',
    detail: '每次回答都会保存；中途离开可从首页「继续上次面试」无损恢复。',
  },
  {
    title: '结构化复盘沉淀',
    detail: '结束后生成分阶段评分与下一步建议，并进入成长档案供长期对比。',
  },
] as const;

/** 未开始任何面试时，用一张流程引导卡取代空的进度与复盘面板。 */
export function InterviewFlowGuide() {
  return (
    <section className="panel interview-flow-guide motion-rise" aria-label="模拟面试流程说明">
      <div className="eyebrow">训练流程</div>
      <ol>
        {FLOW_STEPS.map((step, index) => (
          <li key={step.title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
