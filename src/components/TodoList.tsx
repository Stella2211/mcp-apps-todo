import { useState, useOptimistic, useTransition } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddTodo } from "@/components/AddTodo";
import { TodoItem } from "@/components/TodoItem";
import * as serverFns from "@/lib/server-fns";
import type { Todo } from "@/db/schema";

type Filter = "all" | "active" | "completed";

interface TodoListProps {
  username: string;
  initialTodos: Todo[];
}

export function TodoList({ username, initialTodos }: TodoListProps) {
  const [todos, setTodos] = useState(initialTodos);
  const [filter, setFilter] = useState<Filter>("all");
  const [, startTransition] = useTransition();
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (state: Todo[], action: { type: string; payload: unknown }) => {
      switch (action.type) {
        case "add": {
          const p = action.payload as { id: string; title: string };
          return [
            {
              id: p.id,
              title: p.title,
              description: "",
              completed: false,
              username,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...state,
          ];
        }
        case "toggle": {
          const id = action.payload as string;
          return state.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t
          );
        }
        case "update": {
          const { id, title } = action.payload as {
            id: string;
            title: string;
          };
          return state.map((t) => (t.id === id ? { ...t, title } : t));
        }
        case "delete": {
          const delId = action.payload as string;
          return state.filter((t) => t.id !== delId);
        }
        default:
          return state;
      }
    }
  );

  const filtered = optimisticTodos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const activeCount = optimisticTodos.filter((t) => !t.completed).length;

  const handleAdd = (title: string) => {
    const tempId = crypto.randomUUID();
    startTransition(async () => {
      addOptimistic({ type: "add", payload: { id: tempId, title } });
      const todo = await serverFns.addTodo({ data: { username, title } });
      setTodos((prev) => [todo, ...prev]);
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      addOptimistic({ type: "toggle", payload: id });
      const todo = await serverFns.toggleTodo({ data: { id, username } });
      if (todo) {
        setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
      }
    });
  };

  const handleUpdate = (id: string, title: string) => {
    startTransition(async () => {
      addOptimistic({ type: "update", payload: { id, title } });
      const todo = await serverFns.updateTodo({
        data: { id, username, title },
      });
      if (todo) {
        setTodos((prev) => prev.map((t) => (t.id === id ? todo : t)));
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      addOptimistic({ type: "delete", payload: id });
      await serverFns.deleteTodo({ data: { id, username } });
      setTodos((prev) => prev.filter((t) => t.id !== id));
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{username} の Todo</span>
          <span className="text-sm font-normal text-muted-foreground">
            {activeCount} 件残り
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AddTodo onAdd={handleAdd} />
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as Filter)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              すべて
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              未完了
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              完了
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {filter === "all"
                ? "Todoがありません。追加してみましょう！"
                : filter === "active"
                  ? "未完了のTodoはありません。"
                  : "完了したTodoはありません。"}
            </p>
          ) : (
            filtered.map((todo) => (
              <div key={todo.id} className="group">
                <TodoItem
                  todo={todo}
                  onToggle={handleToggle}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
