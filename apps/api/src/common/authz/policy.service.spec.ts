import { ForbiddenException } from '@nestjs/common';
import type { Action, Actor, Role } from '@interview-agent/contracts';
import { PolicyService, type ResourceRef } from './policy.service';

const TENANT_ID = 'tenant-a';
const OTHER_TENANT_ID = 'tenant-b';
const USER_ID = 'user-a';
const PROFILE_READ: Action = 'profile:read';
const PROFILE_WRITE: Action = 'profile:write';

const actorFor = (role: Role, scopes: Action[] = [PROFILE_READ, PROFILE_WRITE]): Actor => ({
  id: USER_ID,
  subject: `subject-${role}`,
  tenantId: TENANT_ID,
  role,
  scopes,
});

const ownedResource: ResourceRef = { tenantId: TENANT_ID, ownerId: USER_ID };

DescribePolicy();

function DescribePolicy() {
  describe('PolicyService', () => {
    const policy = new PolicyService();

    it('requires the requested scope before evaluating the resource', () => {
      expect(policy.can(actorFor('user', []), PROFILE_READ, { isPublic: true })).toBe(false);
    });

    it('allows scoped public reads without tenant ownership', () => {
      const resource = { tenantId: OTHER_TENANT_ID, isPublic: true };
      expect(policy.can(actorFor('user'), PROFILE_READ, resource)).toBe(true);
      expect(policy.can(actorFor('user'), PROFILE_WRITE, resource)).toBe(false);
    });

    it('rejects missing and cross-tenant resource identities', () => {
      expect(policy.can(actorFor('user'), PROFILE_READ, { ownerId: USER_ID })).toBe(false);
      expect(policy.can(actorFor('admin'), PROFILE_READ, { tenantId: OTHER_TENANT_ID })).toBe(
        false,
      );
    });

    it.each<Role>(['admin', 'question_reviewer'])(
      'allows %s to access a same-tenant resource',
      (role) => {
        expect(policy.can(actorFor(role), PROFILE_READ, { tenantId: TENANT_ID })).toBe(true);
      },
    );

    it('allows only the owner for normal user access', () => {
      expect(policy.can(actorFor('user'), PROFILE_READ, ownedResource)).toBe(true);
      expect(
        policy.can(actorFor('user'), PROFILE_READ, {
          ...ownedResource,
          ownerId: 'different-user',
        }),
      ).toBe(false);
    });

    it('denies agent runtime access even inside the tenant', () => {
      expect(policy.can(actorFor('agent_runtime'), PROFILE_READ, ownedResource)).toBe(false);
    });

    it('throws a stable forbidden error when asserting denied access', () => {
      expect(() => policy.assert(actorFor('user'), PROFILE_READ, { tenantId: TENANT_ID })).toThrow(
        ForbiddenException,
      );
    });
  });
}
