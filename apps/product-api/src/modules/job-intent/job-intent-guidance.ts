import type { JobIntent, JobProfile } from '@interview-agent/contracts';
import { roleGuidanceFor } from '../../common/role-guidance';

export function jobIntentGuidance(intent: JobIntent): Omit<JobProfile, 'id' | 'createdAt'> {
  const context = [intent.jdText, intent.companyContext ?? '', intent.communicationText ?? ''].join('\n');
  const guidance = roleGuidanceFor(intent.targetRole, context);
  return {
    tenantId: intent.tenantId,
    jobIntentId: intent.id,
    skillWeights: guidance.skillWeights,
    interviewFocus: guidance.interviewFocus,
    riskSignals: guidance.riskSignals,
    prepAdvice: guidance.prepAdvice,
  };
}
