# ProtoPedia API Ver 2.0 Client for Javascript

## Description

ProtoPedia API Ver 2.0 クライアントライブラリ for Javascript

Type-safe, ESM-first client for the ProtoPedia API v2. Built with TypeScript, tested with Vitest, and ready for Node.js 20+.

- Node.js 20+ with native `fetch`
- Fully typed request/response models
- Pluggable logging with level control
- Abortable requests and configurable timeout
- Minimal, dependency-light

## Requirements

- Node.js >= 20
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

Set your API token:

```sh
export PROTOPEDIA_API_V2_TOKEN=your-token
```

Or create a `.env` file (see `.env.example`):

```dotenv
PROTOPEDIA_API_V2_TOKEN=your-token
PROTOPEDIA_API_LOG_LEVEL=info
```

### Create a client

```ts
import { createProtoPediaClient } from 'protopedia-api-v2-client';

const client = createProtoPediaClient({
    token: 'your-token',
});
```

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
            err.url,
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

## API Surface

- Client and factories:
    - [`ProtoPediaApiClient`](src/client.ts)
    - [`createProtoPediaClient`](src/client.ts)
- Errors:
    - [`ProtoPediaApiError`](src/errors.ts)
- Requests and responses:
    - [`ListPrototypesParams`](types/protopedia-api-v2/request.ts)
    - [`ListPrototypesApiResponse`](types/protopedia-api-v2/response.ts)
- Package entry points:
    - [`src/index.ts`](src/index.ts)
    - [`types/index.ts`](types/index.ts)

## Logging

Supported levels: `silent`, `error`, `warn`, `info`, `debug`.

Configure at client creation time or per request:

```ts
const client = createProtoPediaClient({ logLevel: 'warn' });
await client.listPrototypes({}, { logLevel: 'debug' }); // override
```

Headers are sanitized for logging (token-like headers are masked). See [`headersForLogging`](src/logger.ts).

## Timeouts and Abort

- Default timeout: `15000 ms`
- Override with `timeoutMs` in client options
- Pass an `AbortSignal` per request

```ts
const controller = new AbortController();
const promise = client.listPrototypes({}, { signal: controller.signal });
controller.abort(new DOMException('User cancel', 'AbortError'));
```

## TypeScript

Types are emitted to `lib/types`. Public type exports are available via the package root. See:

- [`types/index.ts`](types/index.ts)
- [`types/protopedia-api-v2`](types/protopedia-api-v2)

## Notes

- This client mirrors the current public API behavior and may need updates if the API changes.
- TSV download currently uses `Accept: application/json` internally for compatibility.

## License

Distributed under CC0-1.0. See [LICENSE](LICENSE).
