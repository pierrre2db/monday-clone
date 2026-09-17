export const PALETTE = [
  "#4b8bff",
  "#fdab3d",
  "#e74c6b",
  "#00c875",
  "#a25ddc",
  "#00b8a3",
];

export function colorForId(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
