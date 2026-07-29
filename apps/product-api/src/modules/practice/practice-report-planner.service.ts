import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AgentRuntimeRetrievalContext,
  PracticeReportRuntimeResponse,
} from '@interview-agent/contracts';
import type { Environment } from '../../common/config/environment';
import type { ProductRequestContext } from '../../common/context/request-context';
import { withTraceSpan } from '../../common/telemetry/telemetry';
import { AgentRuntimeClient } from '../agent-runtime/agent-runtime.client';
import { RetrievalService } from '../retrieval/retrieval.service';
import type { SessionRecord } from './practice-mappers';
import { visiblePracticeTags } from './practice-question-categories';

const REPORT_RETRIEVAL_LIMIT = 6;
const REPORT_QUALITY_GATE_PASSED = true;

@Injectable()
export class PracticeReportPlannerService {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly retrieval: RetrievalService,
    private readonly runtime: AgentRuntimeClient,
  ) {}

  async plan(
    context: ProductRequestContext,
    session: SessionRecord,
  ): Promise<PracticeReportRuntimeResponse | null> {
    return withTraceSpan(
      'practice.report.command',
      {
        'interview_agent.trace_id': context.traceId,
        'session.id': session.id,
        operation: 'practice_report',
      },
      () => this.planScoped(context, session),
    );
  }

  private async planScoped(
    context: ProductRequestContext,
    session: SessionRecord,
  ): Promise<PracticeReportRuntimeResponse | null> {
    try {
      const retrievalContext = await this.retrievalContext(context, session);
      return await this.runtime.report(
        {
          session: sessionContext(session),
          evaluations: session.items.map(evaluationContext),
          ...(retrievalContext.length ? { retrievalContext } : {}),
          commandId: `practice-report:${session.id}`,
          traceId: context.traceId,
        },
        context,
      );
    } catch {
      return null;
    }
  }

  private async retrievalContext(
    context: ProductRequestContext,
    session: SessionRecord,
  ): Promise<AgentRuntimeRetrievalContext[]> {
    if (!REPORT_QUALITY_GATE_PASSED) return [];
    if (!this.config.get('RAG_REPORT_ENABLED', { infer: true })) return [];
    try {
      const response = await this.retrieval.search(context, {
        query: reportQuery(session),
        purpose: 'report',
        limit: REPORT_RETRIEVAL_LIMIT,
      });
      return response.hits.slice(0, REPORT_RETRIEVAL_LIMIT).map((hit) => ({
        sourceId: hit.id,
        entityType: hit.entityType,
        content: hit.content,
      }));
    } catch {
      return [];
    }
  }
}

function sessionContext(session: SessionRecord) {
  return {
    id: session.id,
    tenantId: session.tenantId,
    userId: session.userId,
    title: session.title,
  };
}

function evaluationContext(item: SessionRecord['items'][number]) {
  const evaluation = item.evaluation!;
  return {
    itemId: item.id,
    questionId: item.questionId,
    questionTitle: item.question.title,
    questionTags: visiblePracticeTags(item.question.tags),
    score: evaluation.score,
    feedback: evaluation.feedback,
    missingPoints: evaluation.missingPoints,
  };
}

function reportQuery(session: SessionRecord) {
  const weaknesses = session.items.flatMap((item) => item.evaluation?.missingPoints ?? []);
  return [session.title, ...new Set(weaknesses)].join(' ');
}
