export interface PillProps {
  label: string;
  color?: string;
}

export function Pill({ label, color }: PillProps) {
  const c = color ?? "var(--text-muted)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        padding: "5px 11px",
        borderRadius: 8,
        border: "1.5px solid",
        borderColor: c,
        color: c,
      }}
    >
      {label}
    </span>
  );
}

export default Pill;
