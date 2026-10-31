import Link from "next/link";
import Cover from "./Cover";
import { tanggal } from "@/lib/format";
import type { News } from "@/lib/types";

/** Kartu berita bergaya poster: gambar penuh, judul di bagian bawah. */
export default function NewsCard({ n }: { n: News }) {
  return (
    <li className="px-poster">
      <Link href={`/berita/${n.slug}`} className="px-poster-tautan">
        <Cover url={n.gambar_url} />
        <div className="px-poster-isi">
          <time dateTime={n.tanggal_terbit}>{tanggal(n.tanggal_terbit)}</time>
          <h3>{n.judul}</h3>
        </div>
      </Link>
    </li>
  );
}
