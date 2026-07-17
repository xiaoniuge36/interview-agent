import type { AccountView } from '@interview-agent/contracts';
import { describe, expect, it } from 'vitest';
import { summarizeAccounts } from './account-management-model';

const accounts = [
  { status: 'active', kind: 'user' },
  { status: 'active', kind: 'admin' },
  { status: 'disabled', kind: 'admin' },
] as AccountView[];

describe('account management model', () => {
  it('summarizes the currently loaded account result set', () => {
    expect(summarizeAccounts(accounts)).toEqual({ total: 3, active: 2, disabled: 1, admin: 2 });
  });
});
