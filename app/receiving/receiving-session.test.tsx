/**
 * Regression tests for BUG 2 — "Recebimento" kept displaying the previous
 * user's information after logging out and logging in as someone else without
 * reloading the browser.
 *
 * Root cause under test: the React Query cache lives for the whole lifetime of
 * the SPA and was neither cleared nor keyed by session, so `useMe` (and every
 * other user-scoped query) kept serving the previous session's data within
 * `staleTime` — and did not even refetch. These tests exercise the real login
 * page, the real logout button and the real Recebimento page against a fake
 * API that resolves requests according to the token of the current session.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { ReactNode } from 'react';

const { pushMock, apiState } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  apiState: {
    /** identity (JWT `sub`) of every GET /users/me, in order */
    meRequests: [] as string[],
    /** in-flight /users/me responses keyed by identity */
    deferred: new Map<string, { promise: Promise<unknown>; resolve: (v: unknown) => void }>(),
    users: {
      'u-robson': { name: 'Zora Robson', username: 'robson' },
      'u-patrick': { name: 'Zora Patrick', username: 'patrick' },
      'u-lucas': { name: 'Lucas Silva', username: 'lucas' },
    } as Record<string, { name: string; username: string }>,
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/receiving',
}));

vi.mock('@/lib/api', () => {
  const currentSub = (): string | null => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  };

  const api = {
    get: async (url: string) => {
      if (url === '/users/me') {
        const sub = currentSub() ?? 'anonymous';
        apiState.meRequests.push(sub);
        const pending = apiState.deferred.get(sub);
        if (pending) return pending.promise;
        const user = apiState.users[sub];
        return { data: user ? { _id: sub, ...user } : {} };
      }
      return { data: [] };
    },
    post: async (url: string, body: { username?: string; password?: string }) => {
      if (url === '/auth/login') {
        const entry = Object.entries(apiState.users).find(([, u]) => u.username === body.username);
        if (!entry) {
          const error = new Error('unauthorized') as Error & {
            response?: { status: number };
          };
          error.response = { status: 401 };
          throw error;
        }
        const payload = btoa(
          JSON.stringify({ sub: entry[0], username: entry[1].username, role: 'admin' }),
        );
        return { data: { access_token: `eyJhbGciOiJIUzI1NiJ9.${payload}.sig` } };
      }
      return { data: {} };
    },
    put: async () => ({ data: {} }),
    delete: async () => ({ data: {} }),
  };
  return { default: api };
});

import LoginPage from '../login/page';
import ReceivingPage from './page';
import { getStoredToken } from '@/lib/session';

/** Mirrors app/Providers.tsx: one QueryClient per app session, 60s staleTime. */
function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 60 * 1000, retry: false } },
  });
}

function wrap(client: QueryClient, node: ReactNode) {
  return (
    <QueryClientProvider client={client}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
        <SnackbarProvider>{node}</SnackbarProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}

async function loginAs(client: QueryClient, username: string) {
  pushMock.mockClear();
  const view = render(wrap(client, <LoginPage />));
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: username } });
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha1234' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await waitFor(() => expect(pushMock).toHaveBeenCalled());
  expect(getStoredToken()).toBeTruthy();
  view.unmount();
}

async function showReceiving(client: QueryClient) {
  const view = render(wrap(client, <ReceivingPage />));
  return view;
}

async function logout() {
  fireEvent.click(screen.getByText('Sair'));
  await waitFor(() => expect(getStoredToken()).toBeNull());
}

beforeEach(() => {
  pushMock.mockClear();
  apiState.meRequests.length = 0;
  apiState.deferred.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

describe('Recebimento session isolation (BUG 2)', () => {
  it('shows each authenticated user their own data without a browser refresh', async () => {
    const client = makeClient();

    // --- Zora Robson
    await loginAs(client, 'robson');
    let view = await showReceiving(client);
    expect(await screen.findByDisplayValue('Zora Robson')).toBeTruthy();

    // --- logout (real button) must drop every cached response
    await logout();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
    view.unmount();

    // --- Zora Patrick, same page, no reload
    await loginAs(client, 'patrick');
    view = await showReceiving(client);
    expect(await screen.findByDisplayValue('Zora Patrick')).toBeTruthy();
    expect(screen.queryByDisplayValue('Zora Robson')).toBeNull();
    // the request used the current session's credentials
    expect(apiState.meRequests.at(-1)).toBe('u-patrick');

    // --- Lucas, again without any refresh (logout while the app is still mounted)
    await logout();
    view.unmount();
    await loginAs(client, 'lucas');
    view = await showReceiving(client);
    expect(await screen.findByDisplayValue('Lucas Silva')).toBeTruthy();
    expect(screen.queryByDisplayValue('Zora Patrick')).toBeNull();
    expect(apiState.meRequests.at(-1)).toBe('u-lucas');
    view.unmount();

    // --- navigating away and back keeps showing the CURRENT user
    view = await showReceiving(client);
    expect(await screen.findByDisplayValue('Lucas Silva')).toBeTruthy();
    view.unmount();
  });

  it('a delayed response from the previous session cannot overwrite the new user data', async () => {
    const client = makeClient();

    await loginAs(client, 'robson');

    // Robson's GET /users/me hangs (slow network)
    let resolveRobson!: (v: unknown) => void;
    const robsonPromise = new Promise((resolve) => {
      resolveRobson = resolve;
    });
    apiState.deferred.set('u-robson', { promise: robsonPromise, resolve: resolveRobson });

    let view = await showReceiving(client);
    // response still pending — no name yet
    expect(screen.queryByDisplayValue('Zora Robson')).toBeNull();

    // switch sessions while the old request is still in flight
    await logout();
    view.unmount();
    await loginAs(client, 'patrick');
    view = await showReceiving(client);
    expect(await screen.findByDisplayValue('Zora Patrick')).toBeTruthy();

    // now the previous session's delayed response finally arrives
    apiState.deferred.get('u-robson')!.resolve({
      data: { _id: 'u-robson', ...apiState.users['u-robson'] },
    });
    await new Promise((r) => setTimeout(r, 100));

    expect(screen.queryByDisplayValue('Zora Robson')).toBeNull();
    expect(screen.getByDisplayValue('Zora Patrick')).toBeTruthy();
    view.unmount();
  });
});
