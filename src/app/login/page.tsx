"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/ui/kit/Button";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/");
    else setError("Wrong password");
  }
  return (
    <div className="login-wrap">
      <form onSubmit={submit} className="login-card">
        <h1>Sign in</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="text-input"
        />
        <Button type="submit">Enter</Button>
        {error && <p style={{ color: "var(--c-red)", margin: 0, fontSize: 13 }}>{error}</p>}
      </form>
    </div>
  );
}
