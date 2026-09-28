import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Entrar" };

export default function Login() {
  return (
    <main className="login">
      <div className="login-caja">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="login-marca" src="/marca/logo.png" alt="Dreamcatcher Films" width={979} height={300} />
        <h1 className="sr-only">Dreamcatcher Films</h1>
        <LoginForm />
        <p className="login-pie muted">
          ¿Primera vez o te dieron un código nuevo? <Link href="/registro">Usar mi código de invitación</Link>
        </p>
      </div>
    </main>
  );
}
