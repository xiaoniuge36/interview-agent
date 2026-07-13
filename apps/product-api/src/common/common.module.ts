import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { AuthIdentityService } from './authn/auth-identity.service';
import { LocalAuthModule } from './authn/local-auth.module';
import { PolicyService } from './authz/policy.service';
import { InterviewEventBus } from './events/interview-event.bus';

const commonProviders = [AuditService, AuthIdentityService, PolicyService, InterviewEventBus];

@Global()
@Module({
  imports: [LocalAuthModule],
  providers: commonProviders,
  exports: commonProviders,
})
export class CommonModule {}
