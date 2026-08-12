import { useEffect, useRef, useCallback } from "react";

/**
 * Auto-logout after `timeoutMs` of inactivity (no mouse/keyboard/touch/scroll).
 * `onWarning` fires `warnBeforeMs` before logout. `onLogout` fires at timeout.
 */
export function useIdleLogout({ timeoutMs, warnBeforeMs = 60000, onWarning, onLogout, enabled = true }) {
  const logoutTimer = useRef(null);
  const warnTimer = useRef(null);
  const warned = useRef(false);

  const reset = useCallback(() => {
    if (!enabled) return;
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warnTimer.current) clearTimeout(warnTimer.current);
    warned.current = false;
    warnTimer.current = setTimeout(() => {
      if (warned.current) return;
      warned.current = true;
      onWarning && onWarning();
    }, Math.max(timeoutMs - warnBeforeMs, 0));
    logoutTimer.current = setTimeout(() => {
      onLogout && onLogout();
    }, timeoutMs);
  }, [timeoutMs, warnBeforeMs, onWarning, onLogout, enabled]);

  useEffect(() => {
    if (!enabled) return undefined;
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
    const handler = () => reset();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      if (warnTimer.current) clearTimeout(warnTimer.current);
    };
  }, [reset, enabled]);
}
