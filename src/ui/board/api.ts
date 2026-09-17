async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
  return res.json();
}
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
  addMember: (name: string) =>
    fetch("/api/members", { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }) }).then(json),
  deleteMember: (id: string) => fetch(`/api/members/${id}`, { method: "DELETE" }).then(json),
};
