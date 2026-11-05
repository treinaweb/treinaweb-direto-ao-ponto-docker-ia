import { CircleAlert, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type FormAlertProps = {
  tone: "error" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
};

/** Alerta de formulário: erro geral da ação ou aviso vindo de outra tela. */
export function FormAlert({ tone, children, className }: FormAlertProps) {
  const isError = tone === "error";
  const Icon = isError ? CircleAlert : Info;

  return (
    <Alert
      variant={isError ? "destructive" : "default"}
      // Erros interrompem (role=alert); avisos são anunciados com educação.
      role={isError ? "alert" : "status"}
      className={cn(
        "rounded-md px-3 py-2.5",
        isError ? "border-destructive/40 bg-background" : "border-transparent bg-info text-info-foreground",
        className,
      )}
    >
      <Icon aria-hidden />
      <AlertDescription className={isError ? "text-destructive" : "text-info-foreground"}>
        {children}
      </AlertDescription>
    </Alert>
  );
}
