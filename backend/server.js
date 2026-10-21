import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import { client } from "./db/index.js";
import log from "./utils/log.js";

const port = Number(process.env.PORT || 3000);
const server = app.listen(port, () => log.info("api listening", { port, env: process.env.NODE_ENV || "development" }));

// Graceful stop: refuse new connections, close idle ones, give in-flight requests (and open SSE streams) 5s.
function shutdown(signal) {
  log.info("api shutting down", { signal });
  server.close(async () => { await client.end({ timeout: 5 }); process.exit(0); });
  server.closeIdleConnections?.();
  setTimeout(() => { server.closeAllConnections?.(); process.exit(0); }, 5000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
