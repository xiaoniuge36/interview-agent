import type { Request } from 'express';
import type { ProductRequestContext } from './request-context';

export type ProductRequest = Request & {
  context: ProductRequestContext;
};
