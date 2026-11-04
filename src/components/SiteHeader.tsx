"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoIpnu, LogoIppnu } from "./Logo";

const items: { href: string; label: string; cta?: boolean }[] = [
  { href: "/", label: "Beranda" },
  { href: "/berita", label: "Berita" },
  { href: "/pengurus", label: "Pengurus" },
  { href: "/anggota", label: "Anggota" },
  { href: "/kas", label: "Kas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/galeri", label: "Galeri" },
  { href: "/daftar", label: "Daftar", cta: true },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);

  // Tutup menu setelah pindah halaman.
  useEffect(() => {
    setBuka(false);
  }, [pathname]);

  return (
    <header className="px-header">
      <div className="wrap px-bar">
        <Link href="/" className="px-brand" aria-label="IPNU IPPNU Ranting Kalimukti, ke beranda">
          <span className="px-brand-logo" aria-hidden="true">
            <LogoIpnu size={38} alt="" />
            <LogoIppnu size={38} alt="" />
          </span>
          <span className="px-brand-teks">
            <strong>IPNU IPPNU</strong>
            <span>Ranting Kalimukti</span>
          </span>
        </Link>
        <button
          type="button"
          className="px-menu-btn"
          aria-expanded={buka}
          aria-controls="menu-utama"
          onClick={() => setBuka((b) => !b)}
        >
          <span className="px-garis" aria-hidden="true" />
          Menu
        </button>
        <nav id="menu-utama" className={buka ? "px-nav buka" : "px-nav"} aria-label="Menu utama">
          {items.map((it) => {
            const aktif = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={it.cta ? "px-nav-cta" : undefined}
                aria-current={aktif ? "page" : undefined}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
