import { getRegistros } from "@/lib/airtable";
import { contextoCoordinacion, resumenCoordinacion } from "@/lib/coordinacion";
import { buscar, filtrarOpcion, ordenar } from "@/lib/lista";
import Filtros from "@/components/Filtros";
import Clientes from "@/components/vistas/Clientes";
import { COORDINADOR } from "@/config/galerias";

export const metadata = { title: COORDINADOR.titulo };

/** Sección Coordinador: los eventos sin precios, para organizar el personal (rol Coordinador y administradores). */
export default async function Coordinador({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q = "", f } = await searchParams;
  const ctx = await contextoCoordinacion();
  const fFiltro = ctx.g.filtro ? ctx.campos.find((x) => x.name === ctx.g.filtro) : undefined;
  const orden = ctx.g.orden;

  const todos = await getRegistros(ctx.t.id);
  const { sinTeam, porConfirmar } = resumenCoordinacion(todos);
  let regs = buscar(todos, ctx.campos, q, ctx.enlaces.nombres);
  regs = filtrarOpcion(regs, fFiltro, f);
  regs = ordenar(regs, orden ? ctx.campos.find((x) => x.name === orden.campo) : undefined, orden?.dir);
  const base = COORDINADOR.ruta;

  return (
    <>
      <header className="cabecera">
        <div className="cabecera-fila">
          <h1 className="titulo">{COORDINADOR.titulo}</h1>
          <span className="muted">{regs.length === todos.length ? todos.length : `${regs.length} de ${todos.length}`}</span>
        </div>
        <p className="muted">
          Eventos próximos: <strong>{sinTeam}</strong> sin team · <strong>{porConfirmar}</strong> confirmaciones pendientes
        </p>
        <form className="buscador" action={base} role="search">
          {f && <input type="hidden" name="f" value={f} />}
          <input className="input" type="search" name="q" defaultValue={q} placeholder="Buscar…" aria-label="Buscar" enterKeyHint="search" />
        </form>
        {fFiltro && <Filtros base={base} q={q} activo={f} opciones={fFiltro.options?.choices?.map((c) => c.name) ?? []} />}
      </header>
      {regs.length ? <Clientes ctx={ctx} regs={regs} /> : <p className="vacio-lista">{q || f ? "No hay resultados." : "Todavía no hay eventos."}</p>}
    </>
  );
}
