# protopedia-api-v2-client.js

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
