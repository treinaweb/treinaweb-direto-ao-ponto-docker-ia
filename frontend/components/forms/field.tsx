import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Aparência dos controles nativos (textarea, select), igual à do `Input` do design system. */
export const controlClass =
  "w-full min-w-0 rounded-md border border-input bg-background px-3 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

export type FieldProps = {
  name: string;
  label: string;
  /** Texto de ajuda fixo abaixo do campo (ex.: limites). */
  help?: string;
  error?: string;
};

/** Ids e atributos de acessibilidade ligando o controle ao rótulo, à ajuda e ao erro. */
export function fieldA11y({ name, help, error }: FieldProps) {
  const id = `field-${name}`;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  return {
    id,
    helpId,
    errorId,
    control: {
      id,
      name,
      "aria-invalid": error ? true : undefined,
      "aria-describedby": describedBy,
    },
  };
}

/** Rótulo + controle + erro + ajuda, no mesmo layout do `FormField`. */
export function FieldShell({
  label,
  help,
  error,
  a11y,
  className,
  children,
}: Omit<FieldProps, "name"> & {
  a11y: ReturnType<typeof fieldA11y>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <Label htmlFor={a11y.id}>{label}</Label>
      {children}
      {error ? (
        <p id={a11y.errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={a11y.helpId} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  );
}
