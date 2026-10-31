"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { bisa, bulanIni, pesanError, rentangBulan } from "@/lib/admin-util";
import { bulanTahun, rupiah } from "@/lib/format";

type Ringkas = {
  saldo: number;
  anggota: number;
  draf: number | null;
  agenda: number | null;
  iuran: { lunas: number; target: number; terkumpul: number } | null;
};

export default function Dashboard() {
  return (
    <Halaman judul="Dashboard" peran={["sekretaris", "bendahara"]}>
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db, profil } = useAdmin();
  const [data, setData] = useState<Ringkas | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const sekretaris = bisa(profil, "sekretaris");
  const bendahara = bisa(profil, "bendahara");
  const periode = bulanIni();

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const hitung = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
          const r = await q;
          if (r.error) throw new Error(r.error.message);
          return r.count ?? 0;
        };

        const saldoRes = await db.from("kas_saldo").select("saldo").maybeSingle();
        if (saldoRes.error) throw saldoRes.error;

        const anggota = await hitung(
          db.from("members").select("id", { count: "exact", head: true }).eq("aktif", true),
        );
        const draf = sekretaris
          ? await hitung(db.from("news").select("id", { count: "exact", head: true }).eq("terbit", false))
          : null;
        const agenda = sekretaris
          ? await hitung(
              db.from("events").select("id", { count: "exact", head: true }).gte("mulai", new Date().toISOString()),
            )
          : null;

        let iuran: Ringkas["iuran"] = null;
        if (bendahara) {
          const jenisRes = await db.from("iuran_jenis").select("id").eq("aktif", true).eq("bulanan", true);
          if (jenisRes.error) throw jenisRes.error;
          const ids = (jenisRes.data ?? []).map((j: { id: string }) => j.id);
          const { awal, akhir } = rentangBulan(periode);
          const bayarRes = ids.length
            ? await db
                .from("iuran_pembayaran")
                .select("jumlah")
                .in("iuran_id", ids)
                .gte("periode", awal)
                .lt("periode", akhir)
            : { data: [], error: null };
          if (bayarRes.error) throw bayarRes.error;
          const bayar = (bayarRes.data ?? []) as { jumlah: number }[];
          iuran = {
            lunas: bayar.length,
            target: ids.length * anggota,
            terkumpul: bayar.reduce((s, b) => s + Number(b.jumlah), 0),
          };
        }

        if (!batal) {
          setData({
            saldo: Number((saldoRes.data as { saldo: number } | null)?.saldo ?? 0),
            anggota,
            draf,
            agenda,
            iuran,
          });
        }
      } catch (e) {
        if (!batal) setPesan({ t: "err", teks: pesanError(e) });
      }
    })();
    return () => {
      batal = true;
    };
  }, [db, sekretaris, bendahara, periode]);

  return (
    <>
      <p className="adm-deskripsi">Halo, {profil.nama}. Ringkasan singkat ranting hari ini.</p>
      <Notif pesan={pesan} />
      {!data && !pesan && <p className="adm-kosong">Memuat…</p>}
      {data && (
        <dl className="adm-stat">
          <div className="adm-kartu kuning">
            <dt>Saldo kas</dt>
            <dd className="angka">{rupiah(data.saldo)}</dd>
          </div>
          <div className="adm-kartu">
            <dt>Anggota aktif</dt>
            <dd className="angka">{data.anggota}</dd>
          </div>
          {data.iuran && (
            <div className="adm-kartu">
              <dt>Iuran {bulanTahun(periode + "-01")}</dt>
              <dd className="angka">
                {data.iuran.lunas}/{data.iuran.target}
                <small>lunas, terkumpul {rupiah(data.iuran.terkumpul)}</small>
              </dd>
            </div>
          )}
          {data.draf !== null && (
            <div className="adm-kartu">
              <dt>Berita draf</dt>
              <dd className="angka">{data.draf}</dd>
            </div>
          )}
          {data.agenda !== null && (
            <div className="adm-kartu">
              <dt>Agenda mendatang</dt>
              <dd className="angka">{data.agenda}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="adm-kartu">
        <h2>Pintasan</h2>
        <div className="adm-aksi">
          {sekretaris && (
            <>
              <Link className="adm-btn" href="/admin/berita">Tulis berita</Link>
              <Link className="adm-btn" href="/admin/agenda">Tambah agenda</Link>
            </>
          )}
          {bendahara && (
            <>
              <Link className="adm-btn" href="/admin/kas">Catat kas</Link>
              <Link className="adm-btn" href="/admin/iuran">Tandai iuran</Link>
            </>
          )}
          <Link className="adm-btn" href="/admin/anggota">Data anggota</Link>
        </div>
      </div>
    </>
  );
}
