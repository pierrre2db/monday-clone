"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={submit} style={{ maxWidth: 320, margin: "15vh auto", display: "grid", gap: 12 }}>
      <h1>Sign in</h1>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoFocus />
      <button type="submit">Enter</button>
      {error && <p style={{ color: "#e2445c" }}>{error}</p>}
    </form>
  );
}
