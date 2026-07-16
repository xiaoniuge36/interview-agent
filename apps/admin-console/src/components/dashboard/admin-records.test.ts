import type {
  AgentRunView,
  AuditLogView,
  CandidateReview,
  ModelProfile,
  Question,
} from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import * as adminRecords from './admin-records';
import {
  filterAuditLogs,
  filterCandidates,
  filterModels,
  filterQuestions,
  filterRuns,
  paginationPages,
  paginateRecords,
  resolveCandidateSelection,
} from './admin-records';

const QUESTION = {
  id: 'question-1',
  tenantId: 'tenant-1',
  visibility: 'tenant',
  title: '设计高并发支付系统',
  stem: '请说明核心链路。',
  type: 'system_design',
  difficulty: 'hard',
  tags: ['支付', '架构'],
  answer: '说明幂等、事务与降级。',
  rubric: [],
  sourceRefs: ['source-1'],
  status: 'published',
} satisfies Question;

const CANDIDATE = {
  id: 'candidate-1',
  importTaskId: null,
  sourceImport: null,
  title: 'React 状态管理',
  status: 'pending',
  qualityScore: 86,
  tags: ['React'],
  sourceRefs: ['source-2'],
  createdAt: '2026-07-14T00:00:00.000Z',
} satisfies CandidateReview;

const MODEL = {
  id: 'model-1',
  provider: 'OpenAI',
  model: 'gpt-5',
  purpose: 'Interview',
  budget: 'high',
  schemaMode: true,
  status: 'active',
  updatedAt: '2026-07-14T00:00:00.000Z',
} satisfies ModelProfile;

const RUN = {
  id: 'run-1',
  sessionId: 'session-1',
  type: 'mock_interview',
  status: 'failed',
  stage: 'evaluation',
  latencyMs: 1200,
  schemaValid: false,
  fallbackUsed: false,
  attemptCount: 1,
  traceId: 'TRACE-ABC',
  updatedAt: '2026-07-14T00:00:00.000Z',
} satisfies AgentRunView;

const AUDIT_LOG = {
  id: 'log-1',
  action: 'candidate:publish',
  resourceType: 'Question',
  resourceId: 'question-1',
  actorId: 'admin-1',
  actorRole: 'admin',
  traceId: 'TRACE-ABC',
  result: 'success',
  createdAt: '2026-07-14T00:00:00.000Z',
} satisfies AuditLogView;

describe('admin record filtering', () => {
  it('按标题或标签检索题库，并叠加状态与难度筛选', () => {
    expect(
      filterQuestions([QUESTION], {
        query: ' 支付 ',
        status: 'published',
        difficulty: 'hard',
      }),
    ).toEqual([QUESTION]);
    expect(
      filterQuestions([QUESTION], { query: 'React', status: 'all', difficulty: 'all' }),
    ).toEqual([]);
  });

  it('按候选题状态和关键字筛选审核队列', () => {
    expect(filterCandidates([CANDIDATE], { query: 'react', status: 'pending' })).toEqual([
      CANDIDATE,
    ]);
    expect(filterCandidates([CANDIDATE], { query: '', status: 'approved' })).toEqual([]);
  });

  it('为模型、运行记录与审计日志提供统一的大小写不敏感检索', () => {
    expect(filterModels([MODEL], { query: 'openai', status: 'active' })).toEqual([MODEL]);
    expect(filterRuns([RUN], { query: 'trace-abc', status: 'failed' })).toEqual([RUN]);
    expect(filterAuditLogs([AUDIT_LOG], { query: 'PUBLISH', result: 'success' })).toEqual([
      AUDIT_LOG,
    ]);
  });
});

describe('admin record pagination', () => {
  it('返回稳定页数，并在筛选结果减少时夹紧当前页', () => {
    expect(paginateRecords([1, 2, 3, 4, 5], 3, 2)).toEqual({
      items: [5],
      page: 3,
      pageCount: 3,
      total: 5,
    });
    expect(paginateRecords([1, 2], 4, 2)).toEqual({
      items: [1, 2],
      page: 1,
      pageCount: 1,
      total: 2,
    });
  });
});

describe('candidate review selection', () => {
  it('优先打开显式指定的候选题，并在记录刷新后保留有效选择', () => {
    const second = { ...CANDIDATE, id: 'candidate-2', title: 'Node.js 事件循环' };
    expect(resolveCandidateSelection([CANDIDATE, second], null, second.id)).toBe(second.id);
    expect(resolveCandidateSelection([CANDIDATE, second], CANDIDATE.id, null)).toBe(CANDIDATE.id);
  });

  it('无有效选择时返回 null', () => {
    expect(resolveCandidateSelection([CANDIDATE], 'missing', null)).toBeNull();
    expect(resolveCandidateSelection([CANDIDATE], null, null)).toBeNull();
    expect(resolveCandidateSelection([], 'missing', null)).toBeNull();
  });
});

describe('candidate batch review selection', () => {
  it('allows a batch only when every selected candidate has the same source', () => {
    const resolveBatch = (adminRecords as unknown as {
      resolveCandidateBatchReview(candidates: CandidateReview[]): unknown;
    }).resolveCandidateBatchReview;
    const sameSource = [
      { ...CANDIDATE, id: 'candidate-1', importTaskId: 'import-1', sourceImport: { id: 'import-1', title: 'Java 面试资料.md' } },
      { ...CANDIDATE, id: 'candidate-2', importTaskId: 'import-1', sourceImport: { id: 'import-1', title: 'Java 面试资料.md' } },
    ];
    const mixedSources = [
      ...sameSource,
      { ...CANDIDATE, id: 'candidate-3', importTaskId: 'import-2', sourceImport: { id: 'import-2', title: 'Go 面试资料.md' } },
    ];

    expect(resolveBatch(sameSource)).toEqual({
      candidateIds: ['candidate-1', 'candidate-2'],
      canSubmit: true,
      sourceImport: { id: 'import-1', title: 'Java 面试资料.md' },
    });
    expect(resolveBatch(mixedSources)).toMatchObject({ canSubmit: false });
  });
});

describe('admin pagination page range', () => {
  it('在首页、中间页和末页保持至多七个数字页码', () => {
    expect(paginationPages(1, 12)).toEqual([1, 2, 3, 4, 5, 6, 'ellipsis', 12]);
    expect(paginationPages(6, 12)).toEqual([1, 'ellipsis', 4, 5, 6, 7, 8, 'ellipsis', 12]);
    expect(paginationPages(12, 12)).toEqual([1, 'ellipsis', 7, 8, 9, 10, 11, 12]);
  });
});
