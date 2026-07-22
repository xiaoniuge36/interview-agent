import {
  BatchCandidatePublishResultSchema,
  BatchCandidateReviewResultSchema,
  ImportReviewContextSchema,
} from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import * as trainingContentApi from './training-content-api';

type ReviewContextRequestFactory = {
  createImportReviewContextRequest(taskId: string): {
    path: string;
    schema: typeof ImportReviewContextSchema;
  };
};

describe('import review context requests', () => {
  it('uses the task-scoped source context endpoint', () => {
    const request = (
      trainingContentApi as unknown as ReviewContextRequestFactory
    ).createImportReviewContextRequest('import-1');

    expect(request).toEqual({
      path: '/admin/imports/import-1/review-context',
      schema: ImportReviewContextSchema,
    });
  });
});

describe('batch candidate review requests', () => {
  it('sends a validated PATCH request to the batch review endpoint', () => {
    const createRequest = (
      trainingContentApi as unknown as {
        createBatchCandidateReviewRequest(input: {
          candidateIds: string[];
          status: 'approved';
          reviewNotes: string | null;
        }): { path: string; schema: typeof BatchCandidateReviewResultSchema; init: RequestInit };
      }
    ).createBatchCandidateReviewRequest;

    expect(
      createRequest({
        candidateIds: ['candidate-1', 'candidate-2'],
        status: 'approved',
        reviewNotes: '内容准确。',
      }),
    ).toEqual({
      path: '/admin/candidates/batch-review',
      schema: BatchCandidateReviewResultSchema,
      init: {
        method: 'PATCH',
        body: JSON.stringify({
          candidateIds: ['candidate-1', 'candidate-2'],
          status: 'approved',
          reviewNotes: '内容准确。',
        }),
      },
    });
  });
});

describe('batch candidate publish requests', () => {
  it('sends a validated POST request to publish all selected candidates', () => {
    const createRequest = (
      trainingContentApi as unknown as {
        createBatchCandidatePublishRequest(input: {
          candidateIds: string[];
          visibility: 'tenant' | 'public';
        }): { path: string; schema: typeof BatchCandidatePublishResultSchema; init: RequestInit };
      }
    ).createBatchCandidatePublishRequest;

    expect(
      createRequest({ candidateIds: ['candidate-1', 'candidate-2'], visibility: 'public' }),
    ).toEqual({
      path: '/admin/candidates/batch-publish',
      schema: BatchCandidatePublishResultSchema,
      init: {
        method: 'POST',
        body: JSON.stringify({
          candidateIds: ['candidate-1', 'candidate-2'],
          visibility: 'public',
        }),
      },
    });
  });
});
