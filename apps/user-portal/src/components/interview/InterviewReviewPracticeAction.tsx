'use client';

import { useState } from 'react';
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
  const [confirmed, setConfirmed] = useState(false);
  if (!focus.length) return null;
  return (
    <section className="interview-review-action" aria-label="面试专项回练">
      <div>
        <span>下一步 · 专项回练</span>
        <strong>面试专项回练</strong>
        <p>将围绕本次面试中得分较低的阶段组题，不会复制你的面试回答。</p>
      </div>
      <div className="interview-review-evidence-meta" aria-label="推荐依据">
        <span>推荐依据 · 本次面试低分阶段</span>
        <small>最多 5 题 · 约 20 分钟</small>
      </div>
      <ul>
        {focus.map((item) => (
          <li key={item.stage}>
            <span>{item.label}</span>
            <strong>{item.score} 分</strong>
          </li>
        ))}
      </ul>
      {confirmed ? (
        <div className="interview-review-confirmation">
          <p>确认后会创建最多 5 道题的专项练习，并进入答题页。</p>
          <div>
            <button type="button" onClick={() => setConfirmed(false)}>
              返回
            </button>
            <button
              type="button"
              disabled={props.starting}
              onClick={() => props.onStart(props.sessionId)}
            >
              {props.starting ? '正在组题…' : '开始专项回练'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmed(true)}>
          查看并确认回练
        </button>
      )}
    </section>
  );
}
