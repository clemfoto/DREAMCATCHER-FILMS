import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="login-caja">
        <div className="login-logo" aria-hidden>DF</div>
        <h1 className="login-titulo">Dreamcatcher Films</h1>
        <p className="muted">Entra con el email con el que estás en el equipo.</p>
        {error && <p className="error">El enlace no es válido o ha caducado. Pide otro.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
