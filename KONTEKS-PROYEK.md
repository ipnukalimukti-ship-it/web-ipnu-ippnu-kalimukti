# KONTEKS PROYEK: Website IPNU IPPNU Ranting Kalimukti

Berkas ini ringkasan lengkap proyek, supaya Claude di akun atau percakapan baru bisa melanjutkan tanpa
bertanya ulang dari awal. **Kode terbaru ada di berkas zip** yang menyertai berkas ini. Kalau ada beda antara
berkas ini dan kode, **kode yang benar**. Baca juga `README.md` di dalam zip.

---

## 1. Siapa pengguna dan cara bekerja dengannya (PENTING)

- Pengguna **bukan programmer**. Berbahasa Indonesia. Mengerjakan semuanya **lewat browser**: unggah file ke
  GitHub (Add file > Upload files), tempel SQL di Supabase SQL Editor, dan Vercel. **Tidak memakai VS Code,
  terminal, atau Node.js sendiri.**
- Mudah bingung dengan istilah teknis. Kalau diminta, jelaskan langkah demi langkah, **satu langkah sekali**,
  dengan bahasa sederhana. Untuk kode, pengguna suka **diberi langsung dalam berkas `.md`** yang tinggal salin.
- Pola yang berhasil: beri pendapat dan pilihan lebih dulu, lalu **tunggu persetujuan** sebelum membangun
  (pengguna pernah berkata "jangan langsung buat"). Pilihan diajukan dengan pertanyaan bertombol (maksimal 3 pertanyaan).
- Pengguna sering minta pendapat jujur beserta untung-ruginya, dan menghargai peringatan soal privasi dan keamanan.
- **Jangan minta atau menerima password** di chat. Berkas daftar akun (berisi password) ada terpisah, tidak termasuk di sini.
- Penggunaan (token) pengguna cepat habis. Jadi: **jawab ringkas**, jangan mengulang kode panjang di chat
  (taruh di berkas), hindari tangkapan layar yang tidak perlu, dan kerjakan perubahan kecil per permintaan.
- Setiap penyerahan berupa: **zip proyek terbaru** + **panduan pemasangan `.md`** (dengan SQL di dalamnya).
  Urutan pasang yang aman untuk website yang sedang berjalan: **SQL dulu, baru unggah ke GitHub**.

## 2. Gambaran proyek

Website resmi **IPNU dan IPPNU Ranting Kalimukti** (organisasi pelajar Nahdlatul Ulama tingkat ranting):
berita, agenda, daftar anggota, struktur pengurus, transparansi kas, galeri, dan pendaftaran anggota online,
ditambah panel admin untuk pengurus. Tampilan publik bergaya gelap, modern, dan Gen Z (hijau dan kuning dari logo).

- **Tumpukan teknologi:** Next.js 15 (App Router), React 19, TypeScript, `@supabase/supabase-js` 2.x, font
  Bricolage Grotesque dan Public Sans (`@fontsource-variable`). CSS biasa tanpa Tailwind.
