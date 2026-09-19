"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/ui/kit/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) router.push("/");
    else setError("Email ou mot de passe invalide");
  }
  return (
    <div className="login-wrap">
      <form onSubmit={submit} className="login-card">
        <h1>Sign in</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoFocus
          autoComplete="email"
          className="text-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="text-input"
        />
        <Button type="submit">Enter</Button>
        {error && <p style={{ color: "var(--c-red)", margin: 0, fontSize: 13 }}>{error}</p>}
      </form>
    </div>
  );
}
