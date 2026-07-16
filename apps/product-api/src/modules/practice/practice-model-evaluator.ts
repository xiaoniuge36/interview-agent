import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PracticeEvaluationSchema, type RubricPoint } from '@interview-agent/contracts';
import type { ProductRequestContext } from '../../common/context/request-context';
import { ModelCredentialService } from '../model-credential/model-credential.service';
import {
  ModelProviderClient,
  ModelProviderError,
} from '../model-credential/model-provider.client';

const EvaluationDraftSchema = PracticeEvaluationSchema.pick({
  score: true,
  feedback: true,
  missingPoints: true,
  rubricScores: true,
  followUpQuestion: true,
});

export type PracticeModelEvaluationInput = {
  title: string;
  stem: string;
  answer: string;
  referenceAnswer: string;
  rubric: RubricPoint[];
  tags: string[];
  targetRole?: string;
};

@Injectable()
export class PracticeModelEvaluator {
  constructor(
    private readonly credentials: ModelCredentialService,
    private readonly provider: ModelProviderClient,
  ) {}

  async evaluate(context: ProductRequestContext, input: PracticeModelEvaluationInput) {
    const credential = await this.credentials.resolveDefault(context);
    if (!credential) throw connectionRequired();
    try {
      const content = await this.provider.complete({
        ...credential,
        systemPrompt: systemPrompt(),
        userPrompt: userPrompt(input),
      });
      return parseEvaluation(content);
    } catch (error) {
      if (error instanceof BadGatewayException || error instanceof BadRequestException) throw error;
      throw providerFailure(error);
    }
  }
}

function systemPrompt() {
  return [
    '你是专业的中文面试训练教练，需要严格评价用户对当前题目的回答。',
    '只返回 JSON，不要 Markdown，不要解释。',
    'JSON 字段：score(0-100)、feedback、missingPoints、rubricScores、followUpQuestion。',
    'rubricScores 中每项必须包含 point 与 score(0-100)。',
    'followUpQuestion 必须针对用户当前回答中的具体缺口提出一个追问。',
  ].join('\n');
}

function userPrompt(input: PracticeModelEvaluationInput) {
  return [
    `目标岗位：${input.targetRole ?? '通用面试能力'}`,
    `题目：${input.title}`,
    `题干：${input.stem}`,
    `能力标签：${input.tags.join('、') || '无'}`,
    `评分标准：${JSON.stringify(input.rubric)}`,
    `参考答案：${input.referenceAnswer}`,
    `用户回答：${input.answer}`,
  ].join('\n\n');
}

function parseEvaluation(value: string) {
  try {
    return EvaluationDraftSchema.parse(JSON.parse(stripCodeFence(value)));
  } catch {
    throw new BadGatewayException({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用的题目评价，请重试或更换模型连接。',
    });
  }
}

function stripCodeFence(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function connectionRequired() {
  return new BadRequestException({
    code: 'MODEL_CONNECTION_REQUIRED',
    message: '请先在设置中心连接并测试一个 AI 模型，再获取 AI 评分与追问。',
  });
}

function providerFailure(error: unknown) {
  const code = error instanceof ModelProviderError ? error.code : 'MODEL_PROVIDER_UNAVAILABLE';
  return new BadGatewayException({
    code,
    message: '模型连接暂时不可用，已保存的回答不会丢失。',
  });
}
