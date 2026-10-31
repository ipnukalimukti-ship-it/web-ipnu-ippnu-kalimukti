import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/public-sans";
import "./globals.css";
import "./publik.css";

export const metadata: Metadata = {
  title: {
    default: "IPNU IPPNU Ranting Kalimukti",
    template: "%s | IPNU IPPNU Kalimukti",
  },
  description:
    "Website resmi IPNU dan IPPNU Ranting Kalimukti: berita, agenda, daftar anggota, dan laporan kas.",
};

// Layout dasar saja. Header dan footer publik ada di (publik)/layout.tsx,
// tampilan admin ada di admin/layout.tsx.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
