const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const percent = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});
const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** 1234 → "1.234". */
export function formatNumber(value: number): string {
  return integer.format(value);
}

/** Fração (0–1) → "50%". */
export function formatPercent(fraction: number): string {
  return percent.format(fraction);
}

/** ISO 8601 → "14/10/2026" (horário de Brasília, igual no servidor e no cliente). */
export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}

/** ISO 8601 → "14/10/2026, 12:30" (horário de Brasília). */
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}
