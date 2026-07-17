'use client';

import type {
  PracticeRecommendation,
  QuestionCatalogResponse,
  RecentPracticeSummary,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getPracticeRecommendations,
  getQuestionCatalog,
  getRecentPractice,
} from '@/lib/question-catalog-api';
import { createPracticeSession } from '@/lib/practice-api';
import { useNotifications } from '@/components/notifications/NotificationProvider';

export function useQuestionHubData() {
  return { ...useQuestionHubQueries(), ...useRecommendationStarter() };
}

function useQuestionHubQueries() {
  const [catalog, setCatalog] = useState<QuestionCatalogResponse | null>(null);
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([]);
  const [recent, setRecent] = useState<RecentPracticeSummary | null>(null);
  const [catalogError, setCatalogError] = useState('');
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    setCatalogError('');
    try {
      setCatalog(await getQuestionCatalog({ pageSize: 20 }));
    } catch {
      setCatalogError('题库暂时没有加载成功，你仍可以进入选题页重试。');
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setRecommendationError('');
    setRecommendationsLoading(true);
    try {
      setRecommendations(await getPracticeRecommendations());
    } catch {
      setRecommendationError('Agent 推荐暂时不可用，不影响你自主选题。');
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
    void loadRecommendations();
    void getRecentPractice()
      .then(setRecent)
      .catch(() => setRecent(null));
  }, [loadCatalog, loadRecommendations]);

  return {
    catalog,
    recommendations,
    recent,
    catalogError,
    recommendationError,
    recommendationsLoading,
    reloadCatalog: loadCatalog,
    reloadRecommendations: loadRecommendations,
  };
}

function useRecommendationStarter() {
  const router = useRouter();
  const notifications = useNotifications();
  const [actionError, setActionError] = useState('');
  const [busyRecommendationId, setBusyRecommendationId] = useState<string | null>(null);

  const startRecommendation = useCallback(
    async (recommendation: PracticeRecommendation) => {
      setActionError('');
      setBusyRecommendationId(recommendation.id);
      try {
        const session = await createPracticeSession({
          title: recommendation.title,
          mode: 'manual',
          questionIds: recommendation.questionIds,
        });
        notifications.success('Agent 推荐训练已创建', '服务端已保存推荐题单，即将开始训练。');
        router.push(`/practice?session=${session.id}`);
      } catch (error) {
        const message = '推荐题单未能创建，请稍后重试或前往题库自主选题。';
        setActionError(message);
        notifications.error('Agent 推荐训练创建失败', error, message);
      } finally {
        setBusyRecommendationId(null);
      }
    },
    [notifications, router],
  );

  return {
    actionError,
    busyRecommendationId,
    startRecommendation,
  };
}
