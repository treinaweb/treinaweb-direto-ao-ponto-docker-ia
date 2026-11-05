"use client";

import { LayoutDashboard, Plus, Tags, Ticket, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type IconKey, type NavLink, type Navigation, isActive } from "@/lib/navigation/config";
import { cn } from "@/lib/utils";
import { useCloseMobileNav } from "./mobile-nav-context";
import { RAIL_HIDDEN } from "./rail";

const ICONS: Record<IconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  tickets: Ticket,
  categories: Tags,
  users: Users,
  "new-ticket": Plus,
};

/** Rótulo visível no rail (foco/hover); fora do rail o texto já aparece. */
function RailTooltip({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" className="max-md:hidden lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavItem({ item, active }: { item: NavLink; active: boolean }) {
  const Icon = ICONS[item.icon];
  const close = useCloseMobileNav();
  return (
    <li>
      <RailTooltip label={item.label}>
        <Link
          href={item.href}
          onClick={close}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring md:max-lg:justify-center md:max-lg:px-0",
            active &&
              "bg-sidebar-accent font-medium before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-primary",
          )}
        >
          <Icon aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
          <span className={cn("truncate", RAIL_HIDDEN)}>{item.label}</span>
        </Link>
      </RailTooltip>
    </li>
  );
}

/** Navegação por papel (sidebar e drawer). O item ativo vem da URL atual. */
export function NavLinks({ navigation }: { navigation: Navigation }) {
  const pathname = usePathname();
  const close = useCloseMobileNav();
  const action = navigation.primaryAction;
  const ActionIcon = action ? ICONS[action.icon] : null;

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-6">
      {action && ActionIcon && (
        <RailTooltip label={action.label}>
          <Link
            href={action.href}
            onClick={close}
            className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold tracking-[0.05em] whitespace-nowrap text-primary-foreground uppercase outline-none hover:bg-primary-pressed focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:max-lg:px-0"
          >
            <ActionIcon aria-hidden className="size-4 shrink-0" />
            <span className={RAIL_HIDDEN}>{action.label}</span>
          </Link>
        </RailTooltip>
      )}

      {navigation.groups.map((group, index) => (
        <div key={group.label ?? index} className="flex flex-col gap-1">
          {group.label && (
            <>
              <hr aria-hidden className="mb-2 hidden border-border md:max-lg:block" />
              <h2 className={cn("px-3 pb-1 text-sm text-muted-foreground", RAIL_HIDDEN)}>
                {group.label}
              </h2>
            </>
          )}
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <NavItem key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
