"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { pesanError } from "@/lib/admin-util";

type Status = "baru" | "disetujui" | "ditolak";
type Daftar = {
  id: string;
  created_at: string;
  nama: string;
  jenis: "IPNU" | "IPPNU";
  tempat_lahir: string | null;
  tanggal_lahir: string;
  no_hp: string;
  alamat: string | null;
  sekolah: string | null;
  moto: string | null;
  kesan: string | null;
  pesan: string | null;
  hobi: string | null;
  cita_cita: string | null;
  instagram: string | null;
  tiktok: string | null;
  izin_profil: boolean;
  izin_medsos: boolean;
  foto_path: string | null;
  kaderisasi: string[] | null;
  belum_kaderisasi: boolean;
  status: Status;
  alasan_tolak: string | null;
};
type Penyaring = Status | "semua";

const KOLOM =
  "id,created_at,nama,jenis,tempat_lahir,tanggal_lahir,no_hp,alamat,sekolah,moto,kesan,pesan,hobi,cita_cita,instagram,tiktok,izin_profil,izin_medsos,foto_path,kaderisasi,belum_kaderisasi,status,alasan_tolak";

const LABEL: Record<Penyaring, string> = {
  baru: "Baru",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  semua: "Semua",
};

function waktuWib(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

function tanggalPanjang(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

function umur(iso: string): number {
  const lahir = new Date(`${iso}T00:00:00Z`);
  const skrg = new Date();
  let u = skrg.getUTCFullYear() - lahir.getUTCFullYear();
  const belum =
    skrg.getUTCMonth() < lahir.getUTCMonth() ||
    (skrg.getUTCMonth() === lahir.getUTCMonth() && skrg.getUTCDate() < lahir.getUTCDate());
  if (belum) u -= 1;
  return u;
}

/** Nomor untuk tautan WhatsApp: 08xx menjadi 628xx. */
function nomorWa(hp: string): string {
  const angka = hp.replace(/[^0-9]/g, "");
  if (angka.startsWith("0")) return `62${angka.slice(1)}`;
  return angka;
}

export default function AdminPendaftaran() {
  return (
    <Halaman
      judul="Pendaftaran anggota"
      peran={["sekretaris"]}
      deskripsi="Pendaftaran dari formulir di website. Periksa isinya dulu, lalu Setujui untuk menjadikannya anggota (semua isian dan fotonya ikut terbawa). Nomor HP, alamat, dan asal sekolah hanya terlihat oleh pengurus."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [data, setData] = useState<Daftar[] | null>(null);
  const [foto, setFoto] = useState<Record<string, string>>({});
  const [anggota, setAnggota] = useState<{ nama: string; jenis: string }[]>([]);
  const [saring, setSaring] = useState<Penyaring>("baru");
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const [d, a] = await Promise.all([
      db.from("pendaftaran").select(KOLOM).order("created_at", { ascending: false }).limit(300),
      db.from("members").select("nama,jenis"),
    ]);
    if (d.error) {
      setPesan({ t: "err", teks: pesanError(d.error) });
      return;
    }
    const daftar = (d.data ?? []) as Daftar[];
    setData(daftar);
    setAnggota((a.data ?? []) as { nama: string; jenis: string }[]);

    // Alamat sementara untuk melihat foto di penyimpanan pribadi (berlaku 15 menit).
    const jalur = daftar.filter((x) => x.foto_path).map((x) => x.foto_path as string);
    if (jalur.length > 0) {
      const s = await db.storage.from("pendaftaran-foto").createSignedUrls(jalur, 900);
      const peta: Record<string, string> = {};
      for (const baris of s.data ?? []) {
        if (baris.path && baris.signedUrl) peta[baris.path] = baris.signedUrl;
      }
      setFoto(peta);
    } else {
      setFoto({});
    }
  }, [db]);

  useEffect(() => {
    muat();
  }, [muat]);

  const sudahAda = useMemo(
    () => new Set(anggota.map((a) => `${a.nama.trim().toLowerCase()}|${a.jenis}`)),
    [anggota],
  );

  const jumlah = (s: Penyaring) => (data ?? []).filter((d) => s === "semua" || d.status === s).length;
  const tampil = (data ?? []).filter((d) => saring === "semua" || d.status === saring);

  /** Hapus foto di penyimpanan pribadi dan kosongkan penunjuknya. Gagal pun tidak mengganggu. */
  async function bersihkanFoto(d: Daftar) {
    if (!d.foto_path) return;
    try {
      await db.storage.from("pendaftaran-foto").remove([d.foto_path]);
      await db.from("pendaftaran").update({ foto_path: null }).eq("id", d.id);
    } catch {
      /* berkas yatim tidak merusak apa pun */
    }
  }

  async function setujui(d: Daftar) {
    const tampilWeb = d.izin_profil
      ? "Profilnya akan TAMPIL di website (pendaftar mencentang izin)."
      : "Profilnya TIDAK tampil di website (pendaftar tidak mencentang izin). Anda bisa mengubahnya nanti di menu Anggota.";
    const medsos =
      d.izin_medsos && (d.instagram || d.tiktok)
        ? " Instagram dan TikTok ikut tampil."
        : d.instagram || d.tiktok
          ? " Instagram dan TikTok tidak tampil."
          : "";
    const kader = d.kaderisasi && d.kaderisasi.length > 0 ? ` Jenjang kaderisasi (${d.kaderisasi.join(", ")}) ikut tercatat, pastikan benar.` : "";
    if (!window.confirm(`Setujui ${d.nama} dan jadikan anggota ${d.jenis}?\n\n${tampilWeb}${medsos}${kader}`)) return;

    setSibuk(d.id);
    setPesan(null);
    const r = await db.rpc("setujui_pendaftaran", { p_id: d.id });
    if (r.error) {
      setSibuk(null);
      setPesan({ t: "err", teks: pesanError(r.error) });
      return;
    }
    const memberId = r.data as string;

    // Salin foto dari penyimpanan pribadi ke penyimpanan foto anggota.
    let catatan = "";
    if (d.foto_path) {
      try {
        const dl = await db.storage.from("pendaftaran-foto").download(d.foto_path);
        if (dl.error || !dl.data) throw dl.error ?? new Error("Foto kosong");
        const path = `anggota/${crypto.randomUUID()}.jpg`;
        const up = await db.storage.from("media").upload(path, dl.data, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const url = db.storage.from("media").getPublicUrl(path).data.publicUrl;
        const upd = await db.from("members").update({ foto_url: url }).eq("id", memberId);
        if (upd.error) throw upd.error;
        await bersihkanFoto(d);
      } catch {
        catatan = " Fotonya belum berhasil disalin, tambahkan lewat menu Anggota.";
      }
    }

    setSibuk(null);
    setPesan({ t: "ok", teks: `${d.nama} sekarang menjadi anggota. Periksa datanya di menu Anggota.${catatan}` });
    await muat();
  }

  async function tolak(d: Daftar) {
    const alasan = window.prompt(`Tolak pendaftaran ${d.nama}? Tulis alasan (boleh dikosongkan, hanya dilihat pengurus):`, "");
    if (alasan === null) return;
    setSibuk(d.id);
    setPesan(null);
    const r = await db.rpc("tolak_pendaftaran", { p_id: d.id, p_alasan: alasan });
    if (r.error) {
      setSibuk(null);
      setPesan({ t: "err", teks: pesanError(r.error) });
      return;
    }
    await bersihkanFoto(d);
    setSibuk(null);
    setPesan({ t: "ok", teks: "Pendaftaran ditolak." });
    await muat();
  }

  async function hapus(d: Daftar) {
    if (!window.confirm(`Hapus catatan pendaftaran ${d.nama}? Data anggota (kalau sudah disetujui) tidak ikut terhapus.`)) return;
    setSibuk(d.id);
    setPesan(null);
    await bersihkanFoto(d);
    const r = await db.from("pendaftaran").delete().eq("id", d.id);
    setSibuk(null);
    if (r.error) {
      setPesan({ t: "err", teks: pesanError(r.error) });
      return;
    }
    setPesan({ t: "ok", teks: "Catatan pendaftaran dihapus." });
    await muat();
  }

  return (
    <>
      <Notif pesan={pesan} />

      <div className="adm-kartu">
        <div className="adm-aksi" role="group" aria-label="Saring pendaftaran">
          {(["baru", "disetujui", "ditolak", "semua"] as Penyaring[]).map((s) => (
            <button
              key={s}
              className={saring === s ? "adm-btn adm-btn-utama" : "adm-btn"}
              aria-pressed={saring === s}
              onClick={() => setSaring(s)}
            >
              {LABEL[s]} ({jumlah(s)})
            </button>
          ))}
        </div>
        <p className="adm-bantu" style={{ marginTop: 12 }}>
          Setelah selesai diproses, hapus catatannya supaya data pribadi tidak tersimpan dobel. Data anggota yang
          sudah disetujui tetap ada di menu Anggota.
        </p>
      </div>

      {!data ? (
        <div className="adm-kartu"><p className="adm-kosong">Memuat…</p></div>
      ) : tampil.length === 0 ? (
        <div className="adm-kartu">
          <p className="adm-kosong">
            {saring === "baru" ? "Belum ada pendaftaran baru." : "Tidak ada catatan di sini."}
          </p>
        </div>
      ) : (
        tampil.map((d) => {
          const ganda = d.status === "baru" && sudahAda.has(`${d.nama.trim().toLowerCase()}|${d.jenis}`);
          const urlFoto = d.foto_path ? foto[d.foto_path] : undefined;
          const adaProfil = Boolean(d.moto || d.kesan || d.pesan || d.hobi || d.cita_cita || d.instagram || d.tiktok);
          return (
            <section className="adm-kartu adm-pendaftar" key={d.id} aria-label={`Pendaftaran ${d.nama}`}>
              <div className="adm-pendaftar-foto">
                {urlFoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urlFoto} alt={`Foto ${d.nama}`} />
                ) : (
                  <span>{d.foto_path ? "Memuat foto…" : "Tanpa foto"}</span>
                )}
              </div>

              <div>
                <h2 style={{ margin: 0 }}>
                  {d.nama}{" "}
                  <span className={d.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{d.jenis}</span>{" "}
                  {d.status === "disetujui" && <span className="adm-lencana">Disetujui</span>}
                  {d.status === "ditolak" && <span className="adm-lencana merah">Ditolak</span>}
                  {d.status === "baru" && !d.foto_path && <span className="adm-lencana merah" title="Foto belum terunggah. Minta fotonya lewat nomor yang diisi.">Foto belum ada</span>}
                  {ganda && <span className="adm-lencana merah" title="Sudah ada anggota dengan nama dan organisasi yang sama.">Mungkin sudah terdaftar</span>}
                </h2>
                <p className="adm-bantu" style={{ margin: "4px 0 0" }}>Masuk {waktuWib(d.created_at)} WIB</p>

                <dl className="adm-rincian">
                  <div><dt>Tempat, tanggal lahir</dt><dd>{[d.tempat_lahir, tanggalPanjang(d.tanggal_lahir)].filter(Boolean).join(", ")} ({umur(d.tanggal_lahir)} tahun)</dd></div>
                  <div>
                    <dt>HP / WhatsApp (hanya pengurus)</dt>
                    <dd>
                      {d.no_hp}{" "}
                      <a href={`https://wa.me/${nomorWa(d.no_hp)}`} target="_blank" rel="noopener noreferrer">Buka WhatsApp</a>
                    </dd>
                  </div>
                  {d.sekolah && <div><dt>Asal sekolah dan kelas (hanya pengurus)</dt><dd>{d.sekolah}</dd></div>}
                  {d.alamat && <div><dt>Alamat (hanya pengurus)</dt><dd>{d.alamat}</dd></div>}
                  <div>
                    <dt>Jenjang kaderisasi (pengakuan pendaftar, periksa kebenarannya)</dt>
                    <dd>{d.kaderisasi && d.kaderisasi.length > 0 ? d.kaderisasi.join(", ") : d.belum_kaderisasi ? "Belum pernah mengikuti jenjang apa pun" : "-"}</dd>
                  </div>
                </dl>

                {adaProfil && (
                  <>
                    <h3 className="adm-sub">Profil untuk kartu</h3>
                    <dl className="adm-rincian">
                      {d.moto && <div><dt>Moto</dt><dd>&ldquo;{d.moto}&rdquo;</dd></div>}
                      {d.kesan && <div><dt>Kesan</dt><dd>{d.kesan}</dd></div>}
                      {d.pesan && <div><dt>Pesan</dt><dd>{d.pesan}</dd></div>}
                      {d.hobi && <div><dt>Hobi</dt><dd>{d.hobi}</dd></div>}
                      {d.cita_cita && <div><dt>Cita-cita</dt><dd>{d.cita_cita}</dd></div>}
                      {(d.instagram || d.tiktok) && (
                        <div>
                          <dt>Media sosial</dt>
                          <dd>{[d.instagram && `Instagram @${d.instagram}`, d.tiktok && `TikTok @${d.tiktok}`].filter(Boolean).join(", ")}</dd>
                        </div>
                      )}
                    </dl>
                  </>
                )}

                <p style={{ margin: "10px 0" }}>
                  <span className={d.izin_profil ? "adm-lencana" : "adm-lencana abu"}>
                    {d.izin_profil ? "Izin tampil di website: ya" : "Izin tampil di website: tidak"}
                  </span>{" "}
                  {(d.instagram || d.tiktok) && (
                    <span className={d.izin_medsos ? "adm-lencana" : "adm-lencana abu"}>
                      {d.izin_medsos ? "Izin medsos tampil: ya" : "Izin medsos tampil: tidak"}
                    </span>
                  )}
                </p>
                {d.alasan_tolak && <p className="adm-bantu">Alasan penolakan: {d.alasan_tolak}</p>}

                <div className="adm-aksi">
                  {d.status === "baru" && (
                    <>
                      <button className="adm-btn adm-btn-utama adm-btn-kecil" onClick={() => setujui(d)} disabled={sibuk === d.id}>
                        {sibuk === d.id ? "Memproses…" : "Setujui"}
                      </button>
                      <button className="adm-btn adm-btn-kecil" onClick={() => tolak(d)} disabled={sibuk === d.id}>Tolak</button>
                    </>
                  )}
                  <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(d)} disabled={sibuk === d.id}>Hapus catatan</button>
                </div>
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
