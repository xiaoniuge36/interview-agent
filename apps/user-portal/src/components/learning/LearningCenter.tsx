import type { CSSProperties } from 'react';
import {
  findLearningReviewHeading,
  TERTIARY_HEADING_DEPTH,
  type LearningDocument,
} from '@/lib/learning/learning-documents';
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
  activeDocument,
  openedCourseSlug,
}: LearningCenterProps) {
  if (!activeDocument) return <LearningEmptyState />;
  const navigationItems = documents.map(toNavigationItem);
  const courses = navigationItems.filter((document) => document.kind === 'course');
  const activeCourse =
    activeDocument.kind === 'course'
      ? (courses.find((document) => document.slug === activeDocument.slug) ?? null)
      : null;
  const nextCourse = activeCourse ? (courses[courses.indexOf(activeCourse) + 1] ?? null) : null;
  const reviewHeading = activeCourse ? findLearningReviewHeading(activeDocument.headings) : null;
  return (
    <LearningProgressProvider
      courseSlugs={courses.map((course) => course.slug)}
      openedCourseSlug={openedCourseSlug}
    >
      <div className="learning-center">
        <LearningCenterHero />
        <LearningLibraryRail documents={navigationItems} activeSlug={activeDocument.slug} />
        <section className="learning-reading-desk motion-rise" style={READING_DESK_RISE_DELAY}>
          <DocumentHeader document={activeDocument} />
          <CourseBrief document={activeDocument} />
          <LearningArticle document={activeDocument} />
          {activeCourse ? (
            <LearningCourseActions
              course={activeCourse}
              nextCourse={nextCourse}
              reviewHeading={reviewHeading}
            />
          ) : null}
        </section>
        <DocumentOutline document={activeDocument} />
      </div>
    </LearningProgressProvider>
  );
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
      <p>LEARNING LIBRARY</p>
      <h1>还没有可阅读的资料</h1>
      <p>
        将 Markdown 文档放入仓库的 <code>参考资料</code> 目录，刷新后就会出现在这里。
      </p>
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
