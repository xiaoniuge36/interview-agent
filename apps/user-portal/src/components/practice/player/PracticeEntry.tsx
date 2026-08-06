import Link from 'next/link';
import { ActionLabel } from '@/components/consumer/ActionLabel';
import { SignalField } from '@/components/consumer/SignalField';
import { SplitRevealText } from '@/components/consumer/SplitRevealText';

const PRACTICE_MODES = [
  {
    href: '/questions',
    kicker: '自由组题',
    title: '选一组题，马上开始',
    copy: '按技术方向、难度和题型组合 1–10 道题。',
    meta: '适合 10–30 分钟专注训练',
  },
  {
    href: '/interview',
    kicker: '场景训练',
    title: '进入完整模拟面试',
    copy: '从开场到追问，练习连续表达和临场组织。',
    meta: '适合面试前完整演练',
  },
  {
    href: '/reports',
    kicker: '基于证据',
    title: '从上次薄弱点再练',
    copy: '回到评价与错题证据，选择最值得补强的一轮。',
    meta: '适合阶段复盘与巩固',
  },
] as const;

export function PracticeEntry() {
  return (
    <div className="practice-entry-page">
      <section className="practice-entry" aria-labelledby="practice-entry-heading">
        <section className="practice-entry-hero">
          <SignalField />
          <span>Practice workspace · 自主训练</span>
          <h1 id="practice-entry-heading" aria-label="把想练的题，组合成一轮专注练习">
            <SplitRevealText text="把想练的题，" />
            <br />
            <SplitRevealText text="组合成一轮专注练习" />
          </h1>
          <p>
            无需完善个人档案，直接从公共题库选择 1–10 道题。作答、查看解析和 AI 评价都由你决定。
          </p>
          <div className="practice-entry-actions">
            <Link href="/questions">
              <ActionLabel label="去题库选择题目" />
            </Link>
            <Link href="/home">返回题库大厅</Link>
          </div>
          <div className="practice-entry-facts" aria-label="练习说明">
            <span>
              <strong>1–10</strong> 每轮题目
            </span>
            <span>
              <strong>≥4 分钟</strong> 单题建议
            </span>
            <span>
              <strong>可选</strong> AI 评价
            </span>
          </div>
        </section>
        <PracticeEntryGuide />
      </section>
      <PracticeEntryModes />
    </div>
  );
}

function PracticeEntryModes() {
  return (
    <section className="practice-entry-modes" aria-labelledby="practice-entry-modes-heading">
      <header>
        <div>
          <span>不确定从哪里开始？</span>
          <h2 id="practice-entry-modes-heading">选择今天的训练方式</h2>
        </div>
        <p>自由刷题、完整模拟和弱项复盘，三条路径都回到真实面试表达。</p>
      </header>
      <div className="practice-mode-grid">
        {PRACTICE_MODES.map((mode, index) => (
          <Link className="practice-mode-card" href={mode.href} key={mode.href}>
            <span>{mode.kicker}</span>
            <strong>{mode.title}</strong>
            <p>{mode.copy}</p>
            <footer>
              <small>{mode.meta}</small>
              {index === 0 ? <ActionLabel label="开始" /> : <i aria-hidden="true">→</i>}
            </footer>
          </Link>
        ))}
      </div>
    </section>
  );
}

function PracticeEntryGuide() {
  return (
    <aside className="practice-entry-guide" aria-labelledby="practice-entry-guide-heading">
      <header>
        <span>本轮流程</span>
        <strong id="practice-entry-guide-heading">从选题到复盘，保持一个节奏</strong>
      </header>
      <ol>
        <li>
          <span>01</span>
          <div>
            <strong>组合题单</strong>
            <p>按方向、题型和难度自由筛选，题单跨分页保留。</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>逐题作答</strong>
            <p>回答会随时保存，可以在本轮题目间自由切换。</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>查看解析与评价</strong>
            <p>先独立思考，再按需查看标准解析或调用自己的模型评价。</p>
          </div>
        </li>
      </ol>
      <div className="practice-entry-note">
        <span aria-hidden="true">✓</span>
        <p>
          <strong>个人档案不是刷题门槛</strong> 档案和目标岗位仅用于增强 Agent 推荐。
        </p>
      </div>
    </aside>
  );
}
