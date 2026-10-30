// The API rejects stale/revoked bearer tokens with 401. This wraps fetch once: when the server says the session is
// dead, drop the stored credentials and tell AuthContext.
const DEAD_SESSION = new Set(['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REVOKED', 'ACCOUNT_BANNED']);

export function installSessionGuard() {
  if (window.__sessionGuardInstalled) return;
  window.__sessionGuardInstalled = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const response = await original(...args);
    if (response.status === 401 || response.status === 403) {
      const body = await response.clone().json().catch(() => null);
      if (body && DEAD_SESSION.has(body.code) && localStorage.getItem('authToken')) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        window.dispatchEvent(new Event('auth:session-ended'));
      }
    }
    return response;
  };
}
