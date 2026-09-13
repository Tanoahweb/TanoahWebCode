/**
 * Manages unique checkout session identifiers for temporary stock reservations.
 * Stored in sessionStorage so that refreshing or navigating Back preserves the VIP reservation token.
 */

const SESSION_KEY = 'tanoah_checkout_session_id';

export function getCheckoutSessionId(): string {
  if (typeof window === 'undefined') {
    return 'ssr_session';
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    // Generate a secure unique token
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      sessionId = `sess_${crypto.randomUUID()}`;
    } else {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  return sessionId;
}

export function resetCheckoutSessionId(): string {
  if (typeof window === 'undefined') return 'ssr_session';
  sessionStorage.removeItem(SESSION_KEY);
  return getCheckoutSessionId();
}
