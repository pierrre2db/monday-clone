import { DEFAULT_API_URL, SESSION_COOKIE_NAME } from "./constants.js";
import type { Board, User } from "./types.js";

export interface MondayConfig {
  apiUrl: string;
  email: string;
  password: string;
}

/** Reads and validates the required environment configuration. Throws (fails fast) if incomplete. */
export function loadConfigFromEnv(): MondayConfig {
  const apiUrl = process.env.MONDAY_API_URL?.trim() || DEFAULT_API_URL;
  const email = process.env.MONDAY_EMAIL?.trim();
  const password = process.env.MONDAY_PASSWORD?.trim();

  const missing: string[] = [];
  if (!email) missing.push("MONDAY_EMAIL");
  if (!password) missing.push("MONDAY_PASSWORD");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Set them (e.g. in the MCP client config's "env" block or a .env file) before starting monday-clone-mcp-server. ` +
        `MONDAY_API_URL defaults to "${DEFAULT_API_URL}" if unset.`
    );
  }

  return { apiUrl, email: email!, password: password! };
}

/** An error raised by the Monday-clone API, carrying enough context for an agent to react usefully. */
export class MondayApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
    public readonly body?: string
  ) {
    super(message);
    this.name = "MondayApiError";
  }
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Thin HTTP client for the Monday-clone app's cookie-authenticated REST API.
 * Holds the session cookie in memory for the lifetime of the process, logging
 * in lazily on first use and transparently re-authenticating once on a 401.
 */
export class MondayClient {
  private cookie: string | null = null;
  private loginPromise: Promise<void> | null = null;

  constructor(private readonly config: MondayConfig) {}

  /** Logs in with the configured credentials and stores the session cookie. */
  async login(): Promise<void> {
    // Coalesce concurrent login attempts into a single in-flight request.
    if (this.loginPromise) {
      return this.loginPromise;
    }
    this.loginPromise = this.doLogin().finally(() => {
      this.loginPromise = null;
    });
    return this.loginPromise;
  }

