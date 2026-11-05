"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MobileNavContext } from "./mobile-nav-context";

/**
 * Drawer de navegação abaixo de md. O conteúdo (navegação e área do usuário)
 * vem do servidor como `children`; os links o fecham via contexto.
 */
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <MobileNavContext value={{ close: () => setOpen(false) }}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring md:hidden">
          <Menu aria-hidden className="size-5" strokeWidth={1.5} />
          <span className="sr-only">Abrir menu</span>
        </SheetTrigger>
        <SheetContent side="left" closeLabel="Fechar menu" className="w-72 max-w-[85vw] gap-0 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          {children}
        </SheetContent>
      </Sheet>
    </MobileNavContext>
  );
}
