import { CONTRACT_LIMITS } from '@interview-agent/contracts';
import Link from 'next/link';
import type { FormEvent, KeyboardEvent } from 'react';
import { FieldIcon } from '@/components/FieldIcon';
import { DictationButton } from '@/components/speech/DictationButton';
import { appendTranscript } from '@/lib/speech/speech-dictation';
import type { InterviewController } from '@/hooks/useInterviewController';

type AnswerComposerProps = {
  controller: InterviewController;
};

export function AnswerComposer({ controller }: AnswerComposerProps) {
  const session = controller.state.session;
  if (session?.status === 'report_ready') {
    return (
      <CompletedComposer
        answeredCount={session.turns.filter((turn) => turn.role === 'candidate').length}
        reportLoaded={Boolean(controller.state.report)}
      />
    );
  }
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.submitAnswer();
  };
  return (
    <form className="interview-answer-composer stack compact" onSubmit={submit}>
      <AnswerField controller={controller} hasSession={Boolean(session)} />
      <div className="row-between">
        <button
          className="button"
          type="submit"
          disabled={!controller.canAnswer || !controller.state.draft.trim()}
        >
          {controller.state.busy ? 'AI 面试官正在准备下一题…' : '提交回答并继续'}
          <SubmitArrow busy={controller.state.busy} />
        </button>
        <span className="muted-text small-text" role="status">
          {controller.state.notice}
        </span>
      </div>
    </form>
  );
}

/** Ctrl/⌘ + Enter 视为提交快捷键；单独 Enter 保留换行。 */
export function isAnswerSubmitShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
}): boolean {
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey);
}

function AnswerField({
  controller,
  hasSession,
}: {
  controller: InterviewController;
  hasSession: boolean;
}) {
  const characterCount = controller.state.draft.length.toLocaleString();
  const characterLimit = CONTRACT_LIMITS.longText.toLocaleString();
  const submitShortcut = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isAnswerSubmitShortcut(event)) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };
  return (
    <label className="label" htmlFor="candidate-answer">
      <span className="field-label-title">
        <FieldIcon name="message" />
        我的回答
        <DictationButton
          disabled={!controller.canAnswer}
          onTranscript={(transcript) =>
            controller.setDraft(appendTranscript(controller.state.draft, transcript))
          }
        />
      </span>
      <span className="answer-guidance">
        按「背景、任务、行动、结果（STAR）」组织回答，突出个人贡献与可验证结果。
      </span>
      <textarea
        id="candidate-answer"
        className="textarea answer-box"
        required
        maxLength={CONTRACT_LIMITS.longText}
        disabled={!controller.canAnswer}
        placeholder={composerPlaceholder(hasSession, controller.state.busy)}
        value={controller.state.draft}
        onChange={(event) => controller.setDraft(event.target.value)}
        onKeyDown={submitShortcut}
      />
      <span className="interview-answer-meta">
        <span>{answerMetaLabel(controller.draftRecovered)}</span>
        <span>
          {characterCount} / {characterLimit}
        </span>
      </span>
    </label>
  );
}

function CompletedComposer({
  answeredCount,
  reportLoaded,
}: {
  answeredCount: number;
  reportLoaded: boolean;
}) {
  return (
    <div className="interview-composer-complete" role="status">
      <div>
        <span>本轮已结束</span>
        <strong>{completedHeadline(answeredCount, reportLoaded)}</strong>
        <p>
          {reportLoaded
            ? '评分、薄弱环节和下一步建议已在复盘面板；想再来一轮，从上方「重新开始本轮」发起。'
            : '报告详情读取完成后会出现在「本轮复盘」面板；想再来一轮，从上方「重新开始本轮」发起。'}
        </p>
      </div>
      <div className="interview-composer-complete-actions">
        <a className="button" href="#interview-report">
          查看本轮复盘
        </a>
        <Link className="button secondary" href="/reports">
          前往复盘中心
        </Link>
      </div>
    </div>
  );
}

function completedHeadline(answeredCount: number, reportLoaded: boolean): string {
  const readingSuffix = reportLoaded ? '' : '，正在读取详情…';
  return answeredCount > 0
    ? `共回答 ${answeredCount} 题，复盘已生成${readingSuffix}`
    : `本轮复盘已生成${readingSuffix}`;
}

function composerPlaceholder(hasSession: boolean, busy: boolean): string {
  if (busy) return 'AI 面试官正在准备下一题…';
  if (!hasSession) return '点击上方「开始模拟面试」，第一题会出现在这里。';
  return '写下你的回答，让 AI 面试官继续追问。';
}

function SubmitArrow({ busy }: { busy: boolean }) {
  if (busy) return null;
  return (
    <span className="consumer-action-arrow" aria-hidden="true">
      →
    </span>
  );
}

function answerMetaLabel(draftRecovered: boolean): string {
  const base = draftRecovered
    ? '已恢复当前标签页草稿'
    : '回答结构提示：背景、任务、行动、结果（STAR）';
  return `${base} · Ctrl/⌘ + Enter 提交`;
}
