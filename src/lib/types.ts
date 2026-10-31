export type Jenis = "IPNU" | "IPPNU";

export type Member = {
  id: string;
  nama: string;
  tempat_lahir: string | null;
  tanggal_lahir: string | null; // format YYYY-MM-DD
  jenis: Jenis;
  foto_url: string | null;
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
