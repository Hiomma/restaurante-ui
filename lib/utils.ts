const BR_TZ = 'America/Sao_Paulo';

function isDateOnly(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

function isCalendarDate(iso: string): boolean {
  return isDateOnly(iso) || /T00:00:00(\.000)?Z$/i.test(iso);
}

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null;
  if (isDateOnly(iso)) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12));
  }
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calendarDayMs(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function brDateParts(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

function brStartOfDayMs(): number {
  const { year, month, day } = brDateParts(new Date());
  return Date.UTC(year, month - 1, day);
}

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
  if (isCalendarDate(iso)) {
    const d = parseDate(iso);
    if (!d) return '—';
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${d.getUTCFullYear()}`;
  }
  const d = parseDate(iso);
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', { timeZone: BR_TZ });
}

export function toInputDate(iso?: string | null): string {
  if (!iso) return '';
  if (isDateOnly(iso)) return iso;
  const d = parseDate(iso);
  if (!d) return '';
  if (isCalendarDate(iso)) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  const { year, month, day } = brDateParts(d);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function startOfToday(): Date {
  return new Date(brStartOfDayMs());
}

export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = parseDate(iso);
  if (!d) return null;
  const targetMs = isCalendarDate(iso)
    ? calendarDayMs(d)
    : (() => {
        const { year, month, day } = brDateParts(d);
        return Date.UTC(year, month - 1, day);
      })();
  return Math.round((targetMs - brStartOfDayMs()) / 86400000);
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
  return toInputDate(new Date().toISOString());
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
