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
/* 4. Recordatorios de contacto de leads (2º, 3º y 4º contacto)         */
/* ------------------------------------------------------------------ */

export async function recordatoriosLeads(base: string): Promise<string[]> {
  const log: string[] = [];
  const [leads, personas] = await Promise.all([getRegistrosSinCache(TABLAS.leads), equipo()]);
  const contactos = (gLead.contactos as string[]) ?? [];
  const principal = campoPrincipal((await getEsquema()).find((t) => t.id === TABLAS.leads)!);

  for (const r of leads) {
    const f = r.fields;
    if (A.estadosLeadCerrados.includes(texto(f[str(gLead.estado)]))) continue;
    const dias = -(diasHasta(fechaLocal(r.createdTime)) ?? 0);
    const paso = Math.min(contactos.length - 1, Math.floor(dias / A.diasEntreContactos)); // 1 = toca el 2º contacto
    const enviados = aNumero(f[C.leadRecordatorios]);
    if (paso < 1 || paso <= enviados) continue;

    const nombre = textoPrincipal(f[principal.name]) || "Lead sin nombre";
    const siguiente = contactos[paso];
    if (ids(f[siguiente]).length === 0) {
      const hechos = contactos
        .slice(0, paso)
        .map((c, i) => `${i + 1}º: ${ids(f[c]).length ? h(nombres(ids(f[c]), personas)) : "—"}`)
        .join(" · ");
      await enviarAdmins(
        [
          `📞 <b>Toca el ${paso + 1}º contacto</b> con <b>${h(nombre)}</b>`,
          `Ingresó hace ${dias} días (${h(fecha(fechaLocal(r.createdTime)))}).`,
          f[str(gLead.servicio)] ? `🎥 ${h(texto(f[str(gLead.servicio)]))}` : "",
          hechos,
          `<a href="${base}/t/leads/${r.id}">Abrir lead</a>`,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      log.push(`Recordatorio ${paso + 1}º contacto: ${nombre}`);
    }
    await actualizarRegistro(TABLAS.leads, r.id, { [C.leadRecordatorios]: paso });
  }
  if (log.length) invalidar(TABLAS.leads);
  return log;
}

/* ------------------------------------------------------------------ */
/* 5. Informe contable: cada 2 días (mes en curso) y cierre el día 1    */
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
 * Informe contable por Telegram al grupo de administradores.
 * Sin parámetros: cierre del mes anterior (día 1). Con el mes en curso: avance hasta hoy (cada 2 días).
 */
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

  const enCurso = hoyISO().startsWith(mes);
  const titulo = enCurso ? `${nombreMes(mes)} (hasta hoy, ${fecha(hoyISO())})` : nombreMes(mes);
  const ok = await enviarAdmins(`📊 <b>Informe contable · ${h(titulo)}</b>\n\n<pre>${h(detalle)}</pre>`);
  return [ok ? `Informe de ${titulo} enviado por Telegram.` : `⚠️ No se pudo enviar el informe de ${titulo}.`];
}
