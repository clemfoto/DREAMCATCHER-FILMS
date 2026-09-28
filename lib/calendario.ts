import "server-only";
import { getEsquema, getRegistros, type AirRecord } from "@/lib/airtable";
import type { Usuario } from "@/lib/auth";
import { campoPrincipal, nombresDe, puedeVerTabla, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { dinero, isoALocal, texto } from "@/lib/formato";
import { firmaCorta } from "@/lib/token";
import { AUTOMATIZACIONES, GALERIAS, TABLAS } from "@/config/galerias";

/** Todo lo que tiene fecha en la base, como una sola lista de eventos (calendario de la app y feed .ics). */

export type TipoEvento = "evento" | "lead" | "entrega" | "cita" | "tarea" | "pago";

export type EventoCal = {
  uid: string;
  tipo: TipoEvento;
  /** "YYYY-MM-DD" en la zona del negocio. */
  dia: string;
  /** ISO UTC si tiene hora (citas). */
  inicio?: string;
  hora?: string;
  titulo: string;
  detalle: string;
  href?: string;
};

export const TIPOS: Record<TipoEvento, { nombre: string; color: string }> = {
  evento: { nombre: "Eventos", color: "#4a565d" },
  lead: { nombre: "Leads", color: "#b7791f" },
  entrega: { nombre: "Entregas", color: "#55336a" },
  cita: { nombre: "Citas", color: "#274766" },
  tarea: { nombre: "Vencimientos", color: "#9a3b2e" },
  pago: { nombre: "Cobros", color: "#2f5226" },
};

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const esDia = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);

