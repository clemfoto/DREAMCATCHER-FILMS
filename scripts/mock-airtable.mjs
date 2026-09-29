// Servidor falso de Airtable para desarrollo local (npm run dev:mock).
// Imita el esquema real de la base con datos inventados; los cambios viven en memoria.
import http from "node:http";
import { randomBytes, scryptSync } from "node:crypto";

// Misma forma que lib/clave.ts: "scrypt$sal$hash".
const cifrar = (clave) => {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("base64url")}$${scryptSync(clave, sal, 32).toString("base64url")}`;
};

const PUERTO = 4010;
let n = 0;
const id = (p) => `${p}${String(++n).padStart(14, "0").replace(/^0/, "M")}`.slice(0, 17);
const ch = (...nombres) => ({ choices: nombres.map((name) => ({ id: id("sel"), name, color: "blueLight2" })) });
const link = (linkedTableId, inverseLinkFieldId) => ({ linkedTableId, inverseLinkFieldId, prefersSingleRecordLink: false });
const cur = { symbol: "$", precision: 0 };

const T = {
  clientes: "tblzsfM8s8Grq2lwU",
  tareas: "tblI4mNizr3Xwgoa6",
  entrega: "tbl29U9MasLnSPMBj",
  leads: "tblnZCa7gevintf0n",
  conta: "tbl4d283L3x8TVLzy",
  gastos: "tbl5kqfH0Fh7OhSu9",
  equipo: "tblWfnNYeXrB95dQC",
};

// [id, nombre, tipo, opciones]
const esquema = {
  [T.clientes]: ["Clientes", [
    ["fldCliNombre0000", "Nombre del Cliente", "singleLineText"],
    ["fldCliFecha00000", "Fecha del Evento", "date"],
    ["fldCliServicio00", "Tipo de Servicio", "singleSelect", ch("Boda", "Cumpleaños", "Corporativo", "Promocional", "Otro", "Conferencia", "Graduación")],
    ["fldCliIngAnt0000", "Ingresado Por (antiguo)", "multipleCollaborators"],
    ["fldCliVenue00000", "Venue", "singleLineText"],
    ["fldCliPrecio0000", "Precio", "currency", cur],
    ["fldCliEstado0000", "Estado del Cliente", "singleSelect", ch("Prospecto", "Activa", "En Proceso", "Finalizado", "Pendiente de Pago", "Confirmado", "Pendiente", "Cancelado")],
    ["fldCliArchivos00", "Archivos Adjuntos", "multipleAttachments"],
    ["fldCliSolicitud0", "Solicitudes Especiales", "multilineText"],
    ["fldCliNotas00000", "Notas de Seguimiento", "multilineText"],
    ["fldCliPrioridad0", "Prioridad", "singleSelect", ch("Alta", "Media", "Baja")],
    ["fldCliTareas0000", "Tareas", "multipleRecordLinks", link(T.tareas, "fldTarCliente000")],
    ["fldCliEntrega000", "Entrega", "multipleRecordLinks", link(T.entrega, "fldEntCliente000")],
    ["fldCliLeads00000", "Leads", "multipleRecordLinks", link(T.leads, "fldLeaCliente000")],
    ["fldCliIngresado0", "Ingresado Por", "multipleRecordLinks", link(T.equipo, "fldEquClientes00")],
    ["fldCliTeam000000", "Team Members", "multipleRecordLinks", link(T.equipo, "fldEquEventos000")],
    ["fldCliConta00000", "Contabilidad", "multipleRecordLinks", link(T.conta, "fldConCliente000")],
    ["fldCliGastos0000", "Gastos", "multipleRecordLinks", link(T.gastos, "fldGasCliente000")],
    ["fldCliConfirm000", "Confirmados", "multipleRecordLinks", link(T.equipo, "fldEquConfirm000")],
    ["fldCliInvitad000", "Invitados Telegram", "multipleRecordLinks", link(T.equipo, "fldEquInvitad000")],
    ["fldCliNotific000", "Notificado", "checkbox"],
  ]],
  [T.tareas]: ["Tareas", [
    ["fldTarNombre0000", "Nombre de la Tarea", "singleLineText"],
    ["fldTarCliente000", "Cliente Asociado", "multipleRecordLinks", link(T.clientes, "fldCliTareas0000")],
    ["fldTarDesc000000", "Descripción", "multilineText"],
    ["fldTarFecha00000", "Fecha Límite", "date"],
    ["fldTarEstado0000", "Estado de Tarea", "singleSelect", ch("Por Hacer", "En Proceso", "Completa", "En Revisión", "En progreso", "Pendiente", "Completada")],
    ["fldTarPrioridad0", "Prioridad", "singleSelect", ch("Alta", "Media", "Baja")],
    ["fldTarResp000000", "Responsables", "multipleRecordLinks", link(T.equipo, "fldEquTareas0000")],
  ]],
  [T.entrega]: ["Entrega", [
    ["fldEntNombre0000", "NOMBRE DEL CLIENTE", "formula", { result: { type: "singleLineText" } }],
    ["fldEntFecha00000", "Fecha de Entrega", "date"],
    ["fldEntStatus0000", "Status Entrega", "multipleSelects", ch("Pendiente", "Enviado", "Revisando Cambios", "Finalizado", "Entregado", "En revisión", "Aprobada")],
    ["fldEntCambios000", "Cambios Deseados", "multilineText"],
    ["fldEntLink000000", "Link de Entrega", "url"],
    ["fldEntArchivos00", "Archivos Entregados", "multipleAttachments"],
    ["fldEntCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliEntrega000")],
    ["fldEntResp000000", "Responsable Entrega", "multipleRecordLinks", link(T.equipo, "fldEquEntregas00")],
    ["fldEntRecord0000", "Recordatorio enviado", "checkbox"],
  ]],
  [T.leads]: ["Leads", [
    ["fldLeaNombre0000", "Nombre del Cliente", "singleLineText"],
    ["fldLeaFecha00000", "Fecha del Evento", "date"],
    ["fldLeaServicio00", "Servicio Requerido", "singleSelect", ch("Boda", "Cumpleaños", "Corporativo", "Promocional", "Otro", "Fotografía")],
    ["fldLeaEstado0000", "Estado Lead", "singleSelect", ch("Nuevo", "Contactado", "En seguimiento", "En Negociación", "Ganado", "Perdido")],
    ["fldLeaNotas00000", "Notas de Lead", "multilineText"],
    ["fldLeaCliente000", "Relacionado a Cliente", "multipleRecordLinks", link(T.clientes, "fldCliLeads00000")],
    ["fldLeaC10000000", "1er Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL100000000")],
    ["fldLeaC20000000", "2do Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL200000000")],
    ["fldLeaC30000000", "3er Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL300000000")],
    ["fldLeaC40000000", "4to Contacto", "multipleRecordLinks", link(T.equipo, "fldEquL400000000")],
    ["fldLeaRecord0000", "Recordatorios enviados", "number", { precision: 0 }],
  ]],
  [T.conta]: ["Contabilidad", [
    ["fldConNombre0000", "NOMBRE DEL CLIENTE", "formula", { result: { type: "singleLineText" } }],
    ["fldConFechaDep00", "Fecha Depósito", "date"],
    ["fldConDeposito00", "DEPOSITO", "currency", cur],
    ["fldConFechaBal00", "Fecha Balance", "date"],
    ["fldConPendAnt000", "Monto Pendiente (antiguo)", "currency", cur],
    ["fldConNotas00000", "Notas Contables", "multilineText"],
    ["fldConCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliConta00000")],
    ["fldConTotal00000", "Monto Total", "rollup", { result: { type: "currency", options: cur } }],
    ["fldConPendiente0", "Monto Pendiente", "formula", { result: { type: "currency", options: cur } }],
  ]],
  [T.gastos]: ["GASTOS", [
    ["fldGasNombre0000", "GASTOS", "singleLineText"],
    ["fldGasFecha00000", "Fecha", "date"],
    ["fldGasCantidad00", "Cantidad", "currency", cur],
    ["fldGasForma00000", "Forma de Pago", "singleSelect", ch("Efectivo", "Transferencia", "Tarjeta", "Otro")],
    ["fldGasCategoria0", "Categoría", "singleSelect", ch("Equipo y material", "Software y suscripciones", "Transporte", "Comida", "Pago a colaboradores", "Otros")],
    ["fldGasComprob000", "Comprobante", "multipleAttachments"],
    ["fldGasCliente000", "Cliente", "multipleRecordLinks", link(T.clientes, "fldCliGastos0000")],
    ["fldGasPagador000", "Persona que hizo el pago", "multipleRecordLinks", link(T.equipo, "fldEquGastos0000")],
    ["fldGasAprobac000", "Aprobación", "singleSelect", ch("Pendiente", "Aprobado", "Rechazado")],
    ["fldGasAprobPor00", "Aprobado por", "multipleRecordLinks", link(T.equipo, "fldEquGasAprob00")],
  ]],
  [T.equipo]: ["Equipo", [
    ["fldEquNombre0000", "Nombre", "singleLineText"],
    ["fldEquRol0000000", "Rol", "singleSelect", ch("Administrador", "Equipo")],
    ["fldEquEmail00000", "Email", "email"],
    ["fldEquTelefono00", "Teléfono", "phoneNumber"],
    ["fldEquTelegram00", "Usuario Telegram", "singleLineText"],
    ["fldEquActivo0000", "Activo", "checkbox"],
    ["fldEquClientes00", "Clientes ingresados", "multipleRecordLinks", link(T.clientes, "fldCliIngresado0")],
    ["fldEquEventos000", "Eventos asignados", "multipleRecordLinks", link(T.clientes, "fldCliTeam000000")],
    ["fldEquTareas0000", "Tareas asignadas", "multipleRecordLinks", link(T.tareas, "fldTarResp000000")],
    ["fldEquEntregas00", "Entregas a cargo", "multipleRecordLinks", link(T.entrega, "fldEntResp000000")],
    ["fldEquL100000000", "Leads (1er contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC10000000")],
    ["fldEquL200000000", "Leads (2do contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC20000000")],
    ["fldEquL300000000", "Leads (3er contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC30000000")],
    ["fldEquL400000000", "Leads (4to contacto)", "multipleRecordLinks", link(T.leads, "fldLeaC40000000")],
    ["fldEquGastos0000", "Gastos pagados", "multipleRecordLinks", link(T.gastos, "fldGasPagador000")],
    ["fldEquTelegram01", "Telegram Chat ID", "singleLineText"],
    ["fldEquConfirm000", "Eventos confirmados", "multipleRecordLinks", link(T.clientes, "fldCliConfirm000")],
    ["fldEquInvitad000", "Invitaciones Telegram", "multipleRecordLinks", link(T.clientes, "fldCliInvitad000")],
    ["fldEquCodigo0000", "Código de invitación", "singleLineText"],
    ["fldEquEstInv0000", "Estado invitación", "singleSelect", ch("Pendiente", "Usada", "Cancelada")],
    ["fldEquClave00000", "Clave (cifrada)", "singleLineText"],
    ["fldEquGasAprob00", "Gastos aprobados", "multipleRecordLinks", link(T.gastos, "fldGasAprobPor00")],
  ]],
};

const tablas = Object.entries(esquema).map(([tid, [name, campos]]) => ({
  id: tid,
  name,
  primaryFieldId: campos[0][0],
  fields: campos.map(([fid, fname, type, options]) => ({ id: fid, name: fname, type, ...(options ? { options } : {}) })),
}));
const tabla = (tid) => tablas.find((t) => t.id === tid || t.name === tid);

/* ---------- datos inventados ---------- */

const datos = Object.fromEntries(tablas.map((t) => [t.id, []]));
const dia = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
function crear(tid, fields, hace = 0) {
  const r = { id: id("rec"), createdTime: new Date(Date.now() - hace * 86400000).toISOString(), fields: {} };
  datos[tid].push(r);
  escribir(tid, r, fields);
  return r;
}

// Contraseña de prueba: demo1234. Sofía tiene una invitación pendiente (código DCF-TEST-2345).
const clave = cifrar("demo1234");
const ana = crear(T.equipo, { Nombre: "Ana Torres", Rol: "Administrador", Email: "admin@dreamcatcher.test", Activo: true, Teléfono: "+52 55 1234 5678", "Estado invitación": "Usada", "Clave (cifrada)": clave });
const luis = crear(T.equipo, { Nombre: "Luis Méndez", Rol: "Equipo", Email: "equipo@dreamcatcher.test", Activo: true, "Estado invitación": "Usada", "Clave (cifrada)": clave });
const sofi = crear(T.equipo, { Nombre: "Sofía Ruiz", Rol: "Equipo", Email: "sofia@dreamcatcher.test", Activo: true, "Estado invitación": "Pendiente", "Código de invitación": "DCF-TEST-2345" });
crear(T.equipo, { Nombre: "Pedro Gil", Rol: "Equipo", Email: "pedro@dreamcatcher.test", Activo: false });
const beto = crear(T.equipo, { Nombre: "Beto Salas", Rol: "Administrador", Email: "socio@dreamcatcher.test", Activo: true, "Estado invitación": "Usada", "Clave (cifrada)": clave });

const c1 = crear(T.clientes, { "Nombre del Cliente": "Mariana & Diego", "Fecha del Evento": dia(12), "Tipo de Servicio": "Boda", Venue: "Hacienda San Gabriel", Precio: 48000, "Estado del Cliente": "Confirmado", "Team Members": [ana.id, luis.id], Notificado: true, Prioridad: "Alta", "Solicitudes Especiales": "Drone en la ceremonia.\nVideo corto para redes." });
const c2 = crear(T.clientes, { "Nombre del Cliente": "Lucía — XV años", "Fecha del Evento": dia(30), "Tipo de Servicio": "Cumpleaños", Venue: "Salón Jardín Real", Precio: 22000, "Estado del Cliente": "Pendiente de Pago", "Team Members": [sofi.id], Notificado: true });
const c3 = crear(T.clientes, { "Nombre del Cliente": "Congreso TecnoMX", "Fecha del Evento": dia(-20), "Tipo de Servicio": "Conferencia", Venue: "Expo Guadalajara", Precio: 65000, "Estado del Cliente": "En Proceso", "Team Members": [ana.id, sofi.id, luis.id], Notificado: true });
const c5 = crear(T.clientes, { "Nombre del Cliente": "Graduación ITAM", "Fecha del Evento": dia(30), "Tipo de Servicio": "Graduación", Venue: "Auditorio ITAM", Precio: 3000, "Estado del Cliente": "Confirmado", Notificado: true });
const c4 = crear(T.clientes, { "Nombre del Cliente": "Valeria & Andrés", "Fecha del Evento": dia(-75), "Tipo de Servicio": "Boda", Venue: "Casa Lamm", Precio: 52000, "Estado del Cliente": "Finalizado", "Team Members": [ana.id], Notificado: true });

crear(T.tareas, { "Nombre de la Tarea": "Llamada de planeación con los novios", "Cliente Asociado": [c1.id], "Fecha Límite": dia(1), "Estado de Tarea": "Por Hacer", Prioridad: "Alta", Responsables: [ana.id] });
crear(T.tareas, { "Nombre de la Tarea": "Cargar baterías y tarjetas", "Cliente Asociado": [c1.id], "Fecha Límite": dia(11), "Estado de Tarea": "Por Hacer", Responsables: [luis.id] });
crear(T.tareas, { "Nombre de la Tarea": "Editar highlight", "Cliente Asociado": [c3.id], "Fecha Límite": dia(-1), "Estado de Tarea": "En Proceso", Prioridad: "Media", Responsables: [sofi.id] });
crear(T.tareas, { "Nombre de la Tarea": "Enviar contrato", "Cliente Asociado": [c2.id], "Fecha Límite": dia(-3), "Estado de Tarea": "Completada", Responsables: [ana.id] });
crear(T.tareas, { "Nombre de la Tarea": "Revisar música con licencia", "Estado de Tarea": "Por Hacer", Responsables: [luis.id, sofi.id] });

crear(T.entrega, { Cliente: [c3.id], "Fecha de Entrega": dia(2), "Status Entrega": ["Revisando Cambios"], "Cambios Deseados": "Quitar el logo del patrocinador en el minuto 2:10 y subir el volumen de la keynote.", "Responsable Entrega": [sofi.id], "Link de Entrega": "https://vimeo.com/ejemplo" });
crear(T.entrega, { Cliente: [c1.id], "Fecha de Entrega": dia(75), "Status Entrega": ["En revisión"], "Responsable Entrega": [luis.id], "Link de Entrega": "https://vimeo.com/ejemplo2" });
crear(T.entrega, { Cliente: [c4.id], "Fecha de Entrega": dia(-40), "Status Entrega": ["Entregado"], "Responsable Entrega": [ana.id] });

crear(T.leads, { "Nombre del Cliente": "Fernanda & Iván", "Fecha del Evento": dia(200), "Servicio Requerido": "Boda", "Estado Lead": "En Negociación", "1er Contacto": [ana.id], "2do Contacto": [luis.id] }, 15);
crear(T.leads, { "Nombre del Cliente": "Startup Nube", "Fecha del Evento": dia(60), "Servicio Requerido": "Promocional", "Estado Lead": "Nuevo", "1er Contacto": [sofi.id], "Notas de Lead": "Quieren un video de 60 s para lanzamiento." }, 8);

crear(T.conta, { Cliente: [c1.id], DEPOSITO: 15000, "Fecha Depósito": dia(-30), "Fecha Balance": dia(5) });
crear(T.conta, { Cliente: [c2.id], DEPOSITO: 5000, "Fecha Depósito": dia(-10), "Fecha Balance": dia(-12) });
crear(T.conta, { Cliente: [c4.id], DEPOSITO: 52000, "Fecha Depósito": dia(-100), "Fecha Balance": dia(-70) });

crear(T.gastos, { GASTOS: "Gasolina viaje a Guadalajara", Fecha: dia(-21), Cantidad: 1450, Categoría: "Transporte", "Forma de Pago": "Tarjeta", Cliente: [c3.id], "Persona que hizo el pago": [luis.id] });
crear(T.gastos, { GASTOS: "Adobe Creative Cloud", Fecha: dia(-5), Cantidad: 1199, Categoría: "Software y suscripciones", "Forma de Pago": "Tarjeta", "Persona que hizo el pago": [ana.id] });

crear(T.leads, { "Nombre del Cliente": "Carla & Tomás", "Fecha del Evento": dia(150), "Servicio Requerido": "Boda", "Estado Lead": "Nuevo" }, 3);

crear(T.gastos, { GASTOS: "Lente Sony 24-70 GM", Fecha: dia(-2), Cantidad: 38500, Categoría: "Equipo y material", "Forma de Pago": "Tarjeta", "Persona que hizo el pago": [ana.id], Aprobación: "Pendiente" });
crear(T.gastos, { GASTOS: "Renta de drone", Fecha: dia(-1), Cantidad: 6200, Categoría: "Equipo y material", "Forma de Pago": "Transferencia", Cliente: [c1.id], "Persona que hizo el pago": [beto.id], Aprobación: "Pendiente" });

const telegram = [];

/* ---------- lógica ---------- */

function escribir(tid, r, fields) {
  const t = tabla(tid);
  for (const [clave, valor] of Object.entries(fields)) {
    const f = t.fields.find((x) => x.name === clave || x.id === clave);
    if (!f) throw Object.assign(new Error(`Unknown field name: "${clave}"`), { status: 422 });
    if (f.type === "multipleRecordLinks") {
      const antes = r.fields[f.name] ?? [];
      const despues = valor ?? [];
      const inv = f.options.inverseLinkFieldId;
      const tInv = tabla(f.options.linkedTableId);
      const fInv = tInv.fields.find((x) => x.id === inv);
      for (const otro of datos[tInv.id]) {
        const lista = otro.fields[fInv.name] ?? [];
        if (antes.includes(otro.id) && !despues.includes(otro.id)) otro.fields[fInv.name] = lista.filter((x) => x !== r.id);
        if (despues.includes(otro.id) && !lista.includes(r.id)) otro.fields[fInv.name] = [...lista, r.id];
      }
    }
    if (valor == null || valor === "" || valor === false || (Array.isArray(valor) && !valor.length)) delete r.fields[f.name];
    else r.fields[f.name] = valor;
  }
}

function calculado(tid, r) {
  const out = { ...r, fields: { ...r.fields } };
  for (const [k, v] of Object.entries(out.fields)) if (Array.isArray(v) && !v.length) delete out.fields[k];
  const cliente = (r.fields.Cliente ?? [])[0] && datos[T.clientes].find((c) => c.id === r.fields.Cliente[0]);
  if (tid === T.entrega || tid === T.conta) out.fields["NOMBRE DEL CLIENTE"] = cliente?.fields["Nombre del Cliente"] ?? "";
  if (tid === T.conta) {
    const total = cliente?.fields.Precio ?? 0;
    out.fields["Monto Total"] = total;
    out.fields["Monto Pendiente"] = total - (r.fields.DEPOSITO ?? 0);
  }
  return out;
}

function responder(res, status, cuerpo) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(cuerpo));
}

http
  .createServer(async (req, res) => {
    let cuerpo = "";
    for await (const trozo of req) cuerpo += trozo;
    const json = cuerpo ? JSON.parse(cuerpo) : {};
    const url = new URL(req.url, `http://localhost:${PUERTO}`);
    const partes = url.pathname.split("/").filter(Boolean); // v0, ...
    try {
      if (partes[0]?.startsWith("bot")) {
        const metodo = partes[1];
        if (metodo === "getMe") return responder(res, 200, { ok: true, result: { username: "dreamcatcher_prueba_bot" } });
        telegram.push({ metodo, ...json });
        console.log(`[telegram] ${metodo} → ${json.chat_id ?? ""} ${String(json.text ?? json.url ?? "").replace(/\n/g, " / ").slice(0, 160)}`);
        return responder(res, 200, { ok: true, result: { message_id: telegram.length, url: "", pending_update_count: 0 } });
      }
      if (partes[0] === "__telegram") return responder(res, 200, telegram);
      if (partes[1] === "meta") return responder(res, 200, { tables: tablas });

      if (partes[4] === "uploadAttachment") {
        const recId = partes[2];
        for (const [tid, regs] of Object.entries(datos)) {
          const r = regs.find((x) => x.id === recId);
          if (!r) continue;
          const f = tabla(tid).fields.find((x) => x.id === partes[3]);
          const dataUrl = `data:${json.contentType};base64,${json.file}`;
          const adj = { id: id("att"), url: dataUrl, filename: json.filename, type: json.contentType, thumbnails: json.contentType.startsWith("image/") ? { large: { url: dataUrl } } : undefined };
          r.fields[f.name] = [...(r.fields[f.name] ?? []), adj];
          return responder(res, 200, { id: r.id, fields: {} });
        }
        return responder(res, 404, { error: { type: "NOT_FOUND" } });
      }

      const t = tabla(decodeURIComponent(partes[2] ?? ""));
      if (!t) return responder(res, 404, { error: { type: "TABLE_NOT_FOUND" } });
      const regs = datos[t.id];
      const recId = partes[3];

      if (req.method === "GET" && recId) {
        const r = regs.find((x) => x.id === recId);
        return r ? responder(res, 200, calculado(t.id, r)) : responder(res, 404, { error: { type: "NOT_FOUND" } });
      }
      if (req.method === "GET") {
        const desde = Number(url.searchParams.get("offset") ?? 0);
        const tam = Number(url.searchParams.get("pageSize") ?? 100);
        const pagina = regs.slice(desde, desde + tam).map((r) => calculado(t.id, r));
        return responder(res, 200, { records: pagina, ...(desde + tam < regs.length ? { offset: String(desde + tam) } : {}) });
      }
      if (req.method === "POST") {
        const creados = json.records.map((x) => calculado(t.id, crear(t.id, x.fields)));
        return responder(res, 200, { records: creados });
      }
      if (req.method === "PATCH") {
        const hechos = json.records.map((x) => {
          const r = regs.find((y) => y.id === x.id);
          if (!r) throw Object.assign(new Error("Record not found"), { status: 404 });
          escribir(t.id, r, x.fields);
          return calculado(t.id, r);
        });
        return responder(res, 200, { records: hechos });
      }
      if (req.method === "DELETE" && recId) {
        const r = regs.find((x) => x.id === recId);
        if (r) {
          const vacios = Object.fromEntries(t.fields.filter((f) => f.type === "multipleRecordLinks").map((f) => [f.name, []]));
          escribir(t.id, r, vacios);
          regs.splice(regs.indexOf(r), 1);
        }
        return responder(res, 200, { id: recId, deleted: true });
      }
      responder(res, 405, { error: { type: "METHOD_NOT_ALLOWED" } });
    } catch (e) {
      responder(res, e.status ?? 500, { error: { type: "ERROR", message: e.message } });
    }
  })
  .listen(PUERTO, () => console.log(`Airtable falso en http://localhost:${PUERTO}`));
