import { expect, it } from 'vitest';
import {
  learningPracticeHref,
  learningVerificationHref,
  learningVerificationReturnHref,
  resolveLearningVerification,
} from './learning-verification';

it('uses the documented ReAct course slug and exact existing question tag', () => {
  const href = learningVerificationHref('01-agent基础与上下文工程');
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: ['01-agent基础与上下文工程'],
    topic: ['react'],
  });

  expect(href).toBe(
    '/questions?source=learn&course=01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B&topic=react',
  );
  expect(verification).toMatchObject({
    status: 'ready',
    courseSlug: '01-agent基础与上下文工程',
    topicLabel: 'ReAct',
    query: { tags: ['ReAct'], type: 'single_choice' },
  });
});

it('carries only the verified learning course and topic into a practice session URL', () => {
  const verification = resolveLearningVerification({
    source: ['learn'],
    course: ['01-agent基础与上下文工程'],
    topic: ['react'],
  });

  expect(learningPracticeHref('session/one', verification)).toBe(
    '/practice?session=session%2Fone&origin=learn&course=01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B&topic=react',
  );
  expect(learningPracticeHref('session/one', { status: 'inactive' })).toBe(
    '/practice?session=session%2Fone',
  );
});

it.each([
  ['02-tool-calling与mcp', 'tool-calling', 'Tool Calling'],
  ['03-rag与agentic-rag', 'rag', 'RAG'],
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
    course: ['04-memory-planning与multi-agent'],
    topic: [],
  });

  expect(verification).toMatchObject({
    status: 'unavailable',
    courseSlug: '04-memory-planning与multi-agent',
  });
});

it.each([
  { source: ['LEARN'], course: ['01-agent基础与上下文工程'], topic: ['react'] },
  { source: ['learn', 'learn'], course: ['01-agent基础与上下文工程'], topic: ['react'] },
  {
    source: ['learn'],
    course: ['01-agent基础与上下文工程', '02-tool-calling与mcp'],
    topic: ['react'],
  },
  { source: ['learn'], course: ['01-agent基础与上下文工程'], topic: ['ReAct'] },
  { source: ['learn'], course: ['https://evil.example'], topic: ['react'] },
  { source: [], course: ['01-agent基础与上下文工程'], topic: ['react'] },
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

it('returns only to the mapped course action anchor and never to input URLs', () => {
  expect(learningVerificationReturnHref('01-agent基础与上下文工程')).toBe(
    '/learn?doc=01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B#learning-course-actions',
  );
  expect(learningVerificationReturnHref('https://evil.example')).toBe('/learn');
});
