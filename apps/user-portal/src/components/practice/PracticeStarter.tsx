import { FieldIcon } from '@/components/FieldIcon';

type PracticeStarterProps = {
  title: string;
  roleTitle?: string;
  setTitle: (value: string) => void;
  busy: boolean;
  onStart: () => void;
};

export function PracticeStarter(props: PracticeStarterProps) {
  const ready = Boolean(props.roleTitle);
  return (
    <div className="practice-starter">
      <div className="practice-starter-copy">
        <span className="practice-starter-kicker">定制本轮练习</span>
        <p>系统会围绕目标岗位匹配核心能力题，并在完成后生成可执行的复盘建议。</p>
        <p className={ready ? 'practice-role-context' : 'practice-role-context is-empty'}>
          {ready
            ? `本轮训练岗位：${props.roleTitle}。题目将围绕该岗位的核心能力匹配。`
            : '请先保存目标岗位，系统才能为你匹配对应训练题。'}
        </p>
      </div>
      <label className="label" htmlFor="practice-title">
        <span className="field-label-title">
          <FieldIcon name="sparkle" />
          本轮训练主题
        </span>
        <input
          id="practice-title"
          className="input"
          value={props.title}
          placeholder={ready ? `例如：${props.roleTitle}核心能力强化` : '请先选择目标岗位'}
          onChange={(event) => props.setTitle(event.target.value)}
        />
      </label>
      <button
        className="button practice-start-button"
        type="button"
        onClick={() => void props.onStart()}
        disabled={props.busy || !ready}
      >
        {props.busy ? '创建中…' : '开始专项练习'}
      </button>
    </div>
  );
}
