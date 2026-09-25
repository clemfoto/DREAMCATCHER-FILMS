import "server-only";
import { forbidden, notFound } from "next/navigation";
import { getEsquema, type Field, type Table } from "@/lib/airtable";
import { requireUsuario, type Usuario } from "@/lib/auth";
import { GALERIAS, type Galeria } from "@/config/galerias";
import { camposVisibles, nombresEnlazados, puedeVerTabla, rutaTabla, tablaPorSlug } from "@/lib/esquema";

/** Lo que necesitan los componentes para pintar enlaces entre tablas. */
export type Enlaces = {
  nombres: Record<string, Map<string, string>>;
  /** Ruta base de cada tabla que el usuario puede abrir. */
  rutas: Record<string, string>;
};

export type Contexto = {
  u: Usuario;
  t: Table;
  g: Galeria;
  campos: Field[];
  enlaces: Enlaces;
  esquema: Table[];
};

/** Carga tabla + usuario comprobando permisos en el servidor. */
export async function contextoTabla(slugTabla: string): Promise<Contexto> {
  const u = await requireUsuario();
  const t = await tablaPorSlug(decodeURIComponent(slugTabla));
  if (!t) notFound();
  if (!puedeVerTabla(u, t.id)) forbidden();
  const esquema = await getEsquema();
  const rutas: Record<string, string> = {};
  for (const x of esquema) if (puedeVerTabla(u, x.id)) rutas[x.id] = rutaTabla(x);
  return {
    u,
    t,
    g: GALERIAS[t.id] ?? {},
    campos: camposVisibles(u, t),
    enlaces: { nombres: await nombresEnlazados(u, t), rutas },
    esquema,
  };
}

/** Lee un campo de la galería por su clave de configuración. */
export function cfg(ctx: Contexto, clave: string): Field | undefined {
  const nombre = ctx.g[clave];
  return typeof nombre === "string" ? ctx.campos.find((f) => f.name === nombre) : undefined;
}
