// Structured JSON logs (one line per event) with recursive redaction of secrets and personal data.
// Usage: log.info("msg", { fields }), log.error("msg", { error }). Never pass raw request bodies.
const SENSITIVE = /pass(word)?|secret|token|authorization|cookie|otp|email|phone|address|maximum|max_amount|proof/i;
const MAX_DEPTH = 5;

export function redact(value, depth = 0) {
  if (value instanceof Error) return { name: value.name, message: value.message, code: value.code, ...(value.status ? { status: value.status } : {}), stack: value.stack?.split("\n").slice(0, 6).join("\n") };
  if (value === null || typeof value !== "object" || depth > MAX_DEPTH) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => redact(v, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SENSITIVE.test(k) ? "[redacted]" : redact(v, depth + 1)]));
}

function write(level, msg, fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...redact(fields) });
  (level === "error" || level === "warn" ? process.stderr : process.stdout).write(line + "\n");
}

export const log = {
  info: (msg, fields) => write("info", msg, fields),
  warn: (msg, fields) => write("warn", msg, fields),
  error: (msg, fields) => write("error", msg, fields),
};
export default log;
