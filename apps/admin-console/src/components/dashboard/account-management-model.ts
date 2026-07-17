import type { AccountView } from '@interview-agent/contracts';

export function summarizeAccounts(accounts: AccountView[]) {
  return accounts.reduce(
    (summary, account) => ({
      total: summary.total + 1,
      active: summary.active + Number(account.status === 'active'),
      disabled: summary.disabled + Number(account.status === 'disabled'),
      admin: summary.admin + Number(account.kind === 'admin'),
    }),
    { total: 0, active: 0, disabled: 0, admin: 0 },
  );
}
