"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { pesanError } from "@/lib/admin-util";

type Org = "IPNU" | "IPPNU" | "GABUNGAN";
type Per = { id: string; nama: string; sekarang: boolean };
type Dept = { id: string; periode_id: string; nama: string; jenis: Org; urutan: number; tampil: boolean };
type Tugas = {
  id: string;
  departemen_id: string;
  member_id: string;
  jabatan: string;
  utama: boolean;
  urutan: number;
  tampil: boolean;
  members: { nama: string; jenis: "IPNU" | "IPPNU"; aktif: boolean; tampil_publik: boolean } | null;
};
type Anggota = { id: string; nama: string; jenis: "IPNU" | "IPPNU"; aktif: boolean };

type Panel =
  | { t: "periode-baru"; nama: string; salin: boolean; jadikan: boolean }
  | { t: "periode-nama"; nama: string }
  | { t: "dept"; id?: string; nama: string; jenis: Org; urutan: string; tampil: boolean }
  | { t: "tugas-baru"; dept: Dept; cari: string; pilih: string[]; jabatan: string; utama: boolean; urutan: string }
  | { t: "tugas-ubah"; id: string; nama: string; jabatan: string; utama: boolean; urutan: string; tampil: boolean }
  | null;

const LABEL_ORG: Record<Org, string> = { IPNU: "IPNU", IPPNU: "IPPNU", GABUNGAN: "Gabungan" };
const URUT_ORG: Record<Org, number> = { IPNU: 0, IPPNU: 1, GABUNGAN: 2 };

