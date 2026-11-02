-- ============================================================
-- Tambahan: struktur kepengurusan (periode, departemen, penugasan)
-- (jalankan SETELAH tambahan-pengelola.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
-- Aman dijalankan ulang. Jalankan SQL ini SETELAH website versi
-- terbaru selesai terpasang di Vercel.
--
-- Konsep:
--  * Periode      : masa kepengurusan, misalnya "2025-2027". Satu periode
--                   ditandai "sekarang" dan itu yang tampil di website.
--  * Departemen   : milik satu periode. Nama dan jumlahnya bebas. Milik
--                   IPNU, IPPNU, atau GABUNGAN.
--  * Penugasan    : satu anggota menjabat di satu departemen. Nama dan
--                   foto selalu ikut data anggota.
--  Hanya pengelola dan admin yang boleh mengubah. Pengunjung hanya
--  membaca lewat view struktur_publik (anggota yang disembunyikan dari
--  website otomatis tidak ikut tampil, dan medsos mengikuti izinnya).
-- ============================================================

-- ---------- Tabel ----------

create table if not exists public.periode (
  id uuid primary key default gen_random_uuid(),
  nama text not null unique,                 -- contoh: 2025-2027
  sekarang boolean not null default false,
  created_at timestamptz not null default now()
);

-- Hanya boleh ada satu periode "sekarang".
create unique index if not exists periode_satu_sekarang on public.periode (sekarang) where sekarang;

create table if not exists public.departemen (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.periode (id) on delete cascade,
  nama text not null,
  jenis text not null default 'GABUNGAN' check (jenis in ('IPNU', 'IPPNU', 'GABUNGAN')),
  urutan integer not null default 100,       -- angka kecil tampil lebih dulu
  tampil boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists departemen_periode_idx on public.departemen (periode_id, jenis, urutan);

create table if not exists public.penugasan (
  id uuid primary key default gen_random_uuid(),
  departemen_id uuid not null references public.departemen (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  jabatan text not null,                     -- contoh: Ketua, Koordinator, Anggota
  utama boolean not null default false,      -- tampil lebih menonjol (ketua, koordinator)
  urutan integer not null default 100,
  tampil boolean not null default true,
  created_at timestamptz not null default now(),
  unique (departemen_id, member_id)
);

create index if not exists penugasan_departemen_idx on public.penugasan (departemen_id, urutan);
create index if not exists penugasan_member_idx on public.penugasan (member_id);

-- ---------- Aturan akses ----------

alter table public.periode enable row level security;
alter table public.departemen enable row level security;
alter table public.penugasan enable row level security;

drop policy if exists "periode: publik baca" on public.periode;
create policy "periode: publik baca" on public.periode
  for select to anon, authenticated using (true);

drop policy if exists "periode: admin kelola" on public.periode;
create policy "periode: admin kelola" on public.periode
  for all to authenticated
  using (public.peran() in ('pengelola', 'admin'))
  with check (public.peran() in ('pengelola', 'admin'));

drop policy if exists "departemen: admin kelola" on public.departemen;
create policy "departemen: admin kelola" on public.departemen
  for all to authenticated
  using (public.peran() in ('pengelola', 'admin'))
  with check (public.peran() in ('pengelola', 'admin'));

drop policy if exists "penugasan: admin kelola" on public.penugasan;
create policy "penugasan: admin kelola" on public.penugasan
  for all to authenticated
  using (public.peran() in ('pengelola', 'admin'))
  with check (public.peran() in ('pengelola', 'admin'));

revoke all on public.periode, public.departemen, public.penugasan from anon;
grant select on public.periode to anon;
grant select, insert, update, delete on public.periode, public.departemen, public.penugasan to authenticated;

-- ---------- View untuk halaman publik ----------

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
    case when m.tampil_medsos then m.tiktok end as tiktok
  from public.penugasan p
  join public.departemen d on d.id = p.departemen_id
  join public.members m on m.id = p.member_id
  where p.tampil and d.tampil and m.tampil_publik and m.aktif;

grant select on public.struktur_publik to anon, authenticated;

-- ---------- Fungsi bantu ----------

-- Menandai satu periode sebagai "sekarang" (yang lain otomatis tidak).
create or replace function public.jadikan_periode_sekarang(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(public.peran() in ('pengelola', 'admin'), false) is not true then
    raise exception 'Anda tidak punya izin mengubah periode';
  end if;
  if not exists (select 1 from public.periode where id = p_id) then
    raise exception 'Periode tidak ditemukan';
  end if;
  update public.periode set sekarang = false where sekarang and id <> p_id;
  update public.periode set sekarang = true where id = p_id;
end;
$$;

-- Menyalin departemen (tanpa orangnya) dari satu periode ke periode lain.
create or replace function public.salin_departemen(p_dari uuid, p_ke uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  if coalesce(public.peran() in ('pengelola', 'admin'), false) is not true then
    raise exception 'Anda tidak punya izin menyalin departemen';
  end if;
  if p_dari = p_ke then
    raise exception 'Periode asal dan tujuan tidak boleh sama';
  end if;
  insert into public.departemen (periode_id, nama, jenis, urutan, tampil)
  select p_ke, nama, jenis, urutan, tampil from public.departemen where periode_id = p_dari;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.jadikan_periode_sekarang(uuid) from public, anon;
revoke all on function public.salin_departemen(uuid, uuid) from public, anon;
grant execute on function public.jadikan_periode_sekarang(uuid) to authenticated;
grant execute on function public.salin_departemen(uuid, uuid) to authenticated;

-- ---------- Catatan aktivitas untuk tabel baru ----------
-- (memperbarui fungsi pencatat agar mengenal tabel struktur)

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
  -- Dilewati kalau tabel aktivitas belum ada (SQL pengelola belum dijalankan).
  if to_regclass('public.aktivitas') is null then
    return;
  end if;
  foreach t in array array['periode', 'departemen', 'penugasan'] loop
    execute format('drop trigger if exists catat_aktivitas on public.%I', t);
    execute format(
      'create trigger catat_aktivitas after insert or update or delete on public.%I
         for each row execute function public.catat_aktivitas()', t);
  end loop;
end $$;

-- ---------- Memindahkan pengurus lama ke struktur baru ----------
-- Hanya berjalan kalau belum ada periode sama sekali. Tabel "pengurus" lama
-- tidak dihapus. Pengurus yang belum ada di daftar anggota dibuatkan anggotanya.

do $$
declare
  v_periode uuid;
  v_dept uuid;
  v_member uuid;
  r record;
begin
  if exists (select 1 from public.periode) or to_regclass('public.pengurus') is null then
    return;
  end if;

  insert into public.periode (nama, sekarang) values ('Periode sekarang', true)
  returning id into v_periode;

  insert into public.departemen (periode_id, nama, jenis, urutan)
  select v_periode, bagian, jenis, min(urutan)
  from public.pengurus
  group by bagian, jenis;

  for r in select * from public.pengurus order by jenis, urutan, nama loop
    v_member := null;
    select id into v_member from public.members
    where lower(trim(nama)) = lower(trim(r.nama)) and jenis = r.jenis
    order by created_at limit 1;

    if v_member is null then
      insert into public.members (nama, jenis, foto_url, tampil_publik, aktif)
      values (r.nama, r.jenis, r.foto_url, true, true)
      returning id into v_member;
    else
      update public.members set foto_url = coalesce(foto_url, r.foto_url) where id = v_member;
    end if;

    select id into v_dept from public.departemen
    where periode_id = v_periode and nama = r.bagian and jenis = r.jenis;

    insert into public.penugasan (departemen_id, member_id, jabatan, utama, urutan, tampil)
    values (v_dept, v_member, r.jabatan, upper(r.bagian) = 'BPH', r.urutan, r.tampil)
    on conflict (departemen_id, member_id) do nothing;
  end loop;
end $$;

select
  (select count(*) from public.periode) as periode,
  (select count(*) from public.departemen) as departemen,
  (select count(*) from public.penugasan) as penugasan;
