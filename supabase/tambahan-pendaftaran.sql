-- ============================================================
-- Tambahan: formulir pendaftaran yang mengikuti isi kartu anggota,
-- dengan unggah foto oleh pendaftar
-- (jalankan SETELAH tambahan-kartu.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang. Jalankan SQL ini SEBELUM mengunggah website
-- versi terbaru (website versi lama tetap berjalan normal).
--
-- Pengaman unggah foto:
--  * Foto masuk ke penyimpanan PRIBADI "pendaftaran-foto" (bukan "media").
--  * Hanya JPEG, maksimal 1 MB, satu foto per pendaftaran.
--  * Foto hanya bisa diunggah SETELAH pendaftaran lolos pemeriksaan (jadi ikut
--    batas 30 pendaftaran per jam), dan maksimal 30 menit sesudahnya.
--  * Pengunjung tidak bisa melihat, mengganti, atau menghapus foto apa pun.
--  * Hanya sekretaris, admin, dan pengelola yang bisa melihat foto pendaftar.
-- ============================================================

-- ---------- Kolom baru ----------

alter table public.members
  add column if not exists sekolah text;           -- asal sekolah dan kelas, hanya untuk pengurus

alter table public.pendaftaran
  add column if not exists sekolah text,
  add column if not exists moto text,
  add column if not exists kesan text,
  add column if not exists pesan text,
  add column if not exists hobi text,
  add column if not exists cita_cita text,
  add column if not exists instagram text,
  add column if not exists tiktok text,
  add column if not exists izin_profil boolean not null default false,
  add column if not exists izin_medsos boolean not null default false,
  add column if not exists foto_path text;

-- ---------- Penyimpanan foto pribadi ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pendaftaran-foto', 'pendaftaran-foto', false, 1048576, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

-- Apakah nama berkas ini boleh diunggah? Hanya "<id pendaftaran>.jpg" untuk pendaftaran
-- yang baru dibuat (maksimal 30 menit) dan belum punya foto.
create or replace function public.boleh_unggah_foto(p_nama text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pendaftaran p
    where p_nama = p.id::text || '.jpg'
      and p.status = 'baru'
      and p.foto_path is null
      and p.created_at > now() - interval '30 minutes'
  )
$$;

grant execute on function public.boleh_unggah_foto(text) to anon, authenticated;

drop policy if exists "pendaftaran foto: pendaftar unggah" on storage.objects;
create policy "pendaftaran foto: pendaftar unggah" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'pendaftaran-foto' and public.boleh_unggah_foto(name));

drop policy if exists "pendaftaran foto: pengurus baca" on storage.objects;
create policy "pendaftaran foto: pengurus baca" on storage.objects
  for select to authenticated
  using (bucket_id = 'pendaftaran-foto' and public.punya_peran('sekretaris'));

drop policy if exists "pendaftaran foto: pengurus hapus" on storage.objects;
create policy "pendaftaran foto: pengurus hapus" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pendaftaran-foto' and public.punya_peran('sekretaris'));

-- ---------- Fungsi kirim pendaftaran versi lengkap ----------

