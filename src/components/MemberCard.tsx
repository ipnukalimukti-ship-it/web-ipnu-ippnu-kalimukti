"use client";

import { useEffect, useRef, useState } from "react";
import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal } from "@/lib/format";
import { tautanMedsos, usernameAman } from "@/lib/medsos";
import type { Member } from "@/lib/types";

// Lamanya animasi balik (harus sama dengan CSS .px-kartu-dalam).
const DURASI = 650;

/**
 * Kartu anggota yang membalik di tempat. Ukuran kartu tidak berubah.
 *  Depan   : foto, nama (satu baris, dipotong "..."), medsos, tempat tanggal lahir.
 *  Belakang: nama lengkap, bio, prestasi dan kegiatan. Kalau panjang, isinya digulir di dalam kartu.
 */
export default function MemberCard({ m }: { m: Member }) {
  const [terbalik, setTerbalik] = useState(false);
  const [adaLanjut, setAdaLanjut] = useState(false);
  const isi = useRef<HTMLDivElement>(null);
  const tombolDepan = useRef<HTMLButtonElement>(null);
  const tombolBalik = useRef<HTMLButtonElement>(null);
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
  }, [terbalik]);

  return (
    <li
      className={`px-kartu px-anggota-${kelas}${terbalik ? " terbalik" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape" && terbalik) balik();
      }}
    >
      <div className="px-kartu-dalam">
        {/* ---------- Depan ---------- */}
        <div className="px-muka px-depan" inert={terbalik}>
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
        <div
          className={`px-muka px-belakang${adaLanjut ? " ada-lanjut" : ""}`}
          id={idBelakang}
          inert={!terbalik}
        >
          <div
            className="px-belakang-isi"
            ref={isi}
            onScroll={cekGulir}
            tabIndex={0}
            role="region"
            aria-label={`Detail ${m.nama}`}
          >
            <div className="px-balik-bar">
              <button type="button" ref={tombolBalik} className="px-balik" onClick={balik}>
                <span aria-hidden="true">‹</span> Kembali
              </button>
            </div>

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
