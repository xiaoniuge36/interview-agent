import { Module } from '@nestjs/common';
import { LocalAuthController } from './local-auth.controller';
import { LocalAuthService } from './local-auth.service';

@Module({
  controllers: [LocalAuthController],
  providers: [LocalAuthService],
})
export class LocalAuthModule {}
