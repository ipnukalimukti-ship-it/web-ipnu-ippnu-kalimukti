import Link from "next/link";
import { LogoIpnu, LogoIppnu } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="tema px-tidak-ada">
      <div className="wrap">
        <div className="px-footer-logo" aria-hidden="true">
          <LogoIpnu size={56} alt="" />
          <LogoIppnu size={56} alt="" />
        </div>
        <h1>Halaman tidak ditemukan</h1>
        <p>Alamat yang Anda buka tidak ada atau sudah dihapus.</p>
        <Link href="/" className="px-pil px-pil-kuning">
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
