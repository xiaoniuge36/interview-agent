import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [CommonModule],
  controllers: [ImportController],
  providers: [ImportService],
})
export class ImportModule {}
