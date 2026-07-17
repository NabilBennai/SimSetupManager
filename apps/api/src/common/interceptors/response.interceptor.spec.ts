import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

import { ResponseInterceptor } from './response.interceptor';

function createMockContext(requestId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ locals: { requestId } }),
    }),
  } as unknown as ExecutionContext;
}

function createMockHandler<T>(payload: T): CallHandler<T> {
  return { handle: () => of(payload) } as CallHandler<T>;
}

describe('ResponseInterceptor', () => {
  it('enveloppe une valeur simple dans { data, meta }', (done) => {
    const interceptor = new ResponseInterceptor();
    const context = createMockContext('req_1');
    const handler = createMockHandler({ id: '1' });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1' }, meta: { requestId: 'req_1' } });
      done();
    });
  });

  it('construit le meta de pagination pour un résultat Paginated', (done) => {
    const interceptor = new ResponseInterceptor();
    const context = createMockContext('req_2');
    const handler = createMockHandler({
      items: [{ id: '1' }, { id: '2' }],
      page: 1,
      pageSize: 2,
      total: 5,
    });

    interceptor.intercept(context, handler).subscribe((result) => {
      expect(result).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        meta: { requestId: 'req_2', page: 1, pageSize: 2, total: 5, totalPages: 3 },
      });
      done();
    });
  });
});
