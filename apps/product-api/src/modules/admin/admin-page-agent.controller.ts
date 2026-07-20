import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import {
  AdminPageAgentAppendMessagesSchema,
  AdminPageAgentCreateConversationSchema,
  AdminPageAgentRenameConversationSchema,
} from './admin-page-agent.schemas';
import { AdminPageAgentConversationService } from './admin-page-agent-conversation.service';
import { AdminPageAgentService } from './admin-page-agent.service';

@Roles('admin', 'platform_admin')
@Controller('admin/page-agent')
export class AdminPageAgentController {
  constructor(
    private readonly assistant: AdminPageAgentService,
    private readonly conversations: AdminPageAgentConversationService,
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
    const input = AdminPageAgentCreateConversationSchema.parse(body ?? {});
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
    const input = AdminPageAgentRenameConversationSchema.parse(body);
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
    const input = AdminPageAgentAppendMessagesSchema.parse(body);
    return this.conversations.appendMessages(request.context, conversationId, input.messages);
  }
}
