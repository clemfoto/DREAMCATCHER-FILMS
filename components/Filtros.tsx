import Link from "next/link";
import { colorOpcion } from "@/lib/formato";

/** Chips para filtrar una lista por las opciones de un campo de selección. */
export default function Filtros({ base, q, activo, opciones }: { base: string; q: string; activo?: string; opciones: string[] }) {
  const url = (op?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (op) p.set("f", op);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  return (
    <nav className="filtros" aria-label="Filtrar">
      <Link href={url()} className={`filtro ${!activo ? "activo" : ""}`} replace scroll={false}>
        Todos
      </Link>
      {opciones.map((op) => {
        const [bg, fg] = colorOpcion(op);
        const on = activo === op;
        return (
          <Link
            key={op}
            href={url(op)}
            replace
            scroll={false}
            className={`filtro ${on ? "activo" : ""}`}
            style={on ? undefined : { background: bg, color: fg, borderColor: "transparent" }}
          >
            {op}
          </Link>
        );
      })}
    </nav>
  );
}
