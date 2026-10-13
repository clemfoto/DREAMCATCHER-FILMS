import "server-only";
import type { Field } from "@/lib/airtable";
import { localAIso } from "@/lib/formato";

const TEXTO = new Set(["singleLineText", "email", "url", "phoneNumber", "multilineText", "richText"]);
const NUMERO = new Set(["number", "currency", "percent", "rating", "duration"]);

/** Convierte lo que envía el formulario al formato que espera Airtable, según el tipo del campo. */
export function leerCampo(f: Field, form: FormData): unknown {
  const clave = `f:${f.id}`;
  const v = String(form.get(clave) ?? "").trim();
  if (TEXTO.has(f.type)) return v || null;
  if (NUMERO.has(f.type)) {
    if (!v) return null;
    const n = Number(v.replace(",", "."));
    if (isNaN(n)) throw new Error(`"${f.name}" debe ser un número.`);
    return f.type === "percent" ? n / 100 : n;
  }
  switch (f.type) {
    case "checkbox":
      return form.get(clave) === "on";
    case "date":
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    case "dateTime":
      return v ? localAIso(v) : null;
    case "singleSelect":
      return v || null;
    case "multipleSelects":
      return form.getAll(clave).map(String).filter(Boolean);
    case "multipleRecordLinks":
      return form.getAll(clave).map(String).filter((id) => /^rec[A-Za-z0-9]{14}$/.test(id));
    default:
      return undefined;
  }
}
