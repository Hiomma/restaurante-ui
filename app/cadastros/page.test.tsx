/**
 * Tests for the "Cadastros" page: header, tab navigation and the mounting of
 * the "Destinos" and "Fornecedores" registries.
 *
 * All data hooks from '@/lib/queries' are mocked so the test is fully
 * deterministic (no network, no camera).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/cadastros',
}));

vi.mock('@/lib/queries', () => {
  const queryResult = { data: [], isLoading: false };
  const mutation = () => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  });
  return {
    // Consumed by lib/permissions (useAccess) through the NavigationRail that
    // mounts inside LoggedLayout: an owner (non-employee) so Cadastros and
    // Relatórios stay visible in the sidebar during the test.
    useMe: () => ({
      data: { _id: 'u1', name: 'Dono Teste', username: 'dono', isEmployee: false },
      isLoading: false,
    }),
    useProducts: () => queryResult,
    useCreateProduct: mutation,
    useUpdateProduct: mutation,
    useDeleteProduct: mutation,
    useEmployees: () => queryResult,
    useCreateEmployee: mutation,
    useUpdateEmployee: mutation,
    useDeleteEmployee: mutation,
    useMovementDestinations: () => queryResult,
    useCreateMovementDestination: mutation,
    useDeleteMovementDestination: mutation,
    useSuppliers: () => queryResult,
    useCreateSupplier: mutation,
    useUpdateSupplier: mutation,
    useDeleteSupplier: mutation,
    useChangePassword: mutation,
  };
});

import CadastrosPage from './page';

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>
        <CadastrosPage />
      </SnackbarProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe('Cadastros page', () => {
  it('shows the header and switches to the Destinos and Fornecedores registries', async () => {
    renderPage();

    // Page header
    expect(screen.getByRole('heading', { name: 'Cadastros' })).toBeTruthy();
    expect(screen.getByText('Produtos, funcionários, destinos e fornecedores')).toBeTruthy();

    // "Destinos" tab
    fireEvent.click(screen.getByRole('tab', { name: 'Destinos' }));
    expect(
      await screen.findByText('Gerencie os destinos disponíveis para as ações Mover e Baixar'),
    ).toBeTruthy();
    // built-in destinations are listed as read-only rows
    expect(screen.getByText('Salão')).toBeTruthy();

    // "Fornecedores" tab
    fireEvent.click(screen.getByRole('tab', { name: 'Fornecedores' }));
    expect(await screen.findByText('Nenhum fornecedor encontrado')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Novo Fornecedor' })).toBeTruthy();
  });
});