- **Hosting:** repository GitHub, dipasang otomatis oleh Vercel. Database dan penyimpanan di Supabase.
- **Variabel lingkungan di Vercel** (hanya dua): `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  (isinya kunci publik/publishable, **bukan** kunci rahasia). Tanpa keduanya website berjalan di **mode demo** dengan data contoh.
- **Kunci rahasia (service_role/secret) sengaja TIDAK dipakai** dan tidak boleh masuk ke repository.
- Logo IPNU (bulat) dan IPPNU (segitiga) ada di `public/`. Ikon aplikasi, `manifest.ts`, dan `public/sw.js`
  membuat website bisa dipasang di layar HP.

## 3. Fitur yang sudah ada

Publik:
- Beranda (hero, ringkasan kas, berita, anggota, **ulang tahun bulan ini**, agenda, kas), Berita (hero, tab bulan,
  carousel), Anggota, **Pengurus (struktur)**, Kas, Agenda, Galeri, **Daftar jadi anggota**.
- **Kartu anggota dan kartu pengurus membalik di tempat** (flip): ukuran kartu tetap, isi belakang yang panjang digulir
  di dalam kartu, pudaran di bawah sebagai tanda ada lanjutan, tombol Kembali menempel di atas, Esc menutup.
  - Depan kartu anggota: foto, nama (satu baris, dipotong "..."), Instagram dan TikTok, tempat tanggal lahir.
  - Belakang: nama lengkap, moto, jenjang kaderisasi (Makesta, Lakmud, Lakut), riwayat kepengurusan (otomatis dari Struktur),
    kesan, pesan, hobi, cita-cita. (Bio dan prestasi sudah **dihapus** dari tampilan.)
  - Kartu pengurus: depan foto, nama, jabatan; belakang nama lengkap, jabatan, departemen, periode, moto, medsos.
- **Pendaftaran online** (`/daftar`): **semua isian wajib** (Instagram dan TikTok boleh diganti centang "tidak punya"),
  foto wajib (diunggah pendaftar), wajib memilih jenjang kaderisasi yang sudah diikuti atau "belum pernah",
  dua centang izin terpisah (tampil di website, tampil medsos), pratinjau kartu langsung.
- PWA: bisa dipasang di layar HP (manifest, ikon, service worker minimal tanpa cache).

Admin (`/admin`): Dashboard, Berita, Agenda, Galeri, Anggota, **Pendaftaran** (dengan angka kecil untuk yang baru),
Struktur, Kas, Iuran, Laporan (cetak), **Aktivitas** (log siapa mengerjakan apa), **Akun saya** (ganti password sendiri).

## 4. Peran dan hak akses

| Peran | Menu admin |
|---|---|
| **pengelola** (pemilik, di atas admin) | Semua, ditambah Aktivitas. Satu-satunya yang boleh mengubah peran orang. |
| **admin** (ketua, wakil) | Semua menu pengelolaan, termasuk Struktur, tanpa Aktivitas. |
| **sekretaris** (termasuk tim media) | Berita, Agenda, Galeri, Anggota, Pendaftaran, Laporan. |
| **bendahara** | Anggota, Kas, Iuran, Laporan. |

Hanya **admin dan pengelola** yang boleh mengurus Struktur. Pendaftaran diproses sekretaris, admin, dan pengelola.
Ada 11 akun yang dibuat lewat dashboard Supabase (email `...@rantingkalimukti.id`, satu akun per jabatan, empat di antaranya
akun sementara "(Kosong)"). Akun baru dan reset password orang lain **tetap lewat Supabase** (tidak ada "Kelola akun" di website).

## 5. Database (Supabase)

Jalankan **berurutan**, semuanya aman dijalankan ulang (idempoten). Berkas ada di folder `supabase/` dalam zip:

1. `schema.sql` (tabel dasar, aturan akses RLS, view publik, bucket foto `media`)
2. `tambahan-admin.sql` (fungsi iuran)
3. `tambahan-profil-pengurus.sql` (tabel `pengurus` lama, kini tidak dipakai UI)
4. `tambahan-pengelola.sql` (peran pengelola, log aktivitas)
5. `tambahan-struktur.sql` (periode, departemen, penugasan; memindahkan pengurus lama)
6. `tambahan-kartu.sql` (kolom kartu baru, view publik, tabel pendaftaran)
7. `tambahan-pendaftaran.sql` (formulir lengkap, unggah foto aman, wajib semua, kaderisasi)

**Pertanyakan ke pengguna SQL mana yang sudah dijalankan** sebelum memberi langkah berikutnya.

Konsep penting:
- Pengunjung **tidak bisa membaca tabel `members`, kas, iuran, pendaftaran**. Mereka hanya membaca **view**
  (`members_public`, `struktur_publik`, `kas_ringkasan_bulanan`, `kas_saldo`) yang hanya berisi kolom aman. Instagram dan TikTok
  di view hanya keluar kalau `tampil_medsos` menyala. Nomor HP, alamat, asal sekolah, dan catatan tidak pernah ada di view.
- `punya_peran(variadic ...)` **wajib diberi argumen** (pernah ada bug karena dipanggil tanpa argumen). Pengelola dan admin selalu lolos.
- Struktur: `periode` (satu bertanda "sekarang") > `departemen` (milik IPNU, IPPNU, atau GABUNGAN) > `penugasan`
  (satu anggota, satu jabatan). Nama dan foto selalu ikut tabel `members`.
- Log aktivitas diisi oleh pemicu (trigger) di tabel-tabel penting, hanya terbaca pengelola.
- Pendaftaran: pengunjung hanya bisa memanggil fungsi `kirim_pendaftaran_lengkap` (memeriksa isian, pembatas 30 per jam,
  anti ganda, isian jebakan robot). Foto masuk ke bucket **pribadi** `pendaftaran-foto` (JPEG, maks 1 MB), hanya setelah
  pendaftaran lolos, lewat `lampirkan_foto_pendaftaran`. Menyetujui = `setujui_pendaftaran` (membuat anggota, profil tampil
  hanya kalau diizinkan) dan halaman admin menyalin foto ke bucket `media`.
- Fungsi lama sengaja dipertahankan agar website versi lama tetap jalan saat pembaruan dipasang.

## 6. Struktur kode (file TypeScript dan CSS)

```
  src/app/(publik)/agenda/page.tsx
  src/app/(publik)/anggota/page.tsx
  src/app/(publik)/berita/[slug]/page.tsx
  src/app/(publik)/berita/page.tsx
  src/app/(publik)/daftar/page.tsx
  src/app/(publik)/galeri/page.tsx
  src/app/(publik)/kas/page.tsx
  src/app/(publik)/layout.tsx
  src/app/(publik)/page.tsx
  src/app/(publik)/pengurus/page.tsx
  src/app/admin/admin.css
  src/app/admin/agenda/page.tsx
  src/app/admin/aktivitas/page.tsx
  src/app/admin/akun/page.tsx
  src/app/admin/anggota/page.tsx
  src/app/admin/berita/page.tsx
  src/app/admin/galeri/page.tsx
  src/app/admin/iuran/page.tsx
  src/app/admin/kas/page.tsx
  src/app/admin/laporan/page.tsx
  src/app/admin/layout.tsx
  src/app/admin/login/page.tsx
  src/app/admin/page.tsx
  src/app/admin/pendaftaran/page.tsx
  src/app/admin/struktur/page.tsx
  src/app/gambar/anggota/[id]/route.tsx
  src/app/gambar/pengurus/[id]/route.tsx
  src/app/globals.css
  src/app/layout.tsx
  src/app/manifest.ts
  src/app/not-found.tsx
  src/app/publik.css
  src/components/AgendaList.tsx
  src/components/Carousel.tsx
  src/components/Cover.tsx
  src/components/DaftarkanSW.tsx
  src/components/FormDaftar.tsx
  src/components/KasNota.tsx
  src/components/Logo.tsx
  src/components/MemberCard.tsx
  src/components/NewsCard.tsx
  src/components/NewsHero.tsx
  src/components/PageHead.tsx
  src/components/PengurusCard.tsx
  src/components/SiteHeader.tsx
  src/components/TombolPasang.tsx
  src/components/admin/AdminShell.tsx
  src/components/admin/ui.tsx
  src/lib/admin-util.ts
  src/lib/data.ts
  src/lib/fitur.ts
  src/lib/format.ts
  src/lib/foto.ts
  src/lib/gambar/kartu.tsx
  src/lib/gambar/muat.ts
  src/lib/kaderisasi.ts
  src/lib/medsos.ts
  src/lib/sample.ts
  src/lib/supabase-browser.ts
  src/lib/supabase.ts
  src/lib/types.ts
  src/lib/ulangtahun.ts
  src/lib/useKartuBalik.ts
