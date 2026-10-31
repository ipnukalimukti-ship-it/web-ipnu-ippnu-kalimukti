"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { PERIODE_SEKALI, bulanIni, hariIni, pesanError } from "@/lib/admin-util";
import { bulanTahun, rupiah, tanggal } from "@/lib/format";

type Jenis = { id: string; nama: string; jumlah: number; bulanan: boolean; aktif: boolean };
type Anggota = { id: string; nama: string; jenis: "IPNU" | "IPPNU" };
type Bayar = { id: string; member_id: string; jumlah: number; dibayar_pada: string };
type FormJenis = { id?: string; nama: string; jumlah: string; bulanan: boolean; aktif: boolean };

const kosongJenis = (): FormJenis => ({ nama: "", jumlah: "", bulanan: true, aktif: true });

export default function AdminIuran() {
  return (
    <Halaman
      judul="Iuran"
      peran={["bendahara"]}
      deskripsi="Atur jenis iuran, lalu tandai siapa yang sudah bayar. Setiap pembayaran otomatis tercatat sebagai pemasukan kas."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [pesan, setPesan] = useState<Pesan>(null);
  const [jenisList, setJenisList] = useState<Jenis[] | null>(null);
  const [formJenis, setFormJenis] = useState<FormJenis | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const [iuranId, setIuranId] = useState("");
  const [bulan, setBulan] = useState(bulanIni());
  const [anggota, setAnggota] = useState<Anggota[] | null>(null);
  const [bayar, setBayar] = useState<Map<string, Bayar>>(new Map());
  const [tampil, setTampil] = useState<"semua" | "belum" | "lunas">("semua");
  const [proses, setProses] = useState<string | null>(null); // id anggota yang sedang diproses

  const muatJenis = useCallback(async () => {
    const { data, error } = await db.from("iuran_jenis").select("id,nama,jumlah,bulanan,aktif").order("nama");
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    const list = ((data ?? []) as Jenis[]).map((j) => ({ ...j, jumlah: Number(j.jumlah) }));
    setJenisList(list);
    setIuranId((cur) => (list.some((j) => j.id === cur && j.aktif) ? cur : (list.find((j) => j.aktif)?.id ?? "")));
  }, [db]);

  useEffect(() => {
    muatJenis();
  }, [muatJenis]);

  const jenis = jenisList?.find((j) => j.id === iuranId) ?? null;
  const periode = jenis ? (jenis.bulanan ? `${bulan}-01` : PERIODE_SEKALI) : "";

  const muatStatus = useCallback(async () => {
    if (!iuranId || !periode) {
      setAnggota([]);
      setBayar(new Map());
      return;
    }
    try {
      const [a, b] = await Promise.all([
        db.from("members").select("id,nama,jenis").eq("aktif", true).order("nama"),
        db.from("iuran_pembayaran").select("id,member_id,jumlah,dibayar_pada").eq("iuran_id", iuranId).eq("periode", periode),
      ]);
      if (a.error) throw a.error;
      if (b.error) throw b.error;
      setAnggota((a.data ?? []) as Anggota[]);
      setBayar(new Map(((b.data ?? []) as Bayar[]).map((x) => [x.member_id, { ...x, jumlah: Number(x.jumlah) }])));
    } catch (e) {
      setPesan({ t: "err", teks: pesanError(e) });
    }
  }, [db, iuranId, periode]);

  useEffect(() => {
    setAnggota(null);
    muatStatus();
  }, [muatStatus]);

  const ringkas = useMemo(() => {
    const total = anggota?.length ?? 0;
    const terkumpul = Array.from(bayar.values()).reduce((s, b) => s + b.jumlah, 0);
    const tagihan = (jenis?.jumlah ?? 0) * total;
    return { total, lunas: bayar.size, terkumpul, kurang: Math.max(0, tagihan - terkumpul) };
  }, [anggota, bayar, jenis]);

  const baris = (anggota ?? []).filter((a) => (tampil === "semua" ? true : tampil === "lunas" ? bayar.has(a.id) : !bayar.has(a.id)));

  async function tandai(a: Anggota) {
    setProses(a.id);
    setPesan(null);
    const { error } = await db.rpc("catat_iuran", {
      p_member: a.id,
      p_iuran: iuranId,
      p_periode: periode,
      p_tanggal: hariIni(),
    });
    setProses(null);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else {
      setPesan({ t: "ok", teks: `${a.nama} ditandai lunas dan tercatat di kas.` });
      await muatStatus();
    }
  }

  async function batalkan(a: Anggota) {
    const b = bayar.get(a.id);
    if (!b || !window.confirm(`Batalkan pembayaran ${a.nama}? Catatan pemasukan di kas ikut dihapus.`)) return;
    setProses(a.id);
    setPesan(null);
    const { error } = await db.rpc("batalkan_iuran", { p_id: b.id });
    setProses(null);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else {
      setPesan({ t: "ok", teks: "Pembayaran dibatalkan." });
      await muatStatus();
    }
  }

  async function simpanJenis(e: React.FormEvent) {
    e.preventDefault();
    if (!formJenis) return;
    const jumlah = Math.round(Number(formJenis.jumlah));
    if (!Number.isFinite(jumlah) || jumlah <= 0) {
      setPesan({ t: "err", teks: "Jumlah iuran harus lebih dari 0." });
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const baris = { nama: formJenis.nama.trim(), jumlah, bulanan: formJenis.bulanan, aktif: formJenis.aktif };
      const res = formJenis.id
        ? await db.from("iuran_jenis").update(baris).eq("id", formJenis.id)
        : await db.from("iuran_jenis").insert(baris);
      if (res.error) throw res.error;
      setFormJenis(null);
      setPesan({ t: "ok", teks: "Jenis iuran disimpan." });
      await muatJenis();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapusJenis(j: Jenis) {
    if (!window.confirm(`Hapus jenis iuran "${j.nama}"?`)) return;
    setPesan(null);
    const { error } = await db.from("iuran_jenis").delete().eq("id", j.id);
    if (error) {
      setPesan({
        t: "err",
        teks: /foreign key|violates/i.test(error.message)
          ? "Tidak bisa dihapus karena sudah ada pembayaran. Matikan opsi Aktif saja lewat tombol Ubah."
          : pesanError(error),
      });
    } else {
      setPesan({ t: "ok", teks: "Jenis iuran dihapus." });
      await muatJenis();
    }
  }

  return (
    <>
      <Notif pesan={pesan} />

      <div className="adm-kartu">
        <h2>Status pembayaran</h2>
        {!jenisList ? (
          <p className="adm-kosong">Memuat…</p>
        ) : !jenisList.some((j) => j.aktif) ? (
          <p className="adm-kosong">Belum ada jenis iuran aktif. Buat dulu di bagian "Jenis iuran" di bawah.</p>
        ) : (
          <>
            <div className="adm-bar" style={{ marginBottom: 16 }}>
              <div className="adm-field">
                <label htmlFor="jenis">Jenis iuran</label>
                <select id="jenis" value={iuranId} onChange={(e) => setIuranId(e.target.value)}>
                  {jenisList.filter((j) => j.aktif).map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nama} ({rupiah(j.jumlah)})
                    </option>
                  ))}
                </select>
              </div>
              {jenis?.bulanan && (
                <div className="adm-field">
                  <label htmlFor="bulan">Bulan</label>
                  <input id="bulan" type="month" value={bulan} onChange={(e) => setBulan(e.target.value)} />
                </div>
              )}
              <div className="adm-field">
                <label htmlFor="tampil">Tampilkan</label>
                <select id="tampil" value={tampil} onChange={(e) => setTampil(e.target.value as "semua" | "belum" | "lunas")}>
                  <option value="semua">Semua anggota</option>
                  <option value="belum">Belum bayar</option>
                  <option value="lunas">Sudah bayar</option>
                </select>
              </div>
            </div>

            {anggota && (
              <p style={{ marginBottom: 12 }}>
                <strong>{ringkas.lunas}</strong> dari <strong>{ringkas.total}</strong> anggota aktif sudah bayar
                {jenis?.bulanan ? ` untuk ${bulanTahun(bulan + "-01")}` : ""}. Terkumpul{" "}
                <strong className="masuk">{rupiah(ringkas.terkumpul)}</strong>, belum terkumpul{" "}
                <strong className="keluar">{rupiah(ringkas.kurang)}</strong>.
              </p>
            )}

            {!anggota ? (
              <p className="adm-kosong">Memuat…</p>
            ) : baris.length === 0 ? (
              <p className="adm-kosong">Tidak ada anggota di tampilan ini.</p>
            ) : (
              <div className="adm-gulir">
                <table className="adm-tabel">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Status</th>
                      <th className="kanan">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baris.map((a) => {
                      const b = bayar.get(a.id);
                      return (
                        <tr key={a.id}>
                          <td>
                            {a.nama} <span className={a.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{a.jenis}</span>
                          </td>
                          <td>
                            {b ? (
                              <span className="adm-lencana">Lunas, {tanggal(b.dibayar_pada)}</span>
                            ) : (
                              <span className="adm-lencana merah">Belum bayar</span>
                            )}
                          </td>
                          <td className="aksi">
                            {b ? (
                              <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => batalkan(a)} disabled={proses === a.id}>
                                Batalkan
                              </button>
                            ) : (
                              <button className="adm-btn adm-btn-kecil adm-btn-utama" onClick={() => tandai(a)} disabled={proses === a.id}>
                                {proses === a.id ? "Memproses…" : "Tandai lunas"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <div className="adm-kartu">
        <h2>Jenis iuran</h2>

        {formJenis ? (
          <form className="adm-form" onSubmit={simpanJenis} style={{ marginBottom: 20 }}>
            <div className="adm-baris">
              <div className="adm-field">
                <label htmlFor="nama">Nama iuran</label>
                <input id="nama" required maxLength={80} value={formJenis.nama} onChange={(e) => setFormJenis({ ...formJenis, nama: e.target.value })} />
              </div>
              <div className="adm-field">
                <label htmlFor="jumlah">Jumlah per anggota (Rp)</label>
                <input id="jumlah" type="number" inputMode="numeric" min={1} step={1} required value={formJenis.jumlah} onChange={(e) => setFormJenis({ ...formJenis, jumlah: e.target.value })} />
              </div>
            </div>
            <div className="adm-aksi">
              <label className="adm-centang">
                <input type="checkbox" checked={formJenis.bulanan} onChange={(e) => setFormJenis({ ...formJenis, bulanan: e.target.checked })} />
                Dibayar tiap bulan
              </label>
              <label className="adm-centang">
                <input type="checkbox" checked={formJenis.aktif} onChange={(e) => setFormJenis({ ...formJenis, aktif: e.target.checked })} />
                Aktif
              </label>
            </div>
            <p className="teks-kecil">Mengubah jumlah hanya berlaku untuk pembayaran berikutnya. Pembayaran yang sudah tercatat tidak berubah.</p>
            <div className="adm-aksi">
              <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
                {sibuk ? "Menyimpan…" : "Simpan"}
              </button>
              <button className="adm-btn" type="button" onClick={() => setFormJenis(null)} disabled={sibuk}>
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="adm-aksi" style={{ marginBottom: 16 }}>
            <button className="adm-btn" onClick={() => { setPesan(null); setFormJenis(kosongJenis()); }}>
              Tambah jenis iuran
            </button>
          </div>
        )}

        {jenisList && jenisList.length > 0 && (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="kanan">Jumlah</th>
                  <th>Jadwal</th>
                  <th>Status</th>
                  <th className="kanan">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {jenisList.map((j) => (
                  <tr key={j.id}>
                    <td>{j.nama}</td>
                    <td className="kanan angka">{rupiah(j.jumlah)}</td>
                    <td>{j.bulanan ? "Tiap bulan" : "Sekali bayar"}</td>
                    <td>
                      <span className={j.aktif ? "adm-lencana" : "adm-lencana abu"}>{j.aktif ? "Aktif" : "Nonaktif"}</span>
                    </td>
                    <td className="aksi">
                      <button
                        className="adm-btn adm-btn-kecil"
                        onClick={() => {
                          setPesan(null);
                          setFormJenis({ id: j.id, nama: j.nama, jumlah: String(j.jumlah), bulanan: j.bulanan, aktif: j.aktif });
                        }}
                      >
                        Ubah
                      </button>
                      <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapusJenis(j)}>Hapus</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
