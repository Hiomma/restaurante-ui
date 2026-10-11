/**
 * Regression tests for BUG 1 — destination creation, stock behavior and list
 * updates on the "Movimentações → Destinos" tab.
 *
 * Root cause under test: the "Mover"/"Baixar" sub-tab <Tab> elements had no
 * explicit `value`, so MUI assigned them their indexes (0/1). Clicking a
 * sub-tab stored a number in `destSubTab`, which (a) never matched the
 * `type: 'move' | 'writeoff'` filter (existing AND newly created custom
 * destinations disappeared from the list) and (b) pre-filled the creation
 * dialog with an invalid type.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/movements',
}));

vi.mock('@/lib/api', () => {
  const destinations: Array<Record<string, unknown>> = [
    { _id: 'd-move-1', name: 'Barcozinha', type: 'move', active: true },
    { _id: 'd-move-2', name: 'Freezer', type: 'move', active: true },
    { _id: 'd-wo-1', name: 'Entulho', type: 'writeoff', active: true },
  ];
  const posted: Array<{ url: string; body: Record<string, unknown> }> = [];
  const api = {
    get: async (url: string) => {
      if (url === '/movement-destinations') return { data: destinations.map((d) => ({ ...d })) };
      if (url === '/users/me') {
        return { data: { _id: 'u1', name: 'Usuário Teste', username: 'teste' } };
      }
      return { data: [] };
    },
    post: async (url: string, body: Record<string, unknown>) => {
      if (url === '/movement-destinations') {
        posted.push({ url, body });
        const doc = { _id: `d-new-${destinations.length}`, active: true, ...body };
        destinations.push(doc);
        return { data: doc };
      }
      return { data: {} };
    },
    put: async () => ({ data: {} }),
    delete: async () => ({ data: {} }),
  };
  return { default: api, __posted: posted };
});

import MovementsPage from './page';
import * as apiModule from '@/lib/api';

const posted = (apiModule as unknown as { __posted: Array<{ url: string; body: Record<string, unknown> }> })
  .__posted;

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <MovementsPage />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

async function openSubTab(name: 'Mover' | 'Baixar') {
  fireEvent.click(screen.getByRole('tab', { name }));
}

afterEach(() => {
  cleanup();
});

describe('Movements destinations tab (BUG 1)', () => {
  it('lists destinations by behavior on each sub-tab and shows a newly created destination immediately', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderPage();

    // Main "Destinos" tab
    fireEvent.click(screen.getByRole('tab', { name: 'Destinos' }));

    // Initial "Mover" sub-tab: move-type customs are listed, writeoff ones are not
    expect(await screen.findByText('Barcozinha')).toBeTruthy();
    expect(await screen.findByText('Freezer')).toBeTruthy();
    expect(screen.queryByText('Entulho')).toBeNull();
    // fixed destinations for "Mover"
    expect(screen.getByText('Salão')).toBeTruthy();

    // Switch to "Baixar": writeoff customs only (business rule)
    await openSubTab('Baixar');
    expect(await screen.findByText('Entulho')).toBeTruthy();
    expect(screen.queryByText('Barcozinha')).toBeNull();
    expect(screen.getByText('Perda')).toBeTruthy();

    // Switch back to "Mover": move customs must come back
    await openSubTab('Mover');
    expect(await screen.findByText('Barcozinha')).toBeTruthy();
    expect(screen.queryByText('Entulho')).toBeNull();

    // --- Create "Câmara" with behavior "item remains in stock" (move),
    // starting from the "Baixar" sub-tab (the situation from the bug video).
    await openSubTab('Baixar');
    fireEvent.click(screen.getByRole('button', { name: 'Novo Destino' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('Ex: Freezer 2'), {
      target: { value: 'Câmara' },
    });

    const selectTrigger =
      dialog.querySelector('[role="combobox"]') ?? dialog.querySelector('.MuiSelect-select');
    expect(selectTrigger).toBeTruthy();
    fireEvent.mouseDown(selectTrigger!);
    let moveOption: HTMLElement | null = null;
    try {
      moveOption = await screen.findByRole('option', {
        name: /Mover \(item permanece no estoque\)/,
      });
    } catch {
      fireEvent.click(selectTrigger!);
      moveOption = await screen.findByRole('option', {
        name: /Mover \(item permanece no estoque\)/,
      });
    }
    fireEvent.click(moveOption!);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar' }));

    // success feedback
    expect(await screen.findByText('Destino adicionado com sucesso!')).toBeTruthy();
    // the dialog closes after a successful creation (exit transition included)
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    // the POST carried the correct, business-relevant configuration
    expect(posted.at(-1)?.body).toEqual({ name: 'Câmara', type: 'move' });

    // the new destination is visible right away (its sub-tab is shown)
    expect(await screen.findByText('Câmara')).toBeTruthy();

    // ...and it honors the Mover/Baixar split afterwards
    await openSubTab('Baixar');
    expect(screen.queryByText('Câmara')).toBeNull();
    expect(await screen.findByText('Entulho')).toBeTruthy();
    await openSubTab('Mover');
    expect(await screen.findByText('Câmara')).toBeTruthy();

    // No MUI "invalid Tabs value" warnings (the original defect)
    const tabsWarnings = consoleErrorSpy.mock.calls.filter((args) =>
      String(args[0]).includes('Tabs component is invalid'),
    );
    expect(tabsWarnings).toHaveLength(0);

    consoleErrorSpy.mockRestore();
  });
});
