import { BrowserAuthClient, parseAuthMode } from '@interview-agent/auth-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

export const authClient = new BrowserAuthClient({
  mode: parseAuthMode(process.env.NEXT_PUBLIC_ADMIN_AUTH_MODE, 'local'),
  developmentActor: 'admin',
  apiBaseUrl: API_BASE_URL,
  authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY ?? '',
  clientId: process.env.NEXT_PUBLIC_ADMIN_OIDC_CLIENT_ID ?? '',
  redirectUri: process.env.NEXT_PUBLIC_ADMIN_OIDC_REDIRECT_URI ?? '',
  postLogoutRedirectUri: process.env.NEXT_PUBLIC_ADMIN_OIDC_POST_LOGOUT_REDIRECT_URI ?? '',
  scope: process.env.NEXT_PUBLIC_OIDC_SCOPE ?? 'openid profile email',
});
