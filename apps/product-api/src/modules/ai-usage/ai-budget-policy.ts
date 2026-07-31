import { Injectable } from '@nestjs/common';
import type { AiBudgetDecision, AiInvocationOperation } from '@interview-agent/contracts';

export type AiOperationBudget = {
  maxInputCharacters: number;
  maxOutputTokens: number;
  maxAttempts: number;
  timeoutMs: number;
};

type BudgetInput = {
  operation: AiInvocationOperation;
  inputCharacters?: number;
  requestedOutputTokens?: number;
  attempt?: number;
};

type AllowedBudgetDecision = AiBudgetDecision & {
  allowed: true;
  budget: AiOperationBudget;
};
type DeniedBudgetDecision = Extract<AiBudgetDecision, { allowed: false }>;

const BUDGETS: Record<AiInvocationOperation, AiOperationBudget> = {
  model_connection_test: {
    maxInputCharacters: 512,
    maxOutputTokens: 128,
    maxAttempts: 1,
    timeoutMs: 10_000,
  },
  embedding: {
    maxInputCharacters: 8_000,
    maxOutputTokens: 0,
    maxAttempts: 2,
    timeoutMs: 15_000,
  },
  practice_evaluation: {
    maxInputCharacters: 12_000,
    maxOutputTokens: 1_400,
    maxAttempts: 2,
    timeoutMs: 30_000,
  },
  practice_report: {
    maxInputCharacters: 12_000,
    maxOutputTokens: 1_400,
    maxAttempts: 2,
    timeoutMs: 30_000,
  },
  interview_next: {
    maxInputCharacters: 16_000,
    maxOutputTokens: 1_200,
    maxAttempts: 2,
    timeoutMs: 30_000,
  },
  admin_page_agent: {
    maxInputCharacters: 24_000,
    maxOutputTokens: 1_800,
    maxAttempts: 2,
    timeoutMs: 30_000,
  },
  user_page_agent: {
    maxInputCharacters: 24_000,
    maxOutputTokens: 1_800,
    maxAttempts: 2,
    timeoutMs: 30_000,
  },
};

@Injectable()
export class AiBudgetPolicy {
  check(input: BudgetInput): AllowedBudgetDecision | DeniedBudgetDecision {
    const budget = BUDGETS[input.operation];
    if (exhausted(input, budget)) {
      return { allowed: false, code: 'AI_BUDGET_EXHAUSTED' };
    }
    return { allowed: true, code: null, budget };
  }
}

export function modelRequestLimits(budget?: AiOperationBudget) {
  return budget ? { maxOutputTokens: budget.maxOutputTokens, timeoutMs: budget.timeoutMs } : {};
}

function exhausted(input: BudgetInput, budget: AiOperationBudget) {
  return (
    (input.inputCharacters ?? 0) > budget.maxInputCharacters ||
    (input.requestedOutputTokens ?? 0) > budget.maxOutputTokens ||
    (input.attempt ?? 1) > budget.maxAttempts
  );
}
