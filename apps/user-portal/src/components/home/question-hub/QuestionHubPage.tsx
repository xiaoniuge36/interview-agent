'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '@interview-agent/auth-client';
import { AgentRecommendationRail } from './AgentRecommendationRail';
import { PrepPlanCard } from './PrepPlanCard';
import { QuestionSearchBar } from './QuestionSearchBar';
import { QuestionTopicGrid } from './QuestionTopicGrid';
import { QuickStartRoles } from './QuickStartRoles';
import { useQuestionHubData } from './useQuestionHubData';

const DISCOVERY_TAG_LIMIT = 8;
const DISCOVERY_RISE_DELAY = { '--rise-delay': '260ms' } as CSSProperties;

export function QuestionHubPage() {
  const auth = useAuth();
  const data = useQuestionHubData();
  const [planVersion, setPlanVersion] = useState(0);
  return (
    <div className="question-hub-page">
      <AgentRecommendationRail
        displayName={auth.identity?.displayName}
        continuation={data.continuation}
        recommendations={data.recommendations}
        loading={data.recommendationsLoading}
        error={data.recommendationError}
        actionError={data.actionError}
        busyRecommendationId={data.busyRecommendationId}
        onRetry={data.reloadRecommendations}
        onStart={(recommendation) => void data.startRecommendation(recommendation)}
      />
      <QuickStartRoles
        onCreated={() => {
          void data.reloadRecommendations();
          setPlanVersion((version) => version + 1);
        }}
      />
      <PrepPlanCard key={planVersion} />
      <div className="question-hub-supporting-content">
        <QuestionSearchBar total={data.catalog?.total} compact />
        {data.catalogError ? (
          <CatalogError message={data.catalogError} onRetry={data.reloadCatalog} />
        ) : null}
        <QuestionTopicGrid catalog={data.catalog} />
        <QuestionDiscovery catalog={data.catalog} />
      </div>
    </div>
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
    <section
      className="question-discovery motion-rise"
      style={DISCOVERY_RISE_DELAY}
      aria-labelledby="question-discovery-heading"
    >
      <div>
        <span>快速发现</span>
        <h2 id="question-discovery-heading">从高频能力点开始</h2>
      </div>
      <div className="question-discovery-tags motion-stagger">
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
