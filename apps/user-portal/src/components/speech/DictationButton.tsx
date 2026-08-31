'use client';

import '@/app/styles/speech-dictation.css';
import { useEffect } from 'react';
import { useSpeechDictation } from '@/lib/speech/use-speech-dictation';

type DictationButtonProps = {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
};

/** 语音输入按钮：浏览器不支持 Web Speech API 时保留禁用态并说明原因，而不是整体消失。 */
export function DictationButton({ onTranscript, disabled = false }: DictationButtonProps) {
  const dictation = useSpeechDictation({ onFinal: onTranscript });
  useEffect(() => {
    // 提交等场景触发 disabled 时用 abort 丢弃识别中的结果：
    // stop() 之后引擎仍会补投最后的 final，会污染已提交的回答或下一题草稿。
    if (disabled) dictation.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- abort 引用稳定，仅需响应 disabled。
  }, [disabled]);
  if (!dictation.supported) return <UnsupportedDictationButton />;
  return (
    <span className="dictation-control" data-listening={dictation.listening}>
      <button
        type="button"
        className="dictation-button"
        disabled={disabled}
        aria-pressed={dictation.listening}
        onClick={dictation.toggle}
      >
        <MicIcon />
        {dictation.listening ? '停止语音' : '语音输入'}
      </button>
      {dictation.listening ? (
        <em className="dictation-live" role="status">
          {dictation.interim || '正在聆听…'}
        </em>
      ) : null}
      {!dictation.listening && dictation.error ? (
        <em className="dictation-error" role="status">
          {dictation.error}
        </em>
      ) : null}
    </span>
  );
}

function UnsupportedDictationButton() {
  return (
    <span className="dictation-control" data-supported="false">
      <button
        type="button"
        className="dictation-button"
        disabled
        title="当前浏览器不支持语音输入"
        aria-label="语音输入（当前浏览器不支持）"
      >
        <MicIcon />
        语音输入
      </button>
    </span>
  );
}

function MicIcon() {
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
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </svg>
  );
}
