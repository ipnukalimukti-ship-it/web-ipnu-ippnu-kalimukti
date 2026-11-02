"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { Halaman, Notif, type Pesan } from "@/components/admin/ui";
import { pesanError } from "@/lib/admin-util";

const NAMA_PERAN: Record<string, string> = {
  pengelola: "Pengelola",
  admin: "Admin",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
};

export default function AdminAkun() {
  return (
    <Halaman judul="Akun saya" semua deskripsi="Ganti password akun Anda sendiri.">
      <Isi />
    </Halaman>
  );
}

function Isi() {
  const { db, profil } = useAdmin();
  const [email, setEmail] = useState<string | null>(null);
  const [lama, setLama] = useState("");
  const [baru, setBaru] = useState("");
  const [ulang, setUlang] = useState("");
  const [pesan, setPesan] = useState<Pesan>(null);
  const [sibuk, setSibuk] = useState(false);

  useEffect(() => {
    db.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [db]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);

    if (baru.length < 8) return setPesan({ t: "err", teks: "Password baru minimal 8 karakter." });
    if (baru !== ulang) return setPesan({ t: "err", teks: "Pengulangan password baru tidak sama." });
    if (baru === lama) return setPesan({ t: "err", teks: "Password baru harus berbeda dari yang lama." });
    if (!email) return setPesan({ t: "err", teks: "Email akun tidak terbaca. Muat ulang halaman lalu coba lagi." });

    setSibuk(true);
    try {
      // Pastikan password lama benar sebelum mengganti.
      const cek = await db.auth.signInWithPassword({ email, password: lama });
      if (cek.error) throw new Error("Password lama salah.");

      const { error } = await db.auth.updateUser({ password: baru });
      if (error) throw error;

      setLama("");
      setBaru("");
      setUlang("");
      setPesan({ t: "ok", teks: "Password berhasil diganti. Pakai password baru saat masuk berikutnya." });
    } catch (err) {
      setPesan({ t: "err", teks: pesanError(err) });
    } finally {
      setSibuk(false);
    }
  }

  return (
    <>
      <Notif pesan={pesan} />

      <div className="adm-kartu">
        <p style={{ margin: 0 }}>
          Anda masuk sebagai <strong>{profil.nama}</strong> ({NAMA_PERAN[profil.role] ?? profil.role})
          {email ? <> dengan email <strong>{email}</strong></> : null}.
        </p>
      </div>

      <form className="adm-kartu adm-form" onSubmit={simpan} style={{ maxWidth: 520 }}>
        <h2>Ganti password</h2>

        <div className="adm-field">
          <label htmlFor="pw-lama">Password lama</label>
          <input id="pw-lama" type="password" autoComplete="current-password" required value={lama} onChange={(e) => setLama(e.target.value)} />
        </div>
        <div className="adm-field">
          <label htmlFor="pw-baru">Password baru</label>
          <input id="pw-baru" type="password" autoComplete="new-password" required minLength={8} value={baru} onChange={(e) => setBaru(e.target.value)} />
          <span className="adm-bantu">Minimal 8 karakter. Pakai campuran huruf dan angka, dan jangan sama dengan password di tempat lain.</span>
        </div>
        <div className="adm-field">
          <label htmlFor="pw-ulang">Ulangi password baru</label>
          <input id="pw-ulang" type="password" autoComplete="new-password" required value={ulang} onChange={(e) => setUlang(e.target.value)} />
        </div>

        <div className="adm-aksi">
          <button className="adm-btn adm-btn-utama" type="submit" disabled={sibuk}>
            {sibuk ? "Menyimpan…" : "Ganti password"}
          </button>
        </div>
        <span className="adm-bantu">Lupa password lama? Minta Pengelola mengatur ulang lewat Supabase.</span>
      </form>
    </>
  );
}
