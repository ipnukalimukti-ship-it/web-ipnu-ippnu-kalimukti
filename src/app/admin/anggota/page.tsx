"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { bisa, hapusFoto, pesanError, unggahFoto } from "@/lib/admin-util";
import { inisial, tanggal } from "@/lib/format";
import { bacaUsername } from "@/lib/medsos";

type Anggota = {
  id: string;
  nama: string;
  jenis: "IPNU" | "IPPNU";
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  foto_url: string | null;
  no_hp: string | null;
  alamat: string | null;
  catatan: string | null;
  bio: string | null;
  prestasi: string | null;
  instagram: string | null;
  tiktok: string | null;
  tampil_medsos: boolean;
  tampil_publik: boolean;
  aktif: boolean;
};

type Form = {
  id?: string;
  nama: string;
  jenis: "IPNU" | "IPPNU";
  tempat_lahir: string;
  tanggal_lahir: string;
  foto_url: string | null;
  asal: string | null;
  no_hp: string;
  alamat: string;
  catatan: string;
  bio: string;
  prestasi: string;
  instagram: string;
  tiktok: string;
  tampil_medsos: boolean;
  tampil_publik: boolean;
  aktif: boolean;
};

const kosong = (): Form => ({
  nama: "",
  jenis: "IPNU",
  tempat_lahir: "",
  tanggal_lahir: "",
  foto_url: null,
  asal: null,
  no_hp: "",
  alamat: "",
  catatan: "",
  bio: "",
  prestasi: "",
  instagram: "",
  tiktok: "",
  tampil_medsos: false,
  tampil_publik: true,
  aktif: true,
});

