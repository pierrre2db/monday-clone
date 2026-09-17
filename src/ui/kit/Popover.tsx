"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface PopoverProps {
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  children: (o: { close: () => void }) => ReactNode;
  align?: "left" | "right";
}

export default function Popover({ trigger, children, align = "left" }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  const close = () => setOpen(false);
  const toggle = () => setOpen((o) => !o);

  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} style={{ position: "relative", display: "inline-block" }}>
      {trigger({ open, toggle })}
      {open && (
        <span
          role="dialog"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            ...(align === "right" ? { right: 0 } : { left: 0 }),
            zIndex: 50,
            minWidth: 200,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
            padding: 10,
            display: "block",
          }}
        >
          {children({ close })}
        </span>
      )}
    </span>
  );
}
