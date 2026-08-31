import { expect, it } from 'vitest';
import {
  MISTAKE_BOOK_RETURN_HREF,
  mistakeBookReviewPracticeHref,
  practiceReturnHref,
  practiceReturnLink,
  practiceReturnOriginFromValues,
} from './practice-return-origin';

it('adds the only supported origin when a mistake review practice session opens', () => {
  expect(mistakeBookReviewPracticeHref('session/one')).toBe(
    '/practice?session=session%2Fone&origin=mistake-book',
  );
});

it('accepts exactly one lower-case mistake-book origin and maps it to a fixed report anchor', () => {
  const origin = practiceReturnOriginFromValues(['mistake-book']);

  expect(origin).toBe('mistake-book');
  expect(practiceReturnHref(origin)).toBe(MISTAKE_BOOK_RETURN_HREF);
  expect(MISTAKE_BOOK_RETURN_HREF).toBe('/reports#mistake-book-heading');
});

it('accepts one verified learning origin and returns only to its fixed course anchor', () => {
  const origin = practiceReturnOriginFromValues(
    ['learn'],
    ['学习路线-01-agent基础与上下文工程'],
    ['react'],
  );

  expect(origin).toMatchObject({
    status: 'ready',
    courseSlug: '学习路线-01-agent基础与上下文工程',
    topicLabel: 'ReAct',
  });
  expect(practiceReturnHref(origin)).toBe(
    '/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B#learning-course-actions',
  );
});

it.each([
  { origins: ['learn'], courses: ['学习路线-01-agent基础与上下文工程'], topics: ['ReAct'] },
  {
    origins: ['learn'],
    courses: ['学习路线-01-agent基础与上下文工程', '学习路线-01-agent基础与上下文工程'],
    topics: ['react'],
  },
  { origins: ['learn'], courses: ['//evil.example'], topics: ['react'] },
  { origins: ['agent'], courses: [], topics: [] },
])('does not turn invalid learning metadata into a return target: %j', (input) => {
  const origin = practiceReturnOriginFromValues(input.origins, input.courses, input.topics);

  expect(origin).toBeNull();
  expect(practiceReturnHref(origin)).toBeNull();
});

it.each([
  [[]],
  [['MISTAKE-BOOK']],
  [['mistake-book ']],
  [['mistake-book', 'mistake-book']],
  [['mistake-book', 'https://evil.example']],
  [['//evil.example']],
  [['learn', 'learn']],
  [['LEARN']],
])('fails closed for an unknown, malformed, or repeated origin: %j', (origins) => {
  const origin = practiceReturnOriginFromValues(origins);

  expect(origin).toBeNull();
  expect(practiceReturnHref(origin)).toBeNull();
});

it('keeps the in-progress return link on the origin instead of the generic catalog', () => {
  expect(practiceReturnLink('mistake-book')).toEqual({
    href: '/reports#mistake-book-heading',
    label: '返回错题本',
  });

  const learning = practiceReturnOriginFromValues(
    ['learn'],
    ['学习路线-01-agent基础与上下文工程'],
    ['react'],
  );
  expect(practiceReturnLink(learning)).toEqual({
    href: '/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B#learning-course-actions',
    label: '返回本课',
  });
});

it('falls back to the question catalog when the practice has no return origin', () => {
  expect(practiceReturnLink(null)).toEqual({ href: '/questions', label: '返回题库' });
});
