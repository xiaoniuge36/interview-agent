import { NotFoundException } from '@nestjs/common';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PolicyService } from '../../common/authz/policy.service';
import type { PrismaService } from '../../common/database/prisma.service';
import type { InterviewEventBus } from './realtime/interview-event.bus';
import { InterviewQueryService } from './interview-query.service';

const context = (overrides: Partial<ProductRequestContext> = {}): ProductRequestContext => ({
  requestId: 'request-test-0001',
  traceId: 'trace-test-0001',
  tenantId: 'tenant-a',
  actor: {
    id: 'user-a',
    subject: 'subject-a',
    tenantId: 'tenant-a',
    role: 'user',
    scopes: ['interview:read', 'interview:stream'],
  },
  ...overrides,
});

function setup() {
  const prisma = {
    interviewSession: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(),
    },
    interviewReport: { findUnique: jest.fn() },
  };
  const events = { stream: jest.fn() };
  const service = new InterviewQueryService(
    prisma as unknown as PrismaService,
    new PolicyService(),
    events as unknown as InterviewEventBus,
  );
  return { service, prisma, events };
}

describe('InterviewQueryService authorization', () => {
  it('always scopes list queries by tenant and owner', async () => {
    const { service, prisma } = setup();

    await expect(service.list(context())).resolves.toEqual([]);
    expect(prisma.interviewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-a', userId: 'user-a' } }),
    );
  });

  it('does not expose a session from another tenant or owner', async () => {
    const { service, prisma } = setup();
    prisma.interviewSession.findFirst.mockResolvedValue(null);

    await expect(service.get(context(), 'session-b')).rejects.toThrow(NotFoundException);
    expect(prisma.interviewSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-a', userId: 'user-a', id: 'session-b' },
      }),
    );
  });

  it('checks session ownership before loading a report', async () => {
    const { service, prisma } = setup();
    prisma.interviewSession.findFirst.mockResolvedValue(null);

    await expect(service.report(context(), 'session-b')).rejects.toThrow(NotFoundException);
    expect(prisma.interviewReport.findUnique).not.toHaveBeenCalled();
  });

  it('checks session ownership before opening an event stream', async () => {
    const { service, prisma, events } = setup();
    prisma.interviewSession.findFirst.mockResolvedValue(null);

    await expect(
      service.stream({ context: context(), sessionId: 'session-b', afterSequence: 0 }),
    ).rejects.toThrow(NotFoundException);
    expect(events.stream).not.toHaveBeenCalled();
  });

  it('rejects a forged context whose actor belongs to another tenant', async () => {
    const { service, prisma } = setup();
    const forged = context();
    forged.actor = { ...forged.actor, tenantId: 'tenant-b' };

    await expect(service.list(forged)).rejects.toThrow();
    expect(prisma.interviewSession.findMany).not.toHaveBeenCalled();
  });
});
