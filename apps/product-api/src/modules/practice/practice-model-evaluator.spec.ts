import type { ProductRequestContext } from '../../common/context/request-context';
import { PracticeModelEvaluator } from './practice-model-evaluator';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'user-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: ['model_credential:read'],
  },
};
const credential = {
  id: 'credential-1',
  provider: 'deepseek' as const,
  model: 'deepseek-chat',
  baseUrl: null,
  apiKey: 'sk-decrypted',
};
const input = {
  title: '如何划分订单系统的模块边界？',
  stem: '说明订单、库存、支付之间的职责边界和失败恢复。',
  options: [],
  answer: '订单负责交易主流程，库存和支付通过事件协作。',
  referenceAnswer: '明确职责边界，并通过幂等、补偿和重试处理失败。',
  rubric: [{ point: '失败恢复', score: 10, description: '说明幂等、补偿或重试。' }],
  tags: ['系统设计', '订单'],
  targetRole: '后端工程师',
  practiceSessionId: 'practice-1',
  practiceItemId: 'item-1',
};

describe('PracticeModelEvaluator', () => {
  it('uses the caller verified model and validates structured feedback', async () => {
    const { evaluator, credentials, provider, invocations } = createEvaluator();

    const result = await evaluator.evaluate(context, input);

    expect(credentials.resolveDefault).toHaveBeenCalledWith(context);
    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'deepseek', apiKey: 'sk-decrypted' }),
    );
    expect(invocations.measure).toHaveBeenCalledWith(
      expect.objectContaining({ operation: 'practice_evaluation', practiceItemId: 'item-1' }),
      expect.any(Function),
    );
    expect(result).toEqual({
      score: 82,
      feedback: '职责边界清晰，但失败恢复需要展开。',
      missingPoints: ['失败恢复'],
      rubricScores: [{ point: '失败恢复', score: 55 }],
      followUpQuestion: '支付成功但库存扣减失败时如何补偿？',
    });
  });

  it('rejects AI evaluation when no verified default model exists', async () => {
    const { evaluator } = createEvaluator(null);

    await expect(evaluator.evaluate(context, input)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_CONNECTION_REQUIRED' }),
    });
  });

  it('rejects invalid model JSON instead of using a local score fallback', async () => {
    const { evaluator, provider } = createEvaluator();
    provider.complete.mockResolvedValue('not-json');

    await expect(evaluator.evaluate(context, input)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MODEL_PROVIDER_RESPONSE_INVALID' }),
    });
  });
});

describe('PracticeModelEvaluator objective and streaming behavior', () => {
  it('includes objective options in the evaluation prompt', async () => {
    const { evaluator, provider } = createEvaluator();

    await evaluator.evaluate(context, {
      ...input,
      answer: 'B',
      options: [
        { id: 'A', text: '单体执行' },
        { id: 'B', text: '状态机编排' },
      ],
    });

    expect(provider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ userPrompt: expect.stringContaining('B. 状态机编排') }),
    );
  });

  it('waits for an async feedback sink before pulling another provider chunk', async () => {
    const iterator = feedbackStream();
    const next = jest.spyOn(iterator, 'next');
    const { evaluator } = createEvaluator(credential, () => iterator);
    let release: () => void = () => undefined;
    let notifySinkStarted: () => void = () => undefined;
    const sinkStarted = new Promise<void>((resolve) => {
      notifySinkStarted = () => resolve();
    });
    const onDelta = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            release = () => resolve();
            notifySinkStarted();
          }),
      )
      .mockResolvedValue(undefined);
    const result = evaluator.evaluateStream(context, input, {
      onDelta,
      onComplete: jest.fn(),
    });

    await sinkStarted;

    expect(next).toHaveBeenCalledTimes(1);
    release();
    await expect(result).resolves.toMatchObject({ feedback: 'First second', score: 82 });
    expect(next).toHaveBeenCalledTimes(3);
    expect(onDelta).toHaveBeenCalledTimes(2);
  });
});

function createEvaluator(
  resolved: typeof credential | null = credential,
  stream: () => AsyncGenerator<string> = feedbackStream,
) {
  const credentials = { resolveDefault: jest.fn().mockResolvedValue(resolved) };
  const provider = {
    complete: jest.fn().mockResolvedValue(
      JSON.stringify({
        score: 82,
        feedback: '职责边界清晰，但失败恢复需要展开。',
        missingPoints: ['失败恢复'],
        rubricScores: [{ point: '失败恢复', score: 55 }],
        followUpQuestion: '支付成功但库存扣减失败时如何补偿？',
      }),
    ),
    stream: jest.fn(stream),
  };
  const invocations = {
    measure: jest.fn((_metadata, run) => run(jest.fn())),
  };
  return {
    evaluator: new PracticeModelEvaluator(
      credentials as never,
      provider as never,
      invocations as never,
    ),
    credentials,
    provider,
    invocations,
  };
}

async function* feedbackStream(): AsyncGenerator<string> {
  yield '{"feedback":"First';
  yield ' second","score":82,"missingPoints":[],"rubricScores":[],"followUpQuestion":null}';
}
