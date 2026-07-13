import type { MasteryProfile, PracticeReport, PracticeSession } from '@interview-agent/contracts';
import type { Dispatch, SetStateAction } from 'react';

export type BusyAction = 'start' | 'submit' | `answer:${string}` | null;

export type PracticeState = {
  title: string;
  session: PracticeSession | null;
  drafts: Record<string, string>;
  report: PracticeReport | null;
  mastery: MasteryProfile[];
  busy: BusyAction;
  message: string;
  setTitle: Dispatch<SetStateAction<string>>;
  setSession: Dispatch<SetStateAction<PracticeSession | null>>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  setReport: Dispatch<SetStateAction<PracticeReport | null>>;
  setMastery: Dispatch<SetStateAction<MasteryProfile[]>>;
  setBusy: Dispatch<SetStateAction<BusyAction>>;
  setMessage: Dispatch<SetStateAction<string>>;
};
