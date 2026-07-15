import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { AuthIdentityService } from './authn/auth-identity.service';
import { IdentityProvisioner } from './authn/identity-provisioner';
import { LocalAuthModule } from './authn/local-auth.module';
import { PolicyService } from './authz/policy.service';

const commonProviders = [AuditService, IdentityProvisioner, AuthIdentityService, PolicyService];

@Global()
@Module({
  imports: [LocalAuthModule],
  providers: commonProviders,
  exports: commonProviders,
})
export class CommonModule {}
