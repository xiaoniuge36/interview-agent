import Link from 'next/link';
import { StaggeredTitle } from '@/components/motion/StaggeredTitle';
import { ThemeAtmosphere } from '@/components/theme/ThemeAtmosphere';

/**
 * 登录屏同时承担落地页职责：只陈述可验证的产品事实（题量、方向、评价维度均以
 * DELIVERED/题库口径为准），效果卡明确标注「产品示例」——登录前绝不伪造个人进度。
 */
export function AccessStory() {
  return (
    <section className="access-story" aria-label="产品介绍">
      <ThemeAtmosphere context="auth" />
      <AccessBrand />
      <div className="access-story-copy">
        <StoryCopy />
        <ProductFacts />
        <ProductProof />
        <TrainingSteps />
        <AccessFaq />
      </div>
      <p className="access-story-foot">你的档案、训练与复盘仅属于当前账户</p>
    </section>
  );
}

function AccessBrand() {
  return (
    <Link className="access-brand" href="/" aria-label="Interview Agent 首页">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-core" />
      </span>
      <span>
        <strong>Interview Agent</strong>
        <small>为求职者准备的 AI 面试教练</small>
      </span>
    </Link>
  );
}

function StoryCopy() {
  return (
    <>
      <span className="access-kicker">从今天开始准备</span>
      <StaggeredTitle as="h1" segments={['下一次面试，', '别靠临场发挥。']} />
      <p>每天完成一个有依据的小训练，把知识、项目和表达逐步练成面试时拿得出手的证据。</p>
    </>
  );
}

const PRODUCT_FACTS = [
  { value: '192+', label: '道面试题 · 六大岗位方向' },
  { value: '四维', label: '表达力逐题评价' },
  { value: 'STAR', label: '复盘沉淀可复用素材' },
] as const;

function ProductFacts() {
  return (
    <ul className="access-facts" aria-label="产品事实">
      {PRODUCT_FACTS.map((fact) => (
        <li key={fact.value}>
          <strong>{fact.value}</strong>
          <span>{fact.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ProductProof() {
  return (
    <article className="access-product-proof" aria-label="产品效果示例">
      <header>
        <span>产品示例</span>
        <small>模拟面试 · 工程研发</small>
      </header>
      <div className="access-proof-dialog">
        <p className="is-question">这个接口的幂等性你是怎么保证的？</p>
        <p className="is-answer">我用请求幂等键加数据库唯一约束，重复提交时……</p>
        <p className="is-question">追问：如果重试发生在扣款之后、写库之前呢？</p>
      </div>
      <footer>
        <strong>本轮复盘 86 / 100</strong>
        <span>结构完整，缺少失败路径证据 · 已生成 2 条改进行动</span>
      </footer>
      <a className="access-preview-action" href="#access-panel">
        现在开始第一场模拟
      </a>
    </article>
  );
}

const TRAINING_STEPS = [
  { title: '建档案', detail: '目标岗位与个人经历' },
  { title: '练起来', detail: '刷题与模拟面试' },
  { title: '复盘沉淀', detail: '错题、素材与成长' },
] as const;

function TrainingSteps() {
  return (
    <ol className="access-steps" aria-label="三步训练闭环">
      {TRAINING_STEPS.map((step, index) => (
        <li key={step.title}>
          <span className="access-step-index" aria-hidden="true">
            {index + 1}
          </span>
          <span className="access-step-body">
            <strong>{step.title}</strong>
            <small>{step.detail}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}

const ACCESS_FAQ = [
  {
    question: '需要自己配置 AI 模型吗？',
    answer: 'AI 评价与模拟面试需要在设置中连接一次你自己的模型 API Key；浏览题库与整理素材不需要。',
  },
  {
    question: '覆盖哪些岗位方向？',
    answer:
      '工程研发、数据与 AI、产品与设计、增长与运营、市场与商业、项目与交付六大方向，混合知识、场景与行为面题型。',
  },
  {
    question: '我的训练数据会被怎么使用？',
    answer: '档案、训练与复盘记录只属于你的账户，仅用于生成你自己的训练建议。',
  },
] as const;

function AccessFaq() {
  return (
    <div className="access-faq" aria-label="常见问题">
      {ACCESS_FAQ.map((item) => (
        <details key={item.question}>
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
