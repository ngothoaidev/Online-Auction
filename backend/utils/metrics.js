// Minimal in-process metrics in Prometheus text format (no dependency). Counters and histograms live per process;
// DB-derived gauges (outbox, settlement lag, ...) are computed at scrape time in routes/health.js.
const BUCKETS = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const counters = new Map();   // name -> Map(labelKey -> value)
const histograms = new Map(); // name -> Map(labelKey -> { buckets: number[], sum, count })
const help = new Map();

// Prometheus label value escaping: backslash, double quote and newline.
const escapeLabel = (v) => String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
const key = (labels) => Object.entries(labels).sort().map(([k, v]) => `${k}="${escapeLabel(v)}"`).join(",");

export function describe(name, text) { help.set(name, text); }

export function inc(name, labels = {}, by = 1) {
  if (!counters.has(name)) counters.set(name, new Map());
  const m = counters.get(name);
  const k = key(labels);
  m.set(k, (m.get(k) ?? 0) + by);
}

export function observe(name, labels, ms) {
  if (!histograms.has(name)) histograms.set(name, new Map());
  const m = histograms.get(name);
  const k = key(labels);
  if (!m.has(k)) m.set(k, { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 });
  const h = m.get(k);
  BUCKETS.forEach((b, i) => { if (ms <= b) h.buckets[i] += 1; });
  h.sum += ms;
  h.count += 1;
}

/** Render everything, plus `gauges` = [{ name, help, value, labels? }] computed by the caller. */
export function render(gauges = []) {
  const out = [];
  const head = (name, type) => { if (help.has(name)) out.push(`# HELP ${name} ${help.get(name)}`); out.push(`# TYPE ${name} ${type}`); };
  for (const [name, m] of counters) {
    head(name, "counter");
    for (const [k, v] of m) out.push(`${name}${k ? `{${k}}` : ""} ${v}`);
  }
  for (const [name, m] of histograms) {
    head(name, "histogram");
    for (const [k, h] of m) {
      const sep = k ? "," : "";
      BUCKETS.forEach((b, i) => out.push(`${name}_bucket{${k}${sep}le="${b}"} ${h.buckets[i]}`));
      out.push(`${name}_bucket{${k}${sep}le="+Inf"} ${h.count}`);
      out.push(`${name}_sum${k ? `{${k}}` : ""} ${Math.round(h.sum)}`);
      out.push(`${name}_count${k ? `{${k}}` : ""} ${h.count}`);
    }
  }
  const typed = new Set(); // one HELP/TYPE header per metric name, even with several label sets
  for (const g of gauges) {
    if (!typed.has(g.name)) {
      if (g.help) out.push(`# HELP ${g.name} ${g.help}`);
      out.push(`# TYPE ${g.name} gauge`);
      typed.add(g.name);
    }
    out.push(`${g.name}${g.labels ? `{${key(g.labels)}}` : ""} ${Number.isFinite(g.value) ? g.value : "NaN"}`);
  }
  return out.join("\n") + "\n";
}

describe("http_requests_total", "HTTP responses by method, route pattern and status class");
describe("http_request_duration_ms", "HTTP request latency by method and route pattern");
describe("auction_lock_wait_ms", "Time spent waiting for an auction row lock (SELECT ... FOR UPDATE)");
