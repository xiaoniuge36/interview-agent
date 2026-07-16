import type { AccountView, Question } from '@interview-agent/contracts';
import { renderAccountExportCsv, renderQuestionExportCsv } from './admin-export-csv';

describe('admin export CSV rows', () => {
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
