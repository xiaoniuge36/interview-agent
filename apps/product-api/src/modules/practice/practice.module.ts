import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { ModelCredentialModule } from '../model-credential/model-credential.module';
import { PracticeCommandService } from './practice-command.service';
import { PracticeCompletionService } from './practice-completion.service';
import { PracticeController } from './practice.controller';
import { PracticeQueryService } from './practice-query.service';
import { PracticeRecommendationService } from './practice-recommendation.service';
import { PracticeEvaluationCommandService } from './practice-evaluation-command.service';
import { PracticeEvaluationInfrastructure } from './practice-evaluation-infrastructure';
import { PracticeModelEvaluator } from './practice-model-evaluator';
import { PracticeService } from './practice.service';
import { PracticeWriteService } from './practice-write.service';

@Module({
  imports: [CommonModule, AiUsageModule, ModelCredentialModule],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    PracticeCommandService,
    PracticeQueryService,
    PracticeRecommendationService,
    PracticeModelEvaluator,
    PracticeEvaluationInfrastructure,
    PracticeEvaluationCommandService,
    PracticeCompletionService,
    PracticeWriteService,
  ],
})
export class PracticeModule {}
