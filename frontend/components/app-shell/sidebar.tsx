import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Brand } from "@/components/brand";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { DASHBOARD_HREF, getNavigation } from "@/lib/navigation/config";
import { cn } from "@/lib/utils";
import { NavLinks } from "./nav-links";
import { RAIL_HIDDEN } from "./rail";

/** Conteúdo da sidebar (desktop/tablet) e do drawer (mobile). */
export function SidebarContent() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-y-auto p-4 md:max-lg:px-2">
      <Link
        href={DASHBOARD_HREF}
        className="flex min-h-11 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring md:max-lg:justify-center"
      >
        <Brand labelClassName={RAIL_HIDDEN} />
      </Link>
      <Suspense fallback={<NavSkeleton />}>
        <RoleNav />
      </Suspense>
      <div className="mt-auto border-t border-border pt-4">
        <Suspense fallback={<UserSkeleton />}>
          <UserArea />
        </Suspense>
      </div>
    </div>
  );
}

async function RoleNav() {
  const user = await getCurrentUser();
  return <NavLinks navigation={getNavigation(user.role)} />;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Nome, papel e "Sair". Só nome e papel chegam ao HTML (DTO do DAL). */
async function UserArea() {
  const user = await getCurrentUser();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3 md:max-lg:justify-center">
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-ink"
        >
          {initials(user.name)}
        </span>
        <div className={cn("flex min-w-0 flex-col leading-tight", RAIL_HIDDEN)}>
          <span className="truncate text-sm font-medium">{user.name}</span>
          <span data-slot="user-role" className="text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      </div>
      <LogoutButton className="w-full md:max-lg:px-0" labelClassName={RAIL_HIDDEN} />
    </div>
  );
}

function NavSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando navegação" className="flex flex-col gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}

function UserSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando usuário" className="flex flex-col gap-3">
      <div className="h-8 animate-pulse rounded-lg bg-muted" />
      <div className="h-11 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
