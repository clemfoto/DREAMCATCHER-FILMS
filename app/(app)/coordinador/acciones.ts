"use server";
import { forbidden, notFound, redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { headers } from "next/headers";
import { actualizarRegistro, getRegistro, tagTabla } from "@/lib/airtable";
import { requireUsuario } from "@/lib/auth";
import { editableCoordinacion, puedeCoordinar, tablaPorId } from "@/lib/esquema";
import { leerCampo } from "@/lib/leer-campo";
import { procesarClientes } from "@/lib/automatizaciones";
import { telegramConfigurado } from "@/lib/telegram";
import { COORDINADOR, TABLAS } from "@/config/galerias";
import type { EstadoForm } from "@/app/(app)/t/acciones";

/**
 * Guarda el team de un cliente desde la sección Coordinador. Solo se aceptan los campos
 * permitidos (COORDINADOR.editablesClientes); el resto del formulario se ignora.
 * Después se lanzan las invitaciones por Telegram a los nuevos team members.
 */
export async function guardarCoordinacion(recordId: string, _: EstadoForm, form: FormData): Promise<EstadoForm> {
  const u = await requireUsuario();
  if (!puedeCoordinar(u)) forbidden();
  const t = await tablaPorId(TABLAS.clientes);
  if (!t || !(await getRegistro(t.id, recordId))) notFound();

  const fields: Record<string, unknown> = {};
  try {
    for (const f of t.fields) {
      if (!form.has(`p:${f.id}`) || !editableCoordinacion(f) || f.type === "multipleAttachments") continue;
      const v = leerCampo(f, form);
      if (v !== undefined) fields[f.name] = v;
    }
    if (Object.keys(fields).length) await actualizarRegistro(t.id, recordId, fields);
  } catch (e) {
    return { error: (e as Error).message };
  }
  updateTag(tagTabla(t.id));
  for (const f of t.fields) if (f.options?.linkedTableId) updateTag(tagTabla(f.options.linkedTableId));

  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  after(async () => {
    try {
      if (telegramConfigurado()) await procesarClientes(base);
    } catch (e) {
      console.error("[coordinador] invitaciones tras guardar el team", e);
    }
  });
  redirect(`${COORDINADOR.ruta}/${recordId}`);
}
