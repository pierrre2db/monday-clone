import type { TimeEntry } from "./types";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}

export type Me = { id: string; name: string; email: string; role: string };

export const api = {
  setCell: (itemId: string, columnId: string, value: Record<string, unknown>) =>
    fetch("/api/cells", { method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, columnId, value }) }).then(json),
  addItem: (boardId: string, groupId: string) =>
    fetch("/api/items", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId, groupId, name: "New item" }) }).then(json),
  addGroup: (boardId: string) =>
    fetch("/api/groups", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId }) }).then(json),
  addColumn: (boardId: string, type: string) =>
    fetch("/api/columns", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ boardId, type, name: type }) }).then(json),
  updateItem: (id: string, data: object) =>
    fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
  deleteItem: (id: string) => fetch(`/api/items/${id}`, { method: "DELETE" }).then(json),
  renameItem: (id: string, name: string) =>
    fetch(`/api/items/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }) }).then(json),
  deleteColumn: (id: string) => fetch(`/api/columns/${id}`, { method: "DELETE" }).then(json),
  updateColumn: (id: string, data: object) =>
    fetch(`/api/columns/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
  deleteGroup: (id: string) => fetch(`/api/groups/${id}`, { method: "DELETE" }).then(json),
  updateGroup: (id: string, data: object) =>
    fetch(`/api/groups/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
  listMembers: () => fetch("/api/members").then(json),
  createMember: (data: { name: string; email: string; password: string; role?: string; avatarColor?: string }) =>
    fetch("/api/members", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
  deleteMember: (id: string) => fetch(`/api/members/${id}`, { method: "DELETE" }).then(json),
  updateMember: (id: string, data: { name?: string; email?: string; role?: string; active?: boolean; avatarColor?: string; password?: string }) =>
    fetch(`/api/members/${id}`, { method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify(data) }).then(json),
  getMe: () =>
    fetch("/api/auth/me").then(json) as Promise<{ authenticated: boolean; user: Me | null }>,
  logout: () => fetch("/api/auth", { method: "DELETE" }).then(json),
  // Note: the POST response is the raw created row (no memberName join), unlike
  // listItemTime below — callers should refetch listItemTime after adding.
  addTime: (itemId: string, data: { minutes: number; date?: string; note?: string }) =>
    fetch("/api/time", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, ...data }) }).then(json),
  listItemTime: (itemId: string) =>
    fetch(`/api/time?itemId=${encodeURIComponent(itemId)}`).then(json) as Promise<TimeEntry[]>,
  deleteTimeEntry: (id: string) => fetch(`/api/time/${id}`, { method: "DELETE" }).then(json),
};
