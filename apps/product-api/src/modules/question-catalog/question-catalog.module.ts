import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { QuestionCatalogController } from './question-catalog.controller';
import { QuestionCatalogService } from './question-catalog.service';

@Module({
  imports: [CommonModule],
  controllers: [QuestionCatalogController],
  providers: [QuestionCatalogService],
})
export class QuestionCatalogModule {}
