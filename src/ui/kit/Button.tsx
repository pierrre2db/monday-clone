"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "default" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const baseStyle: React.CSSProperties = {
  fontFamily: "inherit",
  fontWeight: 600,
  fontSize: 13,
  padding: "8px 14px",
  borderRadius: "var(--radius-sm)",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  transition: "background .15s, border-color .15s, opacity .15s",
  border: "1px solid transparent",
};

function variantStyle(variant: ButtonVariant, hover: boolean): React.CSSProperties {
  switch (variant) {
    case "ghost":
      return {
        background: hover ? "var(--surface-2)" : "transparent",
        color: "var(--text)",
        borderColor: "transparent",
      };
    case "danger":
      return {
        background: hover ? "var(--surface-2)" : "transparent",
        color: "var(--c-red)",
        borderColor: hover ? "var(--c-red)" : "transparent",
      };
    case "default":
    default:
      return {
        background: hover ? "var(--surface-2)" : "var(--surface)",
        color: "var(--text)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow)",
      };
  }
}

export default function Button({
  variant = "default",
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hover, setHover] = useState(false);

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={(e) => {
        setHover(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHover(false);
        onMouseLeave?.(e);
      }}
      style={{
        ...baseStyle,
        ...variantStyle(variant, hover && !disabled),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    />
  );
}
