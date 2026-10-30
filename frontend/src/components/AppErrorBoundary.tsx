import * as Sentry from '@sentry/react';
import type { ReactNode } from 'react';

// Browser error reporting, off unless VITE_SENTRY_DSN is set at build time.
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) Sentry.init({ dsn, environment: import.meta.env.MODE, sendDefaultPii: false });

/** A render error shows this instead of a blank page (and is reported when Sentry is on). */
export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={(
        <div role="alert" className="mx-auto max-w-lg px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold text-(--ink)">Something went wrong</h1>
          <p className="mt-2 text-(--muted)">This page hit an unexpected error. Reloading usually fixes it.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-6 inline-flex min-h-11 items-center rounded-(--radius-control) bg-(--ink) px-6 font-semibold text-(--on-ink) hover:opacity-90">Reload</button>
        </div>
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
