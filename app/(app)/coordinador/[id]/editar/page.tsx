import Link from "next/link";
import { notFound } from "next/navigation";
import { getRegistro } from "@/lib/airtable";
import { contextoCoordinacion } from "@/lib/coordinacion";
import { campoPrincipal, editableCoordinacion, textoPrincipal } from "@/lib/esquema";
import { camposFormulario } from "@/lib/formulario";
import Formulario from "@/components/Formulario";
import { guardarCoordinacion } from "@/app/(app)/coordinador/acciones";
import { COORDINADOR } from "@/config/galerias";

export const metadata = { title: "Elegir team" };

/** Elegir el team de un evento (solo los campos permitidos a la sección Coordinador). */
export default async function EditarCoordinador({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await contextoCoordinacion();
  const r = await getRegistro(ctx.t.id, id);
  if (!r) notFound();
  const ficha = `${COORDINADOR.ruta}/${r.id}`;
  const campos = camposFormulario({ ...ctx, campos: ctx.campos.filter(editableCoordinacion) }, r);
  return (
    <>
      <header className="cabecera cabecera-ficha">
        <Link href={ficha} className="volver">
          ‹ {textoPrincipal(r.fields[campoPrincipal(ctx.t).name]) || "Volver"}
        </Link>
        <h1 className="titulo">Elegir team</h1>
      </header>
      <section className="tarjeta bloque">
        <Formulario tabla={ctx.t.id} registro={r.id} campos={campos} volver={ficha} guardar={guardarCoordinacion.bind(null, r.id)} />
        <p className="nota-chica">Al guardar, cada persona nueva del team recibe su invitación por Telegram para confirmar.</p>
      </section>
    </>
  );
}
