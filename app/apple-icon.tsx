import { ImageResponse } from "next/og";
import { LogoIcono } from "@/components/Logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  // iOS redondea las esquinas por su cuenta: icono cuadrado.
  return new ImageResponse(<LogoIcono tamano={180} margen={0.06} />, size);
}
