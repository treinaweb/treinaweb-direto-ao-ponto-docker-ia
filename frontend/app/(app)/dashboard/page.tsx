import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { CustomerDashboard } from "@/components/dashboard/customer-dashboard";
import { KpiGridSkeleton } from "@/components/dashboard/kpi";
import { SupportDashboard } from "@/components/dashboard/support-dashboard";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Painel" };

export default function DashboardPage() {
  return (
    <div className="grid gap-8">
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<KpiGridSkeleton />}>
        <RoleDashboard />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <h1 className="text-2xl leading-none font-medium break-words md:text-[2rem]">
      Olá, {user.name}
    </h1>
  );
}

/** Cada papel vê apenas o seu painel; cada bloco carrega e falha sozinho. */
async function RoleDashboard() {
  const user = await getCurrentUser();
  switch (user.role) {
    case "CUSTOMER":
      return <CustomerDashboard />;
    case "SUPPORT":
      return <SupportDashboard />;
    case "ADMIN":
      return <AdminDashboard />;
  }
}

function GreetingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando"
      className="h-8 w-56 max-w-full animate-pulse rounded-md bg-muted"
    />
  );
}
