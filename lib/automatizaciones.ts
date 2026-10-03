import "server-only";
import { revalidateTag } from "next/cache";
import {
  actualizarRegistro,
  crearRegistro,
  getEsquema,
  getRegistrosSinCache,
  tagTabla,
  type AirRecord,
} from "@/lib/airtable";
import { campoPrincipal, textoPrincipal } from "@/lib/esquema";
import { diasHasta, fecha, hoyISO, moneda, texto } from "@/lib/formato";
import { aNumero } from "@/lib/lista";
import { enviar, enviarAdmins, h } from "@/lib/telegram";
import { AUTOMATIZACIONES as A, DECISIONES, EQUIPO, GALERIAS, TABLAS, ZONA_HORARIA } from "@/config/galerias";

/*
 * Automatizaciones. Se ejecutan desde /api/automatizaciones (tareas programadas de Netlify)
 * y, para los clientes, también justo después de guardar desde la app.
 * Todas son idempotentes: se pueden ejecutar varias veces sin repetir avisos.
 */

const C = A.campos;
const gCli = GALERIAS[TABLAS.clientes];
const gEnt = GALERIAS[TABLAS.entrega];
const gLead = GALERIAS[TABLAS.leads];
const gGas = GALERIAS[TABLAS.gastos];

/** Dinero sin decimales para los mensajes. */
const dinero = (n: unknown) => moneda(n, { id: "", name: "", type: "currency", options: { symbol: "$", precision: 0 } });

const invalidar = (...tablas: string[]) => {
  for (const t of tablas) {
    try {
      revalidateTag(tagTabla(t), { expire: 0 });
    } catch {}
  }
};

const ids = (v: unknown) => (Array.isArray(v) ? (v as string[]) : []);
const str = (clave: unknown) => String(clave);

export function sumarDias(iso: string, dias: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-26T18:42:26.000Z" → "2026-09-26" en la zona del negocio. */
const fechaLocal = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date(iso));

type Persona = { id: string; nombre: string; chatId: string };

async function equipo(): Promise<Map<string, Persona>> {
  const regs = await getRegistrosSinCache(EQUIPO.tabla);
  return new Map(
    regs.map((r) => [
      r.id,
      {
        id: r.id,
        nombre: String(r.fields[EQUIPO.nombre] ?? "Sin nombre"),
        chatId: String(r.fields[C.telegramChatId] ?? "").trim(),
      },
    ]),
  );
}

const nombres = (lista: string[], personas: Map<string, Persona>) =>
  lista.map((id) => personas.get(id)?.nombre ?? "?").join(", ") || "—";

const nombreCliente = (r: AirRecord) => textoPrincipal(r.fields[str(gCli.nombre)]) || "Sin nombre";

/* ------------------------------------------------------------------ */
/* 1. Nuevos clientes: aviso a admins, invitaciones y entrega a 3 días    */
/* ------------------------------------------------------------------ */

