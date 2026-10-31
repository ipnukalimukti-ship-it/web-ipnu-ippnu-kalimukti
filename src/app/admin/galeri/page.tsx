"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { hapusFoto, hariIni, pesanError, unggahFoto } from "@/lib/admin-util";
import { tanggal } from "@/lib/format";

type Foto = { id: string; url: string; caption: string | null };
type Album = {
  id: string;
  judul: string;
  deskripsi: string | null;
  tanggal: string;
  cover_url: string | null;
  photos: Foto[];
};
type Form = { id?: string; judul: string; deskripsi: string; tanggal: string };

const kosong = (): Form => ({ judul: "", deskripsi: "", tanggal: hariIni() });

export default function AdminGaleri() {
  return (
    <Halaman judul="Galeri" peran={["sekretaris"]} deskripsi="Satu album untuk tiap kegiatan. Foto otomatis diperkecil sebelum diunggah.">
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [albums, setAlbums] = useState<Album[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [terpilih, setTerpilih] = useState<string | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    const { data, error } = await db
      .from("gallery_albums")
      .select("id,judul,deskripsi,tanggal,cover_url,photos:gallery_photos(id,url,caption)")
      .order("tanggal", { ascending: false });
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else setAlbums((data ?? []) as unknown as Album[]);
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const album = albums?.find((a) => a.id === terpilih) ?? null;

  async function simpanAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSibuk(true);
    setPesan(null);
    try {
      const baris = { judul: form.judul.trim(), deskripsi: form.deskripsi.trim() || null, tanggal: form.tanggal };
      if (form.id) {
        const r = await db.from("gallery_albums").update(baris).eq("id", form.id);
        if (r.error) throw r.error;
      } else {
        const r = await db.from("gallery_albums").insert(baris).select("id").single();
        if (r.error) throw r.error;
        setTerpilih((r.data as { id: string }).id);
      }
      setForm(null);
      setPesan({ t: "ok", teks: "Album disimpan." });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapusAlbum(a: Album) {
    if (!window.confirm(`Hapus album "${a.judul}" beserta ${a.photos.length} fotonya?`)) return;
    setSibuk(true);
    setPesan(null);
    try {
      const r = await db.from("gallery_albums").delete().eq("id", a.id);
      if (r.error) throw r.error;
      for (const f of a.photos) await hapusFoto(db, f.url);
      if (a.cover_url && !a.photos.some((f) => f.url === a.cover_url)) await hapusFoto(db, a.cover_url);
      if (terpilih === a.id) setTerpilih(null);
      setPesan({ t: "ok", teks: "Album dihapus." });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!album || files.length === 0) return;
    setSibuk(true);
    setPesan(null);
    let berhasil = 0;
    let gagal = 0;
    let cover = album.cover_url;
    for (const file of files) {
      try {
        const url = await unggahFoto(db, file, `galeri/${album.id}`);
        const r = await db.from("gallery_photos").insert({ album_id: album.id, url });
        if (r.error) {
          await hapusFoto(db, url);
          throw r.error;
        }
        if (!cover) {
          cover = url;
          await db.from("gallery_albums").update({ cover_url: url }).eq("id", album.id);
        }
        berhasil++;
      } catch {
        gagal++;
      }
    }
    setPesan(
      gagal === 0
        ? { t: "ok", teks: `${berhasil} foto diunggah.` }
        : { t: "err", teks: `${berhasil} foto berhasil, ${gagal} gagal. Coba unggah ulang yang gagal.` },
    );
    setSibuk(false);
    await muat();
  }

  async function jadikanSampul(f: Foto) {
    if (!album) return;
    const r = await db.from("gallery_albums").update({ cover_url: f.url }).eq("id", album.id);
    if (r.error) setPesan({ t: "err", teks: pesanError(r.error) });
    else {
      setPesan({ t: "ok", teks: "Sampul album diganti." });
      await muat();
    }
  }

  async function hapusSatuFoto(f: Foto) {
    if (!album || !window.confirm("Hapus foto ini?")) return;
    setPesan(null);
    const r = await db.from("gallery_photos").delete().eq("id", f.id);
    if (r.error) {
      setPesan({ t: "err", teks: pesanError(r.error) });
      return;
    }
    await hapusFoto(db, f.url);
    if (album.cover_url === f.url) {
      const sisa = album.photos.find((p) => p.id !== f.id);
      await db.from("gallery_albums").update({ cover_url: sisa?.url ?? null }).eq("id", album.id);
    }
    await muat();
  }

  return (
    <>
      <Notif pesan={pesan} />

      {form ? (
        <form className="adm-kartu adm-form" onSubmit={simpanAlbum}>
          <h2>{form.id ? "Ubah album" : "Album baru"}</h2>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="judul">Nama album</label>
              <input id="judul" required maxLength={120} value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="tgl">Tanggal kegiatan</label>
              <input id="tgl" type="date" required value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="desk">Keterangan</label>
            <input id="desk" maxLength={250} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
          </div>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan album"}
            </button>
            <button className="adm-btn" type="button" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        <div className="adm-aksi" style={{ marginBottom: 16 }}>
          <button className="adm-btn adm-btn-utama" onClick={() => { setPesan(null); setForm(kosong()); }}>
            Buat album baru
          </button>
        </div>
      )}

      <div className="adm-kartu">
        <h2>Album</h2>
        {!albums ? (
          <p className="adm-kosong">Memuat…</p>
        ) : albums.length === 0 ? (
          <p className="adm-kosong">Belum ada album.</p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th>Album</th>
                  <th>Tanggal</th>
                  <th>Foto</th>
                  <th className="kanan">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {albums.map((a) => (
                  <tr key={a.id}>
                    <td>{a.judul}</td>
                    <td>{tanggal(a.tanggal)}</td>
                    <td>{a.photos.length}</td>
                    <td className="aksi">
                      <button className="adm-btn adm-btn-kecil" onClick={() => setTerpilih(a.id === terpilih ? null : a.id)}>
                        {a.id === terpilih ? "Tutup" : "Kelola foto"}
                      </button>
                      <button
                        className="adm-btn adm-btn-kecil"
                        onClick={() => {
                          setPesan(null);
                          setForm({ id: a.id, judul: a.judul, deskripsi: a.deskripsi ?? "", tanggal: a.tanggal });
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Ubah
                      </button>
                      <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapusAlbum(a)} disabled={sibuk}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {album && (
        <div className="adm-kartu">
          <h2>Foto di "{album.judul}"</h2>
          <div className="adm-field">
            <label htmlFor="unggah">Tambah foto (boleh pilih beberapa sekaligus)</label>
            <input id="unggah" type="file" accept="image/*" multiple onChange={unggah} disabled={sibuk} />
          </div>
          {sibuk && <p className="adm-kosong" role="status">Mengunggah, mohon tunggu…</p>}
          {album.photos.length === 0 ? (
            <p className="adm-kosong">Album ini belum punya foto.</p>
          ) : (
            <div className="adm-galeri">
              {album.photos.map((f) => (
                <figure key={f.id}>
                  <img src={f.url} alt="" loading="lazy" />
                  <div className="adm-aksi">
                    {album.cover_url === f.url ? (
                      <span className="adm-lencana kuning">Sampul</span>
                    ) : (
                      <button className="adm-btn adm-btn-kecil" onClick={() => jadikanSampul(f)}>Jadikan sampul</button>
                    )}
                    <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapusSatuFoto(f)}>Hapus</button>
                  </div>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
