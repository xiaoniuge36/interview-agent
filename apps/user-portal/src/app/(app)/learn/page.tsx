import type { Metadata } from 'next';
import { LearningCenter } from '@/components/learning/LearningCenter';
import {
  findRequestedLearningDocument,
  loadLearningDocuments,
  selectLearningDocument,
} from '@/lib/learning/learning-documents';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '学习中心 · Interview Agent',
  description: '直接阅读项目参考资料，建立 AI Agent 面试知识地图。',
};

export default async function LearningPage({
  searchParams,
}: {
  searchParams: Promise<{ doc?: string | string[] }>;
}) {
  const [documents, query] = await Promise.all([loadLearningDocuments(), searchParams]);
  const activeDocument = selectLearningDocument(documents, query.doc);
  const requestedDocument = findRequestedLearningDocument(documents, query.doc);
  return (
    <LearningCenter
      documents={documents}
      activeDocument={activeDocument}
      openedCourseSlug={requestedDocument?.kind === 'course' ? requestedDocument.slug : null}
    />
  );
}
