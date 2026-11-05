import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-10 sm:justify-center sm:py-20">
      <div className="w-full max-w-md">
        <Brand className="mb-8 justify-center" />
        <div className="rounded-panel bg-card p-6 text-card-foreground sm:p-8">{children}</div>
      </div>
    </main>
  );
}
