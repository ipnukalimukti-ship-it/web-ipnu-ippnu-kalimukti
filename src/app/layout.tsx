import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import "./publik.css";
import DaftarkanSW from "@/components/DaftarkanSW";

export const metadata: Metadata = {
  title: {
    default: "IPNU IPPNU Ranting Kalimukti",
    template: "%s | IPNU IPPNU Kalimukti",
  },
  description:
    "Website resmi IPNU dan IPPNU Ranting Kalimukti: berita, agenda, daftar anggota, dan laporan kas.",
};

export const viewport: Viewport = {
  themeColor: "#050c08",
};

// Layout dasar saja. Header dan footer publik ada di (publik)/layout.tsx,
// tampilan admin ada di admin/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        {children}
        <DaftarkanSW />
      </body>
    </html>
  );
}
