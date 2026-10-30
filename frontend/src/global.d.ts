// Globals the app sets on window.
interface Window {
  /** installSessionGuard() wraps fetch once per page. */
  __sessionGuardInstalled?: boolean;
}
