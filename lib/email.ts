import "server-only";

/** Envía el enlace mágico con la API de Resend. */
export async function enviarEnlace(para: string, nombre: string, url: string): Promise<void> {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) throw new Error("Faltan AUTH_RESEND_KEY o EMAIL_FROM.");
  const logo = `${new URL(url).origin}/marca/logo.png`;
  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;background:#F2F5F5;padding:32px">
      <div style="max-width:420px;margin:auto;background:#fff;border:1px solid #DDE4E5;border-radius:16px;padding:28px">
        <img src="${logo}" alt="Dreamcatcher Films" width="200" style="display:block;margin:0 0 20px;height:auto" />
        <p style="color:#687175;font-size:16px;line-height:1.5">Hola ${nombre.replace(/[<>&"]/g, "")}, toca el botón para entrar en la app. El enlace caduca en 15 minutos.</p>
        <a href="${url}" style="display:inline-block;margin-top:12px;background:#4A565D;color:#fff;text-decoration:none;padding:14px 22px;border-radius:12px;font-size:16px">Entrar</a>
        <p style="color:#687175;font-size:13px;margin-top:24px">Si no has pedido este enlace, ignora este correo.</p>
      </div>
    </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [para], subject: "Tu enlace para entrar — Dreamcatcher Films", html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}
