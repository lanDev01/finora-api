/** Intervalo UTC para filtro de mês calendário (datas salvas como meia-noite UTC). */
export function monthRangeUtc(month: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

export function monthKey(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function calendarMonthKeyFromIso(iso: string | Date): string {
  if (iso instanceof Date) {
    return iso.toISOString().slice(0, 7);
  }
  return iso.slice(0, 7);
}

export function shiftMonth(month: number, year: number, delta: number): { month: number; year: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
}

export function monthKeysForLastNMonths(count: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}
