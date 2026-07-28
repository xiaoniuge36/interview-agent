import type { TrainingContinuation } from './training-continuation';

export type HomeWelcome = {
  title: string;
  detail: string;
};

export function createHomeWelcome(
  displayName: string | null | undefined,
  continuation: TrainingContinuation | null,
): HomeWelcome {
  const name = displayName?.trim();
  if (continuation) {
    return {
      title: name ? `欢迎回来，${name}` : '欢迎回来',
      detail: '上次的训练还在这里等你',
    };
  }
  return {
    title: name ? `你好，${name}` : '你好',
    detail: '今天，先完成一小步就很好',
  };
}
