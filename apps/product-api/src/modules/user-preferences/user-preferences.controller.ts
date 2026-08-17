import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { UpsertUserPreferenceInputSchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { UserPreferencesService } from './user-preferences.service';

@Roles('user')
@Controller('user-preferences')
export class UserPreferencesController {
  constructor(private readonly service: UserPreferencesService) {}

  @Get()
  get(@Req() request: ProductRequest) {
    return this.service.get(request.context);
  }

  @Put()
  upsert(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.service.upsert(request.context, UpsertUserPreferenceInputSchema.parse(body));
  }
}
