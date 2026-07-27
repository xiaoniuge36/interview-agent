import type { PracticeSession } from '@interview-agent/contracts';
import type { PlayerBusy } from './practice-player-actions';

type PracticeFeedbackLauncherProps = {
  item: PracticeSession['items'][number];
  draft: string;
  busy: PlayerBusy;
  onOpen: () => void;
};

export function PracticeFeedbackLauncher(props: PracticeFeedbackLauncherProps) {
  const answerCurrent =
    Boolean(props.item.answer) && props.draft.trim() === props.item.answer?.trim();
  const evaluated = Boolean(props.item.evaluation);
  const title = evaluated ? '本题评价已生成' : '解析与 AI 评价';
  const hint = answerCurrent ? '回答已保存，可以进入' : '先保存回答，再进入反馈步骤';

  return (
    <aside className="practice-feedback-launcher" aria-label="解析与 AI 评价入口">
      <header>
        <span>下一步 · STEP 02</span>
        <strong>{title}</strong>
        <p>标准解析、评分点和 AI 反馈将在宽版阅读区展示。</p>
      </header>
      <ol aria-label="反馈步骤内容">
        <li>
          <span>01</span>
          <div>
            <strong>对照标准解析</strong>
            <small>检查回答是否覆盖关键判断</small>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>生成 AI 评分</strong>
            <small>获得缺失要点和针对性追问</small>
          </div>
        </li>
      </ol>
      <div className="practice-feedback-launcher-action">
        <span data-ready={answerCurrent}>{hint}</span>
        <button
          type="button"
          disabled={!answerCurrent || props.busy !== null}
          onClick={props.onOpen}
        >
          {evaluated ? '查看本题评价' : '进入宽版解析'}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
}
