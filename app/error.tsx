"use client";

/**
 * Error fuera de las secciones de la app (login, registro…). Lo más habitual es que la página
 * se abriera antes de publicar una versión nueva: recargarla del todo lo arregla.
 */
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <main className="login">
      <div className="login-caja">
        <h1 className="login-titulo">Algo ha fallado</h1>
        <p className="muted">
          Puede que la app se haya actualizado mientras tenías esta página abierta. Recárgala y vuelve a intentarlo.
          {error.digest && (
            <>
              <br />
              <small>Código: {error.digest}</small>
            </>
          )}
        </p>
        <button className="btn btn-primario btn-bloque" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    </main>
  );
}
