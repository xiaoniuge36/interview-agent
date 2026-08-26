import type { Prisma } from '@prisma/client';
import {
  ImportTaskSchema,
  ImportTaskStatusSchema,
  type CandidateReviewProgress,
  type ImportTask,
} from '@interview-agent/contracts';
import type { MarkdownImportExtractor } from './markdown-import-extractor';

export const IMPORT_TASK_ORDER: Prisma.ImportTaskOrderByWithRelationInput[] = [
  { updatedAt: 'desc' },
  { id: 'desc' },
];

export function mapImportTask(
  record: {
    id: string;
    tenantId: string;
    assetId: string;
    title: string;
    status: string;
    candidateCount: number;
    failureReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  candidateReviewProgress: CandidateReviewProgress = emptyCandidateReviewProgress(),
): ImportTask {
  return ImportTaskSchema.parse({
    ...record,
    status: ImportTaskStatusSchema.parse(record.status),
    candidateReviewProgress,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

export function emptyCandidateReviewProgress(): CandidateReviewProgress {
  return { pending: 0, needsEdit: 0, approved: 0, rejected: 0, published: 0 };
}

export function initialReviewProgress(
  candidates: ReturnType<MarkdownImportExtractor['extract']>,
): CandidateReviewProgress {
  return { ...emptyCandidateReviewProgress(), pending: candidates.length };
}

export function addCandidateReviewStatusCount(
  progress: CandidateReviewProgress,
  status: string,
  count: number,
) {
  if (status === 'pending') progress.pending += count;
  if (status === 'needs_edit') progress.needsEdit += count;
  if (status === 'approved') progress.approved += count;
  if (status === 'rejected') progress.rejected += count;
}

export function sourceChunkSequence(metadata: Prisma.JsonValue, fallback: number): number {
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') return fallback;
  const sequence = (metadata as Record<string, unknown>).sequence;
  return typeof sequence === 'number' && Number.isInteger(sequence) && sequence > 0
    ? sequence
    : fallback;
}
