"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { buatSlug, hapusFoto, keInputWaktu, pesanError, unggahFoto } from "@/lib/admin-util";
import { tanggal } from "@/lib/format";

type Berita = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  isi: string;
  gambar_url: string | null;
  terbit: boolean;
  tanggal_terbit: string;
};

type Form = {
  id?: string;
  judul: string;
  ringkasan: string;
  isi: string;
  gambar_url: string | null;
  asal: string | null; // gambar sebelum diedit, untuk dibersihkan setelah disimpan
  terbit: boolean;
  waktu: string;
};

const kosong = (): Form => ({
  judul: "",
  ringkasan: "",
  isi: "",
  gambar_url: null,
  asal: null,
  terbit: true,
  waktu: keInputWaktu(new Date().toISOString()),
});

export default function AdminBerita() {
  return (
    <Halaman judul="Berita" peran={["sekretaris"]} deskripsi="Tulis, ubah, dan terbitkan berita untuk halaman publik.">
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [daftar, setDaftar] = useState<Berita[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    const { data, error } = await db
      .from("news")
      .select("id,judul,slug,ringkasan,isi,gambar_url,terbit,tanggal_terbit")
      .order("tanggal_terbit", { ascending: false });
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else setDaftar((data ?? []) as Berita[]);
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubah = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(n: Berita) {
    setPesan(null);
    setForm({
      id: n.id,
      judul: n.judul,
      ringkasan: n.ringkasan ?? "",
      isi: n.isi,
      gambar_url: n.gambar_url,
      asal: n.gambar_url,
      terbit: n.terbit,
      waktu: keInputWaktu(n.tanggal_terbit),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pilihGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSibuk(true);
    try {
      const url = await unggahFoto(db, file, "berita");
      ubah("gambar_url", url);
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSibuk(true);
    setPesan(null);
    try {
      const baris = {
        judul: form.judul.trim(),
        ringkasan: form.ringkasan.trim() || null,
        isi: form.isi.trim(),
        gambar_url: form.gambar_url,
        terbit: form.terbit,
        tanggal_terbit: new Date(form.waktu).toISOString(),
      };
      const res = form.id
        ? await db.from("news").update(baris).eq("id", form.id)
        : await db.from("news").insert({ ...baris, slug: buatSlug(baris.judul) });
      if (res.error) throw res.error;
      if (form.asal && form.asal !== form.gambar_url) await hapusFoto(db, form.asal);
      setForm(null);
      setPesan({
        t: "ok",
        teks: baris.terbit ? "Berita disimpan dan tampil di website." : "Berita disimpan sebagai draf.",
      });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function gantiStatus(n: Berita) {
    setPesan(null);
    const { error } = await db.from("news").update({ terbit: !n.terbit }).eq("id", n.id);
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else await muat();
  }

  async function hapus(n: Berita) {
    if (!window.confirm(`Hapus berita "${n.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setPesan(null);
    const { error } = await db.from("news").delete().eq("id", n.id);
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    await hapusFoto(db, n.gambar_url);
    setPesan({ t: "ok", teks: "Berita dihapus." });
    await muat();
  }

  return (
    <>
      <Notif pesan={pesan} />

      {form ? (
        <form className="adm-kartu adm-form" onSubmit={simpan}>
          <h2>{form.id ? "Ubah berita" : "Berita baru"}</h2>

          <div className="adm-field">
            <label htmlFor="judul">Judul</label>
            <input id="judul" required maxLength={150} value={form.judul} onChange={(e) => ubah("judul", e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="ringkasan">Ringkasan</label>
            <input
              id="ringkasan"
              maxLength={250}
              value={form.ringkasan}
              onChange={(e) => ubah("ringkasan", e.target.value)}
            />
            <span className="adm-bantu">Satu atau dua kalimat yang tampil di daftar berita.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="isi">Isi berita</label>
            <textarea id="isi" required value={form.isi} onChange={(e) => ubah("isi", e.target.value)} />
            <span className="adm-bantu">Pisahkan paragraf dengan satu baris kosong.</span>
          </div>

          <div className="adm-field">
            <span className="adm-label">Gambar (opsional)</span>
            {form.gambar_url && <img className="adm-foto-pratinjau" src={form.gambar_url} alt="" />}
            <div className="adm-aksi">
              <input type="file" accept="image/*" onChange={pilihGambar} disabled={sibuk} aria-label="Pilih gambar" />
              {form.gambar_url && (
                <button type="button" className="adm-btn adm-btn-kecil" onClick={() => ubah("gambar_url", null)}>
                  Hapus gambar
                </button>
              )}
            </div>
          </div>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="waktu">Tanggal terbit</label>
              <input id="waktu" type="datetime-local" required value={form.waktu} onChange={(e) => ubah("waktu", e.target.value)} />
            </div>
            <div className="adm-field">
              <span className="adm-label">Status</span>
              <label className="adm-centang">
                <input type="checkbox" checked={form.terbit} onChange={(e) => ubah("terbit", e.target.checked)} />
                Terbitkan di website
              </label>
            </div>
          </div>

          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan berita"}
            </button>
            <button className="adm-btn" type="button" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <div className="adm-aksi" style={{ marginBottom: 16 }}>
          <button className="adm-btn adm-btn-utama" onClick={() => { setPesan(null); setForm(kosong()); }}>
            Tulis berita baru
          </button>
        </div>
      )}

      <div className="adm-kartu">
        <h2>Semua berita</h2>
        {!daftar ? (
          <p className="adm-kosong">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="adm-kosong">Belum ada berita. Klik "Tulis berita baru".</p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th className="kanan">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((n) => (
                  <tr key={n.id}>
                    <td>
                      {n.terbit ? (
                        <a href={`/berita/${n.slug}`} target="_blank" rel="noreferrer">{n.judul}</a>
                      ) : (
                        n.judul
                      )}
                    </td>
                    <td>{tanggal(n.tanggal_terbit)}</td>
                    <td>
                      <span className={n.terbit ? "adm-lencana" : "adm-lencana abu"}>{n.terbit ? "Terbit" : "Draf"}</span>
                    </td>
                    <td className="aksi">
                      <button className="adm-btn adm-btn-kecil" onClick={() => edit(n)}>Ubah</button>
                      <button className="adm-btn adm-btn-kecil" onClick={() => gantiStatus(n)}>
                        {n.terbit ? "Jadikan draf" : "Terbitkan"}
                      </button>
                      <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(n)}>Hapus</button>
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
