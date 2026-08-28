import { expect, it, vi } from 'vitest';
import type { MouseEvent } from 'react';
import {
  documentLinkClickHandler,
  learningDocumentHref,
  requestedSlugFromSearch,
} from './learning-center-navigation';

const KNOWN_SLUGS = ['学习路线-01-agent基础与上下文工程', '学习路线-20-star行为面试与项目深挖'];

it('encodes document slugs into shareable learn URLs', () => {
  expect(learningDocumentHref('学习路线-01-agent基础与上下文工程')).toBe(
    '/learn?doc=%E5%AD%A6%E4%B9%A0%E8%B7%AF%E7%BA%BF-01-agent%E5%9F%BA%E7%A1%80%E4%B8%8E%E4%B8%8A%E4%B8%8B%E6%96%87%E5%B7%A5%E7%A8%8B',
  );
});

it('resolves the requested slug only when it is a known document', () => {
  const encoded = `?doc=${encodeURIComponent(KNOWN_SLUGS[1]!)}`;
  expect(requestedSlugFromSearch(encoded, KNOWN_SLUGS)).toBe(KNOWN_SLUGS[1]);
  expect(requestedSlugFromSearch('?doc=unknown-doc', KNOWN_SLUGS)).toBeNull();
  expect(requestedSlugFromSearch('', KNOWN_SLUGS)).toBeNull();
});

it('switches on plain left click but keeps native behavior for modified clicks', () => {
  const onSelect = vi.fn();
  const handler = documentLinkClickHandler('doc-a', onSelect);

  const plainClick = clickEvent();
  handler(plainClick);
  expect(plainClick.preventDefault).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('doc-a');

  onSelect.mockClear();
  for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
    const modifiedClick = clickEvent({ [modifier]: true });
    handler(modifiedClick);
    expect(modifiedClick.preventDefault).not.toHaveBeenCalled();
  }
  expect(onSelect).not.toHaveBeenCalled();
});

function clickEvent(overrides: Partial<Record<string, boolean>> = {}) {
  return {
    defaultPrevented: false,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault: vi.fn(),
    ...overrides,
  } as unknown as MouseEvent<HTMLAnchorElement> & { preventDefault: ReturnType<typeof vi.fn> };
}
