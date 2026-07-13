import type { NextFunction, Request, Response } from 'express';
import type { AuthIdentityService } from '../authn/auth-identity.service';
import { developmentActor } from './request-context';
import type { ProductRequest } from './product-request';
import { ContextMiddleware } from './context.middleware';

const request = (originalUrl: string, method = 'GET') =>
  ({ method, originalUrl, headers: {} }) as Request;
const response = () => ({ setHeader: jest.fn() }) as unknown as Response;

describe('ContextMiddleware public boundary', () => {
  it.each([
    '/api/health?probe=liveness',
    '/api/health/live',
    '/api/health/ready',
    '/api/auth/login',
    '/api/auth/register',
  ])('keeps the exact health endpoint public: %s', async (path) => {
    const identities = { resolve: jest.fn() };
    const middleware = new ContextMiddleware(identities as unknown as AuthIdentityService);
    const next = jest.fn() as NextFunction;

    await middleware.use(request(path), response(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(identities.resolve).not.toHaveBeenCalled();
  });

  it('does not treat health-like paths as public', async () => {
    const actor = developmentActor('user');
    const identities = { resolve: jest.fn(async () => actor) };
    const middleware = new ContextMiddleware(identities as unknown as AuthIdentityService);
    const req = request('/api/health/details') as ProductRequest;
    const res = response();
    const next = jest.fn() as NextFunction;

    await middleware.use(req, res, next);

    expect(identities.resolve).toHaveBeenCalledTimes(1);
    expect(req.context.actor).toEqual(actor);
    expect(req.context.tenantId).toBe(actor.tenantId);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('x-trace-id', expect.any(String));
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards authentication failures', async () => {
    const failure = new Error('invalid token');
    const identities = { resolve: jest.fn(async () => Promise.reject(failure)) };
    const middleware = new ContextMiddleware(identities as unknown as AuthIdentityService);
    const next = jest.fn() as NextFunction;

    await middleware.use(request('/api/profile'), response(), next);

    expect(next).toHaveBeenCalledWith(failure);
  });
});
