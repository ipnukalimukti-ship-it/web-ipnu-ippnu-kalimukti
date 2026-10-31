"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { bisa, hapusFoto, pesanError, unggahFoto } from "@/lib/admin-util";
import { inisial } from "@/lib/format";

type Orang = {
  id: string;
  nama: string;
  jabatan: string;
  bagian: string;
  jenis: "IPNU" | "IPPNU";
  foto_url: string | null;
  urutan: number;
  tampil: boolean;
};

type Form = {
  id?: string;
  nama: string;
  jabatan: string;
  bagian: string;
  jenis: "IPNU" | "IPPNU";
  foto_url: string | null;
  asal: string | null;
  urutan: string;
  tampil: boolean;
};

const kosong = (): Form => ({
  nama: "",
  jabatan: "",
  bagian: "BPH",
  jenis: "IPNU",
  foto_url: null,
  asal: null,
  urutan: "100",
  tampil: true,
});

export default function AdminPengurus() {
  return (
    <Halaman
      judul="Pengurus"
      peran={["sekretaris"]}
      deskripsi="Struktur kepengurusan yang tampil di halaman Pengurus. Ini terpisah dari akun login admin."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db, profil } = useAdmin();
  const bolehUbah = bisa(profil, "sekretaris");
  const [daftar, setDaftar] = useState<Orang[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const muat = useCallback(async () => {
    const { data, error } = await db
      .from("pengurus")
      .select("id,nama,jabatan,bagian,jenis,foto_url,urutan,tampil")
      .order("jenis")
      .order("urutan")
      .order("nama");
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else setDaftar((data ?? []) as Orang[]);
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const ubah = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(o: Orang) {
    setPesan(null);
    setForm({
      id: o.id,
      nama: o.nama,
      jabatan: o.jabatan,
      bagian: o.bagian,
      jenis: o.jenis,
      foto_url: o.foto_url,
      asal: o.foto_url,
      urutan: String(o.urutan),
      tampil: o.tampil,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSibuk(true);
    try {
      ubah("foto_url", await unggahFoto(db, file, "pengurus"));
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
      const urutan = Number.parseInt(form.urutan, 10);
      if (!Number.isFinite(urutan)) throw new Error("Urutan harus berupa angka.");
      const baris = {
        nama: form.nama.trim(),
        jabatan: form.jabatan.trim(),
        bagian: form.bagian.trim() || "BPH",
        jenis: form.jenis,
        foto_url: form.foto_url,
        urutan,
        tampil: form.tampil,
      };
      const res = form.id
        ? await db.from("pengurus").update(baris).eq("id", form.id)
        : await db.from("pengurus").insert(baris);
      if (res.error) throw res.error;
      if (form.asal && form.asal !== form.foto_url) await hapusFoto(db, form.asal);
      setForm(null);
      setPesan({ t: "ok", teks: "Data pengurus disimpan." });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(o: Orang) {
    if (!window.confirm(`Hapus ${o.nama} (${o.jabatan}) dari struktur pengurus?`)) return;
    setPesan(null);
    const { error } = await db.from("pengurus").delete().eq("id", o.id);
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    await hapusFoto(db, o.foto_url);
    setPesan({ t: "ok", teks: "Pengurus dihapus." });
    await muat();
  }

  const bagianAda = Array.from(new Set((daftar ?? []).map((o) => o.bagian)));

  return (
    <>
      <Notif pesan={pesan} />

      {form && bolehUbah ? (
        <form className="adm-kartu adm-form" onSubmit={simpan}>
          <h2>{form.id ? "Ubah pengurus" : "Pengurus baru"}</h2>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="p-nama">Nama</label>
              <input id="p-nama" required maxLength={120} value={form.nama} onChange={(e) => ubah("nama", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="p-jabatan">Jabatan</label>
              <input id="p-jabatan" required maxLength={80} placeholder="Ketua, Sekretaris, Anggota Media" value={form.jabatan} onChange={(e) => ubah("jabatan", e.target.value)} />
            </div>
          </div>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="p-jenis">Organisasi</label>
              <select id="p-jenis" value={form.jenis} onChange={(e) => ubah("jenis", e.target.value as "IPNU" | "IPPNU")}>
                <option value="IPNU">IPNU</option>
                <option value="IPPNU">IPPNU</option>
              </select>
            </div>
            <div className="adm-field">
              <label htmlFor="p-bagian">Bagian</label>
              <input id="p-bagian" required maxLength={60} list="daftar-bagian" value={form.bagian} onChange={(e) => ubah("bagian", e.target.value)} />
              <datalist id="daftar-bagian">
                <option value="BPH" />
                <option value="Media" />
                {bagianAda
                  .filter((b) => b !== "BPH" && b !== "Media")
                  .map((b) => (
                    <option key={b} value={b} />
                  ))}
              </datalist>
              <span className="adm-bantu">Pengurus dikelompokkan per bagian, misalnya BPH atau Media.</span>
            </div>
          </div>

          <div className="adm-field" style={{ maxWidth: 220 }}>
            <label htmlFor="p-urutan">Urutan</label>
            <input id="p-urutan" required inputMode="numeric" value={form.urutan} onChange={(e) => ubah("urutan", e.target.value.replace(/[^0-9-]/g, ""))} />
            <span className="adm-bantu">Angka kecil tampil lebih dulu. Contoh: Ketua 10, Wakil 20, Sekretaris 30, Bendahara 40, Media 50.</span>
          </div>

          <div className="adm-field">
            <span className="adm-label">Foto</span>
            {form.foto_url && <img className="adm-foto-pratinjau" src={form.foto_url} alt="" />}
            <div className="adm-aksi">
              <input type="file" accept="image/*" onChange={pilihFoto} disabled={sibuk} aria-label="Pilih foto" />
              {form.foto_url && (
                <button type="button" className="adm-btn adm-btn-kecil" onClick={() => ubah("foto_url", null)}>
                  Hapus foto
                </button>
              )}
            </div>
          </div>

          <label className="adm-centang">
            <input type="checkbox" checked={form.tampil} onChange={(e) => ubah("tampil", e.target.checked)} />
            Tampil di halaman Pengurus
          </label>

          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan pengurus"}
            </button>
            <button className="adm-btn" type="button" onClick={() => setForm(null)} disabled={sibuk}>
              Batal
            </button>
          </div>
        </form>
      ) : (
        bolehUbah && (
          <div className="adm-aksi" style={{ marginBottom: 16 }}>
            <button className="adm-btn adm-btn-utama" onClick={() => { setPesan(null); setForm(kosong()); }}>
              Tambah pengurus
            </button>
          </div>
        )
      )}

      <div className="adm-kartu">
        {!daftar ? (
          <p className="adm-kosong">Memuat…</p>
        ) : daftar.length === 0 ? (
          <p className="adm-kosong">Belum ada pengurus. Klik &quot;Tambah pengurus&quot;.</p>
        ) : (
          <div className="adm-gulir">
            <table className="adm-tabel">
              <thead>
                <tr>
                  <th aria-label="Foto" />
                  <th>Nama</th>
                  <th>Jabatan</th>
                  <th>Bagian</th>
                  <th>Urutan</th>
                  <th>Status</th>
                  {bolehUbah && <th className="kanan">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {daftar.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.foto_url ? (
                        <img className="adm-foto-kecil" src={o.foto_url} alt="" />
                      ) : (
                        <span className="adm-foto-kecil" style={{ display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                          {inisial(o.nama)}
                        </span>
                      )}
                    </td>
                    <td>
                      {o.nama} <span className={o.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{o.jenis}</span>
                    </td>
                    <td>{o.jabatan}</td>
                    <td>{o.bagian}</td>
                    <td>{o.urutan}</td>
                    <td>{o.tampil ? <span className="adm-lencana">Tampil</span> : <span className="adm-lencana abu">Disembunyikan</span>}</td>
                    {bolehUbah && (
                      <td className="aksi">
                        <button className="adm-btn adm-btn-kecil" onClick={() => edit(o)}>Ubah</button>
                        <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(o)}>Hapus</button>
                      </td>
                    )}
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
