export type AuthMode = 'development' | 'oidc' | 'local';
export type DevelopmentActor = 'user' | 'admin' | 'platform_admin';
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

export type LocalSignInInput = {
  email: string;
  password: string;
};

export type LocalRegistrationInput = LocalSignInInput & {
  name: string;
};

export type BrowserAuthConfig = {
  mode: AuthMode;
  developmentActor: DevelopmentActor;
  apiBaseUrl?: string;
  authority?: string;
  clientId?: string;
  redirectUri?: string;
  postLogoutRedirectUri?: string;
  scope?: string;
};

export type AuthStateListener = (state: AuthState) => void;
