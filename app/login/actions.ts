"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { actualizarRegistro, tagTabla } from "@/lib/airtable";
import { filaPorEmail, tieneAcceso } from "@/lib/auth";
import { CLAVE_MINIMA, cifrarClave, comprobarClave, mismoCodigo } from "@/lib/clave";
import { COOKIE_SESION, DURACION_SESION_S, firmarToken } from "@/lib/token";
import { EQUIPO } from "@/config/galerias";

export type EstadoAcceso = { error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Pequeña pausa ante un fallo, para frenar a quien pruebe contraseñas a lo loco. */
const pausa = () => new Promise((r) => setTimeout(r, 600));

async function abrirSesion(email: string) {
  const h = await headers();
  const https = (h.get("x-forwarded-proto") ?? "https") === "https" && !(h.get("host") ?? "").startsWith("localhost");
  (await cookies()).set(COOKIE_SESION, firmarToken("sesion", email, DURACION_SESION_S), {
    httpOnly: true,
    secure: https,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
}

async function leerFila(email: string) {
  try {
    return { fila: await filaPorEmail(email, true) };
  } catch (e) {
    console.error("[acceso] no se pudo leer la tabla Equipo de Airtable:", e);
    return { error: "No se pudo conectar con Airtable. Revisa AIRTABLE_TOKEN y AIRTABLE_BASE_ID." };
  }
}

export async function entrar(_: EstadoAcceso, form: FormData): Promise<EstadoAcceso> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const clave = String(form.get("clave") ?? "");
  if (!EMAIL.test(email) || !clave) return { error: "Escribe tu email y tu contraseña." };

  const { fila, error } = await leerFila(email);
  if (error) return { error };
  const ok = fila && tieneAcceso(fila) && (await comprobarClave(clave, fila.fields[EQUIPO.clave]));
  if (!ok) {
    console.warn(`[acceso] intento fallido para ${email}`);
    await pausa();
    // Mismo mensaje en todos los casos, para no revelar quién tiene acceso.
    return { error: "Email o contraseña incorrectos." };
  }
  await abrirSesion(email);
  redirect("/inicio");
}

/** Primera vez (o tras un código nuevo): email + código de invitación + contraseña. */
export async function registrarse(_: EstadoAcceso, form: FormData): Promise<EstadoAcceso> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const codigo = String(form.get("codigo") ?? "");
  const clave = String(form.get("clave") ?? "");
  const repetida = String(form.get("clave2") ?? "");
  if (!EMAIL.test(email)) return { error: "Escribe un email válido." };
  if (clave.length < CLAVE_MINIMA) return { error: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres.` };
  if (clave !== repetida) return { error: "Las dos contraseñas no coinciden." };

  const { fila, error } = await leerFila(email);
  if (error) return { error };
  const valido =
    fila &&
    tieneAcceso(fila) &&
    String(fila.fields[EQUIPO.estadoInvitacion] ?? "") === EQUIPO.invitacion.pendiente &&
    mismoCodigo(codigo, fila.fields[EQUIPO.codigo]);
  if (!valido) {
    console.warn(`[acceso] código de invitación no válido para ${email}`);
    await pausa();
    return { error: "El código no es válido para ese email, ya se usó o fue cancelado. Pide uno nuevo al administrador." };
  }
  await actualizarRegistro(EQUIPO.tabla, fila.id, {
    [EQUIPO.clave]: await cifrarClave(clave),
    [EQUIPO.estadoInvitacion]: EQUIPO.invitacion.usada,
    [EQUIPO.codigo]: null,
  });
  updateTag(tagTabla(EQUIPO.tabla));
  await abrirSesion(email);
  redirect("/inicio");
}
