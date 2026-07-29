import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { MemoryModule } from '../memory/memory.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { PracticeCommandService } from './practice-command.service';
import { PracticeCompletionService } from './practice-completion.service';
import { PracticeController } from './practice.controller';
import { PracticeQueryService } from './practice-query.service';
import { PracticeRecommendationService } from './practice-recommendation.service';
import { PracticeRagRecommendationService } from './practice-rag-recommendation.service';
import { PracticeReportPlannerService } from './practice-report-planner.service';
import { PracticeEvaluationCommandService } from './practice-evaluation-command.service';
import { PracticeEvaluationInfrastructure } from './practice-evaluation-infrastructure';
import { PracticeModelEvaluator } from './practice-model-evaluator';
import { PracticeService } from './practice.service';
import { PracticeWriteService } from './practice-write.service';

@Module({
  imports: [
    CommonModule,
    AgentRuntimeModule,
    AiUsageModule,
    ModelCredentialModule,
    MemoryModule,
    RetrievalModule,
  ],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    PracticeCommandService,
    PracticeQueryService,
    PracticeRecommendationService,
    PracticeRagRecommendationService,
    PracticeReportPlannerService,
    PracticeModelEvaluator,
    PracticeEvaluationInfrastructure,
    PracticeEvaluationCommandService,
    PracticeCompletionService,
    PracticeWriteService,
  ],
})
export class PracticeModule {}
