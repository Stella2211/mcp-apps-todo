import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { createDb } from "@/db";
import * as dbOps from "@/lib/db";

function getDb() {
  return createDb(env.DB);
}

export const getTodos = createServerFn({ method: "GET" })
  .inputValidator(
    (input: { username: string; status?: "all" | "active" | "completed" }) =>
      input
  )
  .handler(async ({ data }) => {
    return dbOps.getTodos(getDb(), data.username, data.status);
  });

export const addTodo = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { username: string; title: string; description?: string }) => input
  )
  .handler(async ({ data }) => {
    return dbOps.addTodo(getDb(), data.username, data.title, data.description);
  });

export const updateTodo = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      id: string;
      username: string;
      title?: string;
      description?: string;
    }) => input
  )
  .handler(async ({ data }) => {
    const { id, username, ...rest } = data;
    return dbOps.updateTodo(getDb(), id, username, rest);
  });

export const toggleTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; username: string }) => input)
  .handler(async ({ data }) => {
    return dbOps.toggleTodo(getDb(), data.id, data.username);
  });

export const deleteTodo = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; username: string }) => input)
  .handler(async ({ data }) => {
    return dbOps.deleteTodo(getDb(), data.id, data.username);
  });
