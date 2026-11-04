"use client";

import { useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase";

type Pesan = { t: "ok" | "err"; teks: string } | null;

/** Formulir pendaftaran anggota baru. Dikirim lewat fungsi database yang memeriksa isian dan membatasi pengiriman. */
export default function FormDaftar() {
  const [nama, setNama] = useState("");
  const [jenis, setJenis] = useState<"" | "IPNU" | "IPPNU">("");
  const [tempat, setTempat] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [hp, setHp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [setuju, setSetuju] = useState(false);
  const [jebakan, setJebakan] = useState("");
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);
  const [selesai, setSelesai] = useState(false);
  const mulai = useRef(Date.now());

  // Batas tanggal lahir: paling muda 8 tahun, paling tua tahun 1980.
  const batas = useMemo(() => {
    const sekarang = new Date();
    const maks = new Date(sekarang.getFullYear() - 8, sekarang.getMonth(), sekarang.getDate());
    return { min: "1980-01-01", maks: maks.toISOString().slice(0, 10) };
  }, []);

  async function kirim(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    if (!jenis) {
      setPesan({ t: "err", teks: "Pilih IPNU atau IPPNU." });
      return;
    }
    // Robot biasanya mengisi dan mengirim dalam sekejap.
    if (Date.now() - mulai.current < 3000) {
      setPesan({ t: "err", teks: "Periksa dulu isian Anda, lalu kirim lagi." });
      return;
    }
    const db = getSupabase();
    if (!db) {
      setPesan({ t: "err", teks: "Mode demo: formulir belum tersambung ke database, jadi tidak terkirim." });
      return;
    }

    setSibuk(true);
    const { error } = await db.rpc("kirim_pendaftaran", {
      p_nama: nama,
      p_jenis: jenis,
      p_tempat_lahir: tempat,
      p_tanggal_lahir: tanggal,
      p_no_hp: hp,
      p_alamat: alamat,
      p_setuju: setuju,
      p_jebakan: jebakan,
    });
    setSibuk(false);

    if (error) {
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
    setSelesai(true);
  }

  if (selesai) {
    return (
      <div className="px-form px-form-selesai" role="status">
        <h2>Pendaftaran terkirim</h2>
        <p>
          Terima kasih sudah mendaftar. Pengurus akan menghubungi Anda lewat nomor yang Anda isi. Mohon
          ditunggu ya.
        </p>
      </div>
    );
  }

  return (
    <form className="px-form" onSubmit={kirim} noValidate={false}>
      <div className="px-form-catatan">
        <strong>Soal data Anda</strong>
        <p>
          Nomor HP dan alamat hanya bisa dilihat pengurus, dan tidak ditampilkan di website. Data dipakai
          untuk keperluan keanggotaan ranting saja.
        </p>
      </div>

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
          <input id="d-tempat" maxLength={80} value={tempat} onChange={(e) => setTempat(e.target.value)} />
        </div>
        <div className="px-field">
          <label htmlFor="d-tanggal">Tanggal lahir</label>
          <input id="d-tanggal" type="date" required min={batas.min} max={batas.maks} value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        </div>
      </div>

      <div className="px-field">
        <label htmlFor="d-hp">Nomor HP atau WhatsApp</label>
        <input id="d-hp" type="tel" inputMode="tel" required autoComplete="tel" placeholder="08xxxxxxxxxx" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <div className="px-field">
        <label htmlFor="d-alamat">Alamat (boleh dikosongkan)</label>
        <textarea id="d-alamat" rows={3} maxLength={300} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
      </div>

      {/* Isian jebakan untuk robot: disembunyikan dari pengguna dan pembaca layar. */}
      <div className="px-jebakan" aria-hidden="true">
        <label htmlFor="d-web">Jangan diisi</label>
        <input id="d-web" tabIndex={-1} autoComplete="off" value={jebakan} onChange={(e) => setJebakan(e.target.value)} />
      </div>

      <label className="px-setuju">
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
  );
}
