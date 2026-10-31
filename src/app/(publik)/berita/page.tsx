import type { Metadata } from "next";
import Link from "next/link";
import Carousel from "@/components/Carousel";
import NewsCard from "@/components/NewsCard";
import NewsHero from "@/components/NewsHero";
import PageHead from "@/components/PageHead";
import { getNews } from "@/lib/data";
import { bulanKey, bulanTahun } from "@/lib/format";

export const metadata: Metadata = { title: "Berita" };

type Props = { searchParams: Promise<{ bulan?: string }> };

export default async function Berita({ searchParams }: Props) {
  const { bulan } = await searchParams;
  const semua = await getNews(50);

  // Berita sudah urut dari yang terbaru, jadi urutan bulan juga dari yang terbaru.
  const bulanAda = Array.from(new Set(semua.map((n) => bulanKey(n.tanggal_terbit)))).slice(0, 6);
  const aktif = bulan && bulanAda.includes(bulan) ? bulan : "";
  const items = aktif ? semua.filter((n) => bulanKey(n.tanggal_terbit) === aktif) : semua;
  const [utama, ...lainnya] = items;
  const pilihan = lainnya.slice(0, 8);
  const arsip = lainnya.slice(8);

  if (!utama) {
    return (
      <>
        <PageHead label="Kabar ranting" judul="Berita">
          Kabar kegiatan dan pengumuman dari pengurus ranting.
        </PageHead>
        <div className="wrap px-seksi">
          <p className="px-kosong">Belum ada berita yang diterbitkan.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Berita</h1>
      <NewsHero n={utama} />

      <div className="wrap px-seksi">
        {bulanAda.length > 1 && (
          <nav className="px-tab" aria-label="Pilih bulan">
            <Link href="/berita" aria-current={aktif === "" ? "true" : undefined}>
              Semua
            </Link>
            {bulanAda.map((k) => (
              <Link
                key={k}
                href={`/berita?bulan=${k}`}
                aria-current={aktif === k ? "true" : undefined}
              >
                {bulanTahun(`${k}-15`)}
              </Link>
            ))}
          </nav>
        )}

        {pilihan.length > 0 && (
          <Carousel judul="Berita pilihan">
            {pilihan.map((n) => (
              <NewsCard key={n.id} n={n} />
            ))}
          </Carousel>
        )}

        {arsip.length > 0 && (
          <section className="px-arsip" aria-labelledby="arsip-judul">
            <div className="px-sek-kepala">
              <h2 className="px-label" id="arsip-judul">
                Arsip berita
              </h2>
              <span className="px-sek-garis" aria-hidden="true" />
            </div>
            <ul className="px-grid-poster">
              {arsip.map((n) => (
                <NewsCard key={n.id} n={n} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
