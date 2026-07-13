import { SetMetadata } from '@nestjs/common';
import type { Role } from '@interview-agent/contracts';

export const ROLES_METADATA_KEY = 'allowed-roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_METADATA_KEY, roles);
