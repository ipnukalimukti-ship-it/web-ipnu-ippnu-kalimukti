import Link from "next/link";
import KasNota from "@/components/KasNota";
import AgendaList from "@/components/AgendaList";
import Carousel from "@/components/Carousel";
import NewsCard from "@/components/NewsCard";
import MemberCard from "@/components/MemberCard";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";
import { getKasSummary, getMembers, getNews, getRiwayat, getUpcomingEvents } from "@/lib/data";
import { ulangTahunBulanIni } from "@/lib/ulangtahun";
import { rupiah, tanggal } from "@/lib/format";

export const revalidate = 60;

export default async function Beranda() {
  const [kas, berita, agenda, anggota, riwayat] = await Promise.all([
    getKasSummary(),
    getNews(8),
    getUpcomingEvents(3),
    getMembers(),
    getRiwayat(),
  ]);
  const berikutnya = agenda[0];
  const ulangTahun = ulangTahunBulanIni(anggota);

  return (
    <>
      <section className="px-hero">
        <div className="wrap px-hero-grid">
          <div>
            <p className="px-chip">
              <span className="px-titik" aria-hidden="true" />
              Pelajar NU tingkat ranting
            </p>
            <h1>
              <span>IPNU</span>
              <span>IPPNU</span>
              <span className="px-kuning">Kalimukti</span>
            </h1>
            <p className="px-pengantar">
              Kabar kegiatan, jadwal agenda, daftar anggota, dan laporan kas yang terbuka untuk
              semua anggota.
            </p>
            <div className="px-aksi">
              <Link href="/agenda" className="px-pil px-pil-kuning">
                Lihat agenda
              </Link>
              <Link href="/daftar" className="px-pil px-pil-garis">
                Daftar jadi anggota
              </Link>
              <Link href="/berita" className="px-kotak-panah" aria-label="Baca berita terbaru">
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="px-hero-visual" aria-hidden="true">
            <LogoIpnu size={260} alt="" className="px-logo-a" />
            <LogoIppnu size={220} alt="" className="px-logo-b" />
          </div>
        </div>

        <div className="wrap">
          <ul className="px-statistik">
            <li>
              <Link href="/kas">
                <span className="px-stat-label">Saldo kas</span>
                <span className="px-stat-nilai angka">{rupiah(kas.saldo)}</span>
                <span className="px-stat-ket">Lihat laporan kas</span>
              </Link>
            </li>
            <li>
              <Link href="/anggota">
                <span className="px-stat-label">Anggota</span>
                <span className="px-stat-nilai angka">{anggota.length} orang</span>
                <span className="px-stat-ket">IPNU dan IPPNU</span>
              </Link>
            </li>
            <li>
              <Link href="/agenda">
                <span className="px-stat-label">Agenda berikutnya</span>
                <span className="px-stat-nilai px-stat-teks">
                  {berikutnya ? berikutnya.judul : "Belum ada jadwal"}
                </span>
                <span className="px-stat-ket">
                  {berikutnya ? tanggal(berikutnya.mulai) : "Cek lagi nanti"}
                </span>
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <div className="px-neon" aria-hidden="true" />

      <section className="px-seksi">
        <div className="wrap">
          {berita.length === 0 ? (
            <>
              <div className="px-sek-kepala">
                <h2 className="px-label">Berita terbaru</h2>
                <span className="px-sek-garis" aria-hidden="true" />
              </div>
              <p className="px-kosong">Belum ada berita yang diterbitkan.</p>
            </>
          ) : (
            <Carousel judul="Berita terbaru" tautan={{ href: "/berita", label: "Semua berita" }}>
              {berita.map((n) => (
                <NewsCard key={n.id} n={n} />
              ))}
            </Carousel>
          )}
        </div>
      </section>

      <section className="px-seksi">
        <div className="wrap">
          {anggota.length === 0 ? (
            <>
              <div className="px-sek-kepala">
                <h2 className="px-label">Daftar anggota</h2>
                <span className="px-sek-garis" aria-hidden="true" />
              </div>
              <p className="px-kosong">Belum ada anggota yang ditampilkan.</p>
            </>
          ) : (
            <Carousel judul="Daftar anggota" tautan={{ href: "/anggota", label: "Semua anggota" }}>
              {anggota.slice(0, 12).map((m) => (
                <MemberCard key={m.id} m={m} riwayat={riwayat[m.id]} />
              ))}
            </Carousel>
          )}
        </div>
      </section>

      {ulangTahun.daftar.length > 0 && (
        <section className="px-seksi" aria-labelledby="ultah-judul">
          <div className="wrap">
            <div className="px-sek-kepala">
              <h2 className="px-label" id="ultah-judul">
                Ulang tahun bulan {ulangTahun.namaBulan}
              </h2>
              <span className="px-sek-garis" aria-hidden="true" />
            </div>
            <ul className="px-ultah">
              {ulangTahun.daftar.slice(0, 12).map((u) => (
                <li key={u.id} className={u.hariIni ? "hari-ini" : undefined}>
                  <span className="px-ultah-tgl">
                    <span className="angka">{u.hari}</span>
                    <span>{ulangTahun.namaBulan.slice(0, 3)}</span>
                  </span>
                  <span className="px-ultah-nama">{u.nama}</span>
                  {u.hariIni && <span className="px-ultah-tanda">Hari ini</span>}
                </li>
              ))}
            </ul>
            {ulangTahun.daftar.length > 12 && (
              <p className="px-rincian" style={{ marginTop: 12 }}>
                dan {ulangTahun.daftar.length - 12} anggota lainnya.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="px-seksi">
        <div className="wrap px-dua-kolom">
          <div>
            <div className="px-sek-kepala">
              <h2 className="px-label">Agenda</h2>
              <span className="px-sek-garis" aria-hidden="true" />
              <Link href="/agenda" className="px-tautan-sek">
                Semua agenda
              </Link>
            </div>
            <AgendaList events={agenda} />
          </div>
          <KasNota kas={kas} />
        </div>
      </section>
    </>
  );
}
