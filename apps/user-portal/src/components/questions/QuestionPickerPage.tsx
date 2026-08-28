'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QuestionRecommendationBanner } from './QuestionRecommendationBanner';
import { useEffect, useMemo, useState } from 'react';
import { shouldShowSelfPicker } from './question-picker-model';
import { SelfPickerWorkspace } from './SelfPickerWorkspace';
import { useQuestionPicker } from './useQuestionPicker';
import {
  learningVerificationReturnHref,
  resolveLearningVerification,
  type LearningVerification,
} from '@/lib/learning/learning-verification';

export function QuestionPickerPage() {
  const searchParams = useSearchParams();
  const verification = useMemo(
    () =>
      resolveLearningVerification({
        source: searchParams.getAll('source'),
        course: searchParams.getAll('course'),
        topic: searchParams.getAll('topic'),
      }),
    [searchParams],
  );
  const picker = useQuestionPicker(verification);
  const [selfPickerOpened, setSelfPickerOpened] = useState(false);
  const workspaceFocused = useLearningVerificationWorkspaceFocus(verification.status === 'ready');
  const agentHandoff = searchParams.get('source') === 'agent';
  const selfPickerVisible = shouldShowSelfPicker({
    recommendationLoading: picker.recommendationLoading,
    selectionCount: picker.selected.length,
    manuallyOpened: selfPickerOpened,
  });
  const openSelfPicker = () => {
    setSelfPickerOpened(true);
    // 工作区默认已展示时，按钮承担“定位到选题区”的职责。
    requestAnimationFrame(() => {
      document
        .getElementById('self-picker-workspace')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  return (
    <div className="question-picker-page">
      <QuestionPickerHeader verification={verification} />
      <QuestionPickerContent
        agentHandoff={agentHandoff}
        picker={picker}
        selfPickerVisible={selfPickerVisible}
        verification={verification}
        workspaceFocused={workspaceFocused}
        onOpenSelfPicker={openSelfPicker}
      />
    </div>
  );
}

function QuestionPickerHeader({ verification }: { verification: LearningVerification }) {
  const learningReady = verification.status === 'ready';
  return (
    <header className="question-picker-header motion-rise">
      <div>
        <Link href="/home">题库大厅</Link>
        <span>{learningReady ? '学习验证' : '训练入口'}</span>
        <h1>{learningReady ? `验证 ${verification.courseTitle}` : '从一轮针对性训练开始'}</h1>
        <p>
          {learningReady
            ? `已筛选 ${verification.topicLabel} 相关的现有单选题，不需要重新设置筛选条件。`
            : 'Agent 会先排出值得练的题；需要时，你也可以自由组合自己的题单。'}
        </p>
      </div>
      <div className="question-picker-rule">
        <strong>{learningReady ? '单选' : '1–10'}</strong>
        <span>{learningReady ? '本课客观题' : '每轮题目数'}</span>
      </div>
    </header>
  );
}

function QuestionPickerContent({
  agentHandoff,
  picker,
  selfPickerVisible,
  verification,
  workspaceFocused,
  onOpenSelfPicker,
}: {
  agentHandoff: boolean;
  picker: ReturnType<typeof useQuestionPicker>;
  selfPickerVisible: boolean;
  verification: LearningVerification;
  workspaceFocused: boolean;
  onOpenSelfPicker: () => void;
}) {
  if (verification.status === 'invalid') return <InvalidLearningVerification />;
  if (verification.status === 'unavailable')
    return <UnavailableLearningVerification {...verification} />;
  if (verification.status === 'ready') {
    if (isMatchedTopicEmpty(picker)) return <UnavailableLearningVerification {...verification} />;
    return (
      <>
        <LearningVerificationContext
          verification={verification}
          workspaceFocused={workspaceFocused}
        />
        <SelfPickerWorkspace picker={picker} />
      </>
    );
  }
  return (
    <>
      <QuestionRecommendationBanner
        agentHandoff={agentHandoff}
        recommendation={picker.recommendation}
        loading={picker.recommendationLoading}
        error={picker.recommendationError}
        starting={picker.recommendationStartingId === picker.recommendation?.id}
        selfPickerExpanded={selfPickerVisible}
        onRetry={picker.reloadRecommendation}
        onStart={(recommendation) => void picker.startRecommendation(recommendation)}
        onOpenSelfPicker={onOpenSelfPicker}
      />
      {selfPickerVisible ? <SelfPickerWorkspace picker={picker} /> : null}
    </>
  );
}

function LearningVerificationContext({
  verification,
  workspaceFocused,
}: {
  verification: Extract<LearningVerification, { status: 'ready' }>;
  workspaceFocused: boolean;
}) {
  return (
    <section
      className="learning-question-context motion-rise"
      aria-labelledby="learning-question-context-heading"
    >
      <div>
        <span>学习路径验证</span>
        <h2 id="learning-question-context-heading">本课客观题验证</h2>
        <p>
          {verification.courseTitle} · {verification.topicLabel} · 现有单选题
        </p>
      </div>
      <div className="learning-question-context-actions">
        <Link className="primary" href="#self-picker-workspace">
          查看 {verification.topicLabel} 客观题
        </Link>
        <Link href={learningVerificationReturnHref(verification.courseSlug)}>返回本课</Link>
      </div>
      {workspaceFocused ? (
        <span className="sr-only" role="status">
          已定位到 {verification.topicLabel} 客观题，可开始筛选和组卷。
        </span>
      ) : null}
    </section>
  );
}

const SELF_PICKER_WORKSPACE_HASH = '#self-picker-workspace';

function useLearningVerificationWorkspaceFocus(enabled: boolean) {
  const [workspaceFocused, setWorkspaceFocused] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const focusWorkspace = () => {
      const focused = focusLearningVerificationWorkspace(
        window.location.hash,
        document.getElementById('self-picker-workspace'),
      );
      setWorkspaceFocused(focused);
    };
    focusWorkspace();
    window.addEventListener('hashchange', focusWorkspace);
    return () => window.removeEventListener('hashchange', focusWorkspace);
  }, [enabled]);
  return workspaceFocused;
}

export function focusLearningVerificationWorkspace(
  hash: string,
  workspace: Pick<HTMLElement, 'focus'> | null,
) {
  if (hash !== SELF_PICKER_WORKSPACE_HASH || workspace === null) return false;
  workspace.focus({ preventScroll: true });
  return true;
}

function UnavailableLearningVerification({
  courseSlug,
  courseTitle,
}: Extract<LearningVerification, { status: 'ready' | 'unavailable' }>) {
  return (
    <section className="learning-question-state" aria-live="polite">
      <span>学习路径验证</span>
      <h2>该主题暂无对应题目</h2>
      <p>{courseTitle} 尚未找到与本课主题精确匹配的现有客观题，因此没有展示全量题库。</p>
      <div>
        <Link className="primary" href={learningVerificationReturnHref(courseSlug)}>
          返回本课
        </Link>
        <Link href="/questions">查看全部题目</Link>
      </div>
    </section>
  );
}

function InvalidLearningVerification() {
  return (
    <section className="learning-question-state" aria-live="polite">
      <span>学习路径验证</span>
      <h2>学习验证链接无效</h2>
      <p>课程或主题参数未通过校验，未加载任何题目。</p>
      <div>
        <Link className="primary" href="/learn">
          返回学习中心
        </Link>
        <Link href="/questions">查看全部题目</Link>
      </div>
    </section>
  );
}

function isMatchedTopicEmpty(picker: ReturnType<typeof useQuestionPicker>) {
  return !picker.loading && !picker.error && picker.catalog?.total === 0;
}
