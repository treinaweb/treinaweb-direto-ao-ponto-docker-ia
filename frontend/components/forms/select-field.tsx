import { cn } from "@/lib/utils";
import { FieldShell, controlClass, fieldA11y, type FieldProps } from "./field";

export type SelectOption = { value: string; label: string };

type SelectFieldProps = FieldProps &
  Omit<React.ComponentProps<"select">, "id" | "name" | "children"> & {
    options: SelectOption[];
    /** Primeira opção vazia ("Selecione..."), quando o campo começa sem seleção. */
    placeholder?: string;
    className?: string;
  };

/** `<select>` nativo: boa usabilidade no mobile e acesso por teclado sem componente extra. */
export function SelectField({
  name,
  label,
  help,
  error,
  options,
  placeholder,
  className,
  ...props
}: SelectFieldProps) {
  const a11y = fieldA11y({ name, label, help, error });
  return (
    <FieldShell label={label} help={help} error={error} a11y={a11y} className={className}>
      <select {...a11y.control} className={cn(controlClass, "h-11")} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
