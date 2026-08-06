import Link from 'next/link';

const TRAINING_DAYS = ['一', '二', '三', '四', '五', '六', '日'] as const;

export function AccessStory() {
  return (
    <section className="access-story" aria-label="产品介绍">
      <AccessBrand />
      <div className="access-story-copy">
        <StoryCopy />
        <TrainingPreview />
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
      <h1>
        下一次面试，
        <br />
        别靠临场发挥。
      </h1>
      <p>每天完成一个有依据的小训练，把知识、项目和表达逐步练成面试时拿得出手的证据。</p>
    </>
  );
}

function TrainingPreview() {
  return (
    <article className="access-training-preview" aria-label="登录后的训练预览">
      <header>
        <span>登录后继续</span>
        <small>按真实进度生成</small>
      </header>
      <strong>接上目标岗位与最近一次训练</strong>
      <p>系统会结合你的档案、练习记录和复盘建议安排今天的下一步。</p>
      <a className="access-preview-action" href="#access-panel">
        登录后继续训练
      </a>
      <footer>
        <span>每周训练节奏</span>
        <div className="access-training-days" aria-label="登录后展示本周真实训练记录">
          {TRAINING_DAYS.map((day) => (
            <span key={day}>
              {day}
            </span>
          ))}
        </div>
      </footer>
    </article>
  );
}
