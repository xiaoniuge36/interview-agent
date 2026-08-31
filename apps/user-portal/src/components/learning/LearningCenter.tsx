'use client';

import Link from 'next/link';
import { useMemo, type CSSProperties } from 'react';
import {
  findLearningReviewHeading,
  TERTIARY_HEADING_DEPTH,
  type LearningDocument,
} from '@/lib/learning/learning-document-model';
import { useLearningDocumentSwitch } from '@/lib/learning/learning-center-navigation';
import { LearningArticle } from './LearningArticle';
import { LearningCourseActions } from './LearningCourseActions';
import { LearningLibraryRail, type LearningNavigationItem } from './LearningLibraryRail';
import { LearningProgressProvider } from './LearningProgressProvider';

type LearningCenterProps = {
  documents: LearningDocument[];
  activeDocument: LearningDocument | null;
  openedCourseSlug: string | null;
};

const READING_DESK_RISE_DELAY = { '--rise-delay': '100ms' } as CSSProperties;
const OUTLINE_RISE_DELAY = { '--rise-delay': '180ms' } as CSSProperties;

export function LearningCenter({
  documents,
  activeDocument: initialDocument,
  openedCourseSlug: initialOpenedCourseSlug,
}: LearningCenterProps) {
  if (!initialDocument) return <LearningEmptyState />;
  return (
    <LearningCenterSwitch
      documents={documents}
      initialSlug={initialDocument.slug}
      initialOpenedCourseSlug={initialOpenedCourseSlug}
    />
  );
}

function LearningCenterSwitch({
  documents,
  initialSlug,
  initialOpenedCourseSlug,
}: {
  documents: LearningDocument[];
  initialSlug: string;
  initialOpenedCourseSlug: string | null;
}) {
  const { activeDocument, openedCourseSlug, selectDocument } = useLearningDocumentSwitch(
    documents,
    initialSlug,
    initialOpenedCourseSlug,
  );
  // 切课只是本组件的状态更新；memo 保持引用稳定，避免进度 Provider 的同步 effect 反复触发。
  const navigationItems = useMemo(() => documents.map(toNavigationItem), [documents]);
  const courses = useMemo(
    () => navigationItems.filter((document) => document.kind === 'course'),
    [navigationItems],
  );
  const courseSlugs = useMemo(() => courses.map((course) => course.slug), [courses]);
  if (!activeDocument) return <LearningEmptyState />;
  return (
    <LearningProgressProvider courseSlugs={courseSlugs} openedCourseSlug={openedCourseSlug}>
      <div className="learning-center">
        <LearningCenterHero />
        <LearningLibraryRail
          documents={navigationItems}
          activeSlug={activeDocument.slug}
          onSelectDocument={selectDocument}
        />
        {/* key 触发内容区 remount，复用 motion-rise 作为切课过渡动画。 */}
        <ReadingDesk
          key={activeDocument.slug}
          activeDocument={activeDocument}
          courses={courses}
          onSelectDocument={selectDocument}
        />
        <DocumentOutline document={activeDocument} />
      </div>
    </LearningProgressProvider>
  );
}

function ReadingDesk({
  activeDocument,
  courses,
  onSelectDocument,
}: {
  activeDocument: LearningDocument;
  courses: LearningNavigationItem[];
  onSelectDocument: (slug: string) => void;
}) {
  const { activeCourse, nextCourse, reviewHeading } = deriveCourseContext(courses, activeDocument);
  return (
    <section className="learning-reading-desk motion-rise" style={READING_DESK_RISE_DELAY}>
      <DocumentHeader document={activeDocument} />
      <CourseBrief document={activeDocument} />
      <LearningArticle document={activeDocument} />
      {activeCourse ? (
        <LearningCourseActions
          course={activeCourse}
          nextCourse={nextCourse}
          reviewHeading={reviewHeading}
          onSelectDocument={onSelectDocument}
        />
      ) : null}
    </section>
  );
}

function deriveCourseContext(courses: LearningNavigationItem[], activeDocument: LearningDocument) {
  const activeCourse =
    activeDocument.kind === 'course'
      ? (courses.find((document) => document.slug === activeDocument.slug) ?? null)
      : null;
  const nextCourse = activeCourse ? (courses[courses.indexOf(activeCourse) + 1] ?? null) : null;
  const reviewHeading = activeCourse ? findLearningReviewHeading(activeDocument.headings) : null;
  return { activeCourse, nextCourse, reviewHeading };
}

function LearningCenterHero() {
  return (
    <header className="learning-center-hero motion-rise">
      <span>学习中心</span>
      <h1>把知识，练成面试时说得清的能力。</h1>
      <p>沿着完整路线阅读、动手和自测；每一课都能回到对应题目继续验证。</p>
    </header>
  );
}

function DocumentHeader({ document }: { document: LearningDocument }) {
  return (
    <header className="learning-document-header">
      <div>
        <span className="learning-reading-label">正在学习</span>
        <p>{document.sourceName}</p>
      </div>
      <div className="learning-document-meta" aria-label="文档信息">
        {document.date ? <time dateTime={document.date}>{document.date}</time> : null}
        {document.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </header>
  );
}

function CourseBrief({ document }: { document: LearningDocument }) {
  if (document.kind !== 'course') return null;
  return (
    <section className="learning-course-brief">
      <span>课程 {String(document.order ?? '').padStart(2, '0')}</span>
      <strong>{document.summary ?? '完成本课知识、实验和自测。'}</strong>
      <small>
        {levelLabel(document.level)} · {document.durationMinutes ?? '自定'} 分钟
      </small>
    </section>
  );
}

function DocumentOutline({ document }: { document: LearningDocument }) {
  return (
    <aside
      className="learning-outline motion-rise"
      style={OUTLINE_RISE_DELAY}
      aria-label="当前文档章节"
    >
      <strong>本课目录</strong>
      {document.headings.length ? (
        <nav>
          {document.headings.map((heading) => (
            <a
              key={heading.id}
              className={heading.depth === TERTIARY_HEADING_DEPTH ? 'nested' : undefined}
              href={`#${heading.id}`}
            >
              {heading.title}
            </a>
          ))}
        </nav>
      ) : (
        <p>这篇资料暂时没有章节标题。</p>
      )}
    </aside>
  );
}

function LearningEmptyState() {
  return (
    <section className="learning-empty-state">
      <span aria-hidden="true">◇</span>
      <h1>课程内容准备中</h1>
      <p>学习内容上线后会出现在这里。上线前可以先去题库刷题，或用一场模拟面试保持手感。</p>
      <div className="learning-empty-actions">
        <Link className="button" href="/questions">
          去刷题
        </Link>
        <Link className="button secondary" href="/interview">
          去模拟面试
        </Link>
      </div>
    </section>
  );
}

function toNavigationItem(document: LearningDocument): LearningNavigationItem {
  return {
    slug: document.slug,
    sourceName: document.sourceName,
    title: document.title,
    kind: document.kind,
    track: document.track,
    order: document.order,
    level: document.level,
    durationMinutes: document.durationMinutes,
  };
}

function levelLabel(level: LearningDocument['level']): string {
  if (level === 'intermediate') return '进阶';
  if (level === 'advanced') return '高阶';
  return '基础';
}
