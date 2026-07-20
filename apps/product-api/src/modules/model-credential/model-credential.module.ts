import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { AiUsageModule } from '../ai-usage/ai-usage.module';
import { CredentialCryptoService } from './credential-crypto.service';
import { ModelCredentialConnectionTester } from './model-credential-connection-tester';
import { ModelCredentialController } from './model-credential.controller';
import { ModelCredentialInfrastructure } from './model-credential-infrastructure';
import { ModelCredentialResolver } from './model-credential-resolver';
import { ModelCredentialService } from './model-credential.service';
import { ModelProviderClient } from './model-provider.client';

@Module({
  imports: [CommonModule, AiUsageModule],
  controllers: [ModelCredentialController],
  providers: [
    CredentialCryptoService,
    ModelProviderClient,
    ModelCredentialConnectionTester,
    ModelCredentialInfrastructure,
    ModelCredentialResolver,
    ModelCredentialService,
  ],
  exports: [ModelCredentialResolver, ModelCredentialService, ModelProviderClient],
})
export class ModelCredentialModule {}
