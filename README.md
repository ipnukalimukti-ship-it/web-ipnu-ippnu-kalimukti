# Website IPNU IPPNU Ranting Kalimukti

> Ringkasan lengkap proyek untuk melanjutkan di percakapan atau akun lain: lihat `KONTEKS-PROYEK.md`.

Berisi halaman publik (beranda, berita, anggota, transparansi kas, agenda, galeri) dan
halaman admin di `/admin` (login, berita, agenda, galeri, anggota, kas, iuran, laporan).
Database dan aturan aksesnya ada di `supabase/schema.sql` dan `supabase/tambahan-admin.sql`.

Dibuat dengan Next.js, Supabase (database, login, foto), dan di-hosting di Vercel.

> **Catatan:** kode ini sudah diuji `npm install` dan `npm run build` (lolos) dalam mode demo.
> Bagian yang belum teruji adalah sambungan ke Supabase asli (login admin, unggah foto),
> karena itu baru bisa dicek setelah langkah 2 dan 3 di bawah. Kalau ada error, salin
> pesannya dan kita perbaiki.

## 1. Coba di komputer (mode demo)

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev
```

Buka http://localhost:3000. Selama Supabase belum diisi, website memakai data contoh
dan menampilkan banner kuning "Mode demo".

Cek juga bahwa build lolos:

```bash
npm run build
```

## 2. Siapkan Supabase (gratis)

1. Daftar di https://supabase.com, buat project baru. Simpan password database-nya.
2. Buka **SQL Editor > New query**, tempel seluruh isi `supabase/schema.sql`, klik **Run**.
   Lalu buat query baru, tempel isi `supabase/tambahan-admin.sql`, klik **Run** (urutan ini penting).
3. Buka **Authentication > Users > Add user**, isi email dan password akun admin Anda.
4. Salin UUID user tersebut, lalu jalankan di SQL Editor:
   ```sql
   insert into public.profiles (id, nama, role)
   values ('UUID-USER-DI-SINI', 'Nama Anda', 'admin');
   ```
5. Buka **Project Settings > API**, salin **Project URL** dan **anon public key**.

Supabase mungkin memberi peringatan "Security Definer View" untuk tiga view
(`members_public`, `kas_ringkasan_bulanan`, `kas_saldo`). Itu memang disengaja:
view inilah yang membuat pengunjung hanya bisa melihat nama, foto, TTL, dan ringkasan kas
tanpa pernah menyentuh tabel aslinya.

## 3. Sambungkan website ke Supabase

Salin `.env.example` menjadi `.env.local`, isi dua nilainya, lalu jalankan ulang
`npm run dev`. Banner "Mode demo" hilang dan halaman membaca database asli
(masih kosong sampai Anda mengisinya lewat halaman admin).

Buka http://localhost:3000/admin dan masuk dengan akun yang Anda buat di langkah 2.
Akun pengurus lain: buat di **Authentication > Users**, lalu tambahkan barisnya di tabel
`profiles` dengan `role` = `admin`, `sekretaris`, atau `bendahara`.

## 4. Pasang di Vercel (gratis)

1. Unggah folder ini ke repository GitHub.
2. Di https://vercel.com pilih **Add New > Project**, pilih repository tadi.
3. Di bagian **Environment Variables**, isi `NEXT_PUBLIC_SUPABASE_URL` dan
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` dengan nilai yang sama seperti `.env.local`.
4. Klik **Deploy**.

## Peran pengurus

| Peran | Boleh mengelola |
|---|---|
| admin | semuanya, termasuk akun pengurus |
| sekretaris | berita, agenda, galeri, anggota |
| bendahara | kas, iuran (dan boleh melihat anggota) |

Batas peran dijaga oleh database, bukan hanya tampilan, jadi tidak bisa ditembus dengan
mengutak-atik browser. Menandai iuran lunas otomatis mencatat pemasukan di kas dalam satu
langkah; membatalkannya ikut menghapus catatan kas itu.

## Yang tampil di publik

| Halaman | Isi | Tidak pernah tampil |
|---|---|---|
| Anggota | nama, tempat tanggal lahir, foto, IPNU/IPPNU | no. HP, alamat, catatan |
| Kas | saldo, total masuk dan keluar per bulan | rincian transaksi, iuran per anggota |
| Berita | hanya yang berstatus terbit | draf |

Anggota bisa disembunyikan dari halaman publik dengan mengisi `tampil_publik = false`
atau `aktif = false` di tabel `members`.

