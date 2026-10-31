import type { Metadata } from "next";
import Cover from "@/components/Cover";
import PageHead from "@/components/PageHead";
import { getAlbums } from "@/lib/data";
import { tanggal } from "@/lib/format";

export const revalidate = 60;
export const metadata: Metadata = { title: "Galeri" };

export default async function Galeri() {
  const albums = await getAlbums();
  return (
    <>
      <PageHead label="Dokumentasi" judul="Galeri">
        Dokumentasi kegiatan, satu album untuk tiap kegiatan.
      </PageHead>
      <div className="wrap px-seksi">
        {albums.length === 0 ? (
          <p className="px-kosong">Belum ada album foto.</p>
        ) : (
          <ul className="px-grid-album">
            {albums.map((a) => (
              <li key={a.id} className="px-album">
                <div className="px-album-sampul">
                  <Cover url={a.cover_url} />
                </div>
                <h3>{a.judul}</h3>
                <p className="px-rincian">{tanggal(a.tanggal)}</p>
                {a.deskripsi && <p className="px-rincian">{a.deskripsi}</p>}
                {a.photos.length > 0 && (
                  <div className="px-foto-grid">
                    {a.photos.slice(0, 8).map((p) => (
                      <img key={p.id} src={p.url} alt={p.caption ?? ""} loading="lazy" />
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
