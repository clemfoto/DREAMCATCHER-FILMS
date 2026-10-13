import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cada despliegue de Netlify tiene su ID: si una pestaña abierta es de una versión anterior,
  // Next.js recarga la página en lugar de fallar al enviar un formulario.
  deploymentId: process.env.DEPLOY_ID || undefined,
  experimental: {
    // Las fotos se comprimen en el móvil antes de subir; esto deja margen para PDFs pequeños.
    serverActions: { bodySizeLimit: "5mb" },
    // Permite forbidden() para los permisos por rol.
    authInterrupts: true,
  },
};

export default nextConfig;