export async function procesarClientes(base: string): Promise<string[]> {
  const log: string[] = [];
  const [clientes, personas] = await Promise.all([getRegistrosSinCache(TABLAS.clientes), equipo()]);
  const hoy = hoyISO();
  let entregasCreadas = false;

  for (const r of clientes) {
    const f = r.fields;
    const estado = texto(f[str(gCli.estado)]);
    if (A.estadosClienteIgnorados.includes(estado)) continue;
    const nombre = nombreCliente(r);
    const fechaEvento = typeof f[str(gCli.fecha)] === "string" ? String(f[str(gCli.fecha)]) : "";
    const team = ids(f[str(gCli.team)]);
    const cambios: Record<string, unknown> = {};

    // Aviso al grupo de administradores (una sola vez por cliente).
    if (f[C.clienteNotificado] !== true) {
      const sinTelegram = team.filter((id) => !personas.get(id)?.chatId).map((id) => personas.get(id)?.nombre ?? "?");
      const precio = dinero(f[str(gCli.precio)]);
      const ok = await enviarAdmins(
        [
          `🎬 <b>Nuevo cliente: ${h(nombre)}</b>`,
          `📅 ${h(fecha(fechaEvento) || "Sin fecha")}`,
          `📍 ${h(texto(f[str(gCli.venue)]) || "Sin venue")}`,
          `💰 ${h(precio || "Sin precio")}`,
          `👥 ${h(nombres(team, personas))}`,
          f[C.clienteSolicitudes] ? `📝 ${h(texto(f[C.clienteSolicitudes]))}` : "",
          sinTelegram.length ? `\n⚠️ Sin Telegram conectado: ${h(sinTelegram.join(", "))}` : "",
          `\n<a href="${base}/t/clientes/${r.id}">Abrir en la app</a>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      if (ok) {
        cambios[C.clienteNotificado] = true;
        log.push(`Aviso de nuevo cliente: ${nombre}`);
      }

      // Entrega automática: 9 semanas después del evento.
      if (fechaEvento && ids(f[C.clienteEntrega]).length === 0) {
        await crearRegistro(TABLAS.entrega, {
          [str(gEnt.cliente)]: [r.id],
          [str(gEnt.fecha)]: sumarDias(fechaEvento, A.diasEntrega),
          [str(gEnt.status)]: [A.estadoEntregaInicial],
        });
        entregasCreadas = true;
        log.push(`Entrega creada para ${nombre}`);
      }
    }

    // Invitaciones a los team members (solo eventos futuros, una vez por persona).
    if (fechaEvento && fechaEvento >= hoy) {
      const invitados = ids(f[C.clienteInvitados]);
      const confirmados = ids(f[C.clienteConfirmados]);
      const nuevos: string[] = [];
      for (const id of team) {
        if (invitados.includes(id) || confirmados.includes(id)) continue;
        const p = personas.get(id);
        if (!p?.chatId) continue; // se le invitará cuando conecte Telegram
        const ok = await enviar(
          p.chatId,
          [
            `Hola ${h(p.nombre.split(" ")[0])} 👋`,
            `Estás en el equipo de <b>${h(nombre)}</b>`,
            `📅 ${h(fecha(fechaEvento))}`,
            `📍 ${h(texto(f[str(gCli.venue)]) || "Venue por confirmar")}`,
            ``,
            `¿Confirmas tu presencia? Toca el botón o responde <b>confirmo</b>.`,
          ].join("\n"),
          [{ texto: "✅ Confirmo mi presencia", datos: `c:${r.id}` }],
        );
        if (ok) nuevos.push(id);
      }
      if (nuevos.length) {
        cambios[C.clienteInvitados] = [...invitados, ...nuevos];
        log.push(`Invitaciones (${nombre}): ${nombres(nuevos, personas)}`);
      }
    }

    if (Object.keys(cambios).length) await actualizarRegistro(TABLAS.clientes, r.id, cambios);
  }

  invalidar(TABLAS.clientes, EQUIPO.tabla, ...(entregasCreadas ? [TABLAS.entrega] : []));
  return log;
}

/** Si cambia la fecha del evento, mueve las entregas pendientes a N días después (AUTOMATIZACIONES.diasEntrega). */
export async function moverEntregas(clienteId: string, fechaEvento: string): Promise<void> {
  const entregas = await getRegistrosSinCache(TABLAS.entrega);
  const nueva = sumarDias(fechaEvento, A.diasEntrega);
  for (const e of entregas) {
    if (!ids(e.fields[str(gEnt.cliente)]).includes(clienteId)) continue;
    const status = ids(e.fields[str(gEnt.status)]).map(texto);
    if (status.some((s) => A.estadosEntregaHechos.includes(s))) continue;
    if (e.fields[str(gEnt.fecha)] === nueva) continue;
    await actualizarRegistro(TABLAS.entrega, e.id, { [str(gEnt.fecha)]: nueva, [C.entregaRecordatorio]: false });
  }
  invalidar(TABLAS.entrega);
}

/* ------------------------------------------------------------------ */
/* 2. Confirmación de presencia desde Telegram                          */
/* ------------------------------------------------------------------ */

export async function personaPorChat(chatId: string): Promise<Persona | null> {
  for (const p of (await equipo()).values()) if (p.chatId === chatId) return p;
  return null;
}

/** Marca a la persona como confirmada en el cliente y avisa a los administradores. */
export async function confirmarPresencia(persona: Persona, clienteId: string): Promise<string> {
  const clientes = await getRegistrosSinCache(TABLAS.clientes);
  const r = clientes.find((x) => x.id === clienteId);
  if (!r) return "No encontré ese evento.";
  const nombre = nombreCliente(r);
  if (!ids(r.fields[str(gCli.team)]).includes(persona.id)) return `No estás en el equipo de ${nombre}.`;
  const confirmados = ids(r.fields[C.clienteConfirmados]);
  if (confirmados.includes(persona.id)) return `Ya tenías confirmado ${nombre}. ¡Gracias!`;

  await actualizarRegistro(TABLAS.clientes, r.id, { [C.clienteConfirmados]: [...confirmados, persona.id] });
  invalidar(TABLAS.clientes, EQUIPO.tabla);
  await enviarAdmins(
    `✅ <b>${h(persona.nombre)}</b> confirmó su presencia en <b>${h(nombre)}</b> (${h(fecha(r.fields[str(gCli.fecha)]))}).`,
  );
  return `¡Listo! Confirmaste tu presencia en ${nombre}. 🙌`;
}

/** Eventos futuros a los que la persona fue invitada y aún no confirmó. */
export async function pendientesDeConfirmar(persona: Persona): Promise<AirRecord[]> {
  const hoy = hoyISO();
  return (await getRegistrosSinCache(TABLAS.clientes)).filter((r) => {
    const f = r.fields;
    return (
      ids(f[str(gCli.team)]).includes(persona.id) &&
      !ids(f[C.clienteConfirmados]).includes(persona.id) &&
      String(f[str(gCli.fecha)] ?? "") >= hoy
    );
  });
}

export const etiquetaEvento = (r: AirRecord) => `${nombreCliente(r)} · ${fecha(r.fields[str(gCli.fecha)])}`;

/* ------------------------------------------------------------------ */
/* 3. Recordatorio de entrega el día después del evento                 */
/* ------------------------------------------------------------------ */

export async function recordatoriosEntrega(): Promise<string[]> {
  const log: string[] = [];
  const [entregas, clientes, personas] = await Promise.all([
    getRegistrosSinCache(TABLAS.entrega),
    getRegistrosSinCache(TABLAS.clientes),
    equipo(),
  ]);
  for (const e of entregas) {
    const f = e.fields;
    if (f[C.entregaRecordatorio] === true) continue;
    const status = ids(f[str(gEnt.status)]).map(texto);
    if (status.some((s) => A.estadosEntregaHechos.includes(s))) continue;
    const cliente = clientes.find((c) => ids(f[str(gEnt.cliente)]).includes(c.id));
    // Toca N días después del evento; sin cliente enlazado, se cuenta hacia atrás desde la entrega.
    const fechaEvento = cliente ? String(cliente.fields[str(gCli.fecha)] ?? "") : "";
    const referencia = fechaEvento
      ? sumarDias(fechaEvento, A.diasRecordatorioEntrega)
      : typeof f[str(gEnt.fecha)] === "string"
        ? sumarDias(String(f[str(gEnt.fecha)]), A.diasRecordatorioEntrega - A.diasEntrega)
        : "";
    const atraso = -(diasHasta(referencia) ?? 1); // 0 = hoy toca; se recupera hasta 2 días si falló la tarea
    if (!referencia || atraso < 0 || atraso > 2) continue;

    const nombre = cliente ? nombreCliente(cliente) : textoPrincipal(f["NOMBRE DEL CLIENTE"]) || "un cliente";
    const d = diasHasta(f[str(gEnt.fecha)]);
    const cuando = d == null ? "" : d === 0 ? " (hoy)" : d === 1 ? " (mañana)" : d > 1 ? ` (en ${d} días)` : ` (hace ${-d} días)`;
    const msg = [
      `⏰ <b>Recordatorio de entrega: ${h(nombre)}</b>`,
      fechaEvento ? `🎬 Evento: ${h(fecha(fechaEvento))}` : "",
      `📦 Entrega: ${h(fecha(f[str(gEnt.fecha)]) || "sin fecha")}${cuando}`,
    ]
      .filter(Boolean)
      .join("\n");

    const responsables = ids(f[str(gEnt.responsable)]).map((id) => personas.get(id)).filter(Boolean) as Persona[];
    let enviado = false;
    for (const p of responsables) if (p.chatId) enviado = (await enviar(p.chatId, msg)) || enviado;
    if (!enviado) {
      enviado = await enviarAdmins(
        `${msg}\n⚠️ ${responsables.length ? `${h(nombres(responsables.map((p) => p.id), personas))} no tiene Telegram conectado.` : "No hay responsable de entrega asignado."}`,
      );
    }
    if (enviado) {
      await actualizarRegistro(TABLAS.entrega, e.id, { [C.entregaRecordatorio]: true });
      log.push(`Recordatorio de entrega: ${nombre}`);
    }
  }
  if (log.length) invalidar(TABLAS.entrega);
  return log;
}

/* ------------------------------------------------------------------ */
/* 4. Seguimiento de leads: 1º, 2º, 3º y 4º contacto                     */
/* ------------------------------------------------------------------ */

const ORDINAL = ["1º", "2º", "3º", "4º"];

/** Hora actual (0–23) en la zona del negocio. */
const horaLocal = () =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA_HORARIA, hour: "numeric", hourCycle: "h23" }).format(new Date()));

/**
 * Cada lead abierto avanza paso a paso:
 *  - 1º contacto: aviso en cuanto entra el lead.
 *  - 2º, 3º y 4º: aviso N días (diasEntreContactos) después de apuntar el contacto anterior
 *    (Airtable guarda la hora en "Último contacto").
 * Un aviso por paso ("Recordatorios enviados" = último contacto avisado) y solo en horario de día.
 */
export async function recordatoriosLeads(base: string, forzar = false): Promise<string[]> {
  const log: string[] = [];
  const hora = horaLocal();
  if (!forzar && (hora < A.horarioAvisos.desde || hora >= A.horarioAvisos.hasta)) return log;

  const [leads, personas] = await Promise.all([getRegistrosSinCache(TABLAS.leads), equipo()]);
  const contactos = (gLead.contactos as string[]) ?? [];
  const principal = campoPrincipal((await getEsquema()).find((t) => t.id === TABLAS.leads)!);
  const ahora = Date.now();

  for (const r of leads) {
    const f = r.fields;
    if (A.estadosLeadCerrados.includes(texto(f[str(gLead.estado)]))) continue;
    if (ids(f[str(gLead.clienteRelacionado)]).length) continue; // ya es cliente

    // Contactos hechos en orden (el primero vacío marca el siguiente paso).
    const primeroVacio = contactos.findIndex((c) => ids(f[c]).length === 0);
    const hechos = primeroVacio === -1 ? contactos.length : primeroVacio;
    if (hechos >= contactos.length) continue;
    const siguiente = hechos + 1; // 1..4
    if (aNumero(f[C.leadRecordatorios]) >= siguiente) continue;

    const desde = hechos === 0 ? r.createdTime : String(f[C.leadUltimoContacto] ?? r.createdTime);
    const espera = hechos === 0 ? 0 : A.diasEntreContactos * 86_400_000;
    if (ahora - Date.parse(desde) < espera) continue;

    const nombre = textoPrincipal(f[principal.name]) || "Lead sin nombre";
    const pasos = contactos
      .map((c, i) => {
        const quien = ids(f[c]);
        return quien.length ? `✅ ${ORDINAL[i]}: ${h(nombres(quien, personas))}` : `${i === hechos ? "👉" : "⬜"} ${ORDINAL[i]}`;
      })
      .join("\n");
    const ok = await enviarAdmins(
      [
        hechos === 0
          ? `🆕 <b>Nuevo lead: ${h(nombre)}</b>\nToca el <b>1er contacto</b>.`
          : `📞 <b>${h(nombre)}</b>: toca el <b>${ORDINAL[hechos]} contacto</b>`,
        f[str(gLead.fecha)] ? `📅 Evento: ${h(fecha(f[str(gLead.fecha)]))}` : "",
        f[str(gLead.servicio)] ? `🎥 ${h(texto(f[str(gLead.servicio)]))}` : "",
        hechos > 0 ? `Último contacto: ${h(fecha(desde, true))}` : "",
        ``,
        pasos,
        ``,
        `Al hacerlo, apúntalo en el lead: ${ORDINAL[hechos]} contacto → quién lo hizo.`,
        `<a href="${base}/t/leads/${r.id}">Abrir lead</a>`,
      ]
        .filter((x, i, arr) => x !== "" || (i > 0 && arr[i - 1] !== ""))
        .join("\n"),
    );
    if (!ok) continue;
    await actualizarRegistro(TABLAS.leads, r.id, { [C.leadRecordatorios]: siguiente });
    log.push(`Lead ${nombre}: aviso del ${ORDINAL[hechos]} contacto`);
  }
  if (log.length) invalidar(TABLAS.leads);
  return log;
}

/* ------------------------------------------------------------------ */
/* 5. Informe contable cada 2 días y cierre del mes el día 1            */
/* ------------------------------------------------------------------ */

/** Mes actual, "YYYY-MM". */
export const mesActual = () => hoyISO().slice(0, 7);

/** Mes anterior al actual, "YYYY-MM". */
export function mesAnterior(): string {
  const [y, m] = hoyISO().split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

const nombreMes = (mes: string) =>
  new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(new Date(`${mes}-15T12:00:00Z`));

/** ¿Toca hoy el informe contable? Cada N días (por número de día, estable entre meses), nunca el día 1. */
export function tocaInformeContable(hoy = hoyISO()): boolean {
  if (hoy.endsWith("-01")) return false; // el día 1 ya llega el cierre del mes anterior
  const dia = Math.floor(Date.parse(`${hoy}T12:00:00Z`) / 86_400_000);
  return dia % A.diasInformeContable === 0;
}

/**
 * Informe contable de seguimiento (cada 2 días): no es un cierre, sino el estado de hoy.
 * Qué falta cobrar, qué balances vencieron o vencen pronto, qué entró y qué se gastó
 * desde el último informe y qué gastos esperan aprobación.
 */
export async function informeContable(): Promise<string[]> {
  const [conta, gastos, esquema, personas] = await Promise.all([
    getRegistrosSinCache(TABLAS.contabilidad),
    getRegistrosSinCache(TABLAS.gastos),
    getEsquema(),
    equipo(),
  ]);
  const hoy = hoyISO();
  const desde = sumarDias(hoy, -A.diasInformeContable + 1); // periodo desde el último informe (incluye hoy)
  const hasta = sumarDias(hoy, A.diasProximosBalances);
  const $ = (n: number) => dinero(n) || "$0";
  const entre = (v: unknown, a: string, b: string) => typeof v === "string" && v.slice(0, 10) >= a && v.slice(0, 10) <= b;
  const tContab = esquema.find((t) => t.id === TABLAS.contabilidad);
  const nombreConta = (r: AirRecord) =>
    (tContab ? textoPrincipal(r.fields[campoPrincipal(tContab).name]) : "") || "Sin cliente";

  const conSaldo = conta
    .map((r) => ({ r, saldo: Math.max(0, aNumero(r.fields[C.contaPendiente])), fb: String(r.fields[C.contaFechaBalance] ?? "") }))
    .filter((x) => x.saldo > 0);
  const pendiente = conSaldo.reduce((s, x) => s + x.saldo, 0);
  const vencidos = conSaldo.filter((x) => x.fb && x.fb < hoy).sort((a, b) => a.fb.localeCompare(b.fb));
  const proximos = conSaldo.filter((x) => x.fb && x.fb >= hoy && x.fb <= hasta).sort((a, b) => a.fb.localeCompare(b.fb));

  const depositos = conta.filter((r) => entre(r.fields[C.contaFechaDeposito], desde, hoy));
  const cobrado = depositos.reduce((s, r) => s + aNumero(r.fields[C.contaDeposito]), 0);

  const vivos = gastos.filter((r) => texto(r.fields[str(gGas.aprobacion)]) !== DECISIONES.rechazado);
  const gastosRecientes = vivos.filter((r) => entre(r.fields[str(gGas.fecha)], desde, hoy));
  const gastado = gastosRecientes.reduce((s, r) => s + aNumero(r.fields[str(gGas.monto)]), 0);
  const porAprobar = gastos.filter((r) => texto(r.fields[str(gGas.aprobacion)]) === DECISIONES.aprobacionPendiente);

  const mes = mesActual();
  const ingresosMes = conta
    .filter((r) => entre(r.fields[C.contaFechaDeposito], `${mes}-01`, hoy))
    .reduce((s, r) => s + aNumero(r.fields[C.contaDeposito]), 0);
  const gastosMes = vivos
    .filter((r) => entre(r.fields[str(gGas.fecha)], `${mes}-01`, hoy))
    .reduce((s, r) => s + aNumero(r.fields[str(gGas.monto)]), 0);

  const linea = (x: { r: AirRecord; saldo: number; fb: string }) => `  ${nombreConta(x.r)} · ${$(x.saldo)} · ${fecha(x.fb)}`;
  const gasto = (r: AirRecord) =>
    `  ${textoPrincipal(r.fields["GASTOS"]) || texto(r.fields[str(gGas.categoria)]) || "Gasto"} · ${$(aNumero(r.fields[str(gGas.monto)]))}` +
    (ids(r.fields[str(gGas.pagador)]).length ? ` · ${nombres(ids(r.fields[str(gGas.pagador)]), personas)}` : "");
  const periodo = desde === hoy ? "hoy" : `desde el ${fecha(desde)}`;

  const detalle = [
    `POR COBRAR ${$(pendiente)} (${conSaldo.length} clientes)`,
    vencidos.length ? `\n⚠️ Balances vencidos (${vencidos.length})` : "",
    ...vencidos.map(linea),
    proximos.length ? `\n📅 Balances en los próximos ${A.diasProximosBalances} días (${proximos.length})` : "",
    ...proximos.map(linea),
    `\n💵 Cobrado ${periodo}: ${$(cobrado)}${depositos.length ? ` (${depositos.length} depósitos)` : ""}`,
    ...depositos.map((r) => `  ${nombreConta(r)} · ${$(aNumero(r.fields[C.contaDeposito]))}`),
    `\n🧾 Gastado ${periodo}: ${$(gastado)}${gastosRecientes.length ? ` (${gastosRecientes.length})` : ""}`,
    ...gastosRecientes.map(gasto),
    porAprobar.length ? `\n⏳ Gastos por aprobar (${porAprobar.length})` : "",
    ...porAprobar.map(gasto),
    `\nEn lo que va de ${nombreMes(mes)}: cobrado ${$(ingresosMes)} · gastado ${$(gastosMes)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const ok = await enviarAdmins(`📊 <b>Informe contable · ${h(fecha(hoy))}</b>\n\n<pre>${h(detalle)}</pre>`);
  return [ok ? `Informe contable del ${fecha(hoy)} enviado por Telegram.` : "⚠️ No se pudo enviar el informe contable."];
}

/** Cierre del mes por Telegram al grupo de administradores (tarea programada del día 1). */
export async function informeMensual(mes = mesAnterior()): Promise<string[]> {
  const [conta, gastos, clientes] = await Promise.all([
    getRegistrosSinCache(TABLAS.contabilidad),
    getRegistrosSinCache(TABLAS.gastos),
    getRegistrosSinCache(TABLAS.clientes),
  ]);
  const enMes = (v: unknown) => typeof v === "string" && v.startsWith(mes);
  const $ = (n: number) => dinero(n) || "$0";

  // Ingresos: depósitos y balances de Contabilidad con fecha en el mes.
  const depositos = conta.filter((r) => enMes(r.fields[C.contaFechaDeposito]));
  const totalDepositos = depositos.reduce((s, r) => s + aNumero(r.fields[C.contaDeposito]), 0);
  const balances = conta.filter((r) => enMes(r.fields[C.contaFechaBalance]));
  const totalBalances = balances.reduce(
    (s, r) => s + Math.max(0, aNumero(r.fields[C.contaTotal]) - aNumero(r.fields[C.contaDeposito])),
    0,
  );
  const ingresos = totalDepositos + totalBalances;
  const pendiente = conta.reduce((s, r) => s + Math.max(0, aNumero(r.fields[C.contaPendiente])), 0);

  // Los gastos rechazados no cuentan.
  const gastosMes = gastos.filter(
    (r) => enMes(r.fields[str(gGas.fecha)]) && texto(r.fields[str(gGas.aprobacion)]) !== DECISIONES.rechazado,
  );
  const totalGastos = gastosMes.reduce((s, r) => s + aNumero(r.fields[str(gGas.monto)]), 0);
  const porCategoria = new Map<string, number>();
  for (const r of gastosMes) {
    const cat = texto(r.fields[str(gGas.categoria)]) || "Sin categoría";
    porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + aNumero(r.fields[str(gGas.monto)]));
  }

  const eventos = clientes.filter(
    (r) => enMes(r.fields[str(gCli.fecha)]) && !A.estadosClienteIgnorados.includes(texto(r.fields[str(gCli.estado)])),
  );
  const facturado = eventos.reduce((s, r) => s + aNumero(r.fields[str(gCli.precio)]), 0);
  const resultado = ingresos - totalGastos;

  const detalle = [
    `INGRESOS ${$(ingresos)}`,
    `  Depósitos cobrados (${depositos.length}): ${$(totalDepositos)}`,
    `  Balances con fecha en el mes (${balances.length}): ${$(totalBalances)}`,
    ``,
    `GASTOS ${$(totalGastos)} (${gastosMes.length} movimientos)`,
    ...[...porCategoria.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => `  ${c}: ${$(n)}`),
    ``,
    `RESULTADO ${$(resultado)}`,
    ``,
    `Eventos del mes: ${eventos.length} (facturación ${$(facturado)})`,
    ...eventos.map((r) => `  ${nombreCliente(r)} · ${fecha(r.fields[str(gCli.fecha)])}`),
    ``,
    `Pendiente de cobro total a hoy: ${$(pendiente)}`,
  ].join("\n");

  const titulo = nombreMes(mes);
  const ok = await enviarAdmins(`📊 <b>Cierre del mes · ${h(titulo)}</b>\n\n<pre>${h(detalle)}</pre>`);
  return [ok ? `Cierre de ${titulo} enviado por Telegram.` : `⚠️ No se pudo enviar el cierre de ${titulo}.`];
}
