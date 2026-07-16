'use client';

import Link from 'next/link';
import { AgentRecommendationRail } from './AgentRecommendationRail';
import { QuestionSearchBar } from './QuestionSearchBar';
import { QuestionTopicGrid } from './QuestionTopicGrid';
import { useQuestionHubData } from './useQuestionHubData';

const PERCENTAGE_TOTAL = 100;
const DISCOVERY_TAG_LIMIT = 8;

export function QuestionHubPage() {
  const data = useQuestionHubData();
  return (
    <div className="question-hub-page">
      <QuestionSearchBar total={data.catalog?.total} />
      <div className="question-hub-layout">
        <div className="question-hub-main">
          {data.recent ? <RecentPracticeCard recent={data.recent} /> : null}
          {data.catalogError ? (
            <CatalogError message={data.catalogError} onRetry={data.reloadCatalog} />
          ) : null}
          <QuestionTopicGrid catalog={data.catalog} />
          <QuestionDiscovery catalog={data.catalog} />
        </div>
        <AgentRecommendationRail
          recommendations={data.recommendations}
          loading={data.recommendationsLoading}
          error={data.recommendationError}
          actionError={data.actionError}
          busyRecommendationId={data.busyRecommendationId}
          onRetry={data.reloadRecommendations}
          onStart={(recommendation) => void data.startRecommendation(recommendation)}
        />
      </div>
    </div>
  );
}

function RecentPracticeCard({
  recent,
}: {
  recent: NonNullable<ReturnType<typeof useQuestionHubData>['recent']>;
}) {
  const percent = Math.round((recent.answeredCount / recent.questionCount) * PERCENTAGE_TOTAL);
  return (
    <section className="recent-practice-card" aria-labelledby="recent-practice-heading">
      <div className="recent-practice-copy">
        <span>继续上次</span>
        <h2 id="recent-practice-heading">{recent.title}</h2>
        <p>
          已回答 {recent.answeredCount}/{recent.questionCount} 题，进度已保留。
        </p>
      </div>
      <div className="recent-practice-progress" aria-label={`练习进度 ${percent}%`}>
        <span style={{ width: `${percent}%` }} />
      </div>
      <Link href={`/practice?session=${recent.id}`}>
        继续练习 <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function CatalogError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="question-hub-error" role="status">
      <span>{message}</span>
      <button type="button" onClick={onRetry}>
        重新加载
      </button>
      <Link href="/questions">进入选题页</Link>
    </div>
  );
}

function QuestionDiscovery({
  catalog,
}: {
  catalog: ReturnType<typeof useQuestionHubData>['catalog'];
}) {
  const tags = catalog?.facets.tags.slice(0, DISCOVERY_TAG_LIMIT) ?? [];
  return (
    <section className="question-discovery" aria-labelledby="question-discovery-heading">
      <div>
        <span>快速发现</span>
        <h2 id="question-discovery-heading">从高频能力点开始</h2>
      </div>
      <div className="question-discovery-tags">
        {tags.length ? (
          tags.map((tag) => (
            <Link key={tag.value} href={`/questions?tags=${encodeURIComponent(tag.value)}`}>
              {tag.label}
              <span>{tag.count}</span>
            </Link>
          ))
        ) : (
          <span className="question-tags-loading">题库标签同步中…</span>
        )}
      </div>
    </section>
  );
}
