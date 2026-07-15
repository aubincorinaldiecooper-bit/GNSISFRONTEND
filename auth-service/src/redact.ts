/**
 * Centralized redaction for anything log-adjacent. Every place in this
 * service that logs a request, a header, or an error goes through this —
 * so "don't log secrets" is enforced in one place, not by convention at
 * every call site.
 */

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-github-token",
]);

const SENSITIVE_KEY_PATTERN =
  /token|secret|password|private[_-]?key|authorization|cookie|client[_-]?secret/i;

export function redactHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const entries =
    headers instanceof Headers ? Array.from(headers.entries()) : Object.entries(headers);
  const out: Record<string, string> = {};
  for (const [key, value] of entries) {
    out[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? "[redacted]" : value;
  }
  return out;
}

/** Deep-redacts any object key that looks sensitive, for safe logging. */
export function redactObject(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value as object)) return "[circular]";
  seen.add(value as object);

  if (Array.isArray(value)) {
    return value.map((item) => redactObject(item, seen));
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redactObject(val, seen);
  }
  return out;
}

/** Safe-to-log summary of an error: message and name only, never a raw token embedded in it. */
export function redactError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name, message: redactTokenLikeStrings(err.message) };
  }
  return { name: "UnknownError", message: redactTokenLikeStrings(String(err)) };
}

function redactTokenLikeStrings(message: string): string {
  // Bearer tokens and GitHub PAT-shaped strings occasionally end up in error
  // text from an upstream library; strip them defensively even here.
  return message
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/gh[pousr]_[A-Za-z0-9]+/g, "[redacted]");
}
