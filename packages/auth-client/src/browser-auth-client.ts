import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from 'oidc-client-ts';
import { AuthConfigurationError, AuthRequiredError } from './errors';
import { buildAuthHeaders } from './headers';
import type { AuthState, AuthStateListener, BrowserAuthConfig } from './types';

const DEFAULT_SCOPE = 'openid profile email';

type OidcConfig = {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
};

export class BrowserAuthClient {
  private readonly oidcConfig: OidcConfig | null;
  private userManager: UserManager | null = null;

  constructor(private readonly config: BrowserAuthConfig) {
    this.oidcConfig = config.mode === 'oidc' ? readOidcConfig(config) : null;
  }

  get mode() {
    return this.config.mode;
  }

  async initialize(): Promise<AuthState> {
    if (this.config.mode === 'development') return developmentState(this.config);
    const user = await this.manager().getUser();
    return user && !user.expired ? authenticatedState(user) : unauthenticatedState();
  }

  async completeSignIn(): Promise<AuthState> {
    if (this.config.mode === 'development') return developmentState(this.config);
    const user = await this.manager().signinRedirectCallback();
    return authenticatedState(user);
  }

  async signIn(): Promise<void> {
    if (this.config.mode === 'development') return;
    await this.manager().signinRedirect();
  }

  async signOut(): Promise<void> {
    if (this.config.mode === 'development') return;
    await this.manager().signoutRedirect();
  }

  async getRequestHeaders(): Promise<Headers> {
    if (this.config.mode === 'development') {
      return buildAuthHeaders({
        mode: this.config.mode,
        developmentActor: this.config.developmentActor,
      });
    }
    const user = await this.manager().getUser();
    if (!user || user.expired) throw new AuthRequiredError();
    return buildAuthHeaders({
      mode: this.config.mode,
      developmentActor: this.config.developmentActor,
      accessToken: user.access_token,
    });
  }

  subscribe(listener: AuthStateListener): () => void {
    if (this.config.mode === 'development') return () => undefined;
    const manager = this.manager();
    const refresh = () => void this.notify(listener);
    manager.events.addUserLoaded(refresh);
    manager.events.addUserUnloaded(refresh);
    manager.events.addAccessTokenExpired(refresh);
    manager.events.addSilentRenewError(refresh);
    return () => removeListeners(manager, refresh);
  }

  private manager(): UserManager {
    if (this.userManager) return this.userManager;
    if (!this.oidcConfig) throw new AuthConfigurationError('OIDC 配置未初始化。');
    this.userManager = new UserManager(userManagerSettings(this.oidcConfig));
    return this.userManager;
  }

  private async notify(listener: AuthStateListener) {
    try {
      listener(await this.initialize());
    } catch (error) {
      listener(errorState(error));
    }
  }
}

function readOidcConfig(config: BrowserAuthConfig): OidcConfig {
  return {
    authority: required(config.authority, 'NEXT_PUBLIC_OIDC_AUTHORITY'),
    clientId: required(config.clientId, 'OIDC client id'),
    redirectUri: required(config.redirectUri, 'OIDC redirect URI'),
    postLogoutRedirectUri: required(config.postLogoutRedirectUri, 'OIDC post logout redirect URI'),
    scope: config.scope?.trim() || DEFAULT_SCOPE,
  };
}

function required(value: string | undefined, label: string): string {
  const normalized = value?.trim();
  if (normalized) return normalized;
  throw new AuthConfigurationError(label + ' 在 oidc 模式下不能为空。');
}

function userManagerSettings(config: OidcConfig): UserManagerSettings {
  const storage = browserSessionStorage();
  return {
    authority: config.authority,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    post_logout_redirect_uri: config.postLogoutRedirectUri,
    response_type: 'code',
    scope: config.scope,
    userStore: new WebStorageStateStore({ store: storage }),
    stateStore: new WebStorageStateStore({ store: storage }),
    automaticSilentRenew: false,
    monitorSession: false,
    revokeTokensOnSignout: true,
  };
}

function browserSessionStorage(): Storage {
  if (typeof window === 'undefined') {
    throw new AuthConfigurationError('浏览器认证客户端只能在客户端运行。');
  }
  return window.sessionStorage;
}

function developmentState(config: BrowserAuthConfig): AuthState {
  const isAdmin = config.developmentActor === 'admin';
  return {
    status: 'authenticated',
    identity: {
      subject: isAdmin ? 'demo-admin' : 'demo-user',
      displayName: isAdmin ? 'Demo Admin' : 'Demo User',
      role: config.developmentActor,
    },
    error: null,
  };
}

function authenticatedState(user: User): AuthState {
  const subject = user.profile.sub;
  const role = claim(user, 'role');
  return {
    status: 'authenticated',
    identity: {
      subject,
      displayName: claim(user, 'name') ?? claim(user, 'preferred_username') ?? subject,
      ...(role ? { role } : {}),
    },
    error: null,
  };
}

function claim(user: User, name: string): string | undefined {
  const value = user.profile[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function unauthenticatedState(): AuthState {
  return { status: 'unauthenticated', identity: null, error: null };
}

function errorState(error: unknown): AuthState {
  return {
    status: 'error',
    identity: null,
    error: error instanceof Error ? error.message : '认证服务不可用。',
  };
}

function removeListeners(manager: UserManager, listener: () => void) {
  manager.events.removeUserLoaded(listener);
  manager.events.removeUserUnloaded(listener);
  manager.events.removeAccessTokenExpired(listener);
  manager.events.removeSilentRenewError(listener);
}
