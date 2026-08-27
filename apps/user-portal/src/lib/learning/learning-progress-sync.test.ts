import { describe, expect, it, vi } from 'vitest';
import type { UserLearningProgressPayload } from '@interview-agent/contracts';
import { emptyLearningProgress, type LearningProgress } from './learning-progress';
import {
  createLearningProgressSaveQueue,
  mergeLearningProgress,
  synchronizeLearningProgress,
  toLearningProgressState,
} from './learning-progress-sync';

const COURSE_A = '学习路线-01-agent基础与上下文工程';
const COURSE_B = '学习路线-02-tool-calling与mcp';

function localProgress(overrides: Partial<LearningProgress> = {}): LearningProgress {
  return { ...emptyLearningProgress(), ...overrides };
}

function verification(recordedAt: string, sessionId = 'practice-1') {
  return { sessionId, topic: 'ReAct', score: 80, answerCount: 3, recordedAt };
}

function remotePayload(progress: LearningProgress | null): UserLearningProgressPayload {
  if (!progress) return { progress: null };
  return {
    progress: {
      id: 'progress-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      updatedAt: '2026-08-27T00:00:00.000Z',
      ...toLearningProgressState(progress),
    },
  };
}

describe('mergeLearningProgress', () => {
  it('合并完成课程并集，本地打开记录优先，验证记录新者胜', () => {
    const local = localProgress({
      completedSlugs: [COURSE_B],
      lastOpenedSlug: COURSE_B,
      verificationByCourse: {
        [COURSE_A]: verification('2026-08-27T10:00:00.000Z', 'practice-new'),
      },
    });
    const remote = localProgress({
      completedSlugs: [COURSE_A],
      lastOpenedSlug: COURSE_A,
      verificationByCourse: {
        [COURSE_A]: verification('2026-08-26T10:00:00.000Z', 'practice-old'),
        [COURSE_B]: verification('2026-08-25T10:00:00.000Z', 'practice-remote'),
      },
    });

    const merged = mergeLearningProgress(local, toLearningProgressState(remote));

    expect([...merged.completedSlugs].sort()).toEqual([COURSE_A, COURSE_B]);
    expect(merged.lastOpenedSlug).toBe(COURSE_B);
    expect(merged.verificationByCourse[COURSE_A]?.sessionId).toBe('practice-new');
    expect(merged.verificationByCourse[COURSE_B]?.sessionId).toBe('practice-remote');
  });

  it('本地没有打开记录时保留服务端记录', () => {
    const merged = mergeLearningProgress(
      localProgress(),
      toLearningProgressState(localProgress({ lastOpenedSlug: COURSE_A })),
    );
    expect(merged.lastOpenedSlug).toBe(COURSE_A);
  });
});

describe('synchronizeLearningProgress 首次同步', () => {
  it('服务端为空且本地为空时不做写入', async () => {
    const write = vi.fn();
    const result = await synchronizeLearningProgress(
      localProgress(),
      async () => remotePayload(null),
      write,
    );
    expect(result.source).toBe('in-sync');
    expect(write).not.toHaveBeenCalled();
  });

  it('服务端为空且本地有进度时上传本地进度', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const local = localProgress({ completedSlugs: [COURSE_A] });
    const result = await synchronizeLearningProgress(local, async () => remotePayload(null), write);
    expect(result.source).toBe('uploaded');
    expect(write).toHaveBeenCalledWith(toLearningProgressState(local));
  });

  it('本地新增进度时把合并结果回写服务端', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const local = localProgress({ completedSlugs: [COURSE_B] });
    const remote = localProgress({ completedSlugs: [COURSE_A] });
    const result = await synchronizeLearningProgress(
      local,
      async () => remotePayload(remote),
      write,
    );
    expect(result.source).toBe('uploaded');
    expect([...result.progress.completedSlugs].sort()).toEqual([COURSE_A, COURSE_B]);
    expect(write).toHaveBeenCalledTimes(1);
  });
});

describe('synchronizeLearningProgress 一致与降级', () => {
  it('合并结果与服务端一致时不再写入', async () => {
    const write = vi.fn();
    const remote = localProgress({ completedSlugs: [COURSE_A], lastOpenedSlug: COURSE_A });
    const result = await synchronizeLearningProgress(
      localProgress({ completedSlugs: [COURSE_A] }),
      async () => remotePayload(remote),
      write,
    );
    expect(result.source).toBe('in-sync');
    expect(write).not.toHaveBeenCalled();
  });

  it('读取失败时回退本地进度且不中断', async () => {
    const local = localProgress({ completedSlugs: [COURSE_A] });
    const result = await synchronizeLearningProgress(
      local,
      async () => {
        throw new Error('network');
      },
      vi.fn(),
    );
    expect(result).toEqual({ progress: local, source: 'local-only' });
  });

  it('写入失败时仍返回合并后的进度', async () => {
    const local = localProgress({ completedSlugs: [COURSE_B] });
    const result = await synchronizeLearningProgress(
      local,
      async () => remotePayload(localProgress({ completedSlugs: [COURSE_A] })),
      async () => {
        throw new Error('network');
      },
    );
    expect(result.source).toBe('local-only');
    expect([...result.progress.completedSlugs].sort()).toEqual([COURSE_A, COURSE_B]);
  });
});

describe('createLearningProgressSaveQueue', () => {
  it('保存进行中时只保留最新一次进度', async () => {
    const saved: string[][] = [];
    let blocked = false;
    let release: () => void = () => {};
    const queue = createLearningProgressSaveQueue(async (state) => {
      saved.push(state.completedSlugs);
      if (!blocked) {
        blocked = true;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
      }
    });

    queue.enqueue(localProgress({ completedSlugs: [COURSE_A] }));
    queue.enqueue(localProgress({ completedSlugs: [] }));
    queue.enqueue(localProgress({ completedSlugs: [COURSE_A, COURSE_B] }));
    release();
    await queue.idle();

    expect(saved).toEqual([[COURSE_A], [COURSE_A, COURSE_B]]);
  });

  it('重置后不再消费排队中的进度', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const queue = createLearningProgressSaveQueue(save);
    queue.reset();
    await queue.idle();
    expect(save).not.toHaveBeenCalled();
  });
});
