import { useState, useEffect, useCallback, useRef } from "react";
import {
  useApp,
  useHostStyles,
  useDocumentTheme,
} from "@modelcontextprotocol/ext-apps/react-with-deps";

interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [username, setUsername] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const appRef = useRef<ReturnType<typeof useApp>["app"]>(null);

  const { app, isConnected } = useApp({
    appInfo: { name: "TodoApp", version: "1.0.0" },
    capabilities: { tools: { callChanged: true } },
    onAppCreated: (app) => {
      appRef.current = app;
      app.ontoolinput = (params: { arguments?: Record<string, unknown> }) => {
        const args = params.arguments ?? {};
        if (args.username && typeof args.username === "string") {
          setUsername(args.username);
        }
      };
      app.ontoolresult = (params: {
        content?: Array<{ type: string; text?: string }>;
        isError?: boolean;
      }) => {
        if (params.isError) return;
        const textContent = params.content?.find(
          (c: { type: string }) => c.type === "text"
        );
        if (!textContent || !("text" in textContent) || !textContent.text)
          return;
        try {
          const data = JSON.parse(textContent.text);
          if (Array.isArray(data)) {
            setTodos(data);
            setInitialized(true);
          }
        } catch {
          // Not JSON array, might be single item result - refresh list
        }
      };
    },
  });

  useHostStyles(app, app?.getHostContext());
  const theme = useDocumentTheme();
  const isDark = theme === "dark";

  const refreshTodos = useCallback(async () => {
    if (!app || !username) return;
    setLoading(true);
    try {
      const result = await app.callServerTool({
        name: "list_todos",
        arguments: { username },
      });
      const textContent = result.content?.find(
        (c: { type: string }) => c.type === "text"
      );
      if (textContent && "text" in textContent && textContent.text) {
        const data = JSON.parse(textContent.text);
        if (Array.isArray(data)) {
          setTodos(data);
          setInitialized(true);
        }
      }
    } catch (e) {
      console.error("Failed to refresh todos:", e);
    } finally {
      setLoading(false);
    }
  }, [app, username]);

  useEffect(() => {
    if (username && app && isConnected) {
      refreshTodos();
    }
  }, [username, app, isConnected, refreshTodos]);

  const handleAdd = async () => {
    if (!app || !username || !newTitle.trim()) return;
    setLoading(true);
    try {
      await app.callServerTool({
        name: "add_todo",
        arguments: { username, title: newTitle.trim() },
      });
      setNewTitle("");
      await refreshTodos();
    } catch (e) {
      console.error("Failed to add todo:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    if (!app || !username) return;
    try {
      await app.callServerTool({
        name: "complete_todo",
        arguments: { id, username },
      });
      await refreshTodos();
    } catch (e) {
      console.error("Failed to toggle todo:", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!app || !username) return;
    try {
      await app.callServerTool({
        name: "delete_todo",
        arguments: { id, username },
      });
      await refreshTodos();
    } catch (e) {
      console.error("Failed to delete todo:", e);
    }
  };

  const bg = isDark ? "#1a1a2e" : "#ffffff";
  const fg = isDark ? "#e0e0e0" : "#1a1a2e";
  const border = isDark ? "#333" : "#e0e0e0";
  const muted = isDark ? "#888" : "#666";
  const inputBg = isDark ? "#2a2a3e" : "#f5f5f5";
  const btnBg = isDark ? "#4a4ae0" : "#2563eb";

  if (!isConnected) {
    return (
      <div style={{ padding: 20, color: muted, fontFamily: "system-ui" }}>
        接続中...
      </div>
    );
  }

  if (!username) {
    return (
      <div
        style={{
          padding: 20,
          color: fg,
          background: bg,
          fontFamily: "system-ui",
        }}
      >
        <p style={{ color: muted }}>
          Todoツールを使用してください。ユーザー名が自動的に設定されます。
        </p>
      </div>
    );
  }

  const activeCount = todos.filter((t) => !t.completed).length;

  return (
    <div
      style={{
        padding: 16,
        fontFamily: "system-ui",
        background: bg,
        color: fg,
        maxWidth: 500,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 18 }}>{username} の Todo</h2>
        <span style={{ fontSize: 13, color: muted }}>{activeCount} 件残り</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="新しいTodoを追加..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: `1px solid ${border}`,
            borderRadius: 6,
            background: inputBg,
            color: fg,
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || loading}
          style={{
            padding: "8px 16px",
            background: btnBg,
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 14,
            opacity: !newTitle.trim() || loading ? 0.5 : 1,
          }}
        >
          追加
        </button>
      </div>

      {!initialized && loading ? (
        <p style={{ color: muted, textAlign: "center" }}>読み込み中...</p>
      ) : todos.length === 0 ? (
        <p style={{ color: muted, textAlign: "center", padding: 20 }}>
          Todoがありません。追加してみましょう！
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {todos.map((todo) => (
            <div
              key={todo.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                border: `1px solid ${border}`,
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo.id)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span
                style={{
                  flex: 1,
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? muted : fg,
                }}
              >
                {todo.title}
              </span>
              <button
                onClick={() => handleDelete(todo.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e55",
                  cursor: "pointer",
                  fontSize: 16,
                  padding: "2px 6px",
                }}
                title="削除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
