import Link from 'next/link';

export function PracticeEntry() {
  return (
    <div className="practice-entry-page">
      <section className="practice-entry" aria-labelledby="practice-entry-heading">
        <section className="practice-entry-hero">
          <span>Practice workspace · 自主训练</span>
          <h1 id="practice-entry-heading">
            把想练的题，
            <br />
            组合成一轮专注练习
          </h1>
          <p>
            无需完善个人档案，直接从公共题库选择 1–10 道题。作答、查看解析和 AI 评价都由你决定。
          </p>
          <div className="practice-entry-actions">
            <Link href="/questions">
              去题库选择题目 <span aria-hidden="true">→</span>
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
    </div>
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
