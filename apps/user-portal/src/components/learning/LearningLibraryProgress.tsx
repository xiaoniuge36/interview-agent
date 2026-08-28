'use client';

import {
  documentLinkClickHandler,
  learningDocumentHref,
} from '@/lib/learning/learning-center-navigation';
import type { LearningNavigationItem } from './LearningLibraryRail';
import type { LearningStorageStatus } from './LearningProgressProvider';

export function LibraryProgress({
  trackSummary,
  summary,
  continueDocument,
  activeSlug,
  storageStatus,
  onSelectDocument,
}: {
  trackSummary: string;
  summary: { completed: number; total: number; percentage: number };
  continueDocument: LearningNavigationItem | undefined;
  activeSlug: string;
  storageStatus: LearningStorageStatus;
  onSelectDocument: (slug: string) => void;
}) {
  return (
    <div className="learning-library-heading">
      <span>你的学习路线</span>
      <h2>资料架</h2>
      <strong>完整学习路线</strong>
      <p>{trackSummary}</p>
      <div className="learning-path-progress-copy">
        <span>{`${summary.completed} / ${summary.total} 课`}</span>
        <span>{summary.percentage}%</span>
      </div>
      <div className="learning-path-progress-meter" aria-label={`课程进度 ${summary.percentage}%`}>
        <span style={{ width: `${summary.percentage}%` }} />
      </div>
      <LearningStorageNotice status={storageStatus} />
      {continueDocument && continueDocument.slug !== activeSlug ? (
        <a
          className="learning-continue-link"
          href={learningDocumentHref(continueDocument.slug)}
          onClick={documentLinkClickHandler(continueDocument.slug, onSelectDocument)}
        >
          继续上次学习：{continueDocument.title}
        </a>
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
