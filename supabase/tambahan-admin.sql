-- ============================================================
-- Tambahan untuk halaman admin (jalankan SETELAH schema.sql)
--
-- Supabase > SQL Editor > New query > tempel > Run.
--
-- Berisi dua fungsi untuk iuran. Keduanya mengerjakan beberapa langkah
-- sekaligus dalam SATU transaksi: kalau satu langkah gagal, semuanya
-- dibatalkan. Dengan begitu catatan iuran dan catatan kas tidak pernah
-- tidak sinkron.
-- ============================================================

-- Tandai satu anggota lunas untuk satu jenis iuran pada satu periode.
-- Otomatis mencatat pemasukan di kas (kategori "Iuran").
create or replace function public.catat_iuran(
  p_member uuid,
  p_iuran uuid,
  p_periode date,
  p_tanggal date default current_date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jumlah numeric;
  v_nama_iuran text;
  v_nama_anggota text;
  v_kas uuid;
  v_id uuid;
begin
  if not public.punya_peran('bendahara') then
    raise exception 'Anda tidak punya izin mencatat iuran';
  end if;

  select jumlah, nama into v_jumlah, v_nama_iuran
  from public.iuran_jenis where id = p_iuran and aktif;
  if not found then
    raise exception 'Jenis iuran tidak ditemukan atau tidak aktif';
  end if;

  select nama into v_nama_anggota from public.members where id = p_member;
  if not found then
    raise exception 'Anggota tidak ditemukan';
  end if;

  insert into public.kas_transaksi (tanggal, jenis, kategori, jumlah, keterangan)
  values (p_tanggal, 'masuk', 'Iuran', v_jumlah, v_nama_iuran || ' - ' || v_nama_anggota)
  returning id into v_kas;

  -- Kalau anggota ini sudah tercatat lunas untuk periode itu, baris ini
  -- melanggar aturan unik dan seluruh fungsi (termasuk catatan kas di atas) dibatalkan.
  insert into public.iuran_pembayaran (member_id, iuran_id, periode, jumlah, dibayar_pada, kas_id)
  values (p_member, p_iuran, p_periode, v_jumlah, p_tanggal, v_kas)
  returning id into v_id;

  return v_id;
end;
$$;

-- Batalkan pembayaran iuran (salah tandai). Catatan kas terkait ikut dihapus.
create or replace function public.batalkan_iuran(p_id uuid) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kas uuid;
begin
  if not public.punya_peran('bendahara') then
    raise exception 'Anda tidak punya izin membatalkan iuran';
  end if;

  select kas_id into v_kas from public.iuran_pembayaran where id = p_id;
  if not found then
    raise exception 'Catatan iuran tidak ditemukan';
  end if;

  delete from public.iuran_pembayaran where id = p_id;
  if v_kas is not null then
    delete from public.kas_transaksi where id = v_kas;
  end if;
end;
$$;

-- Hanya pengguna yang login yang boleh memanggil (pemeriksaan peran ada di dalam fungsi).
revoke all on function public.catat_iuran(uuid, uuid, date, date) from public, anon;
revoke all on function public.batalkan_iuran(uuid) from public, anon;
grant execute on function public.catat_iuran(uuid, uuid, date, date) to authenticated;
grant execute on function public.batalkan_iuran(uuid) to authenticated;
