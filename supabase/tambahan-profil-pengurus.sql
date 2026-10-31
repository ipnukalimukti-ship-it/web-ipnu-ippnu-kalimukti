-- ============================================================
-- Tambahan: profil anggota (bio, prestasi, medsos) dan struktur pengurus
-- (jalankan SETELAH schema.sql dan tambahan-admin.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang. Jalankan SQL ini SEBELUM mengunggah
-- versi website yang baru.
-- ============================================================

-- ---------- Profil anggota ----------

alter table public.members
  add column if not exists bio text,
  add column if not exists prestasi text,          -- satu poin per baris
  add column if not exists instagram text,         -- hanya username, tanpa @ dan tanpa alamat
  add column if not exists tiktok text,
  add column if not exists tampil_medsos boolean not null default false;

-- View publik: bio dan prestasi ikut tampil. Instagram dan TikTok hanya keluar
-- kalau pengurus menyalakan "tampil_medsos" (default mati). Aturannya ada di
-- database, jadi medsos tidak bocor walau seseorang memanggil API langsung.
-- Kolom baru ditaruh di paling akhir, sesuai syarat "create or replace view".
create or replace view public.members_public
  with (security_invoker = false) as
  select
    id, nama, tempat_lahir, tanggal_lahir, jenis, foto_url,
    bio,
    prestasi,
    case when tampil_medsos then instagram end as instagram,
    case when tampil_medsos then tiktok end as tiktok
  from public.members
  where tampil_publik and aktif;

-- ---------- Struktur pengurus ----------

create table if not exists public.pengurus (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  jabatan text not null,                           -- contoh: Ketua, Sekretaris
  bagian text not null default 'BPH',              -- contoh: BPH, Media
  jenis text not null check (jenis in ('IPNU', 'IPPNU')),
  foto_url text,
  urutan integer not null default 100,             -- angka kecil tampil lebih dulu
  tampil boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists pengurus_urutan_idx on public.pengurus (jenis, urutan);

alter table public.pengurus enable row level security;

drop policy if exists "pengurus: publik baca" on public.pengurus;
create policy "pengurus: publik baca" on public.pengurus
  for select to anon, authenticated using (tampil);

drop policy if exists "pengurus: sekretaris baca semua" on public.pengurus;
create policy "pengurus: sekretaris baca semua" on public.pengurus
  for select to authenticated using (public.punya_peran('sekretaris'));

drop policy if exists "pengurus: sekretaris ubah" on public.pengurus;
create policy "pengurus: sekretaris ubah" on public.pengurus
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

grant select on public.pengurus to anon;
grant select, insert, update, delete on public.pengurus to authenticated;

-- Isi awal (hanya kalau tabel masih kosong). Nama bisa diubah dari menu Pengurus di admin.
insert into public.pengurus (nama, jabatan, bagian, jenis, urutan)
select * from (values
  ('Harun',       'Ketua',      'BPH',   'IPNU',  10),
  ('Hasan',       'Wakil Ketua','BPH',   'IPNU',  20),
  ('Fakhrurroji', 'Sekretaris', 'BPH',   'IPNU',  30),
  ('Azam',        'Bendahara',  'BPH',   'IPNU',  40),
  ('Ismat',       'Media',      'Media', 'IPNU',  50),
  ('Sulis',       'Ketua',      'BPH',   'IPPNU', 10)
) as awal(nama, jabatan, bagian, jenis, urutan)
where not exists (select 1 from public.pengurus);
