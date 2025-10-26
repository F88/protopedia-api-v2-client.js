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
 * Returns a 500 Internal Server Error with an HTML body to simulate cases
 * where the upstream returns a non-JSON payload even though the client sent
 * Accept: application/json.
 */
export function createListPrototypes500HtmlHandler() {
  const html = `<!doctype html>
<html>
  <head><title>Status page</title></head>
  <body style="font-family: sans-serif;">
    <p style="font-size: 1.2em;font-weight: bold;margin: 1em 0px;">Internal Server Error</p>
    <p>The server encountered an unexpected condition which prevented it from fulfilling the request</p>
    <p>You can get technical details <a href="http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html#sec10.5.1">here</a>.<br/>
    Please continue your visit at our <a href="/">home page</a>.</p>
  </body>
  </html>`;

  return http.get('https://example.com/api/v2/prototype/list', () =>
    HttpResponse.text(html, {
      status: 500,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
      },
    }),
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

/**
 * Returns a TSV document for the TSV endpoint.
 */
export function createDownloadPrototypesTsvHandler(
  options: ListPrototypesHandlerOptions = {},
) {
  const tsv = 'id\tname\n42\tTest Work\n';
  return http.get(
    'https://example.com/api/v2/prototype/list/tsv',
    ({ request }) => {
      options.onRequest?.(request);
      return new HttpResponse(tsv, {
        headers: {
          'Content-Type': 'text/tab-separated-values; charset=utf-8',
        },
      });
    },
  );
}

/**
 * Returns a JSON error body with an application/json content type.
 */
export function createListPrototypesJsonErrorHandler() {
  const body = { error: 'bad_request', message: 'nope' };
  return http.get('https://example.com/api/v2/prototype/list', () =>
    HttpResponse.json(body, {
      status: 400,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Custom': 'abc',
      },
    }),
  );
}
