"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { bulanIni, hariIni, pesanError, rentangBulan, saldoSebelum } from "@/lib/admin-util";
import { bulanTahun, rupiah, tanggal } from "@/lib/format";

type Transaksi = {
  id: string;
  tanggal: string;
  jenis: "masuk" | "keluar";
  kategori: string;
  jumlah: number;
  keterangan: string | null;
};

type Form = { id?: string; tanggal: string; jenis: "masuk" | "keluar"; kategori: string; jumlah: string; keterangan: string };

const KATEGORI = ["Donasi", "Kegiatan", "Konsumsi", "Perlengkapan", "Transport", "Sewa", "Lain-lain"];

const kosong = (): Form => ({ tanggal: hariIni(), jenis: "masuk", kategori: "", jumlah: "", keterangan: "" });

/** Pemasukan iuran dibuat otomatis dari halaman Iuran, jadi tidak boleh diubah di sini. */
const otomatis = (t: { kategori: string }) => t.kategori.trim().toLowerCase() === "iuran";

export default function AdminKas() {
  return (
    <Halaman judul="Kas" peran={["bendahara"]} deskripsi="Catat pemasukan dan pengeluaran. Pemasukan dari iuran tercatat otomatis lewat halaman Iuran.">
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [bulan, setBulan] = useState(bulanIni());
  const [daftar, setDaftar] = useState<Transaksi[] | null>(null);
  const [awal, setAwal] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    if (!bulan) return;
    try {
      const { awal: a, akhir } = rentangBulan(bulan);
      const [res, saldoAwal] = await Promise.all([
        db
          .from("kas_transaksi")
          .select("id,tanggal,jenis,kategori,jumlah,keterangan")
          .gte("tanggal", a)
          .lt("tanggal", akhir)
          .order("tanggal", { ascending: false })
          .order("created_at", { ascending: false }),
        saldoSebelum(db, a),
      ]);
      if (res.error) throw res.error;
      setDaftar(((res.data ?? []) as Transaksi[]).map((t) => ({ ...t, jumlah: Number(t.jumlah) })));
      setAwal(saldoAwal);
    } catch (e) {
      setPesan({ t: "err", teks: pesanError(e) });
    }
  }, [db, bulan]);

  useEffect(() => {
    setDaftar(null);
    muat();
  }, [muat]);

  const masuk = (daftar ?? []).filter((t) => t.jenis === "masuk").reduce((s, t) => s + t.jumlah, 0);
  const keluar = (daftar ?? []).filter((t) => t.jenis === "keluar").reduce((s, t) => s + t.jumlah, 0);

  const ubah = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    const jumlah = Math.round(Number(form.jumlah));
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      setPesan({ t: "err", teks: "Jumlah harus lebih dari 0." });
      return;
    }
    if (otomatis({ kategori: form.kategori })) {
      setPesan({ t: "err", teks: 'Kategori "Iuran" dibuat otomatis dari halaman Iuran. Pilih kategori lain.' });
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const baris = {
        tanggal: form.tanggal,
        jenis: form.jenis,
        kategori: form.kategori.trim(),
        jumlah,
        keterangan: form.keterangan.trim() || null,
      };
      const res = form.id
        ? await db.from("kas_transaksi").update(baris).eq("id", form.id)
        : await db.from("kas_transaksi").insert(baris);
      if (res.error) throw res.error;
      // Pindah ke bulan transaksi supaya hasilnya langsung terlihat.
      const bulanBaris = form.tanggal.slice(0, 7);
      setForm(null);
      setPesan({ t: "ok", teks: "Transaksi disimpan." });
      if (bulanBaris !== bulan) setBulan(bulanBaris);
      else await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(t: Transaksi) {
    const ket = `${tanggal(t.tanggal)}, ${t.kategori}, ${rupiah(t.jumlah)}`;
    if (!window.confirm(`Hapus transaksi ini?\n${ket}`)) return;
    setPesan(null);
    const { error } = await db.from("kas_transaksi").delete().eq("id", t.id);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else {
      setPesan({ t: "ok", teks: "Transaksi dihapus." });
      await muat();
    }
  }

  return (
    <>
      <Notif pesan={pesan} />

      {form ? (
        <form className="adm-kartu adm-form" onSubmit={simpan}>
          <h2>{form.id ? "Ubah transaksi" : "Transaksi baru"}</h2>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="tgl">Tanggal</label>
              <input id="tgl" type="date" required value={form.tanggal} onChange={(e) => ubah("tanggal", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="jenis">Jenis</label>
              <select id="jenis" value={form.jenis} onChange={(e) => ubah("jenis", e.target.value as "masuk" | "keluar")}>
                <option value="masuk">Pemasukan</option>
                <option value="keluar">Pengeluaran</option>
              </select>
            </div>
          </div>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="kategori">Kategori</label>
              <input id="kategori" list="daftar-kategori" required maxLength={50} value={form.kategori} onChange={(e) => ubah("kategori", e.target.value)} />
              <datalist id="daftar-kategori">
                {KATEGORI.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div className="adm-field">
              <label htmlFor="jumlah">Jumlah (Rp)</label>
              <input id="jumlah" type="number" inputMode="numeric" min={1} step={1} required value={form.jumlah} onChange={(e) => ubah("jumlah", e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="ket">Keterangan</label>
            <input id="ket" maxLength={200} value={form.keterangan} onChange={(e) => ubah("keterangan", e.target.value)} />
          </div>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan transaksi"}
            </button>
            <button className="adm-btn" type="button" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <div className="adm-aksi" style={{ marginBottom: 16 }}>
          <button className="adm-btn adm-btn-utama" onClick={() => { setPesan(null); setForm(kosong()); }}>
            Catat transaksi
          </button>
        </div>
      )}

      <div className="adm-bar adm-kartu">
        <div className="adm-field">
          <label htmlFor="bulan">Bulan</label>
          <input id="bulan" type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        </div>
      </div>

      {daftar && (
        <dl className="adm-stat" style={{ marginTop: 20 }}>
          <div className="adm-kartu">
            <dt>Saldo awal {bulanTahun(bulan + "-01")}</dt>
            <dd className="angka">{rupiah(awal)}</dd>
          </div>
          <div className="adm-kartu">
            <dt>Pemasukan</dt>
            <dd className="angka masuk">{rupiah(masuk)}</dd>
          </div>
          <div className="adm-kartu">
            <dt>Pengeluaran</dt>
            <dd className="angka keluar">{rupiah(keluar)}</dd>
          </div>
          <div className="adm-kartu kuning">
            <dt>Saldo akhir</dt>
            <dd className="angka">{rupiah(awal + masuk - keluar)}</dd>
          </div>
        </dl>
      )}

      <div className="adm-kartu">
        <h2>Transaksi {bulanTahun(bulan + "-01")}</h2>
        {!daftar ? (
          <p className="adm-kosong">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="adm-kosong">Belum ada transaksi di bulan ini.</p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kategori</th>
                  <th>Keterangan</th>
                  <th className="kanan">Masuk</th>
                  <th className="kanan">Keluar</th>
                  <th className="kanan">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((t) => (
                  <tr key={t.id}>
                    <td>{tanggal(t.tanggal)}</td>
                    <td>{t.kategori}</td>
                    <td>{t.keterangan ?? "-"}</td>
                    <td className="kanan masuk angka">{t.jenis === "masuk" ? rupiah(t.jumlah) : ""}</td>
                    <td className="kanan keluar angka">{t.jenis === "keluar" ? rupiah(t.jumlah) : ""}</td>
                    <td className="aksi">
                      {otomatis(t) ? (
                        <span className="adm-lencana abu" title="Ubah lewat halaman Iuran">Otomatis</span>
                      ) : (
                        <>
                          <button
                            className="adm-btn adm-btn-kecil"
                            onClick={() => {
                              setPesan(null);
                              setForm({
                                id: t.id,
                                tanggal: t.tanggal,
                                jenis: t.jenis,
                                kategori: t.kategori,
                                jumlah: String(t.jumlah),
                                keterangan: t.keterangan ?? "",
                              });
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Ubah
                          </button>
                          <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(t)}>Hapus</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="kanan masuk angka">{rupiah(masuk)}</td>
                  <td className="kanan keluar angka">{rupiah(keluar)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
