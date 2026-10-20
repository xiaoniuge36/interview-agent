import { isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  slugify,
  type LearningDocument,
  type LearningHeading,
} from '@/lib/learning/learning-document-model';

type HeadingNode = {
  position?: { start?: { line?: number | undefined } | undefined } | undefined;
};

export function LearningArticle({ document }: { document: LearningDocument }) {
  const idsByLine = headingIdsByLine(document.headings);
  const components: Components = {
    h1: ({ children }) => <h2 className="learning-article-title">{children}</h2>,
    h2: ({ children, node }) => (
      <h3 className="learning-article-section" id={headingIdFor(node, children, idsByLine)}>
        {children}
      </h3>
    ),
    h3: ({ children, node }) => (
      <h4 className="learning-article-subsection" id={headingIdFor(node, children, idsByLine)}>
        {children}
      </h4>
    ),
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

/**
 * 目录 ID 在服务端按正文行号预计算；渲染端按 hast node 的行号回查，
 * 不再依赖组件调用次数计数——React 开发态会重复调用渲染函数，计数型 ID 会整体漂移。
 */
function headingIdsByLine(headings: readonly LearningHeading[]): ReadonlyMap<number, string> {
  return new Map(headings.map((heading) => [heading.line, heading.id]));
}

function headingIdFor(
  node: HeadingNode | undefined,
  children: ReactNode,
  idsByLine: ReadonlyMap<number, string>,
): string {
  const line = node?.position?.start?.line;
  const mapped = line === undefined ? undefined : idsByLine.get(line);
  if (mapped) return mapped;
  // 引用块内标题等未进入目录的标题：带行号兜底，避免与目录锚点重复。
  const slug = slugify(readText(children));
  return line === undefined ? slug : `${slug}-line-${line}`;
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
