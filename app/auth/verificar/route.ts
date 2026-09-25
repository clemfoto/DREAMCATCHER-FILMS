import { NextResponse, type NextRequest } from "next/server";
import { miembroPorEmail } from "@/lib/auth";
import { COOKIE_SESION, DURACION_SESION_S, firmarToken, verificarToken } from "@/lib/token";

export async function GET(req: NextRequest) {
  const p = verificarToken(req.nextUrl.searchParams.get("token") ?? undefined, "enlace");
  const miembro = p && (await miembroPorEmail(p.email));
  if (!p || !miembro) return NextResponse.redirect(new URL("/login?error=1", req.url));

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(COOKIE_SESION, firmarToken("sesion", miembro.email, DURACION_SESION_S), {
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_SESION_S,
  });
  return res;
}
