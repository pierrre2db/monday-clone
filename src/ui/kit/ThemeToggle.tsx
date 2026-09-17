"use client";

import { useEffect, useState } from "react";
import Button from "./Button";

type Theme = "light" | "dark";

const STORAGE_KEY = "mk-theme";

function applyTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignore (private browsing / blocked storage)
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const initial: Theme =
      saved === "dark" || saved === "light"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    applyTheme(initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <Button
      type="button"
      variant="default"
      onClick={toggle}
      title="Basculer clair / sombre"
      aria-label="Basculer clair / sombre"
      style={{
        width: 38,
        height: 38,
        padding: 0,
        borderRadius: "50%",
        fontSize: 16,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </Button>
  );
}
