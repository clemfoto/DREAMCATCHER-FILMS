import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { cfg, type Contexto } from "@/lib/contexto";
import { campoPrincipal, rutaTabla, textoPrincipal } from "@/lib/esquema";
import { diasHasta, dinero, fecha, texto } from "@/lib/formato";
import { aNumero, val } from "@/lib/lista";
import { Chip } from "@/components/Valor";
import BotonAccion from "@/components/BotonAccion";
import { DECISIONES, MONEDAS, TABLAS } from "@/config/galerias";

/** Contabilidad por pagos: cada depósito o balance con su fecha de cobro, en pesos o dólares. */
export default function Pagos({ ctx, regs }: { ctx: Contexto; regs: AirRecord[] }) {
  const fMonto = cfg(ctx, "monto");
  const fMoneda = cfg(ctx, "moneda");
  const fCobro = cfg(ctx, "fechaCobro");
  const fPagado = cfg(ctx, "pagado");
  const fPago = cfg(ctx, "fechaPago");
  const fCliente = cfg(ctx, "cliente");
  const principal = campoPrincipal(ctx.t);
  const monedaDe = (r: AirRecord) => texto(val(r, fMoneda)) || Object.keys(MONEDAS)[0];
  const pagado = (r: AirRecord) => val(r, fPagado) === true;

  const pendientes = regs.filter((r) => !pagado(r));
  const vencidos = pendientes.filter((r) => (diasHasta(val(r, fCobro)) ?? 1) < 0);
  const proximos = pendientes.filter((r) => !vencidos.includes(r));
  const cobrados = regs.filter(pagado).sort((a, b) => String(val(b, fPago) ?? "").localeCompare(String(val(a, fPago) ?? "")));

  const porMoneda = (lista: AirRecord[]) => {
    const t: Record<string, number> = {};
    for (const r of lista) t[monedaDe(r)] = (t[monedaDe(r)] ?? 0) + aNumero(val(r, fMonto));
    return Object.entries(t);
  };
  const mesActual = new Date().toISOString().slice(0, 7);
  const cobradoMes = porMoneda(cobrados.filter((r) => String(val(r, fPago) ?? "").startsWith(mesActual)));
  const pendiente = porMoneda(pendientes);

  const nombre = (r: AirRecord) => {
    const cliente = ((val(r, fCliente) as string[] | undefined) ?? []).map((id) => ctx.enlaces.nombres[TABLAS.clientes]?.get(id)).filter(Boolean).join(", ");
    return cliente || textoPrincipal(r.fields[principal.name]) || "Pago";
  };

  const tarjeta = (r: AirRecord) => {
    const dias = diasHasta(val(r, fCobro));
    const vencido = !pagado(r) && dias != null && dias < 0;
    const tipo = texto(val(r, cfg(ctx, "tipo")));
    return (
      <div key={r.id} className={`tarjeta pago ${pagado(r) ? "pagado" : ""}`}>
        <Link href={`${rutaTabla(ctx.t)}/${r.id}`} className="pago-cuerpo">
          <span className="fila-cuerpo">
            <span className="fila-titulo">{nombre(r)}</span>
            <span className="fila-meta">
              {tipo && <Chip nombre={tipo} />}
              {pagado(r) ? (
                <span className="ok">Pagado {fecha(val(r, fPago))}</span>
              ) : val(r, fCobro) ? (
                <span className={vencido && dias! <= -DECISIONES.diasPagoVencido ? "fecha-urgente" : vencido ? "acento" : ""}>
                  {vencido ? "Venció" : "Cobro"} {fecha(val(r, fCobro))}
                </span>
              ) : (
                "Sin fecha de cobro"
              )}
            </span>
          </span>
          <strong className="precio">{dinero(val(r, fMonto), monedaDe(r))}</strong>
        </Link>
        <div className="pago-accion">
          {pagado(r) ? (
            <BotonAccion accion="desmarcarPagado" id={r.id} tipo="secundario" confirmar="¿Volver a dejarlo como pendiente?">Deshacer</BotonAccion>
          ) : (
            <BotonAccion accion="marcarPagado" id={r.id}>Marcar pagado</BotonAccion>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="resumen">
        <span className="resumen-label">Pendiente de cobro</span>
        {pendiente.length ? (
          pendiente.map(([m, total]) => (
            <strong key={m} className="resumen-cifra">
              {dinero(total, m)} <small>{m}</small>
            </strong>
          ))
        ) : (
          <strong className="resumen-cifra">$0</strong>
        )}
        <span className="resumen-sub">
          {vencidos.length} vencidos · cobrado este mes {cobradoMes.length ? cobradoMes.map(([m, t]) => `${dinero(t, m)} ${m}`).join(" + ") : "$0"}
        </span>
      </div>
      {vencidos.length > 0 && <Bloque titulo="Vencidos">{vencidos.map(tarjeta)}</Bloque>}
      {proximos.length > 0 && <Bloque titulo="Próximos cobros">{proximos.map(tarjeta)}</Bloque>}
      {cobrados.length > 0 && <Bloque titulo="Pagados">{cobrados.map(tarjeta)}</Bloque>}
    </>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="seccion">
      <h2 className="seccion-titulo">{titulo}</h2>
      <div className="filas">{children}</div>
    </section>
  );
}
