import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ProductRequestContext } from '../context/request-context';
import { PUBLIC_METADATA_KEY } from './public.decorator';
import { ROLES_METADATA_KEY } from './roles.decorator';
import { RolesGuard } from './roles.guard';

const contextFor = (requestContext?: ProductRequestContext) =>
  ({
    getHandler: () => function handler() {},
    getClass: () => class Controller {},
    switchToHttp: () => ({ getRequest: () => ({ context: requestContext }) }),
  }) as unknown as ExecutionContext;

const userContext: ProductRequestContext = {
  requestId: 'request-test-0001',
  traceId: 'trace-test-0001',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['profile:read'],
  },
};

describe('RolesGuard', () => {
  it('allows an explicitly public route', () => {
    const guard = createGuard({ [PUBLIC_METADATA_KEY]: true });
    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('denies a route without an explicit role policy', () => {
    const guard = createGuard({});
    expect(() => guard.canActivate(contextFor(userContext))).toThrow(ForbiddenException);
  });

  it('allows a matching role', () => {
    const guard = createGuard({ [ROLES_METADATA_KEY]: ['user'] });
    expect(guard.canActivate(contextFor(userContext))).toBe(true);
  });

  it('denies a missing or mismatched identity', () => {
    const guard = createGuard({ [ROLES_METADATA_KEY]: ['admin'] });
    expect(() => guard.canActivate(contextFor(userContext))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });
});

function createGuard(metadata: Record<string, unknown>) {
  const reflector = {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}
