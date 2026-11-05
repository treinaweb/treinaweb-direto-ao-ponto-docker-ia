import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marca TreinaDesk (ícone + nome). */
export function Brand({
  className,
  labelClassName,
}: {
  className?: string;
  /** Classes do nome (ex.: `md:max-lg:sr-only` no rail de ícones). */
  labelClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background"
      >
        <LifeBuoy className="size-5" strokeWidth={1.75} />
      </span>
      <span className={cn("text-lg leading-none font-medium tracking-tight", labelClassName)}>
        TreinaDesk
      </span>
    </div>
  );
}
