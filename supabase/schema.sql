-- ============================================================
-- Skema database IPNU IPPNU Ranting Kalimukti
--
-- Cara pakai: Supabase > SQL Editor > New query > tempel seluruh
-- isi file ini > Run. Aman dijalankan sekali saja pada project baru.
--
-- Prinsip keamanan:
--  * Pengunjung (anon) TIDAK bisa membaca tabel anggota, kas, dan iuran.
--    Mereka hanya membaca "view" yang sudah dipilihkan kolomnya.
--  * Hanya pengurus yang login dan punya baris di tabel profiles
--    yang bisa membaca/mengubah data pengurus.
--  * Peran: admin (semua), sekretaris (berita, anggota, agenda, galeri),
--    bendahara (kas dan iuran).
-- ============================================================

-- ---------- Profil pengurus (terhubung ke akun login Supabase) ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nama text not null,
  role text not null check (role in ('admin', 'sekretaris', 'bendahara')),
  created_at timestamptz not null default now()
);

-- Peran pengguna yang sedang login (null kalau bukan pengurus).
create function public.peran() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- true kalau pengguna punya salah satu peran yang disebut. Admin selalu lolos.
create function public.punya_peran(variadic daftar text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.peran() = 'admin' or public.peran() = any (daftar),
    false
  )
$$;

-- ---------- Anggota ----------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jenis text not null check (jenis in ('IPNU', 'IPPNU')),
  tempat_lahir text,
  tanggal_lahir date,
  foto_url text,
  -- Data berikut TIDAK pernah tampil di website publik:
  no_hp text,
  alamat text,
  catatan text,
  -- Kontrol tampil di halaman publik:
  tampil_publik boolean not null default true,
  aktif boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Berita ----------

create table public.news (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  slug text not null unique,
  ringkasan text,
  isi text not null,
  gambar_url text,
  terbit boolean not null default false,
  tanggal_terbit timestamptz not null default now(),
  created_by uuid references auth.users (id) default auth.uid()
);

-- ---------- Agenda ----------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  lokasi text,
  mulai timestamptz not null,
  selesai timestamptz,
  created_by uuid references auth.users (id) default auth.uid()
);

-- ---------- Galeri ----------

