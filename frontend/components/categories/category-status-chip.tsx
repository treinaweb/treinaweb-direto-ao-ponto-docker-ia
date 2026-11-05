import { Chip } from "@/components/tickets/chip";
import { CATEGORY_COPY } from "@/lib/categories/messages";

/**
 * Estado da categoria com texto + cor. Reaproveita os tons já validados em
 * contraste AA nos dois temas: "Ativa" = "Resolvido", "Inativa" = "Fechado".
 */
export function CategoryStatusChip({ active }: { active: boolean }) {
  return active ? (
    <Chip label={CATEGORY_COPY.active} chip="bg-chart-green text-ink" dot="bg-ink" />
  ) : (
    <Chip label={CATEGORY_COPY.inactive} chip="bg-fog text-graphite" dot="bg-graphite" />
  );
}
