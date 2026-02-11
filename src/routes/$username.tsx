import { createFileRoute } from "@tanstack/react-router";
import { TodoList } from "@/components/TodoList";
import { getTodos } from "@/lib/server-fns";

export const Route = createFileRoute("/$username")({
  loader: async ({ params }) => {
    const todos = await getTodos({
      data: { username: params.username },
    });
    return { todos, username: params.username };
  },
  component: TodoPage,
});

function TodoPage() {
  const { todos, username } = Route.useLoaderData();

  return (
    <div className="min-h-[calc(100vh-64px)] p-4 md:p-8">
      <TodoList username={username} initialTodos={todos} />
    </div>
  );
}
