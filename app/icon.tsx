import { ImageResponse } from "next/og";
import { LogoIcono } from "@/components/Logo";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<LogoIcono tamano={64} />, size);
}
