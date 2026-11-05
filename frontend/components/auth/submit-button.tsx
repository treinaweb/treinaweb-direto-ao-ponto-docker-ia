import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  pending: boolean;
  label: string;
  pendingLabel: string;
  className?: string;
};

/** Botão primário de envio (44px, rótulo em caixa alta) que trava durante o envio. */
export function SubmitButton({ pending, label, pendingLabel, className }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={cn(
        "h-11 w-full rounded-md px-6 text-sm font-semibold tracking-[0.05em] uppercase active:bg-primary-pressed disabled:opacity-100 disabled:bg-input disabled:text-primary-foreground",
        className,
      )}
    >
      {pending ? pendingLabel : label}
    </Button>
  );
}
