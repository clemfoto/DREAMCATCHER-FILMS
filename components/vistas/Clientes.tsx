import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { diasHasta, fecha, moneda, texto } from "@/lib/formato";
import { val } from "@/lib/lista";
import { Avatares, Chip } from "@/components/Valor";

export default function Clientes({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const fFecha = cfg(ctx, "fecha");
  const proximos = regs.filter((r) => (diasHasta(val(r, fFecha)) ?? 1) >= 0 && val(r, fFecha));
  const sinFecha = regs.filter((r) => !val(r, fFecha));
  const pasados = regs.filter((r) => (diasHasta(val(r, fFecha)) ?? 1) < 0).reverse();

  return (
    <>
      <Seccion titulo="Próximos eventos" regs={proximos} ctx={ctx} />
      <Seccion titulo="Sin fecha" regs={sinFecha} ctx={ctx} />
      <Seccion titulo="Eventos pasados" regs={pasados} ctx={ctx} />
    </>
  );
}

function Seccion({ titulo, regs, ctx }: { titulo: string; regs: AirRecord[]; ctx: Contexto }) {
  if (!regs.length) return null;
  return (
    <section className="seccion">
      <h2 className="seccion-titulo">
        {titulo} <span className="contador">{regs.length}</span>
      </h2>
      <div className="rejilla">
        {regs.map((r) => (
          <TarjetaCliente key={r.id} r={r} ctx={ctx} />
        ))}
      </div>
    </section>
  );
}

function TarjetaCliente({ r, ctx }: { r: AirRecord; ctx: Contexto }) {
  const principal = campoPrincipal(ctx.t);
  const estado = texto(val(r, cfg(ctx, "estado")));
  const servicio = texto(val(r, cfg(ctx, "servicio")));
  const venue = texto(val(r, cfg(ctx, "venue")));
  const fPrecio = cfg(ctx, "precio");
  const precio = moneda(val(r, fPrecio), fPrecio);
  const f = fecha(val(r, cfg(ctx, "fecha")));
  return (
    <Link href={`${rutaTabla(ctx.t)}/${r.id}`} className="tarjeta tarjeta-link">
      <div className="tarjeta-fila">
        <h3 className="tarjeta-titulo">{textoPrincipal(r.fields[principal.name]) || "Sin nombre"}</h3>
        {estado && <Chip nombre={estado} />}
      </div>
      <p className="tarjeta-meta">
        {[f, servicio].filter(Boolean).join(" · ") || "Sin fecha"}
      </p>
      {venue && <p className="tarjeta-meta">{venue}</p>}
      <div className="tarjeta-pie">
        <Avatares ids={val(r, cfg(ctx, "team"))} enlaces={ctx.enlaces} />
        {precio && <span className="precio">{precio}</span>}
      </div>
    </Link>
  );
}
