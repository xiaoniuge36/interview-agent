import type { PracticeSession } from '@interview-agent/contracts';

export function PracticeLearningNotice({ item }: { item: PracticeSession['items'][number] }) {
  const focus = item.question.tags.slice(0, 2).join('、') || '相关能力';
  const evaluated = Boolean(item.evaluation);
  const copy = evaluated
    ? `完成整轮 AI 复盘后，会把本题的 ${focus} 证据写入能力画像，并用于下一轮推荐。`
    : `保存回答并完成 AI 评价后，系统会在整轮 AI 复盘时更新你的 ${focus} 能力画像。`;

  return (
    <section className="practice-learning-notice" data-state={evaluated ? 'ready' : 'pending'}>
      <div>
        <span>Agent 学习轨迹</span>
        <strong>{evaluated ? '本题反馈已就绪' : '等待本题 AI 评价'}</strong>
      </div>
      <p>{copy}</p>
    </section>
  );
}
