import { Body, Controller, Get, Put, Req } from '@nestjs/common';
import { UpsertProfileInputSchema } from '@interview-agent/contracts';
import { Roles } from '../../common/authz/roles.decorator';
import type { ProductRequest } from '../../common/context/product-request';
import { ProfileService } from './profile.service';

@Roles('user')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@Req() request: ProductRequest) {
    return this.profileService.get(request.context);
  }

  @Put()
  upsertProfile(@Req() request: ProductRequest, @Body() body: unknown) {
    return this.profileService.upsert(request.context, UpsertProfileInputSchema.parse(body));
  }
}
