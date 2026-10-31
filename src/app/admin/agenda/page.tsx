"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { keInputWaktu, pesanError } from "@/lib/admin-util";
import { hari, jam, tanggal } from "@/lib/format";

type Agenda = {
  id: string;
  judul: string;
  deskripsi: string | null;
  lokasi: string | null;
  mulai: string;
  selesai: string | null;
};

type Form = { id?: string; judul: string; deskripsi: string; lokasi: string; mulai: string; selesai: string };

const kosong = (): Form => ({ judul: "", deskripsi: "", lokasi: "", mulai: "", selesai: "" });

export default function AdminAgenda() {
  return (
    <Halaman judul="Agenda" peran={["sekretaris"]} deskripsi="Jadwal kegiatan yang tampil di halaman publik. Waktu memakai zona waktu perangkat Anda (WIB).">
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [daftar, setDaftar] = useState<Agenda[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    const { data, error } = await db
      .from("events")
      .select("id,judul,deskripsi,lokasi,mulai,selesai")
      .order("mulai", { ascending: false });
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else setDaftar((data ?? []) as Agenda[]);
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubah = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(a: Agenda) {
    setPesan(null);
    setForm({
      id: a.id,
      judul: a.judul,
      deskripsi: a.deskripsi ?? "",
      lokasi: a.lokasi ?? "",
      mulai: keInputWaktu(a.mulai),
      selesai: a.selesai ? keInputWaktu(a.selesai) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (form.selesai && new Date(form.selesai) < new Date(form.mulai)) {
      setPesan({ t: "err", teks: "Waktu selesai tidak boleh sebelum waktu mulai." });
      return;
    }
    setSibuk(true);
    setPesan(null);
    try {
      const baris = {
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim() || null,
        lokasi: form.lokasi.trim() || null,
        mulai: new Date(form.mulai).toISOString(),
        selesai: form.selesai ? new Date(form.selesai).toISOString() : null,
      };
      const res = form.id
        ? await db.from("events").update(baris).eq("id", form.id)
        : await db.from("events").insert(baris);
      if (res.error) throw res.error;
      setForm(null);
      setPesan({ t: "ok", teks: "Agenda disimpan." });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(a: Agenda) {
    if (!window.confirm(`Hapus agenda "${a.judul}"?`)) return;
    setPesan(null);
    const { error } = await db.from("events").delete().eq("id", a.id);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else {
      setPesan({ t: "ok", teks: "Agenda dihapus." });
      await muat();
    }
  }

  const sekarang = new Date();

  return (
    <>
      <Notif pesan={pesan} />

      {form ? (
        <form className="adm-kartu adm-form" onSubmit={simpan}>
          <h2>{form.id ? "Ubah agenda" : "Agenda baru"}</h2>
          <div className="adm-field">
            <label htmlFor="judul">Nama kegiatan</label>
            <input id="judul" required maxLength={150} value={form.judul} onChange={(e) => ubah("judul", e.target.value)} />
          </div>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="mulai">Mulai</label>
              <input id="mulai" type="datetime-local" required value={form.mulai} onChange={(e) => ubah("mulai", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="selesai">Selesai (opsional)</label>
              <input id="selesai" type="datetime-local" value={form.selesai} onChange={(e) => ubah("selesai", e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="lokasi">Lokasi</label>
            <input id="lokasi" maxLength={150} value={form.lokasi} onChange={(e) => ubah("lokasi", e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="deskripsi">Keterangan</label>
            <textarea id="deskripsi" style={{ minHeight: 90 }} value={form.deskripsi} onChange={(e) => ubah("deskripsi", e.target.value)} />
          </div>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan agenda"}
            </button>
            <button className="adm-btn" type="button" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <div className="adm-aksi" style={{ marginBottom: 16 }}>
          <button className="adm-btn adm-btn-utama" onClick={() => { setPesan(null); setForm(kosong()); }}>
            Tambah agenda
          </button>
        </div>
      )}

      <div className="adm-kartu">
        <h2>Semua agenda</h2>
        {!daftar ? (
          <p className="adm-kosong">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="adm-kosong">Belum ada agenda.</p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Kegiatan</th>
                  <th>Waktu</th>
                  <th>Lokasi</th>
                  <th className="kanan">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((a) => {
                  const lewat = new Date(a.selesai ?? a.mulai) < sekarang;
                  return (
                    <tr key={a.id}>
                      <td>
                        {a.judul} {lewat && <span className="adm-lencana abu">Selesai</span>}
                      </td>
                      <td>
                        {hari(a.mulai)}, {tanggal(a.mulai)}, {jam(a.mulai)} WIB
                      </td>
                      <td>{a.lokasi ?? "-"}</td>
                      <td className="aksi">
                        <button className="adm-btn adm-btn-kecil" onClick={() => edit(a)}>Ubah</button>
                        <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(a)}>Hapus</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
