"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserDb } from "@/lib/supabase-browser";
import { bisa, type Peran, type Profil } from "@/lib/admin-util";

type Ctx = { db: SupabaseClient; profil: Profil };
const AdminCtx = createContext<Ctx | null>(null);

/** Akses klien database dan profil pengurus yang sedang login. */
export function useAdmin(): Ctx {
  const c = useContext(AdminCtx);
  if (!c) throw new Error("useAdmin dipakai di luar AdminShell");
  return c;
}

type Status =
  | { s: "memuat" }
  | { s: "tanpa-supabase" }
  | { s: "keluar" }
  | { s: "bukan-pengurus"; email?: string }
  | { s: "ok"; profil: Profil };

const MENU: { href: string; label: string; peran: Peran[] | null; hanya?: Peran }[] = [
  { href: "/admin", label: "Dashboard", peran: null },
  { href: "/admin/berita", label: "Berita", peran: ["sekretaris"] },
  { href: "/admin/agenda", label: "Agenda", peran: ["sekretaris"] },
  { href: "/admin/galeri", label: "Galeri", peran: ["sekretaris"] },
  { href: "/admin/anggota", label: "Anggota", peran: ["sekretaris", "bendahara"] },
  { href: "/admin/pengurus", label: "Pengurus", peran: ["sekretaris"] },
  { href: "/admin/kas", label: "Kas", peran: ["bendahara"] },
  { href: "/admin/iuran", label: "Iuran", peran: ["bendahara"] },
  { href: "/admin/laporan", label: "Laporan", peran: ["sekretaris", "bendahara"] },
  { href: "/admin/aktivitas", label: "Aktivitas", peran: null, hanya: "pengelola" },
];

const NAMA_PERAN: Record<Peran, string> = {
  pengelola: "Pengelola",
  admin: "Admin",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
};

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const db = getBrowserDb();
  const [status, setStatus] = useState<Status>({ s: "memuat" });
  const [menuBuka, setMenuBuka] = useState(false);
  const halamanLogin = pathname === "/admin/login";

  // Baca sesi login dan profil pengurus.
  useEffect(() => {
    if (!db) {
      setStatus({ s: "tanpa-supabase" });
      return;
    }
    let batal = false;

    async function muat(client: SupabaseClient) {
      const { data: sesi } = await client.auth.getSession();
      const user = sesi.session?.user;
      if (!user) {
        if (!batal) setStatus({ s: "keluar" });
        return;
      }
      const { data, error } = await client
        .from("profiles")
        .select("id,nama,role")
        .eq("id", user.id)
        .maybeSingle();
      if (batal) return;
      if (error || !data) setStatus({ s: "bukan-pengurus", email: user.email });
      else setStatus({ s: "ok", profil: data as Profil });
    }

    muat(db);
    const { data: langganan } = db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        // Ditunda agar tidak memanggil Supabase di dalam callback-nya sendiri.
        setTimeout(() => muat(db), 0);
      }
    });
    return () => {
      batal = true;
      langganan.subscription.unsubscribe();
    };
  }, [db]);

  // Arahkan ke login / dashboard sesuai status.
  useEffect(() => {
    if (status.s === "keluar" && !halamanLogin) router.replace("/admin/login");
    if (status.s === "ok" && halamanLogin) router.replace("/admin");
  }, [status, halamanLogin, router]);

  // Tutup menu HP setelah pindah halaman.
  useEffect(() => {
    setMenuBuka(false);
  }, [pathname]);

  if (status.s === "tanpa-supabase") {
    return (
      <div className="adm-tengah">
        <div className="adm-kartu adm-sempit">
          <h1>Supabase belum disambungkan</h1>
          <p>
            Halaman admin butuh database. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> (lihat README),
            lalu jalankan ulang.
          </p>
          <p>
            <Link href="/">Kembali ke website</Link>
          </p>
        </div>
      </div>
    );
  }

  if (halamanLogin && status.s !== "ok") return <>{children}</>;

  if (status.s === "memuat" || status.s === "keluar" || (status.s === "ok" && halamanLogin)) {
    return (
      <div className="adm-tengah" role="status">
        <p>Memuat…</p>
      </div>
    );
  }

  if (status.s === "bukan-pengurus") {
    return (
      <div className="adm-tengah">
        <div className="adm-kartu adm-sempit">
          <h1>Akun belum terdaftar sebagai pengurus</h1>
          <p>
            Anda masuk sebagai <strong>{status.email}</strong>, tetapi akun ini belum diberi peran.
            Minta admin menambahkannya.
          </p>
          <button className="adm-btn" onClick={() => db?.auth.signOut()}>
            Keluar
          </button>
        </div>
      </div>
    );
  }

  const profil = status.profil;
  const menu = MENU.filter((m) =>
    m.hanya ? profil.role === m.hanya : m.peran === null || bisa(profil, ...m.peran),
  );

  return (
    <AdminCtx.Provider value={{ db: db as SupabaseClient, profil }}>
      <div className="adm-app">
        <header className="adm-top">
          <Link href="/admin" className="adm-merek">
            <strong>IPNU IPPNU</strong>
            <span>Admin Kalimukti</span>
          </Link>
          <button
            type="button"
            className="menu-btn"
            aria-expanded={menuBuka}
            aria-controls="menu-admin"
            onClick={() => setMenuBuka((b) => !b)}
          >
            <span className="garis" aria-hidden="true" />
            Menu
          </button>
        </header>

        <aside id="menu-admin" className={menuBuka ? "adm-side buka" : "adm-side"}>
          <Link href="/admin" className="adm-merek adm-merek-side">
            <strong>IPNU IPPNU</strong>
            <span>Admin Kalimukti</span>
          </Link>
          <nav aria-label="Menu admin">
            {menu.map((m) => {
              const aktif = m.href === "/admin" ? pathname === "/admin" : pathname.startsWith(m.href);
              return (
                <Link key={m.href} href={m.href} aria-current={aktif ? "page" : undefined}>
                  {m.label}
                </Link>
              );
            })}
          </nav>
          <div className="adm-pengguna">
            <p>
              <strong>{profil.nama}</strong>
              <br />
              {NAMA_PERAN[profil.role]}
            </p>
            <Link href="/" className="adm-tautan-lihat">
              Lihat website
            </Link>
            <button className="adm-btn adm-btn-terang" onClick={() => db?.auth.signOut()}>
              Keluar
            </button>
          </div>
        </aside>

        <main className="adm-main">{children}</main>
      </div>
    </AdminCtx.Provider>
  );
}
