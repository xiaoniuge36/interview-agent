import type { QuestionCatalogResponse } from '@interview-agent/contracts';
import Link from 'next/link';
import { QUESTION_TOPICS } from '../../search/global-search-model';

export function QuestionTopicGrid({ catalog }: { catalog: QuestionCatalogResponse | null }) {
  const counts = new Map(catalog?.facets.categories.map((item) => [item.value, item.count]));
  return (
    <section className="question-topic-section" aria-labelledby="question-topic-heading">
      <div className="question-section-heading">
        <div>
          <span>按方向进入</span>
          <h2 id="question-topic-heading">题库专题</h2>
        </div>
        <Link href="/questions">
          查看全部题目 <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="question-topic-grid">
        {QUESTION_TOPICS.map((topic) => {
          const count = counts.get(topic.category) ?? 0;
          return (
            <Link
              key={topic.category}
              className="question-topic-card"
              data-category={topic.category}
              href={`/questions?category=${topic.category}`}
            >
              <span className="question-topic-glyph" aria-hidden="true">
                {topic.glyph}
              </span>
              <span className="question-topic-copy">
                <strong>{topic.title}</strong>
                <small>{topic.description}</small>
              </span>
              <span className="question-topic-count">
                {catalog ? (count ? `${count} 道题` : '持续更新') : '加载中'}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
