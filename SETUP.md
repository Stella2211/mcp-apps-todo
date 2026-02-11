# MCP Todo App セットアップガイド

## デプロイ済み URL

- **Web UI**: https://mcp-apps-todo.starry-night.dev
- **MCP エンドポイント**: https://mcp-apps-todo.starry-night.dev/mcp

---

## Web UI の使い方

1. https://mcp-apps-todo.starry-night.dev にアクセス
2. ユーザー名を入力して「開く」をクリック
3. Todo の追加・編集・完了・削除が可能

---

## Claude Desktop での設定

`claude_desktop_config.json` に以下を追加:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "todo": {
      "type": "streamable-http",
      "url": "https://mcp-apps-todo.starry-night.dev/mcp"
    }
  }
}
```

設定後、Claude Desktop を再起動してください。

---

## Claude Code (CLI) での設定

プロジェクト単位で追加:

```bash
claude mcp add todo --transport http https://mcp-apps-todo.starry-night.dev/mcp
```

グローバルに追加:

```bash
claude mcp add todo --transport http https://mcp-apps-todo.starry-night.dev/mcp -s user
```

---

## VS Code (Claude 拡張機能) での設定

`.vscode/settings.json` に追加:

```json
{
  "claude-code.mcpServers": {
    "todo": {
      "type": "streamable-http",
      "url": "https://mcp-apps-todo.starry-night.dev/mcp"
    }
  }
}
```

---

## 使い方の例

Claude との会話で以下のように使えます:

### Todo の追加
> 「mario の Todo に『牛乳を買う』を追加して」

### Todo の一覧
> 「mario の Todo を見せて」

### Todo の完了
> 「mario の『牛乳を買う』を完了にして」

### Todo の削除
> 「mario の完了済み Todo を全部削除して」

---

## MCP Apps UI について

MCP Apps (SEP-1865) 対応のクライアントでは、ツール実行時にインタラクティブな Todo リスト UI が会話内に表示されます。UI から直接 Todo の追加・完了・削除が可能です。

---

## ローカル開発

```bash
# 依存関係インストール
bun install

# ローカル DB にマイグレーション適用
bunx wrangler d1 migrations apply mcp-todo-db --local

# 開発サーバー起動
bun run dev

# MCP Inspector でテスト
npx @modelcontextprotocol/inspector http://localhost:3000/mcp
```

---

## 利用可能なツール

| ツール | 説明 | 必須パラメータ |
|--------|------|---------------|
| `list_todos` | Todo 一覧取得 | `username` |
| `add_todo` | Todo 追加 | `username`, `title` |
| `update_todo` | Todo 更新 | `id`, `username` |
| `complete_todo` | 完了/未完了トグル | `id`, `username` |
| `delete_todo` | Todo 削除 | `id`, `username` |
