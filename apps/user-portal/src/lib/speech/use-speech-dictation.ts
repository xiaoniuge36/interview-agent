'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  IDLE_DICTATION,
  createSpeechRecognition,
  dictationReducer,
  splitRecognitionResults,
  type SpeechRecognitionLike,
} from './speech-dictation';

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

  const toggle = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (stateRef.current.listening) {
      recognition.stop();
      return;
    }
    try {
      recognition.start();
      dispatch({ type: 'start' });
    } catch {
      // start() 在已启动时会抛 InvalidStateError；保持监听状态即可。
    }
  }, []);

  return {
    supported,
    listening: state.listening,
    interim: state.interim,
    error: state.error,
    toggle,
    stop,
  };
}

function wireRecognition(
  recognition: SpeechRecognitionLike,
  dispatch: (event: Parameters<typeof dictationReducer>[1]) => void,
  onFinal: (transcript: string) => void,
) {
  recognition.onresult = (event) => {
    const { finalTranscript, interimTranscript } = splitRecognitionResults(event);
    if (finalTranscript) {
      onFinal(finalTranscript);
      dispatch({ type: 'final' });
    }
    if (interimTranscript) dispatch({ type: 'interim', transcript: interimTranscript });
  };
  recognition.onerror = (event) => dispatch({ type: 'error', code: event.error });
  recognition.onend = () => dispatch({ type: 'end' });
  return () => {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
  };
}
