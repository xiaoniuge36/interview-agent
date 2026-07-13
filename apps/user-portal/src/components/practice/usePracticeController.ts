import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import { useEffect, useState } from 'react';
import {
  createPracticeSession,
  getMasteryProfiles,
  getPracticeSession,
  submitPracticeAnswer,
  submitPracticeSession,
} from '@/lib/practice-api';
import type { PracticeState } from './types';
import { answerDrafts, errorMessage } from './practice-utils';

export function usePracticeController() {
  const state = usePracticeState();
  return {
    ...state,
    start: usePracticeStarter(state),
    saveAnswer: usePracticeAnswerSaver(state),
    finish: usePracticeFinisher(state),
  };
}

function usePracticeState(): PracticeState {
  const [title, setTitle] = useState('Focused practice');
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

function usePracticeStarter(state: PracticeState) {
  return async function start() {
    state.setBusy('start');
    state.setMessage('');
    try {
      const next = await createPracticeSession({
        title: state.title.trim() || undefined,
        mode: 'smart',
      });
      state.setSession(next);
      state.setReport(null);
      state.setDrafts(answerDrafts(next));
    } catch (error) {
      state.setMessage(errorMessage(error));
    } finally {
      state.setBusy(null);
    }
  };
}

function usePracticeAnswerSaver(state: PracticeState) {
  return async function saveAnswer(itemId: string) {
    if (!state.session) return;
    const answer = state.drafts[itemId]?.trim();
    if (!answer) {
      state.setMessage('Enter an answer before saving.');
      return;
    }
    state.setBusy(`answer:${itemId}`);
    state.setMessage('');
    try {
      const next = await submitPracticeAnswer(state.session.id, itemId, { answer });
      state.setSession(next);
      state.setDrafts(answerDrafts(next));
    } catch (error) {
      state.setMessage(errorMessage(error));
    } finally {
      state.setBusy(null);
    }
  };
}

function usePracticeFinisher(state: PracticeState) {
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
    } catch (error) {
      state.setMessage(errorMessage(error));
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
