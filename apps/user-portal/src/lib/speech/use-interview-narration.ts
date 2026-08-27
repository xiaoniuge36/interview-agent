'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InterviewTurn } from '@interview-agent/contracts';
import {
  interviewerTurnIds,
  narrationSupported,
  nextNarrationTurn,
  speakText,
  stopNarration,
} from './speech-narration';

const STORAGE_KEY = 'interview-agent.narration';

export type InterviewNarration = {
  supported: boolean;
  enabled: boolean;
  toggle: () => void;
  speak: (text: string) => void;
};

/** 面试官新消息自动朗读；偏好持久化在本地，默认关闭以免打扰。 */
export function useInterviewNarration(turns: readonly InterviewTurn[]): InterviewNarration {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const spokenRef = useRef(new Set<string>());
  const previousCountRef = useRef(0);

  useEffect(() => {
    setSupported(narrationSupported());
    setEnabled(readStoredPreference());
  }, []);

  useEffect(() => {
    const previousCount = previousCountRef.current;
    previousCountRef.current = turns.length;
    const next = nextNarrationTurn(turns, previousCount, spokenRef.current);
    // 关闭状态也要标记已读，避免开启开关的瞬间补读旧消息。
    interviewerTurnIds(turns).forEach((id) => spokenRef.current.add(id));
    if (next && enabled) speakText(next.content);
  }, [turns, enabled]);

  useEffect(() => stopNarration, []);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (!next) stopNarration();
      persistPreference(next);
      return next;
    });
  }, []);

  return { supported, enabled, toggle, speak: speakText };
}

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

function persistPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    // 隐私模式等场景下静默失败，偏好仅在本次会话内生效。
  }
}
