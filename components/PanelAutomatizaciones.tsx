"use client";
import { useState } from "react";
import { AUTOMATIZACIONES } from "@/config/galerias";

const A = AUTOMATIZACIONES;
const dias = (n: number) => (n === 1 ? "1 día" : `${n} días`);

const TAREAS = [
  { tarea: "webhook", texto: "Conectar el bot", ayuda: "Hazlo una vez tras configurar el bot (o si cambias de dominio)." },
  {
    tarea: "frecuente",
    texto: "Enviar avisos de clientes y leads",
    ayuda: `Nuevo cliente → aviso al grupo, invitaciones al team y entrega ${dias(A.diasEntrega)} después del evento. Leads → aviso del 1er contacto al entrar y de cada contacto siguiente (2º, 3º, 4º) ${dias(A.diasEntreContactos)} después del anterior (de ${A.horarioAvisos.desde}:00 a ${A.horarioAvisos.hasta}:00). Se hace solo cada 10 min.`,
  },
  {
    tarea: "diaria",
    texto: "Enviar recordatorios de entrega",
    ayuda: `Recordatorio al responsable ${dias(A.diasRecordatorioEntrega)} después del evento. Se hace solo cada día a las 9:00.`,
  },
  {
    tarea: "informe",
    texto: "Enviar informe contable",
    ayuda: `Por cobrar, balances vencidos y próximos, cobros y gastos recientes y gastos por aprobar. Se envía solo cada ${dias(A.diasInformeContable)} a las 9:00.`,
  },
  { tarea: "mensual", texto: "Enviar cierre del mes pasado", ayuda: "Ingresos, gastos y resultado del mes. Se envía solo el día 1 de cada mes." },
];

export default function PanelAutomatizaciones() {
  const [ocupado, setOcupado] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  async function ejecutar(tarea: string) {
    setOcupado(tarea);
    setResultado(null);
    try {
      const res = await fetch(`/api/automatizaciones?tarea=${tarea}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Error");
      setResultado({ ok: true, texto: json.log?.length ? json.log.join("\n") : "Hecho. No había nada pendiente." });
    } catch (e) {
      setResultado({ ok: false, texto: (e as Error).message });
    } finally {
      setOcupado("");
    }
  }

  return (
    <div className="panel-auto">
      {TAREAS.map((t) => (
        <div key={t.tarea} className="panel-auto-fila">
          <button className="btn btn-secundario btn-bloque" disabled={!!ocupado} onClick={() => ejecutar(t.tarea)}>
            {ocupado === t.tarea ? "Ejecutando…" : t.texto}
          </button>
          <span className="campo-ayuda">{t.ayuda}</span>
        </div>
      ))}
      {resultado && <p className={`multilinea ${resultado.ok ? "ok" : "error"}`}>{resultado.texto}</p>}
    </div>
  );
}
