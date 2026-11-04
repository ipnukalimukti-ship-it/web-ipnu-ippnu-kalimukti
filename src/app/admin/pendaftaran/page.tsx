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
  status: Status;
  alasan_tolak: string | null;
};
type Penyaring = Status | "semua";

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
      deskripsi="Pendaftaran dari formulir di website. Menyetujui akan membuat anggota baru yang BELUM tampil di website, sampai Anda menyalakannya di menu Anggota. Nomor HP dan alamat hanya terlihat oleh pengurus."
    >
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db } = useAdmin();
  const [data, setData] = useState<Daftar[] | null>(null);
  const [anggota, setAnggota] = useState<{ nama: string; jenis: string }[]>([]);
  const [saring, setSaring] = useState<Penyaring>("baru");
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState<string | null>(null);

  const muat = useCallback(async () => {
    const [d, a] = await Promise.all([
      db
        .from("pendaftaran")
        .select("id,created_at,nama,jenis,tempat_lahir,tanggal_lahir,no_hp,alamat,status,alasan_tolak")
        .order("created_at", { ascending: false })
        .limit(300),
      db.from("members").select("nama,jenis"),
    ]);
    if (d.error) {
      setPesan({ t: "err", teks: pesanError(d.error) });
      return;
    }
    setData((d.data ?? []) as Daftar[]);
    setAnggota((a.data ?? []) as { nama: string; jenis: string }[]);
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

  async function kerjakan(id: string, aksi: () => PromiseLike<{ error: unknown }>, sukses: string) {
    setSibuk(id);
    setPesan(null);
    const { error } = await aksi();
    setSibuk(null);
    if (error) {
      setPesan({ t: "err", teks: pesanError(error) });
      return;
    }
    setPesan({ t: "ok", teks: sukses });
    await muat();
  }

  function setujui(d: Daftar) {
    if (!window.confirm(`Setujui ${d.nama} dan jadikan anggota ${d.jenis}? Anggota baru belum tampil di website sampai Anda mengubahnya di menu Anggota.`)) return;
    kerjakan(d.id, () => db.rpc("setujui_pendaftaran", { p_id: d.id }), `${d.nama} sekarang menjadi anggota. Lengkapi datanya di menu Anggota.`);
  }

  function tolak(d: Daftar) {
    const alasan = window.prompt(`Tolak pendaftaran ${d.nama}? Tulis alasan (boleh dikosongkan, hanya dilihat pengurus):`, "");
    if (alasan === null) return;
    kerjakan(d.id, () => db.rpc("tolak_pendaftaran", { p_id: d.id, p_alasan: alasan }), "Pendaftaran ditolak.");
  }

  function hapus(d: Daftar) {
    if (!window.confirm(`Hapus catatan pendaftaran ${d.nama}? Data anggota (kalau sudah disetujui) tidak ikut terhapus.`)) return;
    kerjakan(d.id, () => db.from("pendaftaran").delete().eq("id", d.id), "Catatan pendaftaran dihapus.");
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
          return (
            <section className="adm-kartu" key={d.id} aria-label={`Pendaftaran ${d.nama}`}>
              <div className="adm-aksi" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    {d.nama}{" "}
                    <span className={d.jenis === "IPNU" ? "adm-lencana" : "adm-lencana kuning"}>{d.jenis}</span>{" "}
                    {d.status === "disetujui" && <span className="adm-lencana">Disetujui</span>}
                    {d.status === "ditolak" && <span className="adm-lencana merah">Ditolak</span>}
                    {ganda && <span className="adm-lencana merah" title="Sudah ada anggota dengan nama dan organisasi yang sama.">Mungkin sudah terdaftar</span>}
                  </h2>
                  <p className="adm-bantu" style={{ margin: "4px 0 0" }}>Masuk {waktuWib(d.created_at)} WIB</p>
                </div>
              </div>

              <dl className="adm-rincian">
                <div><dt>Tempat, tanggal lahir</dt><dd>{[d.tempat_lahir, tanggalPanjang(d.tanggal_lahir)].filter(Boolean).join(", ")} ({umur(d.tanggal_lahir)} tahun)</dd></div>
                <div>
                  <dt>HP / WhatsApp</dt>
                  <dd>
                    {d.no_hp}{" "}
                    <a href={`https://wa.me/${nomorWa(d.no_hp)}`} target="_blank" rel="noopener noreferrer">Buka WhatsApp</a>
                  </dd>
                </div>
                {d.alamat && <div><dt>Alamat</dt><dd>{d.alamat}</dd></div>}
                {d.alasan_tolak && <div><dt>Alasan penolakan</dt><dd>{d.alasan_tolak}</dd></div>}
              </dl>

              <div className="adm-aksi">
                {d.status === "baru" && (
                  <>
                    <button className="adm-btn adm-btn-utama adm-btn-kecil" onClick={() => setujui(d)} disabled={sibuk === d.id}>Setujui</button>
                    <button className="adm-btn adm-btn-kecil" onClick={() => tolak(d)} disabled={sibuk === d.id}>Tolak</button>
                  </>
                )}
                <button className="adm-btn adm-btn-kecil adm-btn-bahaya" onClick={() => hapus(d)} disabled={sibuk === d.id}>Hapus catatan</button>
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
