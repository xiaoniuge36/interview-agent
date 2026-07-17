import type { AccountView, ImportTask, Question } from '@interview-agent/contracts';
import {
  renderAccountExportCsv,
  renderImportTaskExportCsv,
  renderQuestionExportCsv,
} from './admin-export-csv';

describe('admin export CSV rows', () => {
  describeImportTaskExport();

  it('renders question export fields in the table order', () => {
    const result = renderQuestionExportCsv([
      {
        id: 'question-1',
        tenantId: 'tenant-1',
        visibility: 'tenant',
        title: '依赖注入',
        stem: '说明依赖注入的作用。',
        type: 'short_answer',
        difficulty: 'medium',
        tags: ['architecture'],
        answer: '通过构造函数注入依赖。',
        rubric: [],
        sourceRefs: [],
        status: 'published',
      } satisfies Question,
    ]);

    expect(result).toBe(
      '\uFEFF题目 ID,题目,题型,难度,可见范围,状态\r\nquestion-1,依赖注入,short_answer,medium,tenant,published',
    );
  });

  it('renders safe account governance columns without credentials', () => {
    const result = renderAccountExportCsv([
      {
        id: 'user-1',
        subject: 'local:user-1',
        name: 'Avery Lin',
        email: 'avery@example.com',
        role: 'user',
        status: 'active',
        kind: 'user',
        authSource: 'local',
        tenant: { id: 'tenant-1', name: 'Avery 的个人空间', slug: 'member-avery' },
        lastSignedInAt: '2026-07-15T00:00:00.000Z',
        createdAt: '2026-07-14T00:00:00.000Z',
      } satisfies AccountView,
    ]);

    expect(result).toBe(
      '\uFEFF账号 ID,姓名,邮箱,角色,状态,认证来源,租户,最近登录,创建时间\r\nuser-1,Avery Lin,avery@example.com,user,active,local,Avery 的个人空间,2026-07-15T00:00:00.000Z,2026-07-14T00:00:00.000Z',
    );
  });
});

function describeImportTaskExport() {
  it('includes the candidate review outcome breakdown for every import task', () => {
    const result = renderImportTaskExportCsv([
      {
        id: 'import-1',
        tenantId: 'tenant-1',
        assetId: 'asset-1',
        title: 'Java 面试资料.md',
        status: 'review',
        candidateCount: 6,
        candidateReviewProgress: {
          pending: 2,
          needsEdit: 1,
          approved: 1,
          rejected: 1,
          published: 1,
        },
        failureReason: null,
        createdAt: '2026-07-17T00:00:00.000Z',
        updatedAt: '2026-07-17T01:00:00.000Z',
      } as ImportTask,
    ]);

    expect(result).toBe(
      '\uFEFF任务 ID,任务名称,状态,候选题数,待审核,需修改,已通过,已驳回,已发布,创建时间,更新时间,失败原因\r\nimport-1,Java 面试资料.md,review,6,2,1,1,1,1,2026-07-17T00:00:00.000Z,2026-07-17T01:00:00.000Z,',
    );
  });
}
