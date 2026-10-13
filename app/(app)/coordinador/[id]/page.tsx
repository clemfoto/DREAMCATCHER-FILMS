import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistro } from "@/lib/airtable";
import { contextoCoordinacion } from "@/lib/coordinacion";
import { campoPrincipal, editableCoordinacion, textoPrincipal } from "@/lib/esquema";
import { Valor } from "@/components/Valor";
import SubirArchivo from "@/components/SubirArchivo";
import PanelTeam from "@/components/PanelTeam";
import { COORDINADOR, GALERIAS, TABLAS } from "@/config/galerias";

export const metadata = { title: COORDINADOR.titulo };

/** Ficha de un evento en la sección Coordinador: datos sin precios, team y confirmaciones. */
export default async function FichaCoordinador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contextoCoordinacion();
  const r = await getRegistro(ctx.t.id, id);
  if (!r) notFound();
  const g = GALERIAS[TABLAS.clientes];
  const principal = campoPrincipal(ctx.t);
  // El team y los confirmados se ven en su panel; aquí, el resto de datos del evento.
  const campos = ctx.campos.filter((f) => f.id !== principal.id && f.name !== g.team && f.name !== g.confirmados);
  const ficha = `${COORDINADOR.ruta}/${r.id}`;

  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href={COORDINADOR.ruta} className="volver">
          ‹ {COORDINADOR.titulo}
        </Link>
        <h1 className="titulo titulo-ficha">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</h1>
      </header>

      <PanelTeam r={r} editar={`${ficha}/editar`} />

      <section className="tarjeta bloque">
        <dl className="campos">
          {campos.map((f) => (
            <div key={f.id} className="campo-ficha">
              <dt>{f.name}</dt>
              <dd>
                <Valor f={f} v={r.fields[f.name]} enlaces={ctx.enlaces} />
                {f.type === "multipleAttachments" && editableCoordinacion(f) && (
                  <SubirArchivo tabla={ctx.t.id} campo={f.id} registro={r.id} etiqueta={`Añadir a ${f.name}`} />
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
