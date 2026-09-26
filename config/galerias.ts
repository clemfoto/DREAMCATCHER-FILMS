/**
 * Configuración de la app en un solo lugar.
 *
 * Todo lo que no aparece aquí se genera solo a partir del esquema de Airtable:
 * si el dueño crea una tabla o un campo nuevo, sale en la app sin tocar código.
 * Las tablas se identifican por su ID (no cambia aunque se renombre la tabla);
 * los campos, por su nombre tal como aparece en Airtable.
 */

export type Rol = "Administrador" | "Equipo";

export const TABLAS = {
  clientes: "tblzsfM8s8Grq2lwU",
  tareas: "tblI4mNizr3Xwgoa6",
  entrega: "tbl29U9MasLnSPMBj",
  leads: "tblnZCa7gevintf0n",
  contabilidad: "tbl4d283L3x8TVLzy",
  gastos: "tbl5kqfH0Fh7OhSu9",
  equipo: "tblWfnNYeXrB95dQC",
  informes: "tblWMvMEJgzGdD0mn",
} as const;

/** Tabla de personas: da acceso a la app y alimenta los avatares. */
export const EQUIPO = {
  tabla: TABLAS.equipo,
  nombre: "Nombre",
  email: "Email",
  rol: "Rol",
  activo: "Activo",
  rolAdmin: "Administrador" as Rol,
};

/** Tablas que el rol "Equipo" puede ver. El Administrador ve todo. */
export const TABLAS_ROL_EQUIPO: string[] = [TABLAS.clientes, TABLAS.tareas, TABLAS.entrega, TABLAS.leads];

/** Barra inferior del móvil (el resto de tablas va en "Más"). */
export const NAV_PRINCIPAL: string[] = [TABLAS.clientes, TABLAS.tareas, TABLAS.entrega, TABLAS.leads];

/** Orden de las tablas dentro de "Más"; las tablas nuevas se añaden al final. */
export const NAV_MAS: string[] = [TABLAS.contabilidad, TABLAS.gastos, TABLAS.informes, TABLAS.equipo];

/** Campos de uso interno de las automatizaciones: existen en Airtable pero la app no los muestra. */
export const CAMPOS_OCULTOS: string[] = [
  "Notificado",
  "Invitados Telegram",
  "Invitaciones Telegram",
  "Recordatorio enviado",
  "Recordatorios enviados",
];

/** Segundos que se reutilizan las lecturas de Airtable antes de volver a pedirlas. */
export const CACHE_SEGUNDOS = 30;

/** Formato de números y dinero (el símbolo sale de cada campo de Airtable). */
export const MONEDA = { locale: "es-MX" };

/** Zona horaria del negocio, para saber qué es "hoy" y "esta semana". */
export const ZONA_HORARIA = "America/Mexico_City";

/** Colores de chips por nombre de opción (sin distinguir mayúsculas). [fondo, texto] */
const AZUL: [string, string] = ["#E4ECF5", "#274766"];
const NARANJA: [string, string] = ["#FBEBD9", "#7A3F0C"];
const MORADO: [string, string] = ["#EFE6F3", "#55336A"];
const VERDE: [string, string] = ["#E3EEDF", "#2F5226"];
const ROJO: [string, string] = ["#F6E1DC", "#7A2A1A"];
export const COLOR_POR_DEFECTO: [string, string] = ["#EEEAE2", "#5E584F"];

export const COLORES_OPCION: Record<string, [string, string]> = {
  // Del prototipo
  reservado: AZUL,
  "anticipo pagado": NARANJA,
  "en edición": MORADO,
  entregado: VERDE,
  // Clientes
  confirmado: AZUL,
  activa: AZUL,
  "pendiente de pago": NARANJA,
  "en proceso": MORADO,
  finalizado: VERDE,
  cancelado: ROJO,
  // Tareas
  "en progreso": MORADO,
  "en revisión": NARANJA,
  completa: VERDE,
  completada: VERDE,
  // Entrega
  enviado: AZUL,
  "revisando cambios": NARANJA,
  // Leads
  contactado: AZUL,
  "en seguimiento": AZUL,
  "en negociación": NARANJA,
  ganado: VERDE,
  perdido: ROJO,
  // Prioridad
  alta: ROJO,
  media: NARANJA,
  baja: AZUL,
};

/* ------------------------------------------------------------------ */
/* Galerías a medida                                                    */
/* ------------------------------------------------------------------ */

export type Galeria = {
  /** Diseño especial de la lista; si no hay, se usa el genérico. */
  vista?: "clientes" | "tareas" | "entrega" | "leads" | "contabilidad" | "gastos" | "equipo";
  /** Campo de selección que se ofrece como filtro en chips. */
  filtro?: string;
  /** Orden de la lista. */
  orden?: { campo: string; dir: "asc" | "desc" };
  /** Campos que se muestran en la tarjeta genérica (si no, los primeros del esquema). */
  tarjeta?: string[];
  /** Accesos a registros enlazados que se destacan en la ficha. */
  relacionados?: { campo: string; titulo: string }[];
  [clave: string]: unknown;
};

