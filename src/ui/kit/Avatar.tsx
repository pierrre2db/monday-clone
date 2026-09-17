import { colorForId } from "./colors";

export interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
}

function initialsOf(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

export function Avatar({ name, color, size = 28 }: AvatarProps) {
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: size * 0.39,
        fontWeight: 700,
        background: color ?? colorForId(name),
        border: "2px solid var(--surface)",
        flex: "none",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}

export interface AvatarStackMember {
  id: string;
  name: string;
  avatarColor?: string;
}

export interface AvatarStackProps {
  members: AvatarStackMember[];
  size?: number;
}

export function AvatarStack({ members, size = 28 }: AvatarStackProps) {
  return (
    <span style={{ display: "inline-flex" }}>
      {members.map((m, i) => (
        <span key={m.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
          <Avatar name={m.name} color={m.avatarColor ?? colorForId(m.id)} size={size} />
        </span>
      ))}
    </span>
  );
}

export default Avatar;
