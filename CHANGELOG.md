# protopedia-api-v2-client.js

## 1.1.0

### Changed

- バージョン解決の堅牢化（脆弱な相対 import を廃止）。ビルド時に `src/version.ts` を生成するフローへ移行（`scripts/generate-version.mjs`/`package.json` を更新）。
- 開発ツール整備と設定更新（ESLint のスクリプトファイル向け language options を追加、`package.json` のスクリプト/メタデータ整理）。
- ドキュメント: README のバッジを整理（重複 DeepWiki バッジ削除、npm publish バッジ削除、カバレッジ/README バッジ更新）。
- 依存関係更新（例: `@types/node` を v22.18.12 に更新、Node 22 系ロックファイルのメンテナンス）。

### Fixed

- `console.error` メッセージのフォーマットを修正。

## 1.0.0

- Initial release of the Protopedia API v2 Client library.
