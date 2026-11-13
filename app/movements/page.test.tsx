/**
 * Tests for the "Movimentações" page (post-Destinos extraction).
 *
 * Covered behavior:
 * - The Destinos tab no longer exists here (it lives in Cadastros now) and a
 *   new "Devolver" tab lists written-off labels so they can be restored.
 * - The QR reader button on "Movimentar Etiqueta" and "Contagem" feeds the
 *   same lookup flow used by the manual code input.
 * - Counting deletions ("baixar") ALWAYS require a marked reason ("motivo"):
 *   no delete happens without confirming the "Motivo da baixa" dialog, and the
 *   created movement carries the reason string plus the destination selected.
 *   The options come ONLY from the destinations registered as "Baixar" in
 *   Cadastros → Destinos (the hardcoded list is gone).
 * - Restoring a written-off label from "Devolver" re-creates it and records an
 *   "entry" movement.
 * - A QR answered with HTTP 410 (label already used, UsedLabelInfo) shows a
 *   distinct "já usada" warning and the label is never selected.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/movements',
}));

// The real dialog only starts the camera when open, but tests should not
// depend on html5-qrcode at all: a stub exposes the same scan contract.
vi.mock('../components/QrScannerDialog/QrScannerDialog', async () => {
  const { createElement } = await import('react');
  type QrProps = { open: boolean; onScan: (value: string) => void; onClose: () => void };
  return {
    default: ({ open, onScan, onClose }: QrProps) =>
      open
        ? createElement(
            'div',
            { role: 'dialog', 'aria-label': 'Leitor de QR (mock)' },
            createElement('button', { onClick: () => onScan('AB1234') }, 'scan-mock'),
            createElement('button', { onClick: onClose }, 'close-mock'),
          )
        : null,
  };
});

vi.mock('@/lib/api', () => {
  const items: Array<Record<string, unknown>> = [
    {
      _id: 'i1',
      product: { productId: 'p1', productName: 'Queijo' },
      type: 'raw',
      weightGrams: 1000,
      manipulationDate: '2026-10-01',
      expiryDate: '2026-10-20',
      qrCode: 'AB1234',
      status: 'in_stock',
    },
    {
      _id: 'i2',
      product: { productId: 'p1', productName: 'Queijo' },
      type: 'portioned',
      weightGrams: 250,
      manipulationDate: '2026-10-01',
      expiryDate: '2026-10-21',
      qrCode: 'CD5678',
      status: 'in_stock',
    },
  ];
  const gets: string[] = [];
  const movements: Array<{ url: string; body: Record<string, unknown> }> = [];
  const deletes: string[] = [];
  const restores: string[] = [];
  /**
   * Destinos cadastrados como "Baixar" (Cadastros → Destinos): o motivo da
   * baixa só pode ser um deles — 'Outro' (antigo valor hardcoded) NÃO é
   * oferecido.
   */
  const destinations = [
    { _id: 'd1', name: 'Vencido', type: 'writeoff', active: true, createdAt: '2026-10-01' },
    { _id: 'd2', name: 'Fornecedor', type: 'writeoff', active: true, createdAt: '2026-10-01' },
  ];
  /** Etiquetas baixadas (tombstones) — base da aba "Devolver". */
  const removals = [
    {
      _id: 'r1',
      qrCode: 'XY9900',
      productId: 'p1',
      productName: 'Queijo',
      type: 'raw',
      weightGrams: 900,
      lote: 'L-100',
      destination: 'Perda',
      userName: 'Robson',
      removedAt: '2026-10-10',
    },
  ];
  const api = {
    get: async (url: string) => {
      gets.push(url);
      if (url.startsWith('/stock-items/qr/')) {
        const code = url.split('/').pop()!.toUpperCase();
        // QR de etiqueta JÁ baixada: mesmo corpo do HTTP 410 real (UsedLabelInfo).
        if (code === 'ZZ4100') {
          throw {
            response: {
              status: 410,
              data: {
                used: true,
                productName: 'Queijo',
                destination: 'Salão',
                userName: 'Robson',
                removedAt: '2026-10-15',
              },
            },
          };
        }
        const item = items.find((i) => i.qrCode === code);
        if (!item) throw new Error('not found');
        return { data: { ...item } };
      }
      if (url === '/stock-items') return { data: items.map((i) => ({ ...i })) };
      if (url === '/stock-items/removals') {
        return { data: removals.map((r) => ({ ...r })) };
      }
      if (url === '/products') return { data: [{ _id: 'p1', name: 'Queijo' }] };
      if (url === '/movement-destinations') return { data: destinations.map((d) => ({ ...d })) };
      if (url === '/users/me') {
        return { data: { _id: 'u1', name: 'Usuário Teste', username: 'teste' } };
      }
      return { data: [] };
    },
    post: async (url: string, body: Record<string, unknown>) => {
      if (url === '/stock-movements') {
        movements.push({ url, body });
        return { data: { _id: `m-${movements.length}`, ...body } };
      }
      if (/^\/stock-items\/removals\/[^/]+\/restore$/.test(url)) {
        restores.push(url);
        return { data: { _id: url.split('/')[3], status: 'in_stock' } };
      }
      return { data: {} };
    },
    put: async () => ({ data: {} }),
    delete: async (url: string) => {
      deletes.push(url);
      return { data: {} };
    },
  };
  return {
    default: api,
    __gets: gets,
    __movements: movements,
    __deletes: deletes,
    __restores: restores,
  };
});

