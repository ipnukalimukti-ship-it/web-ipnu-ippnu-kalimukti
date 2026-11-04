-- ============================================================
-- Tambahan: isi kartu anggota baru, moto di kartu pengurus, dan
-- pendaftaran anggota online
-- (jalankan SETELAH tambahan-struktur.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang. Jalankan SQL ini SEBELUM mengunggah website versi
-- terbaru (website versi lama tetap berjalan normal setelah SQL ini).
--
-- Isi:
--  1. Kolom baru anggota: moto, kesan, pesan, hobi, cita-cita, kaderisasi.
--     (Kolom bio dan prestasi lama tidak dihapus, hanya tidak ditampilkan lagi.)
--  Aman untuk website versi lama: jalankan SQL ini LEBIH DULU, baru unggah versi baru.
--  2. View publik diperbarui. Medsos tetap hanya keluar kalau diizinkan.
--  3. Pendaftaran anggota online. Pengunjung hanya bisa MENGIRIM lewat
--     fungsi kirim_pendaftaran (ada pemeriksaan isian dan pembatas).
--     Hanya sekretaris, admin, dan pengelola yang bisa MEMBACA pendaftaran.
-- ============================================================

-- ---------- 1. Kolom baru anggota ----------

alter table public.members
  add column if not exists moto text,
  add column if not exists kesan text,
  add column if not exists pesan text,
  add column if not exists hobi text,
  add column if not exists cita_cita text,
  add column if not exists kaderisasi text[];     -- contoh: {Makesta,Lakmud}

-- ---------- 2. View publik ----------

drop view if exists public.members_public;
create view public.members_public
  with (security_invoker = false) as
  select
    id, nama, tempat_lahir, tanggal_lahir, jenis, foto_url,
    moto, kesan, pesan, hobi, cita_cita, kaderisasi,
    case when tampil_medsos then instagram end as instagram,
    case when tampil_medsos then tiktok end as tiktok,
    -- Kolom lama, dipertahankan sementara supaya website versi lama tetap jalan selama
    -- pembaruan dipasang. Versi baru tidak memakainya. Aman diabaikan.
    bio,
    prestasi
  from public.members
  where tampil_publik and aktif;

grant select on public.members_public to anon, authenticated;

-- Struktur: tambah moto dan nama periode (kolom baru di paling akhir).
create or replace view public.struktur_publik
  with (security_invoker = false) as
  select
    p.id as penugasan_id,
    d.periode_id,
    d.id as departemen_id,
    d.nama as departemen,
    d.jenis as departemen_jenis,
    d.urutan as departemen_urutan,
    m.id as member_id,
    m.nama,
    m.jenis as member_jenis,
    m.foto_url,
    p.jabatan,
    p.utama,
    p.urutan,
    case when m.tampil_medsos then m.instagram end as instagram,
    case when m.tampil_medsos then m.tiktok end as tiktok,
    m.moto,
    per.nama as periode_nama
  from public.penugasan p
  join public.departemen d on d.id = p.departemen_id
  join public.periode per on per.id = d.periode_id
  join public.members m on m.id = p.member_id
  where p.tampil and d.tampil and m.tampil_publik and m.aktif;

grant select on public.struktur_publik to anon, authenticated;

-- ---------- 3. Pendaftaran anggota online ----------

create table if not exists public.pendaftaran (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nama text not null,
  jenis text not null check (jenis in ('IPNU', 'IPPNU')),
  tempat_lahir text,
  tanggal_lahir date not null,
  no_hp text not null,
  alamat text,
  status text not null default 'baru' check (status in ('baru', 'disetujui', 'ditolak')),
  alasan_tolak text,
  member_id uuid references public.members (id) on delete set null,
  ditangani_oleh uuid references auth.users (id) on delete set null,
  ditangani_pada timestamptz
);

create index if not exists pendaftaran_status_idx on public.pendaftaran (status, created_at desc);

alter table public.pendaftaran enable row level security;

-- Pengunjung tidak punya hak apa pun di tabel ini. Mereka hanya bisa memanggil fungsi di bawah.
drop policy if exists "pendaftaran: sekretaris kelola" on public.pendaftaran;
create policy "pendaftaran: sekretaris kelola" on public.pendaftaran
  for all to authenticated
  using (public.punya_peran('sekretaris')) with check (public.punya_peran('sekretaris'));

revoke all on public.pendaftaran from anon;
grant select, update, delete on public.pendaftaran to authenticated;

-- Dipanggil formulir di website. Memeriksa isian dan menolak pengiriman berlebihan.
create or replace function public.kirim_pendaftaran(
  p_nama text,
  p_jenis text,
  p_tempat_lahir text,
  p_tanggal_lahir date,
  p_no_hp text,
  p_alamat text,
  p_setuju boolean,
  p_jebakan text default ''
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nama text := trim(coalesce(p_nama, ''));
  v_hp text := regexp_replace(coalesce(p_no_hp, ''), '[^0-9+]', '', 'g');
begin
  -- Isian jebakan untuk robot (disembunyikan di formulir). Kalau terisi, pura-pura berhasil.
  if coalesce(p_jebakan, '') <> '' then
    return;
  end if;

  if p_setuju is not true then
    raise exception 'Centang persetujuan dulu sebelum mengirim.';
  end if;
  if char_length(v_nama) < 3 or char_length(v_nama) > 120 then
    raise exception 'Nama lengkap harus 3 sampai 120 huruf.';
  end if;
  if p_jenis is null or p_jenis not in ('IPNU', 'IPPNU') then
    raise exception 'Pilih IPNU atau IPPNU.';
  end if;
  if p_tanggal_lahir is null
     or p_tanggal_lahir > current_date - interval '8 years'
     or p_tanggal_lahir < date '1980-01-01' then
    raise exception 'Tanggal lahir tidak masuk akal. Periksa lagi.';
  end if;
  if char_length(regexp_replace(v_hp, '[^0-9]', '', 'g')) < 8 or char_length(v_hp) > 16 then
    raise exception 'Nomor HP atau WhatsApp tidak valid.';
  end if;
  if char_length(coalesce(p_tempat_lahir, '')) > 80 or char_length(coalesce(p_alamat, '')) > 300 then
    raise exception 'Tempat lahir atau alamat terlalu panjang.';
  end if;

  -- Pembatas umum: maksimal 30 pendaftaran per jam, supaya tidak bisa dibanjiri.
  if (select count(*) from public.pendaftaran where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Sedang banyak pendaftaran masuk. Coba lagi beberapa saat lagi.';
  end if;

  if exists (
    select 1 from public.pendaftaran
    where status = 'baru' and lower(nama) = lower(v_nama) and tanggal_lahir = p_tanggal_lahir
  ) then
    raise exception 'Pendaftaran atas nama ini sudah masuk dan sedang diproses pengurus.';
  end if;

  insert into public.pendaftaran (nama, jenis, tempat_lahir, tanggal_lahir, no_hp, alamat)
  values (
    v_nama, p_jenis, nullif(trim(coalesce(p_tempat_lahir, '')), ''), p_tanggal_lahir, v_hp,
    nullif(trim(coalesce(p_alamat, '')), '')
  );
end;
$$;

-- Menyetujui: membuat anggota baru (belum tampil di website) dan menandai pendaftaran selesai.
create or replace function public.setujui_pendaftaran(p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r public.pendaftaran;
  v_member uuid;
begin
  if not public.punya_peran('sekretaris') then
    raise exception 'Anda tidak punya izin memproses pendaftaran';
  end if;

  select * into r from public.pendaftaran where id = p_id for update;
  if not found then
    raise exception 'Pendaftaran tidak ditemukan';
  end if;
  if r.status <> 'baru' then
    raise exception 'Pendaftaran ini sudah diproses';
  end if;

  insert into public.members (nama, jenis, tempat_lahir, tanggal_lahir, no_hp, alamat, catatan, tampil_publik, aktif)
  values (r.nama, r.jenis, r.tempat_lahir, r.tanggal_lahir, r.no_hp, r.alamat, 'Dari pendaftaran online', false, true)
  returning id into v_member;

  update public.pendaftaran
  set status = 'disetujui', member_id = v_member, ditangani_oleh = auth.uid(), ditangani_pada = now()
  where id = p_id;

  return v_member;
end;
$$;

create or replace function public.tolak_pendaftaran(p_id uuid, p_alasan text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.punya_peran('sekretaris') then
    raise exception 'Anda tidak punya izin memproses pendaftaran';
  end if;

  update public.pendaftaran
  set status = 'ditolak', alasan_tolak = nullif(trim(coalesce(p_alasan, '')), ''),
      ditangani_oleh = auth.uid(), ditangani_pada = now()
  where id = p_id and status = 'baru';

  if not found then
    raise exception 'Pendaftaran tidak ditemukan atau sudah diproses';
  end if;
end;
$$;

revoke all on function public.kirim_pendaftaran(text, text, text, date, text, text, boolean, text) from public;
revoke all on function public.setujui_pendaftaran(uuid) from public, anon;
revoke all on function public.tolak_pendaftaran(uuid, text) from public, anon;
grant execute on function public.kirim_pendaftaran(text, text, text, date, text, text, boolean, text) to anon, authenticated;
grant execute on function public.setujui_pendaftaran(uuid) to authenticated;
grant execute on function public.tolak_pendaftaran(uuid, text) to authenticated;
