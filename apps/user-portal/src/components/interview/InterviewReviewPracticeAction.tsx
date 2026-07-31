'use client';

import type { InterviewReport } from '@interview-agent/contracts';
import { interviewReviewFocus } from './interview-review-practice';

type Props = {
  report: InterviewReport;
  sessionId: string;
  starting: boolean;
  onStart: (sessionId: string) => void;
};

export function InterviewReviewPracticeAction(props: Props) {
  const focus = interviewReviewFocus(props.report);
  if (!focus.length) return null;
  return (
    <section className="interview-review-action" aria-label="面试专项回练">
      <ReviewFocusSummary focus={focus} />
      <ul>
        {focus.map((item) => (
          <li key={item.stage}>
            <span>{item.label}</span>
            <strong>{item.score} 分</strong>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={props.starting}
        onClick={() => props.onStart(props.sessionId)}
      >
        {props.starting ? '正在组题…' : '开始专项回练'}
      </button>
    </section>
  );
}

function ReviewFocusSummary({ focus }: { focus: ReturnType<typeof interviewReviewFocus> }) {
  const primaryFocus = focus[0]!;
  return (
    <>
      <div>
        <span>下一步 · 专项回练</span>
        <strong>面试专项回练</strong>
        <p>将围绕本次面试中得分较低的阶段组题，不会复制你的面试回答。</p>
      </div>
      <div className="interview-review-evidence-meta" aria-label="推荐依据">
        <span>推荐依据 · 本次面试低分阶段</span>
        <small>最多 5 题 · 约 20 分钟</small>
      </div>
      <div className="interview-review-primary-focus">
        <span>首要复练 · {primaryFocus.label}</span>
        <strong>{primaryFocus.summary}</strong>
        {primaryFocus.evidence[0] ? <small>评分依据：{primaryFocus.evidence[0]}</small> : null}
      </div>
    </>
  );
}
