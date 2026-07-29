import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { JobsModule } from '../jobs/jobs.module';
import { ImportController } from './import.controller';
import { ImportInfrastructure } from './import-infrastructure';
import { ImportService } from './import.service';

@Module({
  imports: [CommonModule, JobsModule],
  controllers: [ImportController],
  providers: [ImportInfrastructure, ImportService],
})
export class ImportModule {}
