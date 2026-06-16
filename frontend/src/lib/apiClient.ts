import type { ApiErrorBody } from "../types/api";

const API_BASE = "/api";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Low-level fetch wrapper used by every feature's API hook. Throws an
 * `ApiError` on non-2xx (with the parsed envelope from the backend) and on
 * network / abort failures (with a synthesised envelope).
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      ...init,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(0, "Request was cancelled.", "ABORTED");
    }
    throw new ApiError(
      0,
      "Could not reach the server. Check that the backend is running on port 8000.",
      "NETWORK_ERROR",
      err instanceof Error ? err.message : undefined,
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON success response is unexpected; surface raw text for !ok,
      // otherwise return text as-is and let the caller cast (no current
      // endpoint relies on this for success).
      body = res.ok ? (text as unknown) : null;
    }
  }

  if (!res.ok) {
    const errBody = body as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      errBody?.error?.message ??
        text ??
        `Request failed with status ${res.status}`,
      errBody?.error?.code ?? `HTTP_${res.status}`,
      errBody?.error?.details,
    );
  }
  return body as T;
}

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export function buildQueryString(
  params: Record<string, unknown>,
): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    qs.set(k, String(v));
  }
  return qs.toString();
}

/**
 * Render any thrown value as a single, user-safe sentence. Always returns
 * a non-empty string so it is safe to drop into toasts or banners without
 * guarding against `undefined`.
 */
export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "NETWORK_ERROR":
        return err.message;
      case "PAYLOAD_TOO_LARGE":
        return "That transcript is too large. Try shortening it.";
      case "INVALID_JSON":
        return "The request body was malformed. Please reload and try again.";
      case "BAD_REQUEST":
        return formatValidationError(err) ?? err.message;
      case "NOT_FOUND":
        return err.message || "That resource could not be found.";
      case "CONFIGURATION_ERROR":
        return err.message;
    }
    if (err.status >= 500) {
      return `Server error: ${err.message}`;
    }
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong. Please try again.";
}

/**
 * Pull the first useful field/message out of a Zod `flatten()` payload so
 * users see "title is required" instead of a generic "Validation failed".
 */
function formatValidationError(err: ApiError): string | null {
  const details = err.details as
    | {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      }
    | null
    | undefined;
  if (!details) return null;
  if (details.formErrors && details.formErrors.length > 0) {
    return details.formErrors[0];
  }
  if (details.fieldErrors) {
    for (const [field, msgs] of Object.entries(details.fieldErrors)) {
      const first = msgs?.[0];
      if (first) return `${field}: ${first}`;
    }
  }
  return null;
}
