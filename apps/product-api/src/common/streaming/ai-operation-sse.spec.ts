import { BadGatewayException } from '@nestjs/common';
import type { ProductRequestContext } from '../context/request-context';
import { streamError } from './ai-operation-sse';

const context: ProductRequestContext = {
  requestId: 'request-12345678',
  traceId: 'trace-12345678',
  tenantId: 'tenant-1',
  actor: {
    id: 'user-1',
    subject: 'subject-1',
    tenantId: 'tenant-1',
    role: 'user',
    scopes: [],
  },
};

describe('streamError', () => {
  it('does not mark an invalid model schema as retryable', () => {
    const error = new BadGatewayException({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用结果。',
    });

    expect(streamError(error, context)).toEqual({
      code: 'MODEL_PROVIDER_RESPONSE_INVALID',
      message: '模型未返回可用结果。',
      requestId: context.requestId,
      retryable: false,
    });
  });
});
