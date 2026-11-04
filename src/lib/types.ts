export type Jenis = "IPNU" | "IPPNU";

export type Member = {
  id: string;
  nama: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null; // format YYYY-MM-DD
  jenis: Jenis;
  foto_url: string | null;
  moto: string | null;
  kesan: string | null;
  pesan: string | null;
  hobi: string | null;
  cita_cita: string | null;
  kaderisasi: string[] | null; // contoh: ["Makesta", "Lakmud"]
  instagram: string | null; // username saja; null kalau medsos tidak ditampilkan
  tiktok: string | null;
};

/** Satu jabatan seseorang di satu periode (untuk riwayat kepengurusan di kartu anggota). */
export type Riwayat = {
  periode: string;
  departemen: string;
  jabatan: string;
};

export type JenisDepartemen = Jenis | "GABUNGAN";

export type Periode = {
  id: string;
  nama: string;
  sekarang: boolean;
};

/** Satu orang yang menjabat di satu departemen (baris dari view struktur_publik). */
export type Penugasan = {
  penugasan_id: string;
  periode_id: string;
  departemen_id: string;
  departemen: string;
  departemen_jenis: JenisDepartemen;
  departemen_urutan: number;
  member_id: string;
  nama: string;
  member_jenis: Jenis;
  foto_url: string | null;
  jabatan: string;
  utama: boolean;
  urutan: number;
  instagram: string | null; // username saja; null kalau medsos tidak ditampilkan
  tiktok: string | null;
  moto: string | null;
  periode_nama: string;
};

export type Struktur = {
  periode: Periode[];
  aktif: Periode | null;
  baris: Penugasan[];
};

export type News = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  isi: string;
  gambar_url: string | null;
  tanggal_terbit: string; // ISO
};

export type EventItem = {
  id: string;
  judul: string;
  deskripsi: string | null;
  lokasi: string | null;
  mulai: string; // ISO
  selesai: string | null;
};

export type Photo = {
  id: string;
  url: string;
  caption: string | null;
};

export type Album = {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string; // YYYY-MM-DD
  cover_url: string | null;
  photos: Photo[];
};

export type KasMonth = {
  bulan: string; // YYYY-MM-01
  masuk: number;
  keluar: number;
};

export type KasSummary = {
  saldo: number;
  bulanan: KasMonth[]; // terbaru di urutan pertama
};
