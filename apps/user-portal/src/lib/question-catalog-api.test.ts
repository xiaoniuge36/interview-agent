import { describe, expect, it } from 'vitest';
import { questionCatalogPath } from './question-catalog-api';

describe('题库目录请求路径', () => {
  it('只编码已选择的筛选并支持多个标签', () => {
    expect(
      questionCatalogPath({
        query: 'Agent 工作流',
        category: 'ai_agent',
        tags: ['状态管理', '可靠性'],
        page: 2,
        pageSize: 10,
        sort: 'updated',
      }),
    ).toBe(
      '/question-catalog?query=Agent+%E5%B7%A5%E4%BD%9C%E6%B5%81&category=ai_agent&tags=%E7%8A%B6%E6%80%81%E7%AE%A1%E7%90%86%2C%E5%8F%AF%E9%9D%A0%E6%80%A7&sort=updated&page=2&pageSize=10',
    );
  });
});
