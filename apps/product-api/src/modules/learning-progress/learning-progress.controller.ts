import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { UpsertLearningProgressInputSchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { LearningProgressService } from './learning-progress.service';

@Roles('user')
@Controller('learning-progress')
export class LearningProgressController {
  constructor(private readonly service: LearningProgressService) {}

  @Get()
  get(@Req() request: ProductRequest) {
    return this.service.get(request.context);
  }

  @Put()
  upsert(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.upsert(request.context, UpsertLearningProgressInputSchema.parse(body));
  }
}
