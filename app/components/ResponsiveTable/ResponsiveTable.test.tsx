/**
 * Regression tests for the mobile table → list transformation.
 *
 * `ResponsiveTable` renders one single set of column definitions two ways:
 * a MUI <Table> at >= 900px and a list of cards below 900px. The invariant
 * under test is the one that matters for mobile: no column value and no row
 * action may disappear when the layout switches.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Button from '@mui/material/Button';
import ResponsiveTable from './ResponsiveTable';

type Row = { _id: string; name: string; weightGrams: number };

const rows: Row[] = [
  { _id: 'r1', name: 'Alho', weightGrams: 200 },
  { _id: 'r2', name: 'Cebola', weightGrams: 500 },
];

const columns = [
  { id: 'name', header: 'Produto', primary: true, cell: (r: Row) => r.name },
  { id: 'peso', header: 'Peso', cell: (r: Row) => `${r.weightGrams}g` },
  { id: 'validade', header: 'Validade', cell: () => '12/10/2026' },
];

const actions = (r: Row) => (
  <Button size="small" aria-label={`editar ${r.name}`}>
    Editar
  </Button>
);

const originalMatchMedia = window.matchMedia;

function useViewport(mobile: boolean) {
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: mobile && query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    cleanup();
  });
}

describe('ResponsiveTable (desktop)', () => {
  useViewport(false);

  it('renders a table with every column and every row action', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r._id} actions={actions} />);

    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('Produto')).toBeTruthy();
    expect(screen.getByText('Peso')).toBeTruthy();
    expect(screen.getByText('Validade')).toBeTruthy();

    expect(screen.getByText('Alho')).toBeTruthy();
    expect(screen.getByText('Cebola')).toBeTruthy();
    expect(screen.getByText('200g')).toBeTruthy();
    expect(screen.getByText('500g')).toBeTruthy();

    expect(screen.getByRole('button', { name: 'editar Alho' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'editar Cebola' })).toBeTruthy();
  });

  it('shows the empty message when there is nothing to render', () => {
    render(
      <ResponsiveTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r._id}
        actions={actions}
        emptyMessage="Nenhum produto encontrado"
      />,
    );

    expect(screen.getByText('Nenhum produto encontrado')).toBeTruthy();
  });
});

describe('ResponsiveTable (mobile, <900px)', () => {
  useViewport(true);

  it('turns the table into a list without losing a column value', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r._id} actions={actions} />);

    // No table anymore…
    expect(screen.queryByRole('table')).toBeNull();

    // …but every column is still readable, labelled, for every row.
    // The primary column becomes the card title, so it shows its value
    // instead of a label. Each secondary label is repeated once per card.
    expect(screen.getAllByText('Peso')).toHaveLength(rows.length);
    expect(screen.getAllByText('Validade')).toHaveLength(rows.length);

    expect(screen.getByText('Alho')).toBeTruthy();
    expect(screen.getByText('Cebola')).toBeTruthy();
    expect(screen.getAllByText('200g')).toHaveLength(1);
    expect(screen.getAllByText('500g')).toHaveLength(1);
    expect(screen.getAllByText('12/10/2026')).toHaveLength(2);
  });

  it('keeps every row action reachable on cards', () => {
    render(<ResponsiveTable columns={columns} rows={rows} rowKey={(r) => r._id} actions={actions} />);

    expect(screen.getByRole('button', { name: 'editar Alho' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'editar Cebola' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^editar / })).toHaveLength(rows.length);
  });

  it('keeps the leading control, the footer note and the list header', () => {
    render(
      <ResponsiveTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        actions={actions}
        leading={(r) => <input type="checkbox" aria-label={`selecionar ${r.name}`} />}
        footerNote={<span>Total: 2</span>}
        mobileListHeader={<span>Selecionar todos</span>}
      />,
    );

    expect(screen.getByLabelText('selecionar Alho')).toBeTruthy();
    expect(screen.getByLabelText('selecionar Cebola')).toBeTruthy();
    expect(screen.getByText('Total: 2')).toBeTruthy();
    expect(screen.getByText('Selecionar todos')).toBeTruthy();
  });

  it('shows the empty message as a list placeholder', () => {
    render(
      <ResponsiveTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r._id}
        actions={actions}
        emptyMessage="Nenhum produto encontrado"
      />,
    );

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Nenhum produto encontrado')).toBeTruthy();
  });
});
