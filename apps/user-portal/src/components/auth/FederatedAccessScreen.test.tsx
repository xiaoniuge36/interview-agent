import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const auth = vi.hoisted(() => ({
  current: {
    error: null as string | null,
    signIn: vi.fn(() => Promise.resolve()),
    status: 'loading',
  },
}));

vi.mock('@interview-agent/auth-client', () => ({ useAuth: () => auth.current }));

const { FederatedAccessScreen } = await import('./FederatedAccessScreen');

it('disables the federated sign-in action while auth is loading', () => {
  const markup = renderToStaticMarkup(<FederatedAccessScreen />);

  expect(markup).toMatch(/<button[^>]*class="button access-submit"[^>]*disabled=""/);
});
