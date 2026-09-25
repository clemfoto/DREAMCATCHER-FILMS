import "server-only";

/** Envía el enlace mágico con la API de Resend. */
export async function enviarEnlace(para: string, nombre: string, url: string): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Faltan AUTH_RESEND_KEY o EMAIL_FROM.");
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#F6F4EF;padding:32px">
      <div style="max-width:420px;margin:auto;background:#fff;border:1px solid #E3DED4;border-radius:16px;padding:28px">
        <h1 style="font-family:Georgia,serif;font-weight:500;color:#1C1B19;font-size:24px;margin:0 0 12px">Dreamcatcher Films</h1>
        <p style="color:#5E584F;font-size:16px;line-height:1.5">Hola ${nombre.replace(/[<>&"]/g, "")}, toca el botón para entrar en la app. El enlace caduca en 15 minutos.</p>
        <a href="${url}" style="display:inline-block;margin-top:12px;background:#A04A18;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:16px">Entrar</a>
        <p style="color:#5E584F;font-size:13px;margin-top:24px">Si no has pedido este enlace, ignora este correo.</p>
      </div>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [para], subject: "Tu enlace para entrar — Dreamcatcher Films", html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
