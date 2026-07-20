import { describe, expect, it } from 'vitest';
import {
  createDeleteAdminModelCredentialRequest,
  createUpdateAdminModelCredentialRequest,
} from './admin-page-agent-api';

describe('admin model credential API requests', () => {
  it('sends only writable fields when updating a model connection', () => {
    const request = createUpdateAdminModelCredentialRequest('credential-1', {
      provider: 'qwen',
      model: 'qwen-plus',
      baseUrl: null,
      isDefault: false,
    });

    expect(request.path).toBe('/model-credentials/credential-1');
    expect(request.init?.method).toBe('PATCH');
    expect(JSON.parse(String(request.init?.body))).toEqual({
      provider: 'qwen',
      model: 'qwen-plus',
      baseUrl: null,
      isDefault: false,
    });
  });

  it('uses a DELETE request for a model connection without a request body', () => {
    const request = createDeleteAdminModelCredentialRequest('credential-1');

    expect(request.path).toBe('/model-credentials/credential-1');
    expect(request.init?.method).toBe('DELETE');
    expect((request.init as RequestInit | undefined)?.body).toBeUndefined();
  });
});
