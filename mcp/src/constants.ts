/** Maximum characters returned in a single tool response before truncation. */
export const CHARACTER_LIMIT = 25000;

/** Default base URL for the Monday-clone app's REST API (Docker maps container:3000 -> host:4000). */
export const DEFAULT_API_URL = "http://localhost:4000";

/** Name of the session cookie set by POST /api/auth. */
export const SESSION_COOKIE_NAME = "monday_session";
