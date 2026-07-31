import { Module } from '@nestjs/common';
import { MemoryProjectionService } from './memory-projection.service';

@Module({
  providers: [MemoryProjectionService],
  exports: [MemoryProjectionService],
})
export class MemoryModule {}
