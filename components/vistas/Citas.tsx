import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { fecha, isoALocal, texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatares } from "@/components/Valor";
import { TABLAS } from "@/config/galerias";

/** Citas con clientes (reuniones, pruebas de locación…): próximas primero, luego las pasadas. */
export default function Citas({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const principal = campoPrincipal(ctx.t);
  const fFecha = cfg(ctx, "fecha");
  const ahora = new Date().toISOString();
  const proximas = regs.filter((r) => String(val(r, fFecha) ?? "9") >= ahora);
  const pasadas = regs.filter((r) => !proximas.includes(r)).reverse();
  const fila = (r: AirRecord) => {
    const cliente = ((val(r, cfg(ctx, "cliente")) as string[] | undefined) ?? []).map((id) => ctx.enlaces.nombres[TABLAS.clientes]?.get(id)).filter(Boolean).join(", ");
    const hora = isoALocal(val(r, fFecha)).slice(11, 16);
    return (
      <Link key={r.id} href={`${rutaTabla(ctx.t)}/${r.id}`} className="fila tarjeta">
        <span className="fila-cuerpo">
          <span className="fila-titulo">{textoPrincipal(r.fields[principal.name]) || "Cita"}</span>
          <span className="fila-meta">{[fecha(val(r, fFecha)), hora, cliente, texto(val(r, cfg(ctx, "lugar")))].filter(Boolean).join(" · ") || "Sin fecha"}</span>
        </span>
        <Avatares ids={val(r, cfg(ctx, "con"))} enlaces={ctx.enlaces} />
      </Link>
    );
  };
  return (
    <>
      <div className="filas">{proximas.map(fila)}</div>
      {pasadas.length > 0 && (
        <section className="seccion">
          <h2 className="seccion-titulo">Pasadas</h2>
          <div className="filas">{pasadas.map(fila)}</div>
        </section>
      )}
    </>
  );
}
