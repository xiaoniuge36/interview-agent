import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PracticeController } from './practice.controller';
import { PracticeService } from './practice.service';

@Module({
  imports: [CommonModule],
  controllers: [PracticeController],
  providers: [PracticeService],
})
export class PracticeModule {}
