import type { MetadataRoute } from "next";

// Supaya website bisa dipasang di layar HP seperti aplikasi.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IPNU IPPNU Ranting Kalimukti",
    short_name: "IPNU IPPNU",
    description: "Berita, agenda, anggota, pengurus, dan laporan kas IPNU IPPNU Ranting Kalimukti.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#050c08",
    theme_color: "#050c08",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
