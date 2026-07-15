import Link from 'next/link';

const MEMORY_TRAITS = [
  { icon: '◌', title: '越用越懂你', detail: '档案、项目与岗位偏好会写入训练记忆，不用每次重新介绍自己。' },
  { icon: '◎', title: '追问对准弱项', detail: '面试里的卡点会被记住，下一次训练会围绕证据缺口收紧。' },
  { icon: '↗', title: '复盘写回下一场', detail: '报告结论会回到 Agent 记忆，开场就能对准目标岗位。' },
] as const;

const JOURNEY = ['画像', '岗位', '练习', '面试', '复盘'] as const;

export function AccessStory() {
  return <section className="access-story" aria-label="产品介绍"><AccessBrand /><div className="access-story-copy"><StoryCopy /><JourneyRail /><MemoryTraits /></div><p className="access-story-foot">免费创建 · 进度只保存在你的账户里</p></section>;
}

function AccessBrand() {
  return <Link className="access-brand" href="/" aria-label="OfferPilot 首页"><span className="brand-mark" aria-hidden="true"><span className="brand-mark-core" /></span><span><strong>OfferPilot</strong><small>会记住你的面试教练</small></span></Link>;
}

function StoryCopy() {
  return <><span className="access-kicker">个人面试 Agent</span><h1>练面试，<br />也能被记住。</h1><p>从档案到模拟面试，Agent 持续吸收你的经历与弱项。不只是填完就忘的表单，而是一位陪你走到 offer 的教练。</p></>;
}

function JourneyRail() {
  return <ol className="access-journey" aria-label="训练闭环">{JOURNEY.map((label, index) => <li key={label}><span className="access-journey-node"><em>{index + 1}</em><strong>{label}</strong></span>{index < JOURNEY.length - 1 ? <span className="access-journey-line" aria-hidden="true" /> : null}</li>)}</ol>;
}

function MemoryTraits() {
  return <div className="access-memory-list" aria-label="记忆能力">{MEMORY_TRAITS.map((trait) => <article className="access-memory-card" key={trait.title}><span className="access-memory-icon" aria-hidden="true">{trait.icon}</span><div><strong>{trait.title}</strong><p>{trait.detail}</p></div></article>)}</div>;
}