  private async doLogin(): Promise<void> {
    const url = `${this.config.apiUrl}/api/auth`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.config.email, password: this.config.password }),
      });
    } catch (err) {
      throw new Error(
        `Could not reach the Monday-clone app at ${this.config.apiUrl}. ` +
          `Is it running (check "docker ps" / the app's Docker container) and is MONDAY_API_URL correct? ` +
          `Underlying error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (!res.ok) {
      const body = await safeReadText(res);
      throw new MondayApiError(
        `Login failed for ${this.config.email} (HTTP ${res.status}). Check MONDAY_EMAIL / MONDAY_PASSWORD. ` +
          `Response: ${truncate(body, 500)}`,
        res.status,
        "/api/auth",
        body
      );
    }

    const cookie = extractSessionCookie(res);
    if (!cookie) {
      throw new Error(
        "Login succeeded but no session cookie was returned by /api/auth. " +
          "The app's auth response shape may have changed."
      );
    }
    this.cookie = cookie;
  }

  /**
   * Performs an authenticated API request, logging in first if there is no
   * session yet, and retrying exactly once after a fresh login on a 401.
   */
  async apiRequest<T>(path: string, method: HttpMethod = "GET", body?: unknown): Promise<T> {
    if (!this.cookie) {
      await this.login();
    }
    return this.doRequest<T>(path, method, body, /* allowRetry */ true);
  }

  private async doRequest<T>(
    path: string,
    method: HttpMethod,
    body: unknown,
    allowRetry: boolean
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;
    const headers: Record<string, string> = {};
    if (this.cookie) headers["Cookie"] = `${SESSION_COOKIE_NAME}=${this.cookie}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new Error(
        `Could not reach the Monday-clone app at ${this.config.apiUrl}${path}. ` +
          `Is it running on the expected port? Underlying error: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (res.status === 401 && allowRetry) {
      // Session likely expired or was never established; re-login once and retry.
      this.cookie = null;
      await this.login();
      return this.doRequest<T>(path, method, body, /* allowRetry */ false);
    }

    if (!res.ok) {
      const text = await safeReadText(res);
      throw new MondayApiError(buildErrorMessage(method, path, res.status, text), res.status, path, text);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await safeReadText(res);
    if (!text) {
      return undefined as T;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      // Non-JSON success body (unlikely) — hand back the raw text.
      return text as unknown as T;
    }
  }
}

function buildErrorMessage(method: HttpMethod, path: string, status: number, body: string): string {
  const snippet = truncate(body, 500);
  if (status === 404) {
    return `Not found: ${method} ${path} (HTTP 404). The board/item/column/user id likely does not exist or was deleted. Response: ${snippet}`;
  }
  if (status === 403) {
    return `Permission denied: ${method} ${path} (HTTP 403). The logged-in user's role does not allow this action (this endpoint likely requires admin, or member+ for a viewer account). Response: ${snippet}`;
  }
  if (status === 401) {
    return `Unauthorized: ${method} ${path} (HTTP 401) even after re-authenticating. Check MONDAY_EMAIL / MONDAY_PASSWORD. Response: ${snippet}`;
  }
  if (status === 400) {
    return `Bad request: ${method} ${path} (HTTP 400). The request body is likely malformed for this endpoint/column type. Response: ${snippet}`;
  }
  return `Request failed: ${method} ${path} (HTTP ${status}). Response: ${snippet}`;
}

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Extracts the monday_session cookie value from a fetch Response's Set-Cookie header(s). */
function extractSessionCookie(res: Response): string | null {
  // undici (Node 18+) exposes getSetCookie() for multi-value Set-Cookie; fall back to get() otherwise.
  const headersWithGetSetCookie = res.headers as Headers & { getSetCookie?: () => string[] };
  const rawCookies: string[] =
    typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : [res.headers.get("set-cookie") ?? ""].filter(Boolean);

  for (const raw of rawCookies) {
    const match = raw.match(new RegExp(`^${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resolver helpers — turn human-friendly names into the ids the API expects.
// ---------------------------------------------------------------------------

/**
 * Resolves a status label's display name (case-insensitive) to its labelId,
 * using the `settings.labels` of the given column on the given board.
 * Throws an actionable error listing the valid labels if no match is found.
 */
export function resolveStatusLabelId(board: Board, columnId: string, labelName: string): string {
  const column = board.columns.find((c) => c.id === columnId);
  if (!column) {
    throw new Error(
      `Column "${columnId}" was not found on board "${board.name}" (${board.id}). ` +
        `Available columns: ${board.columns.map((c) => `${c.name} (${c.id})`).join(", ") || "none"}.`
    );
  }
  if (column.type !== "status") {
    throw new Error(`Column "${column.name}" (${columnId}) is of type "${column.type}", not "status".`);
  }
  const labels = column.settings?.labels ?? [];
  const match = labels.find((l) => l.label.toLowerCase() === labelName.toLowerCase());
  if (!match) {
    throw new Error(
      `Status label "${labelName}" was not found on column "${column.name}" (${columnId}). ` +
        `Available labels: ${labels.map((l) => l.label).join(", ") || "none"}.`
    );
  }
  return match.id;
}

/**
 * Resolves a list of human-friendly names/emails (case-insensitive, exact
 * match against name or email) to member ids. Throws an actionable error
 * naming any entries that could not be resolved.
 */
export function resolveMemberIds(users: User[], names: string[]): string[] {
  const ids: string[] = [];
  const unresolved: string[] = [];

  for (const name of names) {
    const needle = name.toLowerCase();
    const match = users.find(
      (u) => u.name.toLowerCase() === needle || u.email.toLowerCase() === needle
    );
    if (match) {
      ids.push(match.id);
    } else {
      unresolved.push(name);
    }
  }

  if (unresolved.length > 0) {
    throw new Error(
      `Could not resolve ${unresolved.length} member(s): ${unresolved.join(", ")}. ` +
        `Available members: ${users.map((u) => `${u.name} <${u.email}>`).join(", ") || "none"}.`
    );
  }

  return ids;
}
