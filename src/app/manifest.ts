import type { MetadataRoute } from "next";

// Manifest PWA sesuai PRD: bisa dipasang di layar utama HP, warna tema hijau tua.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rifan Finance",
    short_name: "Rifan",
    description: "Setiap rupiah tercatat, setiap tujuan tercapai",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0B4D3B",
    theme_color: "#0B4D3B",
    lang: "id",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Transaksi", url: "/transaksi" },
      { name: "Notifikasi", url: "/notifikasi" },
    ],
  };
}
