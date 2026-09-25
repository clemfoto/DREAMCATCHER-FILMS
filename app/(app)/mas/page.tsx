import Link from "next/link";
import { Icono } from "@/components/Iconos";
import { requireUsuario } from "@/lib/auth";
import { navegacion } from "@/lib/esquema";

export const metadata = { title: "Más" };

export default async function Mas() {
  const u = await requireUsuario();
  const { mas } = await navegacion(u);
  return (
    <>
      <header className="cabecera">
        <h1 className="titulo">Más</h1>
      </header>
      <div className="lista-menu">
        {mas.map((i) => (
          <Link key={i.id} href={i.href} className="menu-item">
            <Icono id={i.id} />
            <span>{i.titulo}</span>
            <span className="flecha" aria-hidden>›</span>
          </Link>
        ))}
        {!mas.length && <p className="muted">No hay más secciones para tu rol.</p>}
      </div>
      <div className="tarjeta perfil">
        <div>
          <strong>{u.nombre}</strong>
          <p className="muted">{u.email} · {u.rol}</p>
        </div>
        <form action="/auth/salir" method="post">
          <button className="btn btn-secundario">Cerrar sesión</button>
        </form>
      </div>
    </>
  );
}