import MovementsPage from './page';
import * as apiModule from '@/lib/api';

const mockApi = apiModule as unknown as {
  __gets: string[];
  __movements: Array<{ url: string; body: Record<string, unknown> }>;
  __deletes: string[];
  __restores: string[];
};

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

/** Opens a MUI (non-native) select and picks an option by accessible name. */
async function pickSelectOption(selectTrigger: HTMLElement, optionName: string) {
  fireEvent.mouseDown(selectTrigger);
  let option: HTMLElement | null = null;
  try {
    option = await screen.findByRole('option', { name: optionName });
  } catch {
    fireEvent.click(selectTrigger);
    option = await screen.findByRole('option', { name: optionName });
  }
  fireEvent.click(option!);
}

/** Enters "Contagem" in full-stock mode and verifies the (empty) count. */
async function setupCountMissing() {
  fireEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Estoque Completo' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Verificar Contagem' }));
  // Both mocked items were not scanned, so both are "missing".
  expect(await screen.findAllByRole('button', { name: 'baixar etiqueta' })).toHaveLength(2);
}

beforeEach(() => {
  mockApi.__gets.length = 0;
  mockApi.__movements.length = 0;
  mockApi.__deletes.length = 0;
  mockApi.__restores.length = 0;
});

afterEach(() => {
  cleanup();
});

describe('Movements page structure', () => {
  it('renders Movimentar/Contagem/Devolver tabs (no Destinos tab)', async () => {
    renderPage();

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      'Movimentar Etiqueta',
      'Contagem',
      'Devolver',
    ]);
    expect(screen.queryByRole('tab', { name: 'Destinos' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Novo Destino' })).toBeNull();
  });
});

describe('QR code reading (camera)', () => {
  it('Movimentar Etiqueta: scanning with the camera runs the same lookup flow', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Ler QR Code' }));
    const scanner = await screen.findByRole('dialog', { name: 'Leitor de QR (mock)' });
    fireEvent.click(within(scanner).getByRole('button', { name: 'scan-mock' }));

    // lookup performed with the scanned code
    await waitFor(() => expect(mockApi.__gets).toContain('/stock-items/qr/AB1234'));
    // and the item was added to the selection
    expect(await screen.findByText('Etiquetas selecionadas (1)')).toBeTruthy();
    expect(screen.getByText('Queijo')).toBeTruthy();
  });

  it('Contagem: scanning with the camera feeds the counting scan field', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Contagem' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Estoque Completo' }));

    fireEvent.click(await screen.findByRole('button', { name: 'Ler QR Code' }));
    const scanner = await screen.findByRole('dialog', { name: 'Leitor de QR (mock)' });
    fireEvent.click(within(scanner).getByRole('button', { name: 'scan-mock' }));

    await waitFor(() => expect(mockApi.__gets).toContain('/stock-items/qr/AB1234'));
    // the scanned code appears as a chip
    expect(await screen.findByText('AB1234')).toBeTruthy();
  });
});

