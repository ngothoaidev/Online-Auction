import bcrypt from "bcrypt";
import { TEST_DATABASE_URL, assertTestDatabase, connect, resetDatabase } from "./db.js";

/** Boot the real app against a freshly migrated test database. Env must be set before any app import. */
export async function startApp(env = {}) {
  assertTestDatabase();
  Object.assign(process.env, {
    DATABASE_URL: TEST_DATABASE_URL,
    JWT_SECRET: "test-jwt-secret",
    SESSION_SECRET: "test-session-secret",
    EMAIL_TRANSPORT: "local",
    AUTH_RATE_LIMIT_MAX: "1000",
    UPLOAD_RATE_LIMIT_MAX: "100000",
    NODE_ENV: "test",
    ...env,
  });
  const sql = connect();
  await resetDatabase(sql);
  const dbModule = await import("../../db/index.ts");
  const { default: app } = await import("../../app.js");
  const email = await import("../../utils/email.ts");
  const authService = (await import("../../services/auth.js")).default;
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;

  const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json };
  };

  const createUser = async (username, { role = "buyer", password = "Passw0rd!", isVerified = true, status = "active" } = {}) => {
    const hash = await bcrypt.hash(password, 4);
    const [u] = await sql`INSERT INTO users (username, email, encrypted_password, role, is_verified, status)
      VALUES (${username}, ${username + "@example.test"}, ${hash}, ${role}, ${isVerified}, ${status}) RETURNING user_id AS id`;
    return { id: u.id, username, email: `${username}@example.test`, password };
  };
  const login = async (user) => (await call("POST", "/auth/login", { body: { identifier: user.username, password: user.password } })).body.token;

  // Mint a token without going through /auth/login (which is rate limited).
  const tokenFor = (user) => authService.generateUserToken({ id: user.id, username: user.username, email: user.email, authVersion: 0 });

  return {
    base, tokenFor, sql, call, createUser, login, mailSink: email.mailSink,
    lastOtp: (to) => [...email.mailSink].reverse().find((m) => m.to === to)?.html.match(/\b(\d{6})\b/)?.[1],
    async stop() { await new Promise((r) => server.close(r)); await dbModule.client.end(); await sql.end(); },
  };
}
