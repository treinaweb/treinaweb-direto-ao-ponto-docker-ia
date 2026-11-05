"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/api/types";
import { breadcrumbFor } from "@/lib/navigation/config";

/** "Painel / {página}". No mobile só a página atual. */
export function Breadcrumbs({ role }: { role: Role }) {
  const crumbs = breadcrumbFor(role, usePathname());
  return (
    <nav aria-label="Você está em" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-2 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li
              key={crumb.label}
              className={isLast ? "flex min-w-0 items-center" : "hidden items-center gap-2 md:flex"}
            >
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-foreground">
                  {crumb.label}
                </span>
              ) : (
                <>
                  <Link
                    href={crumb.href ?? "/dashboard"}
                    className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                  <span aria-hidden className="text-steel">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
