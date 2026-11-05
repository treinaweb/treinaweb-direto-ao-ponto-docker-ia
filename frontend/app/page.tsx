import { redirect } from "next/navigation";

// O proxy já encaminha "/" conforme a sessão; isto é só a rede de segurança.
export default function Home() {
  redirect("/dashboard");
}
