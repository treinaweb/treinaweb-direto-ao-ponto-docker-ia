/** Cálculos puros dos gráficos do painel (sem React). */

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

/** Fração de cada valor no total (total zero → tudo 0). */
export function fractions(values: number[]): number[] {
  const total = sum(values);
  return values.map((v) => (total > 0 ? v / total : 0));
}

/** Valor proporcional ao maior (0–1), para barras e medidores. */
export function proportions(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? v / max : 0));
}

export type DonutSegment = { length: number; offset: number };

/**
 * Fatias de um anel de circunferência `circumference`: cada uma com o
 * comprimento do traço e o deslocamento acumulado (para `stroke-dasharray`
 * e `stroke-dashoffset`). Valores zero geram fatias vazias.
 */
export function donutSegments(values: number[], circumference: number): DonutSegment[] {
  let offset = 0;
  return fractions(values).map((fraction) => {
    const segment = { length: fraction * circumference, offset };
    offset += segment.length;
    return segment;
  });
}
