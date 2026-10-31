"use client";

import { useAdmin } from "./AdminShell";
import { bisa, type Peran } from "@/lib/admin-util";

export type Pesan = { t: "ok" | "err"; teks: string } | null;

/** Kotak pesan sukses atau gagal. */
export function Notif({ pesan }: { pesan: Pesan }) {
  if (!pesan) return null;
  return (
    <p className={pesan.t === "ok" ? "adm-notif adm-ok" : "adm-notif adm-err"} role={pesan.t === "ok" ? "status" : "alert"}>
      {pesan.teks}
    </p>
  );
}

/**
 * Pembungkus halaman admin: judul, dan memeriksa peran.
 * (Pemeriksaan sebenarnya ada di database lewat RLS; ini hanya agar tampilannya jelas.)
 */
export function Halaman({
  judul,
  deskripsi,
  peran,
  children,
}: {
  judul: string;
  deskripsi?: string;
  peran: Peran[];
  children: React.ReactNode;
}) {
  const { profil } = useAdmin();
  if (!bisa(profil, ...peran)) {
    return (
      <>
        <h1 className="adm-judul">{judul}</h1>
        <p className="adm-kartu">Peran Anda tidak punya akses ke halaman ini.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="adm-judul">{judul}</h1>
      {deskripsi && <p className="adm-deskripsi">{deskripsi}</p>}
      {children}
    </>
  );
}
