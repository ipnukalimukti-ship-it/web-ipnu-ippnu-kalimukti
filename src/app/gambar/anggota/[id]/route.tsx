import { KartuGambar } from "@/lib/gambar/kartu";
import { ambilFoto, bacaFormat, namaBerkas, responsGambar } from "@/lib/gambar/muat";
import { getAnggotaById } from "@/lib/data";
import { inisial } from "@/lib/format";
import { jenjangValid } from "@/lib/kaderisasi";
import { UNDUH_GAMBAR_AKTIF } from "@/lib/fitur";
import { usernameAman } from "@/lib/medsos";

// Gambar kartu anggota (PNG). Hanya anggota yang tampil di website yang bisa dibuatkan gambar.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!UNDUH_GAMBAR_AKTIF) return new Response("Fitur ini belum aktif", { status: 404 });
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return new Response("Kartu tidak ditemukan", { status: 404 });

  const url = new URL(req.url);
  const format = bacaFormat(url.searchParams.get("format"));
  const m = await getAnggotaById(id);
  if (!m) return new Response("Kartu tidak ditemukan", { status: 404 });

  const ig = usernameAman(m.instagram);
  const tt = usernameAman(m.tiktok);
  const foto = await ambilFoto(m.foto_url);

  return responsGambar(
    KartuGambar({
      format,
      nama: m.nama,
      jenis: m.jenis,
      foto,
      inisial: inisial(m.nama),
      moto: m.moto,
      kaderisasi: jenjangValid(m.kaderisasi),
      medsos: [ig && `Instagram @${ig}`, tt && `TikTok @${tt}`].filter(Boolean) as string[],
      host: url.host,
    }),
    format,
    namaBerkas(m.nama, format),
    url.searchParams.get("unduh") === "1",
  );
}