create table public.gallery_albums (
  id uuid primary key default gen_random_uuid(),
  judul text not null,
  deskripsi text,
  tanggal date not null default current_date,
  cover_url text
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.gallery_albums (id) on delete cascade,
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ---------- Kas ----------

create table public.kas_transaksi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null default current_date,
  jenis text not null check (jenis in ('masuk', 'keluar')),
  kategori text not null,
  jumlah numeric(14, 0) not null check (jumlah > 0),
  keterangan text,
  created_by uuid references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------- Iuran ----------

-- Jenis iuran, misalnya "Iuran bulanan" Rp 5.000.
create table public.iuran_jenis (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jumlah numeric(14, 0) not null check (jumlah > 0),
  bulanan boolean not null default true,
  aktif boolean not null default true
);

-- Satu baris = satu pembayaran. "periode" diisi tanggal 1 pada bulan yang dibayar.
create table public.iuran_pembayaran (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  iuran_id uuid not null references public.iuran_jenis (id),
  periode date not null,
  jumlah numeric(14, 0) not null check (jumlah > 0),
  dibayar_pada date not null default current_date,
  kas_id uuid references public.kas_transaksi (id) on delete set null,
  unique (member_id, iuran_id, periode)
);

create index on public.iuran_pembayaran (periode);
create index on public.kas_transaksi (tanggal);
create index on public.news (tanggal_terbit desc);
create index on public.events (mulai);

-- ============================================================
-- View untuk halaman publik (hanya kolom yang aman)
-- ============================================================

-- Dibuat dengan hak pemilik (bukan hak pemanggil), sehingga pengunjung
-- bisa membaca ringkasan tanpa pernah punya akses ke tabel aslinya.

create view public.members_public
  with (security_invoker = false) as
  select id, nama, tempat_lahir, tanggal_lahir, jenis, foto_url
  from public.members
  where tampil_publik and aktif;

create view public.kas_ringkasan_bulanan
  with (security_invoker = false) as
  select
    date_trunc('month', tanggal)::date as bulan,
    coalesce(sum(jumlah) filter (where jenis = 'masuk'), 0) as masuk,
    coalesce(sum(jumlah) filter (where jenis = 'keluar'), 0) as keluar
  from public.kas_transaksi
  group by 1;

create view public.kas_saldo
  with (security_invoker = false) as
  select coalesce(sum(case when jenis = 'masuk' then jumlah else -jumlah end), 0) as saldo
  from public.kas_transaksi;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.news enable row level security;
alter table public.events enable row level security;
alter table public.gallery_albums enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.kas_transaksi enable row level security;
alter table public.iuran_jenis enable row level security;
alter table public.iuran_pembayaran enable row level security;

-- Profil: pengguna membaca profil sendiri; hanya admin yang mengelola.
create policy "profil: baca sendiri" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profil: admin kelola" on public.profiles
  for all to authenticated
  using (public.peran() = 'admin') with check (public.peran() = 'admin');

-- Anggota: pengurus boleh baca; sekretaris dan admin boleh ubah.
-- (Pengunjung tidak punya policy sama sekali, jadi tidak bisa membaca.)
create policy "anggota: pengurus baca" on public.members
  for select to authenticated
  using (public.punya_peran('sekretaris', 'bendahara'));
create policy "anggota: sekretaris ubah" on public.members
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

-- Berita: pengunjung hanya melihat yang sudah terbit.
create policy "berita: publik baca terbit" on public.news
  for select to anon, authenticated using (terbit);
create policy "berita: sekretaris baca semua" on public.news
  for select to authenticated using (public.punya_peran('sekretaris'));
create policy "berita: sekretaris ubah" on public.news
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

-- Agenda
create policy "agenda: publik baca" on public.events
  for select to anon, authenticated using (true);
create policy "agenda: sekretaris ubah" on public.events
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

-- Galeri
create policy "album: publik baca" on public.gallery_albums
  for select to anon, authenticated using (true);
create policy "album: sekretaris ubah" on public.gallery_albums
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

create policy "foto: publik baca" on public.gallery_photos
  for select to anon, authenticated using (true);
create policy "foto: sekretaris ubah" on public.gallery_photos
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

-- Kas dan iuran: hanya bendahara dan admin.
create policy "kas: bendahara kelola" on public.kas_transaksi
  for all to authenticated
  using (public.punya_peran('bendahara')) with check (public.punya_peran('bendahara'));

create policy "iuran jenis: bendahara kelola" on public.iuran_jenis
  for all to authenticated
  using (public.punya_peran('bendahara')) with check (public.punya_peran('bendahara'));

create policy "iuran bayar: bendahara kelola" on public.iuran_pembayaran
  for all to authenticated
  using (public.punya_peran('bendahara')) with check (public.punya_peran('bendahara'));

-- ============================================================
-- Hak akses tingkat tabel (lapisan kedua di bawah RLS)
-- ============================================================

-- Cabut semua hak anon, lalu beri hanya yang dibutuhkan halaman publik.
revoke all on all tables in schema public from anon;

grant select on public.news, public.events, public.gallery_albums, public.gallery_photos to anon;
grant select on public.members_public, public.kas_ringkasan_bulanan, public.kas_saldo to anon;
grant select on public.members_public, public.kas_ringkasan_bulanan, public.kas_saldo to authenticated;

-- ============================================================
-- Penyimpanan foto (bucket "media", publik untuk dibaca)
-- ============================================================

insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media: pengurus unggah" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.punya_peran('sekretaris'));
create policy "media: pengurus ubah" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.punya_peran('sekretaris'));
create policy "media: pengurus hapus" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.punya_peran('sekretaris'));

-- ============================================================
-- Admin pertama
-- 1) Supabase > Authentication > Users > Add user (isi email dan password).
-- 2) Salin UUID user itu, lalu jalankan (ganti UUID dan nama):
--
--    insert into public.profiles (id, nama, role)
--    values ('UUID-USER-DI-SINI', 'Nama Anda', 'admin');
-- ============================================================
