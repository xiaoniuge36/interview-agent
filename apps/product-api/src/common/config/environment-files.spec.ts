import { resolve } from 'node:path';
import { localEnvironmentFiles } from './environment-files';

describe('localEnvironmentFiles', () => {
  it('does not read a local .env file when an isolated E2E environment is explicit', () => {
    expect(localEnvironmentFiles('D:/repo/apps/product-api', 'true')).toEqual([]);
  });

  it('keeps development .env lookup outside isolated E2E runs', () => {
    expect(localEnvironmentFiles('D:/repo/apps/product-api', undefined)).toEqual([
      resolve('D:/repo/apps/product-api', '.env'),
      resolve('D:/repo/apps/product-api', '../../.env'),
    ]);
  });
});
