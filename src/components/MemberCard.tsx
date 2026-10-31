"use client";

import { useRef } from "react";
import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal } from "@/lib/format";
import { tautanMedsos, usernameAman } from "@/lib/medsos";
import type { Member } from "@/lib/types";

/**
 * Kartu anggota. Kalau diklik, kartu "terbuka" sebagai jendela detail
 * berisi foto besar, bio, prestasi dan kegiatan, serta akun medsos.
 */
export default function MemberCard({ m }: { m: Member }) {
  const jendela = useRef<HTMLDialogElement>(null);
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
  const adaIsi = Boolean(m.bio) || prestasi.length > 0 || Boolean(ig) || Boolean(tt);

  const logo =
    m.jenis === "IPNU" ? (
      <LogoIpnu size={30} alt={m.jenis} />
    ) : (
      <LogoIppnu size={30} alt={m.jenis} />
    );

  return (
    <li className={`px-anggota px-anggota-${kelas}`}>
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
      <h3>
        <button
          type="button"
          className="px-anggota-tombol"
          aria-haspopup="dialog"
          onClick={() => jendela.current?.showModal()}
        >
          {m.nama}
        </button>
      </h3>
      {ttl && <p>{ttl}</p>}
      <span className="px-lihat" aria-hidden="true">
        Lihat detail ›
      </span>

      <dialog
        ref={jendela}
        className="px-detail"
        aria-labelledby={`detail-${m.id}`}
        onClick={(e) => {
          // Klik di latar gelap (bukan di isi kartu) menutup jendela.
          if (e.target === e.currentTarget) jendela.current?.close();
        }}
      >
        <div className="px-detail-isi">
          <button
            type="button"
            className="px-tutup"
            aria-label={`Tutup detail ${m.nama}`}
            onClick={() => jendela.current?.close()}
          >
            ×
          </button>

          <div className="px-detail-foto">
            {m.foto_url ? (
              <img src={m.foto_url} alt={`Foto ${m.nama}`} loading="lazy" />
            ) : (
              <div className={`px-foto-kosong px-detail-kosong px-anggota-${kelas}`} aria-hidden="true">
                {inisial(m.nama)}
              </div>
            )}
          </div>

          <div className="px-detail-badan">
            <p className="px-detail-org">
              <span className="px-detail-logo">{logo}</span>
              <span>{m.jenis}</span>
            </p>
            <h2 id={`detail-${m.id}`}>{m.nama}</h2>
            {ttl && <p className="px-detail-ttl">{ttl}</p>}

            {m.bio && <p className="px-detail-bio">{m.bio}</p>}

            {prestasi.length > 0 && (
              <section aria-label="Prestasi dan kegiatan">
                <h3 className="px-detail-judul">Prestasi dan kegiatan</h3>
                <ul className="px-prestasi">
                  {prestasi.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
            )}

            {(ig || tt) && (
              <div className="px-medsos">
                {ig && (
                  <a
                    className="px-pil px-pil-garis px-pil-kecil"
                    href={tautanMedsos("instagram", ig)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Instagram @{ig} ↗
                  </a>
                )}
                {tt && (
                  <a
                    className="px-pil px-pil-garis px-pil-kecil"
                    href={tautanMedsos("tiktok", tt)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    TikTok @{tt} ↗
                  </a>
                )}
              </div>
            )}

            {!adaIsi && <p className="px-detail-kosong-teks">Profil lengkap anggota ini belum diisi.</p>}
          </div>
        </div>
      </dialog>
    </li>
  );
}
