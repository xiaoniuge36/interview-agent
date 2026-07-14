import { classifyRole } from './role-category';

describe('classifyRole', () => {
  it.each([
    ['前端开发工程师', 'engineering'],
    ['数据库工程师', 'engineering'],
    ['数据分析师', 'data'],
    ['AI Agent 应用工程师', 'ai_agent'],
    ['产品经理', 'product_design'],
    ['增长运营', 'growth_operations'],
    ['商业化运营', 'growth_operations'],
    ['品牌市场经理', 'business_delivery'],
    ['销售经理', 'business_delivery'],
    ['客户成功经理', 'business_delivery'],
    ['技术项目经理', 'business_delivery'],
    ['实施顾问', 'business_delivery'],
    ['解决方案架构师', 'business_delivery'],
  ])('将 %s 分类为 %s', (roleTitle, category) => {
    expect(classifyRole(roleTitle)).toBe(category);
  });
});
