import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShapersAI Cost Engine",
    short_name: "ShapersAI",
    description: "Scan receipts and keep business costs current.",
    start_url: "/dashboard/scan",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2e9",
    theme_color: "#f6f2e9",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
