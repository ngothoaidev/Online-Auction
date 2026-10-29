// Structured JSON logs (one line per event) with recursive redaction of secrets and personal data.
// Usage: log.info("msg", { fields }), log.error("msg", { error }). Never pass raw request bodies.
const SENSITIVE = /pass(word)?|secret|token|authorization|cookie|otp|email|phone|address|maximum|max_amount|proof/i;
const MAX_DEPTH = 5;

export type LogFields = Record<string, unknown>;
type Level = "info" | "warn" | "error";

export function redact(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    const e = value as Error & { code?: unknown; status?: unknown };
    return { name: e.name, message: e.message, code: e.code, ...(e.status ? { status: e.status } : {}), stack: e.stack?.split("\n").slice(0, 6).join("\n") };
  }
  if (value === null || typeof value !== "object" || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1)]));
}

function write(level: Level, msg: string, fields: LogFields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...(redact(fields) as LogFields) });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  info: (msg: string, fields?: LogFields) => write("info", msg, fields),
  warn: (msg: string, fields?: LogFields) => write("warn", msg, fields),
  error: (msg: string, fields?: LogFields) => write("error", msg, fields),
};
export default log;
