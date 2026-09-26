import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <div className="login-caja">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-marca" src="/marca/logo.png" alt="Dreamcatcher Films" width={979} height={300} />
        <h1 className="sr-only">Dreamcatcher Films</h1>
        <p className="muted">Entra con el email con el que estás en el equipo.</p>
        {error && <p className="error">El enlace no es válido o ha caducado. Pide otro.</p>}
        <LoginForm />
      </div>
    </main>
  );
}
