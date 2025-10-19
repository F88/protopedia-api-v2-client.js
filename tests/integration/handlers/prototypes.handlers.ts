import { http, HttpResponse, passthrough } from 'msw';

export interface ListPrototypesHandlerOptions {
  readonly onRequest?: (request: Request) => void;
}

export const sampleListPrototypesPayload = {
  metadata: {
    status: 200,
    title: 'OK',
    detail: 'The request sent by the client was successful.',
  },
  count: 1,
  links: {
    self: {
      href: '/v2/api/protopedia/list',
    },
  },
  results: [
    {
      id: 42,
      prototypeNm: 'Test Work',
      summary: 'Summary',
      mainUrl: 'https://example.com/prototypes/42',
      status: 2,
    },
  ],
} as const;

export function createListPrototypesHandler(
  options: ListPrototypesHandlerOptions = {},
) {
  return http.get(
    'https://example.com/api/v2/prototype/list',
    ({ request }) => {
      options.onRequest?.(request);
      return HttpResponse.json(sampleListPrototypesPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  );
}

/**
 * Returns MSW handlers that allow every request to pass through and resolve
 * with the original network response. Useful when tests need the raw API
 * output without additional stubbing.
 */
export const createListPrototypesPassthroughHandlers = [
  http.all('*', () => passthrough()),
];

/**
 * Creates a specific passthrough-like handler that responds with a provided Response
 * for the list prototypes endpoint. Useful when you want to inject a custom payload.
 */
export function createListPrototypesPassthroughHandler(response: Response) {
  return http.get('https://example.com/api/v2/prototype/list', () => response);
}
