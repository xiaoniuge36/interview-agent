import {
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from 'oidc-client-ts';
import { AuthConfigurationError, AuthRequiredError } from './errors';
import { buildAuthHeaders } from './headers';
import {
  browserSessionStorage,
  clearLocalSession,
  localState,
  persistLocalSession,
  readLocalSession,
  requestLocalSession,
} from './local-auth-session';
import type {
  AuthState,
  AuthStateListener,
  BrowserAuthConfig,
  LocalRegistrationInput,
  LocalSignInInput,
} from './types';

const DEFAULT_SCOPE = 'openid profile email';

type OidcConfig = {
  authority: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri: string;
  scope: string;
};

type LocalAuthConfig = {
  apiBaseUrl: string;
};

export class BrowserAuthClient {
  private readonly oidcConfig: OidcConfig | null;
  private readonly localAuthConfig: LocalAuthConfig | null;
  private userManager: UserManager | null = null;

  constructor(private readonly config: BrowserAuthConfig) {
    this.oidcConfig = config.mode === 'oidc' ? readOidcConfig(config) : null;
    this.localAuthConfig = config.mode === 'local' ? readLocalAuthConfig(config) : null;
  }

  get mode() {
    return this.config.mode;
  }

  /**
   * 同步恢复可立即判定的会话，避免刷新时先闪「检查登录状态」。
   * OIDC 仍需异步读 UserManager，返回 loading。
   */
  bootstrapState(): AuthState {
    if (this.config.mode === 'development') return developmentState(this.config);
    if (this.config.mode === 'local') return localState();
    return { status: 'loading', identity: null, error: null };
  }

  async initialize(): Promise<AuthState> {
    if (this.config.mode === 'development') return developmentState(this.config);
    if (this.config.mode === 'local') return localState();
    const user = await this.manager().getUser();
    return user && !user.expired ? authenticatedState(user) : unauthenticatedState();
  }

  async completeSignIn(): Promise<AuthState> {
    if (this.config.mode === 'development') return developmentState(this.config);
    if (this.config.mode === 'local') {
      throw new AuthConfigurationError('本地账号模式不使用 OIDC 登录回调。');
    }
    const user = await this.manager().signinRedirectCallback();
    return authenticatedState(user);
  }

  async signIn(): Promise<void> {
    if (this.config.mode === 'development') return;
    if (this.config.mode === 'local') {
      throw new AuthConfigurationError('本地账号模式需要邮箱和密码。');
    }
    await this.manager().signinRedirect();
  }

  async signInWithPassword(input: LocalSignInInput): Promise<AuthState> {
    const session = await requestLocalSession(this.localConfig().apiBaseUrl, '/auth/login', input);
    return persistLocalSession(session);
  }

  async register(input: LocalRegistrationInput): Promise<AuthState> {
    const session = await requestLocalSession(
      this.localConfig().apiBaseUrl,
      '/auth/register',
      input,
    );
    return persistLocalSession(session);
  }

  async signOut(): Promise<AuthState | void> {
    if (this.config.mode === 'development') return developmentState(this.config);
    if (this.config.mode === 'local') {
      clearLocalSession();
      return unauthenticatedState();
    }
    await this.manager().signoutRedirect();
  }

  async getRequestHeaders(): Promise<Headers> {
    if (this.config.mode === 'development') {
      return buildAuthHeaders({
        mode: this.config.mode,
        developmentActor: this.config.developmentActor,
      });
    }
    if (this.config.mode === 'local') {
      const session = readLocalSession();
      if (!session) throw new AuthRequiredError();
      return buildAuthHeaders({
        mode: this.config.mode,
        developmentActor: this.config.developmentActor,
        accessToken: session.accessToken,
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
    if (this.config.mode !== 'oidc') return () => undefined;
    const manager = this.manager();
    const refresh = () => void this.notify(listener);
    manager.events.addUserLoaded(refresh);
    manager.events.addUserUnloaded(refresh);
    manager.events.addAccessTokenExpired(refresh);
    manager.events.addSilentRenewError(refresh);
    return () => removeListeners(manager, refresh);
  }

  private localConfig(): LocalAuthConfig {
    if (!this.localAuthConfig) {
      throw new AuthConfigurationError('本地账号认证配置未初始化。');
    }
    return this.localAuthConfig;
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

function readLocalAuthConfig(config: BrowserAuthConfig): LocalAuthConfig {
  return {
    apiBaseUrl: required(config.apiBaseUrl, 'NEXT_PUBLIC_API_BASE_URL').replace(/\/+$/, ''),
  };
}

function required(value: string | undefined, label: string): string {
  const normalized = value?.trim();
  if (normalized) return normalized;
  throw new AuthConfigurationError(label + ' 在对应认证模式下不能为空。');
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
