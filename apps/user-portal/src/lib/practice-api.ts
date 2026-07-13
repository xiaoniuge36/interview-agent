import {
  CreatePracticeSessionSchema,
  MasteryProfileListSchema,
  PracticeReportSchema,
  PracticeSessionSchema,
  SubmitPracticeAnswerSchema,
  type CreatePracticeSession,
  type MasteryProfile,
  type PracticeReport,
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
