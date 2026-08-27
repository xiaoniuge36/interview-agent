'use client';

import { useEffect, useRef, type Ref } from 'react';
import type { LearningDocumentKind, LearningLevel } from '@/lib/learning/learning-documents';
import { PushNavigationLink } from '@/components/navigation/PushNavigationLink';
import { useLearningProgress, type LearningStorageStatus } from './LearningProgressProvider';

export type LearningNavigationItem = {
  slug: string;
  sourceName: string;
  title: string;
  kind: LearningDocumentKind;
  track: string;
  order: number | null;
  level: LearningLevel;
  durationMinutes: number | null;
};

export function LearningLibraryRail({
  documents,
  activeSlug,
}: {
  documents: LearningNavigationItem[];
  activeSlug: string;
}) {
  const courses = documents.filter((document) => document.kind === 'course');
  const references = documents.filter((document) => document.kind === 'reference');
  const { progress, summary, storageStatus, isCompleted } = useLearningProgress();
  const continueDocument = courses.find((document) => document.slug === progress.lastOpenedSlug);
  return (
    <aside id="learning-path" className="learning-library" aria-label="学习资料目录" tabIndex={-1}>
      <LibraryProgress
        track={courses[0]?.track ?? '完整学习路线'}
        summary={summary}
        continueDocument={continueDocument}
        activeSlug={activeSlug}
        storageStatus={storageStatus}
      />
      <CoursePathGroup courses={courses} activeSlug={activeSlug} isCompleted={isCompleted} />
      {references.length ? (
        <DocumentGroup title="参考资料" count={references.length}>
          {references.map((document) => (
            <DocumentLink
              key={document.slug}
              document={document}
              active={document.slug === activeSlug}
              completed={false}
            />
          ))}
        </DocumentGroup>
      ) : null}
    </aside>
  );
}

function LibraryProgress({
  track,
  summary,
  continueDocument,
  activeSlug,
  storageStatus,
}: {
  track: string;
  summary: { completed: number; total: number; percentage: number };
  continueDocument: LearningNavigationItem | undefined;
  activeSlug: string;
  storageStatus: LearningStorageStatus;
}) {
  return (
    <div className="learning-library-heading">
      <span>你的学习路线</span>
      <h2>资料架</h2>
      <strong>完整学习路线</strong>
      <p>{track}</p>
      <div className="learning-path-progress-copy">
        <span>{`${summary.completed} / ${summary.total} 课`}</span>
        <span>{summary.percentage}%</span>
      </div>
      <div className="learning-path-progress-meter" aria-label={`课程进度 ${summary.percentage}%`}>
        <span style={{ width: `${summary.percentage}%` }} />
      </div>
      <LearningStorageNotice status={storageStatus} />
      {continueDocument && continueDocument.slug !== activeSlug ? (
        <PushNavigationLink
          className="learning-continue-link"
          href={documentHref(continueDocument.slug)}
        >
          继续上次学习：{continueDocument.title}
        </PushNavigationLink>
      ) : null}
    </div>
  );
}

export function LearningStorageNotice({ status }: { status: LearningStorageStatus }) {
  if (status !== 'memory-only') return null;
  return (
    <p className="learning-storage-notice" role="status">
      进度暂时无法保存。本次访问仍可继续；请允许本站存储，否则刷新后会重置。
    </p>
  );
}

function CoursePathGroup({
  courses,
  activeSlug,
  isCompleted,
}: {
  courses: LearningNavigationItem[];
  activeSlug: string;
  isCompleted: (slug: string) => boolean;
}) {
  const courseRailRef = useRef<HTMLElement>(null);
  const activeCourseRef = useRef<HTMLAnchorElement>(null);
  useActiveCourseRail(activeSlug, courseRailRef, activeCourseRef);
  return (
    <DocumentGroup title="课程路径" count={courses.length} navigationRef={courseRailRef}>
      {courses.map((document) => (
        <DocumentLink
          key={document.slug}
          document={document}
          active={document.slug === activeSlug}
          completed={isCompleted(document.slug)}
          linkRef={document.slug === activeSlug ? activeCourseRef : undefined}
        />
      ))}
    </DocumentGroup>
  );
}

function useActiveCourseRail(
  activeSlug: string,
  courseRailRef: React.RefObject<HTMLElement | null>,
  activeCourseRef: React.RefObject<HTMLAnchorElement | null>,
) {
  useEffect(() => {
    const rail = courseRailRef.current;
    const activeCourse = activeCourseRef.current;
    if (!rail || !activeCourse || rail.scrollWidth <= rail.clientWidth) return;
    const railRect = rail.getBoundingClientRect();
    const activeRect = activeCourse.getBoundingClientRect();
    rail.scrollTo({
      left: learningRailScrollLeft({
        viewportWidth: rail.clientWidth,
        contentWidth: rail.scrollWidth,
        itemLeft: activeRect.left - railRect.left + rail.scrollLeft,
        itemWidth: activeRect.width,
      }),
    });
  }, [activeCourseRef, activeSlug, courseRailRef]);
}

function DocumentGroup({
  title,
  count,
  children,
  navigationRef,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  navigationRef?: Ref<HTMLElement>;
}) {
  return (
    <section className="learning-document-group">
      <header>
        <strong>{title}</strong>
        <span>{count}</span>
      </header>
      <nav ref={navigationRef} className="learning-document-list motion-stagger">
        {children}
      </nav>
    </section>
  );
}

function DocumentLink({
  document,
  active,
  completed,
  linkRef,
}: {
  document: LearningNavigationItem;
  active: boolean;
  completed: boolean;
  linkRef?: Ref<HTMLAnchorElement> | undefined;
}) {
  const classes = ['learning-document-link', active ? 'active' : '', completed ? 'completed' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <PushNavigationLink
      ref={linkRef}
      className={classes}
      href={documentHref(document.slug)}
      aria-current={active ? 'page' : undefined}
    >
      <span className="learning-document-spine" aria-hidden="true" />
      {document.kind === 'course' ? (
        <span
          className={completed ? 'learning-course-index motion-pop' : 'learning-course-index'}
          aria-hidden="true"
        >
          {completed ? '✓' : String(document.order ?? '').padStart(2, '0')}
        </span>
      ) : null}
      <span>
        <strong>{document.title}</strong>
        <small>{documentMeta(document)}</small>
      </span>
    </PushNavigationLink>
  );
}

function documentMeta(document: LearningNavigationItem): string {
  if (document.kind === 'reference') return document.sourceName;
  const duration = document.durationMinutes ? `${document.durationMinutes} 分钟` : '自主掌握';
  return `${levelLabel(document.level)} · ${duration}`;
}

function levelLabel(level: LearningLevel): string {
  if (level === 'intermediate') return '进阶';
  if (level === 'advanced') return '高阶';
  if (level === 'reference') return '参考';
  return '基础';
}

function documentHref(slug: string): string {
  return `/learn?doc=${encodeURIComponent(slug)}`;
}

export function learningRailScrollLeft({
  viewportWidth,
  contentWidth,
  itemLeft,
  itemWidth,
}: {
  viewportWidth: number;
  contentWidth: number;
  itemLeft: number;
  itemWidth: number;
}): number {
  const maximum = Math.max(contentWidth - viewportWidth, 0);
  const centered = itemLeft - (viewportWidth - itemWidth) / 2;
  return Math.min(Math.max(centered, 0), maximum);
}
