import crypto from "node:crypto";

// Keep a caller's well-formed X-Request-Id (proxy/SPA tracing), otherwise mint one. Echoed on every response.
export default function requestId(req, res, next) {
  const incoming = req.get("X-Request-Id");
  req.id = incoming && /^[A-Za-z0-9._:-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
}
