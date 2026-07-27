'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/components/notifications/NotificationProvider';
import { createPracticeSession } from '@/lib/practice-api';
import { createExclusiveWeaknessReviewRunner, startWeaknessReview } from '@/lib/weakness-review';

export function WeaknessReviewAction() {
  const [starting, setStarting] = useState(false);
  const [runExclusive] = useState(createExclusiveWeaknessReviewRunner);
  const notifications = useNotifications();
  const router = useRouter();
  const start = () =>
    runExclusive(() =>
      startWeaknessReview({
        createSession: createPracticeSession,
        setStarting,
        onSuccess: (sessionId) => {
          notifications.success('薄弱项复练已准备好', '已按最新未掌握题目创建本轮训练。');
          router.push(`/practice?session=${sessionId}`);
        },
        onError: (error) => {
          notifications.error(
            '薄弱项复练暂时不可用',
            error,
            '请先完成一轮 AI 评价，再回来复练薄弱项。',
          );
        },
      }),
    );
  return <WeaknessReviewButton starting={starting} onStart={() => void start()} />;
}

export function WeaknessReviewButton({
  starting,
  onStart,
}: {
  starting: boolean;
  onStart: () => void;
}) {
  return (
    <button className="button" type="button" disabled={starting} onClick={onStart}>
      {starting ? '正在组题…' : '复练薄弱项'}
    </button>
  );
}
