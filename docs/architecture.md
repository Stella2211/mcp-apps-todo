# アーキテクチャ

MCP Apps Todo の全体アーキテクチャを解説します。

## システム全体図

```mermaid
graph TB
    subgraph Clients["クライアント"]
        CD["Claude Desktop"]
        CC["Claude Code"]
        VSC["VS Code"]
        Browser["ブラウザ"]
    end

    subgraph CF["Cloudflare Workers"]
        Entry["src/server.ts<br/>(エントリポイント)"]

        subgraph MCPLayer["MCP レイヤー"]
            Handler["mcp/handler.ts<br/>(HTTP ハンドラー)"]
            Server["mcp/server.ts<br/>(ツール定義)"]
            MCPUI["mcp-ui/<br/>(埋め込み UI)"]
        end

        subgraph WebLayer["Web レイヤー"]
            TSStart["TanStack Start<br/>(SSR/CSR)"]
            Router["TanStack Router<br/>(ファイルベース)"]
            ServerFns["Server Functions<br/>(RPC)"]
        end

        subgraph DataLayer["データレイヤー"]
            DB["src/lib/db.ts<br/>(CRUD 操作)"]
            Schema["src/db/schema.ts<br/>(Drizzle スキーマ)"]
        end
    end

    D1[("Cloudflare D1<br/>(SQLite)")]

    CD -->|"MCP (Streamable HTTP)"| Entry
    CC -->|"MCP (Streamable HTTP)"| Entry
    VSC -->|"MCP (Streamable HTTP)"| Entry
    Browser -->|"HTTP"| Entry

    Entry -->|"/mcp"| Handler
    Entry -->|"/*"| TSStart

    Handler --> Server
    Server --> MCPUI
    Server --> DB

    TSStart --> Router
    Router --> ServerFns
    ServerFns --> DB

    DB --> Schema
    Schema --> D1
```

## リクエストフロー

### MCP リクエスト (Claude Desktop / Code / VS Code)

```mermaid
sequenceDiagram
    participant Client as MCP クライアント
    participant Worker as Cloudflare Worker
    participant Handler as MCP Handler
    participant Server as MCP Server
    participant Transport as Streamable HTTP Transport
    participant DB as Cloudflare D1

    Client->>Worker: POST /mcp (JSON-RPC)
    Worker->>Handler: handleMcpRequest(request, d1)
    Handler->>Transport: new WebStandardStreamableHTTPServerTransport()
    Handler->>Server: createMcpServer(d1)
    Handler->>Server: server.connect(transport)

    alt ツール呼び出し (例: list_todos)
        Transport->>Server: ツール実行
        Server->>DB: クエリ実行
        DB-->>Server: 結果
        Server-->>Transport: テキスト応答 + UI メタデータ
    end

    Transport-->>Handler: Response
    Handler->>Server: server.close()
    Handler-->>Worker: Response
    Worker-->>Client: JSON-RPC レスポンス
```

### Web リクエスト (ブラウザ)

```mermaid
sequenceDiagram
    participant Browser as ブラウザ
    participant Worker as Cloudflare Worker
    participant TSStart as TanStack Start
    participant Loader as Route Loader
    participant ServerFn as Server Function
    participant DB as Cloudflare D1

    Browser->>Worker: GET /$username
    Worker->>TSStart: startHandler(request)
    TSStart->>Loader: Route.loader()
    Loader->>ServerFn: getTodos({username})
    ServerFn->>DB: SELECT * FROM todos
    DB-->>ServerFn: rows
    ServerFn-->>Loader: Todo[]
    Loader-->>TSStart: {todos, username}
    TSStart-->>Worker: SSR HTML
    Worker-->>Browser: HTML レスポンス

    Note over Browser: CSR ハイドレーション後

    Browser->>ServerFn: addTodo({username, title})
    Note over Browser: useOptimistic で即時 UI 更新
    ServerFn->>DB: INSERT INTO todos
    DB-->>ServerFn: 新規 Todo
    ServerFn-->>Browser: Todo オブジェクト
    Note over Browser: サーバー応答で state 確定
```

