import type { Metadata } from "next";
import Link from "next/link";
import PageHead from "@/components/PageHead";
import PengurusCard from "@/components/PengurusCard";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";
import { getStruktur } from "@/lib/data";
import type { JenisDepartemen, Penugasan } from "@/lib/types";

export const metadata: Metadata = { title: "Struktur pengurus" };

type Props = { searchParams: Promise<{ periode?: string }> };

const ORGANISASI: { kode: JenisDepartemen; judul: string; ket: string }[] = [
  { kode: "IPNU", judul: "IPNU", ket: "Ikatan Pelajar Nahdlatul Ulama" },
  { kode: "IPPNU", judul: "IPPNU", ket: "Ikatan Pelajar Putri Nahdlatul Ulama" },
  { kode: "GABUNGAN", judul: "Gabungan", ket: "Dipegang bersama oleh IPNU dan IPPNU" },
];

type Kelompok = { id: string; nama: string; orang: Penugasan[] };

/** Kelompokkan per departemen. Urutan departemen mengikuti urutan dari database. */
function perDepartemen(baris: Penugasan[]): Kelompok[] {
  const peta = new Map<string, Kelompok>();
  for (const b of baris) {
    const k = peta.get(b.departemen_id) ?? { id: b.departemen_id, nama: b.departemen, orang: [] };
    k.orang.push(b);
    peta.set(b.departemen_id, k);
  }
  return Array.from(peta.values()).map((k) => ({
    ...k,
    // Pimpinan (ketua, koordinator) di depan, lalu menurut angka urutan.
    orang: [...k.orang].sort(
      (a, b) => Number(b.utama) - Number(a.utama) || a.urutan - b.urutan || a.nama.localeCompare(b.nama),
    ),
  }));
}

export default async function StrukturPengurus({ searchParams }: Props) {
  const { periode: pilih } = await searchParams;
  const { periode, aktif, baris } = await getStruktur(pilih);

  return (
    <>
      <PageHead label="Susunan pengurus" judul="Struktur kepengurusan">
        {aktif ? `Periode ${aktif.nama}. ` : ""}
        Klik kartu untuk melihat nama lengkap dan media sosial.
      </PageHead>
      <div className="wrap px-seksi">
        {periode.length > 1 && (
          <nav className="px-tab" aria-label="Pilih periode">
            {periode.map((p) => (
              <Link
                key={p.id}
                href={p.sekarang ? "/pengurus" : `/pengurus?periode=${p.id}`}
                aria-current={aktif?.id === p.id ? "true" : undefined}
              >
                {p.nama}
                {p.sekarang ? " (sekarang)" : ""}
              </Link>
            ))}
          </nav>
        )}

        {baris.length === 0 ? (
          <p className="px-kosong">Struktur pengurus untuk periode ini belum diisi.</p>
        ) : (
          ORGANISASI.map((org) => {
            const items = baris.filter((b) => b.departemen_jenis === org.kode);
            if (items.length === 0) return null;
            return (
              <section className="px-struktur" key={org.kode} aria-labelledby={`org-${org.kode}`}>
                <div className="px-struktur-kepala">
                  {org.kode === "IPNU" && <LogoIpnu size={48} alt="" />}
                  {org.kode === "IPPNU" && <LogoIppnu size={48} alt="" />}
                  {org.kode === "GABUNGAN" && (
                    <span className="px-logo-ganda" aria-hidden="true">
                      <LogoIpnu size={34} alt="" />
                      <LogoIppnu size={34} alt="" />
                    </span>
                  )}
                  <div>
                    <h2 id={`org-${org.kode}`}>{org.judul}</h2>
                    <p>{org.ket}</p>
                  </div>
                </div>
                {perDepartemen(items).map((dept) => (
                  <div key={dept.id}>
                    <h3 className="px-bagian">{dept.nama}</h3>
                    <ul className="px-grid-pengurus">
                      {dept.orang.map((o) => (
                        <PengurusCard key={o.penugasan_id} p={o} periode={aktif?.nama ?? ""} />
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
