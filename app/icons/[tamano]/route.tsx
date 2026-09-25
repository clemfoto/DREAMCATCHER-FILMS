import { ImageResponse } from "next/og";
import { LogoIcono } from "@/components/Logo";

/** /icons/192, /icons/512 y /icons/512m (maskable, con margen de seguridad). */
export async function GET(_: Request, { params }: { params: Promise<{ tamano: string }> }) {
  const { tamano } = await params;
  const maskable = tamano.endsWith("m");
  const s = Math.min(1024, Math.max(16, parseInt(tamano, 10) || 192));
  return new ImageResponse(<LogoIcono tamano={s} margen={maskable ? 0.1 : 0} />, {
    width: s,
    height: s,
    headers: { "Cache-Control": "public, max-age=86400, immutable" },
  });
}
