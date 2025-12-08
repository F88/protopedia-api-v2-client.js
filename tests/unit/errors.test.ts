import { describe, expect, it } from 'vitest';

import { ProtoPediaApiError } from '../../src/errors.js';

describe('ProtoPediaApiError', () => {
  it('captures provided options and preserves cause', () => {
    const cause = new Error('network failure');
    const headers = {
      Accept: 'application/json',
    };

    const error = new ProtoPediaApiError({
      message: 'Request failed',
      req: {
        method: 'GET',
        url: 'https://example.com/resource',
      },
      status: 404,
      statusText: 'Not Found',
      body: { code: 'NOT_FOUND' },
      headers,
      cause,
    });

    expect(error.name).toBe('ProtoPediaApiError');
    expect(error.message).toBe('Request failed');
    expect(error.req).toEqual({
      method: 'GET',
      url: 'https://example.com/resource',
    });
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.body).toEqual({ code: 'NOT_FOUND' });
    expect(error.headers).toEqual({ Accept: 'application/json' });
    expect(error.headers).not.toBe(headers);
    headers.Accept = 'text/plain';
    expect(error.headers).toEqual({ Accept: 'application/json' });
    expect(error).toHaveProperty('cause', cause);
  });

  it('defaults optional properties when omitted', () => {
    const error = new ProtoPediaApiError({
      message: 'Server error',
      req: {
        method: 'POST',
        url: 'https://example.com/resource',
      },
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(error.body).toBeNull();
    expect(error.headers).toEqual({});
  });

  it('serialises to JSON with the public fields', () => {
    const error = new ProtoPediaApiError({
      message: 'Request failed',
      req: {
        method: 'DELETE',
        url: 'https://example.com/resource',
      },
      status: 400,
      statusText: 'Bad Request',
      body: { errors: ['missing-field'] },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const json = error.toJSON();

    expect(json).toEqual({
      name: 'ProtoPediaApiError',
      message: 'Request failed',
      req: {
        method: 'DELETE',
        url: 'https://example.com/resource',
      },
      status: 400,
      statusText: 'Bad Request',
      body: { errors: ['missing-field'] },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
});
