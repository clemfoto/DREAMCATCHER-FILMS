import "server-only";
import { forbidden, notFound } from "next/navigation";
import { getEsquema, getRegistros, type AirRecord } from "@/lib/airtable";
import { requireUsuario } from "@/lib/auth";
import type { Contexto } from "@/lib/contexto";
import { camposCoordinacion, nombresDe, puedeCoordinar, rutasVisibles } from "@/lib/esquema";
import { hoyISO } from "@/lib/formato";
import { AUTOMATIZACIONES, COORDINADOR, EQUIPO, GALERIAS, TABLAS } from "@/config/galerias";

/**
 * Contexto de la sección Coordinador: la tabla Clientes, pero solo con los campos permitidos
 * (sin precios ni pagos). Lo usan el rol Coordinador y los administradores.
 */
export async function contextoCoordinacion(): Promise<Contexto> {
  const u = await requireUsuario();
  if (!puedeCoordinar(u)) forbidden();
  const esquema = await getEsquema();
  const t = esquema.find((x) => x.id === TABLAS.clientes);
  if (!t) notFound();
  const campos = camposCoordinacion(t);
  const destinos = new Set(campos.map((f) => f.options?.linkedTableId).filter(Boolean) as string[]);
  const nombres: Record<string, Map<string, string>> = {};
  await Promise.all([...destinos].map(async (id) => (nombres[id] = await nombresDe(id))));
  return {
    u,
    t,
    g: GALERIAS[TABLAS.clientes] ?? {},
    campos,
    enlaces: { nombres, rutas: rutasVisibles(u, esquema) },
    esquema,
    base: COORDINADOR.ruta,
  };
}

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const C = AUTOMATIZACIONES.campos;

export type EstadoMiembro = "confirmado" | "invitado" | "pendiente" | "sinTelegram";

/** Situación de cada team member de un cliente (para el coordinador y los administradores). */
export async function estadoTeam(r: AirRecord) {
  const g = GALERIAS[TABLAS.clientes];
  const team = ids(r.fields[String(g.team)]);
  const confirmados = new Set(ids(r.fields[C.clienteConfirmados]));
  const invitados = new Set(ids(r.fields[C.clienteInvitados]));
  const personas = new Map((await getRegistros(EQUIPO.tabla)).map((p) => [p.id, p]));
  return team.map((id) => {
    const p = personas.get(id);
    const conTelegram = Boolean(String(p?.fields[C.telegramChatId] ?? "").trim());
    const estado: EstadoMiembro = confirmados.has(id)
      ? "confirmado"
      : invitados.has(id)
        ? "invitado"
        : conTelegram
          ? "pendiente"
          : "sinTelegram";
    return { id, nombre: String(p?.fields[EQUIPO.nombre] ?? "Sin nombre"), estado };
  });
}

/** Resumen para la cabecera: eventos próximos sin team o con confirmaciones pendientes. */
export function resumenCoordinacion(regs: AirRecord[]) {
  const g = GALERIAS[TABLAS.clientes];
  const hoy = hoyISO();
  const proximos = regs.filter((r) => String(r.fields[String(g.fecha)] ?? "") >= hoy);
  const sinTeam = proximos.filter((r) => ids(r.fields[String(g.team)]).length === 0).length;
  const porConfirmar = proximos.reduce((n, r) => {
    const conf = new Set(ids(r.fields[C.clienteConfirmados]));
    return n + ids(r.fields[String(g.team)]).filter((id) => !conf.has(id)).length;
  }, 0);
  return { sinTeam, porConfirmar };
}
