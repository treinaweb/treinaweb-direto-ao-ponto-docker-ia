import { cn } from "@/lib/utils";
import { FieldShell, controlClass, fieldA11y, type FieldProps } from "./field";

type TextareaFieldProps = FieldProps &
  Omit<React.ComponentProps<"textarea">, "id" | "name"> & { className?: string };

/** Texto longo em várias linhas (ex.: descrição do chamado). */
export function TextareaField({
  name,
  label,
  help,
  error,
  className,
  rows = 6,
  ...props
}: TextareaFieldProps) {
  const a11y = fieldA11y({ name, label, help, error });
  return (
    <FieldShell label={label} help={help} error={error} a11y={a11y} className={className}>
      <textarea
        {...a11y.control}
        rows={rows}
        className={cn(controlClass, "min-h-32 resize-y py-2.5 leading-[1.38]")}
        {...props}
      />
    </FieldShell>
  );
}
