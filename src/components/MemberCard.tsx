"use client";

import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal } from "@/lib/format";
import { jenjangValid } from "@/lib/kaderisasi";
import { tautanMedsos, usernameAman } from "@/lib/medsos";
import { UNDUH_GAMBAR_AKTIF } from "@/lib/fitur";
import { useKartuBalik } from "@/lib/useKartuBalik";
import type { Member, Riwayat } from "@/lib/types";

/**
 * Kartu anggota yang membalik di tempat. Ukuran kartu tidak berubah.
 *  Depan   : foto, nama (satu baris, dipotong "..."), medsos, tempat tanggal lahir.
 *  Belakang: nama lengkap, moto, jenjang kaderisasi, riwayat kepengurusan, kesan, pesan,
 *            hobi, dan cita-cita. Kalau panjang, isinya digulir di dalam kartu.
 */
export default function MemberCard({ m, riwayat = [] }: { m: Member; riwayat?: Riwayat[] }) {
  const { terbalik, adaLanjut, isi, tombolDepan, tombolBalik, balik, cekGulir, tekanTombol } = useKartuBalik();
  const idBelakang = `belakang-${m.id}`;

  const kelas = m.jenis === "IPNU" ? "ipnu" : "ippnu";
  const ttl = [m.tempat_lahir, m.tanggal_lahir ? tanggal(m.tanggal_lahir) : null]
    .filter(Boolean)
    .join(", ");
  const ig = usernameAman(m.instagram);
  const tt = usernameAman(m.tiktok);
  const kader = jenjangValid(m.kaderisasi);
  const adaIsi =
    Boolean(m.moto || m.kesan || m.pesan || m.hobi || m.cita_cita) || kader.length > 0 || riwayat.length > 0;

  const logo =
    m.jenis === "IPNU" ? (
      <LogoIpnu size={30} alt={m.jenis} />
    ) : (
      <LogoIppnu size={30} alt={m.jenis} />
    );

  return (
    <li className={`px-kartu px-anggota-${kelas}${terbalik ? " terbalik" : ""}`} onKeyDown={tekanTombol}>
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
              {UNDUH_GAMBAR_AKTIF && (
                <a
                  className="px-unduh"
                  href={`/gambar/anggota/${m.id}?unduh=1`}
                  download
                  aria-label={`Unduh gambar kartu ${m.nama}`}
                >
                  <span aria-hidden="true">↓</span> Unduh
                </a>
              )}
            </div>

            <p className="px-b-org">
              <span className="px-b-logo">{logo}</span>
              <span>{m.jenis}</span>
            </p>
            <h3 className="px-b-nama">{m.nama}</h3>
            {ttl && <p className="px-b-ttl">{ttl}</p>}

            {m.moto && <blockquote className="px-moto">“{m.moto}”</blockquote>}

            {kader.length > 0 && (
              <section aria-label="Jenjang kaderisasi">
                <h4 className="px-b-judul">Kaderisasi</h4>
                <ul className="px-kader">
                  {kader.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </section>
            )}

            {riwayat.length > 0 && (
              <section aria-label="Riwayat kepengurusan">
                <h4 className="px-b-judul">Riwayat kepengurusan</h4>
                <ul className="px-riwayat">
                  {riwayat.map((r, i) => (
                    <li key={i}>
                      <strong>{r.jabatan}</strong>
                      <span>
                        {r.departemen}, {r.periode}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {m.kesan && (
              <section aria-label="Kesan">
                <h4 className="px-b-judul">Kesan</h4>
                <p className="px-b-teks">{m.kesan}</p>
              </section>
            )}

            {m.pesan && (
              <section aria-label="Pesan">
                <h4 className="px-b-judul">Pesan</h4>
                <p className="px-b-teks">{m.pesan}</p>
              </section>
            )}

            {(m.hobi || m.cita_cita) && (
              <dl className="px-fakta">
                {m.hobi && (
                  <div>
                    <dt>Hobi</dt>
                    <dd>{m.hobi}</dd>
                  </div>
                )}
                {m.cita_cita && (
                  <div>
                    <dt>Cita-cita</dt>
                    <dd>{m.cita_cita}</dd>
                  </div>
                )}
              </dl>
            )}

            {!adaIsi && <p className="px-b-kosong">Profil lengkap anggota ini belum diisi.</p>}

            {UNDUH_GAMBAR_AKTIF && (
              <p className="px-unduh-story">
                <a href={`/gambar/anggota/${m.id}?format=story&unduh=1`} download>
                  Unduh ukuran story
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
