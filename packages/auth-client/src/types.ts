export type AuthMode = 'development' | 'oidc';
export type DevelopmentActor = 'user' | 'admin';
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export type AuthIdentity = {
  subject: string;
  displayName: string;
  role?: string;
};

export type AuthState = {
  status: AuthStatus;
  identity: AuthIdentity | null;
  error: string | null;
};

export type BrowserAuthConfig = {
  mode: AuthMode;
  developmentActor: DevelopmentActor;
  authority?: string;
  clientId?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  scope?: string;
};

export type AuthStateListener = (state: AuthState) => void;
