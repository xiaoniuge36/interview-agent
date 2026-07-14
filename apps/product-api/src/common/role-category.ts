export type RoleCategory =
  | 'engineering'
  | 'data'
  | 'ai_agent'
  | 'product_design'
  | 'growth_operations'
  | 'business_delivery'
  | 'generic';

const CATEGORY_KEYWORDS: Record<Exclude<RoleCategory, 'generic'>, string[]> = {
  ai_agent: ['ai agent', 'agent', '智能体', '大模型应用', 'llm', 'rag', 'langchain', 'langgraph'],
  data: ['数据分析', '数据工程', '算法', '机器学习', '数据科学', '数仓', 'bi', '推荐'],
  product_design: ['产品', 'ux', 'ui', '用户体验', '交互设计', '视觉设计', '用户研究'],
  growth_operations: ['运营', '增长', '商业化', '内容', '投放', '社区', '电商'],
  business_delivery: [
    '商务',
    'bd',
    '销售',
    '客户成功',
    '品牌',
    '市场',
    '实施',
    '交付',
    '解决方案',
    '售前',
    '项目经理',
    '客户支持',
    '商业策略',
  ],
  engineering: [
    '前端',
    '后端',
    '全栈',
    '数据库',
    '测试',
    'sre',
    'devops',
    '开发',
    '工程师',
    '运维',
  ],
};

const CATEGORY_ORDER: Array<Exclude<RoleCategory, 'generic'>> = [
  'ai_agent',
  'data',
  'product_design',
  'growth_operations',
  'business_delivery',
  'engineering',
];

export function classifyRole(roleTitle: string): RoleCategory {
  const normalized = roleTitle.trim().toLowerCase();
  const category = CATEGORY_ORDER.find((item) => hasAny(normalized, CATEGORY_KEYWORDS[item]));
  return category ?? 'generic';
}

export function roleFromInterviewTitle(title: string): string {
  const role = title.replace(/模拟面试$/, '').trim();
  return role || '目标岗位';
}

function hasAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}
