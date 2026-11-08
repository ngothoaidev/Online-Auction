import * as Sentry from "@sentry/node";

// Error reporting. Off unless SENTRY_DSN is set; the JSON logs stay the primary record either way.
const dsn = process.env.SENTRY_DSN;
if (dsn) Sentry.init({ dsn, environment: process.env.NODE_ENV || "development", release: process.env.RENDER_GIT_COMMIT, sendDefaultPii: false });

/** Send an unexpected error (5xx, crashed job) with the ids needed to find it in the logs. */
export function report(error: unknown, tags: Record<string, string | undefined> = {}): void {
  if (dsn) Sentry.captureException(error, { tags });
}
