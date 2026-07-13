import { AuthRequiredError } from './errors';
import type { AuthMode, DevelopmentActor } from './types';

export type AuthHeaderInput = {
  mode: AuthMode;
  developmentActor: DevelopmentActor;
  accessToken?: string;
};

export function buildAuthHeaders(input: AuthHeaderInput): Headers {
  const headers = new Headers();
  if (input.mode === 'development') {
    headers.set('x-development-actor', input.developmentActor);
    return headers;
  }
  const token = input.accessToken?.trim();
  if (!token) throw new AuthRequiredError();
  headers.set('Authorization', 'Bearer ' + token);
  return headers;
}