## Struktur

```
src/app/          halaman (beranda, berita, anggota, kas, agenda, galeri)
src/components/   potongan tampilan yang dipakai ulang
src/lib/data.ts   semua pembacaan data publik
src/lib/sample.ts data contoh mode demo (aman dihapus nanti)
src/app/publik.css   tampilan website publik (tema gelap), ubah warna di blok .tema paling atas
src/app/globals.css  gaya dasar bersama yang juga dipakai panel admin, jangan hapus variabel di :root
public/              logo-ipnu.png dan logo-ippnu.png (ganti berkasnya untuk mengganti logo)
supabase/schema.sql  tabel, aturan akses, penyimpanan foto
supabase/tambahan-admin.sql  fungsi iuran (jalankan setelah schema.sql)
supabase/tambahan-profil-pengurus.sql  bio, prestasi, medsos anggota, dan struktur pengurus (jalankan setelah tambahan-admin.sql)
supabase/tambahan-pengelola.sql  peran pengelola dan catatan aktivitas (jalankan setelah tambahan-profil-pengurus.sql, setelah website terbaru terpasang)
supabase/tambahan-struktur.sql  periode, departemen, dan jabatan pengurus (jalankan setelah tambahan-pengelola.sql, setelah website terbaru terpasang)
supabase/tambahan-kartu.sql  isi kartu anggota (moto, kesan, pesan, hobi, cita-cita, kaderisasi) dan pendaftaran anggota online (jalankan setelah tambahan-struktur.sql, SEBELUM mengunggah versi website terbaru)
supabase/tambahan-pendaftaran.sql  formulir pendaftaran lengkap dengan unggah foto aman (jalankan setelah tambahan-kartu.sql, SEBELUM mengunggah versi website terbaru)
```

## Gambar kartu yang bisa diunduh

Di belakang kartu anggota dan kartu pengurus ada tombol **Unduh** (ukuran feed 1080 x 1350) dan tautan
**Unduh ukuran story** (1080 x 1920). Gambarnya dibuat di server saat diminta:

```
/gambar/anggota/<id>?format=feed|story        (tambahkan &unduh=1 supaya langsung terunduh)
/gambar/pengurus/<id>?format=feed|story
```

- Hanya anggota dan pengurus yang tampil di website yang bisa dibuatkan gambar. Yang disembunyikan menghasilkan 404.
- Hasilnya disimpan sementara (cache): 10 menit di browser dan 1 hari di CDN.
- Foto hanya diambil dari penyimpanan Supabase milik website ini. Foto berformat WebP diganti inisial.
- Desainnya ada di satu berkas: `src/lib/gambar/kartu.tsx`. Pembuat gambarnya (Satori) hanya mengerti
  sebagian CSS: pakai flexbox, tanpa grid. Untuk memakai desain kosongan sendiri, letakkan gambar latarnya
  sebagai data URI dan atur posisi tiap elemen dengan `position: "absolute"`.
- Font dan logo yang dipakai pembuat gambar tersimpan di `src/lib/gambar/aset.ts` (hasil olahan).

## Pendaftaran anggota online

Halaman `/daftar` memuat formulir yang mengikuti isi kartu anggota. Pendaftar tidak langsung menjadi anggota:
pendaftaran masuk ke menu **Pendaftaran** di admin, lalu pengurus (sekretaris, admin, pengelola) memeriksa dan
menyetujuinya. Saat disetujui, anggota dibuat dengan semua isian, dan foto disalin ke penyimpanan foto anggota.

- Nomor HP, alamat, dan asal sekolah hanya terlihat oleh pengurus.
- Profil tampil di website hanya kalau pendaftar mencentang izin. Medsos punya izin sendiri.
- Foto diunggah ke penyimpanan pribadi `pendaftaran-foto` (JPEG, maksimal 1 MB, satu foto per pendaftaran),
  hanya bisa diunggah setelah pendaftaran lolos pemeriksaan, dan hanya bisa dilihat pengurus.
- Pengaman spam: isian jebakan untuk robot, pemeriksaan isian di database, pencegahan pendaftaran ganda,
  dan batas 30 pendaftaran per jam.

## Fitur yang dimatikan

`src/lib/fitur.ts` berisi saklar `UNDUH_GAMBAR_AKTIF` (tombol unduh gambar kartu). Nilainya `false` sampai
desain kosongan siap.
