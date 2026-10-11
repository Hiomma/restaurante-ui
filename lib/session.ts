import type { QueryClient } from '@tanstack/react-query';

export const TOKEN_KEY = 'token';
export const LEGACY_TOKEN_KEY = 'accessToken';

/** Reads the JWT of the current session (null when logged out / on the server). */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
}

export function storeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

/**
 * Drops every cached API response when the authenticated session changes
 * (login, registration auto-login, logout).
 *
 * The React Query cache lives for the whole lifetime of the SPA and is not
 * keyed by user, so without this the next user would see the previous user's
 * data (and requests would not even be refetched while the entries are fresh).
 * Clearing also destroys any in-flight queries from the previous session, so
 * their late responses can never overwrite the new session's state.
 */
export function resetSessionCache(queryClient: QueryClient): void {
  queryClient.clear();
}
