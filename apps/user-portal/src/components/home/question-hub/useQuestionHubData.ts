'use client';

import type { PracticeRecommendation, QuestionCatalogResponse } from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPracticeRecommendations,
  getQuestionCatalog,
  getRecentPractice,
} from '@/lib/question-catalog-api';
import { listInterviews } from '@/lib/interview-api';
import { createPracticeSession } from '@/lib/practice-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import {
  createExclusiveHomeRecommendationStartRunner,
  startHomeRecommendation,
} from './home-recommendation-start';
import { createLatestRequestRunner } from '@interview-agent/api-client';
import { loadTrainingContinuation, type TrainingContinuation } from './training-continuation';

export function useQuestionHubData() {
  return { ...useQuestionHubQueries(), ...useRecommendationStarter() };
}

function useQuestionHubQueries() {
  const [requests] = useState(createHomeQueryRequests);
  const catalogQuery = useCatalogQuery(requests.catalog);
  const recommendationQuery = useRecommendationsQuery(requests.recommendations);
  const continuationQuery = useContinuationQuery(requests.continuation);

  useHomeQueryLifecycle({
    requests,
    loadCatalog: catalogQuery.load,
    loadRecommendations: recommendationQuery.load,
    loadContinuation: continuationQuery.load,
  });

  return {
    catalog: catalogQuery.catalog,
    recommendations: recommendationQuery.recommendations,
    continuation: continuationQuery.continuation,
    catalogError: catalogQuery.error,
    recommendationError: recommendationQuery.error,
    continuationError: continuationQuery.error,
    recommendationsLoading: recommendationQuery.loading,
    reloadCatalog: catalogQuery.load,
    reloadRecommendations: recommendationQuery.load,
    reloadContinuation: continuationQuery.load,
  };
}

type HomeQueryRunner = ReturnType<typeof createLatestRequestRunner>;

function useCatalogQuery(runner: HomeQueryRunner) {
  const [catalog, setCatalog] = useState<QuestionCatalogResponse | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    return runner.run({
      load: () => getQuestionCatalog({ pageSize: 20 }),
      onSuccess: setCatalog,
      onError: () => setError('题库暂时没有加载成功，你仍可以进入选题页重试。'),
      onSettled: () => undefined,
    });
  }, [runner]);
  return { catalog, error, load };
}

function useRecommendationsQuery(runner: HomeQueryRunner) {
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setError('');
    setLoading(true);
    return runner.run({
      load: getPracticeRecommendations,
      onSuccess: setRecommendations,
      onError: () => setError('Agent 推荐暂时不可用，不影响你自主选题。'),
      onSettled: () => setLoading(false),
    });
  }, [runner]);
  return { recommendations, error, loading, load };
}

function useContinuationQuery(runner: HomeQueryRunner) {
  const [continuation, setContinuation] = useState<TrainingContinuation | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    setError('');
    return runner.run({
      load: () =>
        loadTrainingContinuation({
          loadRecentPractice: getRecentPractice,
          loadInterviews: listInterviews,
        }),
      onSuccess: setContinuation,
      onError: () => setError('上次训练进度暂时读取失败，可能有进行中的练习没有显示。'),
      onSettled: () => undefined,
    });
  }, [runner]);
  return { continuation, error, load };
}

function createHomeQueryRequests() {
  return {
    catalog: createLatestRequestRunner(),
    recommendations: createLatestRequestRunner(),
    continuation: createLatestRequestRunner(),
  };
}

type HomeQueryLifecycle = {
  requests: ReturnType<typeof createHomeQueryRequests>;
  loadCatalog: () => Promise<boolean>;
  loadRecommendations: () => Promise<boolean>;
  loadContinuation: () => Promise<boolean>;
};

function useHomeQueryLifecycle(input: HomeQueryLifecycle) {
  const { requests, loadCatalog, loadRecommendations, loadContinuation } = input;
  useEffect(() => {
    void loadCatalog();
    void loadRecommendations();
    void loadContinuation();
    return () => {
      requests.catalog.invalidate();
      requests.recommendations.invalidate();
      requests.continuation.invalidate();
    };
  }, [loadCatalog, loadContinuation, loadRecommendations, requests]);
}

function useRecommendationStarter() {
  const router = useRouter();
  const notifications = useNotifications();
  const [actionError, setActionError] = useState('');
  const [busyRecommendationId, setBusyRecommendationId] = useState<string | null>(null);
  const [runExclusive] = useState(createExclusiveHomeRecommendationStartRunner);

  const startRecommendation = useCallback(
    (recommendation: PracticeRecommendation) =>
      runExclusive(async () => {
        setActionError('');
        await startHomeRecommendation({
          recommendation,
          createSession: createPracticeSession,
          setBusyRecommendationId,
          onSuccess: (sessionId) => {
            notifications.success('Agent 推荐训练已创建', '服务端已保存推荐题单，即将开始训练。');
            router.push(`/practice?session=${sessionId}`);
          },
          onError: (error) => {
            const message = '推荐题单未能创建，请稍后重试或前往题库自主选题。';
            setActionError(message);
            notifications.error('Agent 推荐训练创建失败', error, message);
          },
        });
      }),
    [notifications, router, runExclusive],
  );

  return {
    actionError,
    busyRecommendationId,
    startRecommendation,
  };
}
