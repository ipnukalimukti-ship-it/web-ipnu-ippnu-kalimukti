"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { bisa, bulanIni, pesanError, rentangBulan, saldoSebelum, unduhCsv } from "@/lib/admin-util";
import { bulanTahun, rupiah, tanggal } from "@/lib/format";

type Transaksi = { id: string; tanggal: string; jenis: "masuk" | "keluar"; kategori: string; jumlah: number; keterangan: string | null };
type Jenis = { id: string; nama: string; jumlah: number };
type Anggota = { id: string; nama: string; jenis: "IPNU" | "IPPNU" };
type Mode = "kas" | "iuran" | null;

export default function AdminLaporan() {
  return (
    <Halaman
      judul="Laporan"
      peran={["sekretaris", "bendahara"]}
      deskripsi="Unduh sebagai CSV (langsung terbuka di Excel) atau cetak untuk disimpan sebagai PDF."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db, profil } = useAdmin();
  const bendahara = bisa(profil, "bendahara");
  const [bulan, setBulan] = useState(bulanIni());
  const [pesan, setPesan] = useState<Pesan>(null);
  const [mode, setMode] = useState<Mode>(null);

  const [kas, setKas] = useState<Transaksi[] | null>(null);
  const [saldoAwal, setSaldoAwal] = useState(0);
  const [jenisList, setJenisList] = useState<Jenis[]>([]);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [lunas, setLunas] = useState<Set<string>>(new Set()); // "memberId|iuranId"
  const [muatAnggota, setMuatAnggota] = useState(false);

  const muat = useCallback(async () => {
    if (!bulan || !bendahara) return;
    try {
      const { awal, akhir } = rentangBulan(bulan);
      const [k, saldo, j, a, b] = await Promise.all([
        db
          .from("kas_transaksi")
          .select("id,tanggal,jenis,kategori,jumlah,keterangan")
          .gte("tanggal", awal)
          .lt("tanggal", akhir)
          .order("tanggal")
          .order("created_at"),
        saldoSebelum(db, awal),
        db.from("iuran_jenis").select("id,nama,jumlah").eq("aktif", true).eq("bulanan", true).order("nama"),
        db.from("members").select("id,nama,jenis").eq("aktif", true).order("nama"),
        db.from("iuran_pembayaran").select("member_id,iuran_id").gte("periode", awal).lt("periode", akhir),
      ]);
      for (const r of [k, j, a, b]) if (r.error) throw r.error;
      setKas(((k.data ?? []) as Transaksi[]).map((t) => ({ ...t, jumlah: Number(t.jumlah) })));
      setSaldoAwal(saldo);
      setJenisList(((j.data ?? []) as Jenis[]).map((x) => ({ ...x, jumlah: Number(x.jumlah) })));
      setAnggota((a.data ?? []) as Anggota[]);
      setLunas(new Set(((b.data ?? []) as { member_id: string; iuran_id: string }[]).map((x) => `${x.member_id}|${x.iuran_id}`)));
    } catch (e) {
      setPesan({ t: "err", teks: pesanError(e) });
    }
  }, [db, bulan, bendahara]);

  useEffect(() => {
    setKas(null);
    muat();
  }, [muat]);

  // Setelah dialog cetak ditutup, kembalikan tampilan normal.
  useEffect(() => {
    const selesai = () => setMode(null);
    window.addEventListener("afterprint", selesai);
    return () => window.removeEventListener("afterprint", selesai);
  }, []);

  function cetak(m: Exclude<Mode, null>) {
    setMode(m);
    setTimeout(() => window.print(), 80);
  }

  const masuk = (kas ?? []).filter((t) => t.jenis === "masuk").reduce((s, t) => s + t.jumlah, 0);
  const keluar = (kas ?? []).filter((t) => t.jenis === "keluar").reduce((s, t) => s + t.jumlah, 0);
  const label = bulanTahun(bulan + "-01");

  function csvKas() {
    if (!kas) return;
    unduhCsv(`laporan-kas-${bulan}.csv`, [
      [`Laporan kas IPNU IPPNU Ranting Kalimukti ${label}`],
      [],
      ["Tanggal", "Kategori", "Keterangan", "Masuk", "Keluar"],
      ["", "", "Saldo awal", saldoAwal, ""],
      ...kas.map((t) => [t.tanggal, t.kategori, t.keterangan ?? "", t.jenis === "masuk" ? t.jumlah : "", t.jenis === "keluar" ? t.jumlah : ""]),
      ["", "", "Total", masuk, keluar],
      ["", "", "Saldo akhir", saldoAwal + masuk - keluar, ""],
    ]);
  }

  function csvIuran() {
    unduhCsv(`laporan-iuran-${bulan}.csv`, [
      [`Laporan iuran IPNU IPPNU Ranting Kalimukti ${label}`],
      [],
      ["Nama", "Organisasi", ...jenisList.map((j) => `${j.nama} (${j.jumlah})`)],
      ...anggota.map((a) => [a.nama, a.jenis, ...jenisList.map((j) => (lunas.has(`${a.id}|${j.id}`) ? "Lunas" : "Belum"))]),
    ]);
  }

  async function csvAnggota() {
    setPesan(null);
    const { data, error } = await db
      .from("members")
      .select("nama,jenis,tempat_lahir,tanggal_lahir,no_hp,alamat,aktif,tampil_publik")
      .order("nama");
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    type M = { nama: string; jenis: string; tempat_lahir: string | null; tanggal_lahir: string | null; no_hp: string | null; alamat: string | null; aktif: boolean; tampil_publik: boolean };
    unduhCsv("daftar-anggota.csv", [
      ["Nama", "Organisasi", "Tempat lahir", "Tanggal lahir", "No. HP", "Alamat", "Status", "Tampil di publik"],
      ...((data ?? []) as M[]).map((m) => [m.nama, m.jenis, m.tempat_lahir, m.tanggal_lahir, m.no_hp, m.alamat, m.aktif ? "Aktif" : "Tidak aktif", m.tampil_publik ? "Ya" : "Tidak"]),
    ]);
  }

  const sembunyi = (m: Exclude<Mode, null>) => (mode && mode !== m ? " adm-noprint" : "");

  return (
    <>
      <Notif pesan={pesan} />

      {bendahara && (
        <>
          <div className="adm-bar adm-kartu adm-noprint">
            <div className="adm-field">
              <label htmlFor="bulan">Bulan laporan</label>
              <input id="bulan" type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} />
            </div>
          </div>

          <section className={"adm-kartu" + sembunyi("kas")} aria-labelledby="h-kas">
            <div className="adm-cetak-kop">
              <strong>IPNU IPPNU Ranting Kalimukti</strong>
            </div>
            <h2 id="h-kas">Laporan kas {label}</h2>
            {!kas ? (
              <p className="adm-kosong">Memuat…</p>
            ) : (
              <>
                <div className="adm-gulir">
                  <table className="adm-tabel">
                    <thead>
                      <tr>
                        <th>Tanggal</th>
                        <th>Kategori</th>
                        <th>Keterangan</th>
                        <th className="kanan">Masuk</th>
                        <th className="kanan">Keluar</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={3}><strong>Saldo awal</strong></td>
                        <td className="kanan angka" colSpan={2}><strong>{rupiah(saldoAwal)}</strong></td>
                      </tr>
                      {kas.map((t) => (
                        <tr key={t.id}>
                          <td>{tanggal(t.tanggal)}</td>
                          <td>{t.kategori}</td>
                          <td>{t.keterangan ?? "-"}</td>
                          <td className="kanan angka">{t.jenis === "masuk" ? rupiah(t.jumlah) : ""}</td>
                          <td className="kanan angka">{t.jenis === "keluar" ? rupiah(t.jumlah) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3}>Total bulan ini</td>
                        <td className="kanan angka">{rupiah(masuk)}</td>
                        <td className="kanan angka">{rupiah(keluar)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3}>Saldo akhir</td>
                        <td className="kanan angka" colSpan={2}>{rupiah(saldoAwal + masuk - keluar)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {kas.length === 0 && <p className="adm-kosong">Tidak ada transaksi di bulan ini.</p>}
                <div className="adm-aksi adm-noprint" style={{ marginTop: 16 }}>
                  <button className="adm-btn adm-btn-utama" onClick={csvKas}>Unduh CSV (Excel)</button>
                  <button className="adm-btn" onClick={() => cetak("kas")}>Cetak / simpan PDF</button>
                </div>
              </>
            )}
          </section>

          <section className={"adm-kartu" + sembunyi("iuran")} aria-labelledby="h-iuran">
            <div className="adm-cetak-kop">
              <strong>IPNU IPPNU Ranting Kalimukti</strong>
            </div>
            <h2 id="h-iuran">Laporan iuran bulanan {label}</h2>
            {!kas ? (
              <p className="adm-kosong">Memuat…</p>
            ) : jenisList.length === 0 ? (
              <p className="adm-kosong">Belum ada jenis iuran bulanan yang aktif.</p>
            ) : (
              <>
                <div className="adm-gulir">
                  <table className="adm-tabel">
                    <thead>
                      <tr>
                        <th>Nama</th>
                        {jenisList.map((j) => (
                          <th key={j.id}>{j.nama}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {anggota.map((a) => (
                        <tr key={a.id}>
                          <td>{a.nama} <span className={a.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{a.jenis}</span></td>
                          {jenisList.map((j) => (
                            <td key={j.id}>{lunas.has(`${a.id}|${j.id}`) ? "Lunas" : "Belum"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="adm-aksi adm-noprint" style={{ marginTop: 16 }}>
                  <button className="adm-btn adm-btn-utama" onClick={csvIuran}>Unduh CSV (Excel)</button>
                  <button className="adm-btn" onClick={() => cetak("iuran")}>Cetak / simpan PDF</button>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <section className="adm-kartu adm-noprint" aria-labelledby="h-anggota">
        <h2 id="h-anggota">Daftar anggota</h2>
        <p style={{ marginBottom: 14 }}>
          Semua anggota beserta nomor HP dan alamat. File ini hanya untuk pengurus, jangan dibagikan ke publik.
        </p>
        <button className="adm-btn adm-btn-utama" onClick={csvAnggota}>Unduh CSV (Excel)</button>
      </section>
    </>
  );
}
