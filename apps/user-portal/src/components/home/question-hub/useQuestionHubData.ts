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
import { selectTrainingContinuation, type TrainingContinuation } from './training-continuation';

export function useQuestionHubData() {
  return { ...useQuestionHubQueries(), ...useRecommendationStarter() };
}

function useQuestionHubQueries() {
  const [catalog, setCatalog] = useState<QuestionCatalogResponse | null>(null);
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);
  const [continuation, setContinuation] = useState<TrainingContinuation | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [requests] = useState(createHomeQueryRequests);

  const loadCatalog = useCallback(() => {
    setCatalogError('');
    return requests.catalog.run({
      load: () => getQuestionCatalog({ pageSize: 20 }),
      onSuccess: setCatalog,
      onError: () => setCatalogError('题库暂时没有加载成功，你仍可以进入选题页重试。'),
      onSettled: () => undefined,
    });
  }, [requests.catalog]);

  const loadRecommendations = useCallback(() => {
    setRecommendationError('');
    setRecommendationsLoading(true);
    return requests.recommendations.run({
      load: getPracticeRecommendations,
      onSuccess: setRecommendations,
      onError: () => setRecommendationError('Agent 推荐暂时不可用，不影响你自主选题。'),
      onSettled: () => setRecommendationsLoading(false),
    });
  }, [requests.recommendations]);

  useHomeQueryLifecycle({ requests, loadCatalog, loadRecommendations, setContinuation });

  return {
    catalog,
    recommendations,
    continuation,
    catalogError,
    recommendationError,
    recommendationsLoading,
    reloadCatalog: loadCatalog,
    reloadRecommendations: loadRecommendations,
  };
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
  setContinuation: (value: TrainingContinuation | null) => void;
};

function useHomeQueryLifecycle(input: HomeQueryLifecycle) {
  const { requests, loadCatalog, loadRecommendations, setContinuation } = input;
  useEffect(() => {
    void loadCatalog();
    void loadRecommendations();
    void requests.continuation.run({
      load: loadTrainingContinuation,
      onSuccess: setContinuation,
      onError: () => undefined,
      onSettled: () => undefined,
    });
    return () => {
      requests.catalog.invalidate();
      requests.recommendations.invalidate();
      requests.continuation.invalidate();
    };
  }, [loadCatalog, loadRecommendations, requests, setContinuation]);
}

async function loadTrainingContinuation() {
  const [recentPractice, interviews] = await Promise.all([
    getRecentPractice().catch(() => null),
    listInterviews().catch(() => []),
  ]);
  return selectTrainingContinuation(recentPractice, interviews);
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
