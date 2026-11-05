import { donutSegments, fractions, proportions } from "@/lib/dashboard/chart-math";
import { formatNumber, formatPercent } from "@/lib/format";

/** Um item de série: rótulo pt-BR, valor e cor (variável CSS do design system). */
export type ChartItem = { label: string; value: number; color: string };

function summary(title: string, items: ChartItem[]) {
  return `${title}: ${items.map((i) => `${i.label} ${formatNumber(i.value)}`).join(", ")}`;
}

const RADIUS = 48;
const STROKE = 20;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Rosca + legenda (rótulo, número e percentual). A legenda fica abaixo e só
 * vai para o lado quando o painel (`@container`) tem largura para isso.
 */
export function DonutChart({ title, items }: { title: string; items: ChartItem[] }) {
  const segments = donutSegments(
    items.map((i) => i.value),
    CIRCUMFERENCE,
  );
  const shares = fractions(items.map((i) => i.value));

  return (
    <div className="flex flex-col items-center gap-6 @sm:flex-row @sm:gap-8">
      <svg
        role="img"
        aria-label={summary(title, items)}
        viewBox="0 0 120 120"
        className="size-40 shrink-0 -rotate-90"
      >
        {items.map((item, i) =>
          segments[i].length > 0 ? (
            <circle
              key={item.label}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={item.color}
              strokeWidth={STROKE}
              strokeDasharray={`${segments[i].length} ${CIRCUMFERENCE - segments[i].length}`}
              strokeDashoffset={-segments[i].offset}
            />
          ) : null,
        )}
      </svg>
      <ul className="grid w-full gap-2 text-sm">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: item.color }} />
            <span className="flex-1">{item.label}</span>
            <span className="tabular-nums">{formatNumber(item.value)}</span>
            <span className="w-12 text-right text-muted-foreground tabular-nums">
              ({formatPercent(shares[i])})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Barras verticais com topo arredondado; rótulo e valor sob cada barra. */
export function BarChart({ title, items }: { title: string; items: ChartItem[] }) {
  const heights = proportions(items.map((i) => i.value));
  return (
    <div role="img" aria-label={summary(title, items)} className="grid gap-3">
      <div aria-hidden className="flex h-40 items-end gap-3 border-b border-border sm:gap-6">
        {items.map((item, i) => (
          <div key={item.label} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="min-h-1 w-full rounded-t-lg"
              style={{ height: `${heights[i] * 100}%`, background: item.color }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex gap-3 text-center sm:gap-6">
        {items.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium tabular-nums">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Medidores horizontais (rótulo, barra proporcional e número). */
export function Meter({ title, items }: { title: string; items: ChartItem[] }) {
  const widths = proportions(items.map((i) => i.value));
  return (
    <ul aria-label={title} className="grid gap-4">
      {items.map((item, i) => (
        <li key={item.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span>{item.label}</span>
          <span aria-hidden className="h-2 overflow-hidden rounded-full bg-muted-foreground/15">
            <span
              className="block h-full rounded-full"
              style={{ width: `${widths[i] * 100}%`, background: item.color }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{formatNumber(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
