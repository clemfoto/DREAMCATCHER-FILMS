import { redirect } from "next/navigation";
import { requireUsuario } from "@/lib/auth";
import { navegacion } from "@/lib/esquema";

export default async function Inicio() {
  const nav = await navegacion(await requireUsuario());
  redirect(nav.principal[0]?.href ?? "/mas");
}
