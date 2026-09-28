"use server";
import { forbidden, notFound } from "next/navigation";
import { updateTag } from "next/cache";
import { actualizarRegistro, getRegistro, tagTabla } from "@/lib/airtable";
import { requireAdmin } from "@/lib/auth";
import { hoyISO, texto } from "@/lib/formato";
import { DECISIONES, GALERIAS, TABLAS } from "@/config/galerias";

/** Acciones de un toque del panel "Lo que necesita decisión" (solo administradores). */

function refrescar(...tablas: string[]) {
  for (const t of tablas) updateTag(tagTabla(t));
  updateTag(tagTabla(TABLAS.clientes));
}

/** Visto bueno a una entrega en revisión. */
export async function aprobarEntrega(id: string): Promise<void> {
  await requireAdmin();
  const campo = String(GALERIAS[TABLAS.entrega].status);
  const r = await getRegistro(TABLAS.entrega, id);
  if (!r) notFound();
  const actual = Array.isArray(r.fields[campo]) ? (r.fields[campo] as unknown[]).map(texto) : [texto(r.fields[campo])];
  const nuevo = [...actual.filter((x) => x && x !== DECISIONES.entregaEnRevision), DECISIONES.entregaAprobada];
  await actualizarRegistro(TABLAS.entrega, id, { [campo]: [...new Set(nuevo)] });
  refrescar(TABLAS.entrega);
}

/** Aprueba o rechaza un gasto. Quien lo pagó no puede aprobarlo: lo decide otro socio. */
export async function decidirGasto(id: string, aprobado: boolean): Promise<void> {
  const u = await requireAdmin();
  const g = GALERIAS[TABLAS.gastos];
  const r = await getRegistro(TABLAS.gastos, id);
  if (!r) notFound();
  const pagadores = (r.fields[String(g.pagador)] as string[] | undefined) ?? [];
  if (pagadores.includes(u.id)) forbidden();
  await actualizarRegistro(TABLAS.gastos, id, {
    [String(g.aprobacion)]: aprobado ? DECISIONES.aprobado : DECISIONES.rechazado,
    [String(g.aprobadoPor)]: [u.id],
  });
  refrescar(TABLAS.gastos, TABLAS.equipo);
}

/** Marca un pago como cobrado (con la fecha de hoy) o lo deja pendiente otra vez. */
export async function marcarPagado(id: string, pagado = true): Promise<void> {
  await requireAdmin();
  const g = GALERIAS[TABLAS.pagos];
  await actualizarRegistro(TABLAS.pagos, id, {
    [String(g.pagado)]: pagado,
    [String(g.fechaPago)]: pagado ? hoyISO() : null,
  });
  refrescar(TABLAS.pagos);
}
