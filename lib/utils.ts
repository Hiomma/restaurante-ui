export function formatWeight(grams?: number | null): string {
  if (grams === undefined || grams === null || Number.isNaN(grams)) return '—';
  if (grams >= 1000) return `${grams}g / ${(grams / 1000).toFixed(2)}kg`;
  return `${grams}g`;
}

export function formatKg(grams?: number | null): string {
  if (grams === undefined || grams === null || Number.isNaN(grams)) return '—';
  return `${(grams / 1000).toFixed(2)}kg`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

export function toInputDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

export type LifeStatus = 'expired' | 'expiring' | 'ok';

export function lifeStatus(item: {
  status: string;
  expiryDate: string;
}): LifeStatus {
  if (item.status === 'expired') return 'expired';
  if (item.status !== 'in_stock') return 'ok';
  const days = daysUntil(item.expiryDate);
  if (days === null) return 'ok';
  if (days < 0) return 'expired';
  if (days <= 7) return 'expiring';
  return 'ok';
}

export function isInStock(item: { status: string }): boolean {
  return item.status === 'in_stock';
}

export function agendaStatus(expiryDate: string): 'Vencido' | 'No prazo' {
  const days = daysUntil(expiryDate);
  if (days === null) return 'No prazo';
  return days < 0 ? 'Vencido' : 'No prazo';
}

export function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatPercent(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(1)}%`;
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(';'), ...rows.map((r) => r.map(escape).join(';'))];
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReport(): void {
  window.print();
}
