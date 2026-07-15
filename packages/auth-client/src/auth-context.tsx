'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BrowserAuthClient } from './browser-auth-client';
import type { AuthState, LocalRegistrationInput, LocalSignInInput } from './types';

const INITIAL_STATE: AuthState = {
  status: 'loading',
  identity: null,
  error: null,
};

type AuthContextValue = AuthState & {
  mode: BrowserAuthClient['mode'];
  signIn: () => Promise<void>;
  signInWithPassword: (input: LocalSignInInput) => Promise<void>;
  register: (input: LocalRegistrationInput) => Promise<void>;
  signOut: () => Promise<void>;
  completeSignIn: () => Promise<void>;
  getRequestHeaders: () => Promise<Headers>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  client: BrowserAuthClient;
  children: ReactNode;
};

export function AuthProvider({ client, children }: AuthProviderProps) {
  const controller = useAuthController(client);
  const getRequestHeaders = useCallback(() => client.getRequestHeaders(), [client]);
  const value = useMemo<AuthContextValue>(
    () => ({
      ...controller.state,
      mode: client.mode,
      signIn: controller.signIn,
      signInWithPassword: controller.signInWithPassword,
      register: controller.register,
      signOut: controller.signOut,
      completeSignIn: controller.completeSignIn,
      getRequestHeaders,
    }),
    [client.mode, controller, getRequestHeaders],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuthController(client: BrowserAuthClient) {
  // 首屏固定 loading，避免 SSR 与 sessionStorage 水合不一致；客户端 effect 再恢复会话
  const [state, setState] = useState<AuthState>(INITIAL_STATE);
  useEffect(() => initializeAuth(client, setState), [client]);
  const signIn = useCallback(() => runAuthAction(client.signIn.bind(client), setState), [client]);
  const signInWithPassword = useCallback(
    (input: LocalSignInInput) => runAuthAction(() => client.signInWithPassword(input), setState),
    [client],
  );
  const register = useCallback(
    (input: LocalRegistrationInput) => runAuthAction(() => client.register(input), setState),
    [client],
  );
  const signOut = useCallback(() => runAuthAction(client.signOut.bind(client), setState), [client]);
  const completeSignIn = useCallback(() => completeAuth(client, setState), [client]);
  return useMemo(
    () => ({ state, signIn, signInWithPassword, register, signOut, completeSignIn }),
    [completeSignIn, register, signIn, signInWithPassword, signOut, state],
  );
}

function initializeAuth(client: BrowserAuthClient, setState: (state: AuthState) => void) {
  let active = true;
  const update = (state: AuthState) => {
    if (active) setState(state);
  };
  // 客户端挂载后立即同步可恢复会话（local / development 几乎无感）
  try {
    const bootstrapped = client.bootstrapState();
    update(bootstrapped);
    if (bootstrapped.status === 'loading') {
      void client
        .initialize()
        .then(update)
        .catch((error: unknown) => {
          update(failure(error));
        });
    }
  } catch (error: unknown) {
    update(failure(error));
  }
  const unsubscribe = client.subscribe(update);
  return () => {
    active = false;
    unsubscribe();
  };
}

async function runAuthAction(
  action: () => Promise<AuthState | void>,
  setState: (state: AuthState) => void,
) {
  try {
    const state = await action();
    if (state) setState(state);
  } catch (error) {
    setState(failure(error));
  }
}

async function completeAuth(client: BrowserAuthClient, setState: (state: AuthState) => void) {
  setState(INITIAL_STATE);
  try {
    setState(await client.completeSignIn());
  } catch (error) {
    setState(failure(error));
    throw error;
  }
}

function failure(error: unknown): AuthState {
  return {
    status: 'error',
    identity: null,
    error: error instanceof Error ? error.message : '认证流程失败。',
  };
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth 必须在 AuthProvider 内使用。');
  return context;
}
