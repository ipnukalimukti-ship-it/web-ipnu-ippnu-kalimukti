import type { Metadata } from "next";
import Link from "next/link";
import MemberCard from "@/components/MemberCard";
import PageHead from "@/components/PageHead";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";
import { getMembers, getRiwayat } from "@/lib/data";

export const metadata: Metadata = { title: "Anggota" };

type Props = { searchParams: Promise<{ jenis?: string; q?: string }> };

export default async function Anggota({ searchParams }: Props) {
  const { jenis, q } = await searchParams;
  const [anggota, riwayat] = await Promise.all([getMembers({ jenis, q }), getRiwayat()]);
  const aktif = jenis === "IPNU" || jenis === "IPPNU" ? jenis : "";
  const qs = (j: string) => {
    const p = new URLSearchParams();
    if (j) p.set("jenis", j);
    if (q) p.set("q", q);
    const s = p.toString();
    return s ? `/anggota?${s}` : "/anggota";
  };

  return (
    <>
      <PageHead label="Keluarga besar ranting" judul="Anggota">
        Nama, tempat tanggal lahir, dan foto anggota IPNU dan IPPNU Ranting Kalimukti.
      </PageHead>
      <div className="wrap px-seksi">
        <div className="px-alat">
          <nav className="px-tab" aria-label="Pilih organisasi">
            <Link href={qs("")} aria-current={aktif === "" ? "true" : undefined}>
              Semua
            </Link>
            <Link href={qs("IPNU")} aria-current={aktif === "IPNU" ? "true" : undefined}>
              <LogoIpnu size={20} alt="" /> IPNU
            </Link>
            <Link href={qs("IPPNU")} aria-current={aktif === "IPPNU" ? "true" : undefined}>
              <LogoIppnu size={20} alt="" /> IPPNU
            </Link>
          </nav>
          <form className="px-cari" action="/anggota" role="search">
            <label className="sr-only" htmlFor="cari-nama">
              Cari nama anggota
            </label>
            <input id="cari-nama" type="search" name="q" defaultValue={q ?? ""} placeholder="Cari nama" />
            {aktif && <input type="hidden" name="jenis" value={aktif} />}
            <button type="submit" className="px-pil px-pil-kuning">
              Cari
            </button>
          </form>
        </div>

        {anggota.length === 0 ? (
          <p className="px-kosong">Tidak ada anggota yang cocok.</p>
        ) : (
          <ul className="px-grid-anggota">
            {anggota.map((m) => (
              <MemberCard key={m.id} m={m} riwayat={riwayat[m.id]} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
