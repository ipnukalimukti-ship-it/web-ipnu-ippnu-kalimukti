// Data contoh untuk mode demo (saat Supabase belum disambungkan).
// Semua nama dan angka di sini hanya contoh, bukan data asli.
import type { Album, EventItem, KasMonth, Member, News, Penugasan, Periode, Struktur } from "./types";

const polos = { bio: null, prestasi: null, instagram: null, tiktok: null };

export const members: Member[] = [
  {
    id: "m1", nama: "Ahmad Fauzan", tempat_lahir: "Kuningan", tanggal_lahir: "2008-03-14", jenis: "IPNU", foto_url: null,
    bio: "Aktif di kegiatan hadroh dan suka mengurus dokumentasi kegiatan ranting. Ini data contoh.",
    prestasi: "Juara 1 lomba hadroh tingkat kecamatan 2025\nPanitia Hari Santri 2025\nPeserta Makesta angkatan pertama",
    instagram: "fauzan.contoh", tiktok: "fauzan.contoh",
  },
  { id: "m2", nama: "Siti Nurhalimah", tempat_lahir: "Kuningan", tanggal_lahir: "2009-07-02", jenis: "IPPNU", foto_url: null,
    bio: "Bendahara kelas dan gemar menulis. Ini data contoh.", prestasi: "Juara 2 lomba karya tulis pelajar 2025", instagram: "siti.contoh", tiktok: null },
  { id: "m3", nama: "Muhammad Rizki", tempat_lahir: "Cirebon", tanggal_lahir: "2007-11-23", jenis: "IPNU", foto_url: null, ...polos },
  { id: "m4", nama: "Aisyah Putri Rahma", tempat_lahir: "Kuningan", tanggal_lahir: "2008-01-30", jenis: "IPPNU", foto_url: null, ...polos },
  { id: "m5", nama: "Dimas Prasetyo", tempat_lahir: "Kuningan", tanggal_lahir: "2009-05-18", jenis: "IPNU", foto_url: null, ...polos },
  { id: "m6", nama: "Nabila Azzahra", tempat_lahir: "Majalengka", tanggal_lahir: "2008-09-09", jenis: "IPPNU", foto_url: null, ...polos },
  { id: "m7", nama: "Farhan Maulana", tempat_lahir: "Kuningan", tanggal_lahir: "2007-12-04", jenis: "IPNU", foto_url: null, ...polos },
  { id: "m8", nama: "Lutfiah Rosyidah", tempat_lahir: "Kuningan", tanggal_lahir: "2009-02-21", jenis: "IPPNU", foto_url: null, ...polos },
  {
    id: "m9", nama: "Muhammad Abdurrahman Al-Ghifari Prasetyo Nugroho", tempat_lahir: "Kuningan", tanggal_lahir: "2008-08-17", jenis: "IPNU", foto_url: null,
    bio: "Contoh nama panjang. Di depan kartu namanya dipotong satu baris, dan nama lengkapnya baru terlihat di sisi belakang ini. Ini data contoh.",
    prestasi: "Juara 1 lomba pidato bahasa Arab tingkat kabupaten 2025\nJuara 2 musabaqah tilawatil Quran tingkat kecamatan 2024\nKetua panitia Hari Santri 2025\nPeserta pelatihan kader PKPNU angkatan pertama\nDelegasi konferensi ranting 2026",
    instagram: "abdurrahman.contoh", tiktok: "abdurrahman.contoh",
  },
];

export const periode: Periode[] = [
  { id: "per-2", nama: "2025-2027", sekarang: true },
  { id: "per-1", nama: "2023-2025", sekarang: false },
];

type Bantu = Pick<Penugasan, "nama" | "member_jenis" | "jabatan" | "utama" | "urutan"> &
  Partial<Pick<Penugasan, "instagram" | "tiktok">>;

function tugas(periode_id: string, departemen_id: string, departemen: string, jenis: Penugasan["departemen_jenis"], dUrut: number, orang: Bantu[]): Penugasan[] {
  return orang.map((o, i) => ({
    penugasan_id: `${departemen_id}-${i}`,
    periode_id,
    departemen_id,
    departemen,
    departemen_jenis: jenis,
    departemen_urutan: dUrut,
    foto_url: null,
    member_id: `${departemen_id}-m${i}`,
    instagram: null,
    tiktok: null,
    ...o,
  }));
}

