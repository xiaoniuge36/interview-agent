'use client';

import type { InterviewNarration } from '@/lib/speech/use-interview-narration';

/** 面试官自动朗读开关：浏览器不支持 speechSynthesis 时整体隐藏。 */
export function NarrationToggle({ narration }: { narration: InterviewNarration }) {
  if (!narration.supported) return null;
  return (
    <button
      type="button"
      className="narration-toggle"
      aria-pressed={narration.enabled}
      title={narration.enabled ? '关闭面试官问题自动朗读' : '开启后面试官的新问题会自动朗读'}
      onClick={narration.toggle}
    >
      <SpeakerWaveIcon muted={!narration.enabled} />
      {narration.enabled ? '朗读已开' : '自动朗读'}
    </button>
  );
}

function SpeakerWaveIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      {muted ? <path d="M16 9l5 6M21 9l-5 6" /> : <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" />}
    </svg>
  );
}
