# protopedia-api-v2-client.js

## Unreleased

### Fixed

- `fetch` is no longer called with the client as `this`, which failed with `Illegal invocation` in some `fetch` implementations when the `fetch` option was not passed. The supported environments do not change
- A timeout or caller abort during the body read now fails with `TimeoutError` or the abort reason even if the `fetch` implementation replaces the error, as Chrome does for a body wrapped in a JavaScript stream

## 5.0.0 - 2026-11-06

### BREAKING CHANGES

- **`timeoutMs` now covers the whole response**: It limits the time from the start of a request until the response body is received. Previously it stopped when the response headers arrived, so a slow download could run past it. A slow download that succeeded before can now fail with `TimeoutError`; set a larger `timeoutMs` if needed (#68)
- **The default `timeoutMs` is now 60 seconds** (previously 15 seconds), because it now covers the whole response
- **A failed read of an error response body no longer sets `body.parseError`**: `ProtoPediaApiError` keeps the status, with `body` set to `null` and the read error in `cause`. A timeout or a caller abort during the read now fails with `TimeoutError` or the abort reason instead
- **`ProtoPediaApiClient.execute()` is now private**: Subclasses can no longer call or override it. Use the `fetch` option to customize requests

### Added

- Log `HTTP response body received` with the body length at debug level

### Fixed

- A timeout now fails with `TimeoutError` even if the `fetch` implementation rejects with an `AbortError`, whether a `DOMException` or an `Error`
- A `timeoutMs` over 2147483647 no longer fails almost immediately. It is capped at that value
- `listPrototypes()` now throws `ProtoPediaApiError` when a successful response is not valid JSON, instead of `TypeError: Body is unusable: Body has already been read`
- `listPrototypes()` now rethrows the original error when reading the response body fails, instead of replacing it with the same `TypeError`
- Aborting the caller's `signal` now stops reading the response body. Previously it had no effect once `fetch` resolved, and `listPrototypes()` and `downloadPrototypesTsv()` kept waiting for the body.
- A JSON parse failure of a successful response is now logged at error level

## 4.0.0 - 2026-11-05

### BREAKING CHANGES

- **Drop Node.js 20 support**: The minimum supported Node.js version is now 22 (`engines.node: ">=22"`)
    - Node.js 20 reached end-of-life on 2026-04-30
    - Upgrade your runtime to Node.js 22 or later
- **Remove the deprecated `ListPrototypesParams_Old` type**: It was marked `@deprecated` and did not match the API parameters. Use `ListPrototypesParams` instead

### Added

- Export the `Logger` and `LogLevel` types from the package root, for implementing a custom logger

### Fixed

- Log client timeouts as `HTTP request timed out` instead of `HTTP request threw an unexpected error` or `HTTP request aborted`. The thrown error is unchanged
- Log caller aborts as `HTTP request aborted by caller` regardless of the abort reason (e.g. `abort(new Error(...))`, `AbortSignal.timeout()`). The thrown abort reason is unchanged
- Exceptions thrown by a custom logger no longer change the request result (a successful response is no longer turned into a failure, and the original error is no longer replaced)
- `createProtoPediaClient` now throws ``Missing API token. Pass it with the `token` option.`` instead of `Missing PROTOPEDIA_API_V2_TOKEN.` when the token is missing. The client does not read the `PROTOPEDIA_API_V2_TOKEN` environment variable, so the previous message was misleading. Code that matches the old message needs to be updated

### CI

- Update test matrix to Node.js 22.x, 24.x and 26.x (drop 20.x)
- Adopt GitHub Actions workflow lockfile (`.github/workflows/actions.lock`) to pin all direct and transitive actions to verified commits
- Add `verify-lockfile` workflow to detect stale or corrupt lockfiles

### Dependencies

- Update development dependencies: eslint 10, vitest 5 (vite 8), msw 3, dotenv 18, prettier 3.9, typescript-eslint 8.72

### Development

- Add scripts to fetch the raw `GET /prototype/list` response and compare it with the type definitions (`npm run survey:fetch`, `npm run survey:analyze`)

### Documentation

- Use the official name "ProtoPedia API Ver 2.0" in README, package description and JSDoc
- Clarify in README that response types are inferred from observed responses, since ProtoPedia API Ver 2.0 does not publish response schemas
- Fix broken links to the type definition sources in README
- Fix README examples: the client does not read environment variables, so pass the token explicitly (Getting Started, Logging)
- Document client options, the default log level, custom loggers, header masking, and timeout/abort behavior in README, and handle the rejection in the abort example

## 3.0.0 - 2025-12-11

### BREAKING CHANGES

- **Type definition improvements for `ResultOfListPrototypesApiResponse`**: 9 fields changed from required to optional based on actual API data analysis (5,861 prototypes)
    - Fields made optional: `teamNm`, `users`, `freeComment`, `releaseDate`, `thanksFlg`, `uuid`, `revision`, `releaseFlg`, `licenseType`
    - These changes align type definitions with real API behavior where some fields may be missing or empty
    - Migration guide:

    ```typescript
    // Before (TypeScript with strictNullChecks)
    const teamName = result.teamNm; // string
    const uuid = result.uuid; // string
    const license = result.licenseType; // number

    // After (handle potential undefined values)
    const teamName = result.teamNm ?? ''; // string | undefined
    const uuid = result.uuid ?? ''; // string | undefined
    const license = result.licenseType ?? 0; // number | undefined

    // Use optional chaining for method calls
    const upperTeam = result.teamNm?.toUpperCase() ?? '';
    ```

### Documentation

- **Comprehensive TSDoc added to all 35 fields** in `ResultOfListPrototypesApiResponse`
    - Added **Confidence Level System**: ✅ Confirmed (26 fields), 🔵 Estimated (4 fields), ❔ Unknown (5 fields)
    - Added **Presence rates** with exact counts from 5,861 real prototypes (IDs 1-7926)
    - Added **Statistics**: String lengths, element counts, value ranges, and date formats
    - Added **Examples** for all fields with realistic data
    - Added **Edit screen** labels for confirmed fields
    - Translated all documentation from Japanese to English
    - Reorganized fields for better logical grouping
- Reordered fields in `ResultOfListPrototypesApiResponse` for improved readability (non-breaking)

## 2.0.0 - 2025-12-08

### BREAKING CHANGES

- **Error structure refactored**: `ProtoPediaApiError` now groups request information under a `req` object
    - `error.url` is now `error.req.url` and `error.req.method` is newly added`
    - Error message simplified from "Request failed with status {status}" to "API request failed"
    - Migration guide:

    ```typescript
    // Before
    if (err instanceof ProtoPediaApiError) {
        console.log(err.method, err.url);
    }

    // After
    if (err instanceof ProtoPediaApiError) {
        console.log(err.req.method, err.req.url);
    }
    ```

### Tests

- Improved test coverage from 96.24% to 98.12%
- Added comprehensive tests for logger fallback paths and metadata handling
- Enhanced abort signal and error handling test coverage

## 1.2.1 - 2025-12-08

- Update development dependencies to latest versions.

## 1.2.0 - 2025-10-26

### Changed

- エラーハンドリングを強化: サーバー応答の `Content-Type` が `application/json` の場合は JSON を優先し、`Response#clone()` を用いて二重読み取りの問題（"Body has already been read"）を回避。JSON 解析に失敗した場合は `text()` へフォールバックし、逆にテキスト取得に失敗した場合は最終手段として `json()` を試行する堅牢なフローに変更。
- ログ/テスト設定の微調整。

### Fixed

- TSV エンドポイントが 500 で HTML を返すケースの取り扱いを改善し、よりわかりやすいエラーメッセージを返すように修正。
- `json()` と `text()` の両方が失敗する稀なケースでのフォールバック処理を追加し、エラーオブジェクトの生成が失敗しないように改善。

### Tests/Chore

- E2E: 実 API を用いた list/TSV のパフォーマンステストを追加。
- Integration: 500（HTML 応答）をシミュレートするハンドラと関連テストを追加。
- Dev: Vitest を 4.0.3 に更新（その他開発用依存のメンテナンス）。

## 1.1.0 - 2025-10-21

### Changed

- バージョン解決の堅牢化（脆弱な相対 import を廃止）。ビルド時に `src/version.ts` を生成するフローへ移行（`scripts/generate-version.mjs`/`package.json` を更新）。
- 開発ツール整備と設定更新（ESLint のスクリプトファイル向け language options を追加、`package.json` のスクリプト/メタデータ整理）。
- ドキュメント: README のバッジを整理（重複 DeepWiki バッジ削除、npm publish バッジ削除、カバレッジ/README バッジ更新）。
- 依存関係更新（例: `@types/node` を v22.18.12 に更新、Node 22 系ロックファイルのメンテナンス）。

### Fixed

- `console.error` メッセージのフォーマットを修正。

## 1.0.0 - 2025-10-21

- Initial release of the Protopedia API v2 Client library.

<!-- markdownlint-configure-file { "MD024": { "siblings_only": true } } -->