-- Mengembalikan id pendaftaran, dipakai formulir untuk mengunggah foto.
create or replace function public.kirim_pendaftaran_lengkap(
  p_nama text,
  p_jenis text,
  p_tempat_lahir text,
  p_tanggal_lahir date,
  p_no_hp text,
  p_alamat text,
  p_sekolah text,
  p_moto text,
  p_kesan text,
  p_pesan text,
  p_hobi text,
  p_cita_cita text,
  p_instagram text,
  p_tiktok text,
  p_izin_profil boolean,
  p_izin_medsos boolean,
  p_setuju boolean,
  p_jebakan text default ''
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_nama text := trim(coalesce(p_nama, ''));
  v_hp text := regexp_replace(coalesce(p_no_hp, ''), '[^0-9+]', '', 'g');
  v_ig text := nullif(regexp_replace(trim(coalesce(p_instagram, '')), '^@', ''), '');
  v_tt text := nullif(regexp_replace(trim(coalesce(p_tiktok, '')), '^@', ''), '');
  v_id uuid;
begin
  -- Isian jebakan untuk robot. Kalau terisi, pura-pura berhasil tanpa menyimpan.
  if coalesce(p_jebakan, '') <> '' then
    return gen_random_uuid();
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
  if char_length(coalesce(p_tempat_lahir, '')) > 80
     or char_length(coalesce(p_alamat, '')) > 300
     or char_length(coalesce(p_sekolah, '')) > 120 then
    raise exception 'Tempat lahir, alamat, atau asal sekolah terlalu panjang.';
  end if;
  if char_length(coalesce(p_moto, '')) > 120
     or char_length(coalesce(p_kesan, '')) > 300
     or char_length(coalesce(p_pesan, '')) > 300
     or char_length(coalesce(p_hobi, '')) > 100
     or char_length(coalesce(p_cita_cita, '')) > 100 then
    raise exception 'Moto, kesan, pesan, hobi, atau cita-cita terlalu panjang.';
  end if;
  if (v_ig is not null and v_ig !~ '^[A-Za-z0-9._]{1,30}$')
     or (v_tt is not null and v_tt !~ '^[A-Za-z0-9._]{1,30}$') then
    raise exception 'Username Instagram atau TikTok tidak valid. Tulis username saja, misalnya @namaanda.';
  end if;

  -- Pembatas umum: maksimal 30 pendaftaran per jam.
  if (select count(*) from public.pendaftaran where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'Sedang banyak pendaftaran masuk. Coba lagi beberapa saat lagi.';
  end if;

  if exists (
    select 1 from public.pendaftaran
    where status = 'baru' and lower(nama) = lower(v_nama) and tanggal_lahir = p_tanggal_lahir
  ) then
    raise exception 'Pendaftaran atas nama ini sudah masuk dan sedang diproses pengurus.';
  end if;

  insert into public.pendaftaran (
    nama, jenis, tempat_lahir, tanggal_lahir, no_hp, alamat, sekolah,
    moto, kesan, pesan, hobi, cita_cita, instagram, tiktok, izin_profil, izin_medsos
  ) values (
    v_nama, p_jenis, nullif(trim(coalesce(p_tempat_lahir, '')), ''), p_tanggal_lahir, v_hp,
    nullif(trim(coalesce(p_alamat, '')), ''), nullif(trim(coalesce(p_sekolah, '')), ''),
    nullif(trim(coalesce(p_moto, '')), ''), nullif(trim(coalesce(p_kesan, '')), ''),
    nullif(trim(coalesce(p_pesan, '')), ''), nullif(trim(coalesce(p_hobi, '')), ''),
    nullif(trim(coalesce(p_cita_cita, '')), ''), v_ig, v_tt,
    coalesce(p_izin_profil, false), coalesce(p_izin_medsos, false)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Dipanggil formulir sesudah foto selesai diunggah: menandai bahwa pendaftaran punya foto.
create or replace function public.lampirkan_foto_pendaftaran(p_id uuid) returns void
language plpgsql security definer set search_path = public, storage as $$
begin
  if not exists (
    select 1 from storage.objects where bucket_id = 'pendaftaran-foto' and name = p_id::text || '.jpg'
  ) then
    raise exception 'Foto belum ditemukan. Coba unggah lagi.';
  end if;

  update public.pendaftaran
  set foto_path = p_id::text || '.jpg'
  where id = p_id and status = 'baru' and foto_path is null and created_at > now() - interval '1 hour';

  if not found then
    raise exception 'Pendaftaran tidak ditemukan atau sudah punya foto.';
  end if;
end;
$$;

-- Menyetujui: membuat anggota baru dengan semua isian terbawa. Profil dan medsos tampil
-- di website hanya kalau pendaftar mencentang izinnya. Foto disalin oleh halaman admin.
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

  insert into public.members (
    nama, jenis, tempat_lahir, tanggal_lahir, no_hp, alamat, sekolah,
    moto, kesan, pesan, hobi, cita_cita, instagram, tiktok,
    tampil_medsos, tampil_publik, aktif, catatan
  ) values (
    r.nama, r.jenis, r.tempat_lahir, r.tanggal_lahir, r.no_hp, r.alamat, r.sekolah,
    r.moto, r.kesan, r.pesan, r.hobi, r.cita_cita, r.instagram, r.tiktok,
    r.izin_medsos and (r.instagram is not null or r.tiktok is not null), r.izin_profil, true,
    'Dari pendaftaran online'
  )
  returning id into v_member;

  update public.pendaftaran
  set status = 'disetujui', member_id = v_member, ditangani_oleh = auth.uid(), ditangani_pada = now()
  where id = p_id;

  return v_member;
end;
$$;

revoke all on function public.kirim_pendaftaran_lengkap(text, text, text, date, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text) from public;
revoke all on function public.lampirkan_foto_pendaftaran(uuid) from public;
grant execute on function public.kirim_pendaftaran_lengkap(text, text, text, date, text, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean, text) to anon, authenticated;
grant execute on function public.lampirkan_foto_pendaftaran(uuid) to anon, authenticated;
