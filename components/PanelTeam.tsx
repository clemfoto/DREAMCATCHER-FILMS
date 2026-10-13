import Link from "next/link";
import type { AirRecord } from "@/lib/airtable";
import { estadoTeam, type EstadoMiembro } from "@/lib/coordinacion";
import { Avatar } from "@/components/Valor";

const ETIQUETA: Record<EstadoMiembro, { texto: string; clase: string }> = {
  confirmado: { texto: "✅ Confirmó", clase: "ok" },
  invitado: { texto: "Invitado, sin respuesta", clase: "espera" },
  pendiente: { texto: "Invitación en camino", clase: "espera" },
  sinTelegram: { texto: "Sin Telegram conectado", clase: "sin" },
};

/** Team del evento con quién confirmó por Telegram (sección Coordinador y ficha de Clientes). */
export default async function PanelTeam({ r, editar }: { r: AirRecord; editar?: string }) {
  const filas = await estadoTeam(r);
  const ok = filas.filter((f) => f.estado === "confirmado").length;
  return (
    <section className="tarjeta bloque">
      <div className="cabecera-fila">
        <h2 className="seccion-titulo">
          Team del evento{" "}
          {filas.length > 0 && (
            <span className="contador">
              {ok}/{filas.length}
            </span>
          )}
        </h2>
        {editar && (
          <Link href={editar} className="btn btn-secundario btn-chico">
            Elegir team
          </Link>
        )}
      </div>
      {filas.length ? (
        <ul className="confirmacion">
          {filas.map((f) => (
            <li key={f.id}>
              <Avatar nombre={f.nombre} confirmado={f.estado === "confirmado"} />
              <span className="confirmacion-nombre">{f.nombre}</span>
              <span className={`confirmacion-estado ${ETIQUETA[f.estado].clase}`}>{ETIQUETA[f.estado].texto}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Todavía no hay team asignado.</p>
      )}
      {filas.some((f) => f.estado === "sinTelegram") && (
        <p className="nota-chica">Quien no tiene Telegram conectado no recibe la invitación: pídele que lo conecte en la app (Más → Conectar Telegram).</p>
      )}
    </section>
  );
}
