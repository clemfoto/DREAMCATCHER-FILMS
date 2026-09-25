import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dreamcatcher Films",
    short_name: "Dreamcatcher",
    description: "Gestión interna de Dreamcatcher Films",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F4EF",
    theme_color: "#F6F4EF",
    lang: "es",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
      { src: "/icons/512m", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
