import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return;
    navigate({ to: "/$username", params: { username: trimmed } });
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ListTodo className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Todo App</CardTitle>
          <CardDescription>
            ユーザー名を入力して Todo リストを表示
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ユーザー名"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={!username.trim()}>
              開く
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
