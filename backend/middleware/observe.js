import log from "../utils/log.ts";
import { inc, observe } from "../utils/metrics.ts";

// Access log (JSON, path without query string, no bodies) + HTTP metrics labelled by ROUTE PATTERN (bounded labels).
const QUIET = new Set(["/health/live", "/health/ready", "/metrics"]);

export default function observeRequests(req, res, next) {
  const started = performance.now();
  res.on("finish", () => {
    const ms = performance.now() - started;
    const route = req.route ? `${req.baseUrl}${req.route.path === "/" ? "" : req.route.path}` || "/" : "unmatched";
    inc("http_requests_total", { method: req.method, route, status: `${Math.floor(res.statusCode / 100)}xx` });
    observe("http_request_duration_ms", { method: req.method, route }, ms);
    if (QUIET.has(route) && res.statusCode < 400) return;
    log.info("request", { requestId: req.id, method: req.method, route, path: req.originalUrl.split("?")[0], status: res.statusCode, ms: Math.round(ms), userId: req.user?.id });
  });
  next();
}
