'use client';

import type {
  InterviewSessionSummary,
  JobIntentPayload,
  MasteryProfile,
  PracticeHistoryItem,
} from '@interview-agent/contracts';
import { useCallback, useEffect, useState } from 'react';
import { createLatestRequestRunner } from '@interview-agent/api-client';
import { getLearningProgress } from '@/lib/learning-progress-api';
import { listInterviews } from '@/lib/interview-api';
import { getMasteryProfiles, listPracticeHistory } from '@/lib/practice-api';
import { listJobIntents } from '@/lib/workspace-api';

export type PrepPlanData = {
  practices: PracticeHistoryItem[];
  interviews: InterviewSessionSummary[];
  jobs: JobIntentPayload[];
  jobsFailed: boolean;
  learningUpdatedAt: string | null;
  mastery: MasteryProfile[];
};

export type PrepPlanState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: PrepPlanData };

export function usePrepPlanData() {
  const [state, setState] = useState<PrepPlanState>({ status: 'loading' });
  const [request] = useState(createLatestRequestRunner);
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    return request.run({
      load: loadPrepPlanData,
      onSuccess: (data) => setState({ status: 'ready', data }),
      onError: () => setState({ status: 'error' }),
      onSettled: () => undefined,
    });
  }, [request]);
  useEffect(() => {
    void reload();
    return request.invalidate;
  }, [reload, request]);
  const applyJobUpdate = useCallback((job: JobIntentPayload) => {
    setState((current) => (current.status === 'ready' ? withUpdatedJob(current, job) : current));
  }, []);
  return { state, reload, applyJobUpdate };
}

function withUpdatedJob(
  current: Extract<PrepPlanState, { status: 'ready' }>,
  job: JobIntentPayload,
): PrepPlanState {
  return {
    ...current,
    data: {
      ...current.data,
      jobs: current.data.jobs.map((item) => (item.intent.id === job.intent.id ? job : item)),
    },
  };
}

/** 练习与面试记录是整卡的主体数据：两者都失败才算整卡失败，外围数据失败时降级渲染。 */
async function loadPrepPlanData(): Promise<PrepPlanData> {
  const [practices, interviews, jobs, learning, mastery] = await Promise.allSettled([
    listPracticeHistory(),
    listInterviews(),
    listJobIntents(),
    getLearningProgress(),
    getMasteryProfiles(),
  ]);
  if (practices.status === 'rejected' && interviews.status === 'rejected') {
    throw new Error('prep plan core data unavailable');
  }
  return {
    practices: practices.status === 'fulfilled' ? practices.value : [],
    interviews: interviews.status === 'fulfilled' ? interviews.value : [],
    jobs: jobs.status === 'fulfilled' ? jobs.value : [],
    jobsFailed: jobs.status === 'rejected',
    learningUpdatedAt:
      learning.status === 'fulfilled' ? (learning.value.progress?.updatedAt ?? null) : null,
    mastery: mastery.status === 'fulfilled' ? mastery.value : [],
  };
}
