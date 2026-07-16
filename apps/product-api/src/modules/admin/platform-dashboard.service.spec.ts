import { Test } from '@nestjs/testing';
import type { ProductRequestContext } from '../../common/context/request-context';
import { PolicyService } from '../../common/authz/policy.service';
import { PrismaService } from '../../common/database/prisma.service';
import { PlatformDashboardService } from './platform-dashboard.service';

const context: ProductRequestContext = {
  requestId: 'request-0001',
  traceId: 'trace-0001',
  tenantId: 'system',
  actor: {
    id: 'platform-admin-1',
    subject: 'local:admin',
    tenantId: 'system',
    role: 'platform_admin',
    scopes: ['analytics:read'],
  },
};

const expectedDashboard = {
  period: '7d',
  range: {
    startAt: '2026-07-09T00:00:00.000Z',
    endAt: '2026-07-16T00:00:00.000Z',
  },
  accounts: { total: 8, created: 3, active: 2, disabled: 1, tenants: 5, admin: 2, users: 6 },
  content: { imports: 4, pendingCandidates: 3, publishedQuestions: 7, failedImports: 1 },
  training: { interviews: 6, reports: 4, practiceSubmissions: 5, practiceReports: 3 },
  runtime: {
    runs: 10,
    successRate: 80,
    schemaPassRate: 75,
    averageLatencyMs: 342,
    fallbacks: 1,
    recentFailures: [{ id: 'run-1', status: 'failed' }],
  },
};

describe('PlatformDashboardService', () => {
  it('can be constructed by Nest dependency injection', async () => {
    const { prisma, policy } = dashboardDependencies();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformDashboardService,
        { provide: PrismaService, useValue: prisma },
        { provide: PolicyService, useValue: policy },
      ],
    }).compile();

    expect(moduleRef.get(PlatformDashboardService)).toBeInstanceOf(PlatformDashboardService);
    await moduleRef.close();
  });

  it('aggregates real global records for the requested time window', async () => {
    const { prisma, policy } = dashboardDependencies();
    const service = new PlatformDashboardService(
      prisma as unknown as PrismaService,
      policy as unknown as PolicyService,
    );
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-16T00:00:00.000Z'));
    try {
      await expect(service.dashboard(context, { period: '7d' })).resolves.toMatchObject(
        expectedDashboard,
      );
    } finally {
      jest.useRealTimers();
    }
    expect(policy.assert).toHaveBeenCalledWith(context.actor, 'analytics:read', {
      platform: true,
    });
  });

  it('rejects before querying global data when the platform scope is missing', async () => {
    const { prisma } = dashboardDependencies();
    const policy = {
      assert: jest.fn(() => {
        throw new Error('forbidden');
      }),
    };
    const service = new PlatformDashboardService(
      prisma as unknown as PrismaService,
      policy as unknown as PolicyService,
    );

    await expect(service.dashboard(context, { period: 'today' })).rejects.toThrow('forbidden');
    expect(prisma.user.count).not.toHaveBeenCalled();
  });
});

function dashboardDependencies() {
  const user = {
    count: jest
      .fn()
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(6),
  };
  return {
    prisma: {
      user,
      tenant: { count: jest.fn().mockResolvedValue(5) },
      importTask: { count: jest.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(1) },
      candidateQuestion: { count: jest.fn().mockResolvedValue(3) },
      question: { count: jest.fn().mockResolvedValue(7) },
      interviewSession: { count: jest.fn().mockResolvedValue(6) },
      interviewReport: { count: jest.fn().mockResolvedValue(4) },
      practiceSession: { count: jest.fn().mockResolvedValue(5) },
      practiceReport: { count: jest.fn().mockResolvedValue(3) },
      agentRun: agentRunDependencies(),
    },
    policy: { assert: jest.fn() },
  };
}

function agentRunDependencies() {
  return {
    count: jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1),
    aggregate: jest.fn().mockResolvedValue({ _avg: { latencyMs: 342 } }),
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'run-1',
        sessionId: 'session-1',
        type: 'mock_interview',
        status: 'failed',
        stage: 'warmup',
        traceId: 'trace-000001',
        latencyMs: 500,
        schemaValid: false,
        fallbackUsed: false,
        attemptCount: 1,
        updatedAt: new Date('2026-07-15T00:00:00.000Z'),
      },
    ]),
  };
}
