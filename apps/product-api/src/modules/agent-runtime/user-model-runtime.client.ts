import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { AgentRuntimeNextResponseSchema } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { IncrementalJsonFieldDecoder } from '../../common/streaming/incremental-json-field-decoder';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import { ModelProviderClient, ModelProviderError } from '../model-credential/model-provider.client';
import type { AgentNextInput, AgentNextResult, AgentRuntimeProgress } from './agent-runtime.types';

type UserModelNextInput = { context: ProductRequestContext; input: AgentNextInput };

@Injectable()
export class UserModelRuntimeClient {
  constructor(
    private readonly credentials: ModelCredentialService,
    private readonly provider: ModelProviderClient,
  ) {}

  async next({ context, input }: UserModelNextInput): Promise<AgentNextResult> {
    const credential = await this.credentials.resolveDefault(context);
    if (!credential) throw connectionRequired();
    const startedAt = performance.now();
    try {
      const content = await this.provider.complete({
        ...credential,
        systemPrompt: systemPrompt(input),
        userPrompt: userPrompt(input),
      });
      return runtimeResult(parseDecision(content), startedAt);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw providerFailure(error);
    }
  }

  async nextStream(
    { context, input }: UserModelNextInput,
    progress: AgentRuntimeProgress,
  ): Promise<AgentNextResult> {
    const credential = await this.credentials.resolveDefault(context);
    if (!credential) throw connectionRequired();
    const startedAt = performance.now();
    const decoder = new IncrementalJsonFieldDecoder('content');
    let content = '';
    try {
      for await (const delta of this.provider.stream({
        ...credential,
        systemPrompt: systemPrompt(input),
        userPrompt: userPrompt(input),
        ...(progress.signal ? { signal: progress.signal } : {}),
      })) {
        content += delta;
        const visible = decoder.push(delta);
        if (visible) progress.onContentDelta?.(visible);
      }
      return runtimeResult(parseDecision(content), startedAt);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw providerFailure(error);
    }
  }
}

function runtimeResult(
  decision: ReturnType<typeof parseDecision>,
  startedAt: number,
): AgentNextResult {
  const { basisSummary, ...next } = decision;
  return {
    ...next,
    ...(basisSummary ? { basisSummary } : {}),
    latencyMs: elapsed(startedAt),
    attempts: 1,
    fallbackUsed: false,
    schemaValid: true,
  };
}

function systemPrompt(input: AgentNextInput) {
  return [
    '请先输出 content 字段；可选 basisSummary 最多三条，只能引用用户回答、岗位要求或评分标准中的可解释证据。',
    '你是专业的中文模拟面试官。基于候选人的最近回答推进面试。',
    '只返回 JSON，不要 Markdown，不要解释。',
    'JSON 格式：{"stage":"当前或下一阶段","content":"给用户的问题或结束语","shouldFinish":false}。',
    `可用阶段：warmup, self_intro, tech_basics, jd_core, project_deep_dive, scenario_design, hr, final_evaluation。`,
    `当前阶段：${input.session.stage}；候选人已回答 ${input.session.candidateTurnCount} 次。`,
  ].join('\n');
}

function userPrompt(input: AgentNextInput) {
  const history = input.session.recentTurns
    .map((turn) => `${turn.role === 'candidate' ? '候选人' : '面试官'}：${turn.content}`)
    .join('\n');
  return [
    `面试主题：${input.session.title}`,
    history ? `最近对话：\n${history}` : '这是面试开始，请提出第一题。',
    input.answer ? `本次回答：${input.answer}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function parseDecision(value: string) {
  try {
    return AgentRuntimeNextResponseSchema.parse({
      contractVersion: 'interview-runtime.v1',
      ...JSON.parse(stripCodeFence(value)),
    });
  } catch {
    throw new BadGatewayException({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用的面试决策，请重试或更换模型连接。',
    });
  }
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
}

function connectionRequired() {
  return new BadRequestException({
    code: 'MODEL_CONNECTION_REQUIRED',
    message: '请先在设置中心连接并测试一个 AI 模型，再开始模拟面试。',
  });
}

function providerFailure(error: unknown) {
  const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
  return new BadGatewayException({ code, message: '模型连接暂时不可用，请测试连接或稍后重试。' });
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
