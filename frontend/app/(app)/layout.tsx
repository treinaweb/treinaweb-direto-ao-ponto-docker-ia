import { SidebarContent } from "@/components/app-shell/sidebar";
import { TopBar } from "@/components/app-shell/top-bar";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Moldura das páginas autenticadas: sidebar (rail de ícones entre md e lg,
 * drawer abaixo de md) + top bar + conteúdo. A sessão só é lida dentro de
 * <Suspense> nos componentes filhos, nunca no topo do layout.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-1">
        <aside className="sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:block md:w-16 lg:w-[212px]">
          <SidebarContent />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 md:p-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
