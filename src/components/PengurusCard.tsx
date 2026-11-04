"use client";

import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial } from "@/lib/format";
import { tautanMedsos, usernameAman } from "@/lib/medsos";
import { useKartuBalik } from "@/lib/useKartuBalik";
import type { Penugasan } from "@/lib/types";

/**
 * Kartu pengurus yang membalik di tempat. Ukuran kartu tidak berubah.
 *  Depan   : foto, nama (satu baris, dipotong "..."), dan jabatan.
 *  Belakang: nama lengkap, jabatan, departemen, periode, dan media sosial.
 */
export default function PengurusCard({ p, periode }: { p: Penugasan; periode: string }) {
  const { terbalik, adaLanjut, isi, tombolDepan, tombolBalik, balik, cekGulir, tekanTombol } = useKartuBalik();
  const idBelakang = `belakang-${p.penugasan_id}`;

  const kelas = p.member_jenis === "IPNU" ? "ipnu" : "ippnu";
  const ig = usernameAman(p.instagram);
  const tt = usernameAman(p.tiktok);

  const logo =
    p.member_jenis === "IPNU" ? (
      <LogoIpnu size={30} alt={p.member_jenis} />
    ) : (
      <LogoIppnu size={30} alt={p.member_jenis} />
    );

  return (
    <li
      className={`px-kartu px-anggota-${kelas}${p.utama ? " px-kartu-utama" : ""}${terbalik ? " terbalik" : ""}`}
      onKeyDown={tekanTombol}
    >
      <div className="px-kartu-dalam">
        {/* ---------- Depan ---------- */}
        <div className="px-muka px-depan" inert={terbalik}>
          <div className="px-foto">
            {p.foto_url ? (
              <img src={p.foto_url} alt="" loading="lazy" />
            ) : (
              <div className="px-foto-kosong" aria-hidden="true">
                {inisial(p.nama)}
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
              aria-label={`Balik kartu ${p.nama}, ${p.jabatan}`}
              onClick={balik}
            >
              {p.nama}
            </button>
          </h3>
          <p className="px-jabatan-baris">
            <span className="px-jabatan">{p.jabatan}</span>
          </p>
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
            aria-label={`Detail ${p.nama}`}
          >
            <div className="px-balik-bar">
              <button type="button" ref={tombolBalik} className="px-balik" onClick={balik}>
                <span aria-hidden="true">‹</span> Kembali
              </button>
            </div>

            <p className="px-b-org">
              <span className="px-b-logo">{logo}</span>
              <span>{p.member_jenis}</span>
            </p>
            <h3 className="px-b-nama">{p.nama}</h3>
            <p className="px-b-jabatan">{p.jabatan}</p>
            <p className="px-b-ttl">{p.departemen}</p>
            <p className="px-b-ttl">Periode {periode}</p>

            {p.moto && <blockquote className="px-moto">“{p.moto}”</blockquote>}

            <h4 className="px-b-judul">Media sosial</h4>
            {ig || tt ? (
              <div className="px-medsos-belakang">
                {ig && (
                  <a href={tautanMedsos("instagram", ig)} target="_blank" rel="noopener noreferrer">
                    Instagram @{ig} ↗
                  </a>
                )}
                {tt && (
                  <a href={tautanMedsos("tiktok", tt)} target="_blank" rel="noopener noreferrer">
                    TikTok @{tt} ↗
                  </a>
                )}
              </div>
            ) : (
              <p className="px-b-kosong">Belum ada akun media sosial yang ditampilkan.</p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