## レイヤー構成

```mermaid
graph LR
    subgraph Presentation["プレゼンテーション層"]
        WebUI["Web UI<br/>(React + shadcn/ui)"]
        EmbedUI["MCP 埋め込み UI<br/>(React SPA)"]
    end

    subgraph Application["アプリケーション層"]
        MCPTools["MCP ツール<br/>(5 ツール)"]
        SFns["Server Functions<br/>(5 関数)"]
    end

    subgraph Domain["ドメイン層"]
        DBOps["DB 操作<br/>(src/lib/db.ts)"]
    end

    subgraph Infrastructure["インフラ層"]
        Drizzle["Drizzle ORM"]
        D1["Cloudflare D1"]
    end

    WebUI --> SFns
    EmbedUI -->|"app.callServerTool()"| MCPTools
    MCPTools --> DBOps
    SFns --> DBOps
    DBOps --> Drizzle
    Drizzle --> D1
```

**ポイント**: MCP ツールと Web UI の Server Functions は、同じ DB 操作関数 (`src/lib/db.ts`) を共有しています。これにより、MCP 経由の操作もブラウザ経由の操作も同じデータに対して一貫した処理が行われます。

## ルーティング

Cloudflare Worker のエントリポイント (`src/server.ts`) で、パスに基づいてリクエストを振り分けます。

```mermaid
graph TD
    Req["受信リクエスト"] --> Check{"/mcp ?"}
    Check -->|Yes| MCP["handleMcpRequest()<br/>MCP プロトコル処理"]
    Check -->|No| Web["startHandler()<br/>TanStack Start SSR"]

    Web --> Routes{ルーティング}
    Routes -->|"/"| Home["index.tsx<br/>ユーザー名入力"]
    Routes -->|"/$username"| Todo["$username.tsx<br/>Todo 一覧"]
```

## データベーススキーマ

```mermaid
erDiagram
    todos {
        text id PK "UUID (crypto.randomUUID)"
        text title "Todoタイトル (NOT NULL)"
        text description "説明 (デフォルト: 空文字)"
        integer completed "完了フラグ (0/1, デフォルト: 0)"
        text username "ユーザー名 (NOT NULL)"
        text created_at "作成日時 (ISO 8601)"
        text updated_at "更新日時 (ISO 8601)"
    }
```

## ビルドパイプライン

```mermaid
graph LR
    subgraph Phase1["Phase 1: MCP UI ビルド"]
        MCPUI_Src["mcp-ui/src/<br/>App.tsx + main.tsx"]
        MCPUI_Vite["Vite + React<br/>+ vite-plugin-singlefile"]
        MCPUI_Out["mcp-ui/dist/index.html<br/>(単一ファイル)"]
        MCPUI_Src --> MCPUI_Vite --> MCPUI_Out
    end

    subgraph Phase2["Phase 2: メインアプリビルド"]
        Import["mcp/server.ts<br/>import appHtml from '...?raw'"]
        Main_Src["src/**<br/>(React + TanStack)"]
        Main_Vite["Vite + TanStack Start<br/>+ Cloudflare plugin"]
        Main_Out["dist/<br/>(Worker バンドル)"]
        MCPUI_Out --> Import
        Import --> Main_Vite
        Main_Src --> Main_Vite --> Main_Out
    end

    subgraph Phase3["Phase 3: デプロイ"]
        Main_Out --> Wrangler["Wrangler CLI"]
        Wrangler --> CFW["Cloudflare Workers"]
    end
```

**重要**: ビルドは必ず Phase 1 → Phase 2 の順で実行する必要があります。MCP UI の HTML が `?raw` インポートで MCP サーバーに埋め込まれるため、先にビルドしておく必要があります。
