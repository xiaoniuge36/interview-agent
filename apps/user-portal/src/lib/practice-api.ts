import {
  CreatePracticeSessionSchema,
  MasteryProfileListSchema,
  PracticeReportSchema,
  PracticeItemFeedbackSchema,
  PracticeItemSolutionSchema,
  PracticeSessionSchema,
  SubmitPracticeAnswerSchema,
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
  type PracticeItemFeedback,
  type PracticeItemSolution,
  type PracticeSession,
  type SubmitPracticeAnswer,
} from '@interview-agent/contracts';
import { apiRequest } from './api';

export function createPracticeSession(input: CreatePracticeSession): Promise<PracticeSession> {
  return apiRequest({
    path: '/practices',
    schema: PracticeSessionSchema,
    init: { method: 'POST', body: JSON.stringify(CreatePracticeSessionSchema.parse(input)) },
  });
}

export function getPracticeSession(sessionId: string): Promise<PracticeSession> {
  return apiRequest({ path: `/practices/${sessionId}`, schema: PracticeSessionSchema });
}

export function submitPracticeAnswer(
  sessionId: string,
  itemId: string,
  input: SubmitPracticeAnswer,
): Promise<PracticeSession> {
  return apiRequest({
    path: `/practices/${sessionId}/answers/${itemId}`,
    schema: PracticeSessionSchema,
    init: { method: 'POST', body: JSON.stringify(SubmitPracticeAnswerSchema.parse(input)) },
  });
}

export function evaluatePracticeItem(
  sessionId: string,
  itemId: string,
): Promise<PracticeItemFeedback> {
  return apiRequest({
    path: `/practices/${sessionId}/items/${itemId}/evaluate`,
    schema: PracticeItemFeedbackSchema,
    init: { method: 'POST', body: '{}' },
  });
}

export function getPracticeItemSolution(
  sessionId: string,
  itemId: string,
): Promise<PracticeItemSolution> {
  return apiRequest({
    path: `/practices/${sessionId}/items/${itemId}/solution`,
    schema: PracticeItemSolutionSchema,
  });
}

export function completePracticeSelfStudy(sessionId: string): Promise<PracticeSession> {
  return apiRequest({
    path: `/practices/${sessionId}/complete-self-study`,
    schema: PracticeSessionSchema,
    init: { method: 'POST', body: '{}' },
  });
}

export function submitPracticeSession(sessionId: string): Promise<PracticeReport> {
  return apiRequest({
    path: `/practices/${sessionId}/submit`,
    schema: PracticeReportSchema,
    init: { method: 'POST', body: '{}' },
  });
}

export function getPracticeReport(sessionId: string): Promise<PracticeReport> {
  return apiRequest({ path: `/practices/${sessionId}/report`, schema: PracticeReportSchema });
}

export function getMasteryProfiles(): Promise<MasteryProfile[]> {
  return apiRequest({ path: '/mastery', schema: MasteryProfileListSchema });
}
