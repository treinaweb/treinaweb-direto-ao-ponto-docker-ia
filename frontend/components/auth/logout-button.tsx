"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/auth/logout-action";

type LogoutButtonProps = {
  className?: string;
  /** Classes do texto (ex.: `md:max-lg:sr-only` no rail de ícones). */
  labelClassName?: string;
};

function LogoutSubmit({ className, labelClassName }: LogoutButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className={cn(
        "h-11 min-w-11 rounded-md border-foreground bg-transparent px-4 text-sm font-semibold tracking-[0.05em] uppercase dark:border-foreground dark:bg-transparent",
        className,
      )}
    >
      <LogOut aria-hidden className="size-4" />
      <span className={labelClassName}>{pending ? "Saindo..." : "Sair"}</span>
    </Button>
  );
}

export function LogoutButton(props: LogoutButtonProps) {
  return (
    <form action={logoutAction}>
      <LogoutSubmit {...props} />
    </form>
  );
}
