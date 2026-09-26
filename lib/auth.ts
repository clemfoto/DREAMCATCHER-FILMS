import "server-only";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { getRegistros, getRegistrosSinCache } from "@/lib/airtable";
import { EQUIPO, type Rol } from "@/config/galerias";
import { COOKIE_SESION, verificarToken } from "@/lib/token";

export type Usuario = { id: string; nombre: string; email: string; rol: Rol };

/**
 * Busca un miembro activo de Equipo por email. Es la única lista de acceso a la app.
 * `fresco` lee Airtable sin caché (login), para que un alta nueva funcione al momento.
 */
export async function miembroPorEmail(email: string, fresco = false): Promise<Usuario | null> {
  const buscado = email.trim().toLowerCase();
  if (!buscado) return null;
  const regs = await (fresco ? getRegistrosSinCache : getRegistros)(EQUIPO.tabla);
  const r = regs.find(
    (x) => String(x.fields[EQUIPO.email] ?? "").trim().toLowerCase() === buscado && x.fields[EQUIPO.activo] === true,
  );
  if (!r) return null;
  const rol = String(r.fields[EQUIPO.rol] ?? "") === EQUIPO.rolAdmin ? "Administrador" : "Equipo";
  return { id: r.id, nombre: String(r.fields[EQUIPO.nombre] ?? buscado), email: buscado, rol };
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
