import Link from 'next/link';

const MEMORY_TRAITS = [
  {
    icon: '◌',
    title: '接续你的训练进度',
    detail: '档案、目标岗位和上次练习会随账号安全续接。',
  },
  {
    icon: '↗',
    title: '让下一轮更贴近你',
    detail: '完成复盘后，Agent 会把反馈用于后续练习推荐。',
  },
] as const;

export function AccessStory() {
  return (
    <section className="access-story" aria-label="产品介绍">
      <AccessBrand />
      <div className="access-story-copy">
        <StoryCopy />
        <MemoryTraits />
      </div>
      <p className="access-story-foot">仅在你的账户中保存训练进度</p>
    </section>
  );
}

function AccessBrand() {
  return (
    <Link className="access-brand" href="/" aria-label="OfferPilot 首页">
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-mark-core" />
      </span>
      <span>
        <strong>OfferPilot</strong>
        <small>会记住你的面试教练</small>
      </span>
    </Link>
  );
}

function StoryCopy() {
  return (
    <>
      <span className="access-kicker">个人面试 Agent</span>
      <h1>
        从上一次进度，
        <br />
        继续向 offer 靠近。
      </h1>
      <p>登录后继续你的岗位准备、刷题和模拟面试；每一轮复盘都会成为下一次训练的依据。</p>
    </>
  );
}

function MemoryTraits() {
  return (
    <div className="access-memory-list" aria-label="产品能力">
      {MEMORY_TRAITS.map((trait) => (
        <article className="access-memory-card" key={trait.title}>
          <span className="access-memory-icon" aria-hidden="true">
            {trait.icon}
          </span>
          <div>
            <strong>{trait.title}</strong>
            <p>{trait.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
