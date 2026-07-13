import { SetMetadata } from '@nestjs/common';

export const PUBLIC_METADATA_KEY = 'route-is-public';
export const Public = () => SetMetadata(PUBLIC_METADATA_KEY, true);
