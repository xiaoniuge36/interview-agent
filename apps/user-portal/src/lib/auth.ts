import { BrowserAuthClient, parseAuthMode } from '@interview-agent/auth-client';

export const authClient = new BrowserAuthClient({
  mode: parseAuthMode(process.env.NEXT_PUBLIC_AUTH_MODE),
  developmentActor: 'user',
  authority: process.env.NEXT_PUBLIC_OIDC_AUTHORITY ?? '',
  clientId: process.env.NEXT_PUBLIC_OIDC_CLIENT_ID ?? '',
  redirectUri: process.env.NEXT_PUBLIC_OIDC_REDIRECT_URI ?? '',
  postLogoutRedirectUri: process.env.NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI ?? '',
  scope: process.env.NEXT_PUBLIC_OIDC_SCOPE ?? 'openid profile email',
});
