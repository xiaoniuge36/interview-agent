'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';

/**
 * 学习中心的课程切换在客户端完成：全部文档已随首屏下发，
 * 切换只改状态并用 pushState 同步 URL，不再触发整页导航。
 * （Next 15 生产构建对同路由非 ASCII query 的客户端路由不可靠，
 * 之前被迫整页刷新，这里直接绕开路由器。）
 */

export type SwitchableLearningDocument = {
  slug: string;
  kind: 'course' | 'reference';
};

export function learningDocumentHref(slug: string): string {
  return `/learn?doc=${encodeURIComponent(slug)}`;
}

/** 从 location.search 解析请求的文档 slug；缺失或未知时返回 null。 */
export function requestedSlugFromSearch(
  search: string,
  knownSlugs: readonly string[],
): string | null {
  const slug = new URLSearchParams(search).get('doc');
  return slug && knownSlugs.includes(slug) ? slug : null;
}

/**
 * 文档链接的点击处理：普通左键点击走客户端切换；
 * 带修饰键（新标签/新窗口）与非主键点击保持原生行为。
 */
export function documentLinkClickHandler(slug: string, onSelect: (slug: string) => void) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onSelect(slug);
  };
}

export function useLearningDocumentSwitch<T extends SwitchableLearningDocument>(
  documents: readonly T[],
  initialSlug: string,
  initialOpenedCourseSlug: string | null,
) {
  const [activeSlug, setActiveSlug] = useState(initialSlug);
  const [openedCourseSlug, setOpenedCourseSlug] = useState(initialOpenedCourseSlug);

  const applySelection = useCallback(
    (slug: string) => {
      const target = documents.find((document) => document.slug === slug);
      if (!target) return;
      setActiveSlug(slug);
      // 打开参考资料不覆盖“继续上次学习”的课程记录。
      if (target.kind === 'course') setOpenedCourseSlug(slug);
    },
    [documents],
  );

  const selectDocument = useCallback(
    (slug: string) => {
      if (slug === activeSlug) return;
      applySelection(slug);
      window.history.pushState(null, '', learningDocumentHref(slug));
    },
    [activeSlug, applySelection],
  );

  // 滚顶要等 DOM 提交后执行：提交前滚动会被浏览器的滚动锚定在内容替换时拉回原位。
  const initialRenderRef = useRef(true);
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeSlug]);

  useEffect(() => {
    const restoreFromLocation = () => {
      const slug = requestedSlugFromSearch(
        window.location.search,
        documents.map((document) => document.slug),
      );
      applySelection(slug ?? initialSlug);
    };
    window.addEventListener('popstate', restoreFromLocation);
    return () => window.removeEventListener('popstate', restoreFromLocation);
  }, [applySelection, documents, initialSlug]);

  const activeDocument =
    documents.find((document) => document.slug === activeSlug) ?? documents[0] ?? null;
  return { activeDocument, openedCourseSlug, selectDocument };
}

/** 在溢出的滚动容器里，把目标项滚到居中位置，并夹在首尾边界内。 */
export function learningRailScrollOffset({
  viewportSize,
  contentSize,
  itemStart,
  itemSize,
}: {
  viewportSize: number;
  contentSize: number;
  itemStart: number;
  itemSize: number;
}): number {
  const maximum = Math.max(contentSize - viewportSize, 0);
  const centered = itemStart - (viewportSize - itemSize) / 2;
  return Math.min(Math.max(centered, 0), maximum);
}
