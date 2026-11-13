"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LogoIpnu, LogoIppnu } from "./Logo";
import { inisial, tanggal as formatTanggal } from "@/lib/format";
import { perkecilFoto } from "@/lib/foto";
import { JENJANG_KADERISASI } from "@/lib/kaderisasi";
import { bacaUsername } from "@/lib/medsos";
import { getSupabase } from "@/lib/supabase";

type Pesan = { t: "ok" | "err"; teks: string } | null;
type Foto = { blob: Blob; url: string };

/**
 * Formulir pendaftaran anggota baru. Isian "profil" mengikuti isi kartu anggota.
 * Dikirim lewat fungsi database yang memeriksa isian dan membatasi pengiriman.
 * Foto diunggah ke penyimpanan pribadi, hanya setelah pendaftaran lolos pemeriksaan.
 */
export default function FormDaftar() {
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<"" | "IPNU" | "IPPNU">("");
  const [tempat, setTempat] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [sekolah, setSekolah] = useState("");
  const [moto, setMoto] = useState("");
  const [kesan, setKesan] = useState("");
  const [pesanKartu, setPesanKartu] = useState("");
  const [hobi, setHobi] = useState("");
  const [cita, setCita] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [tanpaIg, setTanpaIg] = useState(false);
  const [tanpaTt, setTanpaTt] = useState(false);
  const [kader, setKader] = useState<string[]>([]);
  const [belumKader, setBelumKader] = useState(false);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [pesanFoto, setPesanFoto] = useState<string | null>(null);
  const [izinProfil, setIzinProfil] = useState(false);
  const [izinMedsos, setIzinMedsos] = useState(false);
  const [setuju, setSetuju] = useState(false);
  const [jebakan, setJebakan] = useState("");
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState<null | { foto: "ada" | "gagal" | "tidak" }>(null);
  const mulai = useRef(Date.now());

  // Lepaskan alamat sementara foto saat diganti atau halaman ditutup.
  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto.url); }, [foto]);

  // Batas tanggal lahir: paling muda 8 tahun, paling tua tahun 1980.
  const batas = useMemo(() => {
    const sekarang = new Date();
    const maks = new Date(sekarang.getFullYear() - 8, sekarang.getMonth(), sekarang.getDate());
    return { min: "1980-01-01", maks: maks.toISOString().slice(0, 10) };
  }, []);

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPesanFoto(null);
    try {
      const blob = await perkecilFoto(file);
      setFoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setPesanFoto("Foto tidak bisa dibaca. Coba foto lain (JPG atau PNG).");
    }
  }

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    if (!jenis) return setPesan({ t: "err", teks: "Pilih IPNU atau IPPNU." });

    if (!foto) return setPesan({ t: "err", teks: "Foto wajib dipasang. Pilih satu foto wajah Anda." });
    if (kader.length === 0 && !belumKader) {
      return setPesan({ t: "err", teks: "Pilih jenjang kaderisasi yang sudah diikuti, atau centang \"belum pernah\"." });
    }

    let ig: string | null = null;
    let tt: string | null = null;
    try {
      ig = tanpaIg ? null : bacaUsername(instagram, "instagram");
      tt = tanpaTt ? null : bacaUsername(tiktok, "tiktok");
    } catch (err) {
      return setPesan({ t: "err", teks: err instanceof Error ? err.message : "Username tidak valid." });
    }

    // Robot biasanya mengisi dan mengirim dalam sekejap.
    if (Date.now() - mulai.current < 3000) {
      return setPesan({ t: "err", teks: "Periksa dulu isian Anda, lalu kirim lagi." });
    }
    const db = getSupabase();
    if (!db) {
      return setPesan({ t: "err", teks: "Mode demo: formulir belum tersambung ke database, jadi tidak terkirim." });
    }

    setSibuk(true);
    const { data, error } = await db.rpc("kirim_pendaftaran_lengkap", {
      p_nama: nama,
      p_jenis: jenis,
      p_tempat_lahir: tempat,
      p_tanggal_lahir: tanggal,
      p_no_hp: hp,
      p_alamat: alamat,
      p_sekolah: sekolah,
      p_moto: moto,
      p_kesan: kesan,
      p_pesan: pesanKartu,
      p_hobi: hobi,
      p_cita_cita: cita,
      p_instagram: ig ?? "",
      p_tiktok: tt ?? "",
      p_tanpa_instagram: tanpaIg,
      p_tanpa_tiktok: tanpaTt,
      p_kaderisasi: kader,
      p_belum_kaderisasi: belumKader,
      p_izin_profil: izinProfil,
      p_izin_medsos: izinMedsos && Boolean(ig || tt),
      p_setuju: setuju,
      p_jebakan: jebakan,
    });

    if (error) {
      setSibuk(false);
      // Pesan dari database (kode P0001) sudah berbahasa Indonesia dan aman ditampilkan.
      setPesan({
        t: "err",
        teks:
          error.code === "P0001"
            ? error.message
            : "Pendaftaran belum bisa dikirim. Coba lagi nanti, atau hubungi pengurus.",
      });
      return;
    }

    // Pendaftaran sudah masuk. Foto menyusul; kalau gagal, pendaftaran tetap sah.
    let hasilFoto: "ada" | "gagal" | "tidak" = "tidak";
    if (foto && typeof data === "string") {
      const up = await db.storage
        .from("pendaftaran-foto")
        .upload(`${data}.jpg`, foto.blob, { contentType: "image/jpeg", upsert: false });
      if (up.error) {
        hasilFoto = "gagal";
      } else {
        const lamp = await db.rpc("lampirkan_foto_pendaftaran", { p_id: data });
        hasilFoto = lamp.error ? "gagal" : "ada";
      }
    }
    setSibuk(false);
    setSelesai({ foto: hasilFoto });
  }

  if (selesai) {
    return (
      <div className="px-form px-form-selesai" role="status">
        <h2>Pendaftaran terkirim</h2>
        <p>
          Terima kasih sudah mendaftar. Pengurus akan memeriksa pendaftaran Anda dan menghubungi lewat nomor yang
          Anda isi. Mohon ditunggu ya.
        </p>
        {selesai.foto === "gagal" && (
          <p className="px-pesan px-pesan-err">
            Fotonya belum berhasil terunggah. Pendaftaran Anda tetap masuk, dan pengurus akan meminta fotonya
            lewat nomor yang Anda isi.
          </p>
        )}
      </div>
    );
  }

  const kelas = jenis === "IPPNU" ? "ippnu" : "ipnu";
  const ttl = [tempat, tanggal ? formatTanggal(tanggal) : null].filter(Boolean).join(", ");
  let igPratinjau = "";
  let ttPratinjau = "";
  try {
    igPratinjau = bacaUsername(instagram, "instagram") ?? "";
    ttPratinjau = bacaUsername(tiktok, "tiktok") ?? "";
  } catch {
    /* username belum lengkap, tidak ditampilkan di pratinjau */
  }

  return (
    <div className="px-daftar-tata">
      <form className="px-form" onSubmit={kirim}>
        <div className="px-form-catatan">
          <strong>Soal data Anda</strong>
          <p>
            Nomor HP, alamat, dan asal sekolah <b>hanya bisa dilihat pengurus</b>, tidak pernah tampil di website.
            Bagian &quot;Profil untuk kartu&quot; baru tampil di website kalau Anda mencentang izinnya dan pengurus
            menyetujui pendaftaran.
          </p>
        </div>

        <h2 className="px-form-bagian">Data diri</h2>

        <div className="px-field">
          <label htmlFor="d-nama">Nama lengkap</label>
          <input id="d-nama" required minLength={3} maxLength={120} autoComplete="name" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>

        <fieldset className="px-field px-pilih">
          <legend>Organisasi</legend>
          <label>
            <input type="radio" name="jenis" value="IPNU" checked={jenis === "IPNU"} onChange={() => setJenis("IPNU")} required />
            <span>IPNU (putra)</span>
          </label>
          <label>
            <input type="radio" name="jenis" value="IPPNU" checked={jenis === "IPPNU"} onChange={() => setJenis("IPPNU")} required />
            <span>IPPNU (putri)</span>
          </label>
        </fieldset>

        <div className="px-field-baris">
          <div className="px-field">
            <label htmlFor="d-tempat">Tempat lahir</label>
            <input id="d-tempat" required maxLength={80} value={tempat} onChange={(e) => setTempat(e.target.value)} />
          </div>
          <div className="px-field">
            <label htmlFor="d-tanggal">Tanggal lahir</label>
            <input id="d-tanggal" type="date" required min={batas.min} max={batas.maks} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
        </div>

        <h2 className="px-form-bagian">Kontak <span>(hanya pengurus)</span></h2>

        <div className="px-field">
          <label htmlFor="d-hp">Nomor HP atau WhatsApp</label>
          <input id="d-hp" type="tel" inputMode="tel" required autoComplete="tel" placeholder="08xxxxxxxxxx" value={hp} onChange={(e) => setHp(e.target.value)} />
        </div>
        <div className="px-field">
          <label htmlFor="d-sekolah">Asal sekolah dan kelas</label>
          <input id="d-sekolah" required maxLength={120} placeholder="Contoh: SMAN 1 Kuningan, kelas XI" value={sekolah} onChange={(e) => setSekolah(e.target.value)} />
        </div>
        <div className="px-field">
          <label htmlFor="d-alamat">Alamat</label>
          <textarea id="d-alamat" required rows={2} maxLength={300} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
        </div>

        <h2 className="px-form-bagian">Profil untuk kartu <span>(semua wajib diisi)</span></h2>

        <div className="px-field">
          <span className="px-label-isian">Foto (wajib)</span>
          <div className="px-foto-unggah">
            {foto ? (
              <img src={foto.url} alt="Pratinjau foto Anda" />
            ) : (
              <div className="px-foto-unggah-kosong" aria-hidden="true">Foto</div>
            )}
            <div>
              <label className="px-pil px-pil-garis px-pil-kecil px-pilih-file">
                {foto ? "Ganti foto" : "Pilih foto"}
                <input type="file" accept="image/*" onChange={pilihFoto} />
              </label>
              {foto && (
                <button type="button" className="px-tautan-hapus" onClick={() => setFoto(null)}>
                  Hapus foto
                </button>
              )}
              <p className="px-bantu">Foto wajah yang jelas, tegak (potret). Otomatis diperkecil. Maksimal 1 foto.</p>
            </div>
          </div>
          {pesanFoto && <p className="px-pesan px-pesan-err" role="alert">{pesanFoto}</p>}
        </div>

        <div className="px-field">
          <label htmlFor="d-moto">Moto</label>
          <input id="d-moto" required maxLength={120} placeholder="Satu kalimat" value={moto} onChange={(e) => setMoto(e.target.value)} />
        </div>
        <div className="px-field">
          <label htmlFor="d-kesan">Kesan</label>
          <textarea id="d-kesan" required rows={3} maxLength={300} value={kesan} onChange={(e) => setKesan(e.target.value)} />
          <span className="px-bantu">Kesan Anda tentang IPNU atau IPPNU. Maksimal 300 huruf.</span>
        </div>
        <div className="px-field">
          <label htmlFor="d-pesan">Pesan</label>
          <textarea id="d-pesan" required rows={3} maxLength={300} value={pesanKartu} onChange={(e) => setPesanKartu(e.target.value)} />
          <span className="px-bantu">Pesan untuk sesama anggota. Maksimal 300 huruf.</span>
        </div>
        <div className="px-field-baris">
          <div className="px-field">
            <label htmlFor="d-hobi">Hobi</label>
            <input id="d-hobi" required maxLength={100} value={hobi} onChange={(e) => setHobi(e.target.value)} />
          </div>
          <div className="px-field">
            <label htmlFor="d-cita">Cita-cita</label>
            <input id="d-cita" required maxLength={100} value={cita} onChange={(e) => setCita(e.target.value)} />
          </div>
        </div>
        <div className="px-field-baris">
          <div className="px-field">
            <label htmlFor="d-ig">Instagram</label>
            <input id="d-ig" required={!tanpaIg} disabled={tanpaIg} maxLength={120} placeholder="@username" value={tanpaIg ? "" : instagram} onChange={(e) => setInstagram(e.target.value)} />
            <label className="px-setuju px-setuju-kecil">
              <input type="checkbox" checked={tanpaIg} onChange={(e) => { setTanpaIg(e.target.checked); if (e.target.checked) setInstagram(""); }} />
              <span>Saya tidak punya Instagram</span>
            </label>
          </div>
          <div className="px-field">
            <label htmlFor="d-tt">TikTok</label>
            <input id="d-tt" required={!tanpaTt} disabled={tanpaTt} maxLength={120} placeholder="@username" value={tanpaTt ? "" : tiktok} onChange={(e) => setTiktok(e.target.value)} />
            <label className="px-setuju px-setuju-kecil">
              <input type="checkbox" checked={tanpaTt} onChange={(e) => { setTanpaTt(e.target.checked); if (e.target.checked) setTiktok(""); }} />
              <span>Saya tidak punya TikTok</span>
            </label>
          </div>
        </div>

        <fieldset className="px-field px-kader">
          <legend>Jenjang kaderisasi yang sudah diikuti (wajib pilih)</legend>
          {JENJANG_KADERISASI.map((j) => (
            <label className="px-setuju px-setuju-kecil" key={j}>
              <input
                type="checkbox"
                checked={kader.includes(j)}
                onChange={(e) => {
                  setKader(e.target.checked ? [...kader, j] : kader.filter((x) => x !== j));
                  if (e.target.checked) setBelumKader(false);
                }}
              />
              <span>{j}</span>
            </label>
          ))}
          <label className="px-setuju px-setuju-kecil">
            <input
              type="checkbox"
              checked={belumKader}
              onChange={(e) => {
                setBelumKader(e.target.checked);
                if (e.target.checked) setKader([]);
              }}
            />
            <span>Belum pernah mengikuti jenjang apa pun</span>
          </label>
          <span className="px-bantu">Pengurus akan memeriksa kebenarannya sebelum menampilkannya di kartu.</span>
        </fieldset>

        <h2 className="px-form-bagian">Izin</h2>

        <label className="px-setuju">
          <input type="checkbox" checked={izinProfil} onChange={(e) => setIzinProfil(e.target.checked)} />
          <span>
            Boleh menampilkan profil saya (foto, nama, moto, kesan, pesan, hobi, cita-cita) di kartu anggota di
            website. Kalau tidak dicentang, saya tetap menjadi anggota tetapi tidak tampil di website.
          </span>
        </label>
        <label className="px-setuju">
          <input type="checkbox" checked={izinMedsos} onChange={(e) => setIzinMedsos(e.target.checked)} disabled={(tanpaIg || !instagram.trim()) && (tanpaTt || !tiktok.trim())} />
          <span>Boleh menampilkan Instagram dan TikTok saya di kartu (hanya bisa dicentang kalau diisi).</span>
        </label>

        {/* Isian jebakan untuk robot: disembunyikan dari pengguna dan pembaca layar. */}
        <div className="px-jebakan" aria-hidden="true">
          <label htmlFor="d-web">Jangan diisi</label>
          <input id="d-web" tabIndex={-1} autoComplete="off" value={jebakan} onChange={(e) => setJebakan(e.target.value)} />
        </div>

        <label className="px-setuju px-setuju-utama">
          <input type="checkbox" checked={setuju} onChange={(e) => setSetuju(e.target.checked)} required />
          <span>
            Saya setuju data ini disimpan pengurus ranting untuk keperluan keanggotaan. Kalau saya masih di bawah
            18 tahun, orang tua atau wali saya sudah mengizinkan.
          </span>
        </label>

        {pesan && (
          <p className={pesan.t === "ok" ? "px-pesan px-pesan-ok" : "px-pesan px-pesan-err"} role={pesan.t === "err" ? "alert" : "status"}>
            {pesan.teks}
          </p>
        )}

        <button className="px-pil px-pil-kuning" type="submit" disabled={sibuk}>
          {sibuk ? "Mengirim…" : "Kirim pendaftaran"}
        </button>
      </form>

      {/* Pratinjau bagian depan kartu */}
      <aside className="px-pratinjau" aria-label="Pratinjau kartu Anda">
        <p className="px-pratinjau-judul">Pratinjau kartu</p>
        <div className={`px-kartu px-anggota-${kelas}`}>
          <div className="px-muka px-depan">
            <div className="px-foto">
              {foto ? (
                <img src={foto.url} alt="" />
              ) : (
                <div className="px-foto-kosong" aria-hidden="true">{inisial(nama || "Nama")}</div>
              )}
              <span className="px-foto-logo">
                {jenis === "IPPNU" ? <LogoIppnu size={30} alt="" /> : <LogoIpnu size={30} alt="" />}
              </span>
            </div>
            <p className="px-nama px-nama-statis">{nama.trim() || "Nama lengkap"}</p>
            <div className="px-medsos-depan">
              {igPratinjau && <span>Instagram</span>}
              {ttPratinjau && <span>TikTok</span>}
            </div>
            <p className="px-ttl">{ttl}</p>
          </div>
        </div>
        {moto.trim() && <blockquote className="px-moto">“{moto.trim()}”</blockquote>}
        <p className="px-bantu">Ini bagian depan kartu. Moto, kesan, dan pesan tampil di sisi belakang saat kartu dibalik.</p>
      </aside>
    </div>
  );
}
