// Semua pembacaan data publik lewat file ini.
// - Mode demo (Supabase belum diisi): pakai data contoh dari sample.ts.
// - Mode nyata: baca dari Supabase. Kalau query gagal, error dilempar
//   (data contoh TIDAK dipakai sebagai cadangan, supaya angka kas palsu
//   tidak pernah tampil di website yang sudah live).
import { getSupabase } from "./supabase";
import * as sample from "./sample";
import type { Album, EventItem, KasSummary, Member, News, Penugasan, Periode, Struktur } from "./types";

function check(res: { data: unknown; error: { message: string } | null }): unknown {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Buang karakter yang punya arti khusus di pencarian ilike. */
function bersihkanCari(q: string): string {
  return q.replace(/[%_,()\\]/g, " ").trim();
}

export async function getMembers(opts: { jenis?: string; q?: string } = {}): Promise<Member[]> {
  const jenis = opts.jenis === "IPNU" || opts.jenis === "IPPNU" ? opts.jenis : undefined;
  const q = opts.q ? bersihkanCari(opts.q) : "";
  const db = getSupabase();

  if (!db) {
    return sample.members
      .filter((m) => (jenis ? m.jenis === jenis : true))
      .filter((m) => (q ? m.nama.toLowerCase().includes(q.toLowerCase()) : true));
  }

  let query = db
    .from("members_public")
    .select("id,nama,tempat_lahir,tanggal_lahir,jenis,foto_url,bio,prestasi,instagram,tiktok")
    .order("nama");
  if (jenis) query = query.eq("jenis", jenis);
  if (q) query = query.ilike("nama", `%${q}%`);
  return (check(await query) as Member[] | null) ?? [];
}

/** Struktur kepengurusan untuk satu periode (bawaan: periode yang ditandai "sekarang"). */
export async function getStruktur(periodeId?: string): Promise<Struktur> {
  const db = getSupabase();
  if (!db) return sample.struktur(periodeId);

  const pr = await db
    .from("periode")
    .select("id,nama,sekarang")
    .order("sekarang", { ascending: false })
    .order("nama", { ascending: false });
  const periode = (check(pr) as Periode[] | null) ?? [];
  const aktif = periode.find((p) => p.id === periodeId) ?? periode.find((p) => p.sekarang) ?? periode[0] ?? null;
  if (!aktif) return { periode, aktif: null, baris: [] };

  const rs = await db
    .from("struktur_publik")
    .select(
      "penugasan_id,periode_id,departemen_id,departemen,departemen_jenis,departemen_urutan,member_id,nama,member_jenis,foto_url,jabatan,utama,urutan,instagram,tiktok",
    )
    .eq("periode_id", aktif.id)
    .order("departemen_urutan", { ascending: true })
    .order("urutan", { ascending: true })
    .order("nama", { ascending: true });
  return { periode, aktif, baris: (check(rs) as Penugasan[] | null) ?? [] };
}

export async function getNews(limit = 20): Promise<News[]> {
  const db = getSupabase();
  if (!db) return sample.news.slice(0, limit);

  const res = await db
    .from("news")
    .select("id,judul,slug,ringkasan,isi,gambar_url,tanggal_terbit")
    .eq("terbit", true)
    .order("tanggal_terbit", { ascending: false })
    .limit(limit);
  return (check(res) as News[] | null) ?? [];
}

export async function getNewsBySlug(slug: string): Promise<News | null> {
  const db = getSupabase();
  if (!db) return sample.news.find((n) => n.slug === slug) ?? null;

  const res = await db
    .from("news")
    .select("id,judul,slug,ringkasan,isi,gambar_url,tanggal_terbit")
    .eq("terbit", true)
    .eq("slug", slug)
    .maybeSingle();
  return check(res) as News | null;
}

export async function getUpcomingEvents(limit = 20): Promise<EventItem[]> {
  const db = getSupabase();
  const now = new Date();
  if (!db) {
    return sample.events
      .filter((e) => new Date(e.mulai) >= now)
      .sort((a, b) => a.mulai.localeCompare(b.mulai))
      .slice(0, limit);
  }

  const res = await db
    .from("events")
    .select("id,judul,deskripsi,lokasi,mulai,selesai")
    .gte("mulai", now.toISOString())
    .order("mulai", { ascending: true })
    .limit(limit);
  return (check(res) as EventItem[] | null) ?? [];
}

export async function getAlbums(limit = 30): Promise<Album[]> {
  const db = getSupabase();
  if (!db) return sample.albums.slice(0, limit);

  const res = await db
    .from("gallery_albums")
    .select("id,judul,deskripsi,tanggal,cover_url,photos:gallery_photos(id,url,caption)")
    .order("tanggal", { ascending: false })
    .limit(limit);
  return (check(res) as Album[] | null) ?? [];
}

export async function getKasSummary(): Promise<KasSummary> {
  const db = getSupabase();
  if (!db) {
    const saldo = sample.kasBulanan.reduce((s, m) => s + m.masuk - m.keluar, 0);
    return { saldo, bulanan: sample.kasBulanan };
  }

  const [bulanRes, saldoRes] = await Promise.all([
    db
      .from("kas_ringkasan_bulanan")
      .select("bulan,masuk,keluar")
      .order("bulan", { ascending: false })
      .limit(12),
    db.from("kas_saldo").select("saldo").maybeSingle(),
  ]);

  const bulanan = (check(bulanRes) as { bulan: string; masuk: number; keluar: number }[] | null) ?? [];
  const saldoRow = check(saldoRes) as { saldo: number } | null;

  return {
    saldo: Number(saldoRow?.saldo ?? 0),
    bulanan: bulanan.map((b) => ({
      bulan: b.bulan,
      masuk: Number(b.masuk),
      keluar: Number(b.keluar),
    })),
  };
}
