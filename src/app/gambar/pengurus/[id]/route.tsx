import { KartuGambar } from "@/lib/gambar/kartu";
import { ambilFoto, bacaFormat, namaBerkas, responsGambar } from "@/lib/gambar/muat";
import { getPenugasanById } from "@/lib/data";
import { inisial } from "@/lib/format";
import { UNDUH_GAMBAR_AKTIF } from "@/lib/fitur";
import { usernameAman } from "@/lib/medsos";

// Gambar kartu pengurus (PNG). Hanya pengurus yang tampil di website yang bisa dibuatkan gambar.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!UNDUH_GAMBAR_AKTIF) return new Response("Fitur ini belum aktif", { status: 404 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return new Response("Kartu tidak ditemukan", { status: 404 });

  const url = new URL(req.url);
  const format = bacaFormat(url.searchParams.get("format"));
  const p = await getPenugasanById(id);
  if (!p) return new Response("Kartu tidak ditemukan", { status: 404 });

  const ig = usernameAman(p.instagram);
  const tt = usernameAman(p.tiktok);
  const foto = await ambilFoto(p.foto_url);

  return responsGambar(
    KartuGambar({
      format,
      nama: p.nama,
      jenis: p.member_jenis,
      foto,
      inisial: inisial(p.nama),
      jabatan: p.jabatan,
      keterangan: [p.departemen, `Periode ${p.periode_nama}`],
      moto: p.moto,
      medsos: [ig && `Instagram @${ig}`, tt && `TikTok @${tt}`].filter(Boolean) as string[],
      host: url.host,
    }),
    format,
    namaBerkas(p.nama, format),
    url.searchParams.get("unduh") === "1",
  );
}
