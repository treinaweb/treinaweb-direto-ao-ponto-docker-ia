import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { Breadcrumbs } from "./breadcrumbs";
import { MobileNav } from "./mobile-nav";
import { SidebarContent } from "./sidebar";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center gap-2 border-b border-border bg-background px-4 md:px-8">
      <MobileNav>
        <SidebarContent />
      </MobileNav>
      <Suspense fallback={<div className="h-5 w-32 animate-pulse rounded-md bg-muted" />}>
        <RoleBreadcrumbs />
      </Suspense>
    </header>
  );
}

async function RoleBreadcrumbs() {
  const user = await getCurrentUser();
  return <Breadcrumbs role={user.role} />;
}
