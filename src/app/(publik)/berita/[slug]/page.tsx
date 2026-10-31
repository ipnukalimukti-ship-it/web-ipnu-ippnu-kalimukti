import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsBySlug } from "@/lib/data";
import { tanggal } from "@/lib/format";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const n = await getNewsBySlug(slug);
  return { title: n?.judul ?? "Berita", description: n?.ringkasan ?? undefined };
}

export default async function DetailBerita({ params }: Props) {
  const { slug } = await params;
  const n = await getNewsBySlug(slug);
  if (!n) notFound();

  const paragraf = n.isi.split(/\n{2,}/).filter(Boolean);

  return (
    <>
      <header className="px-kepala">
        <div className="wrap px-artikel-lebar">
          <Link href="/berita" className="px-pil px-pil-garis px-pil-kecil">
            ← Kembali ke berita
          </Link>
          <h1 className="px-judul-artikel">{n.judul}</h1>
          <p className="px-kepala-ket">
            <time dateTime={n.tanggal_terbit}>{tanggal(n.tanggal_terbit)}</time>
          </p>
        </div>
      </header>
      <article className="wrap px-artikel-lebar px-artikel">
        {n.gambar_url && <img className="px-artikel-gambar" src={n.gambar_url} alt="" />}
        {paragraf.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </>
  );
}
