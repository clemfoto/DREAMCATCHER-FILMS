"use client";
import { useState, useTransition } from "react";
import { cancelarInvitacion, generarInvitacion } from "@/app/(app)/t/acceso";

export default function BotonesAcceso({
  id,
  mensaje,
  hayCodigo,
  cancelable,
  renovable,
  sinEmail,
}: {
  id: string;
  mensaje: string;
  hayCodigo: boolean;
  cancelable: boolean;
  renovable: boolean;
  sinEmail: boolean;
}) {
  const [pendiente, empezar] = useTransition();
  const [aviso, setAviso] = useState("");

  const compartir = async () => {
    try {
      if (navigator.share) await navigator.share({ text: mensaje });
      else {
        await navigator.clipboard.writeText(mensaje);
        setAviso("Mensaje copiado. Pégalo en WhatsApp o Telegram.");
      }
    } catch {
      /* el usuario cerró el menú de compartir */
    }
  };

  if (sinEmail) return <p className="error">Añade su email (Editar) para poder invitarle.</p>;

  return (
    <div className="acciones-acceso">
      {hayCodigo && (
        <button type="button" className="btn btn-primario" onClick={compartir}>
          Enviar invitación
        </button>
      )}
      {renovable && (
        <button
          type="button"
          className={`btn ${hayCodigo ? "btn-secundario" : "btn-primario"}`}
          disabled={pendiente}
          onClick={() => {
            if (hayCodigo && !confirm("¿Generar un código nuevo? El anterior dejará de valer.")) return;
            if (!hayCodigo && !confirm("Se creará un código personal. Si ya tenía contraseña, tendrá que crear otra con el código. ¿Seguir?")) return;
            empezar(() => generarInvitacion(id));
          }}
        >
          {hayCodigo ? "Nuevo código" : "Generar código de invitación"}
        </button>
      )}
      {cancelable && (
        <button
          type="button"
          className="btn btn-peligro"
          disabled={pendiente}
          onClick={() => {
            if (confirm("¿Cancelar su acceso? Su código y su contraseña dejarán de funcionar y se cerrará su sesión.")) {
              empezar(() => cancelarInvitacion(id));
            }
          }}
        >
          Cancelar acceso
        </button>
      )}
      {aviso && <p className="campo-ayuda">{aviso}</p>}
    </div>
  );
}
