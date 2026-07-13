import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../authz/public.decorator';
import { LocalAuthService } from './local-auth.service';
import { LocalRegistrationInputSchema, LocalSignInInputSchema } from './local-auth.input';

const HTTP_OK = 200;

@Public()
@Controller('auth')
export class LocalAuthController {
  constructor(private readonly localAuth: LocalAuthService) {}

  @Post('register')
  register(@Body() body: unknown) {
    return this.localAuth.register(LocalRegistrationInputSchema.parse(body));
  }

  @Post('login')
  @HttpCode(HTTP_OK)
  login(@Body() body: unknown) {
    return this.localAuth.signIn(LocalSignInInputSchema.parse(body));
  }
}