describe('Counting write-offs require a motivo', () => {
  it('does not delete anything while the motivo dialog is not confirmed', async () => {
    renderPage();
    await setupCountMissing();

    // per-row delete opens the dialog instead of deleting
    fireEvent.click(screen.getAllByRole('button', { name: 'baixar etiqueta' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Motivo da baixa' });

    // confirm is blocked without a motivo
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar baixa' });
    expect(confirm).toHaveProperty('disabled', true);

    // cancelling deletes nothing
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Motivo da baixa' })).toBeNull());
    expect(mockApi.__deletes).toHaveLength(0);
    expect(mockApi.__movements).toHaveLength(0);
  });

  it('per-row write-off creates a movement with the motivo and deletes the item', async () => {
    renderPage();
    await setupCountMissing();

    fireEvent.click(screen.getAllByRole('button', { name: 'baixar etiqueta' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Motivo da baixa' });

    const selectTrigger =
      dialog.querySelector('[role="combobox"]') ?? dialog.querySelector('.MuiSelect-select');
    expect(selectTrigger).toBeTruthy();
    await pickSelectOption(selectTrigger as HTMLElement, 'Perda');

    const confirm = within(dialog).getByRole('button', { name: 'Confirmar baixa' });
    expect(confirm).toHaveProperty('disabled', false);
    fireEvent.click(confirm);

    await waitFor(() => expect(mockApi.__movements).toHaveLength(1));
    expect(mockApi.__movements[0].body).toEqual(
      expect.objectContaining({
        movementType: 'exit',
        reason: 'Contagem — Perda',
        destination: 'Perda',
      }),
    );
    await waitFor(() => expect(mockApi.__deletes).toEqual(['/stock-items/i1']));

    expect(await screen.findByText('Etiqueta baixada.')).toBeTruthy();
    // wait for the motivo dialog to fully unmount (exit transition keeps the
    // page aria-hidden while it fades out)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Motivo da baixa' })).toBeNull());
    // only one item remains as missing
    expect(screen.getAllByRole('button', { name: 'baixar etiqueta' })).toHaveLength(1);
  });

  it('"Não encontrado" motivo writes off with destination "Não encontrado"', async () => {
    renderPage();
    await setupCountMissing();

    fireEvent.click(screen.getAllByRole('button', { name: 'baixar etiqueta' })[1]);
    const dialog = await screen.findByRole('dialog', { name: 'Motivo da baixa' });

    const selectTrigger =
      dialog.querySelector('[role="combobox"]') ?? dialog.querySelector('.MuiSelect-select');
    await pickSelectOption(selectTrigger as HTMLElement, 'Não encontrado');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar baixa' }));

    await waitFor(() => expect(mockApi.__movements).toHaveLength(1));
    expect(mockApi.__movements[0].body).toEqual(
      expect.objectContaining({
        reason: 'Contagem — Não encontrado',
        destination: 'Não encontrado',
      }),
    );
    await waitFor(() => expect(mockApi.__deletes).toEqual(['/stock-items/i2']));
  });

  it('bulk write-off asks for one motivo and applies it to the whole batch', async () => {
    renderPage();
    await setupCountMissing();

    // select all missing items and use the bulk "Baixar"
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar tudo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Baixar (2)' }));

    const dialog = await screen.findByRole('dialog', { name: 'Motivo da baixa' });
    // batch hint mentions the number of selected items
    expect(within(dialog).getByText(/baixar as 2 etiqueta\(s\)/)).toBeTruthy();

    const selectTrigger =
      dialog.querySelector('[role="combobox"]') ?? dialog.querySelector('.MuiSelect-select');
    await pickSelectOption(selectTrigger as HTMLElement, 'Perda');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar baixa' }));

    await waitFor(() => expect(mockApi.__movements).toHaveLength(2));
    for (const movement of mockApi.__movements) {
      expect(movement.body).toEqual(
        expect.objectContaining({
          movementType: 'exit',
          reason: 'Contagem — Perda',
          destination: 'Perda',
        }),
      );
    }
    await waitFor(() =>
      expect(mockApi.__deletes).toEqual(['/stock-items/i1', '/stock-items/i2']),
    );

    // nothing else to write off
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'baixar etiqueta' })).toBeNull(),
    );
  });

  it('motivo options come only from the destinations registered as "Baixar"', async () => {
    renderPage();
    await setupCountMissing();

    fireEvent.click(screen.getAllByRole('button', { name: 'baixar etiqueta' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Motivo da baixa' });

    const selectTrigger =
      dialog.querySelector('[role="combobox"]') ?? dialog.querySelector('.MuiSelect-select');
    fireEvent.mouseDown(selectTrigger as HTMLElement);

    const options = await screen.findAllByRole('option');
    expect(
      options
        .map((o) => o.textContent)
        .filter((t) => t !== 'Selecione...'),
    ).toEqual(['Perda', 'Não encontrado', 'Vencido', 'Fornecedor']);
    // valores antigos hardcoded que deixaram de existir
    expect(screen.queryByRole('option', { name: 'Outro' })).toBeNull();

    await pickSelectOption(selectTrigger as HTMLElement, 'Vencido');
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar baixa' });
    expect(confirm).toHaveProperty('disabled', false);
    fireEvent.click(confirm);

    await waitFor(() => expect(mockApi.__movements).toHaveLength(1));
    // o destino do movimento é o destino cadastrado selecionado
    expect(mockApi.__movements[0].body).toEqual(
      expect.objectContaining({
        movementType: 'exit',
        reason: 'Contagem — Vencido',
        destination: 'Vencido',
      }),
    );
    await waitFor(() => expect(mockApi.__deletes).toEqual(['/stock-items/i1']));
  });
});

describe('Devolver (written-off labels)', () => {
  it('lists the written-off labels and restoring creates an entry movement', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Devolver' }));

    // tombstone listado (produto + QR + destino da baixa)
    expect(await screen.findByText('Queijo')).toBeTruthy();
    expect(screen.getByText('XY9900')).toBeTruthy();
    expect(screen.getByText('Perda')).toBeTruthy();
    expect(screen.queryByText('Nenhuma etiqueta baixada')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Devolver$/ }));

    await waitFor(() =>
      expect(mockApi.__restores).toEqual(['/stock-items/removals/r1/restore']),
    );
    // a devolução registra uma movimentação de ENTRADA
    await waitFor(() => expect(mockApi.__movements).toHaveLength(1));
    expect(mockApi.__movements[0].body).toEqual(
      expect.objectContaining({
        movementType: 'entry',
        productName: 'Queijo',
        weightGrams: 900,
        itemType: 'raw',
      }),
    );
    expect(await screen.findByText(/devolvida ao estoque/)).toBeTruthy();
  });
});

describe('QR of an already used label (HTTP 410)', () => {
  it('shows the "já usada" warning and does NOT add the label to the selection', async () => {
    renderPage();

    // 'ZZ4100' is the code the api mock answers with 410 + UsedLabelInfo.
    fireEvent.change(screen.getByPlaceholderText('Ex: AB1234'), {
      target: { value: 'ZZ4100' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(mockApi.__gets).toContain('/stock-items/qr/ZZ4100'));

    const warning = await screen.findByText(/Etiqueta já usada/);
    expect(warning.textContent).toContain('Queijo');
    expect(warning.textContent).toContain('destino: Salão');
    expect(warning.textContent).toContain('por Robson');
    expect(warning.textContent).toContain('15/10/2026');
    // aviso distinto do erro genérico de QR desconhecido
    expect(screen.queryByText('Etiqueta não encontrada.')).toBeNull();

    // a etiqueta NÃO entrou na seleção
    expect(screen.queryByText(/Etiquetas selecionadas/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'remover etiqueta' })).toBeNull();
  });
});
