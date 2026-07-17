import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import {
  createPracticeSession,
  getMasteryProfiles,
  getPracticeSession,
  submitPracticeAnswer,
  submitPracticeSession,
} from '@/lib/practice-api';
import type { BusyAction, PracticeState } from './types';
import { answerDrafts, errorMessage } from './practice-utils';
import {
  useNotifications,
  type NotificationApi,
} from '@/components/notifications/NotificationProvider';

export function usePracticeController(jobIntentId?: string) {
  const state = usePracticeState();
  const notifications = useNotifications();
  return {
    ...state,
    start: usePracticeStarter(state, notifications, jobIntentId),
    saveAnswer: usePracticeAnswerSaver(state, notifications),
    finish: usePracticeFinisher(state, notifications),
  };
}

function usePracticeState(): PracticeState {
  const [title, setTitle] = useState('我的专项练习');
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [report, setReport] = useState<PracticeReport | null>(null);
  const [mastery, setMastery] = useState<MasteryProfile[]>([]);
  const [busy, setBusy] = useState<PracticeState['busy']>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void refreshMastery(setMastery);
  }, []);
  return {
    title,
    session,
    drafts,
    report,
    mastery,
    busy,
    message,
    setTitle,
    setSession,
    setDrafts,
    setReport,
    setMastery,
    setBusy,
    setMessage,
  };
}

function usePracticeStarter(
  state: PracticeState,
  notifications: NotificationApi,
  jobIntentId?: string,
) {
  return async function start() {
    if (!jobIntentId) {
      const issue = '请先保存目标岗位，系统才能为你匹配对应训练题。';
      state.setMessage(issue);
      notifications.error('专项练习未创建', new Error(issue), issue);
      return;
    }
    state.setBusy('start');
    state.setMessage('');
    try {
      const next = await createPracticeSession({
        title: state.title.trim() || undefined,
        mode: 'smart',
        jobIntentId,
      });
      state.setSession(next);
      state.setReport(null);
      state.setDrafts(answerDrafts(next));
      state.setMessage('本轮专项练习已准备好，完成并保存每题后即可生成复盘。');
      notifications.success('专项练习已创建', '服务端已生成并保存本轮训练题单。');
    } catch (error) {
      state.setMessage(errorMessage(error));
      notifications.error('专项练习创建失败', error, '本轮专项练习没有创建，请稍后重试。');
    } finally {
      state.setBusy(null);
    }
  };
}

function usePracticeAnswerSaver(state: PracticeState, notifications: NotificationApi) {
  return async function saveAnswer(itemId: string) {
    if (!state.session) return;
    const answer = state.drafts[itemId]?.trim();
    if (!answer) {
      const issue = '请先完成回答后再保存。';
      state.setMessage(issue);
      notifications.error('回答未保存', new Error(issue), issue);
      return;
    }
    state.setBusy(('answer:' + itemId) as BusyAction);
    state.setMessage('');
    try {
      const next = await submitPracticeAnswer(state.session.id, itemId, { answer });
      state.setSession(next);
      state.setDrafts(answerDrafts(next));
      state.setMessage('回答已保存。');
      notifications.success('回答已保存', '服务端已记录本题回答。');
    } catch (error) {
      state.setMessage(errorMessage(error));
      notifications.error('回答保存失败', error, '回答没有保存，请稍后重试。');
    } finally {
      state.setBusy(null);
    }
  };
}

function usePracticeFinisher(state: PracticeState, notifications: NotificationApi) {
  return async function finish() {
    if (!state.session) return;
    state.setBusy('submit');
    state.setMessage('');
    try {
      const report = await submitPracticeSession(state.session.id);
      const [nextSession, profiles] = await Promise.all([
        getPracticeSession(state.session.id),
        getMasteryProfiles(),
      ]);
      state.setSession(nextSession);
      state.setReport(report);
      state.setMastery(profiles);
      state.setMessage('本轮复盘已生成，能力记录已同步更新。');
      notifications.success('本轮复盘已生成', '评分与能力记录已从服务端同步完成。');
    } catch (error) {
      state.setMessage(errorMessage(error));
      notifications.error('复盘生成失败', error, '本轮复盘没有生成，请稍后重试。');
    } finally {
      state.setBusy(null);
    }
  };
}

async function refreshMastery(setMastery: (profiles: MasteryProfile[]) => void) {
  try {
    setMastery(await getMasteryProfiles());
  } catch {
    setMastery([]);
  }
}