export async function eventosCalendario(u: Usuario): Promise<EventoCal[]> {
  const esquema = await getEsquema();
  const tabla = (id: string) => (puedeVerTabla(u, id) ? esquema.find((t) => t.id === id) : undefined);
  const leer = async (id: string) => (tabla(id) ? getRegistros(id) : ([] as AirRecord[]));
  const ruta = (id: string, rec: string) => {
    const t = tabla(id);
    return t ? `${rutaTabla(t)}/${rec}` : undefined;
  };
  const [clientes, leads, entregas, citas, tareas, pagos, nombresCliente, nombresEquipo] = await Promise.all([
    leer(TABLAS.clientes),
    leer(TABLAS.leads),
    leer(TABLAS.entrega),
    leer(TABLAS.citas),
    leer(TABLAS.tareas),
    leer(TABLAS.pagos),
    nombresDe(TABLAS.clientes),
    nombresDe(TABLAS.equipo),
  ]);
  const cliente = (v: unknown) => ids(v).map((id) => nombresCliente.get(id)).filter(Boolean).join(", ");
  const personas = (v: unknown) => ids(v).map((id) => nombresEquipo.get(id)).filter(Boolean).join(", ");
  const g = (t: string, k: string) => String(GALERIAS[t]?.[k] ?? "");
  const out: EventoCal[] = [];

  const gC = GALERIAS[TABLAS.clientes];
  for (const r of clientes) {
    const d = r.fields[String(gC.fecha)];
    if (!esDia(d) || AUTOMATIZACIONES.estadosClienteIgnorados.includes(texto(r.fields[String(gC.estado)]))) continue;
    out.push({
      uid: r.id,
      tipo: "evento",
      dia: d.slice(0, 10),
      titulo: texto(r.fields[String(gC.nombre)]) || "Evento",
      detalle: [texto(r.fields[String(gC.servicio)]), texto(r.fields[String(gC.venue)]), personas(r.fields[String(gC.team)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.clientes, r.id),
    });
  }

  const gL = GALERIAS[TABLAS.leads];
  for (const r of leads) {
    const d = r.fields[String(gL.fecha)];
    if (!esDia(d) || AUTOMATIZACIONES.estadosLeadCerrados.includes(texto(r.fields[String(gL.estado)]))) continue;
    out.push({
      uid: r.id,
      tipo: "lead",
      dia: d.slice(0, 10),
      titulo: `Lead: ${texto(r.fields["Nombre del Cliente"]) || "sin nombre"}`,
      detalle: [texto(r.fields[String(gL.servicio)]), texto(r.fields[String(gL.estado)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.leads, r.id),
    });
  }

  const gE = GALERIAS[TABLAS.entrega];
  for (const r of entregas) {
    const d = r.fields[String(gE.fecha)];
    if (!esDia(d)) continue;
    const status = (Array.isArray(r.fields[String(gE.status)]) ? (r.fields[String(gE.status)] as unknown[]) : []).map(texto);
    if (status.some((s) => AUTOMATIZACIONES.estadosEntregaHechos.includes(s))) continue;
    out.push({
      uid: r.id,
      tipo: "entrega",
      dia: d.slice(0, 10),
      titulo: `Entrega: ${cliente(r.fields[String(gE.cliente)]) || "sin cliente"}`,
      detalle: [status.join(", "), personas(r.fields[String(gE.responsable)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.entrega, r.id),
    });
  }

  const tCitas = tabla(TABLAS.citas);
  if (tCitas) {
    const principal = campoPrincipal(tCitas).name;
    for (const r of citas) {
      const iso = r.fields[g(TABLAS.citas, "fecha")];
      if (typeof iso !== "string" || !iso) continue;
      const local = esDia(iso) && iso.length === 10 ? iso : isoALocal(iso);
      if (!local) continue;
      out.push({
        uid: r.id,
        tipo: "cita",
        dia: local.slice(0, 10),
        inicio: iso.length > 10 ? iso : undefined,
        hora: local.length > 10 ? local.slice(11, 16) : undefined,
        titulo: textoPrincipal(r.fields[principal]) || "Cita",
        detalle: [cliente(r.fields[g(TABLAS.citas, "cliente")]), texto(r.fields[g(TABLAS.citas, "lugar")]), personas(r.fields[g(TABLAS.citas, "con")])]
          .filter(Boolean)
          .join(" · "),
        href: ruta(TABLAS.citas, r.id),
      });
    }
  }

  const gT = GALERIAS[TABLAS.tareas];
  for (const r of tareas) {
    const d = r.fields[String(gT.fecha)];
    if (!esDia(d) || (gT.estadosHechos as string[]).includes(texto(r.fields[String(gT.estado)]))) continue;
    out.push({
      uid: r.id,
      tipo: "tarea",
      dia: d.slice(0, 10),
      titulo: `Vence: ${texto(r.fields["Nombre de la Tarea"]) || "tarea"}`,
      detalle: [cliente(r.fields[String(gT.cliente)]), personas(r.fields[String(gT.responsables)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.tareas, r.id),
    });
  }

  const gP = GALERIAS[TABLAS.pagos];
  for (const r of pagos) {
    const d = r.fields[String(gP.fechaCobro)];
    if (!esDia(d) || r.fields[String(gP.pagado)] === true) continue;
    out.push({
      uid: r.id,
      tipo: "pago",
      dia: d.slice(0, 10),
      titulo: `Cobro: ${cliente(r.fields[String(gP.cliente)]) || texto(r.fields["Concepto"]) || "pago"}`,
      detalle: [texto(r.fields[String(gP.tipo)]), dinero(r.fields[String(gP.monto)], r.fields[String(gP.moneda)])].filter(Boolean).join(" · "),
      href: ruta(TABLAS.pagos, r.id),
    });
  }

  return out.sort((a, b) => (a.dia + (a.hora ?? "")).localeCompare(b.dia + (b.hora ?? "")));
}

/* ---------- suscripción (.ics) ---------- */

export const tokenCalendario = (equipoId: string) => `${equipoId}.${firmaCorta("calendario", equipoId)}`;

const escapar = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`);

/** Parte las líneas largas como pide el estándar (75 octetos). */
function plegar(linea: string): string {
  const partes: string[] = [];
  let actual = "";
  for (const c of linea) {
    if (Buffer.byteLength(actual + c) > 74) {
      partes.push(actual);
      actual = " " + c;
    } else actual += c;
  }
  partes.push(actual);
  return partes.join("\r\n");
}

const sinGuiones = (dia: string) => dia.replace(/-/g, "");
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function aIcs(eventos: EventoCal[], base: string, nombre: string): string {
  const ahora = utc(new Date());
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dreamcatcher Films//App//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapar(nombre)}`,
    "X-WR-TIMEZONE:America/Mexico_City",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const e of eventos) {
    lineas.push("BEGIN:VEVENT", `UID:${e.uid}-${e.tipo}@dreamcatcherfilms`, `DTSTAMP:${ahora}`);
    if (e.inicio) {
      const ini = new Date(e.inicio);
      lineas.push(`DTSTART:${utc(ini)}`, `DTEND:${utc(new Date(ini.getTime() + 3600_000))}`);
    } else {
      const fin = new Date(`${e.dia}T12:00:00Z`);
      fin.setUTCDate(fin.getUTCDate() + 1);
      lineas.push(`DTSTART;VALUE=DATE:${sinGuiones(e.dia)}`, `DTEND;VALUE=DATE:${sinGuiones(fin.toISOString().slice(0, 10))}`, "TRANSP:TRANSPARENT");
    }
    lineas.push(`SUMMARY:${escapar(e.titulo)}`, `CATEGORIES:${escapar(TIPOS[e.tipo].nombre)}`);
    if (e.detalle) lineas.push(`DESCRIPTION:${escapar(e.detalle)}`);
    if (e.href) lineas.push(`URL:${base}${e.href}`);
    lineas.push("END:VEVENT");
  }
  lineas.push("END:VCALENDAR");
  return lineas.map(plegar).join("\r\n") + "\r\n";
}
