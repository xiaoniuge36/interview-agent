import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PracticeCommandService } from './practice-command.service';
import { PracticeController } from './practice.controller';
import { PracticeQueryService } from './practice-query.service';
import { PracticeService } from './practice.service';

@Module({
  imports: [CommonModule],
  controllers: [PracticeController],
  providers: [PracticeService, PracticeCommandService, PracticeQueryService],
})
export class PracticeModule {}
