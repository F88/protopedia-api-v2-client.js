# ProtoPedia API Ver 2.0 Client for JavaScript

[![npm version](https://badge.fury.io/js/protopedia-api-v2-client.svg?icon=si%3Anpm)](https://badge.fury.io/js/protopedia-api-v2-client)
[![codecov](https://codecov.io/gh/F88/protopedia-api-v2-client.js/graph/badge.svg?token=4HDWGCEAHS)](https://codecov.io/gh/F88/protopedia-api-v2-client.js)
[![CodeQL](https://github.com/F88/protopedia-api-v2-client.js/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/F88/protopedia-api-v2-client.js/actions/workflows/github-code-scanning/codeql)
[![CI](https://github.com/F88/protopedia-api-v2-client.js/actions/workflows/ci.yml/badge.svg)](https://github.com/F88/protopedia-api-v2-client.js/actions/workflows/ci.yml)

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/F88/protopedia-api-v2-client.js)
[![View Code Wiki](https://www.gstatic.com/_/boq-sdlc-agents-ui/_/r/YUi5dj2UWvE.svg)](https://codewiki.google/github.com/f88/protopedia-api-v2-client.js)

## Description

Type-safe, ESM-first client for the ProtoPedia API Ver 2.0. Built with TypeScript, tested with Vitest, and ready for Node.js 22+.

- Node.js 22+ with native `fetch`
- Fully typed request/response models (response types are inferred from observed responses; see [Notes](#notes))
- Pluggable logging with level control
- Abortable requests and configurable timeout
- No runtime dependencies

## Requirements

- Node.js >= 22
- ESM environment

## ProtoPedia API Ver 2.0

ProtoPedia API Ver 2.0 · Apiary
<https://protopediav2.docs.apiary.io>

## Features

The JavaScript client library supports [ProtoPedia API Ver 2\.0 · Apiary](https://protopediav2.docs.apiary.io/)

### Supported APIs

- [作品一覧](https://protopediav2.docs.apiary.io/#reference/0/0)
    - `GET https://protopedia.net/v2/api/prototype/list`
- [作品一覧（TSV）](<https://protopediav2.docs.apiary.io/#reference/0/(tsv)/0>)
    - `GET https://protopedia.net/v2/api/prototype/list/tsv`

## Installation

```sh
npm install protopedia-api-v2-client
```

## Getting Started

### Create a client

Pass your API token when creating a client:

```ts
import { createProtoPediaClient } from 'protopedia-api-v2-client';

const client = createProtoPediaClient({
    token: 'your-token',
});
```

The client does not read environment variables by itself. To keep the token out of your source code (recommended when sharing or committing it), read it from an environment variable in your code and pass it explicitly:

```ts
const client = createProtoPediaClient({
    token: process.env.PROTOPEDIA_API_V2_TOKEN,
});
```

### Client options

| Option      | Default                                           | Description                                                                                                                                              |
| ----------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `token`     | (required)                                        | API token, sent as `Authorization: Bearer <token>`                                                                                                       |
| `baseUrl`   | `https://protopedia.net/v2/api`                   | Base URL of the API                                                                                                                                      |
| `fetch`     | `globalThis.fetch`                                | Custom `fetch` implementation (must honor `init.signal`)                                                                                                 |
| `userAgent` | `ProtoPedia API Ver 2.0 Node.js Client/<version>` | Sent as the `X-Client-User-Agent` header                                                                                                                 |
| `timeoutMs` | `60000`                                           | Maximum time in milliseconds from the start of a request until the response is received (`0` disables it). See [Timeouts and Abort](#timeouts-and-abort) |
| `logger`    | `console`                                         | Custom logger. See [Logging](#logging)                                                                                                                   |
| `logLevel`  | `error`                                           | Log level. See [Logging](#logging)                                                                                                                       |

## Usage

List prototypes:

```ts
import { ProtoPediaApiError } from 'protopedia-api-v2-client';
import type { ListPrototypesParams } from 'protopedia-api-v2-client';

const params: ListPrototypesParams = {
    tagNm: 'IoT',
    limit: 10,
    offset: 0,
};

try {
    const res = await client.listPrototypes(params, {
        headers: { 'X-Custom': 'value' },
        // Per-request log level override:
        logLevel: 'info',
    });
    console.log(res.count, res.results?.[0]);
} catch (err) {
    if (err instanceof ProtoPediaApiError) {
        console.error(
            'API error',
            err.status,
            err.statusText,
            err.req.url,
            err.body,
        );
    } else {
        console.error('Unexpected error', err);
    }
}
```

Download TSV:

```ts
const tsv = await client.downloadPrototypesTsv(
    { limit: 100 },
    { logLevel: 'debug' },
);
console.log(tsv);
```

## Examples

For a comprehensive implementation example using this client, see:

- [F88/promidas: Snapshot\-based in\-memory store for ProtoPedia prototypes with TTL management](https://github.com/F88/promidas)
    - [promidas/lib/fetcher](https://github.com/F88/promidas/tree/main/lib/fetcher) - Full-featured integration example

## API Surface

- Client and factories:
    - [`ProtoPediaApiClient`](src/client.ts)
    - [`createProtoPediaClient`](src/client.ts)
- Errors:
    - [`ProtoPediaApiError`](src/errors.ts)
- Requests and responses:
    - [`ListPrototypesParams`](src/types/protopedia-api-v2/request.ts)
    - [`ListPrototypesApiResponse`](src/types/protopedia-api-v2/response.ts)
- Logging:
    - [`Logger`](src/logger.ts)
    - [`LogLevel`](src/logger.ts)
- Package entry point:
    - [`src/index.ts`](src/index.ts)

## Logging

Supported levels: `silent`, `error`, `warn`, `info`, `debug` (default: `error`).

Configure at client creation time or per request:

```ts
const client = createProtoPediaClient({
    token: 'your-token',
    logLevel: 'warn',
});
await client.listPrototypes({}, { logLevel: 'debug' }); // override
```

Pass your own logger with the `logger` option. It needs `error`, `warn`, `info` and `debug` methods that take `(message, metadata?)`:

```ts
import type { Logger } from 'protopedia-api-v2-client';

const logger: Logger = {
    error: (message, metadata) => myLogger.error(message, metadata),
    warn: (message, metadata) => myLogger.warn(message, metadata),
    info: (message, metadata) => myLogger.info(message, metadata),
    debug: (message, metadata) => myLogger.debug(message, metadata),
};

const client = createProtoPediaClient({
    token: 'your-token',
    logger,
    logLevel: 'info',
});
```

- Exceptions thrown by the logger are ignored, so logging never changes the result of a request.
- Headers are sanitized for logging: values of headers whose name contains `token` or `auth` (case-insensitive) are masked as `***`. See [`headersForLogging`](src/logger.ts).

## Timeouts and Abort

- `timeoutMs` is the maximum time from the start of a request until the response is received, including the response body. Converting the response to JSON is not included. The default is `60000 ms`
- If the time runs out, the call fails with a `DOMException` named `TimeoutError`. If `fetch` itself fails with a different error at that moment, such as a network error, that error is thrown as is. Set a larger value for large downloads or slow networks
- The ProtoPedia API can take several seconds to respond, even for a small request. Avoid setting a very short `timeoutMs`
- `timeoutMs: 0` disables the SDK timer. Invalid values, such as a negative number or `Infinity`, fall back to the default
- Pass an `AbortSignal` per request to cancel it at any time. The call fails with the reason passed to `abort()`, or an `AbortError` if there is none
- `timeoutMs` is an upper limit. It does not guarantee that the SDK waits that long: a request can fail earlier because of the runtime or the network, and `timeoutMs` does not change those limits. For example, Node.js `fetch` has its own connection, header, and body timeouts. These fail with a `TypeError` that has the code in `error.cause.code`. If the failure happens while reading an error response, `ProtoPediaApiError` keeps the status, and that `TypeError` is in `error.cause`. See [#68](https://github.com/F88/protopedia-api-v2-client.js/issues/68)
- Both the timeout and the cancellation work by aborting the `signal` passed to `fetch`. A custom `fetch` must honor `init.signal` until the body has been read; otherwise the request is not stopped and `timeoutMs` has no effect

```ts
const controller = new AbortController();
const promise = client.listPrototypes({}, { signal: controller.signal });
controller.abort(new DOMException('User cancel', 'AbortError'));

try {
    await promise;
} catch (err) {
    // With Node.js fetch, err is the reason passed to controller.abort()
}
```

## TypeScript

Types are emitted to `lib/types`. Public type exports are available via the package root. See:

- [`src/index.ts`](src/index.ts)
- [`src/types/protopedia-api-v2`](src/types/protopedia-api-v2)

## Notes

- This client mirrors the current public API behavior and may need updates if the API changes.
- ProtoPedia API Ver 2.0 does not publish response schemas; its documentation only shows an example response. The response types are inferred from observed responses, so actual responses may not always match them (e.g. attributes typed as required may be missing).
- TSV download currently uses `Accept: application/json` internally for compatibility.

## License

Distributed under CC0-1.0. See [LICENSE](LICENSE).
