import Link from "next/link";
import { cn } from "@/lib/utils";

/** `panel-chart`/`panel-list`: superfície `card` (cloud/charcoal), raio xl, sem sombra. */
export function Panel({
  title,
  action,
  className,
  children,
}: {
  title: string;
  action?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex min-w-0 flex-col gap-6 rounded-panel bg-card p-6 text-card-foreground", className)}
    >
      <header className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="text-base leading-[1.38] font-medium">{title}</h2>
        {action && (
          <Link
            href={action.href}
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {action.label}
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}

/** Mensagem curta dentro de um painel (estados vazios). */
export function PanelMessage({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Esqueleto de um painel: mantém o título visível enquanto carrega. */
export function PanelSkeleton({ title, className }: { title: string; className?: string }) {
  return (
    <Panel title={title} className={className}>
      <div aria-busy="true" aria-label={`Carregando ${title}`} className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-5 animate-pulse rounded-md bg-muted-foreground/20" />
        ))}
      </div>
    </Panel>
  );
}
