"use client";
import { useActionState, useEffect } from "react";
import { pedirEnlace, type EstadoLogin } from "./actions";

export default function LoginForm() {
  const [estado, accion, enviando] = useActionState<EstadoLogin, FormData>(pedirEnlace, {});
  useEffect(() => {
    if (estado.urlDev) window.location.href = estado.urlDev;
  }, [estado.urlDev]);
  if (estado.ok) {
    return (
      <div className="login-ok">
        <p className="login-ok-titulo">Revisa tu correo</p>
        <p className="muted">Si tu email está dado de alta en el equipo, te hemos enviado un enlace para entrar. Caduca en 15 minutos.</p>
      </div>
    );
  }
  return (
    <form action={accion} className="form">
      <label className="campo">
        <span className="campo-label">Email</span>
        <input className="input" type="email" name="email" autoComplete="email" inputMode="email" required placeholder="tu@email.com" />
      </label>
      {estado.error && <p className="error">{estado.error}</p>}
      <button className="btn btn-primario btn-bloque" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviarme un enlace"}
      </button>
    </form>
  );
}
