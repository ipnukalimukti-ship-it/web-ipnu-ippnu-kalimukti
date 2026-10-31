// Data contoh untuk mode demo (saat Supabase belum disambungkan).
// Semua nama dan angka di sini hanya contoh, bukan data asli.
import type { Album, EventItem, KasMonth, Member, News, Pengurus } from "./types";

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
];

export const pengurus: Pengurus[] = [
  { id: "p1", nama: "Harun", jabatan: "Ketua", bagian: "BPH", jenis: "IPNU", foto_url: null, urutan: 10 },
  { id: "p2", nama: "Hasan", jabatan: "Wakil Ketua", bagian: "BPH", jenis: "IPNU", foto_url: null, urutan: 20 },
  { id: "p3", nama: "Fakhrurroji", jabatan: "Sekretaris", bagian: "BPH", jenis: "IPNU", foto_url: null, urutan: 30 },
  { id: "p4", nama: "Azam", jabatan: "Bendahara", bagian: "BPH", jenis: "IPNU", foto_url: null, urutan: 40 },
  { id: "p5", nama: "Ismat", jabatan: "Media", bagian: "Media", jenis: "IPNU", foto_url: null, urutan: 50 },
  { id: "p6", nama: "Sulis", jabatan: "Ketua", bagian: "BPH", jenis: "IPPNU", foto_url: null, urutan: 10 },
];

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
