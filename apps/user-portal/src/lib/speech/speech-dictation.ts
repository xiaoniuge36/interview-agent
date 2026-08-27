/** Web Speech API 的最小接口面；lib.dom 未内置该类型，浏览器兼容以 webkit 前缀为主。 */
export type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export function createSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as SpeechWindow;
  const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!Recognition) return null;
  const recognition = new Recognition();
  recognition.lang = 'zh-CN';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

export type DictationState = {
  listening: boolean;
  interim: string;
  error: string | null;
};

export type DictationEvent =
  | { type: 'start' }
  | { type: 'interim'; transcript: string }
  | { type: 'final' }
  | { type: 'error'; code: string }
  | { type: 'end' };

export const IDLE_DICTATION: DictationState = { listening: false, interim: '', error: null };

export function dictationReducer(state: DictationState, event: DictationEvent): DictationState {
  switch (event.type) {
    case 'start':
      return { listening: true, interim: '', error: null };
    case 'interim':
      return { ...state, interim: event.transcript };
    case 'final':
      return { ...state, interim: '' };
    case 'error':
      return { listening: false, interim: '', error: dictationErrorMessage(event.code) };
    case 'end':
      return { ...state, listening: false, interim: '' };
  }
}

/** 语音段落拼接：识别结果直接续写在既有草稿后，草稿为空时避免多余前导空白。 */
export function appendTranscript(base: string, transcript: string): string {
  const addition = transcript.trim();
  if (!addition) return base;
  if (!base.trim()) return addition;
  return `${base.replace(/\s+$/, '')}${addition}`;
}

/** 拆分一次识别事件里的增量结果：final 直接入稿，interim 仅作预览。 */
export function splitRecognitionResults(event: SpeechRecognitionEventLike): {
  finalTranscript: string;
  interimTranscript: string;
} {
  let finalTranscript = '';
  let interimTranscript = '';
  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index]!;
    if (result.isFinal) finalTranscript += result[0].transcript;
    else interimTranscript += result[0].transcript;
  }
  return { finalTranscript, interimTranscript };
}

function dictationErrorMessage(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '麦克风权限被拒绝，请在浏览器地址栏允许麦克风后重试。';
  }
  if (code === 'no-speech') return '没有听到声音，请靠近麦克风再试一次。';
  if (code === 'audio-capture') return '未检测到可用麦克风设备。';
  return '语音识别暂时不可用，请改用键盘输入。';
}
