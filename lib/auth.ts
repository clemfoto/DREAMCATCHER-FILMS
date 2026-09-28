import "server-only";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getRegistros, getRegistrosSinCache, type AirRecord } from "@/lib/airtable";
import { EQUIPO, type Rol } from "@/config/galerias";
import { COOKIE_SESION, verificarToken } from "@/lib/token";

export type Usuario = { id: string; nombre: string; email: string; rol: Rol };

/** Una persona puede entrar si está Activa en Equipo y su invitación no está cancelada. */
export function tieneAcceso(r: AirRecord): boolean {
  return r.fields[EQUIPO.activo] === true && String(r.fields[EQUIPO.estadoInvitacion] ?? "") !== EQUIPO.invitacion.cancelada;
}

export function aUsuario(r: AirRecord): Usuario {
  const email = String(r.fields[EQUIPO.email] ?? "").trim().toLowerCase();
  const rol = String(r.fields[EQUIPO.rol] ?? "") === EQUIPO.rolAdmin ? "Administrador" : "Equipo";
  return { id: r.id, nombre: String(r.fields[EQUIPO.nombre] ?? email), email, rol };
}

/** Fila de Equipo con ese email (tenga o no acceso). `fresco` lee Airtable sin caché. */
export async function filaPorEmail(email: string, fresco = false): Promise<AirRecord | null> {
  const buscado = email.trim().toLowerCase();
  if (!buscado) return null;
  const regs = await (fresco ? getRegistrosSinCache : getRegistros)(EQUIPO.tabla);
  return regs.find((x) => String(x.fields[EQUIPO.email] ?? "").trim().toLowerCase() === buscado) ?? null;
}

/**
 * Miembro con acceso a la app por su email. Equipo es la única lista de acceso:
 * desactivar a alguien o cancelar su invitación le cierra la sesión.
 */
export async function miembroPorEmail(email: string, fresco = false): Promise<Usuario | null> {
  const r = await filaPorEmail(email, fresco);
  return r && tieneAcceso(r) ? aUsuario(r) : null;
}

/**
 * Usuario de la sesión actual. El rol se relee de Equipo en cada petición
 * (con caché corta), así que desactivar a alguien o cambiarle el rol surte efecto enseguida.
 */
export async function getUsuario(): Promise<Usuario | null> {
  const token = (await cookies()).get(COOKIE_SESION)?.value;
  const p = verificarToken(token, "sesion");
  if (!p) return null;
  return miembroPorEmail(p.email);
}

export async function requireUsuario(): Promise<Usuario> {
  const u = await getUsuario();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin(): Promise<Usuario> {
  const u = await requireUsuario();
  if (u.rol !== EQUIPO.rolAdmin) forbidden();
  return u;
}
