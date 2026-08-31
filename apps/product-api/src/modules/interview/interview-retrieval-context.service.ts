import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgentRuntimeRetrievalContext } from '@interview-agent/contracts';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { errorCategory } from '../../common/telemetry/telemetry';
import { RetrievalService } from '../retrieval/retrieval.service';

const INTERVIEW_RETRIEVAL_LIMIT = 6;

type InterviewRetrievalInput = {
  context: ProductRequestContext;
  answer: string | undefined;
  session: { title: string };
};

@Injectable()
export class InterviewRetrievalContextService {
  private readonly logger = new Logger(InterviewRetrievalContextService.name);

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly retrieval: RetrievalService,
  ) {}

  async forCommand(input: InterviewRetrievalInput): Promise<AgentRuntimeRetrievalContext[]> {
    if (!this.config.get('RAG_INTERVIEW_ENABLED', { infer: true })) return [];
    try {
      const response = await this.retrieval.search(input.context, {
        query: input.answer ?? input.session.title,
        purpose: 'interview',
        limit: INTERVIEW_RETRIEVAL_LIMIT,
      });
      return response.hits.slice(0, INTERVIEW_RETRIEVAL_LIMIT).map((hit) => ({
        sourceId: hit.id,
        entityType: hit.entityType,
        content: hit.content,
      }));
    } catch (error) {
      this.logger.warn(
        `Interview retrieval context unavailable; command continues without RAG: ${errorCategory(error)} (trace=${input.context.traceId})`,
      );
      return [];
    }
  }
}
