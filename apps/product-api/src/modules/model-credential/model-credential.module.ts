import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { CredentialCryptoService } from './credential-crypto.service';
import { ModelCredentialController } from './model-credential.controller';
import { ModelCredentialInfrastructure } from './model-credential-infrastructure';
import { ModelCredentialService } from './model-credential.service';
import { ModelProviderClient } from './model-provider.client';

@Module({
  imports: [CommonModule],
  controllers: [ModelCredentialController],
  providers: [
    CredentialCryptoService,
    ModelProviderClient,
    ModelCredentialInfrastructure,
    ModelCredentialService,
  ],
  exports: [ModelCredentialService, ModelProviderClient],
})
export class ModelCredentialModule {}
