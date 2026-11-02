-- ============================================================
-- Tambahan: peran "pengelola" dan catatan aktivitas
-- (jalankan SETELAH tambahan-profil-pengurus.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang. Jalankan SQL ini SETELAH website versi
-- terbaru selesai terpasang di Vercel.
--
-- Isi:
--  1. Peran baru "pengelola" (di atas admin).
--  2. Hanya pengelola yang boleh mengubah peran orang (menutup celah
--     admin menaikkan perannya sendiri).
--  3. Tabel aktivitas: siapa menambah, mengubah, atau menghapus apa.
--     Hanya pengelola yang bisa membacanya. Tidak ada yang bisa
--     mengubah atau menghapus catatannya lewat website.
--  4. Akun "Pengelola Utama" dinaikkan menjadi pengelola.
-- ============================================================

-- ---------- 1. Peran pengelola ----------

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('pengelola', 'admin', 'sekretaris', 'bendahara'));

-- Pengelola dan admin selalu lolos pemeriksaan peran.
create or replace function public.punya_peran(variadic daftar text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    public.peran() in ('pengelola', 'admin') or public.peran() = any (daftar),
    false
  )
$$;

-- ---------- 2. Hanya pengelola yang mengelola profil ----------

drop policy if exists "profil: admin kelola" on public.profiles;
drop policy if exists "profil: pengelola kelola" on public.profiles;
create policy "profil: pengelola kelola" on public.profiles
  for all to authenticated
  using (public.peran() = 'pengelola') with check (public.peran() = 'pengelola');

-- ---------- 3. Catatan aktivitas ----------

create table if not exists public.aktivitas (
  id bigint generated always as identity primary key,
  waktu timestamptz not null default now(),
  user_id uuid,
  nama text not null,
  aksi text not null,          -- tambah, ubah, hapus, masuk
  tabel text,
  ringkasan text
);

create index if not exists aktivitas_waktu_idx on public.aktivitas (waktu desc);

alter table public.aktivitas enable row level security;

drop policy if exists "aktivitas: pengelola baca" on public.aktivitas;
create policy "aktivitas: pengelola baca" on public.aktivitas
  for select to authenticated using (public.peran() = 'pengelola');

revoke all on public.aktivitas from anon, authenticated;
grant select on public.aktivitas to authenticated;

-- Dipanggil otomatis setiap ada tambah, ubah, atau hapus pada tabel yang dipantau.
create or replace function public.catat_aktivitas() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  baris jsonb;
  v_aksi text;
  v_nama text;
  v_ringkas text;
begin
  if tg_op = 'DELETE' then
    baris := to_jsonb(old);
    v_aksi := 'hapus';
  elsif tg_op = 'UPDATE' then
    baris := to_jsonb(new);
    v_aksi := 'ubah';
  else
    baris := to_jsonb(new);
    v_aksi := 'tambah';
  end if;

  -- Catatan kas yang dibuat otomatis oleh iuran tidak dicatat dua kali.
  if tg_table_name = 'kas_transaksi' and baris->>'kategori' = 'Iuran' then
    return null;
  end if;

  v_ringkas := case tg_table_name
    when 'members' then baris->>'nama'
    when 'news' then baris->>'judul'
    when 'events' then baris->>'judul'
    when 'gallery_albums' then baris->>'judul'
    when 'gallery_photos' then coalesce(nullif(baris->>'caption', ''), 'foto album')
    when 'kas_transaksi' then
      (baris->>'jenis') || ' ' || (baris->>'kategori') || ' Rp ' ||
      replace(to_char((baris->>'jumlah')::numeric, 'FM999,999,999,990'), ',', '.')
    when 'iuran_jenis' then baris->>'nama'
    when 'iuran_pembayaran' then
      coalesce((select m.nama from public.members m where m.id = (baris->>'member_id')::uuid), 'anggota')
      || ' (periode ' || to_char((baris->>'periode')::date, 'YYYY-MM') || ')'
    when 'pengurus' then (baris->>'nama') || ' (' || (baris->>'jabatan') || ')'
    when 'periode' then baris->>'nama'
    when 'departemen' then baris->>'nama'
    when 'penugasan' then
      coalesce((select m.nama from public.members m where m.id = (baris->>'member_id')::uuid), 'anggota')
      || ' sebagai ' || (baris->>'jabatan')
    else null
  end;

  select p.nama into v_nama from public.profiles p where p.id = auth.uid();
  if v_nama is null then
    v_nama := case when auth.uid() is null then 'Sistem (SQL Editor)' else 'Pengguna tak dikenal' end;
  end if;

  insert into public.aktivitas (user_id, nama, aksi, tabel, ringkasan)
  values (auth.uid(), v_nama, v_aksi, tg_table_name, v_ringkas);

  return null;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'members', 'news', 'events', 'gallery_albums', 'gallery_photos',
    'kas_transaksi', 'iuran_jenis', 'iuran_pembayaran', 'pengurus',
    'periode', 'departemen', 'penugasan'
  ] loop
    -- Tabel yang belum ada (misalnya struktur belum dipasang) dilewati.
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists catat_aktivitas on public.%I', t);
      execute format(
        'create trigger catat_aktivitas after insert or update or delete on public.%I
           for each row execute function public.catat_aktivitas()', t);
    end if;
  end loop;
end $$;

-- Dipanggil website setelah seseorang berhasil masuk.
create or replace function public.catat_login() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_nama text;
begin
  select nama into v_nama from public.profiles where id = auth.uid();
  if v_nama is null then
    return;
  end if;
  insert into public.aktivitas (user_id, nama, aksi) values (auth.uid(), v_nama, 'masuk');
end;
$$;

revoke all on function public.catat_login() from public, anon;
grant execute on function public.catat_login() to authenticated;

-- ---------- 4. Naikkan Pengelola Utama ----------

update public.profiles
set role = 'pengelola'
where nama = 'Pengelola Utama'
returning nama, role;
