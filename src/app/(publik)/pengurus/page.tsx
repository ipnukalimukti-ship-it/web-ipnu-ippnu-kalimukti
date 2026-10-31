import type { Metadata } from "next";
import PageHead from "@/components/PageHead";
import PengurusCard from "@/components/PengurusCard";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";
import { getPengurus } from "@/lib/data";
import type { Pengurus } from "@/lib/types";

export const revalidate = 60;
export const metadata: Metadata = { title: "Struktur pengurus" };

const ORGANISASI = [
  { kode: "IPNU", nama: "Ikatan Pelajar Nahdlatul Ulama" },
  { kode: "IPPNU", nama: "Ikatan Pelajar Putri Nahdlatul Ulama" },
] as const;

/** Kelompokkan per bagian. Urutan bagian mengikuti urutan orang pertamanya. */
function perBagian(items: Pengurus[]): [string, Pengurus[]][] {
  const peta = new Map<string, Pengurus[]>();
  for (const p of items) {
    const daftar = peta.get(p.bagian) ?? [];
    daftar.push(p);
    peta.set(p.bagian, daftar);
  }
  return Array.from(peta.entries());
}

export default async function StrukturPengurus() {
  const semua = await getPengurus();

  return (
    <>
      <PageHead label="Susunan pengurus" judul="Struktur kepengurusan">
        Pengurus IPNU dan IPPNU Ranting Kalimukti.
      </PageHead>
      <div className="wrap px-seksi">
        {semua.length === 0 ? (
          <p className="px-kosong">Struktur pengurus belum diisi.</p>
        ) : (
          ORGANISASI.map((org) => {
            const items = semua.filter((p) => p.jenis === org.kode);
            if (items.length === 0) return null;
            return (
              <section className="px-struktur" key={org.kode} aria-labelledby={`org-${org.kode}`}>
                <div className="px-struktur-kepala">
                  {org.kode === "IPNU" ? (
                    <LogoIpnu size={48} alt="" />
                  ) : (
                    <LogoIppnu size={48} alt="" />
                  )}
                  <div>
                    <h2 id={`org-${org.kode}`}>{org.kode}</h2>
                    <p>{org.nama}</p>
                  </div>
                </div>
                {perBagian(items).map(([bagian, orang]) => (
                  <div key={bagian}>
                    <h3 className="px-bagian">{bagian}</h3>
                    <ul className="px-grid-pengurus">
                      {orang.map((p) => (
                        <PengurusCard key={p.id} p={p} />
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
