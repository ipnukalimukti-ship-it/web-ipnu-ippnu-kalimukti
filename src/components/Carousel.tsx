"use client";

import Link from "next/link";
import { useRef } from "react";

type Props = {
  judul: string;
  tautan?: { href: string; label: string };
  children: React.ReactNode;
};

/** Baris kartu yang bisa digeser (jari, scroll, atau tombol panah). */
export default function Carousel({ judul, tautan, children }: Props) {
  const jalur = useRef<HTMLUListElement>(null);

  function geser(arah: 1 | -1) {
    const el = jalur.current;
    if (!el) return;
    el.scrollBy({ left: arah * Math.max(240, el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <div className="px-carousel">
      <div className="px-sek-kepala">
        <h2 className="px-label">
          {judul} <span aria-hidden="true">↗</span>
        </h2>
        <span className="px-sek-garis" aria-hidden="true" />
        {tautan && (
          <Link href={tautan.href} className="px-tautan-sek">
            {tautan.label}
          </Link>
        )}
        <div className="px-panah">
          <button type="button" onClick={() => geser(-1)} aria-label={`Geser ${judul} ke kiri`}>
            ‹
          </button>
          <button type="button" onClick={() => geser(1)} aria-label={`Geser ${judul} ke kanan`}>
            ›
          </button>
        </div>
      </div>
      <ul className="px-jalur" ref={jalur} tabIndex={0} aria-label={judul}>
        {children}
      </ul>
    </div>
  );
}
