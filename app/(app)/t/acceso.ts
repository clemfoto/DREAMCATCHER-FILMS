"use server";
import { forbidden, notFound } from "next/navigation";
import { updateTag } from "next/cache";
import { actualizarRegistro, getRegistro, tagTabla } from "@/lib/airtable";
import { requireAdmin } from "@/lib/auth";
import { generarCodigo } from "@/lib/clave";
import { EQUIPO } from "@/config/galerias";

/**
 * Da (o renueva) un código de invitación personal. Borra la contraseña anterior:
 * la persona crea una nueva en /registro con este código.
 */
export async function generarInvitacion(id: string): Promise<void> {
  const yo = await requireAdmin();
  const r = await getRegistro(EQUIPO.tabla, id);
  if (!r) notFound();
  if (!String(r.fields[EQUIPO.email] ?? "").trim()) throw new Error("Añade primero el email de esta persona.");
  // Mi propia sesión seguiría abierta, pero no me dejo sin contraseña por un toque accidental.
  if (r.id === yo.id && r.fields[EQUIPO.clave] && r.fields[EQUIPO.estadoInvitacion] === EQUIPO.invitacion.usada) forbidden();
  await actualizarRegistro(EQUIPO.tabla, id, {
    [EQUIPO.codigo]: generarCodigo(),
    [EQUIPO.estadoInvitacion]: EQUIPO.invitacion.pendiente,
    [EQUIPO.clave]: null,
  });
  updateTag(tagTabla(EQUIPO.tabla));
}

/** Cancela el acceso: invalida el código y la contraseña, y cierra sus sesiones abiertas. */
export async function cancelarInvitacion(id: string): Promise<void> {
  const yo = await requireAdmin();
  if (id === yo.id) forbidden();
  await actualizarRegistro(EQUIPO.tabla, id, {
    [EQUIPO.codigo]: null,
    [EQUIPO.estadoInvitacion]: EQUIPO.invitacion.cancelada,
    [EQUIPO.clave]: null,
  });
  updateTag(tagTabla(EQUIPO.tabla));
}
