import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { LearningDocument } from '@/lib/learning/learning-documents';
import { slugify } from '@/lib/learning/learning-documents';

export function LearningArticle({ document }: { document: LearningDocument }) {
  const nextHeadingId = createHeadingIdFactory();
  const components: Components = {
    h2: ({ children }) => <h2 id={nextHeadingId(children)}>{children}</h2>,
    h3: ({ children }) => <h3 id={nextHeadingId(children)}>{children}</h3>,
    a: ({ href, children }) => {
      const external = isExternalLink(href);
      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer noopener' : undefined}
        >
          {children}
        </a>
      );
    },
    table: ({ children }) => (
      <div className="learning-table-scroll">
        <table>{children}</table>
      </div>
    ),
  };
  return (
    <article className="learning-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {document.content}
      </ReactMarkdown>
    </article>
  );
}

function createHeadingIdFactory() {
  const counts = new Map<string, number>();
  return (children: ReactNode) => {
    const baseId = slugify(readText(children));
    const count = (counts.get(baseId) ?? 0) + 1;
    counts.set(baseId, count);
    return count === 1 ? baseId : `${baseId}-${count}`;
  };
}

function readText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(readText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return readText(node.props.children);
  return '';
}

function isExternalLink(href: string | undefined): boolean {
  return Boolean(href && /^https?:\/\//i.test(href));
}
