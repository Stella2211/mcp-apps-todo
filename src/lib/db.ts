import { eq, and, desc } from "drizzle-orm";
import { todos } from "@/db/schema";
import type { Database } from "@/db";

export async function getTodos(
  db: Database,
  username: string,
  status?: "all" | "active" | "completed"
) {
  const conditions = [eq(todos.username, username)];
  if (status === "active") conditions.push(eq(todos.completed, false));
  if (status === "completed") conditions.push(eq(todos.completed, true));

  return db
    .select()
    .from(todos)
    .where(and(...conditions))
    .orderBy(desc(todos.createdAt));
}

export async function addTodo(
  db: Database,
  username: string,
  title: string,
  description?: string
) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const [todo] = await db
    .insert(todos)
    .values({
      id,
      title,
      description: description ?? "",
      username,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return todo;
}

export async function updateTodo(
  db: Database,
  id: string,
  username: string,
  data: { title?: string; description?: string }
) {
  const [todo] = await db
    .update(todos)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(and(eq(todos.id, id), eq(todos.username, username)))
    .returning();
  return todo;
}

export async function toggleTodo(db: Database, id: string, username: string) {
  const existing = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.username, username)))
    .limit(1);

  if (!existing.length) return null;

  const [todo] = await db
    .update(todos)
    .set({
      completed: !existing[0].completed,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(todos.id, id), eq(todos.username, username)))
    .returning();
  return todo;
}

export async function deleteTodo(db: Database, id: string, username: string) {
  const [todo] = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.username, username)))
    .returning();
  return todo;
}
