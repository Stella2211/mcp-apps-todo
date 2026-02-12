# MCP Apps Todo

[MCP Apps](https://modelcontextprotocol.io/specification/2025-12-17/server/apps)(旧 SEP-1865)を活用した Todo アプリです。Claude Desktop や Claude Code などの MCP クライアントから Todo を操作でき、**会話内にインタラクティブな UI が表示される**のが特徴です。

> [!WARNING]
> これは個人の学習・練習用リポジトリです。認証・認可をはじめとするセキュリティ対策は一切実装されていません。**本番環境での利用には適しません。**

## MCP Apps とは

通常の MCP ツールは テキストの入出力のみですが、MCP Apps を使うと **ツール実行時にリッチな UI を会話内に埋め込む**ことができます。

このアプリでは、Claude に「Todo を見せて」と頼むと、テキスト応答に加えて操作可能な Todo リスト UI が表示されます。UI 上から直接 Todo の追加・完了・削除ができ、その結果がサーバーに即時反映されます。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 19 + TanStack Start + Tailwind CSS |
| MCP サーバー | `@modelcontextprotocol/sdk` + `@modelcontextprotocol/ext-apps` |
| MCP 内 UI | React (単一 HTML にビルドして埋め込み) |
| データベース | Cloudflare D1 (SQLite) + Drizzle ORM |
| ホスティング | Cloudflare Workers |

## アーキテクチャ

```
┌──────────────┐      ┌───────────────────────────┐      ┌──────────┐
│ Claude       │◄────►│  Cloudflare Workers        │      │          │
│ Desktop/Code │ MCP  │  ┌──────────┐ ┌─────────┐ │      │ D1       │
│              │      │  │MCP Server│ │ Web UI  │ │◄────►│ Database │
└──────────────┘      │  └──────────┘ └─────────┘ │      │          │
                      └───────────────────────────┘      └──────────┘
                           ▲
┌──────────────┐           │
│ ブラウザ      │◄──────────┘
│ (Web UI)     │   HTTP
└──────────────┘
```

- `/mcp` — MCP エンドポイント (Streamable HTTP)
- `/` — Web UI (SSR)

## MCP ツール

| ツール | 説明 |
|--------|------|
| `list_todos` | Todo 一覧の取得 |
| `add_todo` | Todo の追加 |
| `update_todo` | Todo の更新 |
| `complete_todo` | 完了/未完了の切り替え |
| `delete_todo` | Todo の削除 |

すべてのツールに MCP Apps の UI メタデータが付与されており、対応クライアントではインタラクティブな UI が表示されます。

## セットアップ

### 前提条件

- [Bun](https://bun.sh/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare Workers)

### ローカル開発

```bash
# 依存関係のインストール
bun install

# ローカル DB にマイグレーション適用
bunx wrangler d1 migrations apply mcp-todo-db --local

# 開発サーバー起動 (http://localhost:3000)
bun run dev
```

### MCP Inspector でテスト

```bash
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

### デプロイ

```bash
# Cloudflare D1 データベースを作成 (初回のみ)
bunx wrangler d1 create mcp-todo-db

# wrangler.jsonc の database_id を作成した DB の ID に更新

# 本番 DB にマイグレーション適用
bunx wrangler d1 migrations apply mcp-todo-db --remote

# ビルド & デプロイ
bun run deploy
```

## Claude クライアントへの接続

デプロイ後の MCP エンドポイント URL を `https://<your-domain>/mcp` として、各クライアントに設定します。
例：https://mcp-apps-todo.starry-night.dev/mcp

### Claude Desktop

`claude_desktop_config.json` に追加:

```json
{
  "mcpServers": {
    "todo": {
      "type": "streamable-http",
      "url": "https://<your-domain>/mcp"
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add todo --transport http https://<your-domain>/mcp
```

### VS Code (Claude 拡張機能)

`.vscode/settings.json` に追加:

```json
{
  "claude-code.mcpServers": {
    "todo": {
      "type": "streamable-http",
      "url": "https://<your-domain>/mcp"
    }
  }
}
```

## 使い方の例

Claude との会話で:

- 「stella の Todo を見せて」
- 「stella の Todo に『牛乳を買う』を追加して」
- 「『牛乳を買う』を完了にして」

MCP Apps 対応クライアントでは、ツール実行時に UI が表示され、そこから直接操作することもできます。

## ライセンス

MIT
