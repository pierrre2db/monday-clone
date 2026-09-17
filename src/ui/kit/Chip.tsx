export interface StatusChipProps {
  label: string;
  color?: string;
}

export function StatusChip({ label, color }: StatusChipProps) {
  const hasColor = Boolean(color);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        fontWeight: 600,
        color: hasColor ? "#fff" : "var(--text)",
        background: hasColor ? color : "var(--c-gray)",
        padding: "5px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default StatusChip;