export default function AdminStruktur() {
  return (
    <Halaman
      judul="Struktur kepengurusan"
      peran={[]}
      deskripsi="Atur periode, departemen, dan siapa menjabat apa. Nama dan foto orang selalu ikut data di menu Anggota. Hanya Admin dan Pengelola yang bisa membuka halaman ini."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [periode, setPeriode] = useState<Per[] | null>(null);
  const [pid, setPid] = useState("");
  const [dept, setDept] = useState<Dept[] | null>(null);
  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [panel, setPanel] = useState<Panel>(null);
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  const gagal = (e: unknown, duplikat?: string) => {
    const m = pesanError(e);
    setPesan({ t: "err", teks: duplikat && /duplicate key|unique/i.test(m) ? duplikat : m });
  };

  const muatPeriode = useCallback(
    async (pilih?: string) => {
      const { data, error } = await db
        .from("periode")
        .select("id,nama,sekarang")
        .order("sekarang", { ascending: false })
        .order("nama", { ascending: false });
      if (error) {
        setPesan({ t: "err", teks: pesanError(error) });
        return;
      }
      const daftar = (data ?? []) as Per[];
      setPeriode(daftar);
      setPid((lama) => {
        const target = pilih ?? lama;
        return daftar.some((p) => p.id === target) ? target : (daftar.find((p) => p.sekarang)?.id ?? daftar[0]?.id ?? "");
      });
    },
    [db],
  );

  const muatIsi = useCallback(
    async (periodeId: string) => {
      if (!periodeId) {
        setDept([]);
        setTugas([]);
        return;
      }
      const d = await db
        .from("departemen")
        .select("id,periode_id,nama,jenis,urutan,tampil")
        .eq("periode_id", periodeId);
      if (d.error) {
        setPesan({ t: "err", teks: pesanError(d.error) });
        return;
      }
      const daftar = ((d.data ?? []) as Dept[]).sort(
        (a, b) => URUT_ORG[a.jenis] - URUT_ORG[b.jenis] || a.urutan - b.urutan || a.nama.localeCompare(b.nama),
      );
      setDept(daftar);
      if (daftar.length === 0) {
        setTugas([]);
        return;
      }
      const t = await db
        .from("penugasan")
        .select("id,departemen_id,member_id,jabatan,utama,urutan,tampil,members(nama,jenis,aktif,tampil_publik)")
        .in("departemen_id", daftar.map((x) => x.id));
      if (t.error) {
        setPesan({ t: "err", teks: pesanError(t.error) });
        return;
      }
      setTugas(
        ((t.data ?? []) as unknown as Tugas[]).sort(
          (a, b) => Number(b.utama) - Number(a.utama) || a.urutan - b.urutan || (a.members?.nama ?? "").localeCompare(b.members?.nama ?? ""),
        ),
      );
    },
    [db],
  );

  const muatAnggota = useCallback(async () => {
    const { data } = await db.from("members").select("id,nama,jenis,aktif").order("nama");
    setAnggota((data ?? []) as Anggota[]);
  }, [db]);

  useEffect(() => {
    muatPeriode();
    muatAnggota();
  }, [muatPeriode, muatAnggota]);

  useEffect(() => {
    muatIsi(pid);
  }, [pid, muatIsi]);

  const per = periode?.find((p) => p.id === pid) ?? null;

  function buka(p: Panel) {
    setPesan(null);
    setPanel(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Jalankan satu aksi simpan dengan penanganan sibuk dan galat yang seragam. */
  async function kerjakan(aksi: () => Promise<string>, duplikat?: string) {
    setSibuk(true);
    setPesan(null);
    try {
      const teks = await aksi();
      setPanel(null);
      setPesan({ t: "ok", teks });
    } catch (e) {
      gagal(e, duplikat);
    } finally {
      setSibuk(false);
    }
  }

  // ---------- Periode ----------

  function simpanPeriodeBaru(p: Extract<Panel, { t: "periode-baru" }>) {
    const nama = p.nama.trim();
    if (!nama) return;
    kerjakan(async () => {
      const ins = await db.from("periode").insert({ nama }).select("id").single();
      if (ins.error) throw ins.error;
      const baruId = ins.data.id as string;
      if (p.salin && pid) {
        const r = await db.rpc("salin_departemen", { p_dari: pid, p_ke: baruId });
        if (r.error) throw r.error;
      }
      if (p.jadikan) {
        const r = await db.rpc("jadikan_periode_sekarang", { p_id: baruId });
        if (r.error) throw r.error;
      }
      await muatPeriode(baruId);
      return `Periode ${nama} dibuat.`;
    }, "Nama periode itu sudah dipakai.");
  }

  function simpanNamaPeriode(p: Extract<Panel, { t: "periode-nama" }>) {
    const nama = p.nama.trim();
    if (!nama || !per) return;
    kerjakan(async () => {
      const r = await db.from("periode").update({ nama }).eq("id", per.id);
      if (r.error) throw r.error;
      await muatPeriode(per.id);
      return "Nama periode diganti.";
    }, "Nama periode itu sudah dipakai.");
  }

  function jadikanSekarang() {
    if (!per) return;
    kerjakan(async () => {
      const r = await db.rpc("jadikan_periode_sekarang", { p_id: per.id });
      if (r.error) throw r.error;
      await muatPeriode(per.id);
      return `Periode ${per.nama} sekarang tampil sebagai periode berjalan di website.`;
    });
  }

  function hapusPeriode() {
    if (!per) return;
    if (per.sekarang) {
      setPesan({ t: "err", teks: "Periode yang sedang berjalan tidak bisa dihapus. Jadikan periode lain sebagai sekarang dulu." });
      return;
    }
    if (!window.confirm(`Hapus periode ${per.nama}? Semua departemen dan jabatan di dalamnya ikut terhapus. Data anggota tidak terhapus.`)) return;
    kerjakan(async () => {
      const r = await db.from("periode").delete().eq("id", per.id);
      if (r.error) throw r.error;
      await muatPeriode();
      return "Periode dihapus.";
    });
  }

  // ---------- Departemen ----------

  function simpanDept(p: Extract<Panel, { t: "dept" }>) {
    const nama = p.nama.trim();
    const urutan = Number.parseInt(p.urutan, 10);
    if (!nama || !pid) return;
    if (!Number.isFinite(urutan)) {
      setPesan({ t: "err", teks: "Urutan harus berupa angka." });
      return;
    }
    kerjakan(async () => {
      const baris = { nama, jenis: p.jenis, urutan, tampil: p.tampil };
      const r = p.id
        ? await db.from("departemen").update(baris).eq("id", p.id)
        : await db.from("departemen").insert({ ...baris, periode_id: pid });
      if (r.error) throw r.error;
      await muatIsi(pid);
      return "Departemen disimpan.";
    });
  }

  function hapusDept(d: Dept) {
    const n = tugas.filter((t) => t.departemen_id === d.id).length;
    const tambahan = n > 0 ? ` ${n} orang di dalamnya ikut dilepas dari jabatan (datanya di menu Anggota tetap ada).` : "";
    if (!window.confirm(`Hapus departemen ${d.nama}?${tambahan}`)) return;
    kerjakan(async () => {
      const r = await db.from("departemen").delete().eq("id", d.id);
      if (r.error) throw r.error;
      await muatIsi(pid);
      return "Departemen dihapus.";
    });
  }

  // ---------- Jabatan ----------

  function simpanTugasBaru(p: Extract<Panel, { t: "tugas-baru" }>) {
    const jabatan = p.jabatan.trim();
    const awal = Number.parseInt(p.urutan, 10);
    if (p.pilih.length === 0) {
      setPesan({ t: "err", teks: "Pilih minimal satu anggota." });
      return;
    }
    if (!jabatan) {
      setPesan({ t: "err", teks: "Isi jabatan, misalnya Koordinator atau Anggota." });
      return;
    }
    if (!Number.isFinite(awal)) {
      setPesan({ t: "err", teks: "Urutan harus berupa angka." });
      return;
    }
    kerjakan(async () => {
      const baris = p.pilih.map((member_id, i) => ({
        departemen_id: p.dept.id,
        member_id,
        jabatan,
        utama: p.utama,
        urutan: awal + i * 10,
      }));
      const r = await db.from("penugasan").insert(baris);
      if (r.error) throw r.error;
      await muatIsi(pid);
      return `${baris.length} orang ditambahkan ke ${p.dept.nama}.`;
    }, "Salah satu orang itu sudah ada di departemen ini.");
  }

  function simpanTugasUbah(p: Extract<Panel, { t: "tugas-ubah" }>) {
    const jabatan = p.jabatan.trim();
    const urutan = Number.parseInt(p.urutan, 10);
    if (!jabatan) {
      setPesan({ t: "err", teks: "Isi jabatan." });
      return;
    }
    if (!Number.isFinite(urutan)) {
      setPesan({ t: "err", teks: "Urutan harus berupa angka." });
      return;
    }
    kerjakan(async () => {
      const r = await db.from("penugasan").update({ jabatan, utama: p.utama, urutan, tampil: p.tampil }).eq("id", p.id);
      if (r.error) throw r.error;
      await muatIsi(pid);
      return "Jabatan disimpan.";
    });
  }

  function hapusTugas(t: Tugas) {
    if (!window.confirm(`Lepas ${t.members?.nama ?? "orang ini"} dari jabatan ${t.jabatan}? Data anggotanya tidak terhapus.`)) return;
    kerjakan(async () => {
      const r = await db.from("penugasan").delete().eq("id", t.id);
      if (r.error) throw r.error;
      await muatIsi(pid);
      return "Jabatan dilepas.";
    });
  }

  function bukaTambahOrang(d: Dept) {
    const urutDept = tugas.filter((t) => t.departemen_id === d.id).map((t) => t.urutan);
    const awal = (urutDept.length ? Math.max(...urutDept) : 0) + 10;
    buka({ t: "tugas-baru", dept: d, cari: "", pilih: [], jabatan: "Anggota", utama: false, urutan: String(awal) });
  }

  // ---------- Tampilan ----------

  return (
    <>
      <Notif pesan={pesan} />

      {/* ----- Panel formulir (muncul di atas) ----- */}
      {panel?.t === "periode-baru" && (
        <form className="adm-kartu adm-form" onSubmit={(e) => { e.preventDefault(); simpanPeriodeBaru(panel); }}>
          <h2>Periode baru</h2>
          <div className="adm-field" style={{ maxWidth: 320 }}>
            <label htmlFor="p-nama">Nama periode</label>
            <input id="p-nama" required maxLength={40} placeholder="2027-2029" value={panel.nama} onChange={(e) => setPanel({ ...panel, nama: e.target.value })} />
            <span className="adm-bantu">Awali dengan tahun supaya urutannya benar.</span>
          </div>
          {per && (
            <label className="adm-centang">
              <input type="checkbox" checked={panel.salin} onChange={(e) => setPanel({ ...panel, salin: e.target.checked })} />
              Salin departemen dari periode {per.nama} (tanpa orangnya)
            </label>
          )}
          <label className="adm-centang">
            <input type="checkbox" checked={panel.jadikan} onChange={(e) => setPanel({ ...panel, jadikan: e.target.checked })} />
            Langsung jadikan periode sekarang (yang tampil di website)
          </label>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Buat periode"}</button>
            <button className="adm-btn" type="button" onClick={() => setPanel(null)} disabled={sibuk}>Batal</button>
          </div>
        </form>
      )}

      {panel?.t === "periode-nama" && (
        <form className="adm-kartu adm-form" onSubmit={(e) => { e.preventDefault(); simpanNamaPeriode(panel); }}>
          <h2>Ganti nama periode</h2>
          <div className="adm-field" style={{ maxWidth: 320 }}>
            <label htmlFor="p-nama2">Nama periode</label>
            <input id="p-nama2" required maxLength={40} value={panel.nama} onChange={(e) => setPanel({ ...panel, nama: e.target.value })} />
          </div>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan"}</button>
            <button className="adm-btn" type="button" onClick={() => setPanel(null)} disabled={sibuk}>Batal</button>
          </div>
        </form>
      )}

      {panel?.t === "dept" && (
        <form className="adm-kartu adm-form" onSubmit={(e) => { e.preventDefault(); simpanDept(panel); }}>
          <h2>{panel.id ? "Ubah departemen" : "Departemen baru"}</h2>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="d-nama">Nama departemen</label>
              <input id="d-nama" required maxLength={80} placeholder="Departemen Media" value={panel.nama} onChange={(e) => setPanel({ ...panel, nama: e.target.value })} />
              <span className="adm-bantu">BPH juga dibuat sebagai departemen.</span>
            </div>
            <div className="adm-field">
              <label htmlFor="d-jenis">Milik</label>
              <select id="d-jenis" value={panel.jenis} onChange={(e) => setPanel({ ...panel, jenis: e.target.value as Org })}>
                <option value="IPNU">IPNU</option>
                <option value="IPPNU">IPPNU</option>
                <option value="GABUNGAN">Gabungan (IPNU dan IPPNU)</option>
              </select>
            </div>
          </div>
          <div className="adm-field" style={{ maxWidth: 220 }}>
            <label htmlFor="d-urutan">Urutan</label>
            <input id="d-urutan" required inputMode="numeric" value={panel.urutan} onChange={(e) => setPanel({ ...panel, urutan: e.target.value.replace(/[^0-9-]/g, "") })} />
            <span className="adm-bantu">Angka kecil tampil lebih dulu. Contoh: BPH 10, Media 20, Kaderisasi 30.</span>
          </div>
          <label className="adm-centang">
            <input type="checkbox" checked={panel.tampil} onChange={(e) => setPanel({ ...panel, tampil: e.target.checked })} />
            Tampil di website
          </label>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan departemen"}</button>
            <button className="adm-btn" type="button" onClick={() => setPanel(null)} disabled={sibuk}>Batal</button>
          </div>
        </form>
      )}

      {panel?.t === "tugas-baru" && (
        <TambahOrang
          panel={panel}
          setPanel={setPanel}
          anggota={anggota}
          sudah={tugas.filter((t) => t.departemen_id === panel.dept.id).map((t) => t.member_id)}
          sibuk={sibuk}
          onSimpan={() => simpanTugasBaru(panel)}
        />
      )}

      {panel?.t === "tugas-ubah" && (
        <form className="adm-kartu adm-form" onSubmit={(e) => { e.preventDefault(); simpanTugasUbah(panel); }}>
          <h2>Ubah jabatan: {panel.nama}</h2>
          <div className="adm-baris">
            <div className="adm-field">
              <label htmlFor="t-jabatan">Jabatan</label>
              <input id="t-jabatan" required maxLength={80} value={panel.jabatan} onChange={(e) => setPanel({ ...panel, jabatan: e.target.value })} />
            </div>
            <div className="adm-field">
              <label htmlFor="t-urutan">Urutan</label>
              <input id="t-urutan" required inputMode="numeric" value={panel.urutan} onChange={(e) => setPanel({ ...panel, urutan: e.target.value.replace(/[^0-9-]/g, "") })} />
            </div>
          </div>
          <label className="adm-centang">
            <input type="checkbox" checked={panel.utama} onChange={(e) => setPanel({ ...panel, utama: e.target.checked })} />
            Pimpinan (ketua, koordinator): tampil lebih menonjol
          </label>
          <label className="adm-centang">
            <input type="checkbox" checked={panel.tampil} onChange={(e) => setPanel({ ...panel, tampil: e.target.checked })} />
            Tampil di website
          </label>
          <div className="adm-aksi">
            <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>{sibuk ? "Menyimpan…" : "Simpan jabatan"}</button>
            <button className="adm-btn" type="button" onClick={() => setPanel(null)} disabled={sibuk}>Batal</button>
          </div>
        </form>
      )}

      {/* ----- Periode ----- */}
      <div className="adm-kartu">
        {!periode ? (
          <p className="adm-kosong">Memuat…</p>
        ) : periode.length === 0 ? (
          <>
            <p className="adm-kosong">Belum ada periode. Buat periode pertama, misalnya 2025-2027.</p>
            <div className="adm-aksi">
              <button className="adm-btn adm-btn-utama" onClick={() => buka({ t: "periode-baru", nama: "", salin: false, jadikan: true })}>Periode baru</button>
            </div>
          </>
        ) : (
          <>
            <div className="adm-field" style={{ maxWidth: 360 }}>
              <label htmlFor="pilih-periode">Periode</label>
              <select id="pilih-periode" value={pid} onChange={(e) => { setPanel(null); setPid(e.target.value); }}>
                {periode.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama}{p.sekarang ? " (sekarang)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <p className="adm-bantu" style={{ marginTop: 8 }}>
              {per?.sekarang
                ? "Periode ini yang tampil di website sebagai kepengurusan sekarang."
                : "Periode ini arsip. Tetap bisa dilihat pengunjung lewat pilihan periode di halaman Pengurus."}
            </p>
            <div className="adm-aksi" style={{ marginTop: 12 }}>
              <button className="adm-btn adm-btn-kecil" onClick={() => buka({ t: "periode-baru", nama: "", salin: Boolean(per), jadikan: false })}>Periode baru</button>
              {per && !per.sekarang && (
                <button className="adm-btn adm-btn-kecil" onClick={jadikanSekarang} disabled={sibuk}>Jadikan periode sekarang</button>
              )}
              {per && (
                <button className="adm-btn adm-btn-kecil" onClick={() => buka({ t: "periode-nama", nama: per.nama })}>Ganti nama</button>
              )}
              {per && (
                <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={hapusPeriode}>Hapus periode</button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ----- Departemen ----- */}
      {per && (
        <div className="adm-aksi" style={{ margin: "16px 0" }}>
          <button className="adm-btn adm-btn-utama" onClick={() => buka({ t: "dept", nama: "", jenis: "IPNU", urutan: String(((dept ?? []).length + 1) * 10), tampil: true })}>
            Tambah departemen
          </button>
        </div>
      )}

      {per && dept && dept.length === 0 && (
        <div className="adm-kartu">
          <p className="adm-kosong">Periode ini belum punya departemen. Klik &quot;Tambah departemen&quot; (misalnya BPH, lalu Media).</p>
        </div>
      )}

      {dept?.map((d) => {
        const orang = tugas.filter((t) => t.departemen_id === d.id);
        return (
          <section className="adm-kartu" key={d.id} aria-label={`Departemen ${d.nama}`}>
            <div className="adm-aksi" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>
                {d.nama}{" "}
                <span className={d.jenis === "IPNU" ? "adm-lencana" : d.jenis === "IPPNU" ? "adm-lencana kuning" : "adm-lencana abu"}>{LABEL_ORG[d.jenis]}</span>{" "}
                {!d.tampil && <span className="adm-lencana abu">Disembunyikan</span>}
              </h2>
              <div className="adm-aksi">
                <button className="adm-btn adm-btn-kecil adm-btn-utama" onClick={() => bukaTambahOrang(d)}>Tambah orang</button>
                <button className="adm-btn adm-btn-kecil" onClick={() => buka({ t: "dept", id: d.id, nama: d.nama, jenis: d.jenis, urutan: String(d.urutan), tampil: d.tampil })}>Ubah</button>
                <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapusDept(d)}>Hapus</button>
              </div>
            </div>

            {orang.length === 0 ? (
              <p className="adm-kosong">Belum ada orang di departemen ini.</p>
            ) : (
              <div className="adm-gulir">
                <table className="adm-tabel">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Jabatan</th>
                      <th>Urutan</th>
                      <th>Status</th>
                      <th className="kanan">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orang.map((t) => {
                      const tersembunyi = t.members ? !(t.members.aktif && t.members.tampil_publik) : false;
                      return (
                        <tr key={t.id}>
                          <td>
                            {t.members?.nama ?? "(anggota tidak ditemukan)"}{" "}
                            {t.members && <span className={t.members.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{t.members.jenis}</span>}
                          </td>
                          <td>{t.jabatan}</td>
                          <td>{t.urutan}</td>
                          <td>
                            {t.utama && <span className="adm-lencana kuning">Pimpinan</span>}{" "}
                            {!t.tampil && <span className="adm-lencana abu">Disembunyikan</span>}{" "}
                            {tersembunyi && <span className="adm-lencana merah" title="Anggotanya disembunyikan atau tidak aktif di menu Anggota, jadi tidak tampil di website.">Anggota disembunyikan</span>}
                          </td>
                          <td className="aksi">
                            <button className="adm-btn adm-btn-kecil" onClick={() => buka({ t: "tugas-ubah", id: t.id, nama: t.members?.nama ?? "", jabatan: t.jabatan, utama: t.utama, urutan: String(t.urutan), tampil: t.tampil })}>Ubah</button>
                            <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapusTugas(t)}>Lepas</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

/** Formulir menambah beberapa orang sekaligus ke satu departemen. */
function TambahOrang({
  panel,
  setPanel,
  anggota,
  sudah,
  sibuk,
  onSimpan,
}: {
  panel: Extract<Panel, { t: "tugas-baru" }>;
  setPanel: (p: Panel) => void;
  anggota: Anggota[];
  sudah: string[];
  sibuk: boolean;
  onSimpan: () => void;
}) {
  const kata = panel.cari.trim().toLowerCase();
  const tersedia = useMemo(
    () => anggota.filter((a) => a.aktif && !sudah.includes(a.id) && (!kata || a.nama.toLowerCase().includes(kata))),
    [anggota, sudah, kata],
  );

  const alih = (id: string) =>
    setPanel({ ...panel, pilih: panel.pilih.includes(id) ? panel.pilih.filter((x) => x !== id) : [...panel.pilih, id] });

  return (
    <form className="adm-kartu adm-form" onSubmit={(e) => { e.preventDefault(); onSimpan(); }}>
      <h2>Tambah orang ke {panel.dept.nama}</h2>

      <div className="adm-field">
        <label htmlFor="cari-anggota">Cari anggota</label>
        <input id="cari-anggota" type="search" placeholder="Ketik nama" value={panel.cari} onChange={(e) => setPanel({ ...panel, cari: e.target.value })} />
        <span className="adm-bantu">Orang yang belum ada di daftar? Tambahkan dulu di menu Anggota.</span>
      </div>

      <div className="adm-pilih" role="group" aria-label="Pilih anggota">
        {tersedia.length === 0 ? (
          <p className="adm-kosong" style={{ margin: 0 }}>Tidak ada anggota yang cocok.</p>
        ) : (
          tersedia.map((a) => (
            <label key={a.id}>
              <input type="checkbox" checked={panel.pilih.includes(a.id)} onChange={() => alih(a.id)} />
              <span>{a.nama}</span>
              <span className={a.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{a.jenis}</span>
            </label>
          ))
        )}
      </div>
      <p className="adm-bantu" role="status">{panel.pilih.length} orang dipilih.</p>

      <div className="adm-baris">
        <div className="adm-field">
          <label htmlFor="tb-jabatan">Jabatan untuk semua yang dipilih</label>
          <input id="tb-jabatan" required maxLength={80} placeholder="Koordinator, Anggota, Sekretaris" value={panel.jabatan} onChange={(e) => setPanel({ ...panel, jabatan: e.target.value })} />
        </div>
        <div className="adm-field">
          <label htmlFor="tb-urutan">Urutan awal</label>
          <input id="tb-urutan" required inputMode="numeric" value={panel.urutan} onChange={(e) => setPanel({ ...panel, urutan: e.target.value.replace(/[^0-9-]/g, "") })} />
          <span className="adm-bantu">Orang berikutnya bertambah 10 dari angka ini.</span>
        </div>
      </div>
      <label className="adm-centang">
        <input type="checkbox" checked={panel.utama} onChange={(e) => setPanel({ ...panel, utama: e.target.checked })} />
        Pimpinan (ketua, koordinator): tampil lebih menonjol
      </label>

      <div className="adm-aksi">
        <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk || panel.pilih.length === 0}>
          {sibuk ? "Menyimpan…" : `Tambahkan ${panel.pilih.length} orang`}
        </button>
        <button className="adm-btn" type="button" onClick={() => setPanel(null)} disabled={sibuk}>Batal</button>
      </div>
    </form>
  );
}
