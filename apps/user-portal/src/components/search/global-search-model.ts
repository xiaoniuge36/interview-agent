import type { QuestionCatalogResponse } from '@interview-agent/contracts';

const STATIC_RECOMMENDATION_LIMIT = 3;
const RESULT_TAG_LIMIT = 2;

export type GlobalSearchKind = 'question' | 'topic' | 'page';

export type GlobalSearchItem = {
  id: string;
  kind: GlobalSearchKind;
  label: string;
  description: string;
  href: string;
  badge: string;
  glyph: string;
  tags?: string[];
};

type SearchableQuestion = Pick<
  QuestionCatalogResponse['items'][number],
  'id' | 'title' | 'stem' | 'type' | 'difficulty' | 'tags'
>;

export const QUESTION_TOPICS = [
  {
    category: 'ai_agent',
    glyph: 'AI',
    title: 'AI Agent 与大模型',
    description: 'Agent 架构、RAG、模型评估与工具调用',
    keywords: ['智能体', '提示词', '工作流'],
  },
  {
    category: 'engineering',
    glyph: '</>',
    title: '研发工程',
    description: '系统设计、工程质量、稳定性与项目深挖',
    keywords: ['后端', '前端', '架构'],
  },
  {
    category: 'data',
    glyph: '∑',
    title: '数据与算法',
    description: '数据分析、算法思路、指标体系与实验设计',
    keywords: ['SQL', '机器学习', '数据结构'],
  },
  {
    category: 'product_design',
    glyph: '◇',
    title: '产品与设计',
    description: '需求判断、方案权衡、用户体验与作品复盘',
    keywords: ['产品经理', '交互', '设计'],
  },
  {
    category: 'growth_operations',
    glyph: '↗',
    title: '增长与运营',
    description: '增长策略、内容运营、渠道分析与活动复盘',
    keywords: ['运营', '增长', '内容'],
  },
  {
    category: 'business_delivery',
    glyph: '◎',
    title: '商业与交付',
    description: '客户沟通、项目交付、销售判断与经营分析',
    keywords: ['销售', '客户成功', '项目管理'],
  },
  {
    category: 'generic',
    glyph: '✦',
    title: '通用表达',
    description: '自我介绍、行为面试、协作冲突与职业规划',
    keywords: ['沟通', '软技能', 'STAR'],
  },
] as const;

export const SEARCH_PAGES = [
  {
    id: 'questions',
    glyph: '⌘',
    title: '自主刷题',
    description: '筛选并组合自己的练习题单',
    href: '/questions',
    keywords: ['题库', '选题', '练习'],
  },
  {
    id: 'profile',
    glyph: '◎',
    title: '我的 Agent',
    description: '更新个人档案、目标岗位与经历证据',
    href: '/profile',
    keywords: ['个人档案', '岗位', '推荐'],
  },
  {
    id: 'interview',
    glyph: '◉',
    title: '面试工作室',
    description: '开始真实追问和 AI 模拟面试',
    href: '/interview',
    keywords: ['模拟面试', '追问', '语音'],
  },
  {
    id: 'practice',
    glyph: '▷',
    title: '练习空间',
    description: '继续当前题单并逐题作答',
    href: '/practice',
    keywords: ['继续练习', '作答', '题单'],
  },
  {
    id: 'reports',
    glyph: '↗',
    title: '复盘中心',
    description: '查看面试报告、成长记录与建议',
    href: '/reports',
    keywords: ['报告', '复盘', '能力'],
  },
  {
    id: 'settings',
    glyph: '⚙',
    title: '设置中心',
    description: '管理模型连接、账户与外观偏好',
    href: '/settings',
    keywords: ['API Key', '模型配置', '主题'],
  },
] as const;

export function filterStaticSearchItems(query: string): GlobalSearchItem[] {
  const topics = QUESTION_TOPICS.map(topicSearchItem);
  const pages = SEARCH_PAGES.map(pageSearchItem);
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [
      ...topics.slice(0, STATIC_RECOMMENDATION_LIMIT),
      ...pages.slice(0, STATIC_RECOMMENDATION_LIMIT),
    ];
  }
  return [...topics, ...pages].filter((item) => matches(item, normalizedQuery));
}

export function questionSearchItems(questions: SearchableQuestion[]): GlobalSearchItem[] {
  return questions.map((question) => ({
    id: `question:${question.id}`,
    kind: 'question',
    label: question.title,
    description: question.stem,
    href: `/questions?query=${encodeURIComponent(question.title)}`,
    badge: `${TYPE_LABELS[question.type]} · ${DIFFICULTY_LABELS[question.difficulty]}`,
    glyph: '?',
    tags: question.tags.slice(0, RESULT_TAG_LIMIT),
  }));
}

export function moveSearchIndex(current: number, total: number, direction: 'next' | 'previous') {
  if (total <= 0) return -1;
  const offset = direction === 'next' ? 1 : -1;
  return (current + offset + total) % total;
}

export function isGlobalSearchShortcut(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}) {
  return event.key.toLocaleLowerCase() === 'k' && (event.ctrlKey || event.metaKey) && !event.altKey;
}

function topicSearchItem(topic: (typeof QUESTION_TOPICS)[number]): GlobalSearchItem {
  return {
    id: `topic:${topic.category}`,
    kind: 'topic',
    label: topic.title,
    description: topic.description,
    href: `/questions?category=${topic.category}`,
    badge: '题库专题',
    glyph: topic.glyph,
    tags: [...topic.keywords],
  };
}

function pageSearchItem(page: (typeof SEARCH_PAGES)[number]): GlobalSearchItem {
  return {
    id: `page:${page.id}`,
    kind: 'page',
    label: page.title,
    description: page.description,
    href: page.href,
    badge: '功能入口',
    glyph: page.glyph,
    tags: [...page.keywords],
  };
}

function matches(item: GlobalSearchItem, query: string) {
  return [item.label, item.description, ...(item.tags ?? [])]
    .map(normalize)
    .some((value) => value.includes(query));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase('zh-CN');
}

const TYPE_LABELS = {
  short_answer: '简答',
  coding: '编程',
  system_design: '系统设计',
  project_deep_dive: '项目深挖',
  behavioral: '行为面试',
} as const;

const DIFFICULTY_LABELS = {
  intro: '入门',
  easy: '基础',
  medium: '进阶',
  hard: '挑战',
  expert: '专家',
} as const;
