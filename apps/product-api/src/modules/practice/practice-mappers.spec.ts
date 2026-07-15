import type { ProductRequestContext } from '../../common/context/request-context';
import { practiceSessionData } from './practice-mappers';

const context: ProductRequestContext = {
  requestId: 'request-1',
  traceId: 'trace-1',
  tenantId: 'consumer-tenant',
  actor: {
    id: 'consumer-user',
    subject: 'consumer-user',
    tenantId: 'consumer-tenant',
    role: 'user',
    scopes: ['practice:create'],
  },
};

describe('practiceSessionData', () => {
  it('connects each session item to the question source tenant', () => {
    const data = practiceSessionData(
      context,
      { mode: 'manual', questionIds: ['public-question'] },
      [{ id: 'public-question', tenantId: 'public-tenant' }],
    );

    expect(data.items).toMatchObject({
      create: [
        {
          question: {
            connect: {
              tenantId_id: { tenantId: 'public-tenant', id: 'public-question' },
            },
          },
        },
      ],
    });
  });
});
