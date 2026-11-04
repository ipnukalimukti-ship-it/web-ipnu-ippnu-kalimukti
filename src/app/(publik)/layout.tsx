import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";
import TombolPasang from "@/components/TombolPasang";
import { isDemo } from "@/lib/supabase";

export default function PublikLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="tema">
      {isDemo && (
        <div className="px-demo" role="status">
          Mode demo: semua data di halaman ini hanya contoh.
        </div>
      )}
      <SiteHeader />
      <main>{children}</main>
      <footer className="px-footer">
        <div className="wrap">
          <div className="px-footer-grid">
            <div>
              <div className="px-footer-logo" aria-hidden="true">
                <LogoIpnu size={44} alt="" />
                <LogoIppnu size={44} alt="" />
              </div>
              <strong>IPNU IPPNU Ranting Kalimukti</strong>
              <p>
                Ikatan Pelajar Nahdlatul Ulama dan Ikatan Pelajar Putri Nahdlatul Ulama di tingkat
                ranting.
              </p>
            </div>
            <ul className="px-footer-nav">
              <li><Link href="/berita">Berita</Link></li>
              <li><Link href="/pengurus">Pengurus</Link></li>
              <li><Link href="/anggota">Anggota</Link></li>
              <li><Link href="/kas">Transparansi kas</Link></li>
              <li><Link href="/agenda">Agenda</Link></li>
              <li><Link href="/galeri">Galeri</Link></li>
              <li><Link href="/daftar">Daftar jadi anggota</Link></li>
            </ul>
          </div>
          <div className="px-footer-pasang">
            <TombolPasang />
          </div>
          <p className="px-footer-bawah">
            © {new Date().getFullYear()} IPNU IPPNU Ranting Kalimukti ·{" "}
            <Link href="/admin">Masuk pengurus</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
