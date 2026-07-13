import { Injectable } from '@nestjs/common';
import type {
  AgentStreamEvent,
  InterviewCommandResult,
  InterviewReport,
  InterviewSession,
  JobIntent,
  JobProfile,
  ProfileSnapshot,
  Question,
  UserProfile,
} from '@interview-agent/contracts';
import { seedQuestions } from '@interview-agent/contracts';

type InterviewCommandRecord = {
  fingerprint: string;
  result: InterviewCommandResult;
};

type InterviewCommandKeyInput = {
  tenantId: string;
  sessionId: string;
  actorId: string;
  idempotencyKey: string;
};

@Injectable()
export class InMemoryStore {
  readonly profiles = new Map<string, UserProfile>();
  readonly profileSnapshots = new Map<string, ProfileSnapshot>();
  readonly jobIntents = new Map<string, JobIntent>();
  readonly jobProfiles = new Map<string, JobProfile>();
  readonly interviews = new Map<string, InterviewSession>();
  readonly reports = new Map<string, InterviewReport>();
  readonly questions = new Map<string, Question>(
    seedQuestions.map((question) => [question.id, question]),
  );
  readonly interviewEvents = new Map<string, AgentStreamEvent[]>();
  readonly interviewCommands = new Map<string, InterviewCommandRecord>();

  private readonly interviewLocks = new Map<string, Promise<void>>();

  now() {
    return new Date().toISOString();
  }

  scopedKey(tenantId: string, resourceId: string) {
    return `${tenantId}:${resourceId}`;
  }

  userProfileId(tenantId: string, userId: string) {
    return `profile_${tenantId}_${userId}`;
  }

  interviewCommandKey(input: InterviewCommandKeyInput) {
    return [input.tenantId, input.sessionId, input.actorId, input.idempotencyKey].join(':');
  }

  async withInterviewLock<T>(sessionId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.interviewLocks.get(sessionId) ?? Promise.resolve();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const current = previous.then(() => gate);
    this.interviewLocks.set(sessionId, current);
    await previous;

    try {
      return await operation();
    } finally {
      release();
      if (this.interviewLocks.get(sessionId) === current) {
        this.interviewLocks.delete(sessionId);
      }
    }
  }
}
