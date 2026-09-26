"use server";
import { headers } from "next/headers";
import { miembroPorEmail } from "@/lib/auth";
import { enviarEnlace } from "@/lib/email";
import { DURACION_ENLACE_S, firmarToken } from "@/lib/token";

export type EstadoLogin = { ok?: boolean; error?: string; urlDev?: string };

export async function pedirEnlace(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Escribe un email válido." };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  let miembro;
  try {
    miembro = await miembroPorEmail(email, true);
  } catch (e) {
    console.error("[login] no se pudo leer la tabla Equipo de Airtable:", e);
    return { error: "No se pudo conectar con Airtable. Revisa AIRTABLE_TOKEN y AIRTABLE_BASE_ID." };
  }

  if (!miembro) {
    // No se dice en pantalla (para no revelar quién tiene acceso), pero queda en los logs del servidor.
    console.warn(`[login] ${email} no está en Equipo con Activo marcado: no se envía email.`);
  } else {
    const url = `${proto}://${host}/auth/verificar?token=${encodeURIComponent(firmarToken("enlace", email, DURACION_ENLACE_S))}`;
    // Solo para desarrollo local con datos de prueba: entra sin enviar email.
    if (process.env.AUTH_DEV_LOGIN === "1" && process.env.NODE_ENV !== "production") return { urlDev: url };
    try {
      await enviarEnlace(email, miembro.nombre, url);
      console.info(`[login] enlace enviado a ${email}`);
    } catch (e) {
      console.error("[login] error al enviar con Resend:", e);
      return { error: "No se pudo enviar el email. Inténtalo de nuevo en un momento." };
    }
  }
  // Misma respuesta exista o no el email, para no revelar quién tiene acceso.
  return { ok: true };
}
