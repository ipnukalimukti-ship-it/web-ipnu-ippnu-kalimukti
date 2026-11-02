"use client";

import { useEffect, useRef, useState } from "react";

/** Lamanya animasi balik (harus sama dengan CSS .px-kartu-dalam). */
const DURASI = 650;

/**
 * Logika kartu yang membalik di tempat, dipakai kartu anggota dan kartu pengurus.
 * Ukuran kartu tidak berubah. Isi belakang yang panjang digulir di dalam kartu.
 */
export function useKartuBalik() {
  const [terbalik, setTerbalik] = useState(false);
  const [adaLanjut, setAdaLanjut] = useState(false);
  const isi = useRef<HTMLDivElement>(null);
  const tombolDepan = useRef<HTMLButtonElement>(null);
  const tombolBalik = useRef<HTMLButtonElement>(null);
  const pernahBalik = useRef(false);

  function balik() {
    pernahBalik.current = true;
    if (!terbalik && isi.current) isi.current.scrollTop = 0; // selalu mulai dari atas
    setTerbalik((t) => !t);
  }

  /** Tampilkan pudaran di bawah kalau isi masih bisa digulir ke bawah. */
  function cekGulir() {
    const e = isi.current;
    if (!e) return;
    setAdaLanjut(e.scrollHeight - e.scrollTop - e.clientHeight > 6);
  }

  // Pindahkan fokus ke sisi yang sedang terlihat (untuk pengguna keyboard dan pembaca layar).
  useEffect(() => {
    if (!pernahBalik.current) return;
    const t = window.setTimeout(
      () => (terbalik ? tombolBalik.current : tombolDepan.current)?.focus({ preventScroll: true }),
      terbalik ? DURASI / 2 : 0,
    );
    return () => window.clearTimeout(t);
  }, [terbalik]);

  // Cek apakah isi belakang perlu digulir (saat dibuka dan saat layar berubah ukuran).
  useEffect(() => {
    if (!terbalik) {
      setAdaLanjut(false);
      return;
    }
    const t = window.setTimeout(cekGulir, 30);
    window.addEventListener("resize", cekGulir);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", cekGulir);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terbalik]);

  /** Esc menutup kartu yang sedang terbalik. */
  function tekanTombol(e: React.KeyboardEvent) {
    if (e.key === "Escape" && terbalik) balik();
  }

  return { terbalik, adaLanjut, isi, tombolDepan, tombolBalik, balik, cekGulir, tekanTombol };
}
