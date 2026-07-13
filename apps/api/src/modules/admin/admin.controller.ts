import { Controller, Get, Req } from '@nestjs/common';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { AdminService } from './admin.service';

@Roles('admin', 'question_reviewer')
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  dashboard(@Req() request: ProductRequest) {
    return this.service.dashboard(request.context);
  }

  @Get('questions')
  questions(@Req() request: ProductRequest) {
    return this.service.questions(request.context);
  }

  @Get('candidates')
  candidates(@Req() request: ProductRequest) {
    return this.service.candidates(request.context);
  }

  @Roles('admin')
  @Get('model-profiles')
  modelProfiles(@Req() request: ProductRequest) {
    return this.service.modelProfiles(request.context);
  }

  @Roles('admin')
  @Get('agent-runs')
  agentRuns(@Req() request: ProductRequest) {
    return this.service.agentRuns(request.context);
  }

  @Roles('admin')
  @Get('audit-logs')
  auditLogs(@Req() request: ProductRequest) {
    return this.service.auditLogs(request.context);
  }
}
