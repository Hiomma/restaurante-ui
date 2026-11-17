/**
 * Tests for the "Estoque" page.
 *
 * Covered behavior:
 * - The search box matches the QR CODE of a label: typing/pasting a code
 *   (or reading it with the camera) narrows the list to that label's product.
 * - The camera button opens the QR reader and feeds the same search field.
 * - Weights are displayed in the UNIT registered for the product: products
 *   saved as "litro" show ml/L, the others keep g/kg (the numeric base of
 *   the system is unchanged: 1g = 1ml).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/stock',
}));

// Same contract as the real dialog, without html5-qrcode/camera in tests.
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
  const products = [
    {
      _id: 'p1',
      name: 'Queijo',
      group: 'Frios',
      category: 'Materia Prima',
      storageMethod: 'Refrigerado',
      shelfLifeDays: 30,
      minQuantity: 1000,
      unit: 'kg',
      minPortionedQuantity: 0,
      consumeAfterOpeningDays: 3,
      createdAt: '2026-10-01',
    },
    {
      _id: 'p2',
      name: 'Leite',
      group: 'Laticínios',
      category: 'Materia Prima',
      storageMethod: 'Refrigerado',
      shelfLifeDays: 7,
      minQuantity: 2000,
      unit: 'l',
      minPortionedQuantity: 0,
      consumeAfterOpeningDays: 3,
      createdAt: '2026-10-01',
    },
  ];
  const items = [
    {
      _id: 'i1',
      product: { productId: 'p1', productName: 'Queijo' },
      type: 'raw',
      weightGrams: 800,
      manipulationDate: '2026-10-01',
      expiryDate: '2026-10-25',
      qrCode: 'AB1234',
      status: 'in_stock',
      lote: 'L-1',
      createdAt: '2026-10-01',
    },
    {
      _id: 'i2',
      product: { productId: 'p1', productName: 'Queijo' },
      type: 'raw',
      weightGrams: 250,
      manipulationDate: '2026-10-01',
      expiryDate: '2026-10-25',
      qrCode: 'CD5678',
      status: 'in_stock',
      lote: 'L-2',
      createdAt: '2026-10-01',
    },
    {
      _id: 'i3',
      product: { productId: 'p2', productName: 'Leite' },
      type: 'raw',
      weightGrams: 1500,
      manipulationDate: '2026-10-01',
      expiryDate: '2026-10-25',
      qrCode: 'XY9900',
      status: 'in_stock',
      lote: 'L-3',
      createdAt: '2026-10-01',
    },
  ];
  const api = {
    get: async (url: string) => {
      if (url.startsWith('/products')) return { data: products.map((p) => ({ ...p })) };
      if (url.startsWith('/stock-items')) return { data: items.map((i) => ({ ...i })) };
      if (url.startsWith('/movement-destinations')) return { data: [] };
      if (url.startsWith('/permission-profiles')) return { data: null };
      if (url.startsWith('/users/me')) {
        return { data: { _id: 'u1', name: 'Dono', username: 'dono' } };
      }
      return { data: [] };
    },
    post: async () => ({ data: {} }),
    put: async () => ({ data: {} }),
    delete: async () => ({ data: {} }),
  };
  return { default: api };
});

import StockPage from './page';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <StockPage />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

const searchBox = async () =>
  await screen.findByPlaceholderText('Buscar por produto, lote ou QR...');

afterEach(() => {
  cleanup();
});

describe('Stock search by QR code', () => {
  it('typing a label QR narrows the list to that product', async () => {
    renderPage();

    expect(await screen.findByText('Queijo')).toBeTruthy();
    expect(screen.getByText('Leite')).toBeTruthy();

    fireEvent.change(await searchBox(), { target: { value: 'XY9900' } });

    await waitFor(() => expect(screen.queryByText('Queijo')).toBeNull());
    expect(screen.getByText('Leite')).toBeTruthy();
  });

  it('the camera button opens the reader and the scanned code becomes the search', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Ler QR Code da câmera' }));
    const scanner = await screen.findByRole('dialog', { name: 'Leitor de QR (mock)' });
    fireEvent.click(within(scanner).getByRole('button', { name: 'scan-mock' }));

    await waitFor(() =>
      expect((screen.getByPlaceholderText('Buscar por produto, lote ou QR...') as HTMLInputElement).value).toBe(
        'AB1234',
      ),
    );
    // AB1234 belongs to Queijo → the other product disappears from the list.
    await waitFor(() => expect(screen.queryByText('Leite')).toBeNull());
    expect(screen.getByText('Queijo')).toBeTruthy();
  });
});

describe('Weights follow the product unit (kg | l)', () => {
  it('shows g/kg for kg products and ml/L for liter products', async () => {
    renderPage();

    // Totals per product row: Queijo = 800 + 250 g; Leite = 1500 ml.
    expect(await screen.findByText('1.05kg total')).toBeTruthy();
    expect(screen.getByText('1.50L total')).toBeTruthy();

    // Minimum line carries the unit suffix of each product.
    expect(screen.getByText('1050g/1000g min.')).toBeTruthy();
    expect(screen.getByText('1500ml/2000ml min.')).toBeTruthy();

    // Expanding a liter product shows the label weight in ml.
    fireEvent.click(screen.getByText('Leite'));
    expect(await screen.findByText('1500ml / 1.50L')).toBeTruthy();
  });
});
