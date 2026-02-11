import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { createDb } from "@/db";
import * as dbOps from "@/lib/db";
import appHtml from "../mcp-ui/dist/index.html?raw";

const UI_RESOURCE_URI = "ui://todo/app.html";

export function createMcpServer(d1: D1Database) {
  const db = createDb(d1);

  const server = new McpServer({
    name: "todo-mcp-server",
    version: "1.0.0",
  });

  // Register UI resource
  registerAppResource(
    server,
    "Todo App UI",
    UI_RESOURCE_URI,
    { description: "Interactive Todo list application" },
    async () => ({
      contents: [
        {
          uri: UI_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: appHtml,
        },
      ],
    })
  );

  // Register tools with UI metadata
  registerAppTool(
    server,
    "list_todos",
    {
      title: "Todo一覧取得",
      description: "指定ユーザーのTodo一覧を取得します",
      inputSchema: {
        username: z.string().describe("ユーザー名"),
        status: z
          .enum(["all", "active", "completed"])
          .optional()
          .describe("フィルタ: all / active / completed"),
      },
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
    },
    async ({ username, status }) => {
      const todos = await dbOps.getTodos(db, username, status ?? "all");
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(todos, null, 2),
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "add_todo",
    {
      title: "Todo追加",
      description: "新しいTodoを追加します",
      inputSchema: {
        username: z.string().describe("ユーザー名"),
        title: z.string().describe("Todoのタイトル"),
        description: z.string().optional().describe("Todoの説明"),
      },
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
    },
    async ({ username, title, description }) => {
      const todo = await dbOps.addTodo(db, username, title, description);
      return {
        content: [
          {
            type: "text" as const,
            text: `Todo「${todo.title}」を追加しました。\n${JSON.stringify(todo, null, 2)}`,
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "update_todo",
    {
      title: "Todo更新",
      description: "既存のTodoのタイトルや説明を更新します",
      inputSchema: {
        id: z.string().describe("TodoのID"),
        username: z.string().describe("ユーザー名"),
        title: z.string().optional().describe("新しいタイトル"),
        description: z.string().optional().describe("新しい説明"),
      },
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
    },
    async ({ id, username, title, description }) => {
      const data: { title?: string; description?: string } = {};
      if (title !== undefined) data.title = title;
      if (description !== undefined) data.description = description;
      const todo = await dbOps.updateTodo(db, id, username, data);
      if (!todo) {
        return {
          content: [{ type: "text" as const, text: "Todoが見つかりません。" }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Todoを更新しました。\n${JSON.stringify(todo, null, 2)}`,
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "complete_todo",
    {
      title: "Todo完了トグル",
      description: "Todoの完了/未完了を切り替えます",
      inputSchema: {
        id: z.string().describe("TodoのID"),
        username: z.string().describe("ユーザー名"),
      },
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
    },
    async ({ id, username }) => {
      const todo = await dbOps.toggleTodo(db, id, username);
      if (!todo) {
        return {
          content: [{ type: "text" as const, text: "Todoが見つかりません。" }],
          isError: true,
        };
      }
      const status = todo.completed ? "完了" : "未完了";
      return {
        content: [
          {
            type: "text" as const,
            text: `Todo「${todo.title}」を${status}にしました。\n${JSON.stringify(todo, null, 2)}`,
          },
        ],
      };
    }
  );

  registerAppTool(
    server,
    "delete_todo",
    {
      title: "Todo削除",
      description: "Todoを削除します",
      inputSchema: {
        id: z.string().describe("TodoのID"),
        username: z.string().describe("ユーザー名"),
      },
      _meta: { ui: { resourceUri: UI_RESOURCE_URI } },
    },
    async ({ id, username }) => {
      const todo = await dbOps.deleteTodo(db, id, username);
      if (!todo) {
        return {
          content: [{ type: "text" as const, text: "Todoが見つかりません。" }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `Todo「${todo.title}」を削除しました。`,
          },
        ],
      };
    }
  );

  return server;
}
