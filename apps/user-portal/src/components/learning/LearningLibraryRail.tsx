'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import type { LearningDocumentKind, LearningLevel } from '@/lib/learning/learning-document-model';
import {
  documentLinkClickHandler,
  learningDocumentHref,
  learningRailScrollOffset,
} from '@/lib/learning/learning-center-navigation';
import { LibraryProgress } from './LearningLibraryProgress';
import { useLearningProgress } from './LearningProgressProvider';

export { learningRailScrollOffset };

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

const REFERENCE_GROUP_TITLE = '参考资料';

export function LearningLibraryRail({
  documents,
  activeSlug,
  onSelectDocument,
}: {
  documents: LearningNavigationItem[];
  activeSlug: string;
  onSelectDocument: (slug: string) => void;
}) {
  const courses = documents.filter((document) => document.kind === 'course');
  const trackGroups = groupCoursesByTrack(courses);
  const { progress, summary, storageStatus, isCompleted } = useLearningProgress();
  const continueDocument = courses.find((document) => document.slug === progress.lastOpenedSlug);
  const { railRef, activeLinkRef } = useActiveDocumentInView(activeSlug);
  const expansion = useGroupExpansion(documents, activeSlug);
  const groupProps = { activeSlug, onSelectDocument, expansion, activeLinkRef };
  return (
    <aside
      ref={railRef}
      id="learning-path"
      className="learning-library"
      aria-label="学习资料目录"
      tabIndex={-1}
    >
      <LibraryProgress
        trackSummary={trackSummaryLabel(trackGroups)}
        summary={summary}
        continueDocument={continueDocument}
        activeSlug={activeSlug}
        storageStatus={storageStatus}
        onSelectDocument={onSelectDocument}
      />
      {trackGroups.map((group) => (
        <DocumentGroupSection
          key={group.track}
          title={group.track}
          meta={courseGroupMeta(group.courses, isCompleted)}
          documents={group.courses}
          isCompleted={isCompleted}
          {...groupProps}
        />
      ))}
      <ReferenceGroupSection
        references={documents.filter((document) => document.kind === 'reference')}
        isCompleted={() => false}
        {...groupProps}
      />
    </aside>
  );
}

type DocumentGroupSectionProps = {
  title: string;
  meta: string;
  documents: LearningNavigationItem[];
  activeSlug: string;
  isCompleted: (slug: string) => boolean;
  onSelectDocument: (slug: string) => void;
  expansion: GroupExpansion;
  activeLinkRef: Ref<HTMLAnchorElement>;
};

function DocumentGroupSection({
  title,
  meta,
  documents,
  activeSlug,
  isCompleted,
  onSelectDocument,
  expansion,
  activeLinkRef,
}: DocumentGroupSectionProps) {
  return (
    <CollapsibleGroup
      title={title}
      meta={meta}
      expanded={expansion.isGroupExpanded(title)}
      onToggle={() => expansion.toggleGroup(title)}
    >
      {documents.map((document) => (
        <DocumentLink
          key={document.slug}
          document={document}
          active={document.slug === activeSlug}
          completed={isCompleted(document.slug)}
          onSelectDocument={onSelectDocument}
          linkRef={document.slug === activeSlug ? activeLinkRef : undefined}
        />
      ))}
    </CollapsibleGroup>
  );
}

function ReferenceGroupSection({
  references,
  ...groupProps
}: Omit<DocumentGroupSectionProps, 'title' | 'meta' | 'documents'> & {
  references: LearningNavigationItem[];
}) {
  if (!references.length) return null;
  return (
    <DocumentGroupSection
      title={REFERENCE_GROUP_TITLE}
      meta={String(references.length)}
      documents={references}
      {...groupProps}
    />
  );
}

type CourseTrackGroup = {
  track: string;
  courses: LearningNavigationItem[];
};

/** 按 track 分组课程，保持文档全局排序中每个 track 首次出现的先后顺序。 */
export function groupCoursesByTrack(courses: LearningNavigationItem[]): CourseTrackGroup[] {
  const groups = new Map<string, LearningNavigationItem[]>();
  for (const course of courses) {
    const members = groups.get(course.track);
    if (members) {
      members.push(course);
    } else {
      groups.set(course.track, [course]);
    }
  }
  return [...groups.entries()].map(([track, members]) => ({ track, courses: members }));
}

function trackSummaryLabel(trackGroups: CourseTrackGroup[]): string {
  const first = trackGroups[0];
  if (!first) return '完整学习路线';
  if (trackGroups.length === 1) return first.track;
  return `${first.track} 等 ${trackGroups.length} 个方向`;
}

/** 组名到当前文档所在组的映射：参考资料归入固定组名。 */
function groupTitleFor(document: LearningNavigationItem): string {
  return document.kind === 'course' ? document.track : REFERENCE_GROUP_TITLE;
}

type GroupExpansion = {
  isGroupExpanded: (title: string) => boolean;
  toggleGroup: (title: string) => void;
};

/**
 * 分组默认只展开当前文档所在组；用户手动开合的组记入覆盖表，
 * 切换课程时未被覆盖的组跟随“是否包含当前文档”自动开合。
 */
function useGroupExpansion(
  documents: LearningNavigationItem[],
  activeSlug: string,
): GroupExpansion {
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const activeDocument = documents.find((document) => document.slug === activeSlug);
  const activeGroup = activeDocument ? groupTitleFor(activeDocument) : null;
  const isGroupExpanded = (title: string) => overrides[title] ?? title === activeGroup;
  const toggleGroup = (title: string) =>
    setOverrides((previous) => ({ ...previous, [title]: !isGroupExpanded(title) }));
  return { isGroupExpanded, toggleGroup };
}

function courseGroupMeta(
  courses: LearningNavigationItem[],
  isCompleted: (slug: string) => boolean,
): string {
  const completed = courses.filter((course) => isCompleted(course.slug)).length;
  return `${completed}/${courses.length}`;
}

/** 当前文档变化时，把它滚进资料架自身的滚动视口（仅调整 rail 内部滚动，不影响页面）。 */
function useActiveDocumentInView(activeSlug: string) {
  const railRef = useRef<HTMLElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const activeLink = activeLinkRef.current;
    if (!rail || !activeLink || rail.scrollHeight <= rail.clientHeight) return;
    const railRect = rail.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    rail.scrollTo({
      top: learningRailScrollOffset({
        viewportSize: rail.clientHeight,
        contentSize: rail.scrollHeight,
        itemStart: linkRect.top - railRect.top + rail.scrollTop,
        itemSize: linkRect.height,
      }),
    });
  }, [activeSlug]);
  return { railRef, activeLinkRef };
}

function CollapsibleGroup({
  title,
  meta,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  meta: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="learning-document-group">
      <button
        type="button"
        className="learning-group-toggle"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <strong>{title}</strong>
        <span className="learning-group-meta">{meta}</span>
        <span className="learning-group-chevron" aria-hidden="true" />
      </button>
      <nav hidden={!expanded} className="learning-document-list motion-stagger">
        {children}
      </nav>
    </section>
  );
}

function DocumentLink({
  document,
  active,
  completed,
  onSelectDocument,
  linkRef,
}: {
  document: LearningNavigationItem;
  active: boolean;
  completed: boolean;
  onSelectDocument: (slug: string) => void;
  linkRef?: Ref<HTMLAnchorElement> | undefined;
}) {
  const classes = ['learning-document-link', active ? 'active' : '', completed ? 'completed' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <a
      ref={linkRef}
      className={classes}
      href={learningDocumentHref(document.slug)}
      onClick={documentLinkClickHandler(document.slug, onSelectDocument)}
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
    </a>
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
