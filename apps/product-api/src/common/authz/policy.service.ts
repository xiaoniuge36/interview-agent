import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Action, Actor } from '@interview-agent/contracts';

export type ResourceRef = {
  ownerId?: string;
  tenantId?: string;
  isPublic?: boolean;
  platform?: boolean;
};

const isPublicRead = (action: Action, resource: ResourceRef) =>
  resource.isPublic === true && action.endsWith(':read');

const belongsToTenant = (actor: Actor, resource: ResourceRef) =>
  resource.tenantId !== undefined && resource.tenantId === actor.tenantId;

const hasElevatedAccess = (actor: Actor) =>
  actor.role === 'admin' || actor.role === 'question_reviewer' || actor.role === 'platform_admin';

const ownsResource = (actor: Actor, resource: ResourceRef) =>
  resource.ownerId !== undefined && resource.ownerId === actor.id;

@Injectable()
export class PolicyService {
  can(actor: Actor, action: Action, resource: ResourceRef = {}) {
    if (!actor.scopes.includes(action)) return false;
    if (resource.platform === true) return actor.role === 'platform_admin';
    if (isPublicRead(action, resource)) return true;
    if (!belongsToTenant(actor, resource)) return false;
    if (hasElevatedAccess(actor)) return true;
    if (actor.role === 'agent_runtime') return false;
    return ownsResource(actor, resource);
  }

  assert(actor: Actor, action: Action, resource: ResourceRef = {}) {
    if (this.can(actor, action, resource)) return;
    throw new ForbiddenException({
      code: 'PERMISSION_DENIED',
      message: `缺少权限：${action}`,
    });
  }
}
