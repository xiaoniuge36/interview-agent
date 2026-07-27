'use client';

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { createPracticeSession } from '@/lib/practice-api';
import {
  createExclusiveInterviewReviewPracticeRunner,
  startInterviewReviewPractice,
} from './interview-review-practice-runner';

export function useInterviewReviewPractice() {
  const [starting, setStarting] = useState(false);
  const runner = useRef(createExclusiveInterviewReviewPracticeRunner());
  const router = useRouter();
  const notifications = useNotifications();
  const start = useCallback(
    async (sessionId: string) => {
      await runner.current(async () => {
        setStarting(true);
        try {
          await startInterviewReviewPractice({
            sessionId,
            createSession: createPracticeSession,
            onSuccess: (practiceSessionId) => {
              notifications.success('面试专项回练已准备好', '已按本次面试的低分阶段创建训练。');
              router.push(`/practice?session=${practiceSessionId}`);
            },
            onError: (error) => {
              notifications.error(
                '面试专项回练暂时不可用',
                error,
                '报告中的训练重点暂时无法组题，请稍后重试。',
              );
            },
          });
        } finally {
          setStarting(false);
        }
      });
    },
    [notifications, router],
  );
  return { starting, start };
}