const strukturSekarang: Penugasan[] = [
  ...tugas("per-2", "d1", "BPH", "IPNU", 10, [
    { nama: "Harun", member_jenis: "IPNU", jabatan: "Ketua", utama: true, urutan: 10, instagram: "harun.contoh" },
    { nama: "Hasan", member_jenis: "IPNU", jabatan: "Wakil Ketua", utama: true, urutan: 20 },
    { nama: "Fakhrurroji", member_jenis: "IPNU", jabatan: "Sekretaris", utama: true, urutan: 30, tiktok: "fakhrurroji.contoh" },
    { nama: "Azam", member_jenis: "IPNU", jabatan: "Bendahara", utama: true, urutan: 40 },
  ]),
  ...tugas("per-2", "d2", "Departemen Media", "IPNU", 20, [
    { nama: "Ismat", member_jenis: "IPNU", jabatan: "Koordinator", utama: true, urutan: 10, instagram: "ismat.contoh", tiktok: "ismat.contoh" },
    { nama: "Dimas Prasetyo", member_jenis: "IPNU", jabatan: "Anggota", utama: false, urutan: 20 },
    { nama: "Farhan Maulana", member_jenis: "IPNU", jabatan: "Anggota", utama: false, urutan: 30 },
    { nama: "Muhammad Abdurrahman Al-Ghifari Prasetyo Nugroho", member_jenis: "IPNU", jabatan: "Anggota dan Desainer Grafis", utama: false, urutan: 40, instagram: "abdurrahman.contoh" },
  ]),
  ...tugas("per-2", "d3", "Departemen Kaderisasi", "IPNU", 30, [
    { nama: "Ahmad Fauzan", member_jenis: "IPNU", jabatan: "Koordinator", utama: true, urutan: 10 },
    { nama: "Muhammad Rizki", member_jenis: "IPNU", jabatan: "Anggota", utama: false, urutan: 20 },
  ]),
  ...tugas("per-2", "d4", "BPH", "IPPNU", 10, [
    { nama: "Sulis", member_jenis: "IPPNU", jabatan: "Ketua", utama: true, urutan: 10 },
    { nama: "Siti Nurhalimah", member_jenis: "IPPNU", jabatan: "Sekretaris", utama: true, urutan: 20, instagram: "siti.contoh" },
  ]),
  ...tugas("per-2", "d5", "Departemen Media", "IPPNU", 20, [
    { nama: "Nabila Azzahra", member_jenis: "IPPNU", jabatan: "Koordinator", utama: true, urutan: 10 },
    { nama: "Lutfiah Rosyidah", member_jenis: "IPPNU", jabatan: "Anggota", utama: false, urutan: 20 },
  ]),
  ...tugas("per-2", "d6", "Pembina", "GABUNGAN", 90, [
    { nama: "Aisyah Putri Rahma", member_jenis: "IPPNU", jabatan: "Koordinator", utama: true, urutan: 10 },
  ]),
];

const strukturLama: Penugasan[] = [
  ...tugas("per-1", "e1", "BPH", "IPNU", 10, [
    { nama: "Contoh Pengurus Lama", member_jenis: "IPNU", jabatan: "Ketua", utama: true, urutan: 10 },
  ]),
];

export function struktur(periodeId?: string): Struktur {
  const aktif = periode.find((p) => p.id === periodeId) ?? periode.find((p) => p.sekarang) ?? periode[0] ?? null;
  const baris = aktif?.id === "per-1" ? strukturLama : aktif?.id === "per-2" ? strukturSekarang : [];
  return { periode, aktif, baris };
}

export const news: News[] = [
  {
    id: "n1",
    judul: "Rapat kerja ranting membahas program kerja satu tahun",
    slug: "rapat-kerja-ranting-program-satu-tahun",
    ringkasan:
      "Pengurus dan perwakilan anggota menyusun program kerja, jadwal kaderisasi, dan target iuran untuk satu tahun ke depan.",
    isi:
      "Ini adalah berita contoh.\n\nPengurus dan perwakilan anggota berkumpul untuk menyusun program kerja. Pembahasan mencakup jadwal kaderisasi, kegiatan sosial, dan besaran iuran anggota.\n\nHasil rapat akan diumumkan lewat website ini dan grup anggota.",
    gambar_url: null,
    tanggal_terbit: "2026-10-24T09:00:00+07:00",
  },
  {
    id: "n2",
    judul: "Peringatan Hari Santri bersama warga dusun",
    slug: "peringatan-hari-santri-bersama-warga",
    ringkasan: "Anggota ikut apel, pawai, dan pengajian bersama masyarakat sekitar.",
    isi:
      "Ini adalah berita contoh.\n\nAnggota IPNU dan IPPNU ikut serta dalam rangkaian peringatan Hari Santri bersama warga. Kegiatan diisi dengan apel, pawai, dan pengajian.",
    gambar_url: null,
    tanggal_terbit: "2026-10-22T16:30:00+07:00",
  },
  {
    id: "n3",
    judul: "Pendaftaran peserta Makesta angkatan baru",
    slug: "pendaftaran-makesta-angkatan-baru",
    ringkasan: "Calon anggota baru bisa mendaftar lewat pengurus ranting.",
    isi:
      "Ini adalah berita contoh.\n\nRanting membuka pendaftaran Masa Kesetiaan Anggota (Makesta) untuk calon anggota baru. Pendaftaran lewat pengurus ranting.",
    gambar_url: null,
    tanggal_terbit: "2026-10-15T08:00:00+07:00",
  },
];

export const events: EventItem[] = [
  {
    id: "e1",
    judul: "Rapat rutin bulanan",
    deskripsi: "Evaluasi kegiatan bulan lalu dan pembagian tugas.",
    lokasi: "Sekretariat ranting",
    mulai: "2026-11-08T19:30:00+07:00",
    selesai: null,
  },
  {
    id: "e2",
    judul: "Kerja bakti dan bersih masjid",
    deskripsi: "Seluruh anggota diminta membawa peralatan kebersihan.",
    lokasi: "Masjid dusun",
    mulai: "2026-11-15T07:00:00+07:00",
    selesai: null,
  },
  {
    id: "e3",
    judul: "Pengajian dan pembacaan sholawat",
    deskripsi: null,
    lokasi: "Mushola",
    mulai: "2026-11-28T19:00:00+07:00",
    selesai: null,
  },
];

export const albums: Album[] = [
  {
    id: "a1",
    judul: "Peringatan Hari Santri 2026",
    deskripsi: "Dokumentasi apel dan pawai.",
    tanggal: "2026-10-22",
    cover_url: null,
    photos: [],
  },
  {
    id: "a2",
    judul: "Rapat kerja ranting",
    deskripsi: null,
    tanggal: "2026-10-24",
    cover_url: null,
    photos: [],
  },
];

export const kasBulanan: KasMonth[] = [
  { bulan: "2026-10-01", masuk: 450000, keluar: 120000 },
  { bulan: "2026-09-01", masuk: 380000, keluar: 260000 },
  { bulan: "2026-08-01", masuk: 400000, keluar: 90000 },
  { bulan: "2026-07-01", masuk: 300000, keluar: 50000 },
];
