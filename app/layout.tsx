import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import RegistrarSW from "@/components/RegistrarSW";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-titulo", display: "swap" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-texto", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Dreamcatcher Films", template: "%s · Dreamcatcher" },
  description: "Gestión interna de Dreamcatcher Films",
  applicationName: "Dreamcatcher",
  appleWebApp: { capable: true, title: "Dreamcatcher", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F2F5F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${hanken.variable}`}>
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  );
}
