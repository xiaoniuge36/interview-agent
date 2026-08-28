import { expect, it } from 'vitest';
import { loadLearningDocuments } from './learning-documents';
import {
  learningPracticeHref,
  learningVerificationHref,
  learningVerificationReturnHref,
  mappedLearningCourseSlugs,
  resolveLearningVerification,
} from './learning-verification';

it('uses the documented ReAct course slug and exact existing question tag', () => {
  const href = learningVerificationHref('学习路线-01-agent基础与上下文工程');
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: ['学习路线-01-agent基础与上下文工程'],
    topic: ['react'],
  });

  expect(href).toBe(
    '/questions?source=learn&course=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B&topic=react',
  );
  expect(verification).toMatchObject({
    status: 'ready',
    courseSlug: '学习路线-01-agent基础与上下文工程',
    topicLabel: 'ReAct',
    query: { tags: ['ReAct'], type: 'single_choice' },
  });
});

it('carries only the verified learning course and topic into a practice session URL', () => {
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: ['学习路线-01-agent基础与上下文工程'],
    topic: ['react'],
  });

  expect(learningPracticeHref('session/one', verification)).toBe(
    '/practice?session=session%2Fone&origin=learn&course=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B&topic=react',
  );
  expect(learningPracticeHref('session/one', { status: 'inactive' })).toBe(
    '/practice?session=session%2Fone',
  );
});

it.each([
  ['学习路线-02-tool-calling与mcp', 'tool-calling', 'Tool Calling'],
  ['学习路线-03-rag与agentic-rag', 'rag', 'RAG'],
  ['学习路线-04-memory-planning与multi-agent', 'memory', '记忆与编排'],
  ['学习路线-05-evals可观测可靠性与安全', 'evals', 'Agent 评估'],
  ['学习路线-06-生产架构成本部署与持续改进', 'production', '生产可靠性'],
  ['学习路线-07-面试表达手撕代码与毕业项目', 'expression', '面试表达'],
  ['学习路线-08-computer-use与gui-agent', 'computer-use', 'Computer Use'],
  ['学习路线-09-编码agent与长任务harness', 'harness', 'Agent Harness'],
  ['学习路线-10-agent互操作协议与生态', 'protocols', '协议与互操作'],
  ['学习路线-11-agent强化学习与后训练', 'agent-rl', 'Agent RL'],
  ['学习路线-20-star行为面试与项目深挖', 'star', 'STAR'],
  ['学习路线-21-简历优化与自我介绍', 'resume', '简历优化'],
  ['学习路线-22-结构化表达与金字塔原理', 'structured-expression', '结构化表达'],
  ['学习路线-23-反问谈薪与offer决策', 'offer', 'Offer 决策'],
  ['学习路线-30-后端工程面试基础', 'backend-basics', '数据库'],
  ['学习路线-31-数据分析面试指标与实验', 'stats-thinking', '统计思维'],
  ['学习路线-32-产品经理面试方法论', 'product-method', '产品方法论'],
  ['学习路线-33-增长与运营面试模型与案例', 'growth-model', '增长模型'],
])('maps %s to an exact published question tag', (course, topic, tag) => {
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: [course],
    topic: [topic],
  });

  expect(verification).toMatchObject({ status: 'ready', query: { tags: [tag] } });
});

it('keeps a known course with no exact tag mapping in an explicit unavailable state', () => {
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: ['学习路线-00-学习地图与能力验收'],
    topic: [],
  });

  expect(verification).toMatchObject({
    status: 'unavailable',
    courseSlug: '学习路线-00-学习地图与能力验收',
  });
});

it.each([
  { source: ['LEARN'], course: ['学习路线-01-agent基础与上下文工程'], topic: ['react'] },
  { source: ['learn', 'learn'], course: ['学习路线-01-agent基础与上下文工程'], topic: ['react'] },
  {
    source: ['learn'],
    course: ['学习路线-01-agent基础与上下文工程', '学习路线-02-tool-calling与mcp'],
    topic: ['react'],
  },
  { source: ['learn'], course: ['学习路线-01-agent基础与上下文工程'], topic: ['ReAct'] },
  { source: ['learn'], course: ['https://evil.example'], topic: ['react'] },
  { source: [], course: ['学习路线-01-agent基础与上下文工程'], topic: ['react'] },
])('fails closed for an invalid learn context: %j', (input) => {
  expect(resolveLearningVerification(input)).toEqual({ status: 'invalid' });
});

it('leaves the existing agent and plain question entry flows untouched', () => {
  expect(resolveLearningVerification({ source: [], course: [], topic: [] })).toEqual({
    status: 'inactive',
  });
  expect(resolveLearningVerification({ source: ['agent'], course: [], topic: [] })).toEqual({
    status: 'inactive',
  });
});

it('keeps course mappings and on-disk course documents in two-way sync', async () => {
  const documents = await loadLearningDocuments();
  const documentSlugs = new Set(
    documents.filter((document) => document.kind === 'course').map((document) => document.slug),
  );
  const mappedSlugs = mappedLearningCourseSlugs();

  // 映射了却没有文档：课程列表里点不开；有文档却没映射：验证入口静默消失。
  expect(mappedSlugs.filter((slug) => !documentSlugs.has(slug))).toEqual([]);
  expect([...documentSlugs].filter((slug) => !mappedSlugs.includes(slug))).toEqual([]);
});

it('returns only to the mapped course action anchor and never to input URLs', () => {
  expect(learningVerificationReturnHref('学习路线-01-agent基础与上下文工程')).toBe(
    '/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B#learning-course-actions',
  );
  expect(learningVerificationReturnHref('https://evil.example')).toBe('/learn');
});
