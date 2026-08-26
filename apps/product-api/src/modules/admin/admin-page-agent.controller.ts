import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import {
  PageAgentAppendMessagesSchema,
  PageAgentCompleteRunSchema,
  PageAgentCreateConversationSchema,
  PageAgentCreateRunSchema,
  PageAgentHeartbeatRunSchema,
  PageAgentRenameConversationSchema,
} from '../page-agent-core/page-agent.schemas';
import { AdminPageAgentConversationService } from './admin-page-agent-conversation.service';
import { AdminPageAgentRunService } from './admin-page-agent-run.service';
import { AdminPageAgentService } from './admin-page-agent.service';

@Roles('admin', 'platform_admin')
@Controller('admin/page-agent')
export class AdminPageAgentController {
  constructor(
    private readonly assistant: AdminPageAgentService,
    private readonly conversations: AdminPageAgentConversationService,
    private readonly runs: AdminPageAgentRunService,
  ) {}

  @Get('config')
  config(@Req() request: ProductRequest) {
    return this.assistant.config(request.context);
  }

  @Post('chat/completions')
  completion(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.assistant.completion(request.context, body);
  }

  @Get('conversations')
  listConversations(@Req() request: ProductRequest) {
    return this.conversations.list(request.context);
  }

  @Post('conversations')
  createConversation(@Req() request: ProductRequest, @Body() body: unknown) {
    const input = PageAgentCreateConversationSchema.parse(body ?? {});
    return this.conversations.create(request.context, input.title);
  }

  @Get('conversations/:conversationId')
  getConversation(@Req() request: ProductRequest, @Param('conversationId') conversationId: string) {
    return this.conversations.get(request.context, conversationId);
  }

  @Patch('conversations/:conversationId')
  renameConversation(
    @Req() request: ProductRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const input = PageAgentRenameConversationSchema.parse(body);
    return this.conversations.rename(request.context, conversationId, input.title);
  }

  @Delete('conversations/:conversationId')
  deleteConversation(
    @Req() request: ProductRequest,
    @Param('conversationId') conversationId: string,
  ) {
    return this.conversations.remove(request.context, conversationId);
  }

  @Post('conversations/:conversationId/messages')
  appendConversationMessages(
    @Req() request: ProductRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const input = PageAgentAppendMessagesSchema.parse(body);
    return this.conversations.appendMessages(request.context, conversationId, input.messages);
  }

  @Get('conversations/:conversationId/runs')
  listRuns(@Req() request: ProductRequest, @Param('conversationId') conversationId: string) {
    return this.runs.list(request.context, conversationId);
  }

  @Get('conversations/:conversationId/runs/latest')
  latestRun(@Req() request: ProductRequest, @Param('conversationId') conversationId: string) {
    return this.runs.latest(request.context, conversationId);
  }

  @Post('conversations/:conversationId/runs')
  createRun(
    @Req() request: ProductRequest,
    @Param('conversationId') conversationId: string,
    @Body() body: unknown,
  ) {
    const input = PageAgentCreateRunSchema.parse(body);
    return this.runs.create(request.context, conversationId, input);
  }

  @Patch('runs/:runId/heartbeat')
  heartbeatRun(
    @Req() request: ProductRequest,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ) {
    const input = PageAgentHeartbeatRunSchema.parse(body);
    return this.runs.heartbeat(request.context, runId, input);
  }

  @Post('runs/:runId/complete')
  completeRun(
    @Req() request: ProductRequest,
    @Param('runId') runId: string,
    @Body() body: unknown,
  ) {
    const input = PageAgentCompleteRunSchema.parse(body);
    return this.runs.complete(request.context, runId, input);
  }
}