export default function AdminAnggota() {
  return (
    <Halaman
      judul="Anggota"
      peran={["sekretaris", "bendahara"]}
      deskripsi="Data anggota. Yang tampil di website: nama, tempat tanggal lahir, foto, bio, prestasi, dan (kalau dinyalakan) Instagram dan TikTok. Nomor HP, alamat, dan catatan hanya terlihat oleh pengurus."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db, profil } = useAdmin();
  const bolehUbah = bisa(profil, "sekretaris");
  const [daftar, setDaftar] = useState<Anggota[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);
  const [cari, setCari] = useState("");
  const [jenis, setJenis] = useState<"" | "IPNU" | "IPPNU">("");
  const [status, setStatus] = useState<"aktif" | "nonaktif" | "semua">("aktif");

  const muat = useCallback(async () => {
    const { data, error } = await db
      .from("members")
      .select("id,nama,jenis,tempat_lahir,tanggal_lahir,foto_url,no_hp,alamat,catatan,bio,prestasi,instagram,tiktok,tampil_medsos,tampil_publik,aktif")
      .order("nama");
    if (error) setPesan({ t: "err", teks: pesanError(error) });
    else setDaftar((data ?? []) as Anggota[]);
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (daftar ?? []).filter(
      (a) =>
        (!jenis || a.jenis === jenis) &&
        (status === "semua" || (status === "aktif" ? a.aktif : !a.aktif)) &&
        (!q || a.nama.toLowerCase().includes(q)),
    );
  }, [daftar, cari, jenis, status]);

  const ubah = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  function edit(a: Anggota) {
    setPesan(null);
    setForm({
      id: a.id,
      nama: a.nama,
      jenis: a.jenis,
      tempat_lahir: a.tempat_lahir ?? "",
      tanggal_lahir: a.tanggal_lahir ?? "",
      foto_url: a.foto_url,
      asal: a.foto_url,
      no_hp: a.no_hp ?? "",
      alamat: a.alamat ?? "",
      catatan: a.catatan ?? "",
      bio: a.bio ?? "",
      prestasi: a.prestasi ?? "",
      instagram: a.instagram ?? "",
      tiktok: a.tiktok ?? "",
      tampil_medsos: a.tampil_medsos,
      tampil_publik: a.tampil_publik,
      aktif: a.aktif,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSibuk(true);
    try {
      ubah("foto_url", await unggahFoto(db, file, "anggota"));
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
        nama: form.nama.trim(),
        jenis: form.jenis,
        tempat_lahir: form.tempat_lahir.trim() || null,
        tanggal_lahir: form.tanggal_lahir || null,
        foto_url: form.foto_url,
        no_hp: form.no_hp.trim() || null,
        alamat: form.alamat.trim() || null,
        catatan: form.catatan.trim() || null,
        bio: form.bio.trim() || null,
        prestasi: form.prestasi.trim() || null,
        instagram: bacaUsername(form.instagram, "instagram"),
        tiktok: bacaUsername(form.tiktok, "tiktok"),
        tampil_medsos: form.tampil_medsos,
        tampil_publik: form.tampil_publik,
        aktif: form.aktif,
      };
      const res = form.id
        ? await db.from("members").update(baris).eq("id", form.id)
        : await db.from("members").insert(baris);
      if (res.error) throw res.error;
      if (form.asal && form.asal !== form.foto_url) await hapusFoto(db, form.asal);
      setForm(null);
      setPesan({ t: "ok", teks: "Data anggota disimpan." });
      await muat();
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  async function hapus(a: Anggota) {
    const ok = window.confirm(
      `Hapus ${a.nama} secara permanen?\n\nCatatan iuran anggota ini ikut terhapus (catatan kas tetap ada). ` +
        `Kalau anggota hanya sudah tidak aktif, lebih aman memakai "Ubah" lalu matikan "Aktif".`,
    );
    if (!ok) return;
    setPesan(null);
    const { error } = await db.from("members").delete().eq("id", a.id);
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    await hapusFoto(db, a.foto_url);
    setPesan({ t: "ok", teks: "Anggota dihapus." });
    await muat();
  }

  return (
    <>
      <Notif pesan={pesan} />

      {form && bolehUbah ? (
        <form className="adm-kartu adm-form" onSubmit={simpan}>
          <h2>{form.id ? "Ubah anggota" : "Anggota baru"}</h2>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="nama">Nama lengkap</label>
              <input id="nama" required maxLength={120} value={form.nama} onChange={(e) => ubah("nama", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="jenis">Organisasi</label>
              <select id="jenis" value={form.jenis} onChange={(e) => ubah("jenis", e.target.value as "IPNU" | "IPPNU")}>
                <option value="IPNU">IPNU (putra)</option>
                <option value="IPPNU">IPPNU (putri)</option>
              </select>
            </div>
          </div>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="tempat">Tempat lahir</label>
              <input id="tempat" maxLength={80} value={form.tempat_lahir} onChange={(e) => ubah("tempat_lahir", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="tgl">Tanggal lahir</label>
              <input id="tgl" type="date" value={form.tanggal_lahir} onChange={(e) => ubah("tanggal_lahir", e.target.value)} />
            </div>
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
            <span className="adm-bantu">Foto otomatis diperkecil sebelum diunggah.</span>
          </div>

          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="hp">Nomor HP (hanya pengurus)</label>
              <input id="hp" inputMode="tel" maxLength={20} value={form.no_hp} onChange={(e) => ubah("no_hp", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="alamat">Alamat (hanya pengurus)</label>
              <input id="alamat" maxLength={200} value={form.alamat} onChange={(e) => ubah("alamat", e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label htmlFor="catatan">Catatan (hanya pengurus)</label>
            <input id="catatan" maxLength={200} value={form.catatan} onChange={(e) => ubah("catatan", e.target.value)} />
          </div>

          <h3 className="adm-sub">Profil di website (kartu detail anggota)</h3>
          <div className="adm-field">
            <label htmlFor="bio">Bio singkat</label>
            <textarea id="bio" rows={3} maxLength={400} style={{ minHeight: 90 }} value={form.bio} onChange={(e) => ubah("bio", e.target.value)} />
            <span className="adm-bantu">Dua atau tiga kalimat saja. Tampil di website.</span>
          </div>
          <div className="adm-field">
            <label htmlFor="prestasi">Prestasi dan kegiatan</label>
            <textarea id="prestasi" rows={4} maxLength={1000} style={{ minHeight: 110 }} value={form.prestasi} onChange={(e) => ubah("prestasi", e.target.value)} />
            <span className="adm-bantu">Satu poin per baris. Contoh: Juara 1 lomba hadroh tingkat kecamatan 2025</span>
          </div>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="ig">Instagram</label>
              <input id="ig" maxLength={120} placeholder="@username" value={form.instagram} onChange={(e) => ubah("instagram", e.target.value)} />
            </div>
            <div className="adm-field">
              <label htmlFor="tt">TikTok</label>
              <input id="tt" maxLength={120} placeholder="@username" value={form.tiktok} onChange={(e) => ubah("tiktok", e.target.value)} />
            </div>
          </div>
          <div className="adm-field">
            <label className="adm-centang">
              <input type="checkbox" checked={form.tampil_medsos} onChange={(e) => ubah("tampil_medsos", e.target.checked)} />
              Tampilkan Instagram dan TikTok di website
            </label>
            <span className="adm-bantu">
              Nyalakan hanya kalau anggota sudah setuju (dan orang tuanya, kalau masih di bawah umur). Kalau mati, medsos
              tidak tampil sama sekali.
            </span>
          </div>

          <div className="adm-aksi">
            <label className="adm-centang">
              <input type="checkbox" checked={form.tampil_publik} onChange={(e) => ubah("tampil_publik", e.target.checked)} />
              Tampil di halaman publik
            </label>
            <label className="adm-centang">
              <input type="checkbox" checked={form.aktif} onChange={(e) => ubah("aktif", e.target.checked)} />
              Anggota aktif
            </label>
          </div>

          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
              {sibuk ? "Menyimpan…" : "Simpan anggota"}
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
              Tambah anggota
            </button>
          </div>
        )
      )}

      <div className="adm-kartu">
        <div className="adm-bar" style={{ marginBottom: 14 }}>
          <div className="adm-field" style={{ flex: "1 1 220px" }}>
            <label htmlFor="cari">Cari nama</label>
            <input id="cari" type="search" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>
          <div className="adm-field">
            <label htmlFor="f-jenis">Organisasi</label>
            <select id="f-jenis" value={jenis} onChange={(e) => setJenis(e.target.value as "" | "IPNU" | "IPPNU")}>
              <option value="">Semua</option>
              <option value="IPNU">IPNU</option>
              <option value="IPPNU">IPPNU</option>
            </select>
          </div>
          <div className="adm-field">
            <label htmlFor="f-status">Status</label>
            <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as "aktif" | "nonaktif" | "semua")}>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Tidak aktif</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        {!daftar ? (
          <p className="adm-kosong">Memuat…</p>
        ) : tampil.length === 0 ? (
          <p className="adm-kosong">Tidak ada anggota yang cocok.</p>
        ) : (
          <>
            <p className="teks-kecil" style={{ marginBottom: 8 }}>{tampil.length} anggota</p>
            <div className="adm-gulir">
              <table className="adm-tabel">
                <thead>
                  <tr>
                    <th aria-label="Foto" />
                    <th>Nama</th>
                    <th>TTL</th>
                    <th>No. HP</th>
                    <th>Status</th>
                    {bolehUbah && <th className="kanan">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.foto_url ? (
                          <img className="adm-foto-kecil" src={a.foto_url} alt="" />
                        ) : (
                          <span className="adm-foto-kecil" style={{ display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                            {inisial(a.nama)}
                          </span>
                        )}
                      </td>
                      <td>
                        {a.nama} <span className={a.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{a.jenis}</span>
                      </td>
                      <td>{[a.tempat_lahir, a.tanggal_lahir ? tanggal(a.tanggal_lahir) : null].filter(Boolean).join(", ") || "-"}</td>
                      <td>{a.no_hp ?? "-"}</td>
                      <td>
                        {!a.aktif && <span className="adm-lencana abu">Tidak aktif</span>}{" "}
                        {a.aktif && !a.tampil_publik && <span className="adm-lencana abu">Disembunyikan</span>}
                        {a.aktif && a.tampil_publik && <span className="adm-lencana">Tampil</span>}
                      </td>
                      {bolehUbah && (
                        <td className="aksi">
                          <button className="adm-btn adm-btn-kecil" onClick={() => edit(a)}>Ubah</button>
                          <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(a)}>Hapus</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
