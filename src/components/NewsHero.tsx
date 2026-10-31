import Link from "next/link";
import Cover from "./Cover";
import { tanggal } from "@/lib/format";
import type { News } from "@/lib/types";

/** Berita utama di bagian atas halaman Berita. */
export default function NewsHero({ n }: { n: News }) {
  return (
    <section className="px-hero-berita" aria-labelledby="berita-utama">
      <Cover url={n.gambar_url} />
      <div className="px-hero-berita-teduh" aria-hidden="true" />
      <div className="wrap px-hero-berita-isi">
        <p className="px-chip">Berita terbaru</p>
        <h2 id="berita-utama">{n.judul}</h2>
        {n.ringkasan && <p className="px-hero-ringkas">{n.ringkasan}</p>}
        <div className="px-aksi">
          <Link href={`/berita/${n.slug}`} className="px-pil px-pil-kuning">
            Baca selengkapnya
          </Link>
          <span className="px-pil px-pil-garis">
            <time dateTime={n.tanggal_terbit}>{tanggal(n.tanggal_terbit)}</time>
          </span>
        </div>
      </div>
    </section>
  );
}
