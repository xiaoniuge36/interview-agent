'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { InterviewAction } from '@/components/interview/interview-state';
import type { NotificationApi } from '@/components/notifications/NotificationProvider';
import { clearInterviewDraft, loadInterviewDraft, saveInterviewDraft } from '@/lib/interview-draft';

type InterviewDraftOptions = {
  sessionId: string | null;
  draft: string;
  dispatch: Dispatch<InterviewAction>;
  notifications: NotificationApi;
};

export function useInterviewDraft(options: InterviewDraftOptions) {
  const { sessionId, draft, dispatch, notifications } = options;
  const restoredSessionRef = useRef<string | null>(null);
  const [draftRecovered, setDraftRecovered] = useState(false);

  useEffect(() => {
    if (!sessionId || restoredSessionRef.current === sessionId) return;
    restoredSessionRef.current = sessionId;
    setDraftRecovered(false);
    const restoredDraft = loadInterviewDraft(sessionId);
    if (!restoredDraft) {
      if (draft) dispatch({ type: 'draft', draft: '' });
      return;
    }
    dispatch({ type: 'draft', draft: restoredDraft });
    setDraftRecovered(true);
    notifications.info('已恢复未提交回答', '草稿仅保存在当前浏览器标签页。');
  }, [dispatch, draft, notifications, sessionId]);

  const setDraft = useCallback(
    (nextDraft: string) => {
      dispatch({ type: 'draft', draft: nextDraft });
      setDraftRecovered(false);
      if (sessionId) saveInterviewDraft(sessionId, nextDraft);
    },
    [dispatch, sessionId],
  );

  const clearDraft = useCallback((submittedSessionId: string) => {
    clearInterviewDraft(submittedSessionId);
    setDraftRecovered(false);
  }, []);

  return { clearDraft, draftRecovered, setDraft };
}
