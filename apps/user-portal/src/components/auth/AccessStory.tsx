import Link from 'next/link';

const ROLE_GROUPS = [
  { label: '工程研发', detail: '前端、后端、全栈、测试、数据库与 SRE' },
  { label: '数据与 AI', detail: '数据分析、BI、算法、机器学习与 AI Agent' },
  { label: '产品与设计', detail: '产品、用户研究、UX/UI、视觉与交互设计' },
  { label: '增长与运营', detail: '增长、内容、用户、投放、社区与电商运营' },
  { label: '市场与商业', detail: '市场、品牌、销售、BD、客户成功与商业化运营' },
  { label: '项目与交付', detail: '项目、售前、解决方案、实施与交付管理' },
] as const;

const TRAINING_STEPS = ['选择目标岗位', '补充真实经历与 JD', '完成模拟与复盘'] as const;

export function AccessStory() {
  return (
    <section className="access-story" aria-label="产品介绍">
      <Link className="access-brand" href="/" aria-label="OfferPilot 首页">
        <span className="brand-mark">OP</span>
        <span>
          <strong>OfferPilot</strong>
          <small>AI 面试训练</small>
        </span>
      </Link>
      <div className="access-story-copy">
        <span className="access-kicker">面向互联网全岗位的 AI 面试训练</span>
        <h1>用 AI 把每一次面试，练成更接近 Offer 的确定性。</h1>
        <p>
          从真实项目经历、目标岗位与 JD 出发，完成岗位化追问、即时反馈和能力复盘，
          让你的表达在下一场面试里更有说服力。
        </p>
        <div className="access-role-matrix" aria-label="支持的岗位族群">
          {ROLE_GROUPS.map((group) => (
            <div className="access-role-card" key={group.label}>
              <strong>{group.label}</strong>
              <span>{group.detail}</span>
            </div>
          ))}
        </div>
      </div>
      <ol className="access-steps">
        {TRAINING_STEPS.map((step, index) => (
          <li key={step}>
            <span>0{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </section>
  );
}