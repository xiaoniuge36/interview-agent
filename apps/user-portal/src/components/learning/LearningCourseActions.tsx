'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LearningHeading } from '@/lib/learning/learning-document-model';
import type { LocalLearningVerification } from '@/lib/learning/learning-progress';
import {
  isLearningVerificationReturnHash,
  learningVerificationActionLabel,
  learningVerificationHref,
  LEARNING_COURSE_ACTIONS_ANCHOR,
} from '@/lib/learning/learning-verification';
import {
  documentLinkClickHandler,
  learningDocumentHref,
} from '@/lib/learning/learning-center-navigation';
import type { LearningNavigationItem } from './LearningLibraryRail';
import { useLearningProgress } from './LearningProgressProvider';

const ISO_DATE_PREFIX_LENGTH = 10;

export function LearningCourseActions({
  course,
  nextCourse,
  reviewHeading,
  onSelectDocument,
}: {
  course: LearningNavigationItem;
  nextCourse: LearningNavigationItem | null;
  reviewHeading: LearningHeading | null;
  onSelectDocument: (slug: string) => void;
}) {
  const progress = useLearningProgress();
  const { completed, copy, verification } = learningCourseActionState(progress, course, nextCourse);
  return (
    <section
      id={LEARNING_COURSE_ACTIONS_ANCHOR}
      className="learning-course-actions"
      aria-label="课程学习操作"
      tabIndex={-1}
    >
      <div>
        <span>{copy.status}</span>
        <strong>{copy.heading}</strong>
      </div>
      {verification ? <LearningVerificationRecord verification={verification} /> : null}
      <div className="learning-course-action-buttons">
        {reviewHeading ? (
          <Link href={`#${reviewHeading.id}`}>Review · {reviewHeading.title}</Link>
        ) : null}
        <ManualCompletionToggle
          completed={completed}
          onToggle={() => progress.toggleCompleted(course.slug)}
        />
        <Link className={copy.emphasizeMap ? 'primary' : undefined} href="#learning-path">
          {copy.mapLabel}
        </Link>
        <Link href={learningVerificationHref(course.slug)}>
          {verification
            ? `再次验证 · ${verification.topic}`
            : learningVerificationActionLabel(course.slug)}
        </Link>
        {nextCourse ? (
          <NextCourseLink nextCourse={nextCourse} onSelectDocument={onSelectDocument} />
        ) : null}
      </div>
      <LearningVerificationReturnNotice />
    </section>
  );
}

function NextCourseLink({
  nextCourse,
  onSelectDocument,
}: {
  nextCourse: LearningNavigationItem;
  onSelectDocument: (slug: string) => void;
}) {
  return (
    <a
      className="primary"
      href={learningDocumentHref(nextCourse.slug)}
      onClick={documentLinkClickHandler(nextCourse.slug, onSelectDocument)}
    >
      下一课 · {nextCourse.title}
    </a>
  );
}

function ManualCompletionToggle({
  completed,
  onToggle,
}: {
  completed: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" aria-pressed={completed} onClick={onToggle}>
      {completed ? '取消完成标记' : '标记本课已完成'}
    </button>
  );
}

function LearningVerificationReturnNotice() {
  const returnedFromVerification = useLearningVerificationReturnFocus();
  return returnedFromVerification ? <p role="status">已返回本课，可继续查看学习资料。</p> : null;
}

function learningCourseActionState(
  progress: ReturnType<typeof useLearningProgress>,
  course: LearningNavigationItem,
  nextCourse: LearningNavigationItem | null,
) {
  const completed = progress.isCompleted(course.slug);
  const pathCompleted =
    progress.summary.total > 0 && progress.summary.completed === progress.summary.total;
  return {
    completed,
    verification: progress.latestVerificationFor(course.slug),
    copy: learningCourseActionCopy(completed, Boolean(nextCourse), pathCompleted),
  };
}

function LearningVerificationRecord({ verification }: { verification: LocalLearningVerification }) {
  const score =
    verification.score === null ? '已完成一次主题练习' : `得分 ${Math.round(verification.score)}`;
  return (
    <div className="learning-verification-record" role="status">
      <strong>最近练习/验证记录</strong>
      <p>
        {`${verification.topic} · ${score} · 已答 ${verification.answerCount} 题 · `}
        <time dateTime={verification.recordedAt}>
          {verification.recordedAt.slice(0, ISO_DATE_PREFIX_LENGTH)}
        </time>
      </p>
      <small>已随账号进度同步；可继续复看本课，或再次验证本主题。</small>
    </div>
  );
}

function useLearningVerificationReturnFocus() {
  const [returnedFromVerification, setReturnedFromVerification] = useState(false);
  useEffect(() => {
    const update = () =>
      setReturnedFromVerification(isLearningVerificationReturnHash(window.location.hash));
    update();
    window.addEventListener('hashchange', update);
    window.addEventListener('popstate', update);
    return () => {
      window.removeEventListener('hashchange', update);
      window.removeEventListener('popstate', update);
    };
  }, []);
  useEffect(() => {
    if (!returnedFromVerification) return;
    const target = document.getElementById(LEARNING_COURSE_ACTIONS_ANCHOR);
    target?.scrollIntoView({ block: 'start' });
    target?.focus({ preventScroll: true });
  }, [returnedFromVerification]);
  return returnedFromVerification;
}

export function learningCourseActionCopy(
  completed: boolean,
  hasNextCourse: boolean,
  pathCompleted: boolean,
) {
  if (!completed) {
    return {
      status: '完成实验与自测后',
      heading: '把理解转化为可验证的产出',
      mapLabel: '返回学习地图',
      emphasizeMap: false,
    };
  }
  if (hasNextCourse) {
    return {
      status: '本课已完成',
      heading: '继续巩固或进入下一课',
      mapLabel: '返回学习地图',
      emphasizeMap: false,
    };
  }
  if (pathCompleted) {
    return {
      status: '完整路线已完成',
      heading: '回到学习地图复盘成果，或进入题库继续验证',
      mapLabel: '完成路线 · 返回学习地图',
      emphasizeMap: true,
    };
  }
  return {
    status: '本课已完成',
    heading: '回到学习地图补齐未完成课程，或进入题库继续验证',
    mapLabel: '返回学习地图 · 补齐课程',
    emphasizeMap: true,
  };
}