supabase/            file SQL (lihat bagian 5)
public/              logo, ikon, sw.js
README.md            ringkasan teknis
```

Catatan: `src/lib/gambar/aset.ts` (hasil olahan, font dan logo tersemat) tidak ditampilkan di atas.
- `src/app/globals.css`: gaya dasar bersama dan variabel yang dipakai admin. **Jangan hapus variabel di `:root`.**
- `src/app/publik.css`: seluruh tema publik, semua di bawah `.tema` dan kelas berawalan `px-`.
- `src/app/admin/admin.css`: gaya admin (kelas berawalan `adm-`).
- `src/lib/data.ts`: semua pembacaan data publik. `src/lib/sample.ts`: data contoh mode demo.
- `src/lib/fitur.ts`: saklar fitur (`UNDUH_GAMBAR_AKTIF`).

## 7. Keputusan dan hal yang SENGAJA tidak dikerjakan

- **Tanpa kunci rahasia Supabase**: tidak ada "Kelola akun" di website. Hanya "Ganti password" sendiri.
- **KTA digital** dan **absensi kegiatan**: tidak dipilih pengguna.
- **Tombol Bagikan** ke sosmed dan **poster ulang tahun**: belum dikerjakan.
- **Unduh gambar kartu**: sudah dibuat (gambar PNG dibuat di server dengan Satori/`next/og`, rute `/gambar/anggota/<id>` dan
  `/gambar/pengurus/<id>`, font dan logo tersemat di `src/lib/gambar/aset.ts`), tetapi **dimatikan** lewat
  `UNDUH_GAMBAR_AKTIF = false` karena pengguna kurang suka desain sementaranya. **Menunggu desain kosongan dari pengguna**
  (versi kosong dan versi contoh terisi, ukuran, font, bentuk bingkai foto, posisi logo, warna IPNU/IPPNU). Desain ada di
  satu berkas: `src/lib/gambar/kartu.tsx`. Satori hanya mengerti sebagian CSS (flexbox, tanpa grid, tanpa `lineClamp`, `objectPosition` diabaikan).
- **CAPTCHA** pada formulir pendaftaran belum ada (pengaman spam masih dasar).
- Persetujuan pendaftaran saat ini boleh oleh sekretaris, admin, dan pengelola. Pengguna sempat bilang "admin saja";
  tanyakan apakah mau dibatasi hanya admin dan pengelola.

## 8. Yang BELUM teruji di lingkungan asli

Semua diuji di lingkungan lokal Claude (Postgres lokal dengan tiruan `auth` dan `storage`, Chromium lewat Playwright,
Supabase tiruan). **Belum pernah teruji dengan Supabase dan Vercel sungguhan**: aturan penyimpanan foto pendaftar,
pembuatan gambar `next/og` di Vercel, dan tawaran "Instal" PWA di HP. Kalau pengguna melaporkan error, minta **pesan error
persisnya** (salin atau foto).

## 9. Cara menguji (kalau Claude punya lingkungan kode)

- `npm install`, lalu `npm run build` harus lolos. Mode demo jalan tanpa variabel lingkungan.
- SQL: pasang PostgreSQL lokal (`apt-get install postgresql`), buat tiruan skema `auth` (`auth.users`, `auth.uid()`) dan
  `storage` (`buckets`, `objects`, `foldername`) serta peran `anon` dan `authenticated`, lalu jalankan berkas SQL berurutan
  dengan `psql -v ON_ERROR_STOP=1 -1 -f`. Jalankan setiap berkas **dua kali** untuk membuktikan idempoten.
- Browser: Playwright dengan Chromium (ada di `/opt/pw-browsers`). Supabase tiruan lewat `page.route()` atau server HTTP kecil
  dan `NEXT_PUBLIC_SUPABASE_URL` diarahkan ke sana (pakai `next dev` agar variabel terbaca saat berjalan).
- Jebakan: `pkill -f "next start"` bisa membunuh shell sendiri (pakai pola `[n]ext start` dan panggil terpisah). Proses latar
  mati di akhir tiap panggilan, jadi nyalakan server dan uji dalam **satu perintah**.

## 10. Daftar kemungkinan pekerjaan berikutnya

1. Pasang desain kosongan dari pengguna ke gambar unduhan kartu, lalu nyalakan `UNDUH_GAMBAR_AKTIF`.
2. Tombol Bagikan (Web Share) dan poster ulang tahun.
3. CAPTCHA (misalnya Cloudflare Turnstile) untuk formulir pendaftaran.
4. Membatasi persetujuan pendaftaran hanya untuk admin dan pengelola (kalau pengguna mau).
5. Mengganti nama periode awal "Periode sekarang" dan melengkapi nama lengkap pengurus (dikerjakan pengguna lewat admin).
6. Membersihkan kode lama: tabel `pengurus` lama, fungsi `kirim_pendaftaran` versi lama, kolom `bio` dan `prestasi` di view.

## 11. Cara memulai di akun Claude yang baru

1. Buat percakapan baru, **unggah dua berkas**: zip proyek terbaru (`ipnu-kalimukti-...zip`) dan berkas ini.
2. Tempel pesan pembuka ini:

> Saya melanjutkan proyek website IPNU IPPNU Ranting Kalimukti. Baca dulu `KONTEKS-PROYEK.md` dan `README.md` di
> dalam zip. Saya tidak memakai terminal, semua lewat browser (GitHub, Supabase, Vercel). Jawab ringkas dan sederhana
> karena penggunaan saya terbatas. Jangan langsung membangun kalau saya minta pendapat; beri pilihan dulu. Saya ingin
> melanjutkan: (tulis permintaan Anda di sini).

3. Kalau Claude baru tidak punya akses ke memori lama, semua yang perlu ada di berkas ini dan di zip.
