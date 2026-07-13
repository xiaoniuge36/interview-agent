import type { Action, Actor, Role } from '@interview-agent/contracts';

export type ProductRequestContext = {
  requestId: string;
  traceId: string;
  tenantId: string;
  actor: Actor;
};

const roleScopes: Record<Role, Action[]> = {
  user: [
    'profile:read',
    'profile:write',
    'job_intent:read',
    'job_intent:write',
    'interview:create',
    'interview:advance',
    'interview:read',
    'interview:answer',
    'interview:stream',
    'practice:create',
    'practice:read',
    'practice:answer',
    'practice:submit',
    'mastery:read',
  ],
  question_reviewer: ['question:read', 'question:write', 'candidate:review', 'content:import'],
  admin: [
    'question:read',
    'question:write',
    'candidate:review',
    'content:import',
    'practice:create',
    'practice:read',
    'practice:answer',
    'practice:submit',
    'mastery:read',
    'model:manage',
    'audit:read',
  ],
  support: ['support:access'],
  agent_runtime: [],
};

export type TrustedIdentity = {
  id: string;
  subject: string;
  role: Role;
  tenantId: string;
};

export const actorFromIdentity = (identity: TrustedIdentity): Actor => ({
  ...identity,
  scopes: [...roleScopes[identity.role]],
});

export const developmentActor = (kind: 'user' | 'admin'): Actor =>
  actorFromIdentity({
    id: kind === 'admin' ? 'demo-admin' : 'demo-user',
    subject: kind === 'admin' ? 'demo-admin' : 'demo-user',
    role: kind,
    tenantId: 'demo',
  });
