import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { CreateJobIntentInputSchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { JobIntentService } from './job-intent.service';

@Roles('user')
@Controller('job-intents')
export class JobIntentController {
  constructor(private readonly service: JobIntentService) {}

  @Get()
  list(@Req() request: ProductRequest) {
    return this.service.list(request.context);
  }

  @Get(':id')
  get(@Req() request: ProductRequest, @Param('id') id: string) {
    return this.service.get(request.context, id);
  }

  @Post()
  create(@Req() request: ProductRequest, @Body() body: unknown) {
    const input = CreateJobIntentInputSchema.parse(body);
    return this.service.create(request.context, input);
  }
}
