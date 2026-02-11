# Web UI

ブラウザからアクセスできる Web UI の構成を説明します。

## 概要

Web UI は React 19 + TanStack Start による SSR/CSR アプリケーションです。MCP 経由の操作と同じデータベースを共有しており、どちらの UI からでも同じ Todo を操作できます。

## 技術構成

| 要素 | 技術 |
|------|------|
| フレームワーク | TanStack Start (TanStack Router ベースのメタフレームワーク) |
| UI ライブラリ | shadcn/ui (Radix UI ベース) |
| スタイリング | Tailwind CSS v4 |
| サーバー通信 | TanStack Server Functions (型安全な RPC) |
| 状態管理 | React useState + useOptimistic |

## ページ構成

```mermaid
graph TD
    Root["__root.tsx<br/>ルートレイアウト<br/>(Header + Outlet)"]
    Home["index.tsx<br/>/ ホーム<br/>(ユーザー名入力)"]
    Todo["$username.tsx<br/>/$username Todo一覧<br/>(SSR loader)"]

    Root --> Home
    Root --> Todo
```

### `/` — ホーム画面 (`src/routes/index.tsx`)

ユーザー名を入力するフォーム。入力後に `/$username` にナビゲートします。

### `/$username` — Todo 一覧 (`src/routes/$username.tsx`)

- **Route Loader** でサーバーサイドデータフェッチ
- `getTodos` Server Function を呼び出し、初期データを取得
- `TodoList` コンポーネントに渡して描画

## コンポーネント構成

```mermaid
graph TD
    TodoPage["TodoPage<br/>($username.tsx)"]
    TodoList["TodoList<br/>(メインコンポーネント)"]
    AddTodo["AddTodo<br/>(入力フォーム)"]
    Tabs["Tabs<br/>(フィルタ: すべて/未完了/完了)"]
    TodoItem["TodoItem<br/>(個別アイテム)"]

    TodoPage --> TodoList
    TodoList --> AddTodo
    TodoList --> Tabs
    TodoList --> TodoItem
```

### TodoList (`src/components/TodoList.tsx`)

メインコンポーネント。以下の機能を持ちます:

- **フィルタリング**: すべて / 未完了 / 完了 の Tab 切り替え
- **オプティミスティック更新**: `useOptimistic` フックにより、サーバー応答を待たずに即座に UI を更新
- **CRUD 操作**: Server Functions を通じた追加・完了トグル・更新・削除

### オプティミスティック更新パターン

```mermaid
sequenceDiagram
    participant User as ユーザー
    participant UI as React UI
    participant Optimistic as useOptimistic
    participant Server as Server Function
    participant DB as D1

    User->>UI: Todo を追加
    UI->>Optimistic: addOptimistic({type: "add"})
    Note over UI: 即座に UI に反映
    UI->>Server: addTodo({username, title})
    Server->>DB: INSERT
    DB-->>Server: 新規 Todo
    Server-->>UI: 確定データ
    UI->>UI: setTodos() で確定
```

`useOptimistic` は以下の4つのアクションを処理します:

| アクション | 説明 |
|-----------|------|
| `add` | 仮 ID でリスト先頭に追加 |
| `toggle` | completed フラグの反転 |
| `update` | タイトルの即時変更 |
| `delete` | リストからの即時除去 |

## Server Functions (`src/lib/server-fns.ts`)

TanStack Start の `createServerFn()` により、型安全なサーバー呼び出しを実現しています。

```mermaid
graph LR
    Client["クライアントコード<br/>serverFns.addTodo({data: ...})"]
    ServerFn["createServerFn()<br/>(自動シリアライズ)"]
    DBOps["dbOps.addTodo()"]
    D1[("D1")]

    Client -->|"HTTP POST (自動)"| ServerFn
    ServerFn --> DBOps --> D1
```

| 関数 | HTTP メソッド | 用途 |
|------|-------------|------|
| `getTodos` | GET | Todo 一覧取得 |
| `addTodo` | POST | Todo 追加 |
| `updateTodo` | POST | Todo 更新 |
| `toggleTodo` | POST | 完了トグル |
| `deleteTodo` | POST | Todo 削除 |

Server Functions のメリット:
- API エンドポイントの手動定義が不要
- 型安全 (入力・出力とも TypeScript の型が適用)
- クライアントからは通常の関数呼び出しと同じインターフェース
