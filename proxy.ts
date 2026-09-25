import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, verificarToken } from "@/lib/token";

/** Sin sesión válida, cualquier página lleva a /login. Los permisos por rol se comprueban en cada página. */
export function proxy(req: NextRequest) {
  const sesion = verificarToken(req.cookies.get(COOKIE_SESION)?.value, "sesion");
  if (sesion) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: [
    "/((?!login|auth/|offline|_next/|icons/|manifest.webmanifest|sw.js|favicon.ico|apple-icon|icon).*)",
  ],
};
