"use client";

import { useEffect, useRef, useState } from "react";
import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal } from "@/lib/format";
import { tautanMedsos, usernameAman } from "@/lib/medsos";
import type { Member } from "@/lib/types";

/** Tinggi paling besar kartu saat dibalik: sekitar 90% tinggi layar. Kalau isinya lebih panjang, bagian belakang bisa digulir. */
function tinggiMaks(): number {
  return Math.max(520, Math.round(window.innerHeight * 0.9));
}
// Lamanya animasi balik (harus sama dengan CSS .px-kartu-dalam).
const DURASI = 650;

/**
 * Kartu anggota yang membalik di tempat.
 *  Depan  : foto, nama (satu baris, dipotong "..."), medsos, tempat tanggal lahir.
 *  Belakang: nama lengkap, bio, prestasi dan kegiatan.
 */
export default function MemberCard({ m }: { m: Member }) {
  const [terbalik, setTerbalik] = useState(false);
  const dalam = useRef<HTMLDivElement>(null);
  const depan = useRef<HTMLDivElement>(null);
  const isi = useRef<HTMLDivElement>(null);
  const tombolDepan = useRef<HTMLButtonElement>(null);
  const tombolBalik = useRef<HTMLButtonElement>(null);
  const tinggiAsal = useRef(0);
  const pernahBalik = useRef(false);
  const idBelakang = `belakang-${m.id}`;

  const kelas = m.jenis === "IPNU" ? "ipnu" : "ippnu";
  const ttl = [m.tempat_lahir, m.tanggal_lahir ? tanggal(m.tanggal_lahir) : null]
    .filter(Boolean)
    .join(", ");
  const prestasi = (m.prestasi ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const ig = usernameAman(m.instagram);
  const tt = usernameAman(m.tiktok);
  const adaIsi = Boolean(m.bio) || prestasi.length > 0;

  const logo =
    m.jenis === "IPNU" ? (
      <LogoIpnu size={30} alt={m.jenis} />
    ) : (
      <LogoIppnu size={30} alt={m.jenis} />
    );

  /** Tinggi yang dibutuhkan sisi belakang (dibatasi tinggiMaks). */
  function tinggiTarget(): number {
    // +4 untuk garis tepi kartu (2 x 1,5px), supaya isi yang pas tidak jadi bisa digulir.
    return Math.min(tinggiMaks(), Math.max(tinggiAsal.current, (isi.current?.scrollHeight ?? 0) + 4));
  }

  function balik() {
    const el = dalam.current;
    if (!el) return;
    pernahBalik.current = true;

    if (!terbalik) {
      // Depan ke belakang: kartu tumbuh sampai muat seluruh isi belakang.
      tinggiAsal.current = depan.current?.offsetHeight ?? el.offsetHeight;
      el.style.height = `${tinggiAsal.current}px`;
      void el.offsetHeight; // paksa browser menghitung tinggi awal supaya animasinya jalan
      el.style.height = `${tinggiTarget()}px`;
      setTerbalik(true);
    } else {
      // Belakang ke depan: kartu kembali ke tinggi semula, lalu tinggi dibebaskan lagi.
      el.style.height = `${tinggiAsal.current}px`;
      setTerbalik(false);
      window.setTimeout(() => {
        if (dalam.current) dalam.current.style.height = "";
      }, DURASI + 60);
    }
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

  // Kalau layar berubah ukuran saat kartu terbuka, sesuaikan tingginya.
  useEffect(() => {
    if (!terbalik) return;
    const sesuaikan = () => {
      if (dalam.current) dalam.current.style.height = `${tinggiTarget()}px`;
    };
    window.addEventListener("resize", sesuaikan);
    return () => window.removeEventListener("resize", sesuaikan);
  }, [terbalik]);

  return (
    <li
      className={`px-kartu px-anggota-${kelas}${terbalik ? " terbalik" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && terbalik) balik();
      }}
    >
      <div className="px-kartu-dalam" ref={dalam}>
        {/* ---------- Depan ---------- */}
        <div className="px-muka px-depan" ref={depan} inert={terbalik}>
          <div className="px-foto">
            {m.foto_url ? (
              <img src={m.foto_url} alt="" loading="lazy" />
            ) : (
              <div className="px-foto-kosong" aria-hidden="true">
                {inisial(m.nama)}
              </div>
            )}
            <span className="px-foto-logo">{logo}</span>
          </div>

          <h3 className="px-nama">
            <button
              type="button"
              ref={tombolDepan}
              className="px-nama-tombol"
              aria-expanded={terbalik}
              aria-controls={idBelakang}
              aria-label={`Balik kartu ${m.nama}`}
              onClick={balik}
            >
              {m.nama}
            </button>
          </h3>

          <div className="px-medsos-depan">
            {ig && (
              <a
                href={tautanMedsos("instagram", ig)}
                target="_blank"
                rel="noopener noreferrer"
                title={`@${ig}`}
                aria-label={`Instagram ${m.nama}, @${ig}`}
              >
                Instagram
              </a>
            )}
            {tt && (
              <a
                href={tautanMedsos("tiktok", tt)}
                target="_blank"
                rel="noopener noreferrer"
                title={`@${tt}`}
                aria-label={`TikTok ${m.nama}, @${tt}`}
              >
                TikTok
              </a>
            )}
          </div>

          <p className="px-ttl">{ttl}</p>
          <span className="px-lihat" aria-hidden="true">
            Balik kartu ↻
          </span>
        </div>

        {/* ---------- Belakang ---------- */}
        <div className="px-muka px-belakang" id={idBelakang} inert={!terbalik}>
          <div className="px-belakang-isi" ref={isi}>
            <button type="button" ref={tombolBalik} className="px-balik" onClick={balik}>
              <span aria-hidden="true">‹</span> Kembali
            </button>

            <p className="px-b-org">
              <span className="px-b-logo">{logo}</span>
              <span>{m.jenis}</span>
            </p>
            <h3 className="px-b-nama">{m.nama}</h3>
            {ttl && <p className="px-b-ttl">{ttl}</p>}

            {m.bio && <p className="px-b-bio">{m.bio}</p>}

            {prestasi.length > 0 && (
              <section aria-label="Prestasi dan kegiatan">
                <h4 className="px-b-judul">Prestasi dan kegiatan</h4>
                <ul className="px-prestasi">
                  {prestasi.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {!adaIsi && <p className="px-b-kosong">Profil lengkap anggota ini belum diisi.</p>}
          </div>
        </div>
      </div>
    </li>
  );
}
