import { ArgumentsHost, NotFoundException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

function createMockHost(requestId: string) {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, locals: { requestId } };
  const request = { method: 'GET', url: '/setups/123' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  it('traduit une HttpException en enveloppe { error, meta }', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createMockHost('req_1');

    filter.catch(new NotFoundException('Setup introuvable'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'NOT_FOUND', message: 'Setup introuvable', details: [] },
      meta: { requestId: 'req_1' },
    });
  });

  it('retourne 500 générique pour une erreur inattendue', () => {
    const filter = new HttpExceptionFilter();
    const { host, status, json } = createMockHost('req_2');

    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Une erreur inattendue est survenue.',
        details: [],
      },
      meta: { requestId: 'req_2' },
    });
  });
});