export const GALERIAS: Record<string, Galeria> = {
  [TABLAS.clientes]: {
    vista: "clientes",
    nombre: "Nombre del Cliente",
    filtro: "Estado del Cliente",
    orden: { campo: "Fecha del Evento", dir: "asc" },
    estado: "Estado del Cliente",
    fecha: "Fecha del Evento",
    servicio: "Tipo de Servicio",
    venue: "Venue",
    team: "Team Members",
    confirmados: "Confirmados",
    precio: "Precio",
    relacionados: [
      { campo: "Tareas", titulo: "Tareas" },
      { campo: "Entrega", titulo: "Entregas" },
      { campo: "Contabilidad", titulo: "Pagos" },
      { campo: "Gastos", titulo: "Gastos" },
      { campo: "Leads", titulo: "Leads" },
    ],
  },
  [TABLAS.tareas]: {
    vista: "tareas",
    orden: { campo: "Fecha Límite", dir: "asc" },
    estado: "Estado de Tarea",
    fecha: "Fecha Límite",
    cliente: "Cliente Asociado",
    responsables: "Responsables",
    prioridad: "Prioridad",
    /** Opciones que cuentan como "hecha". La primera es la que se pone al marcar. */
    estadosHechos: ["Completada", "Completa"],
    /** Estado al desmarcar. */
    estadoPendiente: "Por Hacer",
    /** Días antes del vencimiento en que la fecha se pone en rojo. */
    diasAviso: 2,
  },
  [TABLAS.entrega]: {
    vista: "entrega",
    cliente: "Cliente",
    filtro: "Status Entrega",
    orden: { campo: "Fecha de Entrega", dir: "asc" },
    status: "Status Entrega",
    fecha: "Fecha de Entrega",
    cambios: "Cambios Deseados",
    link: "Link de Entrega",
    responsable: "Responsable Entrega",
  },
  [TABLAS.leads]: {
    vista: "leads",
    filtro: "Estado Lead",
    orden: { campo: "Fecha del Evento", dir: "asc" },
    estado: "Estado Lead",
    fecha: "Fecha del Evento",
    servicio: "Servicio Requerido",
    contactos: ["1er Contacto", "2do Contacto", "3er Contacto", "4to Contacto"],
    clienteRelacionado: "Relacionado a Cliente",
    /** Al convertir un lead en cliente. */
    conversion: {
      nombre: ["Nombre del Cliente", "Nombre del Cliente"],
      fecha: ["Fecha del Evento", "Fecha del Evento"],
      servicio: ["Servicio Requerido", "Tipo de Servicio"],
      notas: ["Notas de Lead", "Notas de Seguimiento"],
      estadoCliente: ["Estado del Cliente", "Confirmado"],
      estadoLeadGanado: "Ganado",
    },
  },
  [TABLAS.contabilidad]: {
    vista: "contabilidad",
    orden: { campo: "Monto Pendiente", dir: "desc" },
    total: "Monto Total",
    deposito: "DEPOSITO",
    pendiente: "Monto Pendiente",
    fechaBalance: "Fecha Balance",
    fechaDeposito: "Fecha Depósito",
  },
  [TABLAS.gastos]: {
    vista: "gastos",
    filtro: "Categoría",
    orden: { campo: "Fecha", dir: "desc" },
    categoria: "Categoría",
    fecha: "Fecha",
    pagador: "Persona que hizo el pago",
    monto: "Cantidad",
    comprobante: "Comprobante",
  },
  [TABLAS.equipo]: {
    vista: "equipo",
    rol: "Rol",
    eventos: "Eventos asignados",
    email: "Email",
    telefono: "Teléfono",
    activo: "Activo",
  },
  [TABLAS.informes]: {
    orden: { campo: "Mes", dir: "desc" },
    tarjeta: ["Ingresos", "Gastos", "Resultado", "Pendiente de cobro"],
  },
};

/* ------------------------------------------------------------------ */
/* Automatizaciones (Telegram y tareas programadas)                     */
/* ------------------------------------------------------------------ */

export const AUTOMATIZACIONES = {
  /** La entrega se fija este número de semanas después del evento. */
  semanasEntrega: 9,
  /** Días antes de la fecha de entrega en que se avisa al responsable. */
  diasAvisoEntrega: 7,
  /** Días entre cada contacto de un lead (2º, 3º y 4º). */
  diasEntreContactos: 7,
  /** Estados de cliente que no generan avisos ni invitaciones. */
  estadosClienteIgnorados: ["Cancelado"],
  /** Estados de entrega que cuentan como entregada. */
  estadosEntregaHechos: ["Entregado", "Finalizado"],
  /** Estados de lead que ya no necesitan recordatorios. */
  estadosLeadCerrados: ["Ganado", "Perdido"],
  /** Estado que se pone a una entrega creada automáticamente. */
  estadoEntregaInicial: "Pendiente",
  /** Palabras que valen como confirmación escrita en Telegram. */
  palabrasConfirmar: ["confirmo", "si", "sí", "ok", "confirmado", "✅", "👍"],
  campos: {
    telegramChatId: "Telegram Chat ID",
    clienteSolicitudes: "Solicitudes Especiales",
    clienteNotificado: "Notificado",
    clienteInvitados: "Invitados Telegram",
    clienteConfirmados: "Confirmados",
    clienteEntrega: "Entrega",
    entregaRecordatorio: "Recordatorio enviado",
    leadRecordatorios: "Recordatorios enviados",
    contaDeposito: "DEPOSITO",
    contaFechaDeposito: "Fecha Depósito",
    contaTotal: "Monto Total",
    contaPendiente: "Monto Pendiente",
    contaFechaBalance: "Fecha Balance",
  },
  informe: {
    mes: "Mes",
    ingresos: "Ingresos",
    gastos: "Gastos",
    resultado: "Resultado",
    pendiente: "Pendiente de cobro",
    eventos: "Eventos del mes",
    detalle: "Detalle",
    generado: "Generado",
  },
};
