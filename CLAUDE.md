# CLAUDE.md

MCP Apps を活用した Todo アプリケーション。Claude Desktop / Claude Code / VS Code から MCP 経由で Todo を操作でき、会話内にインタラクティブな UI が表示される。

## プロジェクト概要

- **MCP Apps Todo** — MCP (Model Context Protocol) のリモートサーバーとして動作し、MCP Apps 拡張により会話内に埋め込みUIを提供する Todo アプリ
- 学習・練習用リポジトリ。認証・認可は未実装

## 技術スタック

- **フレームワーク**: React 19 + TanStack Start (SSR)
- **MCP**: `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps`
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **ホスティング**: Cloudflare Workers
- **ビルド**: Vite 7 + Bun
- **UI**: Tailwind CSS v4 + shadcn/ui

## ディレクトリ構成

```
mcp/           → MCP サーバー (ツール定義・ハンドラー)
mcp-ui/        → MCP 埋め込み UI (単一 HTML にビルド)
src/server.ts  → Cloudflare Worker エントリポイント (/mcp と Web UI のルーティング)
src/db/        → Drizzle ORM スキーマ・DB 初期化
src/lib/       → DB 操作関数・TanStack Server Functions
src/routes/    → ファイルベースルーティング
src/components/→ React コンポーネント (TodoList, TodoItem, AddTodo, Header)
drizzle/       → DB マイグレーション
```

## 開発コマンド

```bash
bun install                # 依存関係インストール
bun run dev                # 開発サーバー起動 (localhost:3000)
bun run build              # MCP UI + メインアプリのビルド
bun run deploy             # Cloudflare Workers にデプロイ
bun run test               # テスト実行
bunx wrangler d1 migrations apply mcp-todo-db --local   # ローカル DB マイグレーション
```

## MCP エンドポイント

- ローカル: `http://localhost:3000/mcp`
- 本番: `https://mcp-apps-todo.starry-night.dev/mcp`
- トランスポート: Streamable HTTP (セッションレス)

## MCP ツール一覧

| ツール | 説明 |
|--------|------|
| `list_todos` | Todo 一覧取得 (username, status?) |
| `add_todo` | Todo 追加 (username, title, description?) |
| `update_todo` | Todo 更新 (id, username, title?, description?) |
| `complete_todo` | 完了/未完了トグル (id, username) |
| `delete_todo` | Todo 削除 (id, username) |

全ツールに `_meta.ui.resourceUri` が付与され、MCP Apps 対応クライアントで UI が表示される。

## アーキテクチャの要点

- `src/server.ts` でパス `/mcp` を MCP ハンドラーに、それ以外を TanStack Start に振り分け
- MCP サーバーはリクエストごとにインスタンスを生成 (セッションレス)
- `mcp-ui/` は `vite-plugin-singlefile` で単一 HTML にビルドし、`?raw` で MCP サーバーに埋め込み
- MCP UI は `@modelcontextprotocol/ext-apps/react-with-deps` の `useApp()` で MCP クライアントと通信
- Web UI は `useOptimistic()` によるオプティミスティック更新で即時反映

## 注意事項

- D1 の database_id は `wrangler.jsonc` に記載。変更時は要更新
- `bun run build` は先に `build:mcp-ui` を実行してから本体ビルド (UI HTML の埋め込みに必要)
- パスエイリアス `@/` は `tsconfig.json` で `./src/*` にマッピング
