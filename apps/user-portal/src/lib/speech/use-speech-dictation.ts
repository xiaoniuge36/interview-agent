'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  IDLE_DICTATION,
  createSpeechRecognition,
  dictationReducer,
  splitRecognitionResults,
  type SpeechRecognitionLike,
} from './speech-dictation';
import { onNarrationStart } from './speech-narration';

type UseSpeechDictationOptions = {
  onFinal: (transcript: string) => void;
};

/** 语音听写：final 结果通过 onFinal 追加到调用方草稿，interim 仅用于实时预览。 */
export function useSpeechDictation(options: UseSpeechDictationOptions) {
  const [supported, setSupported] = useState(false);
  const [state, dispatch] = useReducer(dictationReducer, IDLE_DICTATION);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(options.onFinal);
  onFinalRef.current = options.onFinal;

  useEffect(() => {
    const recognition = createSpeechRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    setSupported(true);
    const unwire = wireRecognition(recognition, dispatch, (transcript) =>
      onFinalRef.current(transcript),
    );
    return () => {
      unwire();
      recognitionRef.current = null;
    };
  }, []);

  // toggle 需要读取最新 listening 状态但不应因状态变化而重建回调。
  const stateRef = useRef(state);
  stateRef.current = state;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  // abort 丢弃识别中的结果：提交答案等场景下，迟到的 final 不应再写入草稿。
  const abort = useCallback(() => {
    recognitionRef.current?.abort();
  }, []);

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (stateRef.current.listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
    } catch {
      // start() 在已启动时会抛 InvalidStateError；引擎确实在跑，照常同步状态。
    }
    dispatch({ type: 'start' });
  }, []);

  return {
    supported,
    listening: state.listening,
    interim: state.interim,
    error: state.error,
    toggle,
    stop,
    abort,
  };
}

function wireRecognition(
  recognition: SpeechRecognitionLike,
  dispatch: (event: Parameters<typeof dictationReducer>[1]) => void,
  onFinal: (transcript: string) => void,
) {
  // 记录已消费的 final 序号，规避移动端 continuous 模式重复投递同一句 final。
  let consumedFinals = -1;
  recognition.onresult = (event) => {
    const { finalTranscript, interimTranscript, lastFinalIndex } = splitRecognitionResults(
      event,
      consumedFinals,
    );
    consumedFinals = lastFinalIndex;
    if (finalTranscript) {
      onFinal(finalTranscript);
      dispatch({ type: 'final' });
    }
    if (interimTranscript) dispatch({ type: 'interim', transcript: interimTranscript });
  };
  recognition.onerror = (event) => dispatch({ type: 'error', code: event.error });
  recognition.onend = () => {
    consumedFinals = -1;
    dispatch({ type: 'end' });
  };
  const onHidden = () => {
    // 切到后台时停止采集，避免环境音持续写进草稿。
    if (document.visibilityState === 'hidden') recognition.stop();
  };
  document.addEventListener('visibilitychange', onHidden);
  // 朗读开始时暂停听写，避免扬声器里的面试官声音被回录进回答。
  const offNarration = onNarrationStart(() => recognition.stop());
  return () => {
    document.removeEventListener('visibilitychange', onHidden);
    offNarration();
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
  };
}
