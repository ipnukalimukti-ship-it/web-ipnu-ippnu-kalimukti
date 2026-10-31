"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getBrowserDb } from "@/lib/supabase-browser";
import { Notif, type Pesan } from "@/components/admin/ui";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sandi, setSandi] = useState("");
  const [proses, setProses] = useState(false);
  const [pesan, setPesan] = useState<Pesan>(null);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    const db = getBrowserDb();
    if (!db) return;
    setProses(true);
    setPesan(null);
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: sandi });
    if (error) {
      setProses(false);
      setPesan({
        t: "err",
        teks: /invalid login/i.test(error.message)
          ? "Email atau kata sandi salah."
          : "Gagal masuk: " + error.message,
      });
      return;
    }
    router.replace("/admin");
  }

  return (
    <div className="adm-tengah">
      <form className="adm-kartu adm-sempit adm-form" onSubmit={masuk}>
        <div className="adm-merek adm-merek-login">
          <strong>IPNU IPPNU</strong>
          <span>Admin Ranting Kalimukti</span>
        </div>
        <h1 className="adm-judul-kecil">Masuk pengurus</h1>

        <div className="adm-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="adm-field">
          <label htmlFor="sandi">Kata sandi</label>
          <input
            id="sandi"
            type="password"
            autoComplete="current-password"
            required
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
          />
        </div>

        <Notif pesan={pesan} />
        <button className="adm-btn adm-btn-utama" type="submit" disabled={proses}>
          {proses ? "Memproses…" : "Masuk"}
        </button>
        <p className="teks-kecil">
          Lupa kata sandi? Minta admin mengatur ulang lewat Supabase.{" "}
          <Link href="/">Kembali ke website</Link>
        </p>
      </form>
    </div>
  );
}
