import { Injectable } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PolicyService } from '../../common/authz/policy.service';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class ModelCredentialInfrastructure {
  constructor(
    readonly prisma: PrismaService,
    readonly policy: PolicyService,
    readonly audit: AuditService,
  ) {}
}
